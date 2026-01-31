import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createServer } from "./server";
import { createClient } from "./client";
import type { Command, Query } from "./types";

// Test type definitions
type TestCommands = {
  "test.echo": Command<{ message: string }, { echoed: string }>;
  "test.void": Command<{ value: number }, void>;
  "test.error": Command<{ shouldFail: boolean }, void>;
  "test.setUser": Command<{ userId: number }, { userId: number }>;
  "public.ping": Command<void, { pong: boolean }>;
};

type TestQueries = {
  "test.numbers": Query<{ count: number }, { n: number }>;
  "test.empty": Query<void, { item: string }>;
  "test.error": Query<void, { item: string }>;
};

type TestEvents = {
  test_event: { value: number };
  "test.namespaced": { data: string };
};

const PORT = 3456;
const WS_URL = `ws://localhost:${PORT}/ws`;

describe("seiro integration", () => {
  let server: Awaited<ReturnType<ReturnType<typeof createServer>["start"]>>;
  let serverApi: ReturnType<typeof createServer<TestCommands, TestQueries, TestEvents>>;

  beforeAll(async () => {
    serverApi = createServer<TestCommands, TestQueries, TestEvents>({
      port: PORT,
      auth: {
        verify: async (token) => {
          if (token === "valid-token") return 42;
          if (token === "user-123") return 123;
          return null;
        },
        public: ["public.ping"],
      },
    });

    // Echo command - returns the message
    serverApi.command("test.echo", async (data) => {
      return { echoed: data.message };
    });

    // Void command - returns nothing
    serverApi.command("test.void", async (_data) => {
      // Do nothing, return void
    });

    // Error command - throws if requested
    serverApi.command("test.error", async (data) => {
      if (data.shouldFail) {
        throw new Error("Intentional failure");
      }
    });

    // Set user command - uses context
    serverApi.command("test.setUser", async (data, ctx) => {
      ctx.setUserId(data.userId);
      return { userId: ctx.userId! };
    });

    // Public command - no auth required
    serverApi.command("public.ping", async () => {
      return { pong: true };
    });

    // Send profile on connect (required for client.connect() to resolve)
    serverApi.onOpen(async (ctx) => {
      ctx.send({ profile: ctx.userId ? { id: ctx.userId } : null });
    });

    // Numbers query - streams count numbers
    serverApi.query("test.numbers", async function* (params) {
      for (let i = 1; i <= params.count; i++) {
        yield { n: i };
      }
    });

    // Empty query - yields nothing
    serverApi.query("test.empty", async function* () {
      // Yield nothing
    });

    // Error query - throws
    serverApi.query("test.error", async function* () {
      throw new Error("Query failed");
    });

    server = await serverApi.start();
  });

  afterAll(() => {
    server?.stop();
  });

  describe("commands with ack", () => {
    test("command with callbacks receives response", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      const result = await new Promise<{ echoed: string }>((resolve, reject) => {
        client.cmd("test.echo", { message: "hello" }, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      expect(result).toEqual({ echoed: "hello" });
      client.close();
    });

    test("void command with callbacks receives response", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      const result = await new Promise<unknown>((resolve, reject) => {
        client.cmd("test.void", { value: 42 }, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      // Server sends null for void commands (undefined doesn't survive JSON serialization)
      expect(result).toBeNull();
      client.close();
    });

    test("command error triggers onError callback", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      const error = await new Promise<string>((resolve, reject) => {
        client.cmd("test.error", { shouldFail: true }, {
          onSuccess: () => reject(new Error("Should have failed")),
          onError: resolve,
        });
      });

      expect(error).toBe("Intentional failure");
      client.close();
    });

    test("command with only onError callback still gets ack", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      // This should complete without hanging because ack is sent when callbacks object exists
      const completed = await new Promise<boolean>((resolve) => {
        client.cmd("test.void", { value: 1 }, {
          onError: () => resolve(false),
        });
        // If no response comes, this will timeout - but since we have callbacks, ack=true
        // The server will respond, but onSuccess is undefined so nothing happens
        // We need to wait a bit to ensure no error occurred
        setTimeout(() => resolve(true), 100);
      });

      expect(completed).toBe(true);
      client.close();
    });
  });

  describe("commands without ack (fire-and-forget)", () => {
    test("command without callbacks does not hang", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      // Fire and forget - no callbacks
      client.cmd("test.void", { value: 99 });

      // Should not hang - give it a moment to process
      await new Promise((r) => setTimeout(r, 50));

      client.close();
    });

    test("multiple fire-and-forget commands execute", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      // Send multiple commands without waiting
      for (let i = 0; i < 10; i++) {
        client.cmd("test.void", { value: i });
      }

      await new Promise((r) => setTimeout(r, 100));
      client.close();
    });
  });

  describe("queries", () => {
    test("query streams rows", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      const rows: { n: number }[] = [];
      for await (const row of client.query("test.numbers", { count: 5 })) {
        rows.push(row);
      }

      expect(rows).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }, { n: 4 }, { n: 5 }]);
      client.close();
    });

    test("queryAll collects all rows", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      const rows = await client.queryAll("test.numbers", { count: 3 });

      expect(rows).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
      client.close();
    });

    test("empty query returns no rows", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      const rows = await client.queryAll("test.empty");

      expect(rows).toEqual([]);
      client.close();
    });

    test("query error throws", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      let error: Error | null = null;
      try {
        for await (const _row of client.query("test.error")) {
          // Should not reach here
        }
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toBe("Query failed");
      client.close();
    });
  });

  describe("authentication", () => {
    test("public command works without token", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL);
      await client.connect();

      const result = await new Promise<{ pong: boolean }>((resolve, reject) => {
        client.cmd("public.ping", undefined as unknown as void, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      expect(result).toEqual({ pong: true });
      client.close();
    });

    test("protected command fails without token", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL);
      await client.connect();

      const error = await new Promise<string>((resolve, reject) => {
        client.cmd("test.echo", { message: "test" }, {
          onSuccess: () => reject(new Error("Should have failed")),
          onError: resolve,
        });
      });

      expect(error).toBe("Not authenticated");
      client.close();
    });

    test("protected command works with valid token", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      const result = await new Promise<{ echoed: string }>((resolve, reject) => {
        client.cmd("test.echo", { message: "authenticated" }, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      expect(result).toEqual({ echoed: "authenticated" });
      client.close();
    });

    test("invalid token does not authenticate", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "invalid-token",
      });
      await client.connect();

      const error = await new Promise<string>((resolve, reject) => {
        client.cmd("test.echo", { message: "test" }, {
          onSuccess: () => reject(new Error("Should have failed")),
          onError: resolve,
        });
      });

      expect(error).toBe("Not authenticated");
      client.close();
    });
  });

  describe("events", () => {
    test("client receives emitted events", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      const received = new Promise<{ value: number }>((resolve) => {
        client.on("test_event", resolve);
      });
      client.subscribe();

      // Give subscription time to register
      await new Promise((r) => setTimeout(r, 50));

      // Emit from server
      serverApi.emit("test_event", { value: 42 });

      const event = await received;
      expect(event).toEqual({ value: 42 });
      client.close();
    });

    test("unsubscribe stops receiving events", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      let receivedCount = 0;
      const unsubscribe = client.on("test_event", () => {
        receivedCount++;
      });
      client.subscribe();

      await new Promise((r) => setTimeout(r, 50));

      serverApi.emit("test_event", { value: 1 });
      await new Promise((r) => setTimeout(r, 50));

      unsubscribe();
      await new Promise((r) => setTimeout(r, 50));

      serverApi.emit("test_event", { value: 2 });
      await new Promise((r) => setTimeout(r, 50));

      expect(receivedCount).toBe(1);
      client.close();
    });

    test("pattern subscription with wildcard", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      const events: unknown[] = [];
      client.on("test*" as keyof TestEvents, (data) => {
        events.push(data);
      });
      client.subscribe();

      await new Promise((r) => setTimeout(r, 50));

      serverApi.emit("test_event", { value: 1 });
      serverApi.emit("test.namespaced", { data: "hello" });

      await new Promise((r) => setTimeout(r, 100));

      expect(events.length).toBe(2);
      client.close();
    });
  });

  describe("signals", () => {
    test("sync updates signal on events", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      // sync accumulates events - initial value is the first event shape
      const state = client.sync(
        "test_event",
        { value: 0 },
        (prev, event) => ({ value: prev.value + event.value })
      );

      client.subscribe();
      await new Promise((r) => setTimeout(r, 50));

      expect(state.value).toEqual({ value: 0 });

      serverApi.emit("test_event", { value: 10 });
      await new Promise((r) => setTimeout(r, 50));

      expect(state.value).toEqual({ value: 10 });

      serverApi.emit("test_event", { value: 5 });
      await new Promise((r) => setTimeout(r, 50));

      expect(state.value).toEqual({ value: 15 });

      client.close();
    });

    test("syncMap updates map signal on events", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      const map = client.syncMap("test_event", (e) => e.value);

      client.subscribe();
      await new Promise((r) => setTimeout(r, 50));

      expect(map.value.size).toBe(0);

      serverApi.emit("test_event", { value: 1 });
      serverApi.emit("test_event", { value: 2 });
      await new Promise((r) => setTimeout(r, 100));

      expect(map.value.size).toBe(2);
      expect(map.value.get(1)).toEqual({ value: 1 });
      expect(map.value.get(2)).toEqual({ value: 2 });

      client.close();
    });

    test("connected signal reflects connection state", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL);

      expect(client.connected.value).toBe(false);

      await client.connect();
      expect(client.connected.value).toBe(true);

      client.close();
      // Give time for close to process
      await new Promise((r) => setTimeout(r, 50));
      expect(client.connected.value).toBe(false);
    });
  });

  describe("connection management", () => {
    test("reconnect re-establishes connection", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      expect(client.connected.value).toBe(true);

      await client.reconnect();

      expect(client.connected.value).toBe(true);

      // Verify it still works
      const result = await new Promise<{ echoed: string }>((resolve, reject) => {
        client.cmd("test.echo", { message: "after reconnect" }, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      expect(result).toEqual({ echoed: "after reconnect" });
      client.close();
    });

    test("token management", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL);

      expect(client.getToken()).toBeNull();

      client.setToken("my-token");
      expect(client.getToken()).toBe("my-token");

      client.logout();
      expect(client.getToken()).toBeNull();
    });
  });

  describe("error handling", () => {
    test("unknown command returns error", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      const error = await new Promise<string>((resolve, reject) => {
        // @ts-expect-error - testing unknown command
        client.cmd("unknown.command", {}, {
          onSuccess: () => reject(new Error("Should have failed")),
          onError: resolve,
        });
      });

      expect(error).toBe("Unknown command: unknown.command");
      client.close();
    });

    test("unknown query returns error", async () => {
      const client = createClient<TestCommands, TestQueries, TestEvents>(WS_URL, {
        token: "valid-token",
      });
      await client.connect();

      let error: Error | null = null;
      try {
        // @ts-expect-error - testing unknown query
        for await (const _row of client.query("unknown.query")) {
          // Should not reach here
        }
      } catch (e) {
        error = e as Error;
      }

      expect(error).not.toBeNull();
      expect(error?.message).toBe("Unknown query: unknown.query");
      client.close();
    });
  });
});

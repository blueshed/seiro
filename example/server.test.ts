import { expect, test, beforeAll, afterAll } from "bun:test";
import { createClient } from "seiro/client";
import type { Commands, Queries, Events, User, Shipment } from "./types";

const DATABASE_URL = "postgres://seiro:seiro@localhost:5433/seiro_test";
process.env.DATABASE_URL = DATABASE_URL;

// Dynamic import to use test database
const serverModule = await import("./server");

type TestClient = ReturnType<typeof createClient<Commands, Queries, Events>>;
let client: TestClient;
let authedClient: TestClient;

beforeAll(async () => {
  // Wait for server to be ready
  await new Promise((r) => setTimeout(r, 500));

  client = createClient<Commands, Queries, Events>("ws://localhost:3000/ws", {
    tokenKey: "seiro_token_unauthed",
  });
  await client.connect<User>();

  // Create authenticated client
  authedClient = createClient<Commands, Queries, Events>(
    "ws://localhost:3000/ws",
    { tokenKey: "seiro_token_authed" },
  );
  await authedClient.connect<User>();

  // Register a test user
  await new Promise<void>((resolve, reject) => {
    authedClient.cmd(
      "auth.register",
      {
        email: `shipment-test-${Date.now()}@example.com`,
        password: "password123",
      },
      {
        onSuccess: (r) => {
          authedClient.setToken(r.token);
          resolve();
        },
        onError: reject,
      },
    );
  });

  // Reconnect with token
  await authedClient.reconnect();
});

afterAll(() => {
  client.close();
  authedClient.close();
});

// Auth tests
test("register creates user and returns token", async () => {
  const email = `test-${Date.now()}@example.com`;
  let result: { token: string; user: User } | null = null;
  let error: string | null = null;

  client.cmd(
    "auth.register",
    { email, password: "password123" },
    {
      onSuccess: (r) => {
        result = r;
      },
      onError: (e) => {
        error = e;
      },
    },
  );

  await new Promise((r) => setTimeout(r, 300));

  expect(error).toBeNull();
  expect(result).not.toBeNull();
  expect(result!.token).toBeDefined();
  expect(result!.user.email).toBe(email);
});

test("login with valid credentials returns token", async () => {
  const email = `login-${Date.now()}@example.com`;

  // First register
  await new Promise<void>((resolve) => {
    client.cmd(
      "auth.register",
      { email, password: "password123" },
      { onSuccess: () => resolve() },
    );
  });

  // Then login
  let result: { token: string; user: User } | null = null;
  client.cmd(
    "auth.login",
    { email, password: "password123" },
    {
      onSuccess: (r) => {
        result = r;
      },
    },
  );

  await new Promise((r) => setTimeout(r, 300));

  expect(result).not.toBeNull();
  expect(result!.token).toBeDefined();
  expect(result!.user.email).toBe(email);
});

test("login with invalid credentials fails", async () => {
  let error: string | null = null;

  client.cmd(
    "auth.login",
    { email: "nonexistent@example.com", password: "wrong" },
    {
      onError: (e) => {
        error = e;
      },
    },
  );

  await new Promise((r) => setTimeout(r, 300));

  expect(error).not.toBeNull();
});

// Shipment tests
test("create shipment requires authentication", async () => {
  // Create a fresh unauthenticated client (not reusing `client` which may have
  // been authenticated by previous auth tests via ctx.setUserId)
  const unauthClient = createClient<Commands, Queries, Events>(
    "ws://localhost:3000/ws",
    { tokenKey: "seiro_token_fresh" },
  );
  await unauthClient.connect<User>();

  let error: string | null = null;

  unauthClient.cmd(
    "shipment.create",
    { origin: "AMS", dest: "LAX" },
    {
      onError: (e) => {
        error = e;
      },
    },
  );

  await new Promise((r) => setTimeout(r, 300));

  unauthClient.close();

  expect(error).not.toBeNull();
  expect(error!).toContain("authenticated");
});

test("authenticated user can create shipment", async () => {
  let error: string | null = null;

  authedClient.cmd(
    "shipment.create",
    { origin: "AMS", dest: "LAX" },
    {
      onError: (e) => {
        error = e;
      },
    },
  );

  await new Promise((r) => setTimeout(r, 300));

  expect(error).toBeNull();
});

test("query shipments.all returns shipments", async () => {
  const shipments: Shipment[] = [];

  for await (const shipment of authedClient.query("shipments.all")) {
    shipments.push(shipment);
  }

  expect(shipments.length).toBeGreaterThanOrEqual(1);
  expect(shipments[0].origin).toBeDefined();
  expect(shipments[0].dest).toBeDefined();
});

test("claim shipment changes status", async () => {
  // Create a new shipment
  authedClient.cmd("shipment.create", { origin: "JFK", dest: "LHR" });
  await new Promise((r) => setTimeout(r, 300));

  // Get the pending shipment
  let pendingShipment: Shipment | null = null;
  for await (const shipment of authedClient.query("shipments.by_status", {
    status: "pending",
  })) {
    pendingShipment = shipment;
    break;
  }

  expect(pendingShipment).not.toBeNull();

  // Claim it
  let error: string | null = null;
  authedClient.cmd(
    "shipment.claim",
    { id: pendingShipment!.id, carrierId: "CARRIER-TEST" },
    {
      onError: (e) => {
        error = e;
      },
    },
  );

  await new Promise((r) => setTimeout(r, 300));

  expect(error).toBeNull();

  // Verify status changed
  let claimedShipment: Shipment | null = null;
  for await (const shipment of authedClient.query("shipment.by_id", {
    id: pendingShipment!.id,
  })) {
    claimedShipment = shipment;
  }

  expect(claimedShipment).not.toBeNull();
  expect(claimedShipment!.status).toBe("claimed");
  expect(claimedShipment!.carrierId).toBe("CARRIER-TEST");
});

test("deliver shipment changes status", async () => {
  // Create and claim a shipment
  authedClient.cmd("shipment.create", { origin: "CDG", dest: "NRT" });
  await new Promise((r) => setTimeout(r, 300));

  let pendingShipment: Shipment | null = null;
  for await (const shipment of authedClient.query("shipments.by_status", {
    status: "pending",
  })) {
    pendingShipment = shipment;
    break;
  }

  authedClient.cmd("shipment.claim", {
    id: pendingShipment!.id,
    carrierId: "CARRIER-DELIVER",
  });
  await new Promise((r) => setTimeout(r, 300));

  // Deliver it
  let error: string | null = null;
  authedClient.cmd(
    "shipment.deliver",
    { id: pendingShipment!.id },
    {
      onError: (e) => {
        error = e;
      },
    },
  );

  await new Promise((r) => setTimeout(r, 300));

  expect(error).toBeNull();

  // Verify status changed
  let deliveredShipment: Shipment | null = null;
  for await (const shipment of authedClient.query("shipment.by_id", {
    id: pendingShipment!.id,
  })) {
    deliveredShipment = shipment;
  }

  expect(deliveredShipment).not.toBeNull();
  expect(deliveredShipment!.status).toBe("delivered");
});

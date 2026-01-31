import type { ServerWebSocket } from "bun";
import { isCmd, isQuery, encode, decode } from "./protocol";
import { serverLogger, logWsAccess } from "./logger";
import type {
  CommandsDef,
  QueriesDef,
  EventsDef,
  CommandData,
  QueryParams,
  QueryRow,
  EventData,
} from "./types";

type ClientData = {
  id: string;
  userId: number | null;
  subscriptions: Set<string>;
};

type WS = ServerWebSocket<ClientData>;

export type CommandContext<E extends EventsDef> = {
  userId: number | null;
  setUserId: (id: number) => void;
  send: <K extends keyof E>(event: K, data: EventData<E, K>) => void;
};

export type OpenContext = {
  userId: number | null;
  send: (data: unknown) => void;
};

type OpenHandler = (ctx: OpenContext) => Promise<void>;

export type QueryContext = {
  userId: number | null;
};

type CommandHandler<
  C extends CommandsDef,
  K extends keyof C,
  E extends EventsDef,
> = (data: CommandData<C, K>, ctx: CommandContext<E>) => Promise<unknown>;

type QueryHandler<Q extends QueriesDef, K extends keyof Q> = (
  params: QueryParams<Q, K>,
  ctx: QueryContext,
) => AsyncIterable<QueryRow<Q, K>>;

export type AuthConfig = {
  verify: (token: string) => Promise<number | null>;
  public: string[];
};

export type HealthCheck = () => Promise<boolean>;

export function createServer<
  C extends CommandsDef = CommandsDef,
  Q extends QueriesDef = QueriesDef,
  E extends EventsDef = EventsDef,
>(
  options: { port?: number; auth?: AuthConfig; healthCheck?: HealthCheck } = {},
) {
  const clients = new Map<string, WS>();
  const subscriptions = new Map<string, Set<string>>();
  const commandHandlers = new Map<string, CommandHandler<C, keyof C, E>>();
  const queryHandlers = new Map<string, QueryHandler<Q, keyof Q>>();
  let openHandler: OpenHandler | null = null;

  function emit<K extends keyof E>(channel: K, payload: E[K]) {
    const msg = encode({ ev: channel as string, data: payload });
    let matchedPatterns = 0;
    let matchedClients = 0;
    for (const [pattern, clientIds] of subscriptions) {
      if (matchPattern(pattern, channel as string)) {
        matchedPatterns++;
        matchedClients += clientIds.size;
        for (const clientId of clientIds) {
          clients.get(clientId)?.send(msg);
        }
      }
    }
    serverLogger.info(
      `Emit ${String(channel)} → ${matchedPatterns} patterns, ${matchedClients} clients`,
    );
  }

  function sendToClient<K extends keyof E>(ws: WS, event: K, data: E[K]) {
    ws.send(encode({ ev: event as string, data }));
  }

  function matchPattern(pattern: string, channel: string): boolean {
    if (pattern === channel) return true;
    if (pattern.endsWith("*")) {
      return channel.startsWith(pattern.slice(0, -1));
    }
    return false;
  }

  function command<K extends keyof C & string>(
    name: K,
    handler: CommandHandler<C, K, E>,
  ) {
    commandHandlers.set(name, handler as CommandHandler<C, keyof C, E>);
  }

  function query<K extends keyof Q & string>(
    name: K,
    handler: QueryHandler<Q, K>,
  ) {
    queryHandlers.set(name, handler as unknown as QueryHandler<Q, keyof Q>);
  }

  function onOpen(handler: OpenHandler) {
    openHandler = handler;
  }

  function isPublic(name: string): boolean {
    return options.auth?.public.includes(name) ?? false;
  }

  function requiresAuth(name: string): boolean {
    return options.auth !== undefined && !isPublic(name);
  }

  async function handleMessage(ws: WS, raw: string) {
    const msg = decode(raw);

    if (isCmd(msg)) {
      const start = Date.now();
      const handler = commandHandlers.get(msg.cmd);
      if (!handler) {
        ws.send(encode({ cid: msg.cid, err: `Unknown command: ${msg.cmd}` }));
        logWsAccess(
          "CMD",
          msg.cmd,
          Date.now() - start,
          ws.data.userId,
          "Unknown command",
        );
        return;
      }
      if (requiresAuth(msg.cmd) && ws.data.userId === null) {
        ws.send(encode({ cid: msg.cid, err: "Not authenticated" }));
        logWsAccess(
          "CMD",
          msg.cmd,
          Date.now() - start,
          ws.data.userId,
          "Not authenticated",
        );
        return;
      }
      try {
        const ctx: CommandContext<E> = {
          userId: ws.data.userId,
          setUserId: (id: number) => {
            ws.data.userId = id;
            ctx.userId = id;
          },
          send: (event, data) => sendToClient(ws, event, data as E[keyof E]),
        };
        const result = await handler(msg.data as CommandData<C, keyof C>, ctx);
        if (msg.ack) {
          ws.send(encode({ cid: msg.cid, result }));
        }
        logWsAccess("CMD", msg.cmd, Date.now() - start, ws.data.userId);
      } catch (e) {
        const err = e instanceof Error ? e.message : "command failed";
        serverLogger.warn(`Command ${msg.cmd} failed: ${err}`);
        ws.send(encode({ cid: msg.cid, err }));
        logWsAccess("CMD", msg.cmd, Date.now() - start, ws.data.userId, err);
      }
      return;
    }

    if (isQuery(msg)) {
      const start = Date.now();
      const handler = queryHandlers.get(msg.q);
      if (!handler) {
        ws.send(encode({ id: msg.id, err: `Unknown query: ${msg.q}` }));
        logWsAccess(
          "QUERY",
          msg.q,
          Date.now() - start,
          ws.data.userId,
          "Unknown query",
        );
        return;
      }
      if (requiresAuth(msg.q) && ws.data.userId === null) {
        ws.send(encode({ id: msg.id, err: "Not authenticated" }));
        logWsAccess(
          "QUERY",
          msg.q,
          Date.now() - start,
          ws.data.userId,
          "Not authenticated",
        );
        return;
      }
      try {
        const ctx: QueryContext = { userId: ws.data.userId };
        for await (const row of handler(
          (msg.params ?? {}) as QueryParams<Q, keyof Q>,
          ctx,
        )) {
          ws.send(encode({ id: msg.id, row }));
        }
        ws.send(encode({ id: msg.id }));
        logWsAccess("QUERY", msg.q, Date.now() - start, ws.data.userId);
      } catch (e) {
        const err = e instanceof Error ? e.message : "query failed";
        serverLogger.warn(`Query ${msg.q} failed: ${err}`);
        ws.send(encode({ id: msg.id, err }));
        logWsAccess("QUERY", msg.q, Date.now() - start, ws.data.userId, err);
      }
      return;
    }

    if (typeof msg === "object" && msg !== null && "sub" in msg) {
      const pattern = (msg as { sub: string }).sub;
      ws.data.subscriptions.add(pattern);
      if (!subscriptions.has(pattern)) subscriptions.set(pattern, new Set());
      subscriptions.get(pattern)!.add(ws.data.id);
      return;
    }

    if (typeof msg === "object" && msg !== null && "unsub" in msg) {
      const pattern = (msg as { unsub: string }).unsub;
      ws.data.subscriptions.delete(pattern);
      subscriptions.get(pattern)?.delete(ws.data.id);
    }
  }

  async function start(routes?: Record<string, unknown>) {
    const port = options.port ?? 3000;

    return Bun.serve<ClientData>({
      port,
      routes: routes as Record<string, Response>,
      async fetch(req, server) {
        const url = new URL(req.url);
        if (url.pathname === "/health") {
          if (options.healthCheck) {
            try {
              const ok = await options.healthCheck();
              return ok
                ? new Response("OK", { status: 200 })
                : new Response("Unhealthy", { status: 503 });
            } catch {
              return new Response("Unhealthy", { status: 503 });
            }
          }
          return new Response("OK", { status: 200 });
        }
        if (url.pathname === "/ws") {
          const token = url.searchParams.get("token");
          let userId: number | null = null;
          if (token && options.auth?.verify) {
            userId = await options.auth.verify(token);
          }
          const upgraded = server.upgrade(req, {
            data: {
              id: crypto.randomUUID(),
              userId,
              subscriptions: new Set<string>(),
            },
          });
          return upgraded
            ? undefined
            : new Response("Upgrade failed", { status: 400 });
        }
        return new Response("Not found", { status: 404 });
      },
      websocket: {
        async open(ws) {
          clients.set(ws.data.id, ws);
          if (openHandler) {
            try {
              await openHandler({
                userId: ws.data.userId,
                send: (data) => ws.send(encode(data as object)),
              });
            } catch (e) {
              serverLogger.error("onOpen handler failed:", e);
            }
          }
        },
        message(ws, raw) {
          handleMessage(ws, raw.toString());
        },
        close(ws) {
          clients.delete(ws.data.id);
          for (const pattern of ws.data.subscriptions) {
            subscriptions.get(pattern)?.delete(ws.data.id);
          }
        },
      },
    });
  }

  return { command, query, onOpen, start, emit };
}

export type Server<
  C extends CommandsDef = CommandsDef,
  Q extends QueriesDef = QueriesDef,
  E extends EventsDef = EventsDef,
> = ReturnType<typeof createServer<C, Q, E>>;

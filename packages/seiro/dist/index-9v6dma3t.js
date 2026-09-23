// @bun
import {
  isCmd2,
  isQuery2,
  isSub2,
  isUnsub2,
  encode2,
  decode2
} from "./index-qv3pb96h.js";

// src/logger.ts
var LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4
};
var DEFAULT_LEVEL = process.env.LOG_LEVEL?.toUpperCase() || "INFO";
var parseCategories = () => {
  const categories = {};
  const envCategories = process.env.LOG_CATEGORIES || "";
  const getLevel = (level) => {
    const upper = level.toUpperCase();
    return upper in LOG_LEVELS ? LOG_LEVELS[upper] : LOG_LEVELS.INFO;
  };
  if (!envCategories) {
    if (false) {} else if (false) {} else {
      categories["*"] = getLevel(DEFAULT_LEVEL);
    }
    return categories;
  }
  envCategories.split(",").forEach((pair) => {
    const [category, level] = pair.trim().split(":");
    if (category && level) {
      categories[category] = getLevel(level);
    }
  });
  if (categories["*"] === undefined) {
    categories["*"] = getLevel(DEFAULT_LEVEL);
  }
  return categories;
};
var logCategories = parseCategories();
var colors = {
  reset: "\x1B[0m",
  bright: "\x1B[1m",
  dim: "\x1B[2m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  magenta: "\x1B[35m",
  cyan: "\x1B[36m",
  white: "\x1B[37m",
  gray: "\x1B[90m"
};
var levelColors = {
  ERROR: colors.red,
  WARN: colors.yellow,
  INFO: colors.blue,
  DEBUG: colors.cyan,
  TRACE: colors.gray
};
var categoryColors = {
  ws: colors.green,
  db: colors.magenta,
  auth: colors.yellow,
  api: colors.cyan,
  server: colors.blue,
  notify: colors.magenta,
  access: colors.green,
  runtime: colors.blue
};
var timestamp = () => {
  const now = new Date;
  return now.toISOString().replace("T", " ").slice(0, -5);
};
var shouldLog = (category, level) => {
  const categoryLevel = logCategories[category] ?? logCategories["*"] ?? LOG_LEVELS.INFO;
  return LOG_LEVELS[level] <= categoryLevel;
};
var formatMessage = (category, level, message, ...args) => {
  const useColors = process.env.NO_COLOR !== "1" && true;
  if (useColors) {
    const catColor = categoryColors[category] || colors.white;
    const lvlColor = levelColors[level];
    return [
      `${colors.gray}${timestamp()}${colors.reset}`,
      `${lvlColor}[${level}]${colors.reset}`,
      `${catColor}[${category}]${colors.reset}`,
      message,
      ...args
    ];
  } else {
    return [timestamp(), `[${level}]`, `[${category}]`, message, ...args];
  }
};
var createLogger2 = (category) => {
  return {
    error: (message, ...args) => {
      if (shouldLog(category, "ERROR")) {
        console.error(...formatMessage(category, "ERROR", message, ...args));
      }
    },
    warn: (message, ...args) => {
      if (shouldLog(category, "WARN")) {
        console.warn(...formatMessage(category, "WARN", message, ...args));
      }
    },
    info: (message, ...args) => {
      if (shouldLog(category, "INFO")) {
        console.log(...formatMessage(category, "INFO", message, ...args));
      }
    },
    debug: (message, ...args) => {
      if (shouldLog(category, "DEBUG")) {
        console.log(...formatMessage(category, "DEBUG", message, ...args));
      }
    },
    trace: (message, ...args) => {
      if (shouldLog(category, "TRACE")) {
        console.log(...formatMessage(category, "TRACE", message, ...args));
      }
    },
    request: (method, params) => {
      if (shouldLog(category, "DEBUG")) {
        console.log(...formatMessage(category, "DEBUG", `\u2192 ${method}`, params ? JSON.stringify(params) : ""));
      }
    },
    response: (method, result, duration) => {
      if (shouldLog(category, "DEBUG")) {
        const resultStr = result === undefined ? "void" : typeof result === "object" ? `${JSON.stringify(result).slice(0, 100)}...` : result;
        console.log(...formatMessage(category, "DEBUG", `\u2190 ${method} (${duration}ms)`, resultStr));
      }
    }
  };
};
var wsLogger2 = createLogger2("ws");
var dbLogger2 = createLogger2("db");
var authLogger2 = createLogger2("auth");
var serverLogger2 = createLogger2("server");
var notifyLogger2 = createLogger2("notify");
var accessLogger2 = createLogger2("access");
var runtimeLogger2 = createLogger2("runtime");
var logAccess2 = (method, path, status, duration, userId) => {
  if (shouldLog("access", "INFO")) {
    const userStr = userId ? `user:${userId}` : "anon";
    const statusColor = status >= 400 ? colors.red : status >= 300 ? colors.yellow : colors.green;
    const useColors = process.env.NO_COLOR !== "1" && true;
    if (useColors) {
      console.log(`${colors.gray}${timestamp()}${colors.reset}`, `${colors.blue}[INFO]${colors.reset}`, `${colors.green}[access]${colors.reset}`, `${method} ${path}`, `${statusColor}${status}${colors.reset}`, `${duration}ms`, `${colors.gray}${userStr}${colors.reset}`);
    } else {
      console.log(timestamp(), "[INFO]", "[access]", `${method} ${path}`, status, `${duration}ms`, userStr);
    }
  }
};
var logWsAccess2 = (action, method, duration, userId, error) => {
  if (shouldLog("access", "INFO")) {
    const userStr = userId ? `user:${userId}` : "anon";
    const useColors = process.env.NO_COLOR !== "1" && true;
    const statusColor = error ? colors.red : colors.green;
    const status = error ? "ERR" : "OK";
    if (useColors) {
      console.log(`${colors.gray}${timestamp()}${colors.reset}`, `${colors.blue}[INFO]${colors.reset}`, `${colors.green}[access]${colors.reset}`, `WS ${action}`, method, `${statusColor}${status}${colors.reset}`, `${duration}ms`, `${colors.gray}${userStr}${colors.reset}`, error ? `${colors.red}${error}${colors.reset}` : "");
    } else {
      console.log(timestamp(), "[INFO]", "[access]", `WS ${action}`, method, status, `${duration}ms`, userStr, error || "");
    }
  }
};
// src/event-relay.ts
async function createEventRelay2(opts) {
  const channel = opts.channel ?? "events";
  const batchMs = opts.batchMs ?? 5;
  let pending = [];
  let timer = null;
  async function flush() {
    const ids = pending;
    pending = [];
    timer = null;
    if (ids.length === 0)
      return;
    try {
      const rows = await opts.fetchByIds(ids);
      for (const row of rows) {
        opts.emit(row.type, row.payload, { id: row.id });
      }
    } catch (e) {
      notifyLogger2.error(`Event relay fetch failed for ids ${ids.join(",")}:`, e);
    }
  }
  await opts.listen(channel, (payload) => {
    pending.push(payload);
    if (timer === null) {
      timer = setTimeout(flush, batchMs);
    }
  });
  notifyLogger2.info(`Event relay listening on "${channel}"`);
  if (opts.fetchSince && opts.setBackfill) {
    const fetchSince = opts.fetchSince;
    opts.setBackfill((pattern, since, ctx) => fetchSince(pattern, since, ctx));
    notifyLogger2.info("Event relay resume enabled");
  }
}

// src/server.ts
function createServer2(options = {}) {
  const clients = new Map;
  const subscriptions = new Map;
  const commandHandlers = new Map;
  const queryHandlers = new Map;
  let openHandler = null;
  let backfillHandler = null;
  function emit(channel, payload, meta) {
    const msg = encode2(meta?.id !== undefined ? { ev: channel, data: payload, id: meta.id } : { ev: channel, data: payload });
    let matchedPatterns = 0;
    let matchedClients = 0;
    for (const [pattern, clientIds] of subscriptions) {
      if (matchPattern(pattern, channel)) {
        matchedPatterns++;
        matchedClients += clientIds.size;
        for (const clientId of clientIds) {
          clients.get(clientId)?.send(msg);
        }
      }
    }
    serverLogger2.info(`Emit ${String(channel)} \u2192 ${matchedPatterns} patterns, ${matchedClients} clients`);
  }
  function sendToClient(ws, event, data) {
    ws.send(encode2({ ev: event, data }));
  }
  function setBackfill(handler) {
    backfillHandler = handler;
  }
  function matchPattern(pattern, channel) {
    if (pattern === channel)
      return true;
    if (pattern.endsWith("*")) {
      return channel.startsWith(pattern.slice(0, -1));
    }
    return false;
  }
  function command(name, handler) {
    commandHandlers.set(name, handler);
  }
  function query(name, handler) {
    queryHandlers.set(name, handler);
  }
  function onOpen(handler) {
    openHandler = handler;
  }
  function isPublic(name) {
    return options.auth?.public.includes(name) ?? false;
  }
  function requiresAuth(name) {
    return options.auth !== undefined && !isPublic(name);
  }
  async function handleMessage(ws, raw) {
    const msg = decode2(raw);
    if (isCmd2(msg)) {
      const start = Date.now();
      const handler = commandHandlers.get(msg.cmd);
      if (!handler) {
        ws.send(encode2({ cid: msg.cid, err: `Unknown command: ${msg.cmd}` }));
        logWsAccess2("CMD", msg.cmd, Date.now() - start, ws.data.userId, "Unknown command");
        return;
      }
      if (requiresAuth(msg.cmd) && ws.data.userId === null) {
        ws.send(encode2({ cid: msg.cid, err: "Not authenticated" }));
        logWsAccess2("CMD", msg.cmd, Date.now() - start, ws.data.userId, "Not authenticated");
        return;
      }
      try {
        const ctx = {
          userId: ws.data.userId,
          setUserId: (id) => {
            ws.data.userId = id;
            ctx.userId = id;
          },
          send: (event, data) => sendToClient(ws, event, data)
        };
        const result = await handler(msg.data, ctx);
        if (msg.ack) {
          ws.send(encode2({ cid: msg.cid, result: result ?? null }));
        }
        logWsAccess2("CMD", msg.cmd, Date.now() - start, ws.data.userId);
      } catch (e) {
        const err = e instanceof Error ? e.message : "command failed";
        serverLogger2.warn(`Command ${msg.cmd} failed: ${err}`);
        ws.send(encode2({ cid: msg.cid, err }));
        logWsAccess2("CMD", msg.cmd, Date.now() - start, ws.data.userId, err);
      }
      return;
    }
    if (isQuery2(msg)) {
      const start = Date.now();
      const handler = queryHandlers.get(msg.q);
      if (!handler) {
        ws.send(encode2({ id: msg.id, err: `Unknown query: ${msg.q}` }));
        logWsAccess2("QUERY", msg.q, Date.now() - start, ws.data.userId, "Unknown query");
        return;
      }
      if (requiresAuth(msg.q) && ws.data.userId === null) {
        ws.send(encode2({ id: msg.id, err: "Not authenticated" }));
        logWsAccess2("QUERY", msg.q, Date.now() - start, ws.data.userId, "Not authenticated");
        return;
      }
      try {
        const ctx = { userId: ws.data.userId };
        for await (const row of handler(msg.params ?? {}, ctx)) {
          ws.send(encode2({ id: msg.id, row }));
        }
        ws.send(encode2({ id: msg.id }));
        logWsAccess2("QUERY", msg.q, Date.now() - start, ws.data.userId);
      } catch (e) {
        const err = e instanceof Error ? e.message : "query failed";
        serverLogger2.warn(`Query ${msg.q} failed: ${err}`);
        ws.send(encode2({ id: msg.id, err }));
        logWsAccess2("QUERY", msg.q, Date.now() - start, ws.data.userId, err);
      }
      return;
    }
    if (isSub2(msg)) {
      const pattern = msg.sub;
      ws.data.subscriptions.add(pattern);
      if (!subscriptions.has(pattern))
        subscriptions.set(pattern, new Set);
      subscriptions.get(pattern).add(ws.data.id);
      if (msg.since !== undefined && backfillHandler) {
        const since = msg.since;
        const userId = ws.data.userId;
        (async () => {
          try {
            for await (const row of backfillHandler(pattern, since, {
              userId
            })) {
              ws.send(encode2({ ev: row.type, data: row.payload, id: row.id }));
            }
          } catch (e) {
            serverLogger2.warn(`Backfill ${pattern} since ${since} failed: ${e instanceof Error ? e.message : String(e)}`);
          }
        })();
      }
      return;
    }
    if (isUnsub2(msg)) {
      const pattern = msg.unsub;
      ws.data.subscriptions.delete(pattern);
      subscriptions.get(pattern)?.delete(ws.data.id);
    }
  }
  async function start(routes) {
    const port = options.port ?? 3000;
    return Bun.serve({
      port,
      routes,
      async fetch(req, server) {
        const url = new URL(req.url);
        if (url.pathname === "/health") {
          if (options.healthCheck) {
            try {
              const ok = await options.healthCheck();
              return ok ? new Response("OK", { status: 200 }) : new Response("Unhealthy", { status: 503 });
            } catch {
              return new Response("Unhealthy", { status: 503 });
            }
          }
          return new Response("OK", { status: 200 });
        }
        if (url.pathname === "/ws") {
          const token = url.searchParams.get("token");
          let userId = null;
          if (token && options.auth?.verify) {
            userId = await options.auth.verify(token);
          }
          const upgraded = server.upgrade(req, {
            data: {
              id: crypto.randomUUID(),
              userId,
              subscriptions: new Set
            }
          });
          return upgraded ? undefined : new Response("Upgrade failed", { status: 400 });
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
                send: (data) => ws.send(encode2(data))
              });
            } catch (e) {
              serverLogger2.error("onOpen handler failed:", e);
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
        }
      }
    });
  }
  return { command, query, onOpen, start, emit, setBackfill };
}

export { createLogger2, wsLogger2, dbLogger2, authLogger2, serverLogger2, notifyLogger2, accessLogger2, runtimeLogger2, logAccess2, logWsAccess2, createEventRelay2, createServer2 };

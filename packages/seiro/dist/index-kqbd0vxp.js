// @bun
import {
  decode,
  encode,
  isCmd,
  isQuery
} from "./index-txbk53zc.js";

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
var createLogger = (category) => {
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
var wsLogger = createLogger("ws");
var dbLogger = createLogger("db");
var authLogger = createLogger("auth");
var serverLogger = createLogger("server");
var notifyLogger = createLogger("notify");
var accessLogger = createLogger("access");
var runtimeLogger = createLogger("runtime");
var logWsAccess = (action, method, duration, userId, error) => {
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

// src/server.ts
function createServer(options = {}) {
  const clients = new Map;
  const subscriptions = new Map;
  const commandHandlers = new Map;
  const queryHandlers = new Map;
  let openHandler = null;
  function emit(channel, payload) {
    const msg = encode({ ev: channel, data: payload });
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
    serverLogger.info(`Emit ${String(channel)} \u2192 ${matchedPatterns} patterns, ${matchedClients} clients`);
  }
  function sendToClient(ws, event, data) {
    ws.send(encode({ ev: event, data }));
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
    const msg = decode(raw);
    if (isCmd(msg)) {
      const start2 = Date.now();
      const handler = commandHandlers.get(msg.cmd);
      if (!handler) {
        ws.send(encode({ cid: msg.cid, err: `Unknown command: ${msg.cmd}` }));
        logWsAccess("CMD", msg.cmd, Date.now() - start2, ws.data.userId, "Unknown command");
        return;
      }
      if (requiresAuth(msg.cmd) && ws.data.userId === null) {
        ws.send(encode({ cid: msg.cid, err: "Not authenticated" }));
        logWsAccess("CMD", msg.cmd, Date.now() - start2, ws.data.userId, "Not authenticated");
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
        if (result !== undefined) {
          ws.send(encode({ cid: msg.cid, result }));
        }
        logWsAccess("CMD", msg.cmd, Date.now() - start2, ws.data.userId);
      } catch (e) {
        const err = e instanceof Error ? e.message : "command failed";
        serverLogger.warn(`Command ${msg.cmd} failed: ${err}`);
        ws.send(encode({ cid: msg.cid, err }));
        logWsAccess("CMD", msg.cmd, Date.now() - start2, ws.data.userId, err);
      }
      return;
    }
    if (isQuery(msg)) {
      const start2 = Date.now();
      const handler = queryHandlers.get(msg.q);
      if (!handler) {
        ws.send(encode({ id: msg.id, err: `Unknown query: ${msg.q}` }));
        logWsAccess("QUERY", msg.q, Date.now() - start2, ws.data.userId, "Unknown query");
        return;
      }
      if (requiresAuth(msg.q) && ws.data.userId === null) {
        ws.send(encode({ id: msg.id, err: "Not authenticated" }));
        logWsAccess("QUERY", msg.q, Date.now() - start2, ws.data.userId, "Not authenticated");
        return;
      }
      try {
        const ctx = { userId: ws.data.userId };
        for await (const row of handler(msg.params ?? {}, ctx)) {
          ws.send(encode({ id: msg.id, row }));
        }
        ws.send(encode({ id: msg.id }));
        logWsAccess("QUERY", msg.q, Date.now() - start2, ws.data.userId);
      } catch (e) {
        const err = e instanceof Error ? e.message : "query failed";
        serverLogger.warn(`Query ${msg.q} failed: ${err}`);
        ws.send(encode({ id: msg.id, err }));
        logWsAccess("QUERY", msg.q, Date.now() - start2, ws.data.userId, err);
      }
      return;
    }
    if (typeof msg === "object" && msg !== null && "sub" in msg) {
      const pattern = msg.sub;
      ws.data.subscriptions.add(pattern);
      if (!subscriptions.has(pattern))
        subscriptions.set(pattern, new Set);
      subscriptions.get(pattern).add(ws.data.id);
      return;
    }
    if (typeof msg === "object" && msg !== null && "unsub" in msg) {
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
                send: (data) => ws.send(encode(data))
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
        }
      }
    });
  }
  return { command, query, onOpen, start, emit };
}

export { createServer };

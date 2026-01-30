// logger.ts - Flexible logging system with categories and levels

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

// Default log level from environment or INFO
const DEFAULT_LEVEL = process.env.LOG_LEVEL?.toUpperCase() || "INFO";

// Parse LOG_CATEGORIES from environment
// Format: "ws:debug,db:trace,auth:info" or "*:debug" for all
const parseCategories = (): Record<string, number> => {
  const categories: Record<string, number> = {};
  const envCategories = process.env.LOG_CATEGORIES || "";

  const getLevel = (level: string): number => {
    const upper = level.toUpperCase() as LogLevel;
    return upper in LOG_LEVELS ? LOG_LEVELS[upper] : LOG_LEVELS.INFO;
  };

  if (!envCategories) {
    // Default: INFO level unless in production/test
    if (process.env.NODE_ENV === "production") {
      categories["*"] = LOG_LEVELS.ERROR;
    } else if (process.env.NODE_ENV === "test") {
      categories["*"] = LOG_LEVELS.ERROR;
    } else {
      categories["*"] = getLevel(DEFAULT_LEVEL);
    }
    return categories;
  }

  // Parse category:level pairs
  envCategories.split(",").forEach((pair) => {
    const [category, level] = pair.trim().split(":");
    if (category && level) {
      categories[category] = getLevel(level);
    }
  });

  // Set default for non-specified categories
  if (categories["*"] === undefined) {
    categories["*"] = getLevel(DEFAULT_LEVEL);
  }

  return categories;
};

// Initialize categories
let logCategories = parseCategories();

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
};

// Level colors
const levelColors: Record<string, string> = {
  ERROR: colors.red,
  WARN: colors.yellow,
  INFO: colors.blue,
  DEBUG: colors.cyan,
  TRACE: colors.gray,
};

// Category colors
const categoryColors: Record<string, string> = {
  ws: colors.green,
  db: colors.magenta,
  auth: colors.yellow,
  api: colors.cyan,
  server: colors.blue,
  notify: colors.magenta,
  access: colors.green,
  runtime: colors.blue,
};

// Format timestamp
const timestamp = (): string => {
  const now = new Date();
  return now.toISOString().replace("T", " ").slice(0, -5);
};

// Check if logging is enabled for category and level
const shouldLog = (category: string, level: LogLevel): boolean => {
  const categoryLevel =
    logCategories[category] ?? logCategories["*"] ?? LOG_LEVELS.INFO;
  return LOG_LEVELS[level] <= categoryLevel;
};

// Format log message with colors
const formatMessage = (
  category: string,
  level: string,
  message: string,
  ...args: unknown[]
): unknown[] => {
  const useColors =
    process.env.NO_COLOR !== "1" && process.env.NODE_ENV !== "test";

  if (useColors) {
    const catColor = categoryColors[category] || colors.white;
    const lvlColor = levelColors[level];

    return [
      `${colors.gray}${timestamp()}${colors.reset}`,
      `${lvlColor}[${level}]${colors.reset}`,
      `${catColor}[${category}]${colors.reset}`,
      message,
      ...args,
    ];
  } else {
    return [timestamp(), `[${level}]`, `[${category}]`, message, ...args];
  }
};

export interface Logger {
  error: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
  trace: (message: string, ...args: unknown[]) => void;
  request: (method: string, params?: unknown) => void;
  response: (method: string, result: unknown, duration: number) => void;
}

// Create logger for a specific category
export const createLogger = (category: string): Logger => {
  return {
    error: (message: string, ...args: unknown[]) => {
      if (shouldLog(category, "ERROR")) {
        console.error(...formatMessage(category, "ERROR", message, ...args));
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      if (shouldLog(category, "WARN")) {
        console.warn(...formatMessage(category, "WARN", message, ...args));
      }
    },
    info: (message: string, ...args: unknown[]) => {
      if (shouldLog(category, "INFO")) {
        console.log(...formatMessage(category, "INFO", message, ...args));
      }
    },
    debug: (message: string, ...args: unknown[]) => {
      if (shouldLog(category, "DEBUG")) {
        console.log(...formatMessage(category, "DEBUG", message, ...args));
      }
    },
    trace: (message: string, ...args: unknown[]) => {
      if (shouldLog(category, "TRACE")) {
        console.log(...formatMessage(category, "TRACE", message, ...args));
      }
    },
    // For request/response logging
    request: (method: string, params?: unknown) => {
      if (shouldLog(category, "DEBUG")) {
        console.log(
          ...formatMessage(
            category,
            "DEBUG",
            `→ ${method}`,
            params ? JSON.stringify(params) : "",
          ),
        );
      }
    },
    response: (method: string, result: unknown, duration: number) => {
      if (shouldLog(category, "DEBUG")) {
        const resultStr =
          result === undefined
            ? "void"
            : typeof result === "object"
              ? `${JSON.stringify(result).slice(0, 100)}...`
              : result;
        console.log(
          ...formatMessage(
            category,
            "DEBUG",
            `← ${method} (${duration}ms)`,
            resultStr,
          ),
        );
      }
    },
  };
};

// Pre-configured loggers for common categories
export const wsLogger = createLogger("ws");
export const dbLogger = createLogger("db");
export const authLogger = createLogger("auth");
export const serverLogger = createLogger("server");
export const notifyLogger = createLogger("notify");
export const accessLogger = createLogger("access");
export const runtimeLogger = createLogger("runtime");

// Reload configuration (useful for runtime changes)
export const reloadConfig = (): void => {
  logCategories = parseCategories();
};

// Get current configuration
export const getConfig = (): {
  categories: Record<string, number>;
  levels: Record<string, number>;
} => {
  return {
    categories: logCategories,
    levels: LOG_LEVELS,
  };
};

// Middleware for timing operations
export const timed = async <T>(
  category: string,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const logger = createLogger(category);
  const start = Date.now();

  try {
    logger.trace(`Starting ${operation}`);
    const result = await fn();
    const duration = Date.now() - start;
    logger.debug(`Completed ${operation} in ${duration}ms`);
    return result;
  } catch (error: unknown) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed ${operation} after ${duration}ms:`, message);
    throw error;
  }
};

// Access log format: "method path status duration"
export const logAccess = (
  method: string,
  path: string,
  status: number,
  duration: number,
  userId?: number | null,
): void => {
  if (shouldLog("access", "INFO")) {
    const userStr = userId ? `user:${userId}` : "anon";
    const statusColor =
      status >= 400 ? colors.red : status >= 300 ? colors.yellow : colors.green;
    const useColors =
      process.env.NO_COLOR !== "1" && process.env.NODE_ENV !== "test";

    if (useColors) {
      console.log(
        `${colors.gray}${timestamp()}${colors.reset}`,
        `${colors.blue}[INFO]${colors.reset}`,
        `${colors.green}[access]${colors.reset}`,
        `${method} ${path}`,
        `${statusColor}${status}${colors.reset}`,
        `${duration}ms`,
        `${colors.gray}${userStr}${colors.reset}`,
      );
    } else {
      console.log(
        timestamp(),
        "[INFO]",
        "[access]",
        `${method} ${path}`,
        status,
        `${duration}ms`,
        userStr,
      );
    }
  }
};

// WebSocket access log
export const logWsAccess = (
  action: string,
  method: string,
  duration: number,
  userId?: number | null,
  error?: string,
): void => {
  if (shouldLog("access", "INFO")) {
    const userStr = userId ? `user:${userId}` : "anon";
    const useColors =
      process.env.NO_COLOR !== "1" && process.env.NODE_ENV !== "test";
    const statusColor = error ? colors.red : colors.green;
    const status = error ? "ERR" : "OK";

    if (useColors) {
      console.log(
        `${colors.gray}${timestamp()}${colors.reset}`,
        `${colors.blue}[INFO]${colors.reset}`,
        `${colors.green}[access]${colors.reset}`,
        `WS ${action}`,
        method,
        `${statusColor}${status}${colors.reset}`,
        `${duration}ms`,
        `${colors.gray}${userStr}${colors.reset}`,
        error ? `${colors.red}${error}${colors.reset}` : "",
      );
    } else {
      console.log(
        timestamp(),
        "[INFO]",
        "[access]",
        `WS ${action}`,
        method,
        status,
        `${duration}ms`,
        userStr,
        error || "",
      );
    }
  }
};

export default {
  createLogger,
  wsLogger,
  dbLogger,
  authLogger,
  serverLogger,
  notifyLogger,
  accessLogger,
  runtimeLogger,
  reloadConfig,
  getConfig,
  timed,
  logAccess,
  logWsAccess,
};

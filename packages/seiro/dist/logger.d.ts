export interface Logger {
    error: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    debug: (message: string, ...args: unknown[]) => void;
    trace: (message: string, ...args: unknown[]) => void;
    request: (method: string, params?: unknown) => void;
    response: (method: string, result: unknown, duration: number) => void;
}
export declare const createLogger: (category: string) => Logger;
export declare const wsLogger: Logger;
export declare const dbLogger: Logger;
export declare const authLogger: Logger;
export declare const serverLogger: Logger;
export declare const notifyLogger: Logger;
export declare const accessLogger: Logger;
export declare const runtimeLogger: Logger;
export declare const reloadConfig: () => void;
export declare const getConfig: () => {
    categories: Record<string, number>;
    levels: Record<string, number>;
};
export declare const timed: <T>(category: string, operation: string, fn: () => Promise<T>) => Promise<T>;
export declare const logAccess: (method: string, path: string, status: number, duration: number, userId?: number | null) => void;
export declare const logWsAccess: (action: string, method: string, duration: number, userId?: number | null, error?: string) => void;
declare const _default: {
    createLogger: (category: string) => Logger;
    wsLogger: Logger;
    dbLogger: Logger;
    authLogger: Logger;
    serverLogger: Logger;
    notifyLogger: Logger;
    accessLogger: Logger;
    runtimeLogger: Logger;
    reloadConfig: () => void;
    getConfig: () => {
        categories: Record<string, number>;
        levels: Record<string, number>;
    };
    timed: <T>(category: string, operation: string, fn: () => Promise<T>) => Promise<T>;
    logAccess: (method: string, path: string, status: number, duration: number, userId?: number | null) => void;
    logWsAccess: (action: string, method: string, duration: number, userId?: number | null, error?: string) => void;
};
export default _default;
//# sourceMappingURL=logger.d.ts.map
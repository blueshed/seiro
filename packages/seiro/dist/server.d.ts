export { createLogger, serverLogger, dbLogger, authLogger, wsLogger, notifyLogger, accessLogger, runtimeLogger, logAccess, logWsAccess, type Logger, } from "./logger";
import type { CommandsDef, QueriesDef, EventsDef, CommandData, QueryParams, QueryRow, EventData } from "./types";
type ClientData = {
    id: string;
    userId: number | null;
    subscriptions: Set<string>;
};
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
type CommandHandler<C extends CommandsDef, K extends keyof C, E extends EventsDef> = (data: CommandData<C, K>, ctx: CommandContext<E>) => Promise<unknown>;
type QueryHandler<Q extends QueriesDef, K extends keyof Q> = (params: QueryParams<Q, K>, ctx: QueryContext) => AsyncIterable<QueryRow<Q, K>>;
export type AuthConfig = {
    verify: (token: string) => Promise<number | null>;
    public: string[];
};
export type HealthCheck = () => Promise<boolean>;
export declare function createServer<C extends CommandsDef = CommandsDef, Q extends QueriesDef = QueriesDef, E extends EventsDef = EventsDef>(options?: {
    port?: number;
    auth?: AuthConfig;
    healthCheck?: HealthCheck;
}): {
    command: <K extends keyof C & string>(name: K, handler: CommandHandler<C, K, E>) => void;
    query: <K extends keyof Q & string>(name: K, handler: QueryHandler<Q, K>) => void;
    onOpen: (handler: OpenHandler) => void;
    start: (routes?: Record<string, unknown>) => Promise<Bun.Server<ClientData>>;
    emit: <K extends keyof E>(channel: K, payload: E[K]) => void;
};
export type Server<C extends CommandsDef = CommandsDef, Q extends QueriesDef = QueriesDef, E extends EventsDef = EventsDef> = ReturnType<typeof createServer<C, Q, E>>;
//# sourceMappingURL=server.d.ts.map
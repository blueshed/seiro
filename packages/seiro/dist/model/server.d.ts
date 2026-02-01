/**
 * Dynamic diagram server for CQRS Domain Model
 *
 * Based on modeling2 patterns - uses Bun routes for clean routing.
 */
export interface ServerOptions {
    dbPath: string;
    port?: number;
    plantUmlServer?: string;
    noCache?: boolean;
}
export declare function createServer(options: ServerOptions): Bun.Server<undefined>;
//# sourceMappingURL=server.d.ts.map
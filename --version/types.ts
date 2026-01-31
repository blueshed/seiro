// Re-export auth types
export type { User, AuthResult, AuthCommands, AuthQueries, AuthEvents } from "./auth/types";

// Combined types for the app
import type { AuthCommands, AuthQueries, AuthEvents } from "./auth/types";

export type Commands = AuthCommands;
export type Queries = AuthQueries;
export type Events = AuthEvents;

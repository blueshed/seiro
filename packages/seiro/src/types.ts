// Shared types for commands, queries, and events

// Helper types for defining individual commands and queries
export type Command<D, R> = { data: D; result: R };
export type Query<P, R> = { params: P; row: R };

// Base constraint types (used by Server/Client generics)
export type CommandsDef = Record<string, { data: unknown; result: unknown }>;
export type QueriesDef = Record<string, { params: unknown; row: unknown }>;
export type EventsDef = Record<string, unknown>;

// Helper types to extract data/params/result/row from definitions
export type CommandData<
  C extends CommandsDef,
  K extends keyof C,
> = C[K]["data"];
export type CommandResult<
  C extends CommandsDef,
  K extends keyof C,
> = C[K]["result"];
export type QueryParams<
  Q extends QueriesDef,
  K extends keyof Q,
> = Q[K]["params"];
export type QueryRow<Q extends QueriesDef, K extends keyof Q> = Q[K]["row"];
export type EventData<E extends EventsDef, K extends keyof E> = E[K];

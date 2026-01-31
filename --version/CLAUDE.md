# Project Dev Context

CQRS over WebSocket. Bun + Preact Signals + Web Components.

## Commands

```bash
docker compose up -d   # start database
bun run dev            # server on :3000
bun run check          # typecheck
bun test               # run tests
```

## Adding Features

Use the `cqrs-document` skill for document-first CQRS design through conversation.

## Type Patterns

Use `Command<D, R>` and `Query<P, R>` from seiro:

```typescript
import type { Command, Query } from "seiro";

export type MyCommands = {
  "thing.create": Command<{ name: string }, { id: number }>;
};

export type MyQueries = {
  "things.all": Query<void, Thing>;
};
```

## Typed SQL

```typescript
const rows = await sql<{ query_things_all: Thing }[]>`
  SELECT query_things_all(${ctx.userId})
`;
for (const row of rows) {
  yield row.query_things_all;
}
```

## Wire Protocol

Commands: `{ cmd: "name", cid: "abc123", data: {...} }`
Queries: `{ q: "name", id: 1, params: {...} }`
Events: `{ ev: "name", data: {...} }`

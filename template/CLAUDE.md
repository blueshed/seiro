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

Two approaches for designing CQRS systems:

### Quick Path: Conversational Design

Use the `cqrs-document` skill for direct conversation-to-code design. Good for smaller systems or rapid prototyping.

1. Discuss what the user sees (documents)
2. Derive entities and commands through conversation
3. Output SQL and TypeScript directly

### Model Path: Formal Domain Model

Use `seiro model` for larger systems where you want diagrams, consistency checking, and a complete view of the domain.

1. Use the `model-build` skill to build model.db through conversation
   ```bash
   bunx seiro model add entity Product
   bunx seiro model add document Catalogue
   bunx seiro model add command product.save
   # ... builds complete model via CLI
   ```

2. Visualise and verify
   ```bash
   bunx seiro model up      # start PlantUML
   bunx seiro model serve   # view diagrams
   ```

3. Use the `model-generate` skill to create application code from the export
   ```bash
   bunx seiro model export  # outputs JSON for code generation
   ```

Choose the quick path when you know what you're building. Choose the model path when you need to see the full picture first.

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

# New Entity Skill

Create a new entity with database, server handlers, and client types.

## Critical: Research First, Copy Patterns

**Before writing any code:**

1. **Read existing similar code** - Look at `auth/` for the pattern
2. **Copy patterns exactly** - Don't invent new approaches, follow what already works
3. **Check the wire protocol** - Review `CLAUDE.md` for message formats

## Type Definitions

Use `Command<D, R>` and `Query<P, R>` helpers for type-safe definitions:

```typescript
// {entity}/types.ts
import type { Command, Query } from "seiro";

export type {Entity} = {
  id: number;
  name: string;
  // fields...
};

export type {Entity}Commands = {
  "{entity}.create": Command<{ name: string }, { id: number }>;
  "{entity}.save": Command<{ id: number; name: string }, { id: number }>;
  "{entity}.delete": Command<{ id: number }, void>;
};

export type {Entity}Queries = {
  "{entity}s.all": Query<void, {Entity}>;
  "{entity}.detail": Query<{ id: number }, {Entity}Detail>;
};

export type {Entity}Events = {
  {entity}_created: {Entity};
  {entity}_updated: {Entity};
};
```

## Typed SQL Pattern

Use postgres library's type parameter:

```typescript
// Query returning multiple rows
server.query("{entity}s.all", async function* (_params, ctx) {
  if (!ctx.userId) throw new Error("Not authenticated");
  const rows = await sql<{ query_{entity}s_all: {Entity} }[]>`
    SELECT query_{entity}s_all(${ctx.userId})
  `;
  for (const row of rows) {
    yield row.query_{entity}s_all;
  }
});

// Command returning result
server.command("{entity}.save", async (data, ctx) => {
  if (!ctx.userId) throw new Error("Not authenticated");
  const [row] = await sql<[{ result: { id: number } }]>`
    SELECT cmd_{entity}_save(${ctx.userId}, ${sql.json(data)}) as result
  `;
  return row?.result;
});
```

## Steps

### 1. Types ({entity}/types.ts)

```typescript
import type { Command, Query } from "seiro";

export type {Entity} = {
  id: number;
  name: string;
};

export type {Entity}Commands = {
  "{entity}.create": Command<{ name: string }, { id: number }>;
  "{entity}.save": Command<{ id?: number; name: string }, { id: number }>;
  "{entity}.delete": Command<{ id: number }, void>;
};

export type {Entity}Queries = {
  "{entity}s.all": Query<void, {Entity}>;
};

export type {Entity}Events = {
  {entity}_created: {Entity};
  {entity}_updated: {Entity};
};
```

### 2. Database (init_db/)

Create a new numbered SQL file (e.g., `04_{entity}_tables.sql`):

```sql
-- Table
CREATE TABLE {entity}s (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Command: create
CREATE OR REPLACE FUNCTION cmd_{entity}_create(p_user_id INTEGER, data JSONB)
RETURNS JSONB AS $$
DECLARE
  v_result {entity}s;
BEGIN
  INSERT INTO {entity}s (user_id, name)
  VALUES (p_user_id, data->>'name')
  RETURNING * INTO v_result;

  RETURN jsonb_build_object('id', v_result.id);
END;
$$ LANGUAGE plpgsql;

-- Query: all for user
CREATE OR REPLACE FUNCTION query_{entity}s_all(p_user_id INTEGER)
RETURNS SETOF JSONB AS $$
  SELECT jsonb_build_object('id', id, 'name', name)
  FROM {entity}s
  WHERE user_id = p_user_id
  ORDER BY created_at DESC;
$$ LANGUAGE sql;
```

### 3. Server Handlers ({entity}/server.ts)

```typescript
import type { Sql } from "postgres";
import type { Server } from "seiro";
import type {
  {Entity},
  {Entity}Commands,
  {Entity}Queries,
  {Entity}Events,
} from "./types";

export function register<
  C extends {Entity}Commands,
  Q extends {Entity}Queries,
  E extends {Entity}Events,
>(server: Server<C, Q, E>, sql: Sql) {
  server.command("{entity}.create", async (data, ctx) => {
    if (!ctx.userId) throw new Error("Not authenticated");
    const [row] = await sql<[{ result: { id: number } }]>`
      SELECT cmd_{entity}_create(${ctx.userId}, ${sql.json(data)}) as result
    `;
    return row?.result;
  });

  server.query("{entity}s.all", async function* (_params, ctx) {
    if (!ctx.userId) throw new Error("Not authenticated");
    const rows = await sql<{ query_{entity}s_all: {Entity} }[]>`
      SELECT query_{entity}s_all(${ctx.userId})
    `;
    for (const row of rows) {
      yield row.query_{entity}s_all;
    }
  });
}

export const channels = ["{entity}_created", "{entity}_updated"] as const;
```

### 4. Register Types (types.ts)

```typescript
import type { {Entity}Commands, {Entity}Queries, {Entity}Events } from "./{entity}/types";
export type { {Entity} } from "./{entity}/types";

export type Commands = AuthCommands & {Entity}Commands;
export type Queries = AuthQueries & {Entity}Queries;
export type Events = AuthEvents & {Entity}Events;
```

### 5. Register in Server (server.ts)

```typescript
import * as {entity} from "./{entity}/server";

{entity}.register(server, sql);
```

## Checklist

- [ ] Types use `Command<D, R>` and `Query<P, R>` helpers
- [ ] Server handlers use typed SQL: `sql<[{ result: Type }]>`
- [ ] Database functions return JSONB with `jsonb_build_object()`
- [ ] Tests written and passing

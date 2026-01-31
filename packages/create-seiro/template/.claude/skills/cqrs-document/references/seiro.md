# Seiro Protocol Reference

CQRS over WebSocket with Bun + Preact Signals + Web Components.

## Wire Format

```
← { profile }               sent on connect (User or null)

→ { cmd, cid, data }        command request
← { cid, result }           command success
← { cid, err }              command error

→ { q, id, params }         query request
← { id, row }               query row (repeated)
← { id }                    query end
← { id, err }               query error

← { ev, data }              event broadcast

→ { sub: "pattern" }        subscribe to events
→ { unsub: "pattern" }      unsubscribe
```

## Type Definitions

Use `Command<D, R>` and `Query<P, R>` helpers:

```typescript
import type { Command, Query } from "seiro";

export type Entity = {
  id: number;
  name: string;
};

export type EntityCommands = {
  "entity.create": Command<{ name: string }, { id: number }>;
  "entity.save": Command<{ id: number; name: string }, { id: number }>;
};

export type EntityQueries = {
  "entities.all": Query<void, Entity>;
  "entity.detail": Query<{ id: number }, EntityDetail>;
};

export type EntityEvents = {
  entity_created: Entity;
  entity_updated: Entity;
};
```

## Server Setup

```typescript
import postgres from "postgres";
import { createServer } from "seiro/server";
import * as auth from "./auth/server";
import * as entity from "./entity/server";

const sql = postgres(DATABASE_URL);

const server = createServer({
  port: 3000,
  auth: {
    verify: auth.verifyToken,
    public: ["auth.register", "auth.login"],
  },
  healthCheck: async () => {
    await sql`SELECT 1`;
    return true;
  },
});

// Register domain handlers
auth.register(server, sql);
await entity.register(server, sql, listener);  // with pg_notify listener

await server.start({ "/": homepage });
```

## Server Handler Pattern

```typescript
import type { Sql } from "postgres";
import type { Server } from "seiro";
import type { Entity, EntityCommands, EntityQueries, EntityEvents } from "./types";

// Channels for pg_notify events
const channels = ["entity_created", "entity_updated"] as const;

export async function register<
  C extends EntityCommands,
  Q extends EntityQueries,
  E extends EntityEvents,
>(server: Server<C, Q, E>, sql: Sql, listener?: Sql) {
  // Listen to postgres notifications (if listener provided)
  if (listener) {
    for (const channel of channels) {
      await listener.listen(channel, (payload: string) => {
        try {
          server.emit(channel, JSON.parse(payload) as Entity);
        } catch {
          // ignore malformed payloads
        }
      });
    }
  }

  // Command with typed result
  server.command("entity.save", async (data, ctx) => {
    if (!ctx.userId) throw new Error("Not authenticated");
    const [row] = await sql<[{ result: { id: number } }]>`
      SELECT cmd_entity_save(${ctx.userId}, ${sql.json(data)}) as result
    `;
    return row?.result;
  });

  // Query with typed rows (generator)
  server.query("entities.all", async function* (_params, ctx) {
    if (!ctx.userId) throw new Error("Not authenticated");
    const rows = await sql<{ query_entities_all: Entity }[]>`
      SELECT query_entities_all(${ctx.userId})
    `;
    for (const row of rows) {
      yield row.query_entities_all;
    }
  });
}
```

## Client Setup

```typescript
import { createClient, effect } from "seiro/client";
import type { Commands, Queries, Events, User } from "./types";

const client = createClient<Commands, Queries, Events>(wsUrl);

// Connect returns profile (User | null)
const profile = await client.connect<User>();

// Set up event listeners before subscribing
client.on("entity_created", (data) => updateList(data));

// Start receiving events
client.subscribe();
```

## Client API

```typescript
// Command with callbacks
client.cmd("entity.save", { id: 1, name: "Updated" }, {
  onSuccess: (result) => navigate(`#/entities/${result.id}`),
  onError: (err) => showError(err),
});

// Query (async iterator)
for await (const row of client.query("entities.all")) {
  items.push(row);
}

// Query all at once
const items = await client.queryAll("entities.all");

// Event subscription (returns unsubscribe function)
const unsubscribe = client.on("entity_*", (data) => handle(data));

// Sync events to a signal with reducer
const entities = client.sync("entity_updated", initialState, (state, event) => {
  return { ...state, [event.id]: event };
});

// Sync events to a Map signal
const entityMap = client.syncMap("entity_updated", (e) => e.id);

// Connection state (reactive signal)
effect(() => {
  if (client.connected.value) {
    console.log("Connected");
  }
});

// Auth token management
client.setToken(token);
client.getToken();
client.logout();  // clears token

// Connection management
client.close();
await client.reconnect();
```

## Web Component Pattern

```typescript
import { signal, effect } from "seiro/client";
import type { Client } from "seiro";
import type { Commands, Queries, Events, Entity } from "../types";

type AppClient = Client<Commands, Queries, Events>;

// Module-level state
const entities = signal<Map<number, Entity>>(new Map());
let client: AppClient;

export function initEntity(c: AppClient) {
  client = c;
  client.on("entity_created", (entity) => {
    const next = new Map(entities.value);
    next.set(entity.id, entity);
    entities.value = next;
  });
}

class EntityList extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `<div data-list></div>`;
    const list = this.querySelector("[data-list]")!;

    effect(() => {
      const items = Array.from(entities.value.values());
      list.innerHTML = items
        .map(e => `<div>${e.name}</div>`)
        .join("") || "<p>None yet</p>";
    });
  }
}

customElements.define("entity-list", EntityList);
```

## File Structure

```
project/
  types.ts              # Combined Commands, Queries, Events
  server.ts             # Server setup, registers handlers
  app.ts                # Client setup, routing
  init_db/              # SQL migrations
  {domain}/
    types.ts            # Domain types using Command/Query helpers
    server.ts           # Domain handlers with typed SQL
  components/
    {domain}.ts         # Web Components with signals
    shared/
      modal.ts          # Shared modal utilities
      router.ts         # Hash-based routing
```

## SQL Conventions

Commands return `{ id }` via JSONB:

```sql
CREATE FUNCTION cmd_entity_save(p_user_id int, data jsonb)
RETURNS jsonb AS $$
DECLARE
  v_entity entities%ROWTYPE;
BEGIN
  INSERT INTO entities (user_id, name)
  VALUES (p_user_id, data->>'name')
  RETURNING * INTO v_entity;

  PERFORM pg_notify('entity_created', row_to_json(v_entity)::text);
  RETURN jsonb_build_object('id', v_entity.id);
END;
$$ LANGUAGE plpgsql;
```

Queries return SETOF jsonb:

```sql
CREATE FUNCTION query_entities_all(p_user_id int)
RETURNS SETOF jsonb AS $$
  SELECT jsonb_build_object('id', id, 'name', name)
  FROM entities
  WHERE user_id = p_user_id
  ORDER BY created_at DESC;
$$ LANGUAGE sql;
```

## Streaming Queries

Queries stream rows over the WebSocket - each row is sent as soon as the server yields it, and the client can process rows as they arrive.

### How It Works

**Server:** Each `yield` sends a message immediately:

```typescript
server.query("logs.recent", async function* (params, ctx) {
  const rows = await sql`SELECT * FROM logs LIMIT 1000`;
  for (const row of rows) {
    yield row;  // sent to client immediately
  }
});
```

**Wire:** Rows stream as individual messages:

```
→ { q: "logs.recent", id: 1, params: {} }
← { id: 1, row: { id: 1, message: "..." } }   // immediate
← { id: 1, row: { id: 2, message: "..." } }   // immediate
← { id: 1, row: { id: 3, message: "..." } }   // immediate
...
← { id: 1 }                                    // end marker
```

**Client:** Process rows as they arrive:

```typescript
// Streaming - handle each row immediately
for await (const row of client.query("logs.recent")) {
  appendToUI(row);  // renders while more rows are coming
}

// Or collect all (waits for stream to complete)
const all = await client.queryAll("logs.recent");
```

### Use Cases

- **Large datasets:** Render first results while fetching more
- **Progress feedback:** Show items appearing one by one
- **Memory efficiency:** Process rows without holding all in memory
- **Responsive UI:** User sees data immediately, not after full load

### True End-to-End Streaming

The example above streams WebSocket delivery, but SQL fetches all rows first. For true streaming from database to client, use cursors:

```typescript
server.query("logs.stream", async function* (params, ctx) {
  // Cursor-based streaming from postgres
  const cursor = sql`SELECT * FROM logs`.cursor(100);
  for await (const rows of cursor) {
    for (const row of rows) {
      yield row;
    }
  }
});
```

## Conventions

- Commands return `{ id }` for create/save operations
- Queries stream rows - each `yield` sends immediately, end with empty `{ id }`
- Use typed SQL: `sql<[{ result: Type }]>` or `sql<{ fn_name: Type }[]>`
- Events broadcast full data via pg_notify
- Pattern subscriptions support wildcards: `entity_*`

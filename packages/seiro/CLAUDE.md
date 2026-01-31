# Seiro - AI Documentation

CQRS over WebSocket with Bun + Preact Signals.

## Wire Protocol

```
← { profile }               sent on connect (User or null)

→ { cmd, cid, data }        command request
← { cid, result }           command success
← { cid, err }              command error

→ { q, id, params }         query request
← { id, row }               query row (streamed, repeated)
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
  "entity.detail": Query<{ id: number }, Entity>;
};

export type EntityEvents = {
  entity_created: Entity;
  entity_updated: Entity;
  entity_deleted: { id: number };  // different payload types allowed
};
```

## Server

### Setup

```typescript
import postgres from "postgres";
import { createServer } from "seiro/server";

const sql = postgres(DATABASE_URL);
const listener = postgres(DATABASE_URL);  // separate connection for pg_notify

const server = createServer<Commands, Queries, Events>({
  port: 3000,
  auth: {
    verify: async (token) => userId | null,  // return userId or null
    public: ["auth.register", "auth.login"],  // commands that don't require auth
  },
  healthCheck: async () => {
    await sql`SELECT 1`;
    return true;
  },
});

// Register domain handlers
await entity.register(server, sql, listener);

await server.start({ "/": homepage });
```

### Domain Handler Pattern

```typescript
import type { Sql } from "postgres";
import type { Server } from "seiro";

export async function register<
  C extends EntityCommands,
  Q extends EntityQueries,
  E extends EntityEvents,
>(server: Server<C, Q, E>, sql: Sql, listener?: Sql) {
  // Listen to postgres notifications
  if (listener) {
    await listener.listen("entity_created", (payload: string) => {
      try {
        server.emit("entity_created", JSON.parse(payload) as Entity);
      } catch (e) {
        console.error("Failed to parse entity_created payload:", payload, e);
      }
    });

    await listener.listen("entity_deleted", (payload: string) => {
      try {
        server.emit("entity_deleted", JSON.parse(payload) as { id: number });
      } catch (e) {
        console.error("Failed to parse entity_deleted payload:", payload, e);
      }
    });
  }

  // Command - returns result
  server.command("entity.save", async (data, ctx) => {
    if (!ctx.userId) throw new Error("Not authenticated");
    const [row] = await sql<[{ result: { id: number } }]>`
      SELECT cmd_entity_save(${ctx.userId}, ${sql.json(data)}) as result
    `;
    return row?.result;
  });

  // Query - streams rows via generator
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

### Server Methods

- `server.command(name, handler)` - Register command handler
- `server.query(name, handler)` - Register query handler (async generator)
- `server.onOpen(handler)` - Handle new connections (send profile)
- `server.emit(event, data)` - Broadcast event to subscribed clients
- `server.start(routes?)` - Start server with optional static routes

### Command Context

```typescript
server.command("auth.login", async (data, ctx) => {
  ctx.userId;           // current user ID or null
  ctx.setUserId(id);    // set user ID for this connection
  ctx.send(event, data); // send event to this client only
});
```

## Client

### Setup

```typescript
import { createClient, effect } from "seiro/client";

const client = createClient<Commands, Queries, Events>(wsUrl, {
  tokenKey: "my_token",  // localStorage key (default: "seiro_token")
  token: "...",          // initial token (optional)
});

const profile = await client.connect<User>();  // returns profile or null
client.subscribe();  // start receiving events
```

### Client Methods

```typescript
// Commands
client.cmd("entity.save", { id: 1, name: "Updated" }, {
  onSuccess: (result) => console.log(result.id),
  onError: (err) => console.error(err),
});

// Queries - streaming
for await (const row of client.query("entities.all")) {
  items.push(row);
}

// Queries - collect all
const items = await client.queryAll("entities.all");

// Events
const unsubscribe = client.on("entity_*", (data) => handle(data));

// Sync to signal with reducer
const state = client.sync("entity_updated", initial, (state, event) => newState);

// Sync to Map signal
const entityMap = client.syncMap("entity_updated", (e) => e.id);

// Connection state
effect(() => {
  if (client.connected.value) console.log("Connected");
});

// Auth
client.setToken(token);
client.getToken();
client.logout();  // clears token

// Connection
client.close();
await client.reconnect();
```

## Streaming Queries

Queries stream rows over WebSocket - each `yield` sends immediately:

**Server:**
```typescript
server.query("logs.stream", async function* (params, ctx) {
  const cursor = sql`SELECT * FROM logs`.cursor(100);
  for await (const rows of cursor) {
    for (const row of rows) {
      yield row;  // sent immediately
    }
  }
});
```

**Client:**
```typescript
for await (const row of client.query("logs.stream")) {
  appendToUI(row);  // renders while more rows coming
}
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

## Exports

```typescript
// Types
import type { Command, Query, Server, Client } from "seiro";

// Server
import { createServer } from "seiro/server";

// Client  
import { createClient, signal, computed, effect } from "seiro/client";

// Protocol (internal)
import { encode, decode, isCmd, isQuery, isEvent } from "seiro/protocol";
```

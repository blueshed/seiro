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

← { ev, data, id? }         event broadcast (id is the events-log row id
                            as a string; present for both live and
                            backfilled events)

→ { sub: "pattern", since? } subscribe; if `since` is a bigint-string the
                            server replays events with id > since
                            matching the pattern before live delivery
→ { unsub: "pattern" }      unsubscribe
```

Events carry a monotonic `id` so clients can dedup and advance a resume
cursor. All new fields are additive -- old clients ignore `id` and never
send `since`, which keeps them forward-compatible.

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

// Wire the single event relay (LISTEN events, fans out via server.emit)
await createEventRelay<Events>({
  listen: (ch, h) => listener.listen(ch, h),
  fetchByIds: (ids) => sql`SELECT type, payload FROM events WHERE id = ANY(${ids}::bigint[]) ORDER BY id`,
  emit: (event, data) => server.emit(event, data),
});

// Register domain handlers
await entity.register(server, sql);

await server.start({ "/": homepage });
```

### Domain Handler Pattern

Domains register commands and queries only. Events reach clients via the
top-level event relay (see below) -- `cmd_*` functions append to the `events`
table and the relay fans them out. Domains never call `LISTEN` directly.

```typescript
import type { Sql } from "postgres";
import type { Server } from "seiro";

export async function register<
  C extends EntityCommands,
  Q extends EntityQueries,
  E extends EntityEvents,
>(server: Server<C, Q, E>, sql: Sql) {
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

### Event Relay

Wire one relay per server. It owns the single `LISTEN events` connection,
coalesces notified ids, fetches rows in a single batch, and calls
`server.emit` per event. Passing `fetchSince` + `setBackfill` enables
reconnect resume via `{sub, since}`:

```typescript
import { createEventRelay } from "seiro/server";

await createEventRelay<Events>({
  listen: (channel, onNotify) => listener.listen(channel, onNotify),
  fetchByIds: async (ids) => sql<
    { id: string; type: string; payload: unknown }[]
  >`
    SELECT id::text AS id, type, payload FROM events
    WHERE id = ANY(${ids}::bigint[])
    ORDER BY id
  `,
  fetchSince: async function* (pattern, since) {
    // Translate seiro's suffix-wildcard (foo_*) into a SQL LIKE expression
    // with `#` as the escape char so underscores in event type names match
    // literally. See `example/server.ts` for `patternToLike`.
    const like = patternToLike(pattern);
    const rows = await sql<
      { id: string; type: string; payload: unknown }[]
    >`
      SELECT id::text AS id, type, payload FROM events
      WHERE id > ${since}::bigint
        AND type LIKE ${like} ESCAPE '#'
      ORDER BY id
    `;
    for (const row of rows) yield row;
  },
  setBackfill: (fn) => server.setBackfill(fn),
  emit: (event, data, meta) => server.emit(event, data, meta),
  // channel: "events"   -- override if you use a different notify channel
  // batchMs: 5          -- coalesce window
});
```

`fetchSince` receives the raw subscription pattern, the client's last-seen
event id (as a string to stay bigint-safe), and a `{ userId }` context so
you can scope replays. Events emitted between the SELECT and the
client's addition to the subscription map are delivered live and deduped
on the client by id -- no coordination needed.

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
  tokenKey: "my_token",       // localStorage key (default: "seiro_token")
  token: "...",                // initial token (optional)
  eventIdKey: "my_last_event", // localStorage key for resume cursor
                                // (default: `${tokenKey}_last_event_id`)
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
client.logout();  // clears token and the resume cursor

// Resume cursor
client.getLastEventId();  // string | null -- highest event id seen so far

// Connection
client.close();
await client.reconnect();  // after reconnect, call subscribe() again;
                           // it will send {sub, since: lastEventId} so the
                           // server backfills anything missed while offline
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

### Events log

One log table per database. cmd_* functions append rows here and fire a
single `pg_notify('events', id::text)`:

```sql
CREATE TABLE events (
  id         BIGSERIAL PRIMARY KEY,
  type       TEXT NOT NULL,
  user_id    INT,
  payload    JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_type_id ON events (type, id DESC);

CREATE FUNCTION emit_event(p_type TEXT, p_user_id INT, p_payload JSONB)
RETURNS BIGINT AS $$
DECLARE
  v_id BIGINT;
BEGIN
  INSERT INTO events (type, user_id, payload)
  VALUES (p_type, p_user_id, p_payload)
  RETURNING id INTO v_id;
  PERFORM pg_notify('events', v_id::text);
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;
```

This keeps payloads off the 8KB NOTIFY channel, gives a durable audit trail,
and (in a follow-up phase) enables `since`-cursor resume on reconnect.

### Command functions

Commands return `{ id }` via JSONB and call `emit_event` -- never `pg_notify`
directly:

```sql
CREATE FUNCTION cmd_entity_save(p_user_id int, data jsonb)
RETURNS jsonb AS $$
DECLARE
  v_entity entities%ROWTYPE;
BEGIN
  INSERT INTO entities (user_id, name)
  VALUES (p_user_id, data->>'name')
  RETURNING * INTO v_entity;

  PERFORM emit_event(
    'entity_created',
    p_user_id,
    jsonb_build_object('id', v_entity.id, 'name', v_entity.name)
  );
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
import { createServer, createEventRelay } from "seiro/server";

// Client  
import { createClient, signal, computed, effect } from "seiro/client";

// Protocol (internal)
import { encode, decode, isCmd, isQuery, isEvent } from "seiro/protocol";
```

# Seiro

CQRS over WebSocket with Bun and Preact Signals.

## Installation

```bash
bun add seiro @preact/signals-core
```

## Quick Start

### Server

```typescript
import { createServer } from "seiro/server";
import type { Command, Query } from "seiro";

type Commands = {
  "user.create": Command<{ name: string }, { id: number }>;
};

type Queries = {
  "users.all": Query<void, { id: number; name: string }>;
};

type Events = {
  "user.created": { id: number; name: string };
};

const server = createServer<Commands, Queries, Events>();

server.command("user.create", async (data, ctx) => {
  // Insert user into database
  const id = 1;
  server.emit("user.created", { id, name: data.name });
  return { id };
});

server.query("users.all", async function* (params, ctx) {
  // Stream users from database
  yield { id: 1, name: "Alice" };
  yield { id: 2, name: "Bob" };
});

server.start();
```

### Client

```typescript
import { createClient, signal, effect } from "seiro/client";

type Commands = {
  "user.create": Command<{ name: string }, { id: number }>;
};

type Queries = {
  "users.all": Query<void, { id: number; name: string }>;
};

type Events = {
  "user.created": { id: number; name: string };
};

const client = createClient<Commands, Queries, Events>("ws://localhost:3000/ws");

await client.connect();

// Send command with callbacks (server sends response)
client.cmd("user.create", { name: "Alice" }, {
  onSuccess: (result) => console.log("Created:", result.id),
  onError: (err) => console.error("Failed:", err),
});

// Fire-and-forget command (no callbacks, no response)
client.cmd("analytics.track", { event: "signup" });

// Query with streaming
for await (const user of client.query("users.all")) {
  console.log(user);
}

// Subscribe to events
client.on("user.created", (data) => {
  console.log("New user:", data);
});
client.subscribe();
```

## Type System

Define your commands, queries, and events with full type safety:

```typescript
import type { Command, Query } from "seiro";

// Command<Data, Result>
type MyCommands = {
  "entity.create": Command<{ name: string }, { id: number }>;
  "entity.delete": Command<{ id: number }, void>;
};

// Query<Params, Row>
type MyQueries = {
  "entities.all": Query<void, Entity>;
  "entities.byId": Query<{ id: number }, Entity>;
};

// Events are just payload types
type MyEvents = {
  "entity.created": Entity;
  "entity.deleted": { id: number };
};
```

## Features

- **Type-safe**: Full TypeScript support for commands, queries, and events
- **Streaming queries**: Queries yield rows as they're fetched
- **Reactive**: Built-in Preact Signals integration
- **Authentication**: Token-based auth with public/private routes
- **Subscriptions**: Pattern-based event subscriptions

## License

MIT

import postgres from "postgres";
import { createServer, createEventRelay } from "seiro/server";
import homepage from "./index.html";
import { register as registerShipment } from "./shipment/server";
import { register as registerAuth, verifyToken } from "./auth/server";
import type { Commands, Queries, Events } from "./types";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://seiro:seiro@localhost:5432/seiro";
const PORT = parseInt(process.env.PORT ?? "3000", 10);
const sql = postgres(DATABASE_URL);
const listener = postgres(DATABASE_URL);

const server = createServer<Commands, Queries, Events>({
  port: PORT,
  auth: {
    verify: verifyToken,
    public: ["auth.register", "auth.login"],
  },
  healthCheck: async () => {
    await sql`SELECT 1`;
    return true;
  },
});

// One LISTEN channel for every domain: the events table is the log, pg_notify
// carries only the row id, and the relay fetches rows and fans out to
// pattern-matched subscribers.
await createEventRelay<Events>({
  listen: (channel, onNotify) => listener.listen(channel, onNotify),
  fetchByIds: async (ids) => {
    const rows = await sql<{ type: string; payload: unknown }[]>`
      SELECT type, payload FROM events
      WHERE id = ANY(${ids}::bigint[])
      ORDER BY id
    `;
    return rows;
  },
  emit: (event, data) => server.emit(event, data),
});

registerAuth(server, sql);
await registerShipment(server, sql);

const app = await server.start({ "/": homepage });

console.log(`Server running at ${app.url}`);
console.log(`WebSocket at ws://localhost:${PORT}/ws`);

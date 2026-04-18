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

// Translate a seiro subscription pattern ("shipment_*") into a SQL LIKE
// expression, escaping the SQL metachars `_` and `%` using `#` so event
// type names with underscores match exactly.
function patternToLike(pattern: string): string {
  const hasStar = pattern.endsWith("*");
  const core = hasStar ? pattern.slice(0, -1) : pattern;
  const escaped = core.replace(/([#_%])/g, "#$1");
  return hasStar ? `${escaped}%` : escaped;
}

// One LISTEN channel for every domain: the events table is the log, pg_notify
// carries only the row id, and the relay fetches rows and fans out to
// pattern-matched subscribers. `fetchSince` powers reconnect resume.
await createEventRelay<Events>({
  listen: (channel, onNotify) => listener.listen(channel, onNotify),
  fetchByIds: async (ids) => {
    const rows = await sql<
      { id: string; type: string; payload: unknown }[]
    >`
      SELECT id::text AS id, type, payload FROM events
      WHERE id = ANY(${ids}::bigint[])
      ORDER BY id
    `;
    return rows;
  },
  fetchSince: async function* (pattern, since) {
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
});

registerAuth(server, sql);
await registerShipment(server, sql);

const app = await server.start({ "/": homepage });

console.log(`Server running at ${app.url}`);
console.log(`WebSocket at ws://localhost:${PORT}/ws`);

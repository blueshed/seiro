import postgres from "postgres";
import { createServer } from "seiro/server";
import homepage from "./index.html";
import { register as registerShipment } from "./shipment/server";
import { register as registerAuth, verifyToken } from "./auth/server";
import type { Commands, Queries, Events } from "./types";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://seiro:seiro@localhost:5432/seiro";
const sql = postgres(DATABASE_URL);
const listener = postgres(DATABASE_URL);

const server = createServer<Commands, Queries, Events>({
  port: 3000,
  auth: {
    verify: verifyToken,
    public: ["auth.register", "auth.login"],
  },
  healthCheck: async () => {
    await sql`SELECT 1`;
    return true;
  },
});

registerAuth(server, sql);
await registerShipment(server, sql, listener);

const app = await server.start({ "/": homepage });

console.log(`Server running at ${app.url}`);
console.log(`WebSocket at ws://localhost:3000/ws`);

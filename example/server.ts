import postgres from "postgres";
import { createServer } from "seiro/server";
import homepage from "./index.html";
import {
  register as registerShipment,
  channels as shipmentChannels,
} from "./shipment/server";
import { register as registerAuth, verifyToken } from "./auth/server";
import type { Commands, Queries, Events, Shipment } from "./types";

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
registerShipment(server, sql);

// Listen to postgres notifications - shipments
for (const channel of shipmentChannels) {
  await listener.listen(channel, (payload: string) => {
    try {
      server.emit(channel, JSON.parse(payload) as Shipment);
    } catch {
      // ignore malformed payloads
    }
  });
}

const app = await server.start({ "/": homepage });

console.log(`Server running at ${app.url}`);
console.log(`WebSocket at ws://localhost:3000/ws`);

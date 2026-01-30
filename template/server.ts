import postgres from "postgres";
import { createServer } from "seiro/server";
import homepage from "./index.html";
import * as auth from "./auth/server";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://seiro:seiro@localhost:5432/seiro";

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

// Register auth handlers
auth.register(server, sql);

const app = await server.start({ "/": homepage });

console.log(`Server running at ${app.url}`);
console.log(`WebSocket at ws://localhost:3000/ws`);

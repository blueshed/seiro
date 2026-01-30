import postgres from "postgres";
import { createServer } from "seiro/server";
import type { Commands, Queries, Events } from "./types";
import * as auth from "./auth/server";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://seiro:seiro@localhost:5432/seiro";

const sql = postgres(DATABASE_URL);

const server = createServer<Commands, Queries, Events>({
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

// Serve static files and start
const indexHtml = await Bun.file("index.html").text();

await server.start({
  "/": new Response(indexHtml, {
    headers: { "Content-Type": "text/html" },
  }),
  "/app.js": async () => {
    const result = await Bun.build({
      entrypoints: ["./app.ts"],
      minify: false,
    });
    return new Response(result.outputs[0], {
      headers: { "Content-Type": "application/javascript" },
    });
  },
});

console.log("Server running on http://localhost:3000");

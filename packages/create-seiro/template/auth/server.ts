import type { Sql } from "postgres";
import type { Server } from "seiro";
import type {
  User,
  AuthResult,
  AuthCommands,
  AuthQueries,
  AuthEvents,
} from "./types";

const JWT_SECRET =
  process.env.JWT_SECRET ?? "seiro-dev-secret-change-in-production";
const JWT_EXPIRY = process.env.JWT_EXPIRY ?? "7d";

// DB row shape (snake_case from postgres)
type UserRow = { id: number; email: string; created_at: string };

function toUser(row: UserRow): User {
  return { id: row.id, email: row.email, createdAt: row.created_at };
}

// Simple JWT implementation using Bun's native crypto
async function signToken(userId: number): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const expiry = parseExpiry(JWT_EXPIRY);
  const payload = { sub: userId, iat: now, exp: now + expiry };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "");
  const data = `${headerB64}.${payloadB64}`;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  const signatureB64 = btoa(
    String.fromCharCode(...new Uint8Array(signature)),
  ).replace(/=/g, "");

  return `${data}.${signatureB64}`;
}

export async function verifyToken(token: string): Promise<number | null> {
  try {
    const [headerB64, payloadB64, signatureB64] = token.split(".");
    if (!headerB64 || !payloadB64 || !signatureB64) return null;

    const encoder = new TextEncoder();
    const data = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const signature = Uint8Array.from(atob(signatureB64), (c) =>
      c.charCodeAt(0),
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(data),
    );
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload.sub;
  } catch {
    return null;
  }
}

function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match || !match[1] || !match[2]) return 7 * 24 * 60 * 60; // default 7 days
  const value = parseInt(match[1], 10);
  const unit = match[2];
  switch (unit) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 60 * 60;
    case "d":
      return value * 24 * 60 * 60;
    default:
      return 7 * 24 * 60 * 60;
  }
}

export function register<
  C extends AuthCommands,
  Q extends AuthQueries,
  E extends AuthEvents,
>(server: Server<C, Q, E>, sql: Sql) {
  // Send profile on connect
  server.onOpen(async (ctx) => {
    if (!ctx.userId) {
      ctx.send({ profile: null });
      return;
    }
    const [row] = await sql<[{ query_auth_profile: UserRow }?]>`
      SELECT query_auth_profile(${ctx.userId}, ${sql.json({})})
    `;
    if (row) {
      ctx.send({ profile: toUser(row.query_auth_profile) });
    } else {
      ctx.send({ profile: null });
    }
  });

  server.command("auth.register", async (data, ctx) => {
    const [row] = await sql<[{ result: UserRow }]>`
      SELECT cmd_auth_register(${sql.json(data)}) as result
    `;
    if (!row?.result) throw new Error("Registration failed");

    const user = toUser(row.result);
    const token = await signToken(user.id);
    ctx.setUserId(user.id);
    return { token, user } as AuthResult;
  });

  server.command("auth.login", async (data, ctx) => {
    const [row] = await sql<[{ result: UserRow }]>`
      SELECT cmd_auth_login(${sql.json(data)}) as result
    `;
    if (!row?.result) throw new Error("Invalid email or password");

    const user = toUser(row.result);
    const token = await signToken(user.id);
    ctx.setUserId(user.id);
    return { token, user } as AuthResult;
  });

  server.query("auth.profile", async function* (_params, ctx) {
    if (!ctx.userId) throw new Error("Not authenticated");
    const rows = await sql<{ query_auth_profile: UserRow }[]>`
      SELECT query_auth_profile(${ctx.userId}, ${sql.json({})})
    `;
    for (const row of rows) {
      yield toUser(row.query_auth_profile);
    }
  });
}

export const channels: string[] = [];

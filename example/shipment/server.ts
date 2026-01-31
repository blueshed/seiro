import type { Sql } from "postgres";
import type { Server } from "seiro";
import type {
  Shipment,
  ShipmentCommands,
  ShipmentQueries,
  ShipmentEvents,
} from "./types";

const channels = [
  "shipment_created",
  "shipment_claimed",
  "shipment_delivered",
] as const;

export async function register<
  C extends ShipmentCommands,
  Q extends ShipmentQueries,
  E extends ShipmentEvents,
>(server: Server<C, Q, E>, sql: Sql, listener?: Sql) {
  // Listen to postgres notifications
  if (listener) {
    for (const channel of channels) {
      await listener.listen(channel, (payload: string) => {
        try {
          server.emit(channel, JSON.parse(payload) as Shipment);
        } catch {
          // ignore malformed payloads
        }
      });
    }
  }
  // Commands

  server.command("shipment.create", async (data, ctx) => {
    if (!ctx.userId) throw new Error("Not authenticated");
    await sql`SELECT cmd_shipment_create(${ctx.userId}, ${sql.json(data)})`;
  });

  server.command("shipment.claim", async (data, ctx) => {
    if (!ctx.userId) throw new Error("Not authenticated");
    await sql`SELECT cmd_shipment_claim(${ctx.userId}, ${sql.json(data)})`;
  });

  server.command("shipment.deliver", async (data, ctx) => {
    if (!ctx.userId) throw new Error("Not authenticated");
    await sql`SELECT cmd_shipment_deliver(${ctx.userId}, ${sql.json(data)})`;
  });

  // Queries

  server.query("shipments.all", async function* (params, ctx) {
    if (!ctx.userId) throw new Error("Not authenticated");
    const rows = await sql<{ query_shipments_all: Shipment }[]>`
      SELECT query_shipments_all(${ctx.userId}, ${sql.json(params ?? {})})
    `;
    for (const row of rows) {
      yield row.query_shipments_all;
    }
  });

  server.query("shipments.by_status", async function* (params, ctx) {
    if (!ctx.userId) throw new Error("Not authenticated");
    const rows = await sql<{ query_shipments_by_status: Shipment }[]>`
      SELECT query_shipments_by_status(${ctx.userId}, ${sql.json(params)})
    `;
    for (const row of rows) {
      yield row.query_shipments_by_status;
    }
  });

  server.query("shipment.by_id", async function* (params, ctx) {
    if (!ctx.userId) throw new Error("Not authenticated");
    const rows = await sql<{ query_shipment_by_id: Shipment }[]>`
      SELECT query_shipment_by_id(${ctx.userId}, ${sql.json(params)})
    `;
    for (const row of rows) {
      yield row.query_shipment_by_id;
    }
  });
}

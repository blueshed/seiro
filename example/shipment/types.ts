import type { Command, Query } from "seiro";

export type Shipment = {
  id: string;
  userId: number;
  origin: string;
  dest: string;
  status: "pending" | "claimed" | "delivered";
  carrierId: string | null;
};

export type ShipmentCommands = {
  "shipment.create": Command<{ origin: string; dest: string }, Shipment>;
  "shipment.claim": Command<{ id: string; carrierId: string }, Shipment>;
  "shipment.deliver": Command<{ id: string }, Shipment>;
};

export type ShipmentQueries = {
  "shipments.all": Query<void, Shipment>;
  "shipments.by_status": Query<{ status: string }, Shipment>;
  "shipment.by_id": Query<{ id: string }, Shipment>;
};

export type ShipmentEvents = {
  shipment_created: Shipment;
  shipment_claimed: Shipment;
  shipment_delivered: Shipment;
};

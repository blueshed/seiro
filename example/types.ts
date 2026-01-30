// Combined types from all modules

import type {
  ShipmentCommands,
  ShipmentQueries,
  ShipmentEvents,
} from "./shipment/types";

import type { AuthCommands, AuthQueries, AuthEvents } from "./auth/types";

// Re-export entity types for convenience
export type { Shipment } from "./shipment/types";
export type { User, AuthResult } from "./auth/types";

// Combined types for server and client
export type Commands = ShipmentCommands & AuthCommands;
export type Queries = ShipmentQueries & AuthQueries;
export type Events = ShipmentEvents & AuthEvents;

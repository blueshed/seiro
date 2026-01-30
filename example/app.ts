import { createClient } from "seiro/client";
import type { Commands, Queries, Events, User } from "./types";
import { initAuth } from "./components/auth";
import { initShipments } from "./components/shipments";
import "./components/auth";
import "./components/shipments";

// Create client
const wsUrl = `ws://${window.location.host}/ws`;
const client = createClient<Commands, Queries, Events>(wsUrl);

// Connect and initialize
async function main() {
  const profile = await client.connect<User>();
  initShipments(client);
  initAuth(client, profile);
  client.subscribe();
}

main().catch(console.error);

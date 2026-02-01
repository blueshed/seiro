#!/usr/bin/env bun
/**
 * Seiro CLI
 *
 * Usage:
 *   bunx seiro model <command> [args] [options]
 */

import { main as modelMain } from "./model/cli";

const args = Bun.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
seiro - CQRS over WebSocket

Usage:
  bunx seiro <command> [args]

Commands:
  model     CQRS domain modelling CLI

Run 'bunx seiro model --help' for model CLI documentation.
`);
}

if (!command || command === "-h" || command === "--help") {
  printHelp();
  process.exit(0);
}

if (command === "model") {
  await modelMain(args.slice(1));
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

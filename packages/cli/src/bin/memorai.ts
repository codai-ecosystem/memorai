#!/usr/bin/env node

/**
 * @fileoverview Memorai CLI binary entry point
 */

import { CLI } from "../cli/CLI.js";

// Create and run CLI
const cli = new CLI();

// Handle uncaught errors gracefully
process.on("uncaughtException", (_error) => {
  // Console statement removed for production
  process.exit(1);
});

process.on("unhandledRejection", (_reason) => {
  // Console statement removed for production
  process.exit(1);
});

// Run the CLI with process arguments
cli.run(process.argv).catch((_error) => {
  // Console statement removed for production
  process.exit(1);
});

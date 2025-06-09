#!/usr/bin/env node

/**
 * @fileoverview Memorai CLI binary entry point
 */

import { CLI } from './cli/CLI.js';

// Create and run CLI
const cli = new CLI();

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

// Run the CLI with process arguments
cli.run(process.argv).catch((error) => {
  console.error('CLI error:', error.message);
  process.exit(1);
});

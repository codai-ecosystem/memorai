#!/usr/bin/env node
/**
 * @fileoverview CLI entry point for Memorai MCP Server
 */

import { MemoryEngine } from "@codai/memorai-core";
import { MemoraiServer } from "./server/MemoraiServer.js";
import { Logger } from "./utils/Logger.js";

/**
 * Start the Memorai MCP Server
 */
async function startServer(): Promise<void> {
  try {
    Logger.info("Starting Memorai MCP Server...");

    // Initialize memory configuration
    const memoryConfig = {
      // Default configuration - can be overridden by environment variables
      vector_db: {
        url: process.env.QDRANT_URL || "http://localhost:6333",
        api_key: process.env.QDRANT_API_KEY,
        collection: "memories",
        dimension: 1536,
      },
      embedding: {
        provider: "openai" as const,
        api_key: process.env.OPENAI_API_KEY || "",
        model: "text-embedding-3-small",
      },
      redis: {
        url: process.env.REDIS_URL || "redis://localhost:6379",
        password: process.env.REDIS_PASSWORD,
        db: 0,
      },
      performance: {
        max_query_time_ms: 100,
        cache_ttl_seconds: 300,
        batch_size: 100,
      },
      security: {
        encryption_key:
          process.env.MEMORY_ENCRYPTION_KEY ||
          "default-key-for-development-only-32-chars",
        tenant_isolation: true,
        audit_logs: true,
      },
    };

    // Initialize memory engine
    const memoryEngine = new MemoryEngine(memoryConfig);

    // Create and start server
    const server = new MemoraiServer(memoryEngine);
    await server.start();

    // Graceful shutdown handling
    process.on("SIGINT", async () => {
      Logger.info("Received SIGINT, shutting down gracefully...");
      await server.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      Logger.info("Received SIGTERM, shutting down gracefully...");
      await server.stop();
      process.exit(0);
    });
  } catch (error: unknown) {
    Logger.error("Failed to start server", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export { startServer };

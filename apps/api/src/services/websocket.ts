import { Server as SocketIOServer } from "socket.io";
import { UnifiedMemoryEngine } from "@codai/memorai-core";
import { logger } from "../utils/logger";
import { updateStats, updateTierUsage } from "../routes/stats";

export function setupWebSocket(
  io: SocketIOServer,
  getMemoryEngine: () => UnifiedMemoryEngine | null,
) {
  io.on("connection", (socket) => {
    logger.info("WebSocket client connected", { id: socket.id });

    // Send initial connection info
    socket.emit("connected", {
      id: socket.id,
      timestamp: new Date().toISOString(),
    });

    // Handle memory operations via WebSocket
    socket.on("memory:remember", async (data, callback) => {
      try {
        const memoryEngine = getMemoryEngine();
        if (!memoryEngine) {
          callback({ error: "Memory engine not available" });
          return;
        }

        const startTime = Date.now();
        const result = await memoryEngine.remember(
          data.agentId,
          data.content,
          data.metadata,
        );
        const responseTime = Date.now() - startTime;
        updateStats("remember", data.agentId, responseTime);
        updateTierUsage(memoryEngine.getTierInfo().currentTier, 1);

        // Broadcast to all clients
        io.emit("memory:created", {
          agentId: data.agentId,
          memory: result,
          timestamp: new Date().toISOString(),
        });

        callback({ success: true, memory: result });
        logger.info("WebSocket memory stored", {
          agentId: data.agentId,
          memoryId: result,
        });
      } catch (error: unknown) {
        logger.error("WebSocket memory store failed", {
          error: (error as Error).message,
        });
        callback({ error: (error as Error).message });
      }
    });

    socket.on("memory:recall", async (data, callback) => {
      try {
        const memoryEngine = getMemoryEngine();
        if (!memoryEngine) {
          callback({ error: "Memory engine not available" });
          return;
        }

        const startTime = Date.now();
        const results = await memoryEngine.recall(
          data.agentId,
          data.query,
          data.limit ?? 10,
        );
        const responseTime = Date.now() - startTime;
        updateStats("recall", data.agentId, responseTime);
        updateTierUsage(memoryEngine.getTierInfo().currentTier, results.length);

        callback({ success: true, memories: results });
        logger.info("WebSocket memory recalled", {
          agentId: data.agentId,
          resultsCount: results.length,
        });
      } catch (error: unknown) {
        logger.error("WebSocket memory recall failed", {
          error: (error as Error).message,
        });
        callback({ error: (error as Error).message });
      }
    });

    socket.on("memory:forget", async (data, callback) => {
      try {
        const memoryEngine = getMemoryEngine();
        if (!memoryEngine) {
          callback({ error: "Memory engine not available" });
          return;
        }
        const startTime = Date.now();
        const success = await memoryEngine.forget(data.memoryId);
        const responseTime = Date.now() - startTime;

        if (success) {
          updateStats("forget", data.agentId, responseTime);
          updateTierUsage(memoryEngine.getTierInfo().currentTier, 1);

          // Broadcast to all clients
          io.emit("memory:deleted", {
            agentId: data.agentId,
            memoryId: data.memoryId,
            timestamp: new Date().toISOString(),
          });

          callback({ success: true });
          logger.info("WebSocket memory forgotten", {
            agentId: data.agentId,
            memoryId: data.memoryId,
          });
        } else {
          callback({ error: "Memory not found" });
        }
      } catch (error: unknown) {
        logger.error("WebSocket memory forget failed", {
          error: (error as Error).message,
        });
        callback({ error: (error as Error).message });
      }
    });

    socket.on("config:get", async (callback) => {
      try {
        const memoryEngine = getMemoryEngine();
        const config = {
          memoryEngine: {
            available: !!memoryEngine,
            tier: memoryEngine ? memoryEngine.getTierInfo() : null,
          },
          environment: {
            hasOpenAI: !!process.env.OPENAI_API_KEY,
            hasAzure: !!(
              process.env.AZURE_OPENAI_ENDPOINT &&
              process.env.AZURE_OPENAI_API_KEY
            ),
          },
        };

        callback({ success: true, config });
      } catch (error: unknown) {
        logger.error("WebSocket config get failed", {
          error: (error as Error).message,
        });
        callback({ error: (error as Error).message });
      }
    });

    socket.on("stats:get", async (callback) => {
      try {
        // Return basic stats via WebSocket
        const stats = {
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
        };

        callback({ success: true, stats });
      } catch (error: unknown) {
        logger.error("WebSocket stats get failed", {
          error: (error as Error).message,
        });
        callback({ error: (error as Error).message });
      }
    });

    // Handle real-time monitoring
    socket.on("monitor:start", () => {
      socket.join("monitors");
      logger.info("Client started monitoring", { id: socket.id });
    });

    socket.on("monitor:stop", () => {
      socket.leave("monitors");
      logger.info("Client stopped monitoring", { id: socket.id });
    });

    socket.on("disconnect", (reason) => {
      logger.info("WebSocket client disconnected", { id: socket.id, reason });
    });

    socket.on("error", (error) => {
      logger.error("WebSocket error", { id: socket.id, error });
    });
  }); // Broadcast system events
  const broadcastSystemEvent = (event: string, data: unknown) => {
    io.to("monitors").emit("system:event", {
      event,
      data,
      timestamp: new Date().toISOString(),
    });
  };

  // Example: Monitor memory engine health
  setInterval(() => {
    const memoryEngine = getMemoryEngine();
    if (memoryEngine) {
      broadcastSystemEvent("health:check", {
        tier: memoryEngine.getTierInfo(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      });
    }
  }, 30000); // Every 30 seconds

  return io;
}

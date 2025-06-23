/**
 * @fileoverview MCP Server for Memorai - Agent-native memory management
 * Implements Model Context Protocol for seamless agent integration
 */

export { MemoraiServer } from "./server/MemoraiServer.js";
export { MCPHandler } from "./handlers/MCPHandler.js";
export { AuthMiddleware } from "./middleware/AuthMiddleware.js";
export { RateLimitMiddleware } from "./middleware/RateLimitMiddleware.js";
export { TenantMiddleware } from "./middleware/TenantMiddleware.js";
export { ServerConfig } from "./config/ServerConfig.js";
export { Logger } from "./utils/Logger.js";

export type {
  ServerOptions,
  MCPRequest,
  MCPResponse,
  AuthContext,
  TenantContext,
  MemoryRequest,
  MemoryResponse,
  HealthStatus,
} from "./types/index.js";

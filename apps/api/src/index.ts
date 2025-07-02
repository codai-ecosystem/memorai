#!/usr/bin/env node

/**
 * Memorai API Server
 * RESTful API and WebSocket server for the Memorai web interface
 */

import { AdvancedMemoryEngine } from '@codai/memorai-core';
import cors from 'cors';
import { config } from 'dotenv';
import express, { Express, NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { errorHandler } from './middleware/errorHandler.js';
import { configRouter } from './routes/config.js';
import { graphRouter } from './routes/graph.js';
import { healthRouter } from './routes/health.js';
import { memoryRouter } from './routes/memory.js';
import { statsRouter } from './routes/stats.js';
import { setupWebSocket } from './services/websocket.js';
import { logger } from './utils/logger.js';

// Load environment variables
config();

const app: Express = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:6366',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

const PORT = process.env.PORT ?? 6367;

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  })
);

// CORS middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:6366',
    credentials: true,
  })
);

// Rate limiting - increased for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs (increased from 100)
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global memory engine instance - singleton pattern for persistence
let memoryEngine: AdvancedMemoryEngine | null = null;

// Get or create shared memory engine instance
export function getSharedMemoryEngine(): AdvancedMemoryEngine | null {
  return memoryEngine;
}

// Initialize memory engine with persistent storage configuration
async function initializeMemoryEngine() {
  try {
    logger.info('🔧 Initializing Advanced Memory Engine...');

    // Configure persistent data path for Docker volume
    const persistentDataPath =
      process.env.MEMORAI_DATA_PATH || '/app/data/memorai';
    logger.info(`🗂️ Using persistent data path: ${persistentDataPath}`);

    memoryEngine = new AdvancedMemoryEngine({
      dataPath: persistentDataPath,
    });

    await memoryEngine.initialize();

    // Verify connection with a test operation
    const testResult = await memoryEngine.remember(
      'API Server initialization test',
      'system',
      'api-server',
      { type: 'fact', importance: 1 }
    );

    // Verify data persistence by checking existing memories
    const existingStats = await memoryEngine.getStats();

    logger.info('✅ Memory engine initialized: Advanced Memory Engine');
    logger.info('✅ Features: Semantic search, embeddings, persistence');
    logger.info(`✅ Connection verified with memory ID: ${testResult}`);
    logger.info(`✅ Existing memories found: ${existingStats.totalMemories}`);
    logger.info(
      `✅ Memory types: ${JSON.stringify(existingStats.memoryTypes)}`
    );

    return memoryEngine;
  } catch (error) {
    logger.error('❌ Failed to initialize memory engine:', error);
    logger.error('💡 API will run in degraded mode without memory features');
    return null;
  }
}

// Make memory engine available to routes
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.memoryEngine = memoryEngine;
  next();
});

// Health check endpoint
app.use('/health', healthRouter);

// API routes
app.use('/api/memory', memoryRouter);
app.use('/api/graph', graphRouter);
app.use('/api/config', configRouter);
app.use('/api/stats', statsRouter);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// WebSocket setup
setupWebSocket(io, () => memoryEngine);

// Start server
async function startServer() {
  try {
    await initializeMemoryEngine();

    server.listen(PORT, () => {
      logger.info(`🚀 Memorai API Server running on port ${PORT}`);
      logger.info(`📊 Health check: http://localhost:${PORT}/health`);
      logger.info(`🔌 WebSocket: ws://localhost:${PORT}`);
      logger.info(
        `� Graph endpoint with MCP integration: http://localhost:${PORT}/api/graph`
      );
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

// TypeScript module augmentation for Express
declare global {
  namespace Express {
    interface Request {
      memoryEngine: AdvancedMemoryEngine | null;
    }
  }
}

export { app, io, server };

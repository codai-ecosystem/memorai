#!/usr/bin/env node

/**
 * Memorai API Server
 * RESTful API and WebSocket server for the Memorai web interface
 */

import { MemoryTierLevel, UnifiedMemoryEngine } from '@codai/memorai-core';
import cors from 'cors';
import { config } from 'dotenv';
import express, { Express, NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { errorHandler } from './middleware/errorHandler';
import { configRouter } from './routes/config';
import { graphRouter } from './routes/graph';
import { healthRouter } from './routes/health';
import { memoryRouter } from './routes/memory';
import { statsRouter } from './routes/stats';
import { setupWebSocket } from './services/websocket';
import { logger } from './utils/logger';

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

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Global memory engine instance
let memoryEngine: UnifiedMemoryEngine | null = null;

// Initialize memory engine with PRODUCTION configuration
// Use ADVANCED tier to match MCP server configuration
async function initializeMemoryEngine() {
  try {
    memoryEngine = new UnifiedMemoryEngine({
      autoDetect: true, // Auto-detect best tier (should be advanced)
      enableFallback: true,
      preferredTier: MemoryTierLevel.ADVANCED, // Use ADVANCED tier to match MCP server
      // Remove local dataPath to use shared infrastructure storage
      localEmbedding: {
        model: 'all-MiniLM-L6-v2',
        pythonPath: process.env.PYTHON_PATH ?? 'python',
        ...(process.env.MEMORAI_CACHE_PATH
          ? { cachePath: process.env.MEMORAI_CACHE_PATH }
          : {}),
      },
    });

    await memoryEngine.initialize();

    const tierInfo = memoryEngine.getTierInfo();
    logger.info(`Memory engine initialized: ${tierInfo.message}`);
    logger.info(`Capabilities: ${JSON.stringify(tierInfo.capabilities)}`);

    return memoryEngine;
  } catch (error) {
    logger.error('Failed to initialize memory engine:', error);
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
      memoryEngine: UnifiedMemoryEngine | null;
    }
  }
}

export { app, io, server };

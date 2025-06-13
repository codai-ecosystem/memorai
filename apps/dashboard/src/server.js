#!/usr/bin/env node

/**
 * Memorai Web Dashboard Server
 * Modern web interface for memory management and configuration
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server: SocketIOServer } = require('socket.io');
const winston = require('winston');
require('dotenv').config();

// Try to load the Memorai core module
let UnifiedMemoryEngine;
try {
  // Try to load from the workspace first
  const path = require('path');
  const corePackagePath = path.resolve(__dirname, '../../../packages/core');

  try {
    UnifiedMemoryEngine = require(corePackagePath).UnifiedMemoryEngine;
    console.log('✅ Loaded UnifiedMemoryEngine from workspace');
  } catch (workspaceError) {
    // Fallback to npm package
    UnifiedMemoryEngine = require('@codai/memorai-core').UnifiedMemoryEngine;
    console.log('✅ Loaded UnifiedMemoryEngine from npm package');
  }
} catch (error) {
  console.log('⚠️  Warning: Memorai core not found. Running in standalone mode.');
  console.log('   To enable full functionality, ensure @codai/memorai-core is available.');
  UnifiedMemoryEngine = null;
}

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.WEB_PORT || 6366;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.simple()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/dashboard.log' })
  ],
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.tailwindcss.com", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://cdn.socket.io"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Enhanced dashboard routes (BEFORE static middleware to override index.html)
app.get('/', (req, res) => {
  // Serve enhanced dashboard by default
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/classic', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve static files (but skip index.html since we handle it above)
app.use(express.static(path.join(__dirname, '../public'), {
  index: false  // Don't serve index.html automatically
}));

// Global memory engine instance
let memoryEngine = null;

// Initialize memory engine
async function initializeMemoryEngine() {
  if (!UnifiedMemoryEngine) {
    logger.warn('UnifiedMemoryEngine not available. Running in mock mode.');
    return null;
  }

  try {
    memoryEngine = new UnifiedMemoryEngine({
      autoDetect: true,
      enableFallback: true,
      localEmbedding: {
        model: 'all-MiniLM-L6-v2',
        pythonPath: process.env.PYTHON_PATH || 'python',
      },
      mock: {
        simulateDelay: false,
        delayMs: 0,
        failureRate: 0
      }
    });

    await memoryEngine.initialize();

    const tierInfo = memoryEngine.getTierInfo();
    logger.info(`Memory engine initialized: ${tierInfo.message}`);

    return memoryEngine;
  } catch (error) {
    logger.error('Failed to initialize memory engine:', error);
    return null;
  }
}

// Mock memory engine for development
const mockMemoryEngine = {
  getTierInfo: () => ({
    level: 'mock',
    message: 'Mock memory engine for development',
    capabilities: {
      embedding: 'none',
      similarity: 'basic',
      persistence: 'memory',
      scalability: 'low'
    }
  }),
  remember: async (agentId, content, metadata) => ({
    id: `mock_${Date.now()}`,
    content,
    metadata: metadata || {},
    timestamp: new Date().toISOString(),
    agentId
  }),
  recall: async (agentId, query, limit = 10) => {
    // Return mock memories
    return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: `mock_${Date.now()}_${i}`,
      content: `Mock memory ${i + 1} for query: ${query}`,
      metadata: { type: 'mock', index: i },
      timestamp: new Date(Date.now() - i * 1000 * 60).toISOString(),
      similarity: Math.random(),
      agentId
    }));
  },
  forget: async (agentId, memoryId) => true,
  getContext: async (agentId, contextSize = 10) => ({
    agentId,
    contextSize,
    memories: [],
    timestamp: new Date().toISOString()
  })
};

// Enhanced API Routes

// Analytics endpoints
app.get('/api/analytics/insights', async (req, res) => {
  try {
    if (memoryEngine && memoryEngine.getAnalytics) {
      const analytics = await memoryEngine.getAnalytics();
      res.json(analytics);
    } else {
      // Generate mock analytics for demonstration
      const mockAnalytics = {
        totalMemories: Math.floor(Math.random() * 1000) + 100,
        averageSimilarity: 0.7 + Math.random() * 0.3,
        topTags: ['ai', 'development', 'research', 'automation', 'machine-learning'],
        agentActivity: {
          'agent-1': Math.floor(Math.random() * 50) + 10,
          'agent-2': Math.floor(Math.random() * 30) + 5,
          'agent-3': Math.floor(Math.random() * 20) + 3
        },
        memoryGrowth: generateMockGrowthData(),
        searchPatterns: ['natural language', 'technical docs', 'code examples'],
        timestamp: new Date().toISOString()
      };
      res.json(mockAnalytics);
    }
  } catch (error) {
    logger.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to generate analytics' });
  }
});

app.get('/api/analytics/performance', async (req, res) => {
  try {
    const performance = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      nodeVersion: process.version,
      platform: process.platform,
      tier: memoryEngine ? memoryEngine.getTierInfo() : 'mock',
      timestamp: new Date().toISOString()
    };
    res.json(performance);
  } catch (error) {
    logger.error('Performance metrics error:', error);
    res.status(500).json({ error: 'Failed to get performance metrics' });
  }
});

// Enhanced memory operations
app.post('/api/memory/search/advanced', async (req, res) => {
  try {
    const { query, filters = {}, limit = 20 } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const searchOptions = {
      query: query.trim(),
      limit: Math.min(limit, 100), // Cap at 100 results
      ...filters
    };

    let results;
    if (memoryEngine && memoryEngine.advancedSearch) {
      results = await memoryEngine.advancedSearch(searchOptions);
    } else {
      // Mock advanced search with filters
      results = mockMemoryEngine.searchWithFilters(searchOptions);
    }

    res.json({
      results: results || [],
      query: searchOptions.query,
      filters: filters,
      total: results ? results.length : 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Advanced search error:', error);
    res.status(500).json({ error: 'Advanced search failed' });
  }
});

app.get('/api/memory/export', async (req, res) => {
  try {
    const format = req.query.format || 'json';

    let memories;
    if (memoryEngine && memoryEngine.exportAll) {
      memories = await memoryEngine.exportAll();
    } else {
      // Mock export
      memories = mockMemoryEngine.getAllMemories();
    }

    const exportData = {
      memories: memories || [],
      metadata: {
        exportDate: new Date().toISOString(),
        format,
        version: '1.0.0',
        source: 'memorai-dashboard'
      },
      total: memories ? memories.length : 0
    };

    res.json(exportData);
  } catch (error) {
    logger.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

app.post('/api/memory/import', async (req, res) => {
  try {
    const { memories } = req.body;

    if (!Array.isArray(memories)) {
      return res.status(400).json({ error: 'Memories must be an array' });
    }

    let imported = 0;
    const errors = [];

    for (const memory of memories) {
      try {
        if (memoryEngine && memoryEngine.remember) {
          await memoryEngine.remember(memory.content, memory.metadata || {});
        } else {
          mockMemoryEngine.remember(memory.content, memory.metadata || {});
        }
        imported++;
      } catch (error) {
        errors.push({ memory: memory.content?.substring(0, 50) + '...', error: error.message });
      }
    }

    res.json({
      imported,
      total: memories.length,
      errors,
      success: imported > 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Import error:', error);
    res.status(500).json({ error: 'Import failed' });
  }
});

// System diagnostics
app.get('/api/diagnostics/health', async (req, res) => {
  try {
    const diagnostics = {
      server: {
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      },
      memoryEngine: {
        available: !!memoryEngine,
        tier: memoryEngine ? memoryEngine.getTierInfo() : 'mock',
        status: memoryEngine ? 'active' : 'mock'
      },
      database: {
        // Add database health check if applicable
        status: 'not-applicable'
      },
      external: {
        // Add external service checks
        openai: process.env.MEMORAI_OPENAI_API_KEY ? 'configured' : 'not-configured',
        azure: process.env.MEMORAI_AZURE_ENDPOINT ? 'configured' : 'not-configured'
      }
    };

    res.json(diagnostics);
  } catch (error) {
    logger.error('Diagnostics error:', error);
    res.status(500).json({ error: 'Diagnostics failed' });
  }
});

// Configuration management
app.put('/api/config/tier', async (req, res) => {
  try {
    const { tier } = req.body;

    if (!tier || !['advanced', 'smart', 'basic', 'mock'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier specified' });
    }

    // Note: In a real implementation, this would switch memory tiers
    logger.info(`Tier switch requested: ${tier}`);

    res.json({
      success: true,
      newTier: tier,
      message: `Tier switch to ${tier} initiated`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Tier switch error:', error);
    res.status(500).json({ error: 'Tier switch failed' });
  }
});

// Helper function for mock data
function generateMockGrowthData() {
  const data = [];
  const now = new Date();
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    data.push({
      date: date.toISOString().split('T')[0],
      count: Math.floor(Math.random() * 20) + (30 - i) * 2
    });
  }
  return data;
}

// Enhanced mock memory engine with additional features
const enhancedMockMemoryEngine = {
  ...mockMemoryEngine,

  searchWithFilters(options) {
    const { query, filters = {}, limit = 20 } = options;

    // Generate mock filtered results
    const baseResults = this.recall(query);
    let filteredResults = baseResults;

    // Apply date filter
    if (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) {
      filteredResults = filteredResults.filter(result => {
        const resultDate = new Date(result.timestamp || new Date());
        const start = filters.dateRange.start ? new Date(filters.dateRange.start) : new Date(0);
        const end = filters.dateRange.end ? new Date(filters.dateRange.end) : new Date();
        return resultDate >= start && resultDate <= end;
      });
    }

    // Apply similarity filter
    if (filters.similarity) {
      filteredResults = filteredResults.filter(result =>
        result.similarity >= filters.similarity.min && result.similarity <= filters.similarity.max
      );
    }

    // Apply tag filter
    if (filters.tags && filters.tags.length > 0) {
      filteredResults = filteredResults.filter(result =>
        filters.tags.some(tag => (result.metadata?.tags || []).includes(tag))
      );
    }

    return filteredResults.slice(0, limit);
  },

  getAllMemories() {
    return this.memories.map((memory, index) => ({
      id: index + 1,
      content: memory,
      metadata: {
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ['sample', 'mock', 'data'],
        agentId: `agent-${Math.floor(Math.random() * 3) + 1}`
      }
    }));
  }
};

// Replace the original mock engine with enhanced version
if (!memoryEngine) {
  mockMemoryEngine.searchWithFilters = enhancedMockMemoryEngine.searchWithFilters;
  mockMemoryEngine.getAllMemories = enhancedMockMemoryEngine.getAllMemories;
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  const engine = memoryEngine || mockMemoryEngine;
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    memoryEngine: {
      available: !!memoryEngine,
      tier: engine.getTierInfo()
    }
  });
});

// Memory operations
app.post('/api/memory/remember', async (req, res) => {
  try {
    const { agentId, content, metadata } = req.body;
    const engine = memoryEngine || mockMemoryEngine;

    const result = await engine.remember(agentId, content, metadata);

    // Broadcast to WebSocket clients
    io.emit('memory:created', { agentId, memory: result });

    res.json({ success: true, memory: result });
  } catch (error) {
    logger.error('Memory remember failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/memory/recall', async (req, res) => {
  try {
    const { agentId, query, limit = 10 } = req.body;
    const engine = memoryEngine || mockMemoryEngine;

    const memories = await engine.recall(agentId, query, limit);

    res.json({ success: true, memories, count: memories.length });
  } catch (error) {
    logger.error('Memory recall failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/memory/forget', async (req, res) => {
  try {
    const { agentId, memoryId } = req.body;
    const engine = memoryEngine || mockMemoryEngine;

    const success = await engine.forget(agentId, memoryId);

    if (success) {
      io.emit('memory:deleted', { agentId, memoryId });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Memory not found' });
    }
  } catch (error) {
    logger.error('Memory forget failed:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/memory/context', async (req, res) => {
  try {
    const { agentId, contextSize = 10 } = req.body;
    const engine = memoryEngine || mockMemoryEngine;

    const context = await engine.getContext(agentId, contextSize);

    res.json({ success: true, context });
  } catch (error) {
    logger.error('Memory context failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Configuration
app.get('/api/config', (req, res) => {
  const engine = memoryEngine || mockMemoryEngine;
  res.json({
    success: true,
    config: {
      tier: engine.getTierInfo(),
      environment: {
        hasOpenAI: !!process.env.OPENAI_API_KEY,
        hasAzure: !!(process.env.AZURE_OPENAI_ENDPOINT && process.env.AZURE_OPENAI_API_KEY),
        pythonPath: process.env.PYTHON_PATH || 'python'
      }
    }
  });
});

// Get all memories
app.get('/api/memories', async (req, res) => {
  try {
    const engine = memoryEngine || mockMemoryEngine;
    let memories = [];

    if (engine.getAllMemories) {
      memories = await engine.getAllMemories();
    } else {
      // Generate mock memories for demonstration
      memories = Array.from({ length: 10 }, (_, i) => ({
        id: `memory_${i + 1}`,
        content: `Sample memory content ${i + 1}`,
        metadata: {
          agentId: `agent-${Math.floor(Math.random() * 3) + 1}`,
          timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          tags: ['sample', 'mock', 'data'],
          similarity: 0.7 + Math.random() * 0.3
        }
      }));
    }

    res.json({
      success: true,
      memories,
      total: memories.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to fetch memories:', error);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

// Statistics
app.get('/api/stats', (req, res) => {
  res.json({
    success: true,
    stats: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString(),
      tier: (memoryEngine || mockMemoryEngine).getTierInfo()
    }
  });
});

// WebSocket handling
io.on('connection', (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.info(`WebSocket client disconnected: ${socket.id}`);
  });

  // Send initial state
  socket.emit('config', {
    tier: (memoryEngine || mockMemoryEngine).getTierInfo(),
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((error, req, res, next) => {
  logger.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function startServer() {
  try {
    await initializeMemoryEngine();

    server.listen(PORT, () => {
      logger.info(`🚀 Memorai Web Dashboard running on http://localhost:${PORT}`);
      logger.info(`📊 API endpoints available at http://localhost:${PORT}/api/`);
      logger.info(`🔌 WebSocket connection at ws://localhost:${PORT}`);

      if (!memoryEngine) {
        logger.warn('⚠️  Running in mock mode - install @codai/memorai-core for full functionality');
      }
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

startServer();

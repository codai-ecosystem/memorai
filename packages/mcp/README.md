# Memorai MCP

Enterprise-grade memory management for AI agents. This package provides a unified Model Context Protocol (MCP) server that enables persistent memory capabilities for VS Code GitHub Copilot Chat and other AI agents.

## Features

- 🧠 **Natural Language Memory Operations**: `remember()`, `recall()`, `forget()`, `context()`
- 🚀 **Enterprise-Grade Performance**: Sub-100ms queries, 10M+ entries per tenant
- 🔐 **Security-First**: AES-256 encryption, tenant isolation, audit logging
- ⚡ **Vector Search**: Powered by Qdrant for semantic similarity
- 💾 **Multi-Storage**: Redis caching, PostgreSQL persistence
- 🏢 **Multi-Tenant**: Complete tenant isolation with RBAC
- 📊 **Observability**: Comprehensive metrics and health monitoring

## Quick Start

### Install

```bash
npm install -g @codai/memorai-mcp
```

### Basic Usage

1. **Set up environment variables** (copy `.env.example` to `.env`):

```bash
# Required: OpenAI API Key for embeddings
MEMORAI_OPENAI_API_KEY=your_openai_api_key_here

# Optional: Services (defaults to localhost)
MEMORAI_QDRANT_URL=http://localhost:6333
MEMORAI_REDIS_URL=redis://localhost:6379
MEMORAI_ENCRYPTION_KEY=your-secure-32-character-key
```

2. **Start the MCP server**:

```bash
memorai-mcp
```

3. **Configure VS Code GitHub Copilot Chat**:

Add to your VS Code settings (`settings.json`):

```json
{
  "github.copilot.chat.experimental.mcpServers": {
    "MemoryMCPServer": {
      "command": "npx",
      "args": ["-y", "@codai/memorai-mcp"]
    }
  }
}
```

**Alternative: Direct binary (if installed globally)**

```json
{
  "github.copilot.chat.experimental.mcpServers": {
    "MemoryMCPServer": {
      "command": "memorai-mcp",
      "args": []
    }
  }
}
```

### Configuration Examples

**Example 1: Using npx (recommended - always uses latest version)**

```json
{
  "github.copilot.chat.experimental.mcpServers": {
    "MemoryMCPServer": {
      "command": "npx",
      "args": ["-y", "@codai/memorai-mcp"]
    }
  }
}
```

**Example 2: Using global installation**

```json
{
  "github.copilot.chat.experimental.mcpServers": {
    "MemoryMCPServer": {
      "command": "memorai-mcp",
      "args": []
    }
  }
}
```

**Example 3: Using node directly (if installed globally)**

```json
{
  "github.copilot.chat.experimental.mcpServers": {
    "MemoryMCPServer": {
      "command": "node",
      "args": ["/path/to/global/node_modules/@codai/memorai-mcp/dist/server.js"]
    }
  }
}
```

## VS Code GitHub Copilot Chat Integration

Once configured, you can use memory operations directly in Copilot Chat:

### Examples

```
🧠 Remember that the user prefers TypeScript for new projects
🧠 Remember the API endpoint is https://api.example.com/v1
🧠 What do you remember about my coding preferences?
🧠 Forget the old API endpoint information
🧠 Give me context about this project's architecture
```

### Memory Operations

- **Remember**: Store new information
  - "Remember that I use React with TypeScript"
  - "Remember the database schema for users table"

- **Recall**: Retrieve specific information
  - "What do you remember about my testing preferences?"
  - "Recall information about the payment system"

- **Context**: Get relevant context for current conversation
  - "Give me context about this codebase"
  - "What context do you have about error handling?"

- **Forget**: Remove information
  - "Forget the old API configuration"
  - "Remove information about deprecated features"

## Configuration

### Environment Variables

| Variable                 | Required | Default                  | Description                   |
| ------------------------ | -------- | ------------------------ | ----------------------------- |
| `MEMORAI_OPENAI_API_KEY` | Yes      | -                        | OpenAI API key for embeddings |
| `MEMORAI_QDRANT_URL`     | No       | `http://localhost:6333`  | Qdrant vector database URL    |
| `MEMORAI_QDRANT_API_KEY` | No       | -                        | Qdrant API key (if required)  |
| `MEMORAI_REDIS_URL`      | No       | `redis://localhost:6379` | Redis URL for caching         |
| `MEMORAI_REDIS_PASSWORD` | No       | -                        | Redis password (if required)  |
| `MEMORAI_ENCRYPTION_KEY` | No       | Safe default             | 32+ character encryption key  |

### Services Setup

#### Docker Compose (Recommended)

```yaml
version: '3.8'
services:
  qdrant:
    image: qdrant/qdrant
    ports:
      - '6333:6333'
    volumes:
      - qdrant_storage:/qdrant/storage

  redis:
    image: redis:alpine
    ports:
      - '6379:6379'

volumes:
  qdrant_storage:
```

#### Local Installation

**Qdrant**:

```bash
# Docker
docker run -p 6333:6333 qdrant/qdrant

# Or install locally
wget https://github.com/qdrant/qdrant/releases/latest/download/qdrant
chmod +x qdrant
./qdrant
```

**Redis**:

```bash
# Docker
docker run -p 6379:6379 redis:alpine

# Or install locally (Windows)
# Download from: https://github.com/microsoftarchive/redis/releases
```

### Troubleshooting Installation

If you get "command not found" errors:

1. **Verify global installation:**

   ```bash
   npm list -g @codai/memorai-mcp
   ```

2. **Check npx availability:**

   ```bash
   npx @codai/memorai-mcp --help
   ```

3. **Use full path if needed:**
   - Windows: `C:\Users\{username}\AppData\Roaming\npm\memorai-mcp.cmd`
   - macOS/Linux: `/usr/local/bin/memorai-mcp`

## API Usage

### Programmatic Usage

```typescript
import { MemoryEngine, MemoraiServer } from '@codai/memorai-mcp';

// Create memory engine
const engine = new MemoryEngine({
  vector_db: {
    url: 'http://localhost:6333',
    collection: 'memories',
  },
  redis: {
    url: 'redis://localhost:6379',
  },
  embedding: {
    provider: 'openai',
    api_key: process.env.OPENAI_API_KEY,
  },
  security: {
    encryption_key: 'your-32-character-key-here',
    tenant_isolation: true,
  },
});

// Start server
const server = new MemoraiServer(engine);
await server.start();
```

### Memory Operations

```typescript
// Remember information
await engine.remember(
  'User prefers TypeScript for new projects',
  'tenant-123',
  'agent-456'
);

// Recall information
const memories = await engine.recall(
  'coding preferences',
  'tenant-123',
  'agent-456'
);

// Get context
const context = await engine.getContext('tenant-123', 'agent-456', {
  limit: 10,
});

// Forget information
await engine.forget('old API configuration', 'tenant-123', 'agent-456');
```

## Production Deployment

### Environment Setup

1. **Required Services**:
   - Qdrant vector database
   - Redis for caching
   - OpenAI API access

2. **Security**:
   - Use strong encryption keys (32+ characters)
   - Enable tenant isolation
   - Configure audit logging

3. **Performance**:
   - Tune cache TTL settings
   - Configure batch sizes
   - Monitor query times

### Docker Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install -g @codai/memorai-mcp
CMD ["memorai-mcp"]
```

### Health Monitoring

The server provides health endpoints:

- Health check: Available through MemoraiServer
- Metrics: Performance and usage statistics

## Troubleshooting

### Common Issues

1. **"Cannot connect to Qdrant"**:
   - Verify `MEMORAI_QDRANT_URL` is correct
   - Ensure Qdrant is running: `curl http://localhost:6333/health`

2. **"Redis connection failed"**:
   - Check `MEMORAI_REDIS_URL` configuration
   - Test Redis: `redis-cli ping`

3. **"OpenAI API errors"**:
   - Verify `MEMORAI_OPENAI_API_KEY` is valid
   - Check API quota and billing

4. **Memory operations not working in Copilot**:
   - Restart VS Code after configuration
   - Check VS Code Developer Console for errors
   - Verify MCP server is running

### Debug Mode

Enable debug logging:

```bash
DEBUG=memorai:* memorai-mcp
```

## Contributing

See the main [Memorai repository](https://github.com/dragoscv/memorai-mcp) for contribution guidelines.

## License

MIT License - see [LICENSE](../../LICENSE) for details.

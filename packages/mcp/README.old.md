# Memorai MCP

Enterprise-grade, agent-native memory management system for AI agents.

## 🚀 Quick Start

### Install as VS Code GitHub Copilot Chat Tool

1. **Install the package:**
   ```bash
   npm install -g @codai/memorai-mcp
   ```

2. **Add to your MCP settings:**
   ```json
   {
     "mcpServers": {
       "memorai": {
         "command": "memorai-mcp",
         "args": []
       }
     }
   }
   ```

3. **Configure environment variables:**
   ```bash
   export MEMORAI_STORAGE_TYPE=memory
   export MEMORAI_LOG_LEVEL=info
   ```

### Usage in VS Code GitHub Copilot Chat

Once installed, you can use Memorai in GitHub Copilot Chat:

```
@memorai create entity "project_milestone" with observations about successful deployment
@memorai search for deployment patterns
@memorai add relation between "user_authentication" and "security_framework"
```

## 🎯 Features

- **Enterprise-Ready**: Production-grade memory management with tenant isolation
- **Agent-Native**: Designed specifically for AI agent workflows
- **Scalable**: Vector-based semantic search with Qdrant integration
- **Secure**: Multi-tenant architecture with authentication and rate limiting
- **Flexible**: Multiple storage backends (memory, Supabase, Redis)

## 📦 Package Ecosystem

This package provides a unified interface to the complete Memorai ecosystem:

- **@codai/memorai-core**: Core memory engine with vector operations
- **@codai/memorai-server**: Enterprise MCP server implementation  
- **@codai/memorai-sdk**: TypeScript SDK for custom integrations
- **@codai/memorai-cli**: Command-line tools for management

## 🔧 Configuration

### Environment Variables

```bash
# Storage Configuration
MEMORAI_STORAGE_TYPE=memory          # memory | supabase | redis
MEMORAI_SUPABASE_URL=your_url       # Required for Supabase storage
MEMORAI_SUPABASE_KEY=your_key       # Required for Supabase storage
MEMORAI_REDIS_URL=redis://localhost # Required for Redis storage

# Vector Search (optional)
MEMORAI_QDRANT_URL=http://localhost:6333
MEMORAI_OPENAI_API_KEY=your_key     # For embeddings

# Server Configuration
MEMORAI_PORT=3001
MEMORAI_LOG_LEVEL=info
MEMORAI_RATE_LIMIT_MAX=100
MEMORAI_JWT_SECRET=your_secret
```

### MCP Configuration

For VS Code GitHub Copilot Chat, add to your MCP settings:

```json
{
  "mcpServers": {
    "memorai": {
      "command": "memorai-mcp",
      "args": [],
      "env": {
        "MEMORAI_STORAGE_TYPE": "memory",
        "MEMORAI_LOG_LEVEL": "info"
      }
    }
  }
}
```

## 🔧 Development

```bash
# Clone the repository
git clone https://github.com/dragoscv/memorai-mcp.git
cd memorai-mcp

# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Start development server
pnpm --filter @codai/memorai-mcp dev
```

## 📖 Documentation

- [API Reference](https://github.com/dragoscv/memorai-mcp/tree/main/packages/core)
- [Server Configuration](https://github.com/dragoscv/memorai-mcp/tree/main/packages/server)
- [SDK Usage](https://github.com/dragoscv/memorai-mcp/tree/main/packages/sdk)
- [CLI Commands](https://github.com/dragoscv/memorai-mcp/tree/main/packages/cli)

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](https://github.com/dragoscv/memorai-mcp/blob/main/CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](https://github.com/dragoscv/memorai-mcp/blob/main/LICENSE) for details.

## 🔗 Links

- [GitHub Repository](https://github.com/dragoscv/memorai-mcp)
- [NPM Package](https://www.npmjs.com/package/@codai/memorai-mcp)
- [Documentation](https://github.com/dragoscv/memorai-mcp#readme)
- [Issues](https://github.com/dragoscv/memorai-mcp/issues)

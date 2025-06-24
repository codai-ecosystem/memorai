# Memorai Service Copilot Instructions

This is the **memorai** service - the AI Memory & Database Core of the Codai ecosystem, providing enterprise-grade memory management through the Model Context Protocol (MCP).

## Service Context

- **Service**: memorai (AI Memory & Database Core)
- **Domain**: memorai.ro
- **Priority**: 1 (Foundation Tier)
- **Architecture**: Enterprise MCP Server with 8 packages
- **Repository**: services/memorai/ (git submodule)

## Core Capabilities

1. **Memory Architecture**: Advanced memory systems with entity-relation graphs
2. **MCP Protocol**: Model Context Protocol server implementation
3. **Enterprise Features**: Production-ready with observability and monitoring
4. **Multi-Package System**: 8 specialized packages for different use cases
5. **Data Integration**: Qdrant vector database + SQLite storage

## Package Architecture

```
packages/
├── core/           # Core memory engine and data structures
├── mcp/            # Model Context Protocol server
├── sdk/            # TypeScript SDK for integration
├── cli/            # Command-line interface
├── server/         # HTTP server and API endpoints
apps/
├── api/            # REST API application
├── dashboard/      # Next.js visualization dashboard
└── demo/           # Demo application
```

## Development Workflow

### Individual Development Mode

- **VS Code Profile**: ghcp4_metu (AI development optimized)
- **Memory Context**: `.agent/agent.memory.json`
- **Agent Mode**: Individual service specialist

### Available Commands

- `pnpm dev` - Start all services (MCP server, API, dashboard)
- `pnpm build` - Build all packages
- `pnpm test` - Run comprehensive test suite
- `pnpm mcp:start` - Start MCP server only
- `pnpm dashboard:dev` - Start dashboard only

### Key Ports

- **3001**: Main API server
- **6366**: Dashboard (memory visualization)
- **8080**: MCP server
- **3002**: Demo application

## AI Agent Specialization

### Memory Systems Expert

- Focus on memory architecture and optimization
- Understand entity-relation graph structures
- Optimize performance for large-scale memory operations
- Design memory persistence and retrieval strategies

### MCP Protocol Specialist

- Implement Model Context Protocol standards
- Design efficient memory context transfer
- Optimize protocol performance and reliability
- Ensure enterprise-grade security and observability

### Enterprise Integration

- Design for production deployment
- Implement comprehensive monitoring and logging
- Ensure scalability and high availability
- Integration with other Codai ecosystem services

## Code Quality Standards

### TypeScript Excellence

- Strict TypeScript configuration
- Comprehensive type definitions
- Advanced generic patterns for memory types
- Error handling with custom error types

### Testing Strategy

- Unit tests for core memory functions
- Integration tests for MCP protocol
- Performance tests for memory operations
- End-to-end tests for complete workflows

### Performance Optimization

- Memory usage optimization
- Query performance tuning
- Caching strategies
- Async/await best practices

## Integration Points

### Ecosystem Integration

- **codai**: Primary consumer of memory services
- **logai**: Identity context for memory access
- **API Gateway**: RESTful memory operations

### External Dependencies

- **Qdrant**: Vector database for semantic search
- **SQLite**: Relational storage for structured data
- **Model Context Protocol**: Standard for AI memory transfer

## Development Best Practices

### Memory Management

- Implement proper memory cleanup
- Use weak references where appropriate
- Monitor memory usage patterns
- Optimize garbage collection

### Error Handling

- Comprehensive error types
- Graceful degradation strategies
- Detailed error logging
- Recovery mechanisms

### Security

- Input validation and sanitization
- Access control for memory operations
- Secure data persistence
- Audit logging for compliance

## AI-Native Features

### Intelligent Memory

- Semantic search capabilities
- Auto-categorization of memories
- Intelligent memory pruning
- Context-aware retrieval

### Learning Capabilities

- Usage pattern analysis
- Performance optimization based on access patterns
- Automatic memory organization
- Predictive pre-loading

---

**Remember**: You are working in **individual service mode** - focus on memorai-specific development while maintaining ecosystem compatibility. Use the production-ready MCP system for context management and leverage the enterprise architecture for scalable memory solutions.

**Current Status**: Production-ready enterprise MCP server with 8 packages, running successfully in the v2.0 architecture with git submodule integration.

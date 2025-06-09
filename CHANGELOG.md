# Changelog

All notable changes to Memorai MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial implementation of Memorai MCP
- Core memory engine with vector storage
- MCP server implementation
- TypeScript SDK for client integration
- CLI tools for development and management
- Docker-based development environment
- Comprehensive test suite
- CI/CD pipeline with GitHub Actions
- Multi-tenant architecture
- Enterprise security features

### Core Features
- **Memory Operations**: remember(), recall(), forget(), context()
- **Vector Storage**: Qdrant integration for semantic search
- **Caching**: Redis-based hot cache for performance
- **Embedding**: OpenAI and local embedding providers
- **Context Generation**: Intelligent summarization and theme extraction
- **Classification**: Automatic memory type classification

### Infrastructure
- **Monorepo**: pnpm workspaces with multiple packages
- **Build System**: Turbo for fast, cached builds
- **Type Safety**: Full TypeScript with strict mode
- **Testing**: Vitest with coverage reporting
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier for consistent code style

### Documentation
- Comprehensive README with quick start guide
- API documentation for all packages
- Deployment guides for various platforms
- Performance tuning recommendations
- Security best practices

## [0.1.0] - 2025-06-09

### Added
- Initial project structure and monorepo setup
- Core package with memory engine implementation
- Server package with MCP protocol support
- SDK package for TypeScript clients
- CLI package for command-line tools
- Demo applications showcasing capabilities
- Development tooling and scripts
- CI/CD pipeline configuration
- Docker compose for local development

### Changed
- N/A (initial release)

### Deprecated
- N/A (initial release)

### Removed
- N/A (initial release)

### Fixed
- N/A (initial release)

### Security
- JWT-based authentication
- AES-256 encryption at rest
- TLS 1.3 for data in transit
- Role-based access control (RBAC)
- Comprehensive audit logging

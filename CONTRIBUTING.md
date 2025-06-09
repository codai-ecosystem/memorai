# Contributing to Memorai MCP

Thank you for your interest in contributing to Memorai MCP! This document outlines the process for contributing to this project.

## 🎯 Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please read it before contributing.

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker (for local development)
- Git

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/memorai-mcp.git
   cd memorai-mcp
   ```

3. Set up the development environment:
   ```bash
   pnpm setup
   ```

4. Create a new branch for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📦 Project Structure

```
memorai-mcp/
├── packages/
│   ├── core/           # Memory engine core
│   ├── server/         # MCP server
│   ├── sdk/           # TypeScript SDK
│   └── cli/           # Command-line tools
├── apps/
│   └── demo/          # Demo applications
├── tools/
│   ├── scripts/       # Development scripts
│   └── docker/        # Docker configurations
└── .github/
    └── workflows/     # CI/CD pipelines
```

## 🔧 Development Workflow

### Making Changes

1. **Start development services**:
   ```bash
   pnpm docker:up
   ```

2. **Start development mode**:
   ```bash
   pnpm dev
   ```

3. **Make your changes** following our coding standards

4. **Add tests** for new functionality

5. **Run tests**:
   ```bash
   pnpm test
   ```

6. **Check linting**:
   ```bash
   pnpm lint
   ```

7. **Format code**:
   ```bash
   pnpm format
   ```

### Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that don't affect meaning (formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvements
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to build process or auxiliary tools

**Examples:**
```bash
feat(core): add semantic search functionality
fix(server): resolve memory leak in connection pool
docs(readme): update installation instructions
test(sdk): add integration tests for client
```

### Pull Request Process

1. **Ensure your code follows our standards**:
   - All tests pass
   - Code is properly formatted
   - No linting errors
   - Documentation is updated

2. **Create a pull request** with:
   - Clear title following conventional commits
   - Detailed description of changes
   - Link to any related issues
   - Screenshots/examples if applicable

3. **Address review feedback** promptly

4. **Squash commits** if requested by maintainers

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test -- --watch

# Run tests for specific package
pnpm --filter @codai/memorai-core test
```

### Writing Tests

- Write unit tests for all new functionality
- Include integration tests for complex features
- Ensure tests are fast and reliable
- Use descriptive test names
- Follow the AAA pattern (Arrange, Act, Assert)

Example:
```typescript
describe('MemoryEngine', () => {
  describe('remember', () => {
    it('should store memory with correct metadata', async () => {
      // Arrange
      const engine = new MemoryEngine(config);
      const content = 'Test memory content';
      
      // Act
      const result = await engine.remember(content);
      
      // Assert
      expect(result.id).toBeDefined();
      expect(result.content).toBe(content);
      expect(result.createdAt).toBeInstanceOf(Date);
    });
  });
});
```

## 📝 Documentation

### Code Documentation

- Use JSDoc for all public APIs
- Include examples in documentation
- Document complex algorithms and business logic
- Keep comments up-to-date with code changes

### API Documentation

- Update API docs when adding/changing endpoints
- Include request/response examples
- Document error conditions
- Add performance considerations

## 🎨 Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Use meaningful variable and function names
- Follow functional programming principles where appropriate

### Code Style

- Use Prettier for formatting (configured in `.prettierrc.js`)
- Follow ESLint rules (configured in `.eslintrc.js`)
- Use meaningful commit messages
- Keep functions small and focused

### Performance

- Optimize for sub-100ms response times
- Use appropriate data structures
- Implement caching where beneficial
- Profile performance-critical code

## 🔍 Code Review Guidelines

### For Contributors

- Keep pull requests focused and small
- Write clear descriptions of changes
- Respond to feedback constructively
- Test changes thoroughly

### For Reviewers

- Be constructive and helpful
- Focus on code quality and maintainability
- Check for security implications
- Verify test coverage

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Clear description** of the issue
2. **Steps to reproduce** the problem
3. **Expected behavior** vs actual behavior
4. **Environment details** (OS, Node.js version, etc.)
5. **Error messages** and stack traces
6. **Minimal reproduction case** if possible

## 💡 Feature Requests

When requesting features:

1. **Describe the use case** clearly
2. **Explain the benefit** to users
3. **Consider implementation complexity**
4. **Check existing issues** for duplicates
5. **Propose implementation** if you have ideas

## 📚 Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Fastify Documentation](https://www.fastify.io/docs/)

## 🏷️ Release Process

Releases are automated using changesets:

1. **Create changeset**:
   ```bash
   pnpm changeset
   ```

2. **Version packages**:
   ```bash
   pnpm version-packages
   ```

3. **Publish release**:
   ```bash
   pnpm release
   ```

## 💬 Getting Help

- **Discord**: [Join our community](https://discord.gg/memorai)
- **GitHub Discussions**: Ask questions and share ideas
- **Email**: reach out to maintainers at support@codai.dev

## 🙏 Recognition

Contributors will be:
- Listed in the project README
- Mentioned in release notes
- Invited to join the maintainer team (for significant contributions)

Thank you for contributing to Memorai MCP! 🧠✨

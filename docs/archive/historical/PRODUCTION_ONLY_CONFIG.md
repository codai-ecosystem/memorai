# Production-Only Configuration

## CRITICAL: NO LOCAL DEVELOPMENT ALLOWED

This service operates in **PRODUCTION-ONLY MODE** using published packages exclusively.

### Published Package Endpoints

- **Dashboard**: Published package serves on port 6366
- **API Server**: Published package serves on port 6367
- **MCP Server**: Published package integrated with VS Code

### Workflow Requirements

1. **Code Changes**: Must be published as packages before testing
2. **Testing**: Only through published packages and MCP integration
3. **Development**: No local `pnpm dev` or development servers allowed
4. **Integration**: All testing via VS Code MCP tools and published services

### Production Testing Flow

```bash
# 1. Make code changes
# 2. Publish packages
npm run publish-packages

# 3. Test via MCP tools only
# Use: mcp_memoraimcpser_remember, mcp_memoraimcpser_recall
# Use: Playwright MCP tools for UI testing

# 4. Services auto-start from published packages
# Dashboard: Published package on port 6366
# API: Published package on port 6367
```

### Prohibited Commands

- `pnpm dev` (any package)
- `npm run dev` (any package)
- `turbo run dev`
- Local development servers
- Local testing commands

### Enforcement

- Development scripts disabled
- Only production workflows enabled
- MCP integration for all testing

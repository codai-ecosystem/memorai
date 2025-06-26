# 🚀 Memorai Development Workflow

## ⚠️ CRITICAL RULES

**This service MUST ONLY use published npm packages for all operations.**

### ✅ ALLOWED

- Published packages via MCP server in VS Code
- Playwright MCP for remote/automated testing
- Building and publishing packages to npm

### ❌ FORBIDDEN

- Local dev servers (`pnpm dev`, `npm run dev`)
- Manual testing or local package builds
- Direct API calls to localhost services
- Any form of local development testing

## 📋 Production Workflow

### 1. Code Development

```bash
# Make your code changes in packages/ or apps/
# Edit TypeScript files, add features, fix bugs, etc.
```

### 2. Package Publishing

```bash
# Build and publish to npm (REQUIRED after every change)
npm run publish-packages

# This publishes all packages to npm with updated versions
```

### 3. Service Activation

The VS Code MCP server automatically:

- Downloads latest published packages from npm
- Starts all services using published code
- Makes dashboard available at http://localhost:6366
- Makes API server available at http://localhost:6367

### 4. Testing

```bash
# Use Playwright MCP tools for all testing
# NO manual browser testing allowed
# NO curl/postman testing allowed
```

## 🏗️ Architecture

```
VS Code MCP Server
├── @codai/memorai-mcp (from npm)
├── @codai/memorai-dashboard (from npm)
├── @codai/memorai-api (from npm)
└── @codai/memorai-core (from npm)
```

## 🔧 VS Code Integration

### MCP Server Configuration

The MCP server is configured in VS Code settings to use:

```json
{
  "command": "npx",
  "args": ["@codai/memorai-mcp@2.0.40"],
  "env": {
    "MEMORAI_AGENT_ID": "copilot-agent-memorai"
  }
}
```

### Available Tasks

- `Memorai: Build` - Build packages for publishing
- `Memorai: Publish Packages` - Publish to npm
- `Memorai: Show Production Workflow` - Display this workflow
- ~~`Memorai: Dev Server`~~ - **DISABLED** (shows error message)

## 🧪 Testing Strategy

### Automated Testing Only

All testing MUST use the Playwright MCP tools:

```javascript
// Example: Test dashboard via published packages
await mcp_playwrightmcp_playwright_navigate({
  url: 'http://localhost:6366',
});

await mcp_playwrightmcp_playwright_screenshot({
  name: 'dashboard-test',
});
```

### No Manual Testing

- ❌ No browser testing
- ❌ No curl/postman
- ❌ No local API calls
- ❌ No localhost debugging

## 📊 Service Status

All services run via published packages through the MCP server:

| Service    | URL                   | Package                  | Status             |
| ---------- | --------------------- | ------------------------ | ------------------ |
| Dashboard  | http://localhost:6366 | @codai/memorai-dashboard | ✅ Auto-started    |
| API Server | http://localhost:6367 | @codai/memorai-api       | ✅ Auto-started    |
| MCP Server | Internal              | @codai/memorai-mcp       | ✅ VS Code managed |

## 🚨 Troubleshooting

### Service Not Running

1. Check VS Code MCP server is active
2. Verify published packages are latest version
3. Run `npm run publish-packages` to update
4. Restart VS Code if needed

### Testing Issues

1. Only use Playwright MCP tools
2. Never test manually in browser
3. All tests must be automated/remote

### Code Changes Not Reflected

1. **ALWAYS** run `npm run publish-packages` after changes
2. Wait for npm to propagate (1-2 minutes)
3. MCP server will auto-reload with new packages

## 📝 Enforcement

This workflow is enforced by:

- Package.json scripts return errors for forbidden commands
- VS Code tasks show warnings for local dev
- Documentation explicitly forbids manual testing
- All team members trained on this workflow

---

**Remember**: Production workflow only. No exceptions. All services via published packages through MCP server.

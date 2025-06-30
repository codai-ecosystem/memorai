# 🚫 PRODUCTION-ONLY MODE ENFORCEMENT

## CONFIGURATION COMPLETE ✅

All local development has been **DISABLED** across the entire Memorai ecosystem to enforce production-only workflows.

### 🔒 ENFORCED RESTRICTIONS

#### Package Scripts Disabled
- ❌ `pnpm dev` (all packages)
- ❌ `npm run dev` (all packages) 
- ❌ `pnpm test` (all packages)
- ❌ Local development servers
- ❌ Local testing suites

#### VS Code Tasks Updated
- ❌ "Memorai: Dev Server" → Shows error message
- ❌ "Memorai: Test" → Shows error message  
- ✅ "Memorai: Publish Packages" → Production workflow
- ✅ "Memorai: Show Production Workflow" → Instructions

### ✅ ALLOWED OPERATIONS

#### Production Workflow Only
```bash
# 1. Make code changes
# 2. Publish packages (builds automatically)
npm run publish-packages

# 3. Test via MCP tools only
# - mcp_memoraimcpser_remember
# - mcp_memoraimcpser_recall  
# - Playwright MCP tools for UI testing
```

#### Published Package Integration
- **Dashboard**: Served from published package on port 6366
- **API Server**: Served from published package on port 6367  
- **MCP Server**: Auto-integrated with VS Code from published package

### 🛡️ ENFORCEMENT DETAILS

#### Root Package.json
```json
{
  "scripts": {
    "dev": "echo 'ERROR: Local development disabled. Use published packages only.' && exit 1",
    "test": "echo 'ERROR: Local testing disabled. Use MCP tools only.' && exit 1"
  }
}
```

#### Individual Packages
- **apps/dashboard**: Development scripts disabled
- **apps/api**: Development scripts disabled  
- **packages/mcp**: Development scripts disabled
- **All packages**: Only build/lint/start scripts enabled

#### VS Code Tasks
- Development tasks show error messages
- Only production workflow tasks enabled
- Clear instructions for proper workflow

### 🎯 TESTING STRATEGY

#### MCP Tools Only
- Use `mcp_memoraimcpser_*` tools for memory testing
- Use Playwright MCP tools for UI testing
- All testing through published packages

#### Published Package Verification
- Dashboard runs from published package
- API server runs from published package
- Real integration testing only

### 🚀 WORKFLOW COMPLIANCE

This configuration ensures:
1. **Zero Local Development**: No way to run local servers
2. **Production Testing**: Only published packages used
3. **MCP Integration**: All testing via VS Code MCP tools
4. **Consistent Deployment**: What you test is what gets deployed

### 📋 USAGE INSTRUCTIONS

1. **Make Changes**: Edit code as needed
2. **Publish**: Run `npm run publish-packages` 
3. **Test**: Use MCP tools in VS Code
4. **Verify**: Services auto-start from published packages

This enforces a true production-first development workflow where local development is impossible and all testing uses the actual deployed artifacts.

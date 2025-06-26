# 🚀 Memorai Production-Only Development Requirements

## CRITICAL DEVELOPMENT RULES ⚠️

### ❌ FORBIDDEN ACTIONS
- **NEVER run local development services** (dashboard, API, etc.)
- **NO local testing** using npm/pnpm dev commands
- **NO starting servers** for development purposes
- **NO debugging via localhost ports**

### ✅ APPROVED WORKFLOW
- **ONLY use published packages** via MCP server
- **Work exclusively with @codai/memorai-mcp** published versions
- **Test through MCP tools** (MemoraiMCPServer, PlaywrightMCPServer)
- **Ask user for MCP output** when needed
- **Request VS Code restart** if MCP server issues occur

## Published Package Integration

### Current Production Setup
- **Package**: `@codai/memorai-mcp` v2.0.47+
- **Tier**: Advanced (semantic search, embeddings, AI capabilities)
- **Configuration**: Via VS Code MCP settings
- **Data Path**: `e:\GitHub\memorai\data\memory`
- **Performance**: High mode with auto-optimization

### MCP Server Configuration
```json
{
  "MemoraiMCPServer": {
    "command": "npx",
    "args": ["-y", "@codai/memorai-mcp"],
    "env": {
      "MEMORAI_TIER": "advanced",
      "MEMORAI_PERFORMANCE_MODE": "high",
      "MEMORAI_AUTO_OPTIMIZE": "true",
      "MEMORAI_USE_INMEMORY": "false"
    }
  }
}
```

## Testing Strategy

### Enterprise Testing Phases
1. **Phase 1**: MCP Server Operations (COMPLETED)
2. **Phase 2**: Dashboard Navigation (COMPLETED)
3. **Phase 3**: Advanced Features (IN PROGRESS)
4. **Phase 4**: Production Deployment (PLANNED)

### Testing Tools Available
- `mcp_memoraimcpser_recall` - Memory retrieval
- `mcp_memoraimcpser_remember` - Memory storage
- `mcp_memoraimcpser_search_nodes` - Semantic search
- `mcp_playwrightmcp_*` - UI testing (published dashboard)

## Development Workflow

### Code Changes
1. **Modify source code** in workspace
2. **Run publish task** to update packages
3. **VS Code auto-uses** published packages
4. **Test via MCP tools** only

### Publishing Workflow
```bash
# Use VS Code task: "Memorai: Publish Packages"
npm run publish-packages
```

### Debugging Process
1. **Check MCP server status** via recall queries
2. **Request user for output** if issues found
3. **Ask for VS Code restart** if MCP problems occur
4. **Never start local services** for debugging

## Enterprise Standards

### Performance Requirements
- **Response Time**: <1ms for memory operations
- **Memory Usage**: Stable (typically ~19MB)
- **Success Rate**: >99% for all operations
- **Tier**: Advanced with full capabilities

### Quality Gates
- **100% Published Package Usage**: No local development
- **Zero Local Services**: All testing via MCP
- **Enterprise Features**: Full advanced tier capabilities
- **Production Readiness**: Published packages only

### Compliance Rules
- **No localhost development**: Forbidden
- **Published versions only**: Mandatory
- **MCP-based testing**: Required
- **User approval for actions**: Always ask first

## Future Development Protocol

### Before Any Development Work
1. **Check this file** for compliance rules
2. **Verify MCP server** is operational
3. **Confirm published package** version
4. **Plan testing strategy** using MCP tools only

### During Development
1. **Modify code** in workspace
2. **Publish packages** via task
3. **Test via MCP** exclusively
4. **Document progress** in memory

### Emergency Procedures
- **If MCP server issues**: Ask user for restart
- **If package problems**: Request user to check output
- **If testing failures**: Use MCP tools only for debugging
- **Never start local services**: Under any circumstances

---

**REMEMBER**: This is a production enterprise system. All development must use published packages and MCP server integration. Local development is forbidden for enterprise compliance and testing integrity.

**Last Updated**: June 26, 2025
**Version**: Production v2.0.47+
**Status**: Enterprise Production Ready

# MCP Configuration Update Instructions

## Current Issue

The MCP server configuration uses `dotenv-cli` which creates memory isolation between VS Code instances and requires environment variables to be configured.

## Current Problematic Configuration

```jsonc
"MemoraiMCPServer": {
  "config": {
    "command": "npx",
    "args": [
      "-y", "dotenv-cli", "-e", "E:\\GitHub\\workspace-ai\\.env",
      "--", "npx", "-y", "@codai/memorai-mcp"
    ]
  }
}
```

## Required Fix

Update your VS Code MCP configuration file at:
`C:\Users\vladu\VS Code Insiders Profiles\ghcp4_metu\User\profiles\-4ef8e8ec\mcp.json`

Replace the MemoraiMCPServer configuration with:

```jsonc
"MemoraiMCPServer": {
  "id": "MemoraiMCPServer",
  "name": "MemoraiMCPServer",
  "version": "0.0.1",
  "config": {
    "command": "npx",
    "args": ["-y", "@codai/memorai-mcp"],
    "type": "stdio",
    "env": {
      "MEMORAI_TIER": "advanced"
    }
  }
}
```

## Benefits of This Change

1. **Direct Package Execution**: No more dotenv wrapper complexity
2. **OS-Specific Paths**: Uses platform-appropriate default data directories
3. **Shared Memory**: Single memory space across all VS Code instances
4. **No Environment Files**: No need for .env file configuration
5. **Enterprise Ready**: Production-grade configuration

## Default Data Paths

The updated MCP server will automatically use OS-specific paths:

- **Windows**: `%LOCALAPPDATA%\Memorai\data\memory`
- **macOS**: `~/Library/Application Support/Memorai/data/memory`
- **Linux**: `~/.local/share/Memorai/data/memory`

## Next Steps

1. Make this configuration change manually in VS Code
2. Restart VS Code to apply changes
3. Test memory persistence across VS Code instances
4. Verify enterprise-grade functionality

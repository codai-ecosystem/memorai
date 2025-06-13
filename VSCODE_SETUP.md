# VS Code MCP Server Setup Guide

This guide shows how to configure VS Code to automatically start the Memorai MCP server with integrated web dashboard.

## Quick Setup

### 1. Add MCP Server to VS Code Settings

Add this configuration to your VS Code `settings.json`:

```json
{
  "mcpServers": {
    "memorai": {
      "command": "node",
      "args": ["e:/GitHub/memorai/packages/mcp/dist/server.js"],
      "env": {
        "WEB_PORT": "6366",
        "MEMORAI_LOG_LEVEL": "info"
      }
    }
  }
}
```

### 2. Alternative: Global Installation

If you have Memorai installed globally:

```json
{
  "mcpServers": {
    "memorai": {
      "command": "memorai-mcp",
      "args": [],
      "env": {
        "WEB_PORT": "6366"
      }
    }
  }
}
```

## Features

When VS Code starts the MCP server, it will automatically:

✅ **Check for existing instances** - Prevents multiple conflicting servers
✅ **Start on port 6366** - Avoids common port conflicts
✅ **Launch web dashboard** - Available immediately at http://localhost:6366
✅ **Process management** - Proper cleanup when VS Code closes
✅ **Lock file protection** - Prevents duplicate dashboard instances

## Dashboard Access

Once VS Code starts, the dashboard will be available at:
- **URL**: http://localhost:6366
- **Status**: Automatically started with MCP server
- **Features**: Memory management, analytics, configuration

## Troubleshooting

### Port Already in Use
If port 6366 is already in use:
1. Check what's using the port: `netstat -an | findstr :6366`
2. Stop the conflicting process
3. Restart VS Code

### Dashboard Not Starting
Check the VS Code MCP server logs for errors:
1. Open VS Code Developer Tools (Help > Toggle Developer Tools)
2. Check the Console tab for MCP server output

### Multiple VS Code Instances
The server automatically detects and prevents conflicts when multiple VS Code instances are running.

## Manual Control

You can also control the dashboard manually using VS Code tasks:

1. **Ctrl+Shift+P** → "Tasks: Run Task"
2. Choose from:
   - "Start Memorai MCP Server"
   - "Start Dashboard Only" 
   - "Check Dashboard Port Status"

## Configuration

Environment variables you can set in VS Code settings:

- `WEB_PORT`: Dashboard port (default: 6366)
- `MEMORAI_LOG_LEVEL`: Logging level (info, debug, error)
- `MEMORAI_OPENAI_API_KEY`: For advanced memory tier
- `AZURE_OPENAI_API_KEY`: For Azure OpenAI integration

## Next Steps

Once configured, the MCP server and dashboard will start automatically when you open VS Code. The dashboard provides:

- **Memory Management**: Add, search, organize memories
- **Real-time Analytics**: Performance metrics and usage stats
- **System Configuration**: Tier management and settings
- **Advanced Features**: Knowledge graph visualization (coming soon)

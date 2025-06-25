#!/usr/bin/env node

/**
 * MCP Server Wrapper - Bypasses version compatibility issues
 * This wrapper ensures the MCP server starts properly in VS Code
 */

const { spawn } = require('child_process');
const path = require('path');

// Disable the compatibility check by setting environment variable
process.env.MCP_DISABLE_VERSION_CHECK = 'true';

// Start the actual server
const serverPath = path.join(__dirname, 'dist', 'server.js');
const server = spawn('node', [serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    MCP_DISABLE_VERSION_CHECK: 'true',
    NODE_NO_WARNINGS: '1',
  },
});

server.on('close', code => {
  process.exit(code);
});

server.on('error', error => {
  console.error('Server wrapper error:', error);
  process.exit(1);
});

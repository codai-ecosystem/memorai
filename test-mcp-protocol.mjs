#!/usr/bin/env node

/**
 * Test script to verify the Memorai MCP Server responds to initialize requests correctly
 */

import { spawn } from 'child_process';

async function testMCPServer() {
  console.log('🧪 Testing Memorai MCP Server initialization...');
    // Start the MCP server
  const server = spawn('npx.cmd', ['@codai/memorai-mcp@latest'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true
  });

  // Send initialize request
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: {
          listChanged: true
        },
        sampling: {}
      },
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    }
  };

  return new Promise((resolve, reject) => {
    let output = '';
    let errorOutput = '';
    let hasResponse = false;

    // Set up timeout
    const timeout = setTimeout(() => {
      if (!hasResponse) {
        server.kill();
        reject(new Error('Server did not respond to initialize request within 10 seconds'));
      }
    }, 10000);

    server.stdout.on('data', (data) => {
      output += data.toString();
      console.log('📤 Server response:', data.toString());
      
      // Check if we got a valid JSON-RPC response
      try {
        const lines = output.split('\n').filter(line => line.trim());
        for (const line of lines) {
          const response = JSON.parse(line);
          if (response.id === 1 && response.result) {
            hasResponse = true;
            clearTimeout(timeout);
            server.kill();
            resolve({
              success: true,
              response: response,
              serverLogs: errorOutput
            });
            return;
          }
        }
      } catch (e) {
        // Not valid JSON yet, continue collecting
      }
    });

    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.log('📋 Server logs:', data.toString());
    });

    server.on('exit', (code) => {
      clearTimeout(timeout);
      if (!hasResponse) {
        reject(new Error(`Server exited with code ${code} before responding. Logs: ${errorOutput}`));
      }
    });

    server.on('error', (error) => {
      clearTimeout(timeout);
      reject(new Error(`Failed to start server: ${error.message}`));
    });

    // Send the initialize request
    console.log('📨 Sending initialize request...');
    server.stdin.write(JSON.stringify(initRequest) + '\n');
  });
}

// Run the test
testMCPServer()
  .then((result) => {
    console.log('✅ MCP Server test passed!');
    console.log('📊 Response:', JSON.stringify(result.response, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ MCP Server test failed:', error.message);
    process.exit(1);
  });

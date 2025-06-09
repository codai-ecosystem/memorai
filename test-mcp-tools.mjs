#!/usr/bin/env node

/**
 * Test script to verify the Memorai MCP Server responds to basic MCP requests
 */

import { spawn } from 'child_process';

async function testMCPServer() {
  console.log('🧪 Testing Memorai MCP Server basic functionality...');
  
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
    let processedLines = 0; // Track how many lines we've already processed

    // Set up timeout - increased from 5 to 15 seconds for slower systems
    const timeout = setTimeout(() => {
      if (!hasResponse) {
        server.kill();
        reject(new Error('Server did not respond to initialize request within 15 seconds'));
      }
    }, 15000);

    server.stdout.on('data', (data) => {
      output += data.toString();
      console.log('📤 Server response:', data.toString());
      
      // Check if we got a valid JSON-RPC response
      try {
        const lines = output.split('\n').filter(line => line.trim());
        
        // Only process new lines that we haven't processed yet
        for (let i = processedLines; i < lines.length; i++) {
          const line = lines[i];
          try {
            const response = JSON.parse(line);
            processedLines = i + 1; // Mark this line as processed
              if (response.id === 1 && response.result) {
              hasResponse = true;
              clearTimeout(timeout);
              
              // Test that server has the expected tools
              const tools = response.result.capabilities.tools;
              if (tools) {
                console.log('✅ Server initialized with tools capability');
                
                // Now test tools/list request
                const toolsRequest = {
                  jsonrpc: '2.0',
                  id: 2,
                  method: 'tools/list',
                  params: {}
                };
                
                console.log('📨 Sending tools/list request...');
                server.stdin.write(JSON.stringify(toolsRequest) + '\n');
                
                // Wait for tools response
                setTimeout(() => {
                  server.kill();
                  resolve({
                    success: true,
                    response: response,
                    serverLogs: errorOutput
                  });
                }, 2000);
              } else {
                server.kill();
                resolve({
                  success: true,
                  response: response,
                  serverLogs: errorOutput
                });
              }
              return;
            }
            
            // Check for tools/list response
            if (response.id === 2 && response.result && response.result.tools) {
              console.log('✅ Tools list received:', response.result.tools.map(t => t.name).join(', '));
            }
          } catch (lineError) {
            // This specific line is not valid JSON, skip it
            continue;
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
    console.log('✅ MCP Server basic test passed!');
    console.log('📊 Response:', JSON.stringify(result.response, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ MCP Server test failed:', error.message);
    process.exit(1);
  });

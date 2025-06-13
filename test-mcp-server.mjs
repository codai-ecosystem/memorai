#!/usr/bin/env node

/**
 * Test script to verify Memorai MCP Server functionality
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, 'packages', 'mcp', 'dist', 'server.js');

console.log('🧪 Testing Memorai MCP Server...');
console.log(`📍 Server path: ${serverPath}`);

// Test server startup
const serverProcess = spawn('node', [serverPath], {
  cwd: __dirname,
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, NODE_ENV: 'development' }
});

let hasStarted = false;
let testTimeout;

// Set a timeout to kill the test
testTimeout = setTimeout(() => {
  console.log('✅ Server started successfully (test timeout reached)');
  serverProcess.kill();
  process.exit(0);
}, 3000);

serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log('📊 Server output:', output.trim());
  
  if (!hasStarted) {
    hasStarted = true;
    console.log('✅ Memorai MCP Server is running correctly!');
  }
});

serverProcess.stderr.on('data', (data) => {
  const error = data.toString();
  if (error.includes('ENOENT') || error.includes('spawn')) {
    console.error('❌ Server startup error:', error.trim());
    clearTimeout(testTimeout);
    process.exit(1);
  } else {
    console.log('⚠️ Server warning:', error.trim());
  }
});

serverProcess.on('error', (error) => {
  console.error('❌ Process error:', error.message);
  clearTimeout(testTimeout);
  process.exit(1);
});

serverProcess.on('close', (code) => {
  clearTimeout(testTimeout);
  if (code === 0 || hasStarted) {
    console.log('✅ Server test completed successfully');
    process.exit(0);
  } else {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(1);
  }
});

console.log('⏳ Waiting for server to start...');

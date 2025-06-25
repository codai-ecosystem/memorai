#!/usr/bin/env node

/**
 * Memorai API Server Startup Script
 * Starts the API server using published packages
 */

import { spawn } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting Memorai API Server...');

// Start the API server
const apiProcess = spawn('node', [resolve(__dirname, '../dist/index.js')], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, PORT: '6367' }
});

apiProcess.on('error', (error) => {
  console.error('❌ Failed to start API server:', error);
  process.exit(1);
});

apiProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ API server exited with code ${code}`);
    process.exit(code || 1);
  }
});

console.log('✅ Memorai API Server started on port 6367');

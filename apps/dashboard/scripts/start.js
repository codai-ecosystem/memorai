#!/usr/bin/env node

/**
 * Memorai Dashboard Startup Script
 * Starts the Next.js dashboard using published packages
 */

import { spawn } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Starting Memorai Dashboard...');

// Start the dashboard using Next.js
const port = process.env.PORT || '6366';
const apiPort = process.env.API_PORT || '6368';
console.log(`✅ Memorai Dashboard started on port ${port}`);
console.log(`🔌 Connecting to API on port ${apiPort}`);

const dashboardProcess = spawn('npx', ['next', 'start', '--port', port], {
  stdio: 'inherit',
  shell: true,
  cwd: resolve(__dirname, '..'),
  env: { ...process.env, API_PORT: apiPort },
});

dashboardProcess.on('error', error => {
  console.error('❌ Failed to start dashboard:', error);
  process.exit(1);
});

dashboardProcess.on('exit', code => {
  if (code !== 0) {
    console.error(`❌ Dashboard exited with code ${code}`);
    process.exit(code || 1);
  }
});

console.log('✅ Memorai Dashboard started on port 6366');

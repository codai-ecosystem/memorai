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
const dashboardProcess = spawn('npx', ['next', 'start', '--port', '6366'], {
  stdio: 'inherit',
  shell: true,
  cwd: resolve(__dirname, '..')
});

dashboardProcess.on('error', (error) => {
  console.error('❌ Failed to start dashboard:', error);
  process.exit(1);
});

dashboardProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Dashboard exited with code ${code}`);
    process.exit(code || 1);
  }
});

console.log('✅ Memorai Dashboard started on port 6366');

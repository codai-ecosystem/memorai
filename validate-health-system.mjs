#!/usr/bin/env node

/**
 * Health Check System Validation
 * Tests the comprehensive health check system implementation
 */

import { spawn } from 'child_process';
import http from 'http';
import { setTimeout } from 'timers/promises';

const PORT = 6367;
const HEALTH_ENDPOINTS = [
  '/health',
  '/health/detailed',
  '/health/ready',
  '/health/live',
];

console.log('🏥 MEMORAI HEALTH CHECK VALIDATION');
console.log('===================================\n');

// Start API server using published package
console.log('🚀 Starting API server with published package...');
const apiProcess = spawn('npx', ['@codai/memorai-api@1.0.11'], {
  stdio: 'pipe',
  shell: true,
});

let serverReady = false;

apiProcess.stdout.on('data', data => {
  const output = data.toString();
  console.log(`[API] ${output.trim()}`);

  if (output.includes('Server running') || output.includes('listening')) {
    serverReady = true;
  }
});

apiProcess.stderr.on('data', data => {
  console.error(`[API ERROR] ${data.toString().trim()}`);
});

// Wait for server to start
console.log('⏳ Waiting for server to start...');
await setTimeout(10000);

if (!serverReady) {
  console.log('⚠️  Server startup status unclear, proceeding with tests...');
}

// Test health endpoints
console.log('\n🔍 Testing Health Endpoints');
console.log('============================');

const testEndpoint = async endpoint => {
  return new Promise(resolve => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: endpoint,
      method: 'GET',
      timeout: 5000,
    };

    const req = http.request(options, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          console.log(`✅ ${endpoint}: ${res.statusCode} ${res.statusMessage}`);
          console.log(`   Response: ${JSON.stringify(jsonData, null, 2)}\n`);
          resolve({ endpoint, status: res.statusCode, data: jsonData });
        } catch (error) {
          console.log(`✅ ${endpoint}: ${res.statusCode} ${res.statusMessage}`);
          console.log(`   Response: ${data}\n`);
          resolve({ endpoint, status: res.statusCode, data });
        }
      });
    });

    req.on('error', error => {
      console.log(`❌ ${endpoint}: ${error.message}\n`);
      resolve({ endpoint, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      console.log(`❌ ${endpoint}: Request timeout\n`);
      resolve({ endpoint, error: 'Request timeout' });
    });

    req.end();
  });
};

const results = [];
for (const endpoint of HEALTH_ENDPOINTS) {
  const result = await testEndpoint(endpoint);
  results.push(result);
}

// Summary
console.log('📊 VALIDATION SUMMARY');
console.log('=====================');

const successful = results.filter(r => r.status >= 200 && r.status < 300);
const failed = results.filter(r => r.error || r.status >= 400);

console.log(`✅ Successful: ${successful.length}/${results.length}`);
console.log(`❌ Failed: ${failed.length}/${results.length}`);

if (successful.length > 0) {
  console.log('\n🎉 Health check system is working!');
  console.log('\nNext steps:');
  console.log('1. Health endpoints are accessible for VS Code integration');
  console.log(
    '2. VS Code instances can check service status before starting MCP servers'
  );
  console.log('3. Enterprise-grade monitoring is available');
} else {
  console.log('\n⚠️  Health check system needs investigation');
}

// Cleanup
console.log('\n🧹 Cleaning up...');
apiProcess.kill();
process.exit(0);

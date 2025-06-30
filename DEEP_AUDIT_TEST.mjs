#!/usr/bin/env node

/**
 * DEEP AUDIT END-TO-END TEST
 * Tests every critical flow in the Memorai ecosystem
 */

import { AdvancedMemoryEngine } from '@codai/memorai-core';
import { spawn } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

console.log('🔍 DEEP AUDIT: Testing Memorai Ecosystem End-to-End');
console.log('====================================================');

const testResults = {
  coreEngine: { status: 'PENDING', details: null },
  mcpServer: { status: 'PENDING', details: null },
  apiServer: { status: 'PENDING', details: null },
  dashboardBuild: { status: 'PENDING', details: null },
  integration: { status: 'PENDING', details: null }
};

// Test 1: Core Memory Engine
async function testCoreEngine() {
  console.log('\n🧠 TEST 1: Core Memory Engine');
  try {
    const engine = new AdvancedMemoryEngine();
    await engine.initialize();
    
    const memoryId = await engine.remember(
      'Deep audit test memory',
      'audit-tenant',
      'audit-agent',
      { type: 'fact', importance: 0.9 }
    );
    
    console.log(`✅ Memory stored with ID: ${memoryId}`);
    
    const recalled = await engine.recall(
      'audit test',
      'audit-tenant', 
      'audit-agent',
      { limit: 5 }
    );
    
    console.log(`✅ Recalled ${recalled.length} memories`);
    
    if (recalled.length === 0) {
      throw new Error('No memories recalled - semantic search not working');
    }
    
    testResults.coreEngine = { 
      status: 'PASS', 
      details: `Stored and recalled ${recalled.length} memories` 
    };
  } catch (error) {
    console.log(`❌ Core engine failed: ${error.message}`);
    testResults.coreEngine = { 
      status: 'FAIL', 
      details: error.message 
    };
  }
}

// Test 2: MCP Server
async function testMCPServer() {
  console.log('\n🔌 TEST 2: MCP Server');
  try {
    // Start MCP server as subprocess
    const mcpServer = spawn('node', ['packages/mcp/dist/server.js'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    
    let serverOutput = '';
    mcpServer.stdout.on('data', (data) => {
      serverOutput += data.toString();
    });
    
    // Wait for server to start
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        mcpServer.kill();
        reject(new Error('MCP server startup timeout'));
      }, 5000);
      
      mcpServer.stdout.on('data', (data) => {
        if (data.toString().includes('ready')) {
          clearTimeout(timeout);
          mcpServer.kill();
          resolve();
        }
      });
    });
    
    console.log('✅ MCP server started successfully');
    testResults.mcpServer = { 
      status: 'PASS', 
      details: 'Server started and initialized' 
    };
  } catch (error) {
    console.log(`❌ MCP server failed: ${error.message}`);
    testResults.mcpServer = { 
      status: 'FAIL', 
      details: error.message 
    };
  }
}

// Test 3: API Server
async function testAPIServer() {
  console.log('\n🌐 TEST 3: API Server');
  try {
    // Try to make HTTP requests to API endpoints
    const testUrl = 'http://localhost:6367/health';
    
    const response = await fetch(testUrl, { 
      method: 'GET',
      timeout: 3000 
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API server responding:', data);
      testResults.apiServer = { 
        status: 'PASS', 
        details: 'Health endpoint responding' 
      };
    } else {
      throw new Error(`API server returned ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ API server failed: ${error.message}`);
    testResults.apiServer = { 
      status: 'FAIL', 
      details: error.message 
    };
  }
}

// Test 4: Dashboard Build
async function testDashboardBuild() {
  console.log('\n📊 TEST 4: Dashboard Build');
  try {
    // Check if dashboard builds successfully
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout, stderr } = await execAsync('cd apps/dashboard && npm run build', {
      timeout: 30000
    });
    
    if (stderr && !stderr.includes('warn')) {
      throw new Error(`Build errors: ${stderr}`);
    }
    
    console.log('✅ Dashboard builds successfully');
    testResults.dashboardBuild = { 
      status: 'PASS', 
      details: 'Next.js build completed' 
    };
  } catch (error) {
    console.log(`❌ Dashboard build failed: ${error.message}`);
    testResults.dashboardBuild = { 
      status: 'FAIL', 
      details: error.message 
    };
  }
}

// Test 5: Integration Test
async function testIntegration() {
  console.log('\n🔗 TEST 5: End-to-End Integration');
  try {
    // This would test actual data flow between components
    // For now, check if published packages can be imported
    const corePackage = await import('@codai/memorai-core');
    const mcpPackage = await import('@codai/memorai-mcp');
    
    if (!corePackage.AdvancedMemoryEngine) {
      throw new Error('Core package export missing');
    }
    
    console.log('✅ Package imports working');
    testResults.integration = { 
      status: 'PASS', 
      details: 'Package imports successful' 
    };
  } catch (error) {
    console.log(`❌ Integration failed: ${error.message}`);
    testResults.integration = { 
      status: 'FAIL', 
      details: error.message 
    };
  }
}

// Run all tests
async function runDeepAudit() {
  await testCoreEngine();
  await testMCPServer();
  await testAPIServer();
  await testDashboardBuild();
  await testIntegration();
  
  console.log('\n📋 DEEP AUDIT RESULTS');
  console.log('=====================');
  
  let passCount = 0;
  let failCount = 0;
  
  for (const [test, result] of Object.entries(testResults)) {
    const status = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${status} ${test}: ${result.status} - ${result.details}`);
    
    if (result.status === 'PASS') passCount++;
    else failCount++;
  }
  
  console.log(`\n📊 SUMMARY: ${passCount} PASS, ${failCount} FAIL`);
  
  // Write detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: { pass: passCount, fail: failCount },
    details: testResults,
    conclusion: failCount === 0 ? 'ECOSYSTEM FULLY FUNCTIONAL' : 'ECOSYSTEM HAS ISSUES'
  };
  
  writeFileSync('DEEP_AUDIT_REPORT.json', JSON.stringify(report, null, 2));
  console.log('📄 Detailed report saved to DEEP_AUDIT_REPORT.json');
  
  return failCount === 0;
}

// Execute audit
runDeepAudit().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('🚨 AUDIT CRASHED:', error);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * MCP Enterprise Test Runner
 * 
 * This script runs the comprehensive enterprise test suite using MCP tools
 * and generates detailed reports. It can be used locally or in CI/CD.
 */

import { EnterpriseMCPTestOrchestrator } from './enterprise-test-orchestrator.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function runEnterpriseMCPTests() {
  console.log('🎯 Enterprise MCP Test Suite Starting...');
  console.log('📅 Date:', new Date().toISOString());
  console.log('🔧 Using MCP tools for comprehensive testing');
  console.log('=' .repeat(60));

  const orchestrator = new EnterpriseMCPTestOrchestrator();
  
  try {
    // Run the full test suite
    const results = await orchestrator.runFullTestSuite();
    
    console.log('\n' + '=' .repeat(60));
    console.log('🏁 Test Suite Completed!');
    console.log(`📊 Results: ${results.tests.filter(t => t.status === 'passed').length}/${results.tests.length} passed`);
    console.log(`⏱️ Duration: ${results.totalDuration}ms`);
    console.log(`📈 Pass Rate: ${results.passRate.toFixed(2)}%`);
    
    // Generate and save detailed report
    const report = orchestrator.generateReport(results);
    const reportPath = join(process.cwd(), `test-report-${Date.now()}.md`);
    writeFileSync(reportPath, report);
    
    console.log(`📝 Detailed report saved: ${reportPath}`);
    
    // Generate JSON results for CI/CD
    const jsonResults = {
      timestamp: new Date().toISOString(),
      suite: results,
      summary: {
        total: results.tests.length,
        passed: results.tests.filter(t => t.status === 'passed').length,
        failed: results.tests.filter(t => t.status === 'failed').length,
        skipped: results.tests.filter(t => t.status === 'skipped').length,
        passRate: results.passRate,
        duration: results.totalDuration
      }
    };
    
    const jsonPath = join(process.cwd(), `test-results-${Date.now()}.json`);
    writeFileSync(jsonPath, JSON.stringify(jsonResults, null, 2));
    console.log(`📊 JSON results saved: ${jsonPath}`);
    
    // Exit with appropriate code for CI/CD
    const hasFailures = results.tests.some(t => t.status === 'failed');
    if (hasFailures) {
      console.log('\n❌ Some tests failed - exiting with error code');
      process.exit(1);
    } else {
      console.log('\n✅ All tests passed - success!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('💥 Test suite failed with error:', error);
    process.exit(1);
  }
}

// Handle CLI arguments
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
MCP Enterprise Test Runner

Usage: node run-mcp-tests.js [options]

Options:
  --help, -h     Show this help message
  --quiet, -q    Reduce output verbosity
  --json         Output results in JSON format only

Examples:
  node run-mcp-tests.js                # Run full test suite
  node run-mcp-tests.js --quiet         # Run with minimal output
  node run-mcp-tests.js --json          # Output JSON results only

This runner uses MCP tools to perform comprehensive enterprise testing
without local dependency conflicts.
`);
  process.exit(0);
}

// Run the tests
runEnterpriseMCPTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

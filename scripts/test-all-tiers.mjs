#!/usr/bin/env node
/**
 * Comprehensive Test Suite for Memorai Multi-Tier Memory System
 * Tests all 3 memory tiers and validates functionality
 */

import {
  MemoryTierLevel,
  UnifiedMemoryEngine,
} from '../packages/core/dist/index.js';

class MemoraiTester {
  constructor() {
    this.results = {
      tiers: {},
      tests: {},
      performance: {},
    };
  }

  async runAllTests() {
    console.log('🧪 Memorai Multi-Tier Memory Test Suite');
    console.log('='.repeat(60));

    // Test each tier
    await this.testTier(MemoryTierLevel.ADVANCED);
    await this.testTier(MemoryTierLevel.SMART);
    await this.testTier(MemoryTierLevel.BASIC);

    // Test auto-detection
    await this.testAutoDetection();

    // Test fallback system
    await this.testFallbackSystem(); // Generate report
    await this.generateReport();
  }

  async testTier(tier) {
    console.log(`\n🔍 Testing ${tier.toUpperCase()} tier...`);

    try {
      const engine = new UnifiedMemoryEngine({
        preferredTier: tier,
        enableFallback: false, // Disable for individual tier testing
        autoDetect: false,
      });

      const startTime = Date.now();
      await engine.initialize();
      const initTime = Date.now() - startTime;

      const tierInfo = engine.getTierInfo();
      console.log(`✅ ${tier} tier initialized in ${initTime}ms`);
      console.log(`   ${tierInfo.message}`);

      // Test basic operations
      const testResults = await this.runBasicTests(engine, tier);

      this.results.tiers[tier] = {
        available: true,
        initTime,
        capabilities: tierInfo.capabilities,
        tests: testResults,
      };
    } catch (error) {
      console.log(`❌ ${tier} tier failed: ${error.message}`);
      this.results.tiers[tier] = {
        available: false,
        error: error.message,
      };
    }
  }

  async runBasicTests(engine, tier) {
    const tests = {};
    const tenantId = 'test-tenant';
    const agentId = 'test-agent';

    try {
      // Test remember
      console.log('   🧠 Testing remember...');
      const startRemember = Date.now();
      const memoryId = await engine.remember(
        'The user prefers concise responses with examples',
        tenantId,
        agentId,
        { type: 'preference', importance: 0.8 }
      );
      tests.remember = {
        success: true,
        time: Date.now() - startRemember,
        memoryId,
      };
      console.log(`      ✅ Remember: ${tests.remember.time}ms`);

      // Test recall
      console.log('   🔍 Testing recall...');
      const startRecall = Date.now();
      const results = await engine.recall(
        'user preferences',
        tenantId,
        agentId,
        { limit: 5 }
      );
      tests.recall = {
        success: true,
        time: Date.now() - startRecall,
        count: results.length,
      };
      console.log(
        `      ✅ Recall: ${tests.recall.time}ms (${results.length} results)`
      );

      // Test context
      console.log('   📋 Testing context...');
      const startContext = Date.now();
      const context = await engine.getContext({
        tenant_id: tenantId,
        agent_id: agentId,
        max_memories: 10,
      });
      tests.context = {
        success: true,
        time: Date.now() - startContext,
        memories: context.memories.length,
      };
      console.log(
        `      ✅ Context: ${tests.context.time}ms (${context.memories.length} memories)`
      );

      // Test forget
      console.log('   🗑️  Testing forget...');
      const startForget = Date.now();
      const forgotten = await engine.forget(memoryId);
      tests.forget = {
        success: forgotten,
        time: Date.now() - startForget,
      };
      console.log(
        `      ✅ Forget: ${tests.forget.time}ms (${forgotten ? 'success' : 'failed'})`
      );
    } catch (error) {
      console.log(`      ❌ Test failed: ${error.message}`);
      tests.error = error.message;
    }

    return tests;
  }

  async testAutoDetection() {
    console.log('\n🎯 Testing Auto-Detection...');

    try {
      const engine = new UnifiedMemoryEngine({
        autoDetect: true,
        enableFallback: true,
      });

      const startTime = Date.now();
      await engine.initialize();
      const tierInfo = engine.getTierInfo();

      console.log(`✅ Auto-detected: ${tierInfo.currentTier}`);
      console.log(`   ${tierInfo.message}`);
      console.log(`   Fallback chain: ${tierInfo.fallbackChain.join(' → ')}`);

      this.results.tests.autoDetection = {
        success: true,
        detectedTier: tierInfo.currentTier,
        fallbackChain: tierInfo.fallbackChain,
        time: Date.now() - startTime,
      };
    } catch (error) {
      console.log(`❌ Auto-detection failed: ${error.message}`);
      this.results.tests.autoDetection = {
        success: false,
        error: error.message,
      };
    }
  }

  async testFallbackSystem() {
    console.log('\n🔄 Testing Fallback System...');

    try {
      const engine = new UnifiedMemoryEngine({
        preferredTier: MemoryTierLevel.ADVANCED, // Start with highest tier
        enableFallback: true,
        autoDetect: false,
      });

      await engine.initialize();
      const initialTier = engine.getTierInfo().currentTier;

      // Test basic operation to ensure it works
      await engine.remember(
        'Fallback test memory',
        'test-tenant',
        'test-agent'
      );

      console.log(`✅ Fallback system working, active tier: ${initialTier}`);

      this.results.tests.fallback = {
        success: true,
        activeTier: initialTier,
      };
    } catch (error) {
      console.log(`❌ Fallback test failed: ${error.message}`);
      this.results.tests.fallback = {
        success: false,
        error: error.message,
      };
    }
  }

  async generateReport() {
    console.log('\n📊 COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(60));

    // Tier availability
    const availableTiers = Object.entries(this.results.tiers)
      .filter(([tier, result]) => result.available)
      .map(([tier]) => tier);

    console.log(`\n🎯 Available Tiers: ${availableTiers.length}/4`);
    for (const [tier, result] of Object.entries(this.results.tiers)) {
      const status = result.available ? '✅' : '❌';
      console.log(
        `   ${status} ${tier.toUpperCase()}: ${result.available ? `${result.initTime}ms init` : result.error}`
      );
    }

    // Performance summary
    console.log('\n⚡ Performance Summary:');
    for (const [tier, result] of Object.entries(this.results.tiers)) {
      if (result.available && result.tests) {
        console.log(`   ${tier.toUpperCase()}:`);
        if (result.tests.remember)
          console.log(`     Remember: ${result.tests.remember.time}ms`);
        if (result.tests.recall)
          console.log(`     Recall: ${result.tests.recall.time}ms`);
        if (result.tests.context)
          console.log(`     Context: ${result.tests.context.time}ms`);
        if (result.tests.forget)
          console.log(`     Forget: ${result.tests.forget.time}ms`);
      }
    }

    // System tests
    console.log('\n🔧 System Tests:');
    if (this.results.tests.autoDetection) {
      const test = this.results.tests.autoDetection;
      const status = test.success ? '✅' : '❌';
      console.log(
        `   ${status} Auto-Detection: ${test.success ? test.detectedTier : test.error}`
      );
    }

    if (this.results.tests.fallback) {
      const test = this.results.tests.fallback;
      const status = test.success ? '✅' : '❌';
      console.log(
        `   ${status} Fallback System: ${test.success ? test.activeTier : test.error}`
      );
    }

    // Recommendations
    console.log('\n💡 Recommendations:');
    if (availableTiers.includes('advanced')) {
      console.log('   🚀 Use Advanced tier for production (best accuracy)');
    } else if (availableTiers.includes('smart')) {
      console.log('   🧠 Use Smart tier for offline semantic search');
    } else if (availableTiers.includes('basic')) {
      console.log('   📝 Use Basic tier for keyword search (fully offline)');
    } else {
      console.log('   ⚠️  No tiers available - check configuration');
    }

    console.log('\n🎉 Multi-Tier Memory System Test Complete!');

    // Save results
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        availableTiers: availableTiers.length,
        totalTiers: 3,
        recommendedTier: availableTiers.includes('advanced')
          ? 'advanced'
          : availableTiers.includes('smart')
            ? 'smart'
            : availableTiers.includes('basic')
              ? 'basic'
              : 'none',
      },
      results: this.results,
    };

    const fs = await import('fs');
    fs.writeFileSync(
      'memorai-test-report.json',
      JSON.stringify(reportData, null, 2)
    );
    console.log('📄 Detailed report saved to memorai-test-report.json');
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new MemoraiTester();
  tester.runAllTests().catch(console.error);
}

export default MemoraiTester;

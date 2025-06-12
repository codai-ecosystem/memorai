#!/usr/bin/env node
/**
 * Azure OpenAI Configuration Test
 * Tests Azure OpenAI integration with the multi-tier memory system
 */

import { UnifiedMemoryEngine } from '../packages/core/dist/index.js';

async function testAzureOpenAI() {
    console.log('🧪 Testing Azure OpenAI Configuration...\n');

    // Test 1: Auto-detection with Azure environment variables
    console.log('📋 Test 1: Auto-detection with Azure environment variables');

    // Simulate Azure OpenAI environment variables
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test-resource.openai.azure.com';
    process.env.AZURE_OPENAI_API_KEY = 'test-azure-key';
    process.env.AZURE_OPENAI_DEPLOYMENT_NAME = 'test-embedding-deployment';

    try {
        const engine1 = new UnifiedMemoryEngine({
            autoDetect: true,
            enableFallback: true
        });

        console.log('✅ Engine initialized with Azure auto-detection');
        console.log(`🧠 Tier: ${engine1.getTierInfo().currentTier}`);
    } catch (error) {
        console.log(`❌ Auto-detection failed: ${error.message}`);
    }

    // Test 2: Explicit Azure configuration
    console.log('\n📋 Test 2: Explicit Azure OpenAI configuration');

    try {
        const engine2 = new UnifiedMemoryEngine({
            preferredTier: 'advanced',
            azureOpenAI: {
                endpoint: 'https://your-resource.openai.azure.com',
                apiKey: 'your-azure-api-key',
                deploymentName: 'your-embedding-deployment',
                apiVersion: '2024-02-15-preview'
            }
        });

        console.log('✅ Engine initialized with explicit Azure config');
        console.log(`🧠 Tier: ${engine2.getTierInfo().currentTier}`);
    } catch (error) {
        console.log(`❌ Explicit config failed: ${error.message}`);
    }

    // Test 3: Standard OpenAI configuration for comparison
    console.log('\n📋 Test 3: Standard OpenAI configuration');

    try {
        const engine3 = new UnifiedMemoryEngine({
            preferredTier: 'advanced',
            apiKey: 'your-openai-api-key',
            openaiEmbedding: {
                model: 'text-embedding-3-small',
                dimensions: 1536
            }
        });

        console.log('✅ Engine initialized with standard OpenAI config');
        console.log(`🧠 Tier: ${engine3.getTierInfo().currentTier}`);
    } catch (error) {
        console.log(`❌ Standard OpenAI config failed: ${error.message}`);
    }

    // Test 4: Tier detection with different configurations
    console.log('\n📋 Test 4: Tier Detection Summary');

    // Clear Azure env vars to test fallback
    delete process.env.AZURE_OPENAI_ENDPOINT;
    delete process.env.AZURE_OPENAI_API_KEY;
    delete process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

    const fallbackEngine = new UnifiedMemoryEngine({
        autoDetect: true,
        enableFallback: true
    });

    const tierInfo = fallbackEngine.getTierInfo();

    console.log(`🎯 Active Tier: ${tierInfo.currentTier}`);
    console.log(`📊 Available Tiers: ${tierInfo.availableTiers.join(', ')}`);
    console.log(`🔄 Fallback Chain: ${tierInfo.fallbackChain.join(' → ')}`);
    console.log(`💡 Message: ${tierInfo.message}`);

    console.log('\n🎉 Azure OpenAI Configuration Test Complete!');

    console.log('\n📝 Environment Variables for Azure OpenAI:');
    console.log('   AZURE_OPENAI_API_KEY=your-azure-api-key');
    console.log('   AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com');
    console.log('   AZURE_OPENAI_DEPLOYMENT_NAME=your-embedding-deployment');
    console.log('   AZURE_OPENAI_API_VERSION=2024-02-15-preview (optional)');

    console.log('\n📝 Alternative: Standard OpenAI:');
    console.log('   OPENAI_API_KEY=your-openai-api-key');
    console.log('   MEMORAI_OPENAI_API_KEY=your-openai-api-key');
}

testAzureOpenAI().catch(console.error);

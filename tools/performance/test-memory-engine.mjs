#!/usr/bin/env node
/**
 * Test script to verify UnifiedMemoryEngine works correctly
 */

import { UnifiedMemoryEngine } from '@codai/memorai-core';

async function testMemoryEngine() {
    console.log('🧠 Testing Memorai Memory Engine...');

    try {
        // Create engine with fallback enabled
        const engine = new UnifiedMemoryEngine({
            enableFallback: true,
            autoDetect: true
        });

        console.log('📋 Initializing memory engine...');
        await engine.initialize();

        console.log('✅ Memory engine initialized successfully!');

        // Test memory storage
        console.log('💾 Testing memory storage...');
        const memoryId = await engine.remember(
            'This is a test memory for Memorai MCP server verification',
            'test-tenant',
            'test-agent'
        );

        console.log(`✅ Memory stored with ID: ${memoryId}`);

        // Test memory recall
        console.log('🔍 Testing memory recall...');
        const results = await engine.recall(
            'test memory',
            'test-tenant',
            'test-agent'
        );

        console.log(`✅ Recall successful! Found ${results.length} memories`);

        if (results.length > 0) {
            console.log('📝 First result:', results[0].memory.content.substring(0, 50) + '...');
        }

        // Test context retrieval
        console.log('📊 Testing context retrieval...');
        const context = await engine.getContext({
            tenant_id: 'test-tenant',
            agent_id: 'test-agent',
            max_memories: 5
        });

        console.log(`✅ Context retrieved! Found ${context.memories.length} memories`);
        console.log(`📈 Engine tier: ${engine.getCurrentTier()}`);

        console.log('🎉 All tests passed! Memory engine is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testMemoryEngine().catch(console.error);

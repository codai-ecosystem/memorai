#!/usr/bin/env node

/**
 * Debug script to test memory functionality directly
 */

import { MemoryEngine } from './dist/index.js';
import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (same as MCP server)
const envPaths = [
    path.resolve(__dirname, '../../../../../workspace-ai/.env'),
    path.resolve(__dirname, '../../../.env'),
    path.resolve(process.cwd(), '.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        config({ path: envPath });
        console.log(`📁 Loaded environment variables from: ${envPath}`);
        envLoaded = true;
        break;
    }
}

if (!envLoaded) {
    config(); // Fallback to default behavior
    console.log('⚠️  No .env file found, using system environment variables');
}

async function testMemoryEngine() {
    try {
        console.log('🔧 Initializing MemoryEngine...');
        const memoryEngine = new MemoryEngine();
        await memoryEngine.initialize();
        console.log('✅ MemoryEngine initialized successfully');

        // Test storing a memory
        console.log('📝 Testing memory storage...');
        const testAgentId = 'debug-test-agent';
        const testContent = 'This is a debug test memory for recall testing';
        const testMetadata = { purpose: 'debug-test', timestamp: new Date().toISOString() };

        const memoryId = await memoryEngine.remember(testContent, testAgentId, testAgentId, testMetadata);
        console.log(`✅ Memory stored with ID: ${memoryId}`);

        // Test recalling the memory
        console.log('🔍 Testing memory recall...');
        const recallResults = await memoryEngine.recall('debug test memory', testAgentId, testAgentId, { limit: 10 });
        console.log(`📋 Recall results: ${JSON.stringify(recallResults, null, 2)}`);

        if (recallResults.length === 0) {
            console.log('❌ No memories recalled - investigating...');

            // Test with different parameters
            console.log('🔍 Testing recall with different parameters...');
            const recallResults2 = await memoryEngine.recall('debug', testAgentId, testAgentId, { limit: 100, threshold: 0.1 });
            console.log(`📋 Recall results (lowered threshold): ${JSON.stringify(recallResults2, null, 2)}`);

            // Try recalling without agent filter
            const recallResults3 = await memoryEngine.recall('debug', testAgentId, undefined, { limit: 100, threshold: 0.1 });
            console.log(`📋 Recall results (no agent filter): ${JSON.stringify(recallResults3, null, 2)}`);
        }

        console.log('🔧 Testing health check...');
        const health = await memoryEngine.getHealth();
        console.log(`🏥 Health status: ${JSON.stringify(health, null, 2)}`);

    } catch (error) {
        console.error('❌ Error testing MemoryEngine:', error);
    }
}

testMemoryEngine();

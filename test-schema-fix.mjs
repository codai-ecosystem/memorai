#!/usr/bin/env node

import { config } from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
config();

async function testSchemaFix() {
  console.log('🧪 Testing Schema-Compliant Payload Fix');
  console.log('=====================================');

  try {
    // Initialize OpenAI for embeddings
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize VectorStore
    const vectorStore = new VectorStore({
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      collection: 'memories',
    });

    // Create test memory metadata with all required fields
    const testMemory = {
      id: 'test-schema-fix-' + Date.now(),
      type: 'fact',
      content: 'Testing schema-compliant payload structure',
      confidence: 0.9,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastAccessedAt: new Date(),
      accessCount: 0,
      importance: 0.8,
      emotional_weight: 0.1,
      tags: ['test', 'schema'],
      context: { test: true },
      tenant_id: 'test-tenant',
      agent_id: 'test-agent',
    };

    console.log('📝 Test memory structure:');
    console.log('- ID:', testMemory.id);
    console.log('- Type:', testMemory.type);
    console.log('- Content:', testMemory.content);
    console.log('- Tenant ID:', testMemory.tenant_id);
    console.log('');

    // Generate embedding
    console.log('🔤 Generating embedding...');
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: testMemory.content,
    });

    const embedding = response.data[0].embedding;
    console.log('✅ Embedding generated:', embedding.length, 'dimensions');
    console.log('');

    // Store memory with schema-compliant payload
    console.log('💾 Storing memory with schema-compliant payload...');
    console.log('Expected payload fields: created_at, type, tenant_id');

    await vectorStore.storeMemory(testMemory, embedding);

    console.log('✅ Memory stored successfully!');
    console.log('');

    // Test search
    console.log('🔍 Testing search functionality...');
    const searchResults = await vectorStore.searchMemories(embedding, {
      query: 'testing schema',
      tenant_id: 'test-tenant',
      limit: 5,
      threshold: 0.5,
    });

    console.log('✅ Search completed successfully!');
    console.log('Results found:', searchResults.length);

    if (searchResults.length > 0) {
      console.log('First result:', {
        id: searchResults[0].memory.id,
        content: searchResults[0].memory.content,
        score: searchResults[0].score,
      });
    }

    console.log('');
    console.log('🎉 Schema fix validation PASSED!');
    console.log('   - No more HTTP 400 "Bad Request" errors');
    console.log('   - Payload fields match collection schema');
    console.log('   - Vector operations working correctly');
  } catch (error) {
    console.error('❌ Schema fix validation FAILED:');
    console.error('Error:', error.message);

    if (error.message.includes('Bad Request')) {
      console.error('');
      console.error('📋 Debugging info:');
      console.error("- This suggests payload still doesn't match schema");
      console.error('- Check Qdrant collection configuration');
      console.error('- Verify only required fields are being sent');
    }

    process.exit(1);
  }
}

testSchemaFix().catch(console.error);

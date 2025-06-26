import { config } from 'dotenv';
import {
  MemoryVectorStore,
  QdrantVectorStore,
} from './packages/core/dist/vector/VectorStore.js';

// Load environment variables
config();

// Monkey patch to intercept the exact payload being sent
const originalUpsert = QdrantVectorStore.prototype.upsert;
QdrantVectorStore.prototype.upsert = function (points) {
  console.log('\n🔍 INTERCEPTED UPSERT PAYLOAD:');
  console.log('Points array:');
  points.forEach((point, index) => {
    console.log(`\nPoint ${index + 1}:`);
    console.log('ID:', point.id);
    console.log('Vector length:', point.vector?.length);
    console.log('Payload keys:', Object.keys(point.payload || {}));
    console.log('Full payload:');
    console.log(JSON.stringify(point.payload, null, 2));
  });

  // Check for any issues
  points.forEach((point, index) => {
    const payload = point.payload || {};
    console.log(`\n🔍 Analysis for Point ${index + 1}:`);

    // Check for undefined values
    const undefinedKeys = Object.keys(payload).filter(
      key => payload[key] === undefined
    );
    if (undefinedKeys.length > 0) {
      console.log('❌ Undefined values found:', undefinedKeys);
    }

    // Check for null values
    const nullKeys = Object.keys(payload).filter(key => payload[key] === null);
    if (nullKeys.length > 0) {
      console.log('⚠️  Null values found:', nullKeys);
    }

    // Check for duplicate-looking fields
    const keys = Object.keys(payload);
    const duplicates = [];
    keys.forEach(key => {
      if (
        key.includes('created') ||
        key.includes('updated') ||
        key.includes('accessed')
      ) {
        duplicates.push(key);
      }
    });
    if (duplicates.length > 0) {
      console.log('📅 Timestamp fields:', duplicates);
    }

    // Check if embedding field exists
    if ('embedding' in payload) {
      console.log('❌ DUPLICATE EMBEDDING FIELD FOUND IN PAYLOAD!');
    }

    console.log('✅ Payload structure seems clean');
  });

  console.log('\n🚀 Proceeding with original upsert...');
  return originalUpsert.call(this, points);
};

async function debugExactPayload() {
  console.log('🚀 Debugging Exact Payload Sent to Qdrant');
  console.log('='.repeat(60));

  try {
    // Initialize MemoryVectorStore with live Qdrant
    console.log('🔌 Creating QdrantVectorStore backend...');
    const qdrantStore = new QdrantVectorStore(
      process.env.QDRANT_URL || 'http://localhost:6333',
      'memories',
      1536,
      process.env.QDRANT_API_KEY
    );

    console.log('🔧 Creating MemoryVectorStore instance...');
    const vectorStore = new MemoryVectorStore(qdrantStore);

    console.log('🔧 Initializing vector store...');
    await vectorStore.initialize();
    console.log('✅ MemoryVectorStore initialized');

    // Create a simple test memory
    const now = new Date();
    const testMemory = {
      id: 'debug-test-' + Date.now(),
      content: 'Debug test memory',
      category: 'test',
      importance: 0.5,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
    };

    // Create a simple test embedding
    const testEmbedding = new Array(1536).fill(0.1);

    console.log(
      '📝 Test memory created (without embedding field in original object)'
    );

    // This will trigger our monkey patch to show the exact payload
    console.log('🔄 Attempting to store memory...');
    await vectorStore.storeMemory(testMemory, testEmbedding);
    console.log('✅ SUCCESS: Memory stored!');
  } catch (error) {
    console.error('\n❌ Error occurred:', error.message);
    console.error('Full error:', error);
  }
}

// Run the debug
debugExactPayload().catch(console.error);

import { config } from 'dotenv';
import {
  MemoryVectorStore,
  QdrantVectorStore,
} from './packages/core/dist/vector/VectorStore.js';

// Load environment variables
config();

async function testSimplifiedPayload() {
  console.log('🧪 Testing with simplified payload structure');
  console.log('='.repeat(60));

  try {
    // Initialize MemoryVectorStore with live Qdrant
    console.log('🔌 Creating QdrantVectorStore backend...');
    const qdrantStore = new QdrantVectorStore(
      process.env.QDRANT_URL || 'http://localhost:6333',
      'memories', // collection name
      1536, // dimension for OpenAI embeddings
      process.env.QDRANT_API_KEY
    );

    console.log('🔧 Creating MemoryVectorStore instance...');
    const vectorStore = new MemoryVectorStore(qdrantStore);

    console.log('🔧 Initializing vector store...');
    await vectorStore.initialize();
    console.log('✅ MemoryVectorStore initialized');

    // Create a very simple memory object with minimal required fields
    const now = new Date();
    const simpleMemory = {
      id: 'simple-test-' + Date.now(),
      content: 'Simple test content',
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      // Note: No embedding field in memory object
    };

    // Create a test embedding vector (1536 dimensions for OpenAI)
    const testEmbedding = new Array(1536)
      .fill(0)
      .map(() => Math.random() * 0.1);

    console.log('📝 Simple memory object created');
    console.log('Memory structure:', Object.keys(simpleMemory));

    // Test storing the simplified memory
    console.log('🔄 Attempting to store simplified memory...');
    await vectorStore.storeMemory(simpleMemory, testEmbedding);
    console.log('✅ SUCCESS: Simple memory stored without errors!');

    console.log('\n🎉 SIMPLIFIED PAYLOAD TEST COMPLETE');
    console.log('✅ Memory operations work with simplified structure');
  } catch (error) {
    console.error('❌ Simplified test failed:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

// Run the test
testSimplifiedPayload().catch(console.error);

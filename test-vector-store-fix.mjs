import { config } from 'dotenv';
import {
  MemoryVectorStore,
  QdrantVectorStore,
} from './packages/core/dist/vector/VectorStore.js';

// Load environment variables
config();

async function testVectorStoreFix() {
  console.log('🚀 Testing Vector Store Fix with Live Infrastructure');
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

    // Create a test memory with embedding (this would have caused the duplicate field error)
    const now = new Date();
    const testMemory = {
      id: 'test-memory-fix-' + Date.now(),
      content:
        'This is a test memory to verify the fix for duplicate embedding field',
      category: 'test',
      importance: 0.8,
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
      embedding: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8], // This is the problematic field that was duplicated
    };

    // Create a test embedding vector (1536 dimensions for OpenAI)
    const testEmbedding = new Array(1536)
      .fill(0)
      .map(() => Math.random() * 0.1);

    console.log('📝 Test memory created with embedding field');

    // This operation previously failed with "Bad Request" due to duplicate embedding field
    console.log('🔄 Attempting to store memory (this previously failed)...');
    await vectorStore.storeMemory(testMemory, testEmbedding);
    console.log('✅ SUCCESS: Memory stored without "Bad Request" error!');

    // Test search to verify everything works
    console.log('🔍 Testing search functionality...');
    const searchEmbedding = new Array(1536)
      .fill(0)
      .map(() => Math.random() * 0.1);
    const searchQuery = { limit: 5, filter: {} };
    const searchResults = await vectorStore.searchMemories(
      searchEmbedding,
      searchQuery
    );
    console.log(`✅ Search returned ${searchResults.length} results`);

    if (searchResults.length > 0) {
      console.log('📋 Found memories:');
      searchResults.forEach((result, index) => {
        console.log(
          `  ${index + 1}. ${result.memory.content} (score: ${result.score})`
        );
      });
    }

    console.log('\n🎉 VECTOR STORE FIX VERIFICATION COMPLETE');
    console.log('✅ No more "Failed to upsert points: Bad Request" errors');
    console.log('✅ Memory operations work correctly with live Qdrant');
    console.log('✅ The duplicate embedding field issue has been resolved');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.message.includes('Bad Request')) {
      console.error('💥 The duplicate embedding field bug still exists!');
    }
    throw error;
  }
}

// Run the test
testVectorStoreFix().catch(console.error);

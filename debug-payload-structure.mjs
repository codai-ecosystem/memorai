import { config } from 'dotenv';
import {
  MemoryVectorStore,
  QdrantVectorStore,
} from './packages/core/dist/vector/VectorStore.js';

// Load environment variables
config();

// Monkey patch the upsert method to see what's being sent
const originalUpsert = QdrantVectorStore.prototype.upsert;
QdrantVectorStore.prototype.upsert = async function (points) {
  console.log('🔍 DEBUG: Points being sent to Qdrant:');
  console.log(JSON.stringify(points, null, 2));

  if (points.length > 0) {
    console.log('📊 First point structure:');
    console.log('- ID:', points[0].id);
    console.log('- Vector length:', points[0].vector?.length);
    console.log('- Payload keys:', Object.keys(points[0].payload || {}));
    console.log('- Full payload:', JSON.stringify(points[0].payload, null, 2));
  }

  return originalUpsert.call(this, points);
};

async function debugPayloadStructure() {
  console.log('🔍 Debug: Inspecting exact payload sent to Qdrant');
  console.log('='.repeat(60));

  try {
    const qdrantStore = new QdrantVectorStore(
      'http://localhost:6333',
      'memories',
      1536
    );

    const vectorStore = new MemoryVectorStore(qdrantStore);
    await vectorStore.initialize();

    const now = new Date();
    const testMemory = {
      id: 'debug-test-' + Date.now(),
      content: 'Debug test',
      createdAt: now,
      updatedAt: now,
      lastAccessedAt: now,
    };

    const testEmbedding = new Array(1536).fill(0.1);

    console.log('🚀 Attempting store with debugging...');
    await vectorStore.storeMemory(testMemory, testEmbedding);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugPayloadStructure().catch(console.error);

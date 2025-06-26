import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from 'dotenv';

// Load environment variables
config();

async function testQdrantClientDirectly() {
  console.log('🔬 Testing Qdrant client directly');
  console.log('='.repeat(50));

  try {
    console.log('🔌 Creating Qdrant client...');
    const client = new QdrantClient({
      url: 'http://localhost:6333',
      checkCompatibility: false, // Disable version check
    });

    console.log('🏥 Testing client health...');
    const health = await client.healthCheck();
    console.log('Health check:', health);

    console.log('📝 Creating test point...');
    const testPoint = {
      id: 'direct-client-test-' + Date.now(),
      vector: new Array(1536).fill(0).map(() => Math.random() * 0.1),
      payload: {
        content: 'Direct client test',
        test_field: 'simple_value',
      },
    };

    console.log('📤 Upserting point...');
    const result = await client.upsert('memories', {
      wait: true,
      points: [testPoint],
    });

    console.log('✅ SUCCESS: Direct client upsert worked!');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Direct client test failed:', error.message);
    console.error('Full error:', error);
  }
}

testQdrantClientDirectly().catch(console.error);

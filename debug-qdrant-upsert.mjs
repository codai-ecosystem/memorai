import { QdrantClient } from '@qdrant/js-client-rest';

async function testUpsert() {
  const client = new QdrantClient({
    url: 'http://localhost:6333',
  });

  console.log('Testing Qdrant client upsert...');
  
  try {
    // Create a 1536-dimensional vector
    const vector = Array.from({ length: 1536 }, () => Math.random() - 0.5);
    
    const point = {
      id: `test-${Date.now()}`,
      vector: vector,
      payload: {
        type: 'test',
        content: 'Debug test content',
        tenant_id: 'default',
        created_at: new Date().toISOString(),
      }
    };

    console.log('Point structure:', JSON.stringify({
      id: point.id,
      vector: `[${vector.length} dimensions]`,
      payload: point.payload
    }, null, 2));

    // Test the client upsert method
    const result = await client.upsert('memories', {
      wait: true,
      points: [point],
    });

    console.log('✅ Upsert successful:', result);
    
  } catch (error) {
    console.error('❌ Upsert failed:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      data: error.data
    });
  }
}

testUpsert().catch(console.error);

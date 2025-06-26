import { QdrantClient } from '@qdrant/js-client-rest';

async function testDirectAPI() {
  console.log('Testing direct HTTP API format...');
  
  try {
    // Create a 1536-dimensional vector
    const vector = Array.from({ length: 1536 }, () => Math.random() - 0.5);
    
    const payload = {
      points: [{
        id: `test-${Date.now()}`,
        vector: vector,
        payload: {
          type: 'test',
          content: 'Debug test content',
          tenant_id: 'default',
          created_at: new Date().toISOString(),
        }
      }]
    };

    console.log('Testing with direct fetch...');
    const response = await fetch('http://localhost:6333/collections/memories/points?wait=true', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Direct API failed:', response.status, errorData);
    } else {
      const result = await response.json();
      console.log('✅ Direct API successful:', result);
    }
    
  } catch (error) {
    console.error('❌ Direct API error:', error);
  }
}

async function testClientFormats() {
  const client = new QdrantClient({
    url: 'http://localhost:6333',
  });

  console.log('\nTesting different client formats...');
  
  const vector = Array.from({ length: 1536 }, () => Math.random() - 0.5);
  
  // Format 1: Array of points
  try {
    console.log('Format 1: Array of points...');
    const result = await client.upsert('memories', {
      wait: true,
      points: [{
        id: `test1-${Date.now()}`,
        vector: vector,
        payload: {
          type: 'test',
          content: 'Test content',
          tenant_id: 'default',
          created_at: new Date().toISOString(),
        }
      }],
    });
    console.log('✅ Format 1 successful:', result);
  } catch (error) {
    console.error('❌ Format 1 failed:', error.data?.status?.error || error.message);
  }

  // Format 2: Batch operation
  try {
    console.log('Format 2: Batch operation...');
    const result = await client.upsert('memories', {
      batch: {
        ids: [`test2-${Date.now()}`],
        vectors: [vector],
        payloads: [{
          type: 'test',
          content: 'Test content',
          tenant_id: 'default',
          created_at: new Date().toISOString(),
        }]
      }
    });
    console.log('✅ Format 2 successful:', result);
  } catch (error) {
    console.error('❌ Format 2 failed:', error.data?.status?.error || error.message);
  }
}

async function main() {
  await testDirectAPI();
  await testClientFormats();
}

main().catch(console.error);

import { QdrantClient } from '@qdrant/js-client-rest';

async function testSearch() {
  const client = new QdrantClient({
    url: 'http://localhost:6333',
  });

  console.log('Testing search to verify collection is working...');
  
  try {
    // Create a random search vector
    const vector = Array.from({ length: 1536 }, () => Math.random() - 0.5);
    
    const result = await client.search('memories', {
      vector: vector,
      limit: 3,
    });

    console.log('✅ Search successful:', result);
    
  } catch (error) {
    console.error('❌ Search failed:', error);
  }
}

async function testCollectionInfo() {
  const client = new QdrantClient({
    url: 'http://localhost:6333',
  });

  console.log('\nTesting collection info...');
  
  try {
    const info = await client.getCollection('memories');
    console.log('✅ Collection info:', JSON.stringify(info, null, 2));
  } catch (error) {
    console.error('❌ Collection info failed:', error);
  }
}

async function main() {
  await testSearch();
  await testCollectionInfo();
}

main().catch(console.error);

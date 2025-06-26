async function testSimpleUpsert() {
  console.log('Testing simple upsert formats...');
  
  const vector = Array.from({ length: 1536 }, () => Math.random() - 0.5);
  
  // Test 1: Simple points array
  const payload1 = {
    points: [{
      id: 1,
      vector: vector
    }]
  };
  
  console.log('Test 1: Simple point with numeric ID...');
  const response1 = await fetch('http://localhost:6333/collections/memories/points?wait=true', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload1),
  });
  
  if (!response1.ok) {
    const error1 = await response1.json();
    console.error('❌ Test 1 failed:', error1);
  } else {
    const result1 = await response1.json();
    console.log('✅ Test 1 successful:', result1);
    return;
  }
  
  // Test 2: Batch format
  const payload2 = {
    batch: {
      ids: [2],
      vectors: [vector]
    }
  };
  
  console.log('Test 2: Batch format...');
  const response2 = await fetch('http://localhost:6333/collections/memories/points?wait=true', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload2),
  });
  
  if (!response2.ok) {
    const error2 = await response2.json();
    console.error('❌ Test 2 failed:', error2);
  } else {
    const result2 = await response2.json();
    console.log('✅ Test 2 successful:', result2);
    return;
  }
  
  // Test 3: Check what other operations work
  console.log('Test 3: Getting collection info to see working format...');
  const response3 = await fetch('http://localhost:6333/collections/memories', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (response3.ok) {
    const result3 = await response3.json();
    console.log('✅ Collection GET works fine');
  }
}

testSimpleUpsert().catch(console.error);

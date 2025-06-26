async function testIncrementalFormats() {
  console.log('Testing incremental formats...');
  
  const vector = Array.from({ length: 1536 }, () => Math.random() - 0.5);
  
  // Test 1: String ID (this might be the issue)
  const payload1 = {
    points: [{
      id: "test-string-id",
      vector: vector
    }]
  };
  
  console.log('Test 1: String ID...');
  const response1 = await fetch('http://localhost:6333/collections/memories/points?wait=true', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload1),
  });
  
  if (!response1.ok) {
    const error1 = await response1.json();
    console.error('❌ Test 1 failed (String ID):', error1);
  } else {
    const result1 = await response1.json();
    console.log('✅ Test 1 successful (String ID):', result1);
  }
  
  // Test 2: Numeric ID with empty payload
  const payload2 = {
    points: [{
      id: 100,
      vector: vector,
      payload: {}
    }]
  };
  
  console.log('Test 2: Numeric ID with empty payload...');
  const response2 = await fetch('http://localhost:6333/collections/memories/points?wait=true', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload2),
  });
  
  if (!response2.ok) {
    const error2 = await response2.json();
    console.error('❌ Test 2 failed (Empty payload):', error2);
  } else {
    const result2 = await response2.json();
    console.log('✅ Test 2 successful (Empty payload):', result2);
  }
  
  // Test 3: Numeric ID with simple payload
  const payload3 = {
    points: [{
      id: 101,
      vector: vector,
      payload: {
        type: "test"
      }
    }]
  };
  
  console.log('Test 3: Numeric ID with simple payload...');
  const response3 = await fetch('http://localhost:6333/collections/memories/points?wait=true', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload3),
  });
  
  if (!response3.ok) {
    const error3 = await response3.json();
    console.error('❌ Test 3 failed (Simple payload):', error3);
  } else {
    const result3 = await response3.json();
    console.log('✅ Test 3 successful (Simple payload):', result3);
  }
  
  // Test 4: Check if we can search for inserted points
  console.log('Test 4: Searching for inserted points...');
  const searchResponse = await fetch('http://localhost:6333/collections/memories/points/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vector: vector,
      limit: 5
    }),
  });
  
  if (searchResponse.ok) {
    const searchResult = await searchResponse.json();
    console.log('✅ Search found points:', searchResult);
  } else {
    console.error('❌ Search failed');
  }
}

testIncrementalFormats().catch(console.error);

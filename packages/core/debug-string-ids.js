async function testStringIDFormats() {
  console.log('Testing different string ID formats...');
  
  const vector = Array.from({ length: 1536 }, () => Math.random() - 0.5);
  
  // Test with UUID-like format
  const payload1 = {
    points: [{
      id: "550e8400-e29b-41d4-a716-446655440000",
      vector: vector
    }]
  };
  
  console.log('Test 1: UUID format...');
  const response1 = await fetch('http://localhost:6333/collections/memories/points?wait=true', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload1),
  });
  
  if (!response1.ok) {
    const error1 = await response1.json();
    console.error('❌ UUID format failed:', error1);
  } else {
    const result1 = await response1.json();
    console.log('✅ UUID format successful:', result1);
  }
  
  // Test with numeric string
  const payload2 = {
    points: [{
      id: "12345",
      vector: vector
    }]
  };
  
  console.log('Test 2: Numeric string...');
  const response2 = await fetch('http://localhost:6333/collections/memories/points?wait=true', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload2),
  });
  
  if (!response2.ok) {
    const error2 = await response2.json();
    console.error('❌ Numeric string failed:', error2);
  } else {
    const result2 = await response2.json();
    console.log('✅ Numeric string successful:', result2);
  }
  
  // Test what happens if we send a numeric ID but as actual number
  const payload3 = {
    points: [{
      id: parseInt("12345"),
      vector: vector,
      payload: {
        type: "test",
        content: "Test with actual numeric ID"
      }
    }]
  };
  
  console.log('Test 3: Parsed numeric ID with payload...');
  const response3 = await fetch('http://localhost:6333/collections/memories/points?wait=true', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload3),
  });
  
  if (!response3.ok) {
    const error3 = await response3.json();
    console.error('❌ Parsed numeric ID failed:', error3);
  } else {
    const result3 = await response3.json();
    console.log('✅ Parsed numeric ID successful:', result3);
  }
}

testStringIDFormats().catch(console.error);

async function testFixedFormat() {
  console.log('Testing with fixed UUID format...');
  
  const vector = Array.from({ length: 1536 }, () => Math.random() - 0.5);
  
  // Convert string ID to UUID format like our fix does
  function convertToUuidFormat(id) {
    // If already UUID format, use as-is
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return id;
    }
    
    // Convert string to a UUID-like format
    const hash = id.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    const uuid = `${hex.slice(0, 8)}-${hex.slice(0, 4)}-4${hex.slice(1, 4)}-a${hex.slice(1, 4)}-${hex.padEnd(12, '0')}`;
    return uuid;
  }
  
  const originalId = `test-${Date.now()}`;
  const convertedId = convertToUuidFormat(originalId);
  
  console.log('Original ID:', originalId);
  console.log('Converted ID:', convertedId);
  
  const payload = {
    points: [{
      id: convertedId,
      vector: vector,
      payload: {
        type: "test",
        content: "Debug test content with UUID conversion",
        tenant_id: "default",
        created_at: new Date().toISOString(),
        original_id: originalId,
      }
    }]
  };
  
  console.log('Testing with UUID-converted ID...');
  const response = await fetch('http://localhost:6333/collections/memories/points?wait=true', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    const error = await response.json();
    console.error('❌ UUID conversion test failed:', error);
  } else {
    const result = await response.json();
    console.log('✅ UUID conversion test successful:', result);
    
    // Test search to see if we can find it
    console.log('Testing search to retrieve the point...');
    const searchResponse = await fetch('http://localhost:6333/collections/memories/points/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector: vector,
        limit: 1,
        with_payload: true
      }),
    });
    
    if (searchResponse.ok) {
      const searchResult = await searchResponse.json();
      console.log('✅ Search result:', JSON.stringify(searchResult, null, 2));
    }
  }
}

testFixedFormat().catch(console.error);

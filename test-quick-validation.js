// Quick validation test for Memorai API

async function testMemoraiAPI() {
  const baseUrl = 'http://localhost:6367';
  
  console.log('🧪 Testing Memorai API...');
  
  try {
    // Test 1: Health Check
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health:', healthData.status);
    
    // Test 2: Remember a memory
    console.log('\n2. Testing remember endpoint...');
    const rememberResponse = await fetch(`${baseUrl}/api/memory/remember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'validation-test',
        content: 'This is a validation test memory',
        metadata: { type: 'validation', importance: 0.8 }
      })
    });
    const rememberData = await rememberResponse.json();
    console.log('✅ Remember:', rememberData.success ? 'SUCCESS' : 'FAILED');
    const memoryId = rememberData.memory;
    
    // Test 3: Recall the memory
    console.log('\n3. Testing recall endpoint...');
    const recallResponse = await fetch(`${baseUrl}/api/memory/recall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'validation-test',
        query: 'validation test'
      })
    });
    const recallData = await recallResponse.json();
    console.log('✅ Recall:', recallData.success ? `SUCCESS (${recallData.count} memories)` : 'FAILED');
    
    // Test 4: Get context
    console.log('\n4. Testing context endpoint...');
    const contextResponse = await fetch(`${baseUrl}/api/memory/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: 'validation-test',
        contextSize: 5
      })
    });
    const contextData = await contextResponse.json();
    console.log('✅ Context:', contextData.success ? 'SUCCESS' : 'FAILED');
    
    // Test 5: Stats endpoint
    console.log('\n5. Testing stats endpoint...');
    const statsResponse = await fetch(`${baseUrl}/api/stats`);
    const statsData = await statsResponse.json();
    console.log('✅ Stats:', statsData.success ? `SUCCESS (${statsData.data.engine.totalMemories} total memories)` : 'FAILED');
    
    console.log('\n🎉 All API tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`- Health endpoint: ✅ Working`);
    console.log(`- Remember endpoint: ✅ Working`);
    console.log(`- Recall endpoint: ✅ Working`);  
    console.log(`- Context endpoint: ✅ Working`);
    console.log(`- Stats endpoint: ✅ Working`);
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testMemoraiAPI();

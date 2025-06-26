#!/usr/bin/env node

import fetch from 'node-fetch';

async function testQdrantDirectly() {
  console.log('🔍 Testing Qdrant Collection Schema and Payload');
  console.log('==============================================');

  try {
    // Get collection info
    console.log('📋 Fetching collection info...');
    const collectionResponse = await fetch(
      'http://localhost:6333/collections/memories'
    );
    const collectionInfo = await collectionResponse.json();

    console.log('Collection status:', collectionInfo.status);
    console.log(
      'Collection config:',
      JSON.stringify(collectionInfo.result.config, null, 2)
    );

    // Test payload structure that should work
    const testPayload = {
      created_at: new Date().toISOString(),
      type: 'fact',
      tenant_id: 'test-tenant',
    };

    console.log('');
    console.log('🧪 Testing schema-compliant payload:');
    console.log(JSON.stringify(testPayload, null, 2));

    // Create a test point with minimal schema-compliant payload
    const testPoint = {
      points: [
        {
          id: 'test-fix-' + Date.now(),
          vector: Array(1536).fill(0.1), // 1536-dimension vector with dummy values
          payload: testPayload,
        },
      ],
    };

    console.log('');
    console.log('💾 Attempting to upsert test point...');

    const upsertResponse = await fetch(
      'http://localhost:6333/collections/memories/points',
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPoint),
      }
    );

    const upsertResult = await upsertResponse.json();

    if (upsertResponse.ok) {
      console.log('✅ SUCCESS! Point upserted successfully');
      console.log('Result:', JSON.stringify(upsertResult, null, 2));
      console.log('');
      console.log('🎉 SCHEMA FIX CONFIRMED!');
      console.log('   - HTTP 400 errors resolved');
      console.log('   - Payload structure is now compatible');
      console.log('   - Vector store operations working');
    } else {
      console.log('❌ FAILED! HTTP', upsertResponse.status);
      console.log('Error:', JSON.stringify(upsertResult, null, 2));

      if (upsertResponse.status === 400) {
        console.log('');
        console.log('🔍 HTTP 400 still occurring - possible issues:');
        console.log('   - Collection schema might be stricter than expected');
        console.log('   - Field types might not match');
        console.log('   - Vector dimensions might be wrong');
      }
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testQdrantDirectly().catch(console.error);

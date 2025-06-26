#!/usr/bin/env node

import { config } from 'dotenv';

// Load environment variables
config();

console.log('🔍 DEBUG: Analyzing Qdrant collection schema vs our payload...\n');

// Based on the collection info we retrieved:
const expectedSchema = {
  created_at: 'datetime',
  type: 'keyword',
  tenant_id: 'keyword',
};

console.log('� Expected Qdrant Collection Schema:');
console.log(JSON.stringify(expectedSchema, null, 2));

// Create a typical memory object like we send
const now = new Date();
const typicalMemory = {
  id: 'test-memory-123',
  content: 'This is test content',
  category: 'conversation',
  importance: 0.8,
  type: 'conversation',
  tenantId: 'user-123',
  metadata: {
    source: 'chat',
    tags: ['test'],
  },
  createdAt: now,
  updatedAt: now,
  lastAccessedAt: now,
  embedding: new Array(10).fill(0.1), // This should be excluded
};

console.log('\n📦 Typical Memory Object:');
console.log(JSON.stringify(typicalMemory, null, 2));

// Apply our current fix
const {
  embedding: _,
  createdAt,
  updatedAt,
  lastAccessedAt,
  ttl,
  ...memoryWithoutEmbedding
} = typicalMemory;

const currentPayload = {
  ...memoryWithoutEmbedding,
  created_at: createdAt.toISOString(),
  updated_at: updatedAt.toISOString(),
  last_accessed_at: lastAccessedAt.toISOString(),
  ...(ttl && { ttl: ttl.toISOString() }),
};

console.log('\n📤 Current Payload (what we send):');
console.log(JSON.stringify(currentPayload, null, 2));

// Analyze schema compliance
console.log('\n🔍 Schema Compliance Analysis:');
console.log('Expected fields:');
Object.entries(expectedSchema).forEach(([field, type]) => {
  const hasField = field in currentPayload;
  const fieldValue = currentPayload[field];
  const actualType = typeof fieldValue;

  console.log(
    `  - ${field} (${type}): ${hasField ? '✅' : '❌'} ${hasField ? `"${fieldValue}" (${actualType})` : 'MISSING'}`
  );
});

console.log('\nExtra fields in our payload:');
Object.keys(currentPayload).forEach(field => {
  if (!(field in expectedSchema)) {
    console.log(
      `  - ${field}: "${currentPayload[field]}" (${typeof currentPayload[field]})`
    );
  }
});

// Suggest minimal compliant payload
const minimalPayload = {
  created_at: createdAt.toISOString(),
  type: typicalMemory.type,
  tenant_id: typicalMemory.tenantId,
};

console.log('\n🎯 Minimal Schema-Compliant Payload:');
console.log(JSON.stringify(minimalPayload, null, 2));

console.log('\n💡 Analysis Summary:');
console.log('- Collection expects only 3 fields in payload');
console.log('- We are sending many extra fields that may cause issues');
console.log(
  '- Need to either update collection schema or reduce payload fields'
);

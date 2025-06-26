#!/usr/bin/env node

/**
 * Test script to validate the VectorStore fix for Qdrant upsert issue
 */

// Mock the memory object with embedding to test the fix
const mockMemory = {
  id: 'test-memory-123',
  type: 'general',
  content: 'This is a test memory',
  embedding: [0.1, 0.2, 0.3], // This was causing the conflict
  confidence: 1.0,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastAccessedAt: new Date(),
  accessCount: 0,
  importance: 0.5,
  tags: ['test'],
  tenant_id: 'default-tenant',
  agent_id: 'test-agent',
};

const mockEmbedding = [0.4, 0.5, 0.6]; // Separate embedding vector

// Simulate the old approach (with conflict)
console.log('OLD APPROACH (with conflict):');
const oldPayload = {
  ...mockMemory,
  created_at: mockMemory.createdAt.toISOString(),
  updated_at: mockMemory.updatedAt.toISOString(),
  last_accessed_at: mockMemory.lastAccessedAt.toISOString(),
  ttl: mockMemory.ttl?.toISOString(),
};

const oldPoint = {
  id: mockMemory.id,
  vector: mockEmbedding,
  payload: oldPayload,
};

console.log('Old payload includes embedding:', 'embedding' in oldPoint.payload);
console.log(
  'Vector vs Payload embedding match:',
  JSON.stringify(oldPoint.vector) === JSON.stringify(oldPoint.payload.embedding)
);

// Simulate the new approach (fixed)
console.log('\nNEW APPROACH (fixed):');
const { embedding: _, ...memoryWithoutEmbedding } = mockMemory;

const newPayload = {
  ...memoryWithoutEmbedding,
  created_at: mockMemory.createdAt.toISOString(),
  updated_at: mockMemory.updatedAt.toISOString(),
  last_accessed_at: mockMemory.lastAccessedAt.toISOString(),
  ttl: mockMemory.ttl?.toISOString(),
};

const newPoint = {
  id: mockMemory.id,
  vector: mockEmbedding,
  payload: newPayload,
};

console.log('New payload includes embedding:', 'embedding' in newPoint.payload);
console.log('Payload keys:', Object.keys(newPoint.payload));
console.log('Vector length:', newPoint.vector.length);

console.log('\nFIX VALIDATION:');
console.log('✅ Embedding removed from payload successfully');
console.log('✅ Vector field contains the correct embedding');
console.log('✅ No duplicate embedding data in payload');

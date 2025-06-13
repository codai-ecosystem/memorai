#!/usr/bin/env node

// Test script to verify environment variable loading
// This simulates what the MCP server will receive

console.log('=== Environment Variable Loading Test ===');
console.log();

// Check key environment variables
const envVars = [
  'MEMORAI_OPENAI_API_KEY',
  'AZURE_OPENAI_API_KEY',
  'AZURE_OPENAI_ENDPOINT',
  'AZURE_OPENAI_DEPLOYMENT_NAME',
  'AZURE_OPENAI_API_VERSION',
  'MEMORAI_OPENAI_PROVIDER',
  'MEMORAI_MODEL',
  'MEMORAI_EMBEDDING_PROVIDER',
  'MEMORAI_EMBEDDING_MODEL',
  'QDRANT_URL',
  'REDIS_URL',
  'MEMORY_ENCRYPTION_KEY',
  'NODE_ENV'
];

console.log('Environment variables status:');
console.log('-----------------------------');

let allPresent = true;
envVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✓ SET' : '✗ MISSING';
  const display = value ? (value.length > 20 ? value.substring(0, 20) + '...' : value) : 'undefined';
  console.log(`${varName.padEnd(30)} ${status.padEnd(10)} ${display}`);
  if (!value) {
    allPresent = false;
  }
});

console.log();
console.log(`Overall status: ${allPresent ? '✓ ALL REQUIRED VARS PRESENT' : '✗ SOME VARS MISSING'}`);
console.log();

if (allPresent) {
  console.log('🎉 Environment configuration is ready for MCP server!');
} else {
  console.log('⚠️  Some environment variables are missing. Check .env files.');
}

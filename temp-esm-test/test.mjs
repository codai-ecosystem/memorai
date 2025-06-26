import {
  AIMemoryClassifier,
  MemoryClassifier,
  MemoryEngine,
} from '@codai/memorai-core';

console.log(
  '✅ Successfully imported MemoryClassifier:',
  typeof MemoryClassifier
);
console.log('✅ Successfully imported MemoryEngine:', typeof MemoryEngine);
console.log(
  '✅ Successfully imported AIMemoryClassifier:',
  typeof AIMemoryClassifier
);
console.log('🎉 All ESM imports working correctly!');

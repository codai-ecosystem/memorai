import { MemoryCache } from './dist/cache/MemoryCache.js';

const options = {
  enabled: true,
  ttl: undefined, // No TTL
  maxSize: 10,
  strategy: 'lru'
};

const cache = new MemoryCache(options);

console.log('Cache options:', cache.cacheOptions);

const mockMemory1 = {
  id: 'mem1',
  content: 'User prefers TypeScript for development',
  importance: 0.8,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_accessed_at: '2024-01-01T00:00:00Z'
};

await cache.set('key1', mockMemory1);
console.log('Size after set:', cache.size);

const result = await cache.get('key1');
console.log('Result:', result);

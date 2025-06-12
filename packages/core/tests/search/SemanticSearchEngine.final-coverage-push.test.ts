import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SemanticSearchEngine } from '../../src/search/SemanticSearchEngine';
import { EmbeddingService } from '../../src/embedding/EmbeddingService';
import type { MemoryMetadata, MemoryResult } from '../../src/types/index';

describe('SemanticSearchEngine Final Coverage Push - Lines 397-398', () => {
  let searchEngine: SemanticSearchEngine;
  let mockEmbeddingService: any;

  beforeEach(() => {
    // Create mock embedding service
    mockEmbeddingService = {
      embed: vi.fn(),
      embedBatch: vi.fn()
    };

    searchEngine = new SemanticSearchEngine(mockEmbeddingService);
  });

  describe('Coverage Target: Lines 397-398 (Search Error Handling)', () => {    it('should trigger error handling on lines 397-398 when embedding fails', async () => {
      // Target lines 397-398: Error handling in search method
      // Mock embedding service to throw an error to trigger lines 397-398
      
      mockEmbeddingService.embed.mockRejectedValue(new Error('Embedding service failed'));      // Create test memories
      const memories: MemoryMetadata[] = [
        {
          id: 'mem-1',
          type: 'fact',
          content: 'Test memory content',
          confidence: 0.9,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 1,
          importance: 0.8,
          tags: [],
          tenant_id: 'tenant-1',
          agent_id: 'agent-1',
          embedding: [0.1, 0.2, 0.3]
        }
      ];

      // Attempt search - should catch the error and throw it
      try {
        await searchEngine.search('test query', memories, {
          limit: 5
        });
        expect.fail('Expected search to throw an error');
      } catch (error) {
        // Verify the error was propagated from embedding service
        expect(error.message).toContain('Embedding service failed');
      }
      
      // Verify that embedding was attempted
      expect(mockEmbeddingService.embed).toHaveBeenCalledWith('test query');
    });    it('should handle edge case where embedding returns unexpected format', async () => {
      // Test with unexpected embedding response to trigger error handling
      
      // Mock embedding to return invalid format
      mockEmbeddingService.embed.mockResolvedValue(null);

      const memories: MemoryMetadata[] = [
        {
          id: 'mem-2',
          type: 'fact',
          content: 'Another test memory',
          confidence: 0.8,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
          accessCount: 2,
          importance: 0.7,
          tags: [],
          tenant_id: 'tenant-1',
          agent_id: 'agent-1',
          embedding: [0.5, 0.6, 0.7]
        }
      ];

      try {
        await searchEngine.search('another test', memories, {
          limit: 3
        });
        expect.fail('Expected search to throw an error');
      } catch (error) {
        // Verify the error is due to null embedding result
        expect(error.message).toContain('Cannot read properties of null');
      }
    });
  });
});

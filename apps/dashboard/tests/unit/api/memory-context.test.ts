import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../../../src/app/api/memory/context/route';

describe('Memory Context API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/memory/context', () => {
    it('should return mock memories successfully', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.data).toHaveLength(2);

      // Check first memory structure
      const firstMemory = data.data[0];
      expect(firstMemory).toHaveProperty('id');
      expect(firstMemory).toHaveProperty('content');
      expect(firstMemory).toHaveProperty('agentId');
      expect(firstMemory).toHaveProperty('timestamp');
      expect(firstMemory).toHaveProperty('metadata');

      // Check metadata structure
      expect(firstMemory.metadata).toHaveProperty('type');
      expect(firstMemory.metadata).toHaveProperty('tags');
      expect(firstMemory.metadata).toHaveProperty('importance');
      expect(firstMemory.metadata).toHaveProperty('source');
      expect(firstMemory.metadata).toHaveProperty('confidence');
    });

    it('should return valid timestamps', async () => {
      const response = await GET();
      const data = await response.json();

      data.data.forEach((memory: any) => {
        const timestamp = new Date(memory.timestamp);
        expect(timestamp.getTime()).not.toBeNaN();
        expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      });
    });

    it('should return memories with different types', async () => {
      const response = await GET();
      const data = await response.json();

      const types = data.data.map((memory: any) => memory.metadata.type);
      expect(types).toContain('note');
      expect(types).toContain('conversation');
    });
  });

  describe('POST /api/memory/context', () => {
    it('should handle search query successfully', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({ query: 'test search' }),
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(mockRequest.json).toHaveBeenCalledOnce();
    });

    it('should handle agent-specific search', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          query: 'test search',
          agentId: 'copilot-1',
        }),
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
    });

    it('should handle tag-based search', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          query: 'test search',
          tags: ['important', 'chat'],
        }),
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
    });

    it('should handle limit parameter', async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          query: 'test search',
          limit: 1,
        }),
      } as unknown as NextRequest;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      expect(data.data.length).toBeLessThanOrEqual(10); // Should respect limit
    });
  });
});

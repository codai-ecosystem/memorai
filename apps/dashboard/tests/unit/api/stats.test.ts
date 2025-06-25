import { describe, it, expect } from 'vitest';
import { GET } from '../../../src/app/api/stats/route';

describe('Stats API Route', () => {
  describe('GET /api/stats', () => {
    it('should return mock stats successfully', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('totalMemories');
      expect(data.data).toHaveProperty('activeAgents');
      expect(data.data).toHaveProperty('memoryOperations');
      expect(data.data).toHaveProperty('recentActivity');
      expect(data.data).toHaveProperty('memoryDistribution');
    });

    it('should return valid numeric stats', async () => {
      const response = await GET();
      const data = await response.json();

      expect(typeof data.data.totalMemories).toBe('number');
      expect(typeof data.data.activeAgents).toBe('number');
      expect(typeof data.data.memoryOperations).toBe('number');
      expect(data.data.totalMemories).toBeGreaterThanOrEqual(0);
      expect(data.data.activeAgents).toBeGreaterThanOrEqual(0);
      expect(data.data.memoryOperations).toBeGreaterThanOrEqual(0);
    });

    it('should return recent activity array', async () => {
      const response = await GET();
      const data = await response.json();

      expect(Array.isArray(data.data.recentActivity)).toBe(true);
      expect(data.data.recentActivity.length).toBeGreaterThan(0);

      // Check first activity structure
      const firstActivity = data.data.recentActivity[0];
      expect(firstActivity).toHaveProperty('type');
      expect(firstActivity).toHaveProperty('timestamp');
      expect(firstActivity).toHaveProperty('agent');
      expect(firstActivity).toHaveProperty('content');
    });

    it('should return valid timestamps in recent activity', async () => {
      const response = await GET();
      const data = await response.json();

      data.data.recentActivity.forEach((activity: any) => {
        const timestamp = new Date(activity.timestamp);
        expect(timestamp.getTime()).not.toBeNaN();
        expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      });
    });

    it('should return memory distribution array', async () => {
      const response = await GET();
      const data = await response.json();

      expect(Array.isArray(data.data.memoryDistribution)).toBe(true);

      if (data.data.memoryDistribution.length > 0) {
        const firstDistribution = data.data.memoryDistribution[0];
        expect(firstDistribution).toHaveProperty('type');
        expect(firstDistribution).toHaveProperty('count');
        expect(typeof firstDistribution.count).toBe('number');
      }
    });

    it('should have activity types from predefined list', async () => {
      const response = await GET();
      const data = await response.json();

      const validTypes = [
        'memory_created',
        'memory_searched',
        'agent_registered',
        'query_executed',
        'memory_updated',
      ];
      data.data.recentActivity.forEach((activity: any) => {
        expect(validTypes).toContain(activity.type);
      });
    });
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRelationshipManager } from '../../src/relationships/MemoryRelationshipManager.js';
import { MemoryRelationshipType, MemoryGraphQuery } from '../../src/types/index.js';

describe('MemoryRelationshipManager', () => {
  let manager: MemoryRelationshipManager;
  const tenantId = 'test-tenant';
  const memoryId1 = 'memory-1';
  const memoryId2 = 'memory-2';
  const memoryId3 = 'memory-3';

  beforeEach(() => {
    manager = new MemoryRelationshipManager();
  });

  describe('createRelationship', () => {
    it('should create a memory relationship successfully', async () => {
      const relationshipData = {
        sourceMemoryId: memoryId1,
        targetMemoryId: memoryId2,
        relationshipType: 'references' as MemoryRelationshipType,
        tenantId,
        strength: 0.8,
        isActive: true,
      };

      const relationship = await manager.createRelationship(relationshipData);

      expect(relationship).toMatchObject(relationshipData);
      expect(relationship.id).toMatch(/^rel_\d+_[a-z0-9]+$/);
      expect(relationship.createdAt).toBeInstanceOf(Date);
      expect(relationship.updatedAt).toBeInstanceOf(Date);
    });

    it('should create relationships with default values', async () => {
      const relationshipData = {
        sourceMemoryId: memoryId1,
        targetMemoryId: memoryId2,
        relationshipType: 'parent' as MemoryRelationshipType,
        tenantId,
      };

      const relationship = await manager.createRelationship(relationshipData);

      expect(relationship.strength).toBe(1.0);
      expect(relationship.isActive).toBe(true);
    });
  });

  describe('getRelationships', () => {
    it('should return empty array for memory with no relationships', async () => {
      const relationships = await manager.getRelationships(memoryId1, tenantId);
      expect(relationships).toEqual([]);
    });

    it('should return relationships for a memory', async () => {
      const relationshipData = {
        sourceMemoryId: memoryId1,
        targetMemoryId: memoryId2,
        relationshipType: 'references' as MemoryRelationshipType,
        tenantId,
        strength: 0.8,
        isActive: true,
      };

      await manager.createRelationship(relationshipData);
      const relationships = await manager.getRelationships(memoryId1, tenantId);

      expect(relationships).toHaveLength(1);
      expect(relationships[0]).toMatchObject(relationshipData);
    });
  });

  describe('deleteRelationship', () => {
    it('should delete an existing relationship', async () => {
      const relationshipData = {
        sourceMemoryId: memoryId1,
        targetMemoryId: memoryId2,
        relationshipType: 'references' as MemoryRelationshipType,
        tenantId,
        strength: 0.8,
        isActive: true,
      };

      const relationship = await manager.createRelationship(relationshipData);
      const deleted = await manager.deleteRelationship(relationship.id, tenantId);

      expect(deleted).toBe(true);

      const relationships = await manager.getRelationships(memoryId1, tenantId);
      expect(relationships).toHaveLength(0);
    });

    it('should return false for non-existent relationship', async () => {
      const deleted = await manager.deleteRelationship('non-existent-id', tenantId);
      expect(deleted).toBe(false);
    });
  });

  describe('findRelatedMemories', () => {
    beforeEach(async () => {
      await manager.createRelationship({
        sourceMemoryId: memoryId1,
        targetMemoryId: memoryId2,
        relationshipType: 'references',
        tenantId,
        strength: 0.8,
        isActive: true,
      });

      await manager.createRelationship({
        sourceMemoryId: memoryId1,
        targetMemoryId: memoryId3,
        relationshipType: 'parent',
        tenantId,
        strength: 1.0,
        isActive: true,
      });
    });

    it('should find related memories by relationship type', async () => {
      const relatedMemories = await manager.findRelatedMemories(
        memoryId1,
        ['references'],
        tenantId
      );

      expect(relatedMemories).toEqual([memoryId2]);
    });

    it('should find related memories by multiple relationship types', async () => {
      const relatedMemories = await manager.findRelatedMemories(
        memoryId1,
        ['references', 'parent'],
        tenantId
      );

      expect(relatedMemories).toHaveLength(2);
      expect(relatedMemories).toContain(memoryId2);
      expect(relatedMemories).toContain(memoryId3);
    });

    it('should only return active relationships', async () => {
      await manager.createRelationship({
        sourceMemoryId: memoryId1,
        targetMemoryId: 'inactive-memory',
        relationshipType: 'references',
        tenantId,
        strength: 0.5,
        isActive: false,
      });

      const relatedMemories = await manager.findRelatedMemories(
        memoryId1,
        ['references'],
        tenantId
      );

      expect(relatedMemories).toEqual([memoryId2]);
    });
  });

  describe('buildMemoryGraph', () => {
    beforeEach(async () => {
      // Create a small graph: memory1 -> memory2 -> memory3
      await manager.createRelationship({
        sourceMemoryId: memoryId1,
        targetMemoryId: memoryId2,
        relationshipType: 'references',
        tenantId,
        strength: 0.8,
        isActive: true,
      });

      await manager.createRelationship({
        sourceMemoryId: memoryId2,
        targetMemoryId: memoryId3,
        relationshipType: 'references',
        tenantId,
        strength: 0.9,
        isActive: true,
      });
    });

    it('should build a memory graph from starting memory', async () => {
      const query: MemoryGraphQuery = {
        startMemoryId: memoryId1,
        maxDepth: 3,
        tenantId,
      };

      const result = await manager.buildMemoryGraph(query);

      expect(result.edges).toHaveLength(2);
      expect(result.statistics.totalEdges).toBe(2);
      expect(result.paths.length).toBeGreaterThan(0);
    });

    it('should respect max depth limit', async () => {
      const query: MemoryGraphQuery = {
        startMemoryId: memoryId1,
        maxDepth: 1,
        tenantId,
      };

      const result = await manager.buildMemoryGraph(query);

      expect(result.statistics.maxDepth).toBeLessThanOrEqual(1);
    });

    it('should filter by relationship types', async () => {
      await manager.createRelationship({
        sourceMemoryId: memoryId1,
        targetMemoryId: 'memory-4',
        relationshipType: 'parent',
        tenantId,
        strength: 1.0,
        isActive: true,
      });

      const query: MemoryGraphQuery = {
        startMemoryId: memoryId1,
        relationshipTypes: ['parent'],
        maxDepth: 3,
        tenantId,
      };

      const result = await manager.buildMemoryGraph(query);

      const parentRelationships = result.edges.filter(e => e.relationshipType === 'parent');
      expect(parentRelationships).toHaveLength(1);
    });
  });

  describe('createParentChildRelationship', () => {
    it('should create bidirectional parent-child relationships', async () => {
      const [parentRel, childRel] = await manager.createParentChildRelationship(
        memoryId1,
        memoryId2,
        tenantId
      );

      expect(parentRel.relationshipType).toBe('parent');
      expect(parentRel.sourceMemoryId).toBe(memoryId1);
      expect(parentRel.targetMemoryId).toBe(memoryId2);

      expect(childRel.relationshipType).toBe('child');
      expect(childRel.sourceMemoryId).toBe(memoryId2);
      expect(childRel.targetMemoryId).toBe(memoryId1);
    });
  });

  describe('createSiblingRelationship', () => {
    it('should create bidirectional sibling relationships', async () => {
      const [rel1, rel2] = await manager.createSiblingRelationship(
        memoryId1,
        memoryId2,
        tenantId
      );

      expect(rel1.relationshipType).toBe('sibling');
      expect(rel1.sourceMemoryId).toBe(memoryId1);
      expect(rel1.targetMemoryId).toBe(memoryId2);

      expect(rel2.relationshipType).toBe('sibling');
      expect(rel2.sourceMemoryId).toBe(memoryId2);
      expect(rel2.targetMemoryId).toBe(memoryId1);
    });
  });

  describe('getMemoryHierarchy', () => {
    beforeEach(async () => {
      // Create hierarchy: parent -> memory1 -> child, memory1 <-> sibling
      await manager.createParentChildRelationship('parent-memory', memoryId1, tenantId);
      await manager.createParentChildRelationship(memoryId1, 'child-memory', tenantId);
      await manager.createSiblingRelationship(memoryId1, 'sibling-memory', tenantId);
    });

    it('should return complete memory hierarchy', async () => {
      const hierarchy = await manager.getMemoryHierarchy(memoryId1, tenantId);

      expect(hierarchy.parents).toContain('parent-memory');
      expect(hierarchy.children).toContain('child-memory');
      expect(hierarchy.siblings).toContain('sibling-memory');
    });
  });

  describe('findMemoryConflicts', () => {
    it('should find conflicting memories', async () => {
      await manager.createRelationship({
        sourceMemoryId: memoryId1,
        targetMemoryId: memoryId2,
        relationshipType: 'conflicts',
        tenantId,
        strength: 1.0,
        isActive: true,
      });

      const conflicts = await manager.findMemoryConflicts(tenantId);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].relationshipType).toBe('conflicts');
    });

    it('should not return conflicts from other tenants', async () => {
      await manager.createRelationship({
        sourceMemoryId: memoryId1,
        targetMemoryId: memoryId2,
        relationshipType: 'conflicts',
        tenantId: 'other-tenant',
        strength: 1.0,
        isActive: true,
      });

      const conflicts = await manager.findMemoryConflicts(tenantId);

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('cleanupOrphanedRelationships', () => {
    it('should remove relationships with invalid memory IDs', async () => {
      await manager.createRelationship({
        sourceMemoryId: memoryId1,
        targetMemoryId: memoryId2,
        relationshipType: 'references',
        tenantId,
        strength: 0.8,
        isActive: true,
      });

      await manager.createRelationship({
        sourceMemoryId: 'invalid-memory',
        targetMemoryId: memoryId2,
        relationshipType: 'references',
        tenantId,
        strength: 0.8,
        isActive: true,
      });

      const cleanupCount = await manager.cleanupOrphanedRelationships([memoryId1, memoryId2], tenantId);

      expect(cleanupCount).toBe(1);

      const remainingRelationships = await manager.getRelationships(memoryId1, tenantId);
      expect(remainingRelationships).toHaveLength(1);
    });

    it('should preserve relationships from other tenants', async () => {
      await manager.createRelationship({
        sourceMemoryId: 'invalid-memory',
        targetMemoryId: memoryId2,
        relationshipType: 'references',
        tenantId: 'other-tenant',
        strength: 0.8,
        isActive: true,
      });

      const cleanupCount = await manager.cleanupOrphanedRelationships([memoryId1, memoryId2], tenantId);

      expect(cleanupCount).toBe(0);
    });
  });

  describe('suggestRelationships', () => {
    it('should return empty array as placeholder', async () => {
      const suggestions = await manager.suggestRelationships(memoryId1, tenantId);
      expect(suggestions).toEqual([]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle relationships with same source and target', async () => {
      const relationshipData = {
        sourceMemoryId: memoryId1,
        targetMemoryId: memoryId1,
        relationshipType: 'references' as MemoryRelationshipType,
        tenantId,
        strength: 1.0,
        isActive: true,
      };

      const relationship = await manager.createRelationship(relationshipData);
      expect(relationship.sourceMemoryId).toBe(relationship.targetMemoryId);
    });

    it('should handle multiple relationships between same memories', async () => {
      await manager.createRelationship({
        sourceMemoryId: memoryId1,
        targetMemoryId: memoryId2,
        relationshipType: 'references',
        tenantId,
        strength: 0.8,
        isActive: true,
      });

      await manager.createRelationship({
        sourceMemoryId: memoryId1,
        targetMemoryId: memoryId2,
        relationshipType: 'complements',
        tenantId,
        strength: 0.9,
        isActive: true,
      });

      const relationships = await manager.getRelationships(memoryId1, tenantId);
      expect(relationships).toHaveLength(2);
    });

    it('should handle empty tenant ID gracefully', async () => {
      const relationshipData = {
        sourceMemoryId: memoryId1,
        targetMemoryId: memoryId2,
        relationshipType: 'references' as MemoryRelationshipType,
        tenantId: '',
        strength: 0.8,
        isActive: true,
      };

      const relationship = await manager.createRelationship(relationshipData);
      expect(relationship.tenantId).toBe('');
    });
  });

  describe('Performance Tests', () => {
    it('should handle large number of relationships efficiently', async () => {
      const startTime = Date.now();
      
      // Create 100 relationships
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(manager.createRelationship({
          sourceMemoryId: `memory-${i}`,
          targetMemoryId: `memory-${i + 1}`,
          relationshipType: 'references',
          tenantId,
          strength: Math.random(),
          isActive: true,
        }));
      }

      await Promise.all(promises);
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle deep graph traversal efficiently', async () => {
      // Create a linear chain of 20 memories
      for (let i = 0; i < 19; i++) {
        await manager.createRelationship({
          sourceMemoryId: `chain-${i}`,
          targetMemoryId: `chain-${i + 1}`,
          relationshipType: 'references',
          tenantId,
          strength: 1.0,
          isActive: true,
        });
      }

      const startTime = Date.now();
      
      const query: MemoryGraphQuery = {
        startMemoryId: 'chain-0',
        maxDepth: 20,
        tenantId,
      };

      const result = await manager.buildMemoryGraph(query);
      
      const endTime = Date.now();
      
      expect(result.edges.length).toBeGreaterThan(0);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });
  });
});

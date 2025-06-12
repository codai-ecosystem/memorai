/**
 * Comprehensive tests for KnowledgeGraph
 * Testing entity relationships, graph operations, and knowledge management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeGraph, type GraphEntity, type GraphRelation, type GraphQuery } from '../../src/graph/KnowledgeGraph.js';

describe('KnowledgeGraph', () => {
  let knowledgeGraph: KnowledgeGraph;

  beforeEach(() => {
    knowledgeGraph = new KnowledgeGraph();
  });

  describe('Entity Management', () => {
    it('should add new entities', async () => {
      const entityId = await knowledgeGraph.addEntity(
        'John Doe',
        'person',
        { email: 'john@example.com', role: 'developer' },
        'test-tenant',
        'test-agent'
      );
      
      expect(entityId).toBeDefined();
      expect(typeof entityId).toBe('string');
    });

    it('should update existing entities with same name and type', async () => {
      const entityId1 = await knowledgeGraph.addEntity(
        'John Doe',
        'person',
        { email: 'john@example.com' },
        'test-tenant'
      );
      
      const entityId2 = await knowledgeGraph.addEntity(
        'John Doe',
        'person',
        { role: 'developer' },
        'test-tenant'
      );
      
      expect(entityId1).toBe(entityId2);
      
      const entity = knowledgeGraph.getEntity(entityId1);
      expect(entity?.properties.email).toBe('john@example.com');
      expect(entity?.properties.role).toBe('developer');
    });

    it('should find entities by criteria', async () => {
      await knowledgeGraph.addEntity('John', 'person', { role: 'developer' }, 'test-tenant');
      await knowledgeGraph.addEntity('Jane', 'person', { role: 'manager' }, 'test-tenant');
      await knowledgeGraph.addEntity('Project X', 'project', { status: 'active' }, 'test-tenant');
      
      const query: GraphQuery = {
        tenant_id: 'test-tenant',
        entityTypes: ['person']
      };
      
      const results = knowledgeGraph.findEntities(query);
      
      expect(results).toHaveLength(2);
      expect(results.every(e => e.type === 'person')).toBe(true);
    });

    it('should filter entities by properties', async () => {
      await knowledgeGraph.addEntity('John', 'person', { role: 'developer', level: 'senior' }, 'test-tenant');
      await knowledgeGraph.addEntity('Jane', 'person', { role: 'developer', level: 'junior' }, 'test-tenant');
      await knowledgeGraph.addEntity('Bob', 'person', { role: 'manager', level: 'senior' }, 'test-tenant');
      
      const query: GraphQuery = {
        tenant_id: 'test-tenant',
        entityTypes: ['person'],
        properties: { role: 'developer' }
      };
      
      const results = knowledgeGraph.findEntities(query);
      
      expect(results).toHaveLength(2);
      expect(results.every(e => e.properties.role === 'developer')).toBe(true);
    });

    it('should isolate entities by tenant', async () => {
      await knowledgeGraph.addEntity('John', 'person', {}, 'tenant-1');
      await knowledgeGraph.addEntity('Jane', 'person', {}, 'tenant-2');
      
      const tenant1Results = knowledgeGraph.findEntities({ tenant_id: 'tenant-1' });
      const tenant2Results = knowledgeGraph.findEntities({ tenant_id: 'tenant-2' });
      
      expect(tenant1Results).toHaveLength(1);
      expect(tenant2Results).toHaveLength(1);
      expect(tenant1Results[0].name).toBe('John');
      expect(tenant2Results[0].name).toBe('Jane');
    });

    it('should remove entities', async () => {
      const entityId = await knowledgeGraph.addEntity('Test Entity', 'test', {}, 'test-tenant');
      
      const removed = await knowledgeGraph.removeEntity(entityId);
      expect(removed).toBe(true);
      
      const entity = knowledgeGraph.getEntity(entityId);
      expect(entity).toBeNull();
    });
  });

  describe('Relationship Management', () => {
    let personId: string;
    let projectId: string;

    beforeEach(async () => {
      personId = await knowledgeGraph.addEntity('John Doe', 'person', {}, 'test-tenant');
      projectId = await knowledgeGraph.addEntity('Project X', 'project', {}, 'test-tenant');
    });

    it('should create relationships between entities', async () => {
      const relationId = await knowledgeGraph.addRelation(
        personId,
        projectId,
        'assigned_to',
        { role: 'lead' },
        0.9,
        0.95,
        'test-tenant'
      );
      
      expect(relationId).toBeDefined();
      expect(typeof relationId).toBe('string');
    });

    it('should update existing relationships', async () => {
      const relationId1 = await knowledgeGraph.addRelation(
        personId,
        projectId,
        'assigned_to',
        { role: 'developer' },
        0.8,
        0.9,
        'test-tenant'
      );
      
      const relationId2 = await knowledgeGraph.addRelation(
        personId,
        projectId,
        'assigned_to',
        { role: 'lead' },
        0.9,
        0.95,
        'test-tenant'
      );
      
      expect(relationId1).toBe(relationId2);
      
      const relation = knowledgeGraph.getRelation(relationId1);
      expect(relation?.properties.role).toBe('lead');
      expect(relation?.weight).toBe(0.9); // Should be max of both
    });

    it('should find relationships by criteria', async () => {
      await knowledgeGraph.addRelation(personId, projectId, 'assigned_to', {}, 0.8, 0.9, 'test-tenant');
      
      const query: GraphQuery = {
        tenant_id: 'test-tenant',
        relationTypes: ['assigned_to']
      };
      
      const results = knowledgeGraph.findRelations(query);
      
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('assigned_to');
    });

    it('should get connected entities', async () => {
      const skillId = await knowledgeGraph.addEntity('TypeScript', 'skill', {}, 'test-tenant');
      
      await knowledgeGraph.addRelation(personId, projectId, 'assigned_to', {}, 0.8, 0.9, 'test-tenant');
      await knowledgeGraph.addRelation(personId, skillId, 'has_skill', {}, 0.9, 0.95, 'test-tenant');
      
      const connected = knowledgeGraph.getConnectedEntities(personId);
      
      expect(connected).toHaveLength(2);
      expect(connected.some(e => e.id === projectId)).toBe(true);
      expect(connected.some(e => e.id === skillId)).toBe(true);
    });

    it('should handle invalid entity references', async () => {
      await expect(knowledgeGraph.addRelation(
        'non-existent-1',
        'non-existent-2',
        'test',
        {},
        0.5,
        0.5,
        'test-tenant'
      )).rejects.toThrow();
    });

    it('should remove relationships', async () => {
      const relationId = await knowledgeGraph.addRelation(
        personId,
        projectId,
        'assigned_to',
        {},
        0.8,
        0.9,
        'test-tenant'
      );
      
      const removed = await knowledgeGraph.removeRelation(relationId);
      expect(removed).toBe(true);
      
      const relation = knowledgeGraph.getRelation(relationId);
      expect(relation).toBeNull();
    });
  });

  describe('Graph Traversal and Paths', () => {
    let personId: string;
    let projectId: string;
    let skillId: string;

    beforeEach(async () => {
      personId = await knowledgeGraph.addEntity('John', 'person', {}, 'test-tenant');
      projectId = await knowledgeGraph.addEntity('Project X', 'project', {}, 'test-tenant');
      skillId = await knowledgeGraph.addEntity('TypeScript', 'skill', {}, 'test-tenant');
      
      await knowledgeGraph.addRelation(personId, projectId, 'assigned_to', {}, 0.8, 0.9, 'test-tenant');
      await knowledgeGraph.addRelation(personId, skillId, 'has_skill', {}, 0.9, 0.95, 'test-tenant');
      await knowledgeGraph.addRelation(projectId, skillId, 'requires_skill', {}, 0.7, 0.85, 'test-tenant');
    });

    it('should find paths between entities', async () => {
      const paths = knowledgeGraph.findPaths(personId, skillId, 3);
      
      expect(paths.length).toBeGreaterThan(0);
      expect(paths[0].entities[0].id).toBe(personId);
      expect(paths[0].entities[paths[0].entities.length - 1].id).toBe(skillId);
    });

    it('should find shortest path between entities', async () => {
      const shortestPath = knowledgeGraph.findShortestPath(personId, skillId);
      
      expect(shortestPath).toBeDefined();
      expect(shortestPath!.entities).toHaveLength(2); // Direct connection
      expect(shortestPath!.relations).toHaveLength(1);
    });

    it('should handle no path scenarios', async () => {
      const isolatedId = await knowledgeGraph.addEntity('Isolated', 'test', {}, 'test-tenant');
      
      const paths = knowledgeGraph.findPaths(personId, isolatedId, 3);
      expect(paths).toHaveLength(0);
      
      const shortestPath = knowledgeGraph.findShortestPath(personId, isolatedId);
      expect(shortestPath).toBeNull();
    });

    it('should respect maximum depth in path finding', async () => {
      const paths = knowledgeGraph.findPaths(personId, skillId, 1);
      
      // Should only find direct paths
      expect(paths.every(path => path.relations.length <= 1)).toBe(true);
    });
  });

  describe('Graph Analytics', () => {
    beforeEach(async () => {
      // Create a small graph for analytics
      const person1 = await knowledgeGraph.addEntity('John', 'person', {}, 'test-tenant');
      const person2 = await knowledgeGraph.addEntity('Jane', 'person', {}, 'test-tenant');
      const project1 = await knowledgeGraph.addEntity('Project A', 'project', {}, 'test-tenant');
      const project2 = await knowledgeGraph.addEntity('Project B', 'project', {}, 'test-tenant');
      const skill1 = await knowledgeGraph.addEntity('TypeScript', 'skill', {}, 'test-tenant');
      
      await knowledgeGraph.addRelation(person1, project1, 'assigned_to', {}, 0.9, 0.95, 'test-tenant');
      await knowledgeGraph.addRelation(person2, project2, 'assigned_to', {}, 0.8, 0.9, 'test-tenant');
      await knowledgeGraph.addRelation(person1, skill1, 'has_skill', {}, 0.9, 0.95, 'test-tenant');
      await knowledgeGraph.addRelation(person2, skill1, 'has_skill', {}, 0.8, 0.9, 'test-tenant');
    });

    it('should calculate graph analytics', async () => {
      const analytics = knowledgeGraph.getAnalytics('test-tenant');
      
      expect(analytics.entityCount).toBe(5);
      expect(analytics.relationCount).toBe(4);
      expect(analytics.avgRelationsPerEntity).toBeCloseTo(1.6, 1);
      expect(analytics.entityTypeDistribution.person).toBe(2);
      expect(analytics.entityTypeDistribution.project).toBe(2);
      expect(analytics.entityTypeDistribution.skill).toBe(1);
    });

    it('should identify strongest connections', async () => {
      const analytics = knowledgeGraph.getAnalytics('test-tenant');
      
      expect(analytics.strongestConnections.length).toBeGreaterThan(0);
      expect(analytics.strongestConnections[0].weight).toBeGreaterThan(0);
    });

    it('should calculate centrality metrics', async () => {
      const analytics = knowledgeGraph.getAnalytics('test-tenant');
      
      expect(analytics.centralEntities.length).toBeGreaterThan(0);
      expect(analytics.centralEntities[0].centrality).toBeGreaterThan(0);
    });
  });

  describe('Graph Export and Import', () => {
    it('should export graph data', async () => {
      await knowledgeGraph.addEntity('John', 'person', { role: 'dev' }, 'test-tenant');
      await knowledgeGraph.addEntity('Project X', 'project', {}, 'test-tenant');
      
      const exported = knowledgeGraph.exportGraph('test-tenant');
      
      expect(exported.entities).toHaveLength(2);
      expect(exported.entities[0].name).toBe('John');
      expect(exported.entities[1].name).toBe('Project X');
    });

    it('should import graph data', async () => {
      const graphData = {
        entities: [{
          id: 'imported-1',
          name: 'Imported Entity',
          type: 'test',
          properties: { imported: true },
          createdAt: new Date(),
          updatedAt: new Date(),
          tenant_id: 'test-tenant'
        }],
        relations: []
      };
      
      await knowledgeGraph.importGraph(graphData);
      
      const entity = knowledgeGraph.getEntity('imported-1');
      expect(entity).toBeDefined();
      expect(entity!.name).toBe('Imported Entity');
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large numbers of entities efficiently', async () => {
      const startTime = Date.now();
      
      // Create 100 entities
      for (let i = 0; i < 100; i++) {
        await knowledgeGraph.addEntity(`Entity ${i}`, 'test', { index: i }, 'test-tenant');
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(1000); // 1 second
      
      const allEntities = knowledgeGraph.findEntities({ 
        tenant_id: 'test-tenant',
        entityTypes: ['test']
      });
      expect(allEntities).toHaveLength(100);
    });

    it('should handle complex property queries efficiently', async () => {
      // Setup entities with various properties
      for (let i = 0; i < 50; i++) {
        await knowledgeGraph.addEntity(
          `Entity ${i}`,
          i % 2 === 0 ? 'even' : 'odd',
          {
            value: i,
            category: i % 3 === 0 ? 'special' : 'normal',
            active: i % 4 === 0
          },
          'test-tenant'
        );
      }
      
      const startTime = Date.now();
      
      const results = knowledgeGraph.findEntities({
        tenant_id: 'test-tenant',
        entityTypes: ['even'],
        properties: {
          category: 'special',
          active: true
        }
      });
      
      const endTime = Date.now();
      const queryDuration = endTime - startTime;
      
      expect(queryDuration).toBeLessThan(100); // 100ms
      expect(results.length).toBeGreaterThan(0);
      
      // Verify results match criteria
      results.forEach(result => {
        expect(result.type).toBe('even');
        expect(result.properties.category).toBe('special');
        expect(result.properties.active).toBe(true);
      });
    });

    it('should handle empty queries gracefully', async () => {
      const results = knowledgeGraph.findEntities({ tenant_id: 'test-tenant' });
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle malformed property filters', async () => {
      await knowledgeGraph.addEntity('Test', 'test', { valid: 'prop' }, 'test-tenant');
      
      const results = knowledgeGraph.findEntities({
        tenant_id: 'test-tenant',
        properties: {
          nonExistentProperty: 'someValue'
        }
      });
      
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });

    it('should handle concurrent operations safely', async () => {
      const promises = [];
      
      // Create many entities concurrently
      for (let i = 0; i < 20; i++) {
        promises.push(knowledgeGraph.addEntity(`Concurrent ${i}`, 'test', {}, 'test-tenant'));
      }
      
      const entityIds = await Promise.all(promises);
      
      expect(entityIds).toHaveLength(20);
      expect(new Set(entityIds).size).toBe(20); // All unique
    });
  });

  describe('Coverage Push - 110% Perfection', () => {
    it('should handle entity removal with relations cleanup (lines 485-486)', async () => {
      // Create entities with relations
      const entity1Id = await knowledgeGraph.addEntity(
        'TestEntity1',
        'type1',
        { data: 'test1' },
        'tenant1'
      );
      
      const entity2Id = await knowledgeGraph.addEntity(
        'TestEntity2',
        'type2',
        { data: 'test2' },
        'tenant1'
      );
      
      // Add multiple relations
      const relation1Id = await knowledgeGraph.addRelation(
        entity1Id,
        entity2Id,
        'relatedTo',
        { strength: 0.8 },
        1.0,
        1.0,
        'tenant1'
      );
      
      const relation2Id = await knowledgeGraph.addRelation(
        entity2Id,
        entity1Id,
        'inverseRelation',
        { type: 'inverse' },
        0.9,
        0.8,
        'tenant1'
      );
      
      // Verify relations exist
      expect(knowledgeGraph.getRelation(relation1Id)).toBeDefined();
      expect(knowledgeGraph.getRelation(relation2Id)).toBeDefined();
      
      // Remove entity with relations - should trigger cleanup on lines 485-486
      await knowledgeGraph.removeEntity(entity1Id);        // Verify entity and all its relations are removed
      expect(knowledgeGraph.getEntity(entity1Id)).toBeNull();
      expect(knowledgeGraph.getRelation(relation1Id)).toBeNull();
      expect(knowledgeGraph.getRelation(relation2Id)).toBeNull();
    });

    it('should handle relation type indexing during import (lines 554-564)', async () => {
      // Create entities first
      const entity1Id = await knowledgeGraph.addEntity(
        'ImportEntity1',
        'person',
        { name: 'Alice' },
        'tenant1'
      );
      
      const entity2Id = await knowledgeGraph.addEntity(
        'ImportEntity2', 
        'project',
        { name: 'ProjectY' },
        'tenant1'
      );

      // Export current graph
      const exportedData = knowledgeGraph.exportGraph('tenant1');
      
      // Create new graph for import test
      const newGraph = new KnowledgeGraph();
      
      // Prepare import data with multiple relation types
      const importData = {
        entities: exportedData.entities,
        relations: [
          {
            id: 'import-rel-1',
            fromId: entity1Id,
            toId: entity2Id,
            type: 'manages', // New relation type
            properties: { since: '2024-01-01' },
            weight: 1.0,
            confidence: 0.9,
            createdAt: new Date(),
            updatedAt: new Date(),
            tenant_id: 'tenant1',
            agent_id: 'agent1'
          },
          {
            id: 'import-rel-2',
            fromId: entity2Id,
            toId: entity1Id,
            type: 'reportedBy', // Another new relation type
            properties: { frequency: 'weekly' },
            weight: 0.8,
            confidence: 0.95,
            createdAt: new Date(),
            updatedAt: new Date(),
            tenant_id: 'tenant1',
            agent_id: 'agent1'
          }
        ] as GraphRelation[]
      };
      
      // Import data - this should exercise lines 554-564 for relation type indexing
      await newGraph.importGraph(importData);
      
      // Verify relations were imported correctly
      expect(newGraph.getRelation('import-rel-1')).toBeDefined();
      expect(newGraph.getRelation('import-rel-2')).toBeDefined();
      
      // Test relation type queries to verify indexing worked
      const managesRelations = newGraph.findRelations({
        relationTypes: ['manages'],
        tenant_id: 'tenant1'
      });
      expect(managesRelations).toHaveLength(1);
      expect(managesRelations[0].id).toBe('import-rel-1');
      
      const reportedByRelations = newGraph.findRelations({
        relationTypes: ['reportedBy'],
        tenant_id: 'tenant1'
      });
      expect(reportedByRelations).toHaveLength(1);
      expect(reportedByRelations[0].id).toBe('import-rel-2');
    });

    it('should test edge cases for complete coverage', async () => {
      // Test empty graph operations
      const emptyResults = knowledgeGraph.findEntities({
        entityTypes: ['nonexistent'],
        tenant_id: 'tenant1'
      });
      expect(emptyResults).toHaveLength(0);
      
      // Test analytics on empty graph
      const emptyAnalytics = knowledgeGraph.getAnalytics('tenant1');
      expect(emptyAnalytics.entityCount).toBe(0);
      expect(emptyAnalytics.relationCount).toBe(0);
      expect(emptyAnalytics.avgRelationsPerEntity).toBe(0);
      
      // Test with complex multi-tenant scenario
      const entities: string[] = [];
      
      // Create entities across different tenants
      for (let tenant = 1; tenant <= 2; tenant++) {
        for (let i = 1; i <= 3; i++) {
          const entityId = await knowledgeGraph.addEntity(
            `ComplexEntity${i}`,
            'complexType',
            { tenant: `tenant${tenant}`, value: i * tenant },
            `tenant${tenant}`
          );
          entities.push(entityId);
        }
      }
      
      // Create some relations
      for (let i = 0; i < entities.length - 1; i++) {
        await knowledgeGraph.addRelation(
          entities[i],
          entities[i + 1],
          'complexRelation',
          { order: i },
          0.5 + (i * 0.1),
          0.8,
          `tenant${(i % 2) + 1}`
        );
      }
      
      // Test tenant-specific analytics
      const tenant1Analytics = knowledgeGraph.getAnalytics('tenant1');
      expect(tenant1Analytics.entityCount).toBe(3);
      expect(tenant1Analytics.relationCount).toBeGreaterThan(0);
    });
  });

  describe('Line-Specific Coverage Tests', () => {
    it('should cover lines 505-506 in graph operations', async () => {
      // Create entities and relations that will trigger specific code paths
      const entityA = await knowledgeGraph.addEntity(
        'EntityA',
        'typeA',
        { special: true },
        'tenant1'
      );
      
      const entityB = await knowledgeGraph.addEntity(
        'EntityB',
        'typeB',
        { special: false },
        'tenant1'
      );
      
      // Create relation
      await knowledgeGraph.addRelation(
        entityA,
        entityB,
        'specialRelation',
        { metadata: 'test' },
        1.0,
        1.0,
        'tenant1'
      );
      
      // Export and reimport to exercise specific import code paths
      const graphData = knowledgeGraph.exportGraph('tenant1');
      const newGraph = new KnowledgeGraph();
      await newGraph.importGraph(graphData);
      
      // Verify the import worked correctly
      expect(newGraph.getEntity(entityA)).toBeDefined();
      expect(newGraph.getEntity(entityB)).toBeDefined();
      
      const relations = newGraph.findRelations({
        relationTypes: ['specialRelation'],
        tenant_id: 'tenant1'
      });
      expect(relations).toHaveLength(1);
    });
  });
});

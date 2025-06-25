import {
  MemoryRelationship,
  MemoryRelationshipType,
  MemoryGraphQuery,
  MemoryGraphResult,
  EnhancedMemoryMetadata,
} from '../types/index.js';
import { logger } from '../utils/logger.js';

export interface IMemoryRelationshipManager {
  createRelationship(
    relationship: Omit<MemoryRelationship, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MemoryRelationship>;
  getRelationships(
    memoryId: string,
    tenantId: string
  ): Promise<MemoryRelationship[]>;
  deleteRelationship(
    relationshipId: string,
    tenantId: string
  ): Promise<boolean>;
  findRelatedMemories(
    memoryId: string,
    relationshipTypes: MemoryRelationshipType[],
    tenantId: string
  ): Promise<string[]>;
  buildMemoryGraph(query: MemoryGraphQuery): Promise<MemoryGraphResult>;
  suggestRelationships(
    memoryId: string,
    tenantId: string
  ): Promise<MemoryRelationship[]>;
}

export class MemoryRelationshipManager implements IMemoryRelationshipManager {
  private relationships: Map<string, MemoryRelationship[]> = new Map();

  constructor() {
    // Logger is already instantiated as singleton
  }
  async createRelationship(
    relationshipData: Omit<MemoryRelationship, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<MemoryRelationship> {
    const relationship: MemoryRelationship = {
      ...relationshipData,
      strength: relationshipData.strength ?? 1.0,
      isActive: relationshipData.isActive ?? true,
      id: `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store relationship for both source and target memories
    const sourceKey = `${relationship.sourceMemoryId}_${relationship.tenantId}`;
    const targetKey = `${relationship.targetMemoryId}_${relationship.tenantId}`;

    if (!this.relationships.has(sourceKey)) {
      this.relationships.set(sourceKey, []);
    }
    if (!this.relationships.has(targetKey)) {
      this.relationships.set(targetKey, []);
    }

    this.relationships.get(sourceKey)!.push(relationship);
    this.relationships.get(targetKey)!.push(relationship);

    logger.info('Created memory relationship', {
      relationshipId: relationship.id,
      type: relationship.relationshipType,
      sourceMemoryId: relationship.sourceMemoryId,
      targetMemoryId: relationship.targetMemoryId,
    });

    return relationship;
  }

  async getRelationships(
    memoryId: string,
    tenantId: string
  ): Promise<MemoryRelationship[]> {
    const key = `${memoryId}_${tenantId}`;
    return this.relationships.get(key) || [];
  }

  async deleteRelationship(
    relationshipId: string,
    tenantId: string
  ): Promise<boolean> {
    for (const [key, relationships] of this.relationships.entries()) {
      const index = relationships.findIndex(
        r => r.id === relationshipId && r.tenantId === tenantId
      );
      if (index !== -1) {
        relationships.splice(index, 1);
        logger.info('Deleted memory relationship', { relationshipId });
        return true;
      }
    }
    return false;
  }

  async findRelatedMemories(
    memoryId: string,
    relationshipTypes: MemoryRelationshipType[],
    tenantId: string
  ): Promise<string[]> {
    const relationships = await this.getRelationships(memoryId, tenantId);

    return relationships
      .filter(r => relationshipTypes.includes(r.relationshipType) && r.isActive)
      .map(r =>
        r.sourceMemoryId === memoryId ? r.targetMemoryId : r.sourceMemoryId
      );
  }
  async buildMemoryGraph(query: MemoryGraphQuery): Promise<MemoryGraphResult> {
    const visited = new Set<string>();
    const nodes: EnhancedMemoryMetadata[] = [];
    const edges: MemoryRelationship[] = [];
    const edgeIds = new Set<string>(); // Track unique edges
    const paths: string[][] = [];

    await this.traverseGraph(
      query.startMemoryId,
      query.tenantId,
      visited,
      nodes,
      edges,
      edgeIds,
      paths,
      0,
      query.maxDepth,
      query.relationshipTypes,
      query.includeInactive,
      [query.startMemoryId]
    );

    const statistics = {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      maxDepth: Math.max(...paths.map(p => p.length - 1), 0),
      averageConnectivity: nodes.length > 0 ? edges.length / nodes.length : 0,
    };

    return {
      nodes,
      edges,
      paths,
      statistics,
    };
  }

  private async traverseGraph(
    memoryId: string,
    tenantId: string,
    visited: Set<string>,
    nodes: EnhancedMemoryMetadata[],
    edges: MemoryRelationship[],
    edgeIds: Set<string>,
    paths: string[][],
    currentDepth: number,
    maxDepth: number,
    relationshipTypes?: MemoryRelationshipType[],
    includeInactive = false,
    currentPath: string[] = []
  ): Promise<void> {
    if (currentDepth >= maxDepth || visited.has(memoryId)) {
      if (currentPath.length > 1) {
        paths.push([...currentPath]);
      }
      return;
    }

    visited.add(memoryId);

    // Get relationships for current memory
    const relationships = await this.getRelationships(memoryId, tenantId);

    const filteredRelationships = relationships.filter(r => {
      if (!includeInactive && !r.isActive) return false;
      if (relationshipTypes && !relationshipTypes.includes(r.relationshipType))
        return false;
      return true;
    });

    // Add unique relationships to edges
    for (const relationship of filteredRelationships) {
      if (!edgeIds.has(relationship.id)) {
        edges.push(relationship);
        edgeIds.add(relationship.id);
      }
    }

    // Traverse connected memories
    for (const relationship of filteredRelationships) {
      const nextMemoryId =
        relationship.sourceMemoryId === memoryId
          ? relationship.targetMemoryId
          : relationship.sourceMemoryId;

      await this.traverseGraph(
        nextMemoryId,
        tenantId,
        visited,
        nodes,
        edges,
        edgeIds,
        paths,
        currentDepth + 1,
        maxDepth,
        relationshipTypes,
        includeInactive,
        [...currentPath, nextMemoryId]
      );
    }
  }

  async suggestRelationships(
    memoryId: string,
    tenantId: string
  ): Promise<MemoryRelationship[]> {
    // This would typically use AI/ML to suggest relationships
    // For now, return empty array as placeholder
    logger.info('Generating relationship suggestions', { memoryId, tenantId });

    // TODO: Implement AI-powered relationship suggestions
    // - Analyze memory content similarity
    // - Detect temporal relationships
    // - Identify complementary or conflicting information
    // - Suggest context-based relationships

    return [];
  }

  /**
   * Create hierarchical parent-child relationship
   */
  async createParentChildRelationship(
    parentId: string,
    childId: string,
    tenantId: string
  ): Promise<[MemoryRelationship, MemoryRelationship]> {
    const parentRel = await this.createRelationship({
      sourceMemoryId: parentId,
      targetMemoryId: childId,
      relationshipType: 'parent',
      tenantId,
      strength: 1.0,
      isActive: true,
    });

    const childRel = await this.createRelationship({
      sourceMemoryId: childId,
      targetMemoryId: parentId,
      relationshipType: 'child',
      tenantId,
      strength: 1.0,
      isActive: true,
    });

    return [parentRel, childRel];
  }

  /**
   * Create sibling relationship between memories
   */
  async createSiblingRelationship(
    memoryId1: string,
    memoryId2: string,
    tenantId: string
  ): Promise<[MemoryRelationship, MemoryRelationship]> {
    const rel1 = await this.createRelationship({
      sourceMemoryId: memoryId1,
      targetMemoryId: memoryId2,
      relationshipType: 'sibling',
      tenantId,
      strength: 1.0,
      isActive: true,
    });

    const rel2 = await this.createRelationship({
      sourceMemoryId: memoryId2,
      targetMemoryId: memoryId1,
      relationshipType: 'sibling',
      tenantId,
      strength: 1.0,
      isActive: true,
    });

    return [rel1, rel2];
  }
  /**
   * Get memory hierarchy (parents, children, siblings)
   */
  async getMemoryHierarchy(
    memoryId: string,
    tenantId: string
  ): Promise<{
    parents: string[];
    children: string[];
    siblings: string[];
  }> {
    const relationships = await this.getRelationships(memoryId, tenantId);

    const parents = relationships
      .filter(
        r => r.relationshipType === 'child' && r.sourceMemoryId === memoryId
      )
      .map(r => r.targetMemoryId);

    const children = relationships
      .filter(
        r => r.relationshipType === 'parent' && r.sourceMemoryId === memoryId
      )
      .map(r => r.targetMemoryId);

    const siblings = relationships
      .filter(
        r => r.relationshipType === 'sibling' && r.sourceMemoryId === memoryId
      )
      .map(r => r.targetMemoryId);

    return { parents, children, siblings };
  }
  /**
   * Find memory conflicts (memories that contradict each other)
   */
  async findMemoryConflicts(tenantId: string): Promise<MemoryRelationship[]> {
    const conflicts: MemoryRelationship[] = [];
    const seen = new Set<string>();

    for (const relationships of this.relationships.values()) {
      for (const relationship of relationships) {
        if (
          relationship.relationshipType === 'conflicts' &&
          relationship.tenantId === tenantId &&
          relationship.isActive &&
          !seen.has(relationship.id)
        ) {
          conflicts.push(relationship);
          seen.add(relationship.id);
        }
      }
    }

    return conflicts;
  }
  /**
   * Clean up orphaned relationships
   */
  async cleanupOrphanedRelationships(
    validMemoryIds: string[],
    tenantId: string
  ): Promise<number> {
    let cleanupCount = 0;
    const deletedRelationshipIds = new Set<string>();

    for (const [key, relationships] of this.relationships.entries()) {
      const updatedRelationships = relationships.filter(r => {
        if (r.tenantId !== tenantId) return true; // Keep other tenant's relationships

        const isValid =
          validMemoryIds.includes(r.sourceMemoryId) &&
          validMemoryIds.includes(r.targetMemoryId);

        if (!isValid && !deletedRelationshipIds.has(r.id)) {
          cleanupCount++;
          deletedRelationshipIds.add(r.id);
        }
        return isValid;
      });

      this.relationships.set(key, updatedRelationships);
    }

    logger.info('Cleaned up orphaned relationships', {
      count: cleanupCount,
      tenantId,
    });
    return cleanupCount;
  }
}

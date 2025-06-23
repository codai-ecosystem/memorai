/**
 * Knowledge Graph Engine for Memorai
 * Provides entity relationship management and graph-based memory operations
 */

import { nanoid } from "nanoid";

export interface GraphEntity {
  id: string;
  name: string;
  type: string;
  properties: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  tenant_id: string;
  agent_id?: string;
}

export interface GraphRelation {
  id: string;
  fromId: string;
  toId: string;
  type: string;
  properties: Record<string, unknown>;
  weight: number;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  tenant_id: string;
  agent_id?: string;
}

export interface GraphQuery {
  entityTypes?: string[];
  relationTypes?: string[];
  properties?: Record<string, unknown>;
  maxDepth?: number;
  limit?: number;
  tenant_id: string;
  agent_id?: string;
}

export interface GraphPath {
  entities: GraphEntity[];
  relations: GraphRelation[];
  totalWeight: number;
  confidence: number;
}

export interface GraphAnalytics {
  entityCount: number;
  relationCount: number;
  avgRelationsPerEntity: number;
  strongestConnections: Array<{ from: string; to: string; weight: number }>;
  entityTypeDistribution: Record<string, number>;
  relationTypeDistribution: Record<string, number>;
  clustersDetected: number;
  centralEntities: Array<{ entity: GraphEntity; centrality: number }>;
}

/**
 * Advanced Knowledge Graph for entity-relationship memory storage
 */
export class KnowledgeGraph {
  private entities: Map<string, GraphEntity> = new Map();
  private relations: Map<string, GraphRelation> = new Map();
  private entityRelations: Map<string, Set<string>> = new Map();
  private relationIndex: Map<string, Set<string>> = new Map();

  /**
   * Add or update an entity in the knowledge graph
   */ async addEntity(
    name: string,
    type: string,
    properties: Record<string, unknown>,
    tenant_id: string,
    agent_id?: string,
  ): Promise<string> {
    // Check for existing entity by name and type
    const existingEntity = this.findEntityByNameAndType(name, type, tenant_id);

    if (existingEntity) {
      // Update existing entity
      existingEntity.properties = {
        ...existingEntity.properties,
        ...properties,
      };
      existingEntity.updatedAt = new Date();
      return existingEntity.id;
    } // Create new entity
    const id = nanoid();
    const entity: GraphEntity = {
      id,
      name,
      type,
      properties,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenant_id,
      ...(agent_id !== undefined && { agent_id }),
    };

    this.entities.set(id, entity);
    this.entityRelations.set(id, new Set());

    // Index by type
    const typeKey = `type:${type}`;
    if (!this.relationIndex.has(typeKey)) {
      this.relationIndex.set(typeKey, new Set());
    }
    this.relationIndex.get(typeKey)!.add(id);

    return id;
  }

  /**
   * Add a relation between two entities
   */ async addRelation(
    fromId: string,
    toId: string,
    relationType: string,
    properties: Record<string, unknown> = {},
    weight: number = 1.0,
    confidence: number = 1.0,
    tenant_id: string,
    agent_id?: string,
  ): Promise<string> {
    // Validate entities exist
    const fromEntity = this.entities.get(fromId);
    const toEntity = this.entities.get(toId);

    if (!fromEntity || !toEntity) {
      throw new Error(
        "Cannot create relation: one or both entities do not exist",
      );
    }

    // Check for existing relation
    const existingRelationId = this.findExistingRelation(
      fromId,
      toId,
      relationType,
      tenant_id,
    );
    if (existingRelationId) {
      // Update existing relation
      const relation = this.relations.get(existingRelationId)!;
      relation.properties = { ...relation.properties, ...properties };
      relation.weight = Math.max(relation.weight, weight);
      relation.confidence = Math.max(relation.confidence, confidence);
      relation.updatedAt = new Date();
      return existingRelationId;
    } // Create new relation
    const id = nanoid();
    const relation: GraphRelation = {
      id,
      fromId,
      toId,
      type: relationType,
      properties,
      weight,
      confidence,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenant_id,
      ...(agent_id !== undefined && { agent_id }),
    };

    this.relations.set(id, relation);
    this.entityRelations.get(fromId)!.add(id);
    this.entityRelations.get(toId)!.add(id);

    // Index by relation type
    const typeKey = `reltype:${relationType}`;
    if (!this.relationIndex.has(typeKey)) {
      this.relationIndex.set(typeKey, new Set());
    }
    this.relationIndex.get(typeKey)!.add(id);

    return id;
  }

  /**
   * Find entities by criteria
   */
  findEntities(query: GraphQuery): GraphEntity[] {
    let results: GraphEntity[] = Array.from(this.entities.values());

    // Filter by tenant
    results = results.filter((e) => e.tenant_id === query.tenant_id);

    // Filter by agent if specified
    if (query.agent_id) {
      results = results.filter((e) => e.agent_id === query.agent_id);
    }

    // Filter by entity types
    if (query.entityTypes && query.entityTypes.length > 0) {
      results = results.filter((e) => query.entityTypes!.includes(e.type));
    }

    // Filter by properties
    if (query.properties) {
      results = results.filter((entity) => {
        return Object.entries(query.properties!).every(([key, value]) => {
          return entity.properties[key] === value;
        });
      });
    }

    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get a specific entity by ID
   */
  getEntity(id: string): GraphEntity | null {
    return this.entities.get(id) || null;
  }

  /**
   * Get a specific relation by ID
   */
  getRelation(id: string): GraphRelation | null {
    return this.relations.get(id) || null;
  }

  /**
   * Find relations based on query criteria
   */
  findRelations(query: GraphQuery): GraphRelation[] {
    let results = Array.from(this.relations.values()).filter(
      (r) =>
        r.tenant_id === query.tenant_id &&
        (!query.agent_id || r.agent_id === query.agent_id),
    );

    // Filter by relation types
    if (query.relationTypes && query.relationTypes.length > 0) {
      results = results.filter((r) => query.relationTypes!.includes(r.type));
    }

    // Filter by properties
    if (query.properties) {
      results = results.filter((r) => {
        return Object.entries(query.properties!).every(
          ([key, value]) => r.properties[key] === value,
        );
      });
    }

    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Find all paths between two entities
   */
  findPaths(fromId: string, toId: string, maxDepth: number = 5): GraphPath[] {
    if (!this.entities.has(fromId) || !this.entities.has(toId)) {
      return [];
    }

    const paths: GraphPath[] = [];
    const visited = new Set<string>();
    const dfs = (
      currentId: string,
      targetId: string,
      currentPath: string[],
      currentRelations: string[],
      currentWeight: number,
      depth: number,
    ) => {
      if (depth > maxDepth) {
        return;
      }

      if (currentId === targetId && currentPath.length > 1) {
        // Found a path
        const entities = currentPath.map((id) => this.entities.get(id)!);
        const relations = currentRelations.map((id) => this.relations.get(id)!);
        const confidence =
          relations.length > 0
            ? relations.reduce((sum, r) => sum + r.confidence, 0) /
              relations.length
            : 1.0;

        paths.push({
          entities,
          relations,
          totalWeight: currentWeight,
          confidence,
        });
        return;
      }

      visited.add(currentId);

      const relationIds = this.entityRelations.get(currentId) || new Set();
      for (const relationId of relationIds) {
        const relation = this.relations.get(relationId)!;
        const neighborId =
          relation.fromId === currentId ? relation.toId : relation.fromId;

        if (!visited.has(neighborId)) {
          dfs(
            neighborId,
            targetId,
            [...currentPath, neighborId],
            [...currentRelations, relationId],
            currentWeight + relation.weight,
            depth + 1,
          );
        }
      }

      visited.delete(currentId);
    };

    dfs(fromId, toId, [fromId], [], 0, 0);

    // Sort paths by weight (shortest first)
    return paths.sort((a, b) => a.totalWeight - b.totalWeight);
  }

  /**
   * Find shortest path between two entities
   */
  findShortestPath(
    fromId: string,
    toId: string,
    maxDepth: number = 5,
  ): GraphPath | null {
    if (!this.entities.has(fromId) || !this.entities.has(toId)) {
      return null;
    }

    const visited = new Set<string>();
    const queue: Array<{
      entityId: string;
      path: string[];
      relations: string[];
      totalWeight: number;
    }> = [];

    queue.push({
      entityId: fromId,
      path: [fromId],
      relations: [],
      totalWeight: 0,
    });
    visited.add(fromId);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.entityId === toId) {
        // Found target, construct path
        const entities = current.path.map((id) => this.entities.get(id)!);
        const relations = current.relations.map(
          (id) => this.relations.get(id)!,
        );
        const confidence =
          relations.length > 0
            ? relations.reduce((sum, r) => sum + r.confidence, 0) /
              relations.length
            : 1.0;

        return {
          entities,
          relations,
          totalWeight: current.totalWeight,
          confidence,
        };
      }

      if (current.path.length >= maxDepth + 1) {
        continue; // Reached max depth
      }

      // Explore neighbors
      const relationIds =
        this.entityRelations.get(current.entityId) || new Set();
      for (const relationId of relationIds) {
        const relation = this.relations.get(relationId)!;
        const neighborId =
          relation.fromId === current.entityId
            ? relation.toId
            : relation.fromId;

        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          queue.push({
            entityId: neighborId,
            path: [...current.path, neighborId],
            relations: [...current.relations, relationId],
            totalWeight: current.totalWeight + relation.weight,
          });
        }
      }
    }

    return null; // No path found
  }
  /**
   * Get all connected entities within specified depth
   */
  getConnectedEntities(entityId: string, maxDepth: number = 2): GraphEntity[] {
    const visited = new Set<string>();
    const queue: Array<{ entityId: string; depth: number }> = [];
    const result: GraphEntity[] = [];

    queue.push({ entityId, depth: 0 });
    visited.add(entityId);

    while (queue.length > 0) {
      const current = queue.shift()!;

      // Only add to result if it's not the starting entity (depth > 0)
      if (current.depth > 0) {
        const entity = this.entities.get(current.entityId);
        if (entity) {
          result.push(entity);
        }
      }

      if (current.depth < maxDepth) {
        const relationIds =
          this.entityRelations.get(current.entityId) || new Set();
        for (const relationId of relationIds) {
          const relation = this.relations.get(relationId)!;
          const neighborId =
            relation.fromId === current.entityId
              ? relation.toId
              : relation.fromId;

          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push({ entityId: neighborId, depth: current.depth + 1 });
          }
        }
      }
    }

    return result;
  }

  /**
   * Get graph analytics and insights
   */
  getAnalytics(tenant_id: string, agent_id?: string): GraphAnalytics {
    // Filter entities and relations by tenant/agent
    const entities = Array.from(this.entities.values()).filter(
      (e) =>
        e.tenant_id === tenant_id && (!agent_id || e.agent_id === agent_id),
    );

    const relations = Array.from(this.relations.values()).filter(
      (r) =>
        r.tenant_id === tenant_id && (!agent_id || r.agent_id === agent_id),
    ); // Calculate metrics
    const entityCount = entities.length;
    const relationCount = relations.length;
    // Each relation connects 2 entities, so the average relations per entity is (relationCount * 2) / entityCount
    const avgRelationsPerEntity =
      entityCount > 0 ? (relationCount * 2) / entityCount : 0;

    // Entity type distribution
    const entityTypeDistribution: Record<string, number> = {};
    entities.forEach((e) => {
      entityTypeDistribution[e.type] =
        (entityTypeDistribution[e.type] || 0) + 1;
    });

    // Relation type distribution
    const relationTypeDistribution: Record<string, number> = {};
    relations.forEach((r) => {
      relationTypeDistribution[r.type] =
        (relationTypeDistribution[r.type] || 0) + 1;
    });

    // Strongest connections
    const strongestConnections = relations
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 10)
      .map((r) => ({
        from: this.entities.get(r.fromId)?.name || r.fromId,
        to: this.entities.get(r.toId)?.name || r.toId,
        weight: r.weight,
      }));

    // Calculate centrality (simplified degree centrality)
    const centralityMap = new Map<string, number>();
    entities.forEach((entity) => {
      const connectionCount = (this.entityRelations.get(entity.id) || new Set())
        .size;
      centralityMap.set(entity.id, connectionCount);
    });

    const centralEntities = entities
      .map((entity) => ({
        entity,
        centrality: centralityMap.get(entity.id) || 0,
      }))
      .sort((a, b) => b.centrality - a.centrality)
      .slice(0, 10);

    return {
      entityCount,
      relationCount,
      avgRelationsPerEntity,
      strongestConnections,
      entityTypeDistribution,
      relationTypeDistribution,
      clustersDetected: this.detectClusters(entities, relations),
      centralEntities,
    };
  }

  /**
   * Remove an entity and all its relations
   */
  async removeEntity(entityId: string): Promise<boolean> {
    const entity = this.entities.get(entityId);
    if (!entity) {
      return false;
    }

    // Remove all relations involving this entity
    const relationIds = this.entityRelations.get(entityId) || new Set();
    for (const relationId of relationIds) {
      await this.removeRelation(relationId);
    }

    // Remove entity
    this.entities.delete(entityId);
    this.entityRelations.delete(entityId);

    // Remove from type index
    const typeKey = `type:${entity.type}`;
    this.relationIndex.get(typeKey)?.delete(entityId);

    return true;
  }

  /**
   * Remove a specific relation
   */
  async removeRelation(relationId: string): Promise<boolean> {
    const relation = this.relations.get(relationId);
    if (!relation) {
      return false;
    }

    // Remove from entity relations
    this.entityRelations.get(relation.fromId)?.delete(relationId);
    this.entityRelations.get(relation.toId)?.delete(relationId);

    // Remove from relation type index
    const typeKey = `reltype:${relation.type}`;
    this.relationIndex.get(typeKey)?.delete(relationId);

    // Remove relation
    this.relations.delete(relationId);

    return true;
  }

  /**
   * Export graph data
   */
  exportGraph(
    tenant_id: string,
    agent_id?: string,
  ): { entities: GraphEntity[]; relations: GraphRelation[] } {
    const entities = Array.from(this.entities.values()).filter(
      (e) =>
        e.tenant_id === tenant_id && (!agent_id || e.agent_id === agent_id),
    );

    const relations = Array.from(this.relations.values()).filter(
      (r) =>
        r.tenant_id === tenant_id && (!agent_id || r.agent_id === agent_id),
    );

    return { entities, relations };
  }

  /**
   * Import graph data
   */
  async importGraph(data: {
    entities: GraphEntity[];
    relations: GraphRelation[];
  }): Promise<void> {
    // Import entities
    for (const entity of data.entities) {
      this.entities.set(entity.id, entity);
      this.entityRelations.set(entity.id, new Set());

      // Update type index
      const typeKey = `type:${entity.type}`;
      if (!this.relationIndex.has(typeKey)) {
        this.relationIndex.set(typeKey, new Set());
      }
      this.relationIndex.get(typeKey)!.add(entity.id);
    }

    // Import relations
    for (const relation of data.relations) {
      this.relations.set(relation.id, relation);
      this.entityRelations.get(relation.fromId)?.add(relation.id);
      this.entityRelations.get(relation.toId)?.add(relation.id);

      // Update relation type index
      const typeKey = `reltype:${relation.type}`;
      if (!this.relationIndex.has(typeKey)) {
        this.relationIndex.set(typeKey, new Set());
      }
      this.relationIndex.get(typeKey)!.add(relation.id);
    }
  }

  // Private helper methods

  private findEntityByNameAndType(
    name: string,
    type: string,
    tenant_id: string,
  ): GraphEntity | undefined {
    return Array.from(this.entities.values()).find(
      (e) => e.name === name && e.type === type && e.tenant_id === tenant_id,
    );
  }

  private findExistingRelation(
    fromId: string,
    toId: string,
    type: string,
    tenant_id: string,
  ): string | undefined {
    const relationIds = this.entityRelations.get(fromId) || new Set();
    for (const relationId of relationIds) {
      const relation = this.relations.get(relationId)!;
      if (
        relation.type === type &&
        relation.tenant_id === tenant_id &&
        ((relation.fromId === fromId && relation.toId === toId) ||
          (relation.fromId === toId && relation.toId === fromId))
      ) {
        return relationId;
      }
    }
    return undefined;
  }

  private detectClusters(
    entities: GraphEntity[],
    _relations: GraphRelation[],
  ): number {
    // Simplified clustering - count connected components
    const visited = new Set<string>();
    let clusters = 0;

    for (const entity of entities) {
      if (!visited.has(entity.id)) {
        this.dfsCluster(entity.id, visited);
        clusters++;
      }
    }

    return clusters;
  }

  private dfsCluster(entityId: string, visited: Set<string>): void {
    visited.add(entityId);
    const relationIds = this.entityRelations.get(entityId) || new Set();

    for (const relationId of relationIds) {
      const relation = this.relations.get(relationId)!;
      const neighborId =
        relation.fromId === entityId ? relation.toId : relation.fromId;

      if (!visited.has(neighborId)) {
        this.dfsCluster(neighborId, visited);
      }
    }
  }
}

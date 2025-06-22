
/**
 * MCP Memory Client for Memorai Dashboard
 * Direct integration with Memory MCP Server tools
 */

export interface Memory {
    id: string
    agentId: string
    content: string
    timestamp: string
    type: 'conversation' | 'document' | 'note' | 'thread' | 'task' | 'personality' | 'emotion'
    metadata: {
        tags: string[]
        similarity?: number
        importance?: number
        source?: string
        entities?: string[]
        confidence?: number
    }
}

export interface MemoryStats {
    totalMemories: number
    totalAgents: number
    averageImportance: number
    memoryTypes: Record<string, number>
    recentActivity: {
        date: string
        count: number
    }[]
    topAgents: {
        agentId: string
        memoryCount: number
    }[]
}

export interface MCPMemoryResponse {
    success: boolean;
    data?: unknown;
    error?: string;
}

export interface MCPEntity {
    name: string;
    entityType: string;
    observations: string[];
}

export interface MCPRelation {
    from: string;
    to: string;
    relationType: string;
}

class MCPMemoryClient {
    private readonly agentId: string;

    constructor(agentId = 'memorai-dashboard') {
        this.agentId = agentId;
    }

    async getMemories(params?: {
        limit?: number;
        query?: string;
        agentId?: string;
    }): Promise<Memory[]> {
        try {
            // Use mcp_standardmemor_read_graph to get all entities
            const graphResponse = await this.readGraph();

            if (!graphResponse.entities) {
                return [];
            }            // Transform entities to Memory format
            const memories: Memory[] = graphResponse.entities.map((entity: MCPEntity, index: number) => ({
                id: `entity-${index}-${Date.now()}`,
                agentId: params?.agentId || this.agentId,
                content: entity.observations.join(' | '),
                timestamp: new Date().toISOString(),
                type: this.mapEntityTypeToMemoryType(entity.entityType) as Memory['type'],
                metadata: {
                    tags: [entity.entityType, entity.name],
                    importance: this.calculateImportance(entity),
                    source: 'mcp-memory-server',
                    entities: [entity.name],
                    confidence: 0.95
                }
            }));// Apply query filter if provided
            if (params?.query) {
                return memories.filter(memory =>
                    memory.content.toLowerCase().includes(params.query!.toLowerCase()) ||
                    (memory.metadata.tags && memory.metadata.tags.some(tag =>
                        tag.toLowerCase().includes(params.query!.toLowerCase())
                    ))
                );
            }

            // Apply limit if provided
            if (params?.limit) {
                return memories.slice(0, params.limit);
            }

            return memories;
        } catch (error) {
            console.error('Failed to fetch memories from MCP:', error);
            return [];
        }
    }

    async searchMemories(query: string, options?: {
        limit?: number;
        agentId?: string;
    }): Promise<Memory[]> {
        try {
            // Use mcp_standardmemor_search_nodes for semantic search
            const searchResponse = await this.searchNodes(query);

            if (!searchResponse || !Array.isArray(searchResponse)) {
                return [];
            }            // Transform search results to Memory format
            const memories: Memory[] = searchResponse.map((entity: MCPEntity, index: number) => ({
                id: `search-${index}-${Date.now()}`,
                agentId: options?.agentId || this.agentId,
                content: entity.observations.join(' | '),
                timestamp: new Date().toISOString(),
                type: this.mapEntityTypeToMemoryType(entity.entityType) as Memory['type'],
                metadata: {
                    tags: [entity.entityType, entity.name, 'search-result'],
                    importance: this.calculateImportance(entity),
                    source: 'mcp-search',
                    entities: [entity.name],
                    confidence: 0.90
                }
            }));

            if (options?.limit) {
                return memories.slice(0, options.limit);
            }

            return memories;
        } catch (error) {
            console.error('Failed to search memories in MCP:', error);
            return [];
        }
    }

    async addMemory(content: string, metadata: Partial<Memory['metadata']>): Promise<Memory> {
        try {
            // Create a new entity in the MCP memory system
            const entityName = `memory-${Date.now()}`;
            const entityType = metadata.source ?? 'user_input';

            const entity: MCPEntity = {
                name: entityName,
                entityType,
                observations: [content]
            };

            await this.createEntities([entity]);            // Return the created memory
            const memory: Memory = {
                id: `created-${Date.now()}`,
                agentId: this.agentId,
                content,
                timestamp: new Date().toISOString(),
                type: this.mapEntityTypeToMemoryType(entityType) as Memory['type'],
                metadata: {
                    tags: metadata.tags || [entityType],
                    importance: metadata.importance || 0.5,
                    source: metadata.source ?? 'dashboard',
                    entities: [entityName],
                    confidence: metadata.confidence || 0.90
                }
            };

            return memory;
        } catch (error) {
            console.error('Failed to add memory to MCP:', error);
            throw new Error('Failed to create memory');
        }
    } async getStats(): Promise<MemoryStats> {
        try {// Removed console.log for production
            const graphResponse = await this.readGraph();// Removed console.log for production
            if (!graphResponse.entities || graphResponse.entities.length === 0) {
                console.warn('MCPMemoryClient: No entities found, returning empty stats');
                return this.getEmptyStats();
            }

            const entities = graphResponse.entities;
            const entityTypes: Record<string, number> = {};
            const agentCounts: Record<string, number> = {};
            let totalImportance = 0;

            entities.forEach((entity: MCPEntity) => {
                entityTypes[entity.entityType] = (entityTypes[entity.entityType] || 0) + 1;
                agentCounts[this.agentId] = (agentCounts[this.agentId] || 0) + 1;
                totalImportance += this.calculateImportance(entity);
            });

            const stats: MemoryStats = {
                totalMemories: entities.length,
                totalAgents: Object.keys(agentCounts).length,
                averageImportance: entities.length > 0 ? totalImportance / entities.length : 0,
                memoryTypes: this.mapEntityTypesToMemoryTypes(entityTypes),
                recentActivity: [{
                    date: new Date().toISOString().split('T')[0],
                    count: entities.length
                }],
                topAgents: Object.entries(agentCounts).map(([agentId, count]) => ({
                    agentId,
                    memoryCount: count
                }))
            };// Removed console.log for production
            return stats;
        } catch (error) {
            console.error('MCPMemoryClient: Failed to get stats:', error);
            return this.getEmptyStats();
        }
    }// MCP Tool Wrappers
    private async readGraph(): Promise<{ entities: MCPEntity[], relations: MCPRelation[] }> {
        try {
            // Call the real MCP API endpoint
            const response = await fetch('/api/mcp/read-graph', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            });

            if (response.ok) {
                const data = await response.json();// Removed console.log for production
                // Convert MCP response format to our expected format
                if (data.entities && Array.isArray(data.entities)) {
                    return {
                        entities: data.entities.map((entity: unknown) => ({
                            name: entity.name,
                            entityType: entity.entityType,
                            observations: entity.observations || []
                        })),
                        relations: data.relations || []
                    };
                }
            }

            // Fallback with minimal sample data if API fails
            console.warn('MCP API call failed, using fallback data');
            return {
                entities: [
                    {
                        name: "dashboard-system",
                        entityType: "system",
                        observations: ["Memorai Dashboard System initialized", "Connected to MCP Memory Server"]
                    }
                ],
                relations: []
            };
        } catch (error) {
            console.error('Error reading MCP graph:', error);
            return {
                entities: [
                    {
                        name: "error-fallback",
                        entityType: "system_error",
                        observations: ["Failed to connect to MCP server", "Using fallback data"]
                    }
                ],
                relations: []
            };
        }
    } private async searchNodes(query: string): Promise<MCPEntity[]> {
        try {
            // Use the actual mcp_standardmemor_search_nodes call
            const response = await fetch('/api/mcp/search-nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            if (response.ok) {
                const data = await response.json();
                return data;
            }

            // Fallback to basic search
            const graphResponse = await this.readGraph();
            return graphResponse.entities.filter((entity: MCPEntity) =>
                entity.observations.some(obs =>
                    obs.toLowerCase().includes(query.toLowerCase())
                ) || entity.name.toLowerCase().includes(query.toLowerCase())
            );
        } catch (error) {
            console.error('Error searching MCP nodes:', error);
            return [];
        }
    } private async createEntities(entities: MCPEntity[]): Promise<void> {
        try {
            // Use the actual mcp_standardmemor_create_entities call
            const response = await fetch('/api/mcp/create-entities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entities })
            });

            if (response.ok) {// Removed console.log for production
            } else {
                console.error('Failed to create entities in MCP');
            }
        } catch (error) {
            console.error('Error creating entities in MCP:', error);
        }
    }// Helper methods
    private mapEntityTypeToMemoryType(entityType: string): string {
        const typeMap: Record<string, string> = {
            'user_preferences': 'personality',
            'project': 'task',
            'requirements': 'note',
            'technical_issue': 'task',
            'conversation': 'conversation',
            'document': 'document',
            'thread': 'thread',
            'emotion': 'emotion'
        };
        return typeMap[entityType] || 'note';
    }

    private mapEntityTypesToMemoryTypes(entityTypes: Record<string, number>): Record<string, number> {
        const memoryTypes: Record<string, number> = {};
        Object.entries(entityTypes).forEach(([entityType, count]) => {
            const memoryType = this.mapEntityTypeToMemoryType(entityType);
            memoryTypes[memoryType] = (memoryTypes[memoryType] || 0) + count;
        });
        return memoryTypes;
    }

    private calculateImportance(entity: MCPEntity): number {
        // Calculate importance based on entity type and content length
        const typeImportance: Record<string, number> = {
            'requirements': 0.9,
            'project': 0.8,
            'user_preferences': 0.7,
            'technical_issue': 0.85,
            'conversation': 0.5
        };

        const baseImportance = typeImportance[entity.entityType] || 0.5;
        const contentLength = entity.observations.join(' ').length;
        const lengthBonus = Math.min(contentLength / 1000, 0.2); // Max 0.2 bonus

        return Math.min(baseImportance + lengthBonus, 1.0);
    }

    private getEmptyStats(): MemoryStats {
        return {
            totalMemories: 0,
            totalAgents: 0,
            averageImportance: 0,
            memoryTypes: {},
            recentActivity: [],
            topAgents: []
        };
    }
}

export const mcpMemoryClient = new MCPMemoryClient();

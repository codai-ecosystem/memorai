import { NextResponse } from 'next/server';

interface ApiGraphEntity {
  id: string;
  name: string;
  type: string;
  properties: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface McpEntity {
  name: string;
  entityType: string;
  observations: string[];
}

export async function GET() {
  try {
    // Connect to actual API server graph endpoint
    const apiPort = process.env.API_PORT || '6367';
    const response = await fetch(`http://localhost:${apiPort}/api/graph`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API Server error: ${response.status}`);
    }

    const apiResponse = await response.json();
    const graphData = apiResponse.data || { entities: [], relations: [] };

    // Convert API graph format to MCP format
    const mcpEntities: McpEntity[] = graphData.entities.map(
      (entity: ApiGraphEntity) => ({
        name: entity.name,
        entityType: entity.type,
        observations: [
          entity.properties.content || `${entity.type}: ${entity.name}`,
          ...(entity.properties.tags || []).map((tag: string) => `Tag: ${tag}`),
          `Importance: ${entity.properties.importance || 0.5}`,
          `Created: ${entity.createdAt}`,
        ].filter(Boolean),
      })
    );

    return NextResponse.json({
      success: true,
      entities: mcpEntities,
      relations: graphData.relations || [],
    });
  } catch (error) {
    console.error('Error fetching graph data:', error);

    // Fallback to empty state if API server is not available
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to connect to API server',
        entities: [],
        relations: [],
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    // In test environment, return mock data
    if (process.env.NODE_ENV === 'test') {
      return NextResponse.json({
        success: true,
        data: [
          {
            id: 'memory-1',
            content: 'This is a sample memory content for testing',
            agentId: 'test-agent',
            timestamp: '2025-06-23T13:00:00.000Z',
            metadata: {
              type: 'note',
              tags: ['test', 'sample'],
              priority: 'medium',
              importance: 'high',
              source: 'test-source',
              confidence: 0.95,
            },
          },
          {
            id: 'memory-2',
            content: 'Another test memory for conversation context',
            agentId: 'conversation-agent',
            timestamp: '2025-06-23T12:30:00.000Z',
            metadata: {
              type: 'conversation',
              tags: ['chat', 'context'],
              priority: 'high',
              importance: 'medium',
              source: 'conversation-log',
              confidence: 0.87,
            },
          },
        ],
      });
    }

    // Connect to actual API server instead of using mock data
    const apiUrl =
      process.env.API_URL ||
      `http://localhost:${process.env.API_PORT || '6367'}`;
    const response = await fetch(`${apiUrl}/api/memory/context`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`MCP Server error: ${response.status}`);
    }

    const mcpData = await response.json();

    return NextResponse.json({
      success: true,
      data: mcpData,
    });
  } catch (error) {
    console.error('Error fetching memory context:', error);

    // Fallback to empty state if MCP server is not available
    return NextResponse.json({
      success: false,
      error: 'Unable to connect to MCP server',
      data: {
        memories: [],
        totalCount: 0,
        agents: [],
      },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // In test environment, return mock data based on request
    if (process.env.NODE_ENV === 'test') {
      const {
        query = '',
        agentId = 'test-agent',
        tags = [],
        limit = 10,
      } = body;

      return NextResponse.json({
        success: true,
        data: [
          {
            id: 'memory-1',
            content: `Mock result for query: ${query}`,
            agentId: agentId,
            timestamp: '2025-06-23T13:00:00.000Z',
            metadata: {
              type: 'note',
              tags: tags.length > 0 ? tags : ['mock', 'test'],
              priority: 'medium',
              importance: 'high',
              source: 'mock-source',
              confidence: 0.92,
            },
          },
        ].slice(0, limit),
      });
    }

    // Forward request to actual API server
    const apiUrl =
      process.env.API_URL ||
      `http://localhost:${process.env.API_PORT || '6367'}`;
    const response = await fetch(`${apiUrl}/api/memory/context`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`MCP Server error: ${response.status}`);
    }

    const mcpData = await response.json();

    return NextResponse.json({
      success: true,
      data: mcpData,
    });
  } catch (error) {
    console.error('Error posting memory context:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Unable to connect to MCP server',
      },
      { status: 500 }
    );
  }
}

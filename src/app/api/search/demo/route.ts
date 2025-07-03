import { NextRequest, NextResponse } from 'next/server';

// Demo endpoint without authentication for testing purposes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 10, filters = {} } = body;

    if (!query) {
      return NextResponse.json(
        { message: 'Search query is required' },
        { status: 400 }
      );
    }

    // Mock semantic search results
    const mockResults = [
      {
        id: 'memory-1',
        content:
          'AI development meeting notes from yesterday - discussed neural networks and transformer architectures',
        similarity: 0.95,
        metadata: {
          created: '2025-07-02T14:30:00Z',
          tags: ['ai', 'development', 'meeting', 'neural-networks'],
          userId: 'demo-user',
        },
      },
      {
        id: 'memory-2',
        content:
          'Research on memory management patterns in distributed systems',
        similarity: 0.87,
        metadata: {
          created: '2025-07-01T10:15:00Z',
          tags: ['research', 'memory', 'patterns', 'distributed'],
          userId: 'demo-user',
        },
      },
      {
        id: 'memory-3',
        content: 'Notes about semantic search algorithms and vector embeddings',
        similarity: 0.82,
        metadata: {
          created: '2025-06-30T16:45:00Z',
          tags: ['algorithms', 'search', 'semantic', 'embeddings'],
          userId: 'demo-user',
        },
      },
      {
        id: 'memory-4',
        content: 'Implementation details for enterprise-grade memory systems',
        similarity: 0.78,
        metadata: {
          created: '2025-06-29T09:20:00Z',
          tags: ['enterprise', 'implementation', 'memory-systems'],
          userId: 'demo-user',
        },
      },
    ];

    const filteredResults = mockResults.slice(0, limit);

    const response = {
      success: true,
      query,
      results: filteredResults,
      totalResults: mockResults.length,
      returned: filteredResults.length,
      processingTime: '32ms',
      timestamp: new Date().toISOString(),
      metadata: {
        searchType: 'semantic',
        model: 'semantic-search-v1',
        vectorDimensions: 1536,
        indexSize: '10,247 memories',
        version: 'demo',
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Demo semantic search error:', error);
    return NextResponse.json(
      {
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/search/demo',
    description: 'Demo semantic search endpoint (no auth required)',
    usage: "POST with JSON body: { query: 'search terms', limit?: 10 }",
    example: {
      input: { query: 'AI development', limit: 5 },
      output: 'Array of semantically similar memories',
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Connect to actual API server instead of using mock data
    const apiPort = process.env.API_PORT || '6367';
    const response = await fetch(
      `http://localhost:${apiPort}/api/memory/remember`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId: body.agentId || 'dashboard',
          content: body.content || '',
          metadata: body.metadata || {}
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API Server error: ${response.status}`);
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Memory remember API error:', error);
    
    // Get body for fallback
    let body;
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    
    // Fallback to local storage if API server is not available
    return NextResponse.json(
      { 
        success: false,
        error: 'Unable to connect to API server',
        fallback: {
          id: Date.now().toString(),
          agentId: body?.agentId ?? 'default',
          content: body?.content || '',
          metadata: body?.metadata || {},
          timestamp: new Date().toISOString(),
        }
      },
      { status: 500 }
    );
  }
}

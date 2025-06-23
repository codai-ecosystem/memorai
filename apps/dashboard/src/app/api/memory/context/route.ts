import { NextResponse, NextRequest } from "next/server";

export async function GET() {
  try {
    // Connect to actual MCP server instead of using mock data
    const response = await fetch("http://localhost:6367/api/memory/context", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
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
    console.error("Error fetching memory context:", error);

    // Fallback to empty state if MCP server is not available
    return NextResponse.json({
      success: false,
      error: "Unable to connect to MCP server",
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

    // Forward request to actual MCP server
    const response = await fetch("http://localhost:6367/api/memory/context", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
    console.error("Error posting memory context:", error);

    return NextResponse.json({
      success: false,
      error: "Unable to connect to MCP server",
    }, { status: 500 });
  }
}

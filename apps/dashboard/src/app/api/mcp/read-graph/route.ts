import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Connect to actual MCP server API
    const response = await fetch("http://localhost:6367/api/memory", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API Server error: ${response.status}`);
    }

    const apiData = await response.json();

    return NextResponse.json({
      success: true,
      data: apiData,
    });
  } catch (error) {
    console.error("Error fetching MCP data:", error);

    // Fallback to empty state if API server is not available
    return NextResponse.json({
      success: false,
      error: "Unable to connect to API server",
      data: {
        entities: [],
        relations: [],
      },
    }, { status: 500 });
  }
}

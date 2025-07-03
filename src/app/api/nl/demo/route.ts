import { NextRequest, NextResponse } from "next/server";

// Demo endpoint without authentication for testing purposes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, userId } = body;

    if (!message) {
      return NextResponse.json(
        { message: "Message is required" },
        { status: 400 }
      );
    }

    // Mock natural language processing response
    const mockResponse = {
      success: true,
      response: `🧠 Processed: "${message}"`,
      intent: "general_query",
      confidence: 0.95,
      entities: [
        { type: "topic", value: "AI development", confidence: 0.9 },
        { type: "timeframe", value: "today", confidence: 0.8 }
      ],
      suggestions: [
        "Try asking about your memories",
        "Ask me to create a new memory", 
        "Search for specific topics"
      ],
      sessionId: sessionId || `demo-session-${Date.now()}`,
      timestamp: new Date().toISOString(),
      metadata: {
        processingTime: "45ms",
        model: "natural-language-v1",
        version: "demo"
      }
    };

    return NextResponse.json(mockResponse);

  } catch (error) {
    console.error("Demo NL processing error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/nl/demo",
    description: "Demo natural language processing endpoint (no auth required)",
    usage: "POST with JSON body: { message: 'your message here' }",
    example: {
      input: { message: "Find memories about AI development" },
      output: "Structured NL processing response"
    }
  });
}

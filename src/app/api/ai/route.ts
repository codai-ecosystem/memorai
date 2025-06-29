import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { message, model = "gpt-3.5-turbo", maxTokens = 150 } = body;

    if (!message) {
      return NextResponse.json(
        { message: "Message is required" },
        { status: 400 }
      );
    }

    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "You are a helpful AI assistant integrated into the Memorai ecosystem."
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    const response = completion.choices[0]?.message?.content || "No response generated";

    return NextResponse.json({
      response,
      model,
      usage: completion.usage,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("AI API error:", error);
    
    if (error.status === 401) {
      return NextResponse.json(
        { message: "Invalid API key" },
        { status: 401 }
      );
    }
    
    if (error.status === 429) {
      return NextResponse.json(
        { message: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { message: "AI service error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Return available AI models and capabilities
    return NextResponse.json({
      models: [
        "gpt-3.5-turbo",
        "gpt-4",
        "gpt-4-turbo"
      ],
      capabilities: [
        "text-completion",
        "code-generation",
        "analysis",
        "translation"
      ],
      limits: {
        maxTokens: 4000,
        requestsPerMinute: 60
      }
    });

  } catch (error) {
    console.error("AI info error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

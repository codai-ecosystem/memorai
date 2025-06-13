import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Mock stats response
        const mockStats = {
            totalMemories: 42,
            activeAgents: 3,
            memoryOperations: 156,
            recentActivity: [
                {
                    type: "memory_created",
                    timestamp: new Date(Date.now() - 300000).toISOString(),
                    agent: "test-agent",
                    content: "Sample memory created for testing"
                },
                {
                    type: "memory_searched",
                    timestamp: new Date(Date.now() - 600000).toISOString(),
                    agent: "dashboard-agent",
                    content: "User searched for memories"
                },
                {
                    type: "agent_registered",
                    timestamp: new Date(Date.now() - 900000).toISOString(),
                    agent: "new-agent",
                    content: "New agent registered in system"
                }
            ],
            memoryDistribution: [
                { type: "user_memory", count: 25 },
                { type: "system_memory", count: 12 },
                { type: "context_memory", count: 5 }
            ],
            performanceMetrics: {
                averageResponseTime: 145,
                successRate: 98.5,
                errorRate: 1.5
            }
        };

        return NextResponse.json({ data: mockStats, success: true });
    } catch (error) {
        console.error('Stats API error:', error); return NextResponse.json(
            { error: 'Failed to fetch statistics', success: false },
            { status: 500 }
        );
    }
}

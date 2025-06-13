import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Mock config response with the structure expected by the frontend
        const mockConfig = {
            version: "2.0.0",
            environment: "development",
            features: {
                memoryStorage: true,
                vectorSearch: true,
                agentTracking: true,
                realTimeUpdates: true
            },
            settings: {
                maxMemories: 10000,
                retentionDays: 365,
                enableEmbeddings: true,
                enableCache: true
            }, endpoints: {
                api: "http://localhost:6367/api",
                websocket: "ws://localhost:6367"
            },
            security: {
                maxRequestsPerMinute: 1000,
                encryptionEnabled: false,
                authRequired: false
            },
            providers: {
                embedding: "mock",
                storage: "mock"
            }
        };

        return NextResponse.json({ data: mockConfig, success: true });
    } catch (error) {
        console.error('Config API error:', error); return NextResponse.json(
            { error: 'Failed to fetch configuration', success: false },
            { status: 500 }
        );
    }
}

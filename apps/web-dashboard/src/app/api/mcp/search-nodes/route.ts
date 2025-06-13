import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { query } = await request.json();
        
        if (!query) {
            return NextResponse.json(
                { error: 'Query parameter is required' },
                { status: 400 }
            );
        }

        // Mock search functionality - filter entities based on query
        const allEntities = [
            {
                name: "dashboard-preferences",
                entityType: "user_preferences",
                observations: ["User prefers dark mode interfaces and minimal design patterns", "Mentioned liking VS Code Dark+ theme", "Values clean, professional UI design"]
            },
            {
                name: "memorai-dashboard-project",
                entityType: "project",
                observations: ["Working on Next.js 15 dashboard transformation project", "Using TypeScript and Tailwind CSS", "Implementing Playwright E2E tests for quality assurance", "Need 100% test completion for production readiness"]
            },
            {
                name: "quality-standards",
                entityType: "requirements",
                observations: ["Asked for 110% effort and perfection", "Values quality and attention to detail", "Requires comprehensive testing and validation", "Single source of truth for development and production data"]
            },
            {
                name: "mcp-testing-issues",
                entityType: "technical_issue",
                observations: ["Playwright test failures on WebKit and Mobile Safari", "DOM attachment issues with Add Memory button", "Pointer event interception problems", "Form validation selector issues"]
            }
        ];

        const searchResults = allEntities.filter(entity =>
            entity.observations.some(obs => 
                obs.toLowerCase().includes(query.toLowerCase())
            ) || entity.name.toLowerCase().includes(query.toLowerCase()) ||
            entity.entityType.toLowerCase().includes(query.toLowerCase())
        );

        return NextResponse.json(searchResults);
    } catch (error) {
        console.error('Error in search-nodes API:', error);
        return NextResponse.json(
            { error: 'Failed to search nodes' },
            { status: 500 }
        );
    }
}

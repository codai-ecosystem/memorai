import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { entities } = await request.json();

        if (!entities || !Array.isArray(entities)) {
            return NextResponse.json(
                { error: 'Entities array is required' },
                { status: 400 }
            );
        }

        // Log the entities being created
        console.log('Creating entities:', entities);

        // In a real implementation, this would call the MCP server
        // For now, we'll just acknowledge the creation
        return NextResponse.json({
            success: true,
            message: `Created ${entities.length} entities`,
            entities
        });
    } catch (error) {
        console.error('Error in create-entities API:', error);
        return NextResponse.json(
            { error: 'Failed to create entities' },
            { status: 500 }
        );
    }
}

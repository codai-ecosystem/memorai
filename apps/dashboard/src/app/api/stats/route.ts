import { NextResponse } from 'next/server';
import { enterpriseDataSource } from '../../../lib/enterprise-data-source';

export async function GET() {
    try {
        // Initialize enterprise data source if needed
        if (!enterpriseDataSource) {
            return NextResponse.json(
                { error: 'Enterprise data source not available', success: false },
                { status: 503 }
            );
        }

        // Get real-time stats from enterprise data source
        const realTimeStats = await enterpriseDataSource.getRealTimeStats();
        
        return NextResponse.json({ 
            data: {
                totalMemories: realTimeStats.totalMemories,
                activeAgents: realTimeStats.activeAgents,
                memoryOperations: realTimeStats.memoryOperations,
                uptime: realTimeStats.uptime,
                systemHealth: realTimeStats.systemHealth,
                memoryUsage: realTimeStats.memoryUsage,
                performanceMetrics: realTimeStats.performanceMetrics,
                recentActivity: realTimeStats.recentActivity.map(activity => ({
                    type: activity.type,
                    timestamp: activity.timestamp,
                    agent: activity.agent,
                    content: activity.content.length > 100 
                        ? activity.content.substring(0, 100) + '...' 
                        : activity.content
                })),
                memoryDistribution: realTimeStats.memoryDistribution
            }, 
            success: true,
            cached: false,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Stats API error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch statistics', success: false },
            { status: 500 }
        );
    }
}

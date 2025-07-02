import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Connect to actual API server stats endpoint
    const apiUrl =
      process.env.API_URL ||
      `http://localhost:${process.env.API_PORT || '6367'}`;
    const response = await fetch(`${apiUrl}/api/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API Server error: ${response.status}`);
    }

    const apiStats = await response.json();

    // Transform API stats to dashboard format
    const transformedStats = {
      totalMemories: apiStats.data?.engine?.totalMemories || 0,
      activeAgents: apiStats.data?.engine?.agents?.length || 0,
      memoryOperations: 0, // Not available yet
      uptime: apiStats.data?.system?.uptime || 0,
      systemHealth:
        apiStats.data?.engine?.memoryEngineStatus === 'operational'
          ? 'healthy'
          : 'degraded',
      memoryUsage: {
        used: apiStats.data?.system?.memoryUsage?.heapUsed || 0,
        total: apiStats.data?.system?.memoryUsage?.heapTotal || 0,
        percentage:
          apiStats.data?.system?.memoryUsage?.heapUsed &&
          apiStats.data?.system?.memoryUsage?.heapTotal
            ? (apiStats.data.system.memoryUsage.heapUsed /
                apiStats.data.system.memoryUsage.heapTotal) *
              100
            : 0,
      },
      performanceMetrics: {
        averageResponseTime: apiStats.data?.performance?.avgResponseTime || 0,
        successRate: 100 - (apiStats.data?.performance?.errorRate || 0),
        errorRate: apiStats.data?.performance?.errorRate || 0,
        throughput: apiStats.data?.performance?.requestsPerSecond || 0,
        p95ResponseTime: apiStats.data?.performance?.avgResponseTime || 0,
        p99ResponseTime: apiStats.data?.performance?.avgResponseTime || 0,
      },
      recentActivity: [
        {
          type: 'system_update',
          timestamp: new Date().toISOString(),
          agent: 'system',
          content: `Memory engine operational with ${apiStats.data?.engine?.totalMemories || 0} memories`,
        },
      ],
      memoryDistribution: [
        {
          type: 'production_memories',
          count: apiStats.data?.engine?.totalMemories || 0,
          percentage: 100,
        },
      ],
    };

    return NextResponse.json({
      data: transformedStats,
      success: true,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Dashboard stats API error:', error);

    // Fallback to basic stats if API server is unavailable
    return NextResponse.json({
      data: {
        totalMemories: 0,
        activeAgents: 0,
        memoryOperations: 0,
        uptime: 0,
        systemHealth: 'unknown',
        memoryUsage: { used: 0, total: 0, percentage: 0 },
        performanceMetrics: {
          averageResponseTime: 0,
          successRate: 0,
          errorRate: 100,
          throughput: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
        },
        recentActivity: [],
        memoryDistribution: [],
      },
      success: false,
      cached: false,
      timestamp: new Date().toISOString(),
      error: 'Unable to connect to API server',
    });
  }
}

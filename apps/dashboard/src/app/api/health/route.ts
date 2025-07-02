import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check if API server is reachable
    let apiStatus = 'unknown';
    let apiConnectionTime = 0;

    try {
      const apiStartTime = Date.now();
      const apiResponse = await fetch('http://localhost:6367/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Short timeout for health checks
        signal: AbortSignal.timeout(5000),
      });

      apiConnectionTime = Date.now() - apiStartTime;
      apiStatus = apiResponse.ok ? 'healthy' : 'unhealthy';
    } catch (error) {
      apiStatus = 'unreachable';
      console.error('API health check failed:', error);
    }

    const healthData = {
      status: 'healthy',
      service: 'memorai-dashboard',
      version: '2.0.55',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        api: {
          status: apiStatus,
          url: 'http://localhost:6367',
          responseTime: apiConnectionTime,
        },
      },
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        env: process.env.NODE_ENV || 'development',
      },
    };

    return NextResponse.json(healthData, { status: 200 });
  } catch (error) {
    console.error('Dashboard health check error:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        service: 'memorai-dashboard',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

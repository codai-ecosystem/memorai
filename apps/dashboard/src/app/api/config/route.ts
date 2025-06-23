import { NextResponse } from "next/server";

import { enterpriseDataSource } from "../../../lib/enterprise-data-source";

export async function GET() {
  try {
    // Get real configuration from enterprise data source
    const realConfig = await enterpriseDataSource.getSystemConfiguration();

    // Transform to API response format
    const configResponse = {
      version: "2.0.0",
      environment: process.env.NODE_ENV ?? "development",
      features: {
        memoryStorage: true,
        vectorSearch: realConfig.memory.enableEmbeddings,
        agentTracking: true,
        realTimeUpdates: true,
      },
      settings: {
        maxMemories: realConfig.memory.maxMemories,
        retentionDays: realConfig.memory.retentionDays,
        enableEmbeddings: realConfig.memory.enableEmbeddings,
        enableCache: realConfig.memory.enableCache,
      },
      endpoints: {
        api: realConfig.api.baseUrl,
        websocket: realConfig.api.baseUrl.replace("http", "ws"),
      },
      security: {
        maxRequestsPerMinute: realConfig.api.rateLimit,
        encryptionEnabled: realConfig.security.encryptionEnabled,
        authRequired: false, // Will be true in production
        sessionTimeout: realConfig.security.sessionTimeout,
      },
      providers: {
        embedding: realConfig.memory.provider,
        storage: realConfig.database?.type ?? "qdrant",
      },
      performance: {
        queryTimeout: realConfig.performance?.queryTimeout ?? 30,
        cacheSize: realConfig.performance?.cacheSize ?? 100,
        batchSize: realConfig.performance?.batchSize ?? 50,
        enablePreloading: realConfig.performance?.enablePreloading || false,
      },
    };

    return NextResponse.json({
      data: configResponse,
      success: true,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (_error) {
    // Log error for debugging in development only
    if (process.env.NODE_ENV === "development") {
      console.error("Config API error:", _error);
    }
    return NextResponse.json(
      { error: "Failed to fetch configuration", success: false },
      { status: 500 },
    );
  }
}

/**
 * Enterprise Health Monitoring System
 * Provides comprehensive health checks, SLA monitoring, and performance metrics
 */

export interface HealthMetrics {
  uptime: number;
  responseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  databaseConnections: number;
  cacheHitRate: number;
  errorRate: number;
  throughput: number;
}

export interface SLAMetrics {
  availability: number; // Target: 99.9%
  responseTime: number; // Target: <100ms p95
  errorRate: number; // Target: <0.1%
  throughput: number; // Target: >1000 req/min
}

export class EnterpriseHealthMonitor {
  private metrics: HealthMetrics = {
    uptime: 0,
    responseTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    databaseConnections: 0,
    cacheHitRate: 0,
    errorRate: 0,
    throughput: 0,
  };

  private slaTargets: SLAMetrics = {
    availability: 99.9,
    responseTime: 100,
    errorRate: 0.1,
    throughput: 1000,
  };

  private startTime = Date.now();
  private requestCount = 0;
  private errorCount = 0;
  private responseTimes: number[] = [];

  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'critical';
    metrics: HealthMetrics;
    slaCompliance: Record<string, boolean>;
    timestamp: string;
  }> {
    await this.updateMetrics();

    const slaCompliance = {
      availability: this.metrics.uptime > this.slaTargets.availability,
      responseTime: this.metrics.responseTime < this.slaTargets.responseTime,
      errorRate: this.metrics.errorRate < this.slaTargets.errorRate,
      throughput: this.metrics.throughput > this.slaTargets.throughput,
    };

    const healthyCount = Object.values(slaCompliance).filter(Boolean).length;
    const status =
      healthyCount === 4
        ? 'healthy'
        : healthyCount >= 2
          ? 'degraded'
          : 'critical';

    return {
      status,
      metrics: this.metrics,
      slaCompliance,
      timestamp: new Date().toISOString(),
    };
  }

  recordRequest(responseTime: number, isError: boolean = false): void {
    this.requestCount++;
    if (isError) this.errorCount++;

    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  private async updateMetrics(): Promise<void> {
    const now = Date.now();
    this.metrics.uptime =
      ((now - this.startTime) / (1000 * 60 * 60 * 24)) * 100; // Percentage of day

    // Calculate response time (95th percentile)
    if (this.responseTimes.length > 0) {
      const sorted = [...this.responseTimes].sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      this.metrics.responseTime = sorted[p95Index] || 0;
    }

    // Calculate error rate
    this.metrics.errorRate =
      this.requestCount > 0 ? (this.errorCount / this.requestCount) * 100 : 0;

    // Calculate throughput (requests per minute)
    const uptimeMinutes = (now - this.startTime) / (1000 * 60);
    this.metrics.throughput =
      uptimeMinutes > 0 ? this.requestCount / uptimeMinutes : 0;

    // System metrics
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
    this.metrics.cpuUsage = process.cpuUsage().user / 1000000; // seconds
  }

  async validateSLA(): Promise<{
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  }> {
    const health = await this.getHealthStatus();
    const violations: string[] = [];
    const recommendations: string[] = [];

    if (!health.slaCompliance.availability) {
      violations.push(
        `Availability ${health.metrics.uptime.toFixed(2)}% below target ${this.slaTargets.availability}%`
      );
      recommendations.push('Implement redundancy and failover mechanisms');
    }

    if (!health.slaCompliance.responseTime) {
      violations.push(
        `Response time ${health.metrics.responseTime.toFixed(2)}ms above target ${this.slaTargets.responseTime}ms`
      );
      recommendations.push('Optimize database queries and implement caching');
    }

    if (!health.slaCompliance.errorRate) {
      violations.push(
        `Error rate ${health.metrics.errorRate.toFixed(2)}% above target ${this.slaTargets.errorRate}%`
      );
      recommendations.push('Implement better error handling and monitoring');
    }

    if (!health.slaCompliance.throughput) {
      violations.push(
        `Throughput ${health.metrics.throughput.toFixed(2)} req/min below target ${this.slaTargets.throughput} req/min`
      );
      recommendations.push('Scale horizontally and optimize performance');
    }

    return {
      compliant: violations.length === 0,
      violations,
      recommendations,
    };
  }
}

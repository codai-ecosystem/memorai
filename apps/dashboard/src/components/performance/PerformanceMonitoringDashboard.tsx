"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    Activity,
    Database,
    Zap,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    RefreshCw,
    HardDrive,
    Clock,
    BarChart3,
    Eye,
    EyeOff
} from 'lucide-react';

interface PerformanceMetrics {
    totalMemories: number;
    cacheHitRate: number;
    averageQueryTime: number;
    memoryUsage: number;
    duplicatesFound: number;
    optimizationSavings: number;
    qdrantHealth: boolean;
    lastOptimization: string;
    systemHealth: 'healthy' | 'warning' | 'critical';
}

export default function PerformanceMonitoringDashboard() {
    const [metrics, setMetrics] = useState<PerformanceMetrics>({
        totalMemories: 0,
        cacheHitRate: 0,
        averageQueryTime: 0,
        memoryUsage: 0,
        duplicatesFound: 0,
        optimizationSavings: 0,
        qdrantHealth: false,
        lastOptimization: '',
        systemHealth: 'healthy'
    });
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [announcements, setAnnouncements] = useState<string[]>([]);
    const [highContrast, setHighContrast] = useState(false);

    // Animation variants for enhanced UX
    const containerVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.6,
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5 }
        }
    };

    const pulseAnimation = {
        scale: [1, 1.05, 1],
        transition: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
        }
    };

    useEffect(() => {
        fetchMetrics();

        // Announce initial load for screen readers
        announceToScreenReader("Performance dashboard loaded. Current system status is being fetched.");

        if (autoRefresh) {
            const interval = setInterval(fetchMetrics, 30000); // 30 seconds
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);
    const announceToScreenReader = (message: string) => {
        setAnnouncements(prev => [...prev, message]);
        // Clear announcement after 5 seconds
        setTimeout(() => {
            setAnnouncements(prev => prev.slice(1));
        }, 5000);
    };

    const fetchMetrics = async () => {
        try {
            const response = await fetch('/api/performance/metrics');
            if (response.ok) {
                const data = await response.json();
                setMetrics(data);
            }
        } catch (error) {
            console.error('Failed to fetch performance metrics:', error);
        }
    };

    const runOptimization = async () => {
        setIsOptimizing(true);
        try {
            const response = await fetch('/api/performance/optimize', {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                alert(`Optimization completed! Removed ${result.removedMemories} memories, saved ${result.spaceSaved}GB`);
                fetchMetrics(); // Refresh metrics
            } else {
                throw new Error('Optimization failed');
            }
        } catch (error) {
            console.error('Optimization failed:', error);
            alert('Optimization failed. Please check the logs.');
        } finally {
            setIsOptimizing(false);
        }
    };

    const getHealthIcon = (health: string) => {
        switch (health) {
            case 'healthy':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            case 'critical':
                return <AlertTriangle className="h-5 w-5 text-red-500" />;
            default:
                return <Activity className="h-5 w-5 text-gray-500" />;
        }
    };

    const getHealthBadge = (health: string) => {
        const variants = {
            healthy: 'default',
            warning: 'secondary',
            critical: 'destructive'
        } as const;

        return (
            <Badge variant={variants[health as keyof typeof variants] || 'outline'}>
                {health.charAt(0).toUpperCase() + health.slice(1)}
            </Badge>
        );
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    return (
        <div className={`space-y-6 ${highContrast ? 'contrast-more' : ''}`} data-testid="performance-dashboard">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">MemorAI Performance Dashboard</h1>
                    <p className="text-muted-foreground">
                        Real-time system performance and memory optimization
                    </p>
                </div>        <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setHighContrast(!highContrast)}
                        className="flex items-center gap-2"
                        data-testid="contrast-toggle"
                    >
                        {highContrast ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {highContrast ? 'Normal' : 'High Contrast'}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className="flex items-center gap-2"
                        data-testid="auto-refresh-toggle"
                    >
                        <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                        Auto Refresh {autoRefresh ? 'On' : 'Off'}
                    </Button>          <Button
                        onClick={runOptimization}
                        disabled={isOptimizing}
                        className="flex items-center gap-2"
                        data-testid="optimize-button"
                        aria-label={isOptimizing ? 'Optimizing system performance' : 'Start system optimization'}
                    >
                        {isOptimizing ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                            <Zap className="h-4 w-4" />
                        )}
                        {isOptimizing ? 'Optimizing...' : 'Optimize Now'}
                    </Button>
                </div>
            </div>      {/* System Health Overview */}
            <Card data-testid="system-health">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {getHealthIcon(metrics.systemHealth)}
                        System Health
                    </CardTitle>
                    <CardDescription>
                        Overall system status and critical metrics
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-sm font-medium">Current Status</p>
                            {getHealthBadge(metrics.systemHealth)}
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-sm font-medium">Qdrant Health</p>
                            <Badge variant={metrics.qdrantHealth ? 'default' : 'destructive'}>
                                {metrics.qdrantHealth ? 'Connected' : 'Disconnected'}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>      {/* Performance Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="metrics-grid">
                <Card data-testid="performance-total-memories">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Memories</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.totalMemories.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground">
                            Active memory entries
                        </p>
                    </CardContent>
                </Card>        <Card data-testid="cache-hit-rate">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{(metrics.cacheHitRate * 100).toFixed(1)}%</div>
                        <Progress value={metrics.cacheHitRate * 100} className="mt-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                            Target: 85%+
                        </p>
                    </CardContent>
                </Card>        <Card data-testid="query-time">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Query Time</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.averageQueryTime.toFixed(0)}ms</div>
                        <p className="text-xs text-muted-foreground">
                            {metrics.averageQueryTime < 1000 ? 'Excellent' :
                                metrics.averageQueryTime < 2000 ? 'Good' : 'Needs optimization'}
                        </p>
                    </CardContent>
                </Card>        <Card data-testid="memory-usage">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                        <HardDrive className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatBytes(metrics.memoryUsage)}</div>
                        <p className="text-xs text-muted-foreground">
                            Cache + system memory
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Optimization Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Optimization Impact
                        </CardTitle>
                        <CardDescription>
                            Recent cleanup and optimization results
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Duplicates Removed</span>
                            <span className="text-sm text-muted-foreground">
                                {metrics.duplicatesFound.toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Space Saved</span>
                            <span className="text-sm text-muted-foreground">
                                {formatBytes(metrics.optimizationSavings)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">Last Optimization</span>
                            <span className="text-sm text-muted-foreground">
                                {metrics.lastOptimization || 'Never'}
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Performance Recommendations
                        </CardTitle>
                        <CardDescription>
                            Suggested actions to improve performance
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {metrics.cacheHitRate < 0.8 && (
                            <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm">Cache hit rate below 80% - consider increasing cache TTL</span>
                            </div>
                        )}
                        {metrics.averageQueryTime > 2000 && (
                            <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
                                <AlertTriangle className="h-4 w-4 text-red-600" />
                                <span className="text-sm">Query time exceeds 2s - run optimization</span>
                            </div>
                        )}
                        {metrics.totalMemories > 50000 && (
                            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                                <AlertTriangle className="h-4 w-4 text-blue-600" />
                                <span className="text-sm">High memory count - schedule cleanup</span>
                            </div>
                        )}
                        {metrics.systemHealth === 'healthy' && (
                            <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span className="text-sm">System running optimally</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Emergency Actions */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-red-600">Emergency Actions</CardTitle>
                    <CardDescription>
                        Use these actions only when system performance is severely degraded
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Button
                        variant="destructive"
                        onClick={() => {
                            if (confirm('This will clear all caches. Continue?')) {
                                fetch('/api/performance/clear-cache', { method: 'POST' });
                            }
                        }}
                    >
                        Clear All Caches
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => {
                            if (confirm('This will force garbage collection. Continue?')) {
                                fetch('/api/performance/force-gc', { method: 'POST' });
                            }
                        }}
                    >
                        Force Garbage Collection
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

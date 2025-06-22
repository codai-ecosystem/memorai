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
    EyeOff,
    Volume2,
    Settings
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
    const [isLoading, setIsLoading] = useState(true);

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
            setIsLoading(true);
            const response = await fetch('/api/performance/metrics');
            if (response.ok) {
                const data = await response.json();
                setMetrics(data);
                announceToScreenReader(`Metrics updated. System health: ${data.systemHealth}. Memory usage: ${formatBytes(data.memoryUsage)}.`);
            }
        } catch (error) {
            console.error('Failed to fetch performance metrics:', error);
            announceToScreenReader("Failed to fetch performance metrics. Please check connection.");
        } finally {
            setIsLoading(false);
        }
    };

    const runOptimization = async () => {
        setIsOptimizing(true);
        announceToScreenReader("Starting memory optimization process...");

        try {
            const response = await fetch('/api/performance/optimize', {
                method: 'POST'
            });

            if (response.ok) {
                const result = await response.json();
                const message = `Optimization completed! Removed ${result.removedMemories} memories, saved ${result.spaceSaved}GB`;
                announceToScreenReader(message);
                fetchMetrics(); // Refresh metrics
            } else {
                throw new Error('Optimization failed');
            }
        } catch (error) {
            console.error('Optimization failed:', error);
            announceToScreenReader("Optimization failed. Please check the logs.");
        } finally {
            setIsOptimizing(false);
        }
    };

    const clearCache = async () => {
        try {
            const response = await fetch('/api/performance/clear-cache', {
                method: 'POST'
            });

            if (response.ok) {
                announceToScreenReader("Cache cleared successfully.");
                fetchMetrics();
            }
        } catch (error) {
            console.error('Failed to clear cache:', error);
            announceToScreenReader("Failed to clear cache.");
        }
    };

    const getHealthIcon = (health: string) => {
        switch (health) {
            case 'healthy':
                return <CheckCircle className="h-5 w-5 text-green-500" aria-label="Healthy status" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-500" aria-label="Warning status" />;
            case 'critical':
                return <AlertTriangle className="h-5 w-5 text-red-500" aria-label="Critical status" />;
            default:
                return <Activity className="h-5 w-5 text-gray-500" aria-label="Unknown status" />;
        }
    };

    const getHealthBadge = (health: string) => {
        const variants = {
            healthy: 'default',
            warning: 'secondary',
            critical: 'destructive'
        } as const;

        return (
            <Badge
                variant={variants[health as keyof typeof variants] || 'outline'}
                aria-label={`System health status: ${health}`}
            >
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

    const formatNumber = (num: number) => {
        return new Intl.NumberFormat().format(num);
    };

    return (
        <div className={`min-h-screen p-6 ${highContrast ? 'contrast-more bg-black text-white' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900'}`}>
            {/* Screen Reader Announcements */}
            <div className="sr-only" aria-live="polite" aria-atomic="true">
                {announcements.map((announcement, index) => (
                    <div key={index}>{announcement}</div>
                ))}
            </div>

            <motion.div
                className="max-w-7xl mx-auto space-y-8"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Header */}
                <motion.div
                    className="flex justify-between items-center"
                    variants={itemVariants}
                >
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            MemorAI Performance Dashboard
                        </h1>
                        <p className="text-lg text-muted-foreground mt-2">
                            Enterprise-grade memory management with real-time monitoring
                        </p>
                    </div>

                    <div className="flex gap-3">
                        {/* Accessibility Controls */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setHighContrast(!highContrast)}
                            aria-label={`${highContrast ? 'Disable' : 'Enable'} high contrast mode`}
                            className="flex items-center gap-2"
                        >
                            {highContrast ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            Contrast
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAutoRefresh(!autoRefresh)}
                            aria-label={`${autoRefresh ? 'Disable' : 'Enable'} auto refresh`}
                            className="flex items-center gap-2"
                        >
                            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                            Auto Refresh {autoRefresh ? 'On' : 'Off'}
                        </Button>

                        <Button
                            onClick={runOptimization}
                            disabled={isOptimizing}
                            aria-label="Run memory optimization"
                            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                            {isOptimizing ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <Zap className="h-4 w-4" />
                            )}
                            {isOptimizing ? 'Optimizing...' : 'Optimize Memory'}
                        </Button>
                    </div>
                </motion.div>

                {/* System Health Overview */}
                <motion.div variants={itemVariants}>
                    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-lg dark:bg-gray-800/80">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    {getHealthIcon(metrics.systemHealth)}
                                    System Health Overview
                                </CardTitle>
                                {getHealthBadge(metrics.systemHealth)}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-blue-600">
                                        {formatNumber(metrics.totalMemories)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">Total Memories</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-green-600">
                                        {metrics.cacheHitRate.toFixed(1)}%
                                    </div>
                                    <div className="text-sm text-muted-foreground">Cache Hit Rate</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-purple-600">
                                        {metrics.averageQueryTime.toFixed(0)}ms
                                    </div>
                                    <div className="text-sm text-muted-foreground">Avg Query Time</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Performance Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Memory Usage */}
                    <motion.div variants={itemVariants}>
                        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-lg dark:bg-gray-800/80 hover:shadow-xl transition-all duration-300">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <HardDrive className="h-5 w-5 text-blue-500" />
                                    Memory Usage
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="text-2xl font-bold">
                                        {formatBytes(metrics.memoryUsage)}
                                    </div>
                                    <Progress
                                        value={(metrics.memoryUsage / (8 * 1024 * 1024 * 1024)) * 100}
                                        className="h-3"
                                        aria-label={`Memory usage: ${formatBytes(metrics.memoryUsage)}`}
                                    />
                                    <div className="text-sm text-muted-foreground">
                                        Target: &lt;8GB (Enterprise Grade)
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Cache Performance */}
                    <motion.div variants={itemVariants}>
                        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-lg dark:bg-gray-800/80 hover:shadow-xl transition-all duration-300">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Database className="h-5 w-5 text-green-500" />
                                    Cache Performance
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="text-2xl font-bold text-green-600">
                                        {metrics.cacheHitRate.toFixed(1)}%
                                    </div>
                                    <Progress
                                        value={metrics.cacheHitRate}
                                        className="h-3"
                                        aria-label={`Cache hit rate: ${metrics.cacheHitRate.toFixed(1)}%`}
                                    />
                                    <div className="text-sm text-muted-foreground">
                                        Target: &gt;90% (Excellent)
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Query Performance */}
                    <motion.div variants={itemVariants}>
                        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-lg dark:bg-gray-800/80 hover:shadow-xl transition-all duration-300">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Clock className="h-5 w-5 text-purple-500" />
                                    Query Performance
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="text-2xl font-bold text-purple-600">
                                        {metrics.averageQueryTime.toFixed(0)}ms
                                    </div>
                                    <Progress
                                        value={Math.max(0, 100 - (metrics.averageQueryTime / 10))}
                                        className="h-3"
                                        aria-label={`Average query time: ${metrics.averageQueryTime.toFixed(0)} milliseconds`}
                                    />
                                    <div className="text-sm text-muted-foreground">
                                        Target: &lt;100ms (Fast)
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Optimization Status */}
                    <motion.div variants={itemVariants}>
                        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-lg dark:bg-gray-800/80 hover:shadow-xl transition-all duration-300">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <TrendingUp className="h-5 w-5 text-orange-500" />
                                    Optimization Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="text-2xl font-bold text-orange-600">
                                        {formatNumber(metrics.duplicatesFound)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Duplicates Found
                                    </div>
                                    <div className="text-lg font-semibold text-green-600">
                                        {formatBytes(metrics.optimizationSavings)} Saved
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Qdrant Health */}
                    <motion.div variants={itemVariants}>
                        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-lg dark:bg-gray-800/80 hover:shadow-xl transition-all duration-300">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Database className="h-5 w-5 text-indigo-500" />
                                    Vector Database
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2">
                                        {metrics.qdrantHealth ? (
                                            <CheckCircle className="h-6 w-6 text-green-500" />
                                        ) : (
                                            <AlertTriangle className="h-6 w-6 text-red-500" />
                                        )}
                                        <span className="text-lg font-semibold">
                                            {metrics.qdrantHealth ? 'Healthy' : 'Unhealthy'}
                                        </span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        Qdrant Vector Store Status
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div variants={itemVariants}>
                        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-lg dark:bg-gray-800/80 hover:shadow-xl transition-all duration-300">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Settings className="h-5 w-5 text-gray-500" />
                                    Quick Actions
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <Button
                                        onClick={clearCache}
                                        variant="outline"
                                        className="w-full"
                                        aria-label="Clear cache"
                                    >
                                        Clear Cache
                                    </Button>
                                    <Button
                                        onClick={fetchMetrics}
                                        variant="outline"
                                        className="w-full"
                                        disabled={isLoading}
                                        aria-label="Refresh metrics"
                                    >
                                        {isLoading ? 'Refreshing...' : 'Refresh Metrics'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>

                {/* Performance Insights */}
                <motion.div variants={itemVariants}>
                    <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-lg dark:bg-gray-800/80">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                <BarChart3 className="h-6 w-6 text-blue-500" />
                                Performance Insights
                            </CardTitle>
                            <CardDescription>
                                AI-powered recommendations for optimal performance
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {metrics.cacheHitRate < 80 && (
                                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                            <strong>Cache Optimization Needed</strong>
                                        </div>
                                        <p className="text-sm mt-1">
                                            Cache hit rate is below optimal. Consider increasing cache size or reviewing cache policies.
                                        </p>
                                    </div>
                                )}

                                {metrics.averageQueryTime > 1000 && (
                                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-red-600" />
                                            <strong>Slow Query Performance</strong>
                                        </div>
                                        <p className="text-sm mt-1">
                                            Query performance is below target. Consider running memory optimization or checking Qdrant configuration.
                                        </p>
                                    </div>
                                )}

                                {metrics.duplicatesFound > 1000 && (
                                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <TrendingUp className="h-5 w-5 text-orange-600" />
                                            <strong>Memory Optimization Recommended</strong>
                                        </div>
                                        <p className="text-sm mt-1">
                                            High number of duplicate memories detected. Run optimization to improve performance and reduce memory usage.
                                        </p>
                                    </div>
                                )}

                                {metrics.systemHealth === 'healthy' && metrics.cacheHitRate > 90 && metrics.averageQueryTime < 500 && (
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                            <strong>Excellent Performance</strong>
                                        </div>
                                        <p className="text-sm mt-1">
                                            All performance metrics are within optimal ranges. System is operating at peak efficiency.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Footer */}
                <motion.div
                    className="text-center text-sm text-muted-foreground py-4"
                    variants={itemVariants}
                >
                    <p>MemorAI Enterprise Dashboard • Built with ❤️ for world-class performance</p>
                    <p className="mt-1">
                        Last updated: {new Date().toLocaleString()} •
                        Auto-refresh: {autoRefresh ? 'Enabled' : 'Disabled'}
                    </p>
                </motion.div>
            </motion.div>
        </div>
    );
}

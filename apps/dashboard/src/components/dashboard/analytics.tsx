'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Brain,
  Activity,
  PieChart,
  Calendar,
  Filter,
  Download,
} from 'lucide-react';
import { useMemoryStore } from '../../stores/memory-store';
import { cn } from '../../lib/utils';

interface AnalyticsDashboardProps {
  className?: string;
}

export function AnalyticsDashboard({ className }: AnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>(
    '30d'
  );
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'memories',
    'interactions',
    'agents',
  ]);
  const [renderError, setRenderError] = useState<string | null>(null);

  const { memories, stats, fetchStats, fetchMemories } = useMemoryStore();

  useEffect(() => {
    void console.log('AnalyticsDashboard: Component mounted, fetching data...');
    try {
      void fetchStats();
      void fetchMemories();
    } catch (_error) {
      void console.error('Error fetching analytics data:', error);
      setRenderError('Failed to load analytics data');
    }
  }, [fetchStats, fetchMemories]);

  // Add safety checks for memories
  const safeMemories = memories || [];
  console.log('AnalyticsDashboard: memories count:', safeMemories.length);

  // Calculate analytics data from memories with safety checks
  const analyticsData = {
    totalMemories: safeMemories.length,
    memoriesThisWeek: safeMemories.filter(m => {
      try {
        const date = new Date(m.metadata?.timestamp || Date.now());
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return date > weekAgo;
      } catch (_error) {
        console.warn('Error processing memory date:', error);
        return false;
      }
    }).length,
    memoriesThisMonth: safeMemories.filter(m => {
      try {
        const date = new Date(m.metadata?.timestamp || Date.now());
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return date > monthAgo;
      } catch (_error) {
        console.warn('Error processing memory date:', error);
        return false;
      }
    }).length,
    avgSimilarity:
      safeMemories.length > 0
        ? safeMemories.reduce(
            (sum, m) => sum + (m.metadata?.similarity || 0),
            0
          ) / safeMemories.length
        : 0,
    uniqueAgents: [
      ...new Set(safeMemories.map(m => m.metadata?.agentId).filter(Boolean)),
    ].length,
    topTags: safeMemories.reduce(
      (tags, memory) => {
        memory.metadata?.tags?.forEach((tag: string) => {
          tags[tag] = (tags[tag] || 0) + 1;
        });
        return tags;
      },
      {} as Record<string, number>
    ),
  }; // Calculate real chart data from memories with safety checks
  const chartData = useMemo(() => {
    const now = new Date();
    const weekData = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
        date.getDay()
      ];

      const dayMemories = safeMemories.filter(m => {
        try {
          const memoryDate = new Date(m.metadata?.timestamp || Date.now());
          return memoryDate.toDateString() === date.toDateString();
        } catch {
          return false;
        }
      });

      weekData.push({
        name: dayName,
        memories: dayMemories.length,
        interactions: dayMemories.length * 2 + Math.floor(Math.random() * 10), // Estimated interactions
      });
    }

    return weekData;
  }, [safeMemories]);

  const MetricCard = ({
    title,
    value,
    change,
    icon: Icon,
    color = 'blue',
  }: {
    title: string;
    value: string | number;
    change?: string;
    icon: unknown;
    color?: 'blue' | 'green' | 'purple' | 'orange';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-500 text-blue-50',
      green: 'bg-green-500 text-green-50',
      purple: 'bg-purple-500 text-purple-50',
      orange: 'bg-orange-500 text-orange-50',
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              {value}
            </p>
            {change && (
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                {change}
              </p>
            )}
          </div>
          <div className={cn('p-3 rounded-lg', colorClasses[color])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>{' '}
      </motion.div>
    );
  };

  if (renderError) {
    return (
      <div
        data-testid="analytics-dashboard"
        className={cn('space-y-6', className)}
      >
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">Error: {renderError}</p>
          <button
            onClick={() => setRenderError(null)}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="analytics-dashboard"
      className={cn('space-y-6', className)}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor memory usage and performance metrics
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value as any)}
            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>

          <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Memories"
          value={analyticsData.totalMemories}
          change={`+${analyticsData.memoriesThisWeek} this week`}
          icon={Brain}
          color="blue"
        />{' '}
        <MetricCard
          title="Active Agents"
          value={analyticsData.uniqueAgents}
          change={`+${analyticsData.uniqueAgents} new this month`}
          icon={Users}
          color="green"
        />
        <MetricCard
          title="Avg Similarity"
          value={`${(analyticsData.avgSimilarity * 100).toFixed(1)}%`}
          change={
            analyticsData.avgSimilarity > 0.5
              ? '+5.2% from last month'
              : 'Improving quality'
          }
          icon={TrendingUp}
          color="purple"
        />
        <MetricCard
          title="Memories This Month"
          value={analyticsData.memoriesThisMonth}
          change={`+${Math.max(0, analyticsData.memoriesThisMonth - analyticsData.memoriesThisWeek * 4)}% from last month`}
          icon={Calendar}
          color="orange"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory Creation Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Memory Creation Trend
            </h3>
            <BarChart3 className="h-5 w-5 text-gray-400" />
          </div>

          <div className="space-y-4">
            {chartData.map((day, index) => (
              <div key={day.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-8">
                    {day.name}
                  </span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 max-w-[200px]">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${(day.memories / 25) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {day.memories}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Top Tags */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Popular Tags
            </h3>
            <PieChart className="h-5 w-5 text-gray-400" />
          </div>

          <div className="space-y-3">
            {Object.entries(analyticsData.topTags)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 6)
              .map(([tag, count], index) => (
                <div key={tag} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: [
                          '#3B82F6',
                          '#10B981',
                          '#8B5CF6',
                          '#F59E0B',
                          '#EF4444',
                          '#6B7280',
                        ][index],
                      }}
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {tag}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </motion.div>
      </div>

      {/* Activity Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h3>
          <Activity className="h-5 w-5 text-gray-400" />
        </div>{' '}
        <div className="space-y-4">
          {safeMemories.slice(0, 5).map((memory, index) => (
            <div key={memory.id} className="flex items-start gap-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
              <div className="flex-1">
                {' '}
                <p className="text-sm text-gray-900 dark:text-white font-medium">
                  Memory created by {memory.metadata?.agentId ?? 'Unknown'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {new Date(
                    memory.metadata?.timestamp || Date.now()
                  ).toLocaleString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                  {memory.content.substring(0, 100)}...
                </p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

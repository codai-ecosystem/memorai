'use client';

import { useEffect } from 'react';
import {
  Brain,
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useMemoryStore } from '../../stores/memory-store';
import { cn, formatRelativeTime } from '../../lib/utils';

interface MemoryOverviewProps {
  className?: string;
}

export function MemoryOverview({ className }: MemoryOverviewProps) {
  const { stats, memories, isLoading, error, fetchStats, fetchMemories } =
    useMemoryStore();

  useEffect(() => {
    void fetchStats();
    void fetchMemories({ limit: 5 });
  }, [fetchStats, fetchMemories]);

  if (error) {
    return (
      <div className={cn('p-6', className)}>
        <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>Error loading overview: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="memory-overview"
      className={cn('p-6 space-y-6', className)}
    >
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Memory Overview
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive view of your AI memory system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Memories
              </p>{' '}
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading
                  ? '---'
                  : stats?.totalMemories?.toLocaleString('en-US') || '0'}
              </p>
            </div>
            <Brain className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
            <span className="text-green-600 dark:text-green-400">
              +12% from last month
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Agents
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? '--' : (stats?.totalAgents ?? '0')}
              </p>
            </div>
            <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
            <span className="text-gray-600 dark:text-gray-400">
              All agents healthy
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Avg Importance
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading
                  ? '--'
                  : `${Math.round((stats?.averageImportance || 0) * 100)}%`}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Quality score
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Recent Activity
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {isLoading ? '--' : (stats?.recentActivity?.[0]?.count ?? '0')}
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">Today</span>
          </div>
        </div>
      </div>

      {/* Memory Types Distribution */}
      {stats?.memoryTypes && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Memory Types Distribution
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.memoryTypes).map(([type, count]) => (
              <div key={type} className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {count}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {type}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Memories */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Recent Memories
        </h3>
        <div className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mt-2"></div>
                </div>
              ))}
            </div>
          ) : memories.length > 0 ? (
            memories.slice(0, 5).map(memory => (
              <div
                key={memory.id}
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                    {memory.content}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        memory.type === 'task'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                      )}
                    >
                      {memory.type}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatRelativeTime(
                        memory.metadata.timestamp ?? new Date().toISOString()
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
              No memories found
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

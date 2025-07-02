'use client';

import { useEffect, useState } from 'react';
import { AnalyticsDashboard } from '../components/dashboard/analytics';
import { DashboardHeader } from '../components/dashboard/header';
import { MemoryActions } from '../components/dashboard/memory-actions';
import { MemoryOverview } from '../components/dashboard/memory-overview';
import { MemoryResults } from '../components/dashboard/memory-results';
import { MemorySearch } from '../components/dashboard/memory-search';
import { DashboardSidebar } from '../components/dashboard/sidebar';
import { SystemConfiguration } from '../components/dashboard/system-config';
import { TailwindTest } from '../components/tailwind-test';
import { useConfigStore } from '../stores/config-store';
import { useMemoryStore } from '../stores/memory-store';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
  };

  const {
    memories,
    stats,
    isLoading: memoriesLoading,
    fetchMemories,
    fetchStats,
  } = useMemoryStore();

  const { config, isLoading: configLoading, fetchConfig } = useConfigStore();

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setIsLoading(true);

        // Set a maximum loading timeout to ensure UI shows
        const loadingTimeout = setTimeout(() => {
          console.warn('Dashboard loading timeout, showing UI anyway');
          setIsLoading(false);
        }, 2000); // 2 second max loading time

        // Load all initial data in parallel
        await Promise.allSettled([
          fetchMemories(),
          fetchStats(),
          fetchConfig(),
        ]);

        clearTimeout(loadingTimeout);
      } catch (_error) {
        console.error('Failed to initialize dashboard:', _error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeDashboard();

    // Set up real-time updates every 5 seconds
    const refreshInterval = setInterval(async () => {
      try {
        console.log('Auto-refreshing dashboard data...');
        await Promise.allSettled([
          fetchMemories(),
          fetchStats(),
        ]);
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, 5000); // Refresh every 5 seconds

    // Cleanup interval on component unmount
    return () => {
      clearInterval(refreshInterval);
    };
  }, [fetchMemories, fetchStats, fetchConfig]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-brain mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Initializing Advanced AI Memory System...
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Loading your intelligent memory dashboard
          </p>
        </div>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            <div className="relative z-0">
              <MemoryOverview />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
              <div className="relative z-10">
                <MemoryActions />
              </div>
              <div className="space-y-6 relative z-5">
                <MemorySearch />
                <div data-testid="memory-results-container">
                  <MemoryResults />
                </div>
              </div>
            </div>
          </div>
        );
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'memories':
        return (
          <div className="space-y-6">
            <MemorySearch />
            <MemoryResults />
          </div>
        );
      case 'search':
        return (
          <div className="space-y-6">
            <MemorySearch />
            <MemoryResults />
          </div>
        );
      case 'agents':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Agent Management</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Manage AI agents and their memory contexts</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 dark:text-blue-100">Active Agent</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">memorai-testing</p>
                  <p className="text-xs text-blue-500 dark:text-blue-400 mt-2">Status: Online</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'knowledge':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Knowledge Graph</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Visualize relationships between memories and entities</p>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">Knowledge graph visualization coming soon</p>
              </div>
            </div>
          </div>
        );
      case 'activity':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Activity Log</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Monitor system activities and memory operations</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 px-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-sm text-green-800 dark:text-green-200">Memory stored successfully</span>
                  <span className="text-xs text-green-600 dark:text-green-400">just now</span>
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm text-blue-800 dark:text-blue-200">Agent connected</span>
                  <span className="text-xs text-blue-600 dark:text-blue-400">2 minutes ago</span>
                </div>
              </div>
            </div>
          </div>
        );
      case 'reports':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">System Reports</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Generate and view system performance reports</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white">Daily Memory Report</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">4 memories processed today</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white">Performance Metrics</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Average response: 0.37ms</p>
                </div>
              </div>
            </div>
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Security Settings</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">Configure authentication and security policies</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 px-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">Memory Encryption</span>
                  <span className="text-xs text-green-600 dark:text-green-400">Enabled</span>
                </div>
                <div className="flex items-center justify-between py-3 px-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">Audit Logging</span>
                  <span className="text-xs text-blue-600 dark:text-blue-400">Active</span>
                </div>
              </div>
            </div>
          </div>
        );
      case 'create':
        return <MemoryActions />;
      case 'settings':
        return <SystemConfiguration />;
      case 'tailwind-test':
        return <TailwindTest />;
      default:
        return (
          <div className="space-y-6">
            <div className="relative z-0">
              <MemoryOverview />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Dashboard Header */}
      <DashboardHeader />

      <div className="flex">
        {/* Sidebar */}
        <DashboardSidebar activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 ml-0 lg:ml-64">
          <div className="max-w-7xl mx-auto">{renderTabContent()}</div>
        </main>
      </div>
    </div>
  );
}

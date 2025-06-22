'use client'

import { useState, useEffect } from 'react'
import { DashboardHeader } from '../components/dashboard/header'
import { DashboardSidebar } from '../components/dashboard/sidebar'
import { MemoryOverview } from '../components/dashboard/memory-overview'
import { MemoryActions } from '../components/dashboard/memory-actions'
import { MemorySearch } from '../components/dashboard/memory-search'
import { MemoryResults } from '../components/dashboard/memory-results'
import { AnalyticsDashboard } from '../components/dashboard/analytics'
import { SystemConfiguration } from '../components/dashboard/system-config'
import { useMemoryStore } from '../stores/memory-store'
import { useConfigStore } from '../stores/config-store'
import { TailwindTest } from '../components/tailwind-test'

export default function DashboardPage() {
    const [activeTab, setActiveTab] = useState('overview')
    const [isLoading, setIsLoading] = useState(false)

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab)
    }

    const {
        memories,
        stats,
        isLoading: memoriesLoading,
        fetchMemories,
        fetchStats
    } = useMemoryStore()

    const {
        config,
        isLoading: configLoading,
        fetchConfig
    } = useConfigStore()

    useEffect(() => {
        const initializeDashboard = async () => {
            try {
                setIsLoading(true)

                // Set a maximum loading timeout to ensure UI shows
                const loadingTimeout = setTimeout(() => {
                    console.warn('Dashboard loading timeout, showing UI anyway')
                    setIsLoading(false)
                }, 2000) // 2 second max loading time

                // Load all initial data in parallel
                await Promise.allSettled([
                    fetchMemories(),
                    fetchStats(),
                    fetchConfig()
                ])

                clearTimeout(loadingTimeout)

            } catch (error) {
                console.error('Failed to initialize dashboard:', error)
            } finally {
                setIsLoading(false)
            }
        }

        initializeDashboard()
    }, [fetchMemories, fetchStats, fetchConfig])

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
        )
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
                )
            case 'analytics':
                return <AnalyticsDashboard />
            case 'memories':
                return (
                    <div className="space-y-6">
                        <MemorySearch />
                        <MemoryResults />
                    </div>
                )
            case 'create':
                return <MemoryActions />
            case 'settings':
                return <SystemConfiguration />
            case 'tailwind-test':
                return <TailwindTest />
            default:
                return (
                    <div>
                        <TailwindTest />
                        <MemoryOverview />
                    </div>
                )
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            {/* Dashboard Header */}
            <DashboardHeader />

            <div className="flex">
                {/* Sidebar */}
                <DashboardSidebar
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                />

                {/* Main Content */}
                <main className="flex-1 p-6 lg:p-8 ml-0 lg:ml-64">
                    <div className="max-w-7xl mx-auto">
                        {renderTabContent()}
                    </div>
                </main>
            </div>
        </div>
    )
}

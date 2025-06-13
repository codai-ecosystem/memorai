'use client'

import { useState } from 'react'
import { Search, Bell, Settings, User, Moon, Sun, Monitor } from 'lucide-react'
import { cn } from '../../lib/utils'

interface DashboardHeaderProps {
    onSearch?: (query: string) => void
    className?: string
}

export function DashboardHeader({ onSearch, className }: DashboardHeaderProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        onSearch?.(searchQuery)
    }

    const toggleTheme = () => {
        const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
        const currentIndex = themes.indexOf(theme)
        const nextTheme = themes[(currentIndex + 1) % themes.length]
        setTheme(nextTheme)

        // Apply theme to document
        if (nextTheme === 'dark') {
            document.documentElement.classList.add('dark')
        } else if (nextTheme === 'light') {
            document.documentElement.classList.remove('dark')
        } else {
            // System theme
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark')
            } else {
                document.documentElement.classList.remove('dark')
            }
        }
    }

    const getThemeIcon = () => {
        switch (theme) {
            case 'light': return <Sun className="h-4 w-4" />
            case 'dark': return <Moon className="h-4 w-4" />
            default: return <Monitor className="h-4 w-4" />
        }
    }

    return (
        <header
            data-testid="dashboard-header"
            className={cn(
                "bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4",
                className
            )}>
            <div className="flex items-center justify-between">
                {/* Logo and Title */}
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-sm">M</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                                Memorai Dashboard
                            </h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                AI Memory Management System
                            </p>
                        </div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="flex-1 max-w-2xl mx-8">
                    <form onSubmit={handleSearch} className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />                        <input
                            type="text"
                            placeholder="Search memories, agents, or tags..."
                            data-testid="header-search-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={cn(
                                "w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600",
                                "rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                                "bg-white dark:bg-gray-800 text-gray-900 dark:text-white",
                                "placeholder-gray-500 dark:placeholder-gray-400"
                            )}
                        />
                    </form>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-4">                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className={cn(
                            "p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800",
                            "text-gray-600 dark:text-gray-300 transition-colors"
                        )}
                        title={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} theme`}
                        aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} theme`}
                    >
                        {getThemeIcon()}
                    </button>

                    {/* Notifications */}
                    <button
                        className={cn(
                            "relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800",
                            "text-gray-600 dark:text-gray-300 transition-colors"
                        )}
                        aria-label="View notifications"
                        title="View notifications"
                    >
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>

                    {/* Settings */}
                    <button
                        className={cn(
                            "p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800",
                            "text-gray-600 dark:text-gray-300 transition-colors"
                        )}
                        aria-label="Open settings"
                        title="Open settings"
                    >
                        <Settings className="h-5 w-5" />
                    </button>

                    {/* Profile */}
                    <button
                        className={cn(
                            "flex items-center space-x-2 p-2 rounded-lg",
                            "hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        )}
                        aria-label="User profile menu"
                        title="User profile menu"
                    >
                        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Admin
                        </span>
                    </button>
                </div>
            </div>
        </header>
    )
}

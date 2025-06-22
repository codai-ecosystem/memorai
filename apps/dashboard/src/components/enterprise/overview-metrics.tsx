'use client'

import { motion } from 'framer-motion'
import {
    Brain,
    Database,
    Zap,
    TrendingUp,
    Users,
    Clock,
    Shield,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
    Minus
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'

interface MetricCardProps {
    id: string
    title: string
    value: string | number
    change?: {
        value: number
        period: string
        direction: 'up' | 'down' | 'neutral'
    }
    icon: React.ComponentType<{ className?: string }>
    description?: string
    badge?: {
        text: string
        variant: 'default' | 'secondary' | 'outline'
    }
    gradient?: string
    onClick?: () => void
    className?: string
}

export function MetricCard({
    id,
    title,
    value,
    change,
    icon: Icon,
    description,
    badge,
    gradient = 'from-blue-500 to-purple-600',
    onClick,
    className
}: MetricCardProps) {
    const getChangeIcon = () => {
        switch (change?.direction) {
            case 'up':
                return ArrowUpRight
            case 'down':
                return ArrowDownRight
            default:
                return Minus
        }
    }

    const getChangeColor = () => {
        switch (change?.direction) {
            case 'up':
                return 'text-green-600 dark:text-green-400'
            case 'down':
                return 'text-red-600 dark:text-red-400'
            default:
                return 'text-muted-foreground'
        }
    }

    const ChangeIcon = getChangeIcon()

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ y: -2 }}
            className={className}
        >            <Card
            className={cn(
                "h-full cursor-pointer transition-all duration-200 hover:shadow-lg border-border/50",
                onClick && "hover:border-primary/50"
            )}
            onClick={onClick}
            data-testid={id}
        >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center gap-2">
                        <div className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br shadow-sm",
                            gradient
                        )}>
                            <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-sm font-medium">{title}</CardTitle>
                            {description && (
                                <p className="text-xs text-muted-foreground mt-1">{description}</p>
                            )}
                        </div>
                    </div>
                    {badge && (
                        <Badge variant={badge.variant} className="text-xs">
                            {badge.text}
                        </Badge>
                    )}
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline justify-between">
                        <div className="text-2xl font-bold">{value}</div>
                        {change && (
                            <div className={cn("flex items-center gap-1 text-xs", getChangeColor())}>
                                <ChangeIcon className="w-3 h-3" />
                                <span className="font-medium">
                                    {change.value > 0 ? '+' : ''}{change.value}%
                                </span>
                                <span className="text-muted-foreground">
                                    {change.period}
                                </span>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    )
}

interface OverviewMetricsProps {
    onCardClick?: (metric: string) => void
    className?: string
}

export function OverviewMetrics({ onCardClick, className }: OverviewMetricsProps) {
    const metrics = [
        {
            id: 'total-memories',
            title: 'Memory Bank',
            value: '2,847',
            change: { value: 12.5, period: 'vs last month', direction: 'up' as const },
            icon: Brain,
            description: 'Stored memory entries',
            badge: { text: 'Active', variant: 'default' as const },
            gradient: 'from-blue-500 to-purple-600'
        },
        {
            id: 'memory-usage',
            title: 'Memory Usage',
            value: '45.2 GB',
            change: { value: 8.1, period: 'vs last week', direction: 'up' as const },
            icon: Database,
            description: 'Storage utilization',
            badge: { text: 'Optimal', variant: 'secondary' as const }, gradient: 'from-green-500 to-teal-600'
        },
        {
            id: 'cache-performance',
            title: 'Cache Hit Rate',
            value: '94.7%',
            change: { value: 1.2, period: 'vs last week', direction: 'up' as const },
            icon: Database,
            description: 'Cache efficiency',
            badge: { text: 'Excellent', variant: 'secondary' as const },
            gradient: 'from-emerald-500 to-teal-600'
        },
        {
            id: 'optimization-status',
            title: 'Optimization Status',
            value: 'Active',
            change: { value: 0, period: 'running', direction: 'neutral' as const },
            icon: Activity,
            description: 'System optimization',
            badge: { text: 'Running', variant: 'default' as const },
            gradient: 'from-blue-500 to-cyan-600'
        },
        {
            id: 'active-agents',
            title: 'Connected Agents',
            value: '12',
            change: { value: 2, period: 'new today', direction: 'up' as const },
            icon: Users,
            description: 'Connected AI agents',
            badge: { text: 'Online', variant: 'default' as const },
            gradient: 'from-orange-500 to-red-600'
        },
        {
            id: 'query-performance',
            title: 'Avg Query Time',
            value: '127ms',
            change: { value: -15.2, period: 'vs last week', direction: 'down' as const },
            icon: Zap,
            description: 'Search performance',
            badge: { text: 'Fast', variant: 'secondary' as const },
            gradient: 'from-yellow-500 to-orange-600'
        },
        {
            id: 'memory-quality',
            title: 'Memory Quality',
            value: '94.8%',
            change: { value: 2.1, period: 'vs last month', direction: 'up' as const },
            icon: Shield,
            description: 'Quality score',
            badge: { text: 'Excellent', variant: 'default' as const },
            gradient: 'from-purple-500 to-pink-600'
        },
        {
            id: 'uptime',
            title: 'System Uptime',
            value: '99.97%',
            change: { value: 0, period: 'stable', direction: 'neutral' as const },
            icon: Activity,
            description: 'Availability',
            badge: { text: 'Stable', variant: 'outline' as const },
            gradient: 'from-indigo-500 to-blue-600'
        }
    ]

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    }

    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", className)}
        >
            {metrics.map((metric) => (
                <motion.div key={metric.id} variants={item}>
                    <MetricCard
                        {...metric}
                        onClick={() => onCardClick?.(metric.id)}
                    />
                </motion.div>
            ))}
        </motion.div>
    )
}

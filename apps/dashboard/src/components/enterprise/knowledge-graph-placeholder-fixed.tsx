'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    RefreshCw,
    Database,
    Network,
    GitBranch,
    Settings,
    Play
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'

interface Entity {
    name: string;
    entityType: string;
    observations: string[];
}

interface Relation {
    from: string;
    to: string;
    relationType: string;
}

interface GraphData {
    entities: Entity[];
    relations: Relation[];
    metadata?: {
        source: string;
        timestamp: string;
        mcpEnabled: boolean;
    };
}

const features = [
    {
        id: 'real-time',
        title: 'Real-time Updates',
        description: 'Live synchronization with memory changes',
        icon: RefreshCw,
        status: 'planned',
        comingSoon: 'Q2 2024'
    },
    {
        id: 'interactive',
        title: 'Interactive Exploration',
        description: 'Drag, zoom, and explore memory networks',
        icon: Network,
        status: 'planned',
        comingSoon: 'Q2 2024'
    },
    {
        id: 'analytics',
        title: 'Graph Analytics',
        description: 'Advanced insights into memory patterns',
        icon: Database,
        status: 'planned',
        comingSoon: 'Q3 2024'
    },
    {
        id: 'export',
        title: 'Export & Share',
        description: 'Export visualizations and insights',
        icon: GitBranch,
        status: 'planned',
        comingSoon: 'Q3 2024'
    }
];

export function KnowledgeGraphPlaceholder(): React.JSX.Element {
    const [graphData, setGraphData] = useState<GraphData | null>(null)
    const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null)
    const [selectedFeature, setSelectedFeature] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchGraphData = async (): Promise<void> => {
        setLoading(true)
        setError(null)
        try {
            const response = await fetch('/api/mcp/read-graph')
            if (!response.ok) throw new Error('Failed to fetch graph data')
            const data = await response.json()
            setGraphData(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load graph data')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void fetchGraphData()
    }, [])

    const getEntityTypeColor = (type: string): string => {
        const colors: Record<string, string> = {
            'system': 'bg-blue-100 text-blue-800',
            'agent': 'bg-green-100 text-green-800',
            'configuration': 'bg-purple-100 text-purple-800',
            'status': 'bg-yellow-100 text-yellow-800',
            'milestone': 'bg-orange-100 text-orange-800',
            'test_data': 'bg-gray-100 text-gray-800'
        }
        return colors[type] ?? 'bg-gray-100 text-gray-800'
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Knowledge Graph</h3>
                    <p className="text-sm text-muted-foreground">
                        Real-time visualization of memory relationships
                    </p>
                </div>
                <Button
                    onClick={() => void fetchGraphData()}
                    disabled={loading}
                    size="sm"
                    variant="outline"
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                        <p className="text-red-800">Error: {error}</p>
                    </CardContent>
                </Card>
            )}

            {loading ? (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-muted-foreground">Loading graph data...</span>
                        </div>
                    </CardContent>
                </Card>
            ) : graphData ? (
                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Entities Panel */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Database className="h-5 w-5" />
                                Entities ({graphData.entities?.length ?? 0})
                            </CardTitle>
                            <CardDescription>
                                Memory graph entities and their data
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {graphData.entities?.map((entity, index) => (
                                <motion.div
                                    key={index}
                                    whileHover={{ scale: 1.02 }}
                                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedEntity?.name === entity.name
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50'
                                        }`}
                                    onClick={() => setSelectedEntity(entity)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="font-medium truncate">{entity.name}</h4>
                                        <Badge className={getEntityTypeColor(entity.entityType)}>
                                            {entity.entityType}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        {entity.observations?.length ?? 0} observations
                                    </p>
                                </motion.div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Relations & Details Panel */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Network className="h-5 w-5" />
                                {selectedEntity ? 'Entity Details' : 'Relations'}
                            </CardTitle>
                            <CardDescription>
                                {selectedEntity
                                    ? `Details for ${selectedEntity.name}`
                                    : `${graphData.relations?.length ?? 0} entity relationships`
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {selectedEntity ? (
                                <div className="space-y-4">
                                    <div>
                                        <h5 className="font-medium mb-2">Observations</h5>
                                        <div className="space-y-2">
                                            {selectedEntity.observations?.map((observation, idx) => (
                                                <p key={idx} className="text-sm p-2 bg-muted rounded">
                                                    {observation}
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setSelectedEntity(null)}
                                    >
                                        Back to Relations
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {graphData.relations?.map((relation, idx) => (
                                        <div key={idx} className="p-3 border rounded-lg">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="font-medium">{relation.from}</span>
                                                <GitBranch className="h-3 w-3 text-muted-foreground" />
                                                <Badge variant="outline" className="text-xs">
                                                    {relation.relationType}
                                                </Badge>
                                                <GitBranch className="h-3 w-3 text-muted-foreground rotate-180" />
                                                <span className="font-medium">{relation.to}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!graphData.relations || graphData.relations.length === 0) && (
                                        <p className="text-muted-foreground text-center py-4">
                                            No relations found
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">No graph data available</p>
                    </CardContent>
                </Card>
            )}

            {/* Metadata */}
            {graphData?.metadata && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Source: {graphData.metadata.source}</span>
                            <span>Updated: {new Date(graphData.metadata.timestamp).toLocaleTimeString()}</span>
                            <Badge variant={graphData.metadata.mcpEnabled ? 'default' : 'secondary'}>
                                MCP {graphData.metadata.mcpEnabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Preview Placeholder */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
            >
                <Card className="relative overflow-hidden">
                    <CardContent className="p-8">
                        <div className="flex items-center justify-center h-80 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                            <div className="text-center space-y-4">
                                <motion.div
                                    animate={{
                                        rotate: 360,
                                        scale: [1, 1.1, 1]
                                    }}
                                    transition={{
                                        rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                                        scale: { duration: 2, repeat: Infinity }
                                    }}
                                    className="mx-auto w-16 h-16 text-blue-500"
                                >
                                    <Network className="w-full h-full" />
                                </motion.div>
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                                        3D Memory Network Visualization
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-400">
                                        Interactive graph coming soon with WebGL rendering
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {features.map((feature, index) => (
                    <motion.div
                        key={feature.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                    >
                        <Card
                            className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${selectedFeature === feature.id
                                ? 'ring-2 ring-blue-500 shadow-lg'
                                : ''
                                }`}
                            onClick={() => setSelectedFeature(
                                selectedFeature === feature.id ? null : feature.id
                            )}
                        >
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                                            <feature.icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{feature.title}</CardTitle>
                                            <CardDescription className="mt-1">
                                                {feature.description}
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge
                                        variant={feature.status === 'planned' ? 'default' : 'secondary'}
                                        className="ml-2"
                                    >
                                        {feature.comingSoon}
                                    </Badge>
                                </div>
                            </CardHeader>

                            {selectedFeature === feature.id && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <CardContent className="pt-0">
                                        <div className="border-t pt-4">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                                                This feature will provide advanced visualization capabilities for understanding memory relationships and patterns.
                                            </p>
                                            <div className="flex space-x-2">
                                                <Button size="sm" variant="outline" disabled>
                                                    <Settings className="w-4 h-4 mr-2" />
                                                    Configure
                                                </Button>
                                                <Button size="sm" variant="outline" disabled>
                                                    <Play className="w-4 h-4 mr-2" />
                                                    Preview
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </motion.div>
                            )}
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Call to Action */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 }}
                className="text-center space-y-4 py-8"
            >
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Want to be notified when this launches?
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                    The Knowledge Graph Visualizer will revolutionize how you explore and understand your AI memory networks.
                </p>
                <Button className="mt-4" disabled>
                    Notify Me When Available
                </Button>
            </motion.div>
        </div>
    )
}

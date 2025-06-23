"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  GitBranch,
  Network,
  Zap,
  Eye,
  RefreshCw,
  Database,
  Play,
  Settings,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";

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

export function KnowledgeGraphPlaceholder() {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGraphData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/mcp/read-graph");
      if (!response.ok) {
        throw new Error("Failed to fetch graph data");
    }
      const data = await response.json();
      setGraphData(data);
    } catch (_err) {
      setError(
        err instanceof Error ? err.message : "Failed to load graph data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchGraphData();
  }, []);

  const getEntityTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      system: "bg-blue-100 text-blue-800",
      agent: "bg-green-100 text-green-800",
      configuration: "bg-purple-100 text-purple-800",
      status: "bg-yellow-100 text-yellow-800",
      milestone: "bg-orange-100 text-orange-800",
      test_data: "bg-gray-100 text-gray-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

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
          onClick={fetchGraphData}
          disabled={loading}
          size="sm"
          variant="outline"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
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
              <span className="ml-2 text-muted-foreground">
                Loading graph data...
              </span>
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
                Entities ({graphData.entities?.length || 0})
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
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedEntity?.name === entity.name
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
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
                    {entity.observations?.length || 0} observations
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
                {selectedEntity ? "Entity Details" : "Relations"}
              </CardTitle>
              <CardDescription>
                {selectedEntity
                  ? `Details for ${selectedEntity.name}`
                  : `${graphData.relations?.length || 0} entity relationships`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedEntity ? (
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium mb-2">Observations</h5>
                    <div className="space-y-2">
                      {selectedEntity.observations?.map(
                        (observation, index) => (
                          <p
                            key={index}
                            className="text-sm p-2 bg-muted rounded"
                          >
                            {observation}
                          </p>
                        ),
                      )}
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
                  {graphData.relations?.map((relation, index) => (
                    <div key={index} className="p-3 border rounded-lg">
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
                  {(!graphData.relations ?? graphData.relations.length === 0) && (
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
            <p className="text-center text-muted-foreground">
              No graph data available
            </p>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      {graphData?.metadata && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Source: {graphData.metadata.source}</span>
              <span>
                Updated:{" "}
                {new Date(graphData.metadata.timestamp).toLocaleTimeString()}
              </span>
              <Badge
                variant={
                  graphData.metadata.mcpEnabled ? "default" : "secondary"
                }
              >
                MCP {graphData.metadata.mcpEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

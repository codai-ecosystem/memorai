"use client";

import { useState } from "react";
import {
  Home,
  Search,
  Brain,
  BarChart3,
  Settings,
  Database,
  Users,
  Shield,
  Activity,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "../../lib/utils";

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

const sidebarItems = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "memories", label: "Memories", icon: Brain },
  { id: "search", label: "Search", icon: Search },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "agents", label: "Agents", icon: Users },
  { id: "knowledge", label: "Knowledge Graph", icon: Database },
  { id: "activity", label: "Activity Log", icon: Activity },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "security", label: "Security", icon: Shield },
  { id: "settings", label: "Settings", icon: Settings },
];

export function DashboardSidebar({
  activeTab,
  onTabChange,
  className,
}: DashboardSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      role="navigation"
      data-testid="dashboard-sidebar"
      className={cn(
        "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700",
        "transition-all duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64",
        className,
      )}
    >
      <div className="flex flex-col h-full">
        {/* Collapse Toggle */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "w-full flex items-center justify-center p-2 rounded-lg",
              "hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
              "text-gray-600 dark:text-gray-300",
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
            <span className="sr-only">
              {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </span>
          </button>
        </div>{" "}
        {/* Navigation Items */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => {
                      console.log(
                        "Sidebar nav clicked:",
                        item.id,
                        "current activeTab:",
                        activeTab,
                      );
                      onTabChange?.(item.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onTabChange?.(item.id);
                      }
                    }}
                    data-testid={`nav-${item.id}`}
                    aria-label={item.label}
                    className={cn(
                      "w-full flex items-center space-x-3 px-3 py-2 rounded-lg",
                      "text-left transition-all duration-200",
                      isActive
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
                      isCollapsed && "justify-center",
                    )}
                    title={isCollapsed ? item.label : undefined}
                  >
                    {" "}
                    <Icon
                      className={cn(
                        "h-5 w-5 flex-shrink-0",
                        isActive
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-gray-500 dark:text-gray-400",
                      )}
                    />
                    {!isCollapsed && (
                      <span className="font-medium truncate">{item.label}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        {/* Status Indicator */}
        {!isCollapsed && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                  System Online
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 truncate">
                  All services operational
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

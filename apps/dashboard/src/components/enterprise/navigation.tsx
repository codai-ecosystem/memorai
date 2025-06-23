"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  LayoutDashboard as Dashboard,
  Search,
  BarChart3,
  Settings,
  Database,
  Users,
  Shield,
  Zap,
  Plus,
  Bell,
  User,
  Moon,
  Sun,
  Monitor,
  ChevronLeft,
  ChevronRight,
  Home,
  Archive,
  Activity,
  PieChart,
  FileText,
  Layers,
} from "lucide-react";

import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";






interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  "data-testid"?: string;
}

const sidebarItems = [
  {
    id: "overview",
    label: "Overview",
    icon: Dashboard,
    badge: null,
    description: "Dashboard overview and key metrics",
  },
  {
    id: "memories",
    label: "Memory Bank",
    icon: Brain,
    badge: "Live",
    description: "AI memory storage and retrieval",
  },
  {
    id: "search",
    label: "Smart Search",
    icon: Search,
    badge: null,
    description: "Advanced memory search and discovery",
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
    badge: "Pro",
    description: "Memory usage analytics and insights",
  },
  {
    id: "visualizer",
    label: "Knowledge Graph",
    icon: Layers,
    badge: "New",
    description: "Visual memory network explorer",
  },
  {
    id: "agents",
    label: "AI Agents",
    icon: Users,
    badge: "12",
    description: "Connected AI agents and their memory",
  },
  {
    id: "security",
    label: "Security",
    icon: Shield,
    badge: null,
    description: "Memory security and access control",
  },
  {
    id: "performance",
    label: "Performance",
    icon: Zap,
    badge: null,
    description: "System performance and optimization",
  },
  {
    id: "archive",
    label: "Archive",
    icon: Archive,
    badge: null,
    description: "Archived memories and backups",
  },
  {
    id: "reports",
    label: "Reports",
    icon: FileText,
    badge: null,
    description: "Memory reports and exports",
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    badge: null,
    description: "System configuration and settings",
  },
];

export function EnterpriseNavigation({
  collapsed,
  onToggle,
  activeTab,
  onTabChange,
  "data-testid": dataTestId,
}: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () : void => {
    if (!mounted) {
        return;
    }

    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const getThemeIcon = () => {
    if (!mounted) {
        return Monitor;
    }
    switch (theme) {
      case "light":
        return Sun;
      case "dark":
        return Moon;
      default:
        return Monitor;
    }
  };

  const ThemeIcon = getThemeIcon();

  return (
    <motion.aside
      initial={{ width: collapsed ? 80 : 280 }}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="relative flex flex-col h-screen bg-card border-r border-border/50 shadow-lg"
      data-testid={dataTestId}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-3"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <Brain className="w-6 h-6 text-white" />
              </div>{" "}
              <div>
                {" "}
                <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Memorai Dashboard
                </h2>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  Memorai Dashboard running in development mode | Server:
                  Operational
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="w-8 h-8 rounded-lg hover:bg-accent"
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <motion.div
              key={item.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {" "}
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-11 rounded-lg transition-all duration-200",
                  isActive &&
                    "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border border-blue-200/50 dark:border-blue-800/50 shadow-sm",
                  !collapsed && "px-3",
                  collapsed && "px-0 justify-center",
                )}
                onClick={() => onTabChange(item.id)}
                title={collapsed ? item.label : undefined}
                data-testid={`nav-${item.id}`}
              >
                <Icon
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isActive && "text-blue-600 dark:text-blue-400",
                  )}
                />

                <AnimatePresence mode="wait">
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center justify-between flex-1"
                    >
                      <span
                        className={cn(
                          "font-medium text-sm",
                          isActive && "text-blue-600 dark:text-blue-400",
                        )}
                      >
                        {item.label}
                      </span>

                      {item.badge && (
                        <Badge
                          variant={
                            item.badge === "Live" ? "default" : "secondary"
                          }
                          className={cn(
                            "text-xs px-2 py-0.5",
                            item.badge === "Live" &&
                              "bg-green-500 text-white animate-pulse",
                            item.badge === "Pro" &&
                              "bg-gradient-to-r from-orange-400 to-pink-400 text-white",
                            item.badge === "New" &&
                              "bg-gradient-to-r from-blue-400 to-purple-400 text-white",
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </motion.div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border/50 space-y-2">
        {/* User Profile */}
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors",
            collapsed && "justify-center",
          )}
        >
          <Avatar className="w-8 h-8">
            <AvatarImage src="/avatars/user.png" alt="User" />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium">
              AI
            </AvatarFallback>
          </Avatar>

          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 min-w-0"
              >
                <p className="text-sm font-medium truncate">AI Assistant</p>
                <p className="text-xs text-muted-foreground truncate">
                  Enterprise User
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className={cn("flex gap-1", collapsed ? "flex-col" : "flex-row")}>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg"
            title="Toggle theme"
          >
            <ThemeIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
          </Button>{" "}
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg"
            title="Settings"
            onClick={() => onTabChange("settings")}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.aside>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Download,
  Upload,
  RefreshCw,
  Filter,
  Calendar,
  ChevronDown,
  Command,
  Sparkles,
  Zap,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

interface EnterpriseHeaderProps {
  title: string;
  subtitle?: string;
  activeTab: string;
  onSearch?: (query: string) => void;
  onQuickAction?: (action: string) => void;
  className?: string;
  "data-testid"?: string;
}

export function EnterpriseHeader({
  title,
  subtitle,
  activeTab,
  onSearch,
  onQuickAction,
  className,
  "data-testid": dataTestId,
}: EnterpriseHeaderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [systemStatus, setSystemStatus] = useState({
    status: "operational",
    memoryUsage: 45,
    activeAgents: 12,
    lastSync: new Date(),
  }); // Simulate occasional API errors for testing
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly simulate errors for testing
      if (Math.random() < 0.1) {
        // 10% chance of error
        setAnnouncements((prev) => [
          ...prev,
          "Failed to fetch performance data",
        ]);
        setTimeout(() => {
          setAnnouncements((prev) => prev.slice(1));
        }, 3000);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Listen for cache clearing events
  useEffect(() => {
    const handleCacheCleared = (event: CustomEvent) => {
      setAnnouncements((prev) => [...prev, event.detail.message]);
      setTimeout(() => {
        setAnnouncements((prev) => prev.slice(1));
      }, 3000);
    };

    window.addEventListener(
      "cache-cleared",
      handleCacheCleared as EventListener,
    );
    return () =>
      window.removeEventListener(
        "cache-cleared",
        handleCacheCleared as EventListener,
      );
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "operational":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const toggleTheme = () : void => {
    const themes: Array<"light" | "dark" | "system"> = [
      "light",
      "dark",
      "system",
    ];
    const currentIndex = themes.indexOf(theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    setTheme(nextTheme);

    // Apply theme to document
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.add("contrast-more");
    } else if (nextTheme === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.remove("contrast-more");
    } else {
      // System theme - detect and apply
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("contrast-more", isDark);
    }
  };

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return Sun;
      case "dark":
        return Moon;
      default:
        return Monitor;
    }
  };

  const quickActions = [
    {
      id: "create",
      label: "Create Memory",
      icon: Plus,
      variant: "default" as const,
      shortcut: "⌘N",
      testId: "header-quick-action-add-memory",
    },
    {
      id: "import",
      label: "Import Data",
      icon: Upload,
      variant: "outline" as const,
      shortcut: "⌘I",
      testId: "header-quick-action-bulk-import",
    },
    {
      id: "export",
      label: "Export",
      icon: Download,
      variant: "outline" as const,
      shortcut: "⌘E",
      testId: "header-quick-action-export",
    },
    {
      id: "sync",
      label: "AI Assist",
      icon: Sparkles,
      variant: "outline" as const,
      shortcut: "⌘R",
      testId: "header-quick-action-ai-assist",
    },
  ];

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className,
      )}
      data-testid={dataTestId}
    >
      <div className="flex items-center justify-between px-6 py-4">
        {/* Title Section */}
        <div className="flex items-center gap-4">
          <div>
            {" "}
            <motion.h2
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent"
            >
              {title}
            </motion.h2>
            {subtitle && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-sm text-muted-foreground mt-1"
              >
                {subtitle}
              </motion.p>
            )}
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-2">
            {" "}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border/50">
              <div
                className={cn(
                  "w-2 h-2 rounded-full",
                  getStatusColor(systemStatus.status),
                )}
              />
              <span className="text-xs font-medium">
                {systemStatus.status === "operational"
                  ? "System Online"
                  : systemStatus.status}
              </span>
            </div>
            {systemStatus.status === "operational" && (
              <Badge variant="outline" className="text-xs">
                All services operational
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1">
              <Zap className="w-3 h-3" />
              {systemStatus.memoryUsage}% Memory
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="w-3 h-3" />
              {systemStatus.activeAgents} Agents
            </Badge>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="flex items-center gap-4">
          {/* Advanced Search */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />{" "}
              <Input
                type="text"
                placeholder="Search memories, agents, or insights..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className={cn(
                  "w-80 pl-10 pr-12 h-10 rounded-lg transition-all duration-200",
                  isSearchFocused &&
                    "ring-2 ring-blue-500/20 border-blue-300 dark:border-blue-700",
                )}
                data-testid="header-search-input"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">⌘</kbd>
                <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">K</kbd>
              </div>
            </form>

            {/* Search Results Dropdown would go here */}
          </motion.div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            {quickActions.map((action, index) => {
              const Icon = action.icon;

              return (
                <motion.div
                  key={action.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                >
                  {" "}
                  <Button
                    variant={action.variant}
                    size="sm"
                    onClick={() => onQuickAction?.(action.id)}
                    className="gap-2 h-9"
                    title={`${action.label} (${action.shortcut})`}
                    data-testid={action.testId}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{action.label}</span>
                  </Button>
                </motion.div>
              );
            })}{" "}
          </div>

          {/* Theme Toggle */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.6 }}
          >
            {" "}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="w-8 h-8 rounded-lg"
              title="Toggle theme"
              data-testid="theme-toggle-button"
            >
              {React.createElement(getThemeIcon(), { className: "w-4 h-4" })}
            </Button>
          </motion.div>

          {/* Filter Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <Button variant="outline" size="sm" className="gap-2 h-9">
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filter</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </motion.div>
        </div>
      </div>{" "}
      {/* Secondary Header Bar (for breadcrumbs, tabs, etc.) */}
      <div className="px-6 py-2 border-t border-border/30 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Dashboard</span>
            <span>/</span>
            <span className="text-foreground font-medium capitalize">
              {activeTab}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>
              Last updated: {systemStatus.lastSync.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>{" "}
      {/* Live region for accessibility announcements */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
        aria-label="System status announcements"
      >
        {announcements.length > 0
          ? announcements[announcements.length - 1]
          : `System operational. Memory: ${systemStatus.memoryUsage}%. Agents: ${systemStatus.activeAgents}.`}
      </div>
    </header>
  );
}

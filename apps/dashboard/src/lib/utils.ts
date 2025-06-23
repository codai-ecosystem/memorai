import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const target = new Date(date);
  const diffInMs = now.getTime() - target.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
        return "just now";
    }
  if (diffInMinutes < 60) {
        return `${diffInMinutes}m ago`;
    }
  if (diffInHours < 24) {
        return `${diffInHours}h ago`;
    }
  if (diffInDays < 7) {
        return `${diffInDays}d ago`;
    }

  return formatDate(date);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
        return text;
    }
  return text.slice(0, maxLength) + "...";
}

export function getMemoryTypeColor(type: string): string {
  const colors: Record<string, string> = {
    conversation:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    document:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    note: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    thread:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    task: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    personality:
      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
    emotion: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300",
  };
  return (
    colors[type] ||
    "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  );
}

export function getImportanceColor(importance?: number): string {
  if (!importance) {
        return "bg-gray-100 text-gray-800";
    }

  if (importance >= 0.8)
    {
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
    }
  if (importance >= 0.6)
    {
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
    }
  if (importance >= 0.4)
    {
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    }
  return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
}

export function formatImportance(importance?: number): string {
  if (!importance) {
        return "Unknown";
    }
  return `${Math.round(importance * 100)}%`;
}

export function debounce<T extends (...args: unknown[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
        clearTimeout(timeout);
    }
    timeout = setTimeout(() => func(...args), wait);
  };
}

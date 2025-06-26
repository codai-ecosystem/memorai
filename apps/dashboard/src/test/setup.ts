import '@testing-library/jest-dom';
import { vi } from 'vitest';
import * as React from 'react';

// Add React 19 compatibility
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Set NODE_ENV for tests using vi.stubEnv
vi.stubEnv('NODE_ENV', 'test');

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    themes: ['light', 'dark'],
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    p: 'p',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Global fetch mock
global.fetch = vi.fn();

// Mock API responses
export const mockApiResponse = (data: any, ok = true) => {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    status: ok ? 200 : 500,
    statusText: ok ? 'OK' : 'Internal Server Error',
  } as Response);
};

// Mock memory store data
export const mockMemoryData = {
  memories: [
    {
      id: 'mem-1',
      content: 'Test memory content',
      type: 'conversation' as const,
      metadata: {
        agentId: 'test-agent',
        timestamp: '2025-06-12T10:00:00Z',
        tags: ['test', 'example'],
        importance: 8,
        similarity: 0.95,
      },
    },
    {
      id: 'mem-2',
      content: 'Another test memory',
      type: 'document' as const,
      metadata: {
        agentId: 'test-agent-2',
        timestamp: '2025-06-12T11:00:00Z',
        tags: ['document', 'important'],
        importance: 9,
        similarity: 0.87,
      },
    },
  ],
  stats: {
    totalMemories: 150,
    totalAgents: 5,
    averageImportance: 7.5,
    memoryTypes: {
      conversation: 45,
      document: 30,
      note: 25,
      task: 20,
      thread: 15,
      personality: 10,
      emotion: 5,
    },
    recentActivity: [
      { date: '2025-06-12', count: 12 },
      { date: '2025-06-11', count: 8 },
      { date: '2025-06-10', count: 15 },
    ],
    topAgents: [
      { agentId: 'agent-1', memoryCount: 45 },
      { agentId: 'agent-2', memoryCount: 32 },
      { agentId: 'agent-3', memoryCount: 28 },
    ],
  },
};

export const mockConfigData = {
  api: {
    baseUrl: 'http://localhost:6367',
    timeout: 30000,
    version: 'v1',
  },
  websocket: 'ws://localhost:6367',
  features: {
    analytics: true,
    export: true,
    realtime: true,
    advanced: true,
  },
  ui: {
    theme: 'auto',
    animations: true,
    soundEffects: false,
    compactMode: false,
  },
};

// Setup DOM environment
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const MockIcon = (props: Record<string, any>) =>
    React.createElement('svg', { 'data-testid': 'mock-icon', ...props });

  return {
    Plus: MockIcon,
    FileText: MockIcon,
    Brain: MockIcon,
    Search: MockIcon,
    Bell: MockIcon,
    Settings: MockIcon,
    User: MockIcon,
    Users: MockIcon,
    Clock: MockIcon,
    TrendingUp: MockIcon,
    CircleCheckBig: MockIcon,
    Monitor: MockIcon,
    Sun: MockIcon,
    Moon: MockIcon,
    Filter: MockIcon,
    Download: MockIcon,
    Upload: MockIcon,
    MoreVertical: MockIcon,
    Calendar: MockIcon,
    Tag: MockIcon,
    SortAsc: MockIcon,
    SortDesc: MockIcon,
    AlertCircle: MockIcon,
    CheckCircle: MockIcon,
    XCircle: MockIcon,
    Info: MockIcon,
    ArrowRight: MockIcon,
    ArrowLeft: MockIcon,
    ChevronDown: MockIcon,
    ChevronUp: MockIcon,
    ChevronRight: MockIcon,
    ChevronLeft: MockIcon,
    BarChart3: MockIcon,
    PieChart: MockIcon,
    Activity: MockIcon,
    Database: MockIcon,
    Globe: MockIcon,
    Shield: MockIcon,
    Zap: MockIcon,
    RefreshCw: MockIcon,
    Eye: MockIcon,
    EyeOff: MockIcon,
    Copy: MockIcon,
    Edit: MockIcon,
    Trash: MockIcon,
    Trash2: MockIcon,
    Save: MockIcon,
    X: MockIcon,
    Check: MockIcon,
    Loader: MockIcon,
    MenuIcon: MockIcon,
    Home: MockIcon,
    Folder: MockIcon,
    File: MockIcon,
    Star: MockIcon,
    Heart: MockIcon,
    Bookmark: MockIcon,
    Share: MockIcon,
    Link: MockIcon,
    ExternalLink: MockIcon,
    Mail: MockIcon,
    Phone: MockIcon,
    MessageSquare: MockIcon,
    Send: MockIcon,
    Paperclip: MockIcon,
    Image: MockIcon,
    Video: MockIcon,
    Music: MockIcon,
    HelpCircle: MockIcon,
    AlertTriangle: MockIcon,
    ShieldCheck: MockIcon,
    Lock: MockIcon,
    Unlock: MockIcon,
    Key: MockIcon,
    Wifi: MockIcon,
    WifiOff: MockIcon,
    Bluetooth: MockIcon,
    Battery: MockIcon,
    Power: MockIcon,
    Volume: MockIcon,
    VolumeX: MockIcon,
    Mic: MockIcon,
    MicOff: MockIcon,
    Camera: MockIcon,
    CameraOff: MockIcon,
  };
});

// Mock react-hot-toast
vi.mock('react-hot-toast', () => {
  const toastFn = vi.fn();

  const toast = Object.assign(toastFn, {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  });

  return {
    default: toast,
    toast,
    Toaster: () => 'div',
  };
});

// Keep sonner mock in case it's used elsewhere
vi.mock('sonner', () => {
  const toastFn = vi.fn();

  const toast = Object.assign(toastFn, {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  });

  return {
    toast,
    Toaster: () => 'div',
  };
});

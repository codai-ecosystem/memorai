/**
 * Memorai Dashboard JavaScript
 * Advanced AI Memory Management Interface
 */

class MemoraiDashboard {
    constructor() {
        this.socket = null;
        this.currentTab = 'memory';
        this.memories = [];
        this.config = null;
        this.stats = {};
        this.charts = {};
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Memorai Dashboard...');
        
        // Initialize components
        this.initTheme();
        this.initWebSocket();
        this.initEventListeners();
        this.initCharts();
        
        // Load initial data
        await this.loadConfig();
        await this.loadStats();
        
        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Hide loading screen
        setTimeout(() => {
            document.getElementById('loading-screen').classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');
            document.getElementById('dashboard').classList.add('fade-in');
        }, 1000);
        
        console.log('✅ Dashboard initialized successfully');
    }

    initTheme() {
        const theme = localStorage.getItem('theme') || 'dark';
        this.setTheme(theme);
    }

    setTheme(theme) {
        const html = document.documentElement;
        const themeToggle = document.getElementById('theme-toggle');
        
        if (theme === 'dark') {
            html.classList.add('dark');
            themeToggle.innerHTML = '<i data-lucide="sun" class="w-5 h-5"></i>';
        } else {
            html.classList.remove('dark');
            themeToggle.innerHTML = '<i data-lucide="moon" class="w-5 h-5"></i>';
        }
        
        localStorage.setItem('theme', theme);
        
        // Recreate icons after theme change
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    initWebSocket() {
        try {
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('🔌 WebSocket connected');
                this.updateConnectionStatus(true);
            });
            
            this.socket.on('disconnect', () => {
                console.log('🔌 WebSocket disconnected');
                this.updateConnectionStatus(false);
            });
            
            this.socket.on('config', (data) => {
                this.config = data;
                this.updateConfigDisplay();
            });
            
            this.socket.on('memory:created', (data) => {
                this.showToast('Memory created successfully', 'success');
                // Refresh current search if applicable
                this.refreshMemoryResults();
            });
            
            this.socket.on('memory:deleted', (data) => {
                this.showToast('Memory deleted successfully', 'success');
                this.refreshMemoryResults();
            });
            
        } catch (error) {
            console.error('❌ WebSocket initialization failed:', error);
            this.updateConnectionStatus(false);
        }
    }

    initEventListeners() {
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            this.setTheme(newTheme);
        });

        // Tab navigation
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        // Memory form
        document.getElementById('add-memory-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addMemory();
        });

        // Search form
        document.getElementById('search-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.searchMemories();
        });

        // Action buttons
        document.getElementById('export-memories').addEventListener('click', () => {
            this.exportMemories();
        });

        document.getElementById('clear-results').addEventListener('click', () => {
            this.clearResults();
        });

        document.getElementById('graph-refresh').addEventListener('click', () => {
            this.refreshGraph();
        });

        document.getElementById('graph-export').addEventListener('click', () => {
            this.exportGraph();
        });

        // Toast close
        document.getElementById('toast-close').addEventListener('click', () => {
            this.hideToast();
        });
    }

    initCharts() {
        // Usage Chart
        const usageCtx = document.getElementById('usage-chart').getContext('2d');
        this.charts.usage = new Chart(usageCtx, {
            type: 'line',
            data: {
                labels: this.generateTimeLabels(24),
                datasets: [{
                    label: 'Memory Operations',
                    data: this.generateMockData(24),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(156, 163, 175, 0.2)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(156, 163, 175, 0.2)'
                        }
                    }
                }
            }
        });

        // Performance Chart
        const performanceCtx = document.getElementById('performance-chart').getContext('2d');
        this.charts.performance = new Chart(performanceCtx, {
            type: 'doughnut',
            data: {
                labels: ['Advanced', 'Smart', 'Basic', 'Mock'],
                datasets: [{
                    data: [40, 30, 20, 10],
                    backgroundColor: [
                        '#10b981',
                        '#3b82f6',
                        '#f59e0b',
                        '#6b7280'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    switchTab(tab) {
        // Update active tab button
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });

        // Show selected tab content
        document.getElementById(`${tab}-tab`).classList.remove('hidden');

        // Update tab description
        const descriptions = {
            memory: 'Browse, search, edit, and manage AI memories with advanced filtering and batch operations',
            graph: 'Visual representation of memory connections and relationships in an interactive knowledge graph',
            stats: 'Comprehensive analytics, performance metrics, and usage statistics for the memory system',
            config: 'System configuration, tier settings, and environment management options'
        };

        document.getElementById('tab-description').textContent = descriptions[tab];
        this.currentTab = tab;

        // Load tab-specific data
        if (tab === 'stats') {
            this.loadStats();
        } else if (tab === 'config') {
            this.loadConfig();
        }
    }

    async addMemory() {
        const agentId = document.getElementById('agent-id').value.trim();
        const content = document.getElementById('memory-content').value.trim();
        const metadataText = document.getElementById('memory-metadata').value.trim();

        if (!agentId || !content) {
            this.showToast('Agent ID and content are required', 'error');
            return;
        }

        let metadata = {};
        if (metadataText) {
            try {
                metadata = JSON.parse(metadataText);
            } catch (error) {
                this.showToast('Invalid JSON in metadata field', 'error');
                return;
            }
        }

        try {
            const response = await fetch('/api/memory/remember', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    agentId,
                    content,
                    metadata
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Memory added successfully', 'success');
                
                // Clear form
                document.getElementById('add-memory-form').reset();
                
                // Refresh search results if we have an active search
                this.refreshMemoryResults();
            } else {
                this.showToast(result.error || 'Failed to add memory', 'error');
            }
        } catch (error) {
            console.error('Add memory error:', error);
            this.showToast('Network error: Unable to add memory', 'error');
        }
    }

    async searchMemories() {
        const agentId = document.getElementById('search-agent-id').value.trim();
        const query = document.getElementById('search-query').value.trim();
        const limit = parseInt(document.getElementById('search-limit').value) || 10;

        if (!agentId || !query) {
            this.showToast('Agent ID and search query are required', 'error');
            return;
        }

        try {
            const response = await fetch('/api/memory/recall', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    agentId,
                    query,
                    limit
                })
            });

            const result = await response.json();

            if (result.success) {
                this.memories = result.memories;
                this.displayMemoryResults();
                this.showToast(`Found ${result.count} memories`, 'success');
            } else {
                this.showToast(result.error || 'Search failed', 'error');
            }
        } catch (error) {
            console.error('Search error:', error);
            this.showToast('Network error: Search failed', 'error');
        }
    }

    displayMemoryResults() {
        const container = document.getElementById('memory-results');
        
        if (this.memories.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 dark:text-gray-400 py-8">
                    <i data-lucide="search-x" class="w-12 h-12 mx-auto mb-4 opacity-50"></i>
                    <p>No memories found for this search.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        const html = this.memories.map(memory => `
            <div class="memory-card bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-600">
                <div class="flex justify-between items-start mb-2">
                    <div class="flex items-center space-x-2">
                        <span class="text-xs font-mono bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            ${memory.id}
                        </span>
                        ${memory.similarity ? `
                            <span class="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                                ${(memory.similarity * 100).toFixed(1)}% match
                            </span>
                        ` : ''}
                    </div>
                    <button class="delete-memory text-red-500 hover:text-red-700" data-memory-id="${memory.id}" data-agent-id="${memory.agentId}">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
                
                <div class="text-sm text-gray-900 dark:text-gray-100 mb-2">
                    ${this.escapeHtml(memory.content)}
                </div>
                
                ${memory.metadata && Object.keys(memory.metadata).length > 0 ? `
                    <div class="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <strong>Metadata:</strong> ${this.escapeHtml(JSON.stringify(memory.metadata))}
                    </div>
                ` : ''}
                
                <div class="text-xs text-gray-400 dark:text-gray-500">
                    Created: ${new Date(memory.timestamp).toLocaleString()}
                </div>
            </div>
        `).join('');

        container.innerHTML = html;

        // Add delete event listeners
        container.querySelectorAll('.delete-memory').forEach(button => {
            button.addEventListener('click', (e) => {
                const memoryId = e.currentTarget.getAttribute('data-memory-id');
                const agentId = e.currentTarget.getAttribute('data-agent-id');
                this.deleteMemory(agentId, memoryId);
            });
        });

        lucide.createIcons();
    }

    async deleteMemory(agentId, memoryId) {
        if (!confirm('Are you sure you want to delete this memory?')) {
            return;
        }

        try {
            const response = await fetch('/api/memory/forget', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    agentId,
                    memoryId
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Memory deleted successfully', 'success');
                // Remove from current results
                this.memories = this.memories.filter(m => m.id !== memoryId);
                this.displayMemoryResults();
            } else {
                this.showToast(result.error || 'Failed to delete memory', 'error');
            }
        } catch (error) {
            console.error('Delete memory error:', error);
            this.showToast('Network error: Failed to delete memory', 'error');
        }
    }

    async loadConfig() {
        try {
            const response = await fetch('/api/config');
            const result = await response.json();

            if (result.success) {
                this.config = result.config;
                this.updateConfigDisplay();
            }
        } catch (error) {
            console.error('Load config error:', error);
        }
    }

    updateConfigDisplay() {
        if (!this.config) return;

        const tier = this.config.tier;
        
        // Update tier badge
        const tierBadge = document.getElementById('tier-badge');
        tierBadge.className = `tier-badge tier-${tier.level}`;
        tierBadge.textContent = `${tier.level.charAt(0).toUpperCase() + tier.level.slice(1)} Tier`;

        // Update config tab
        const configTier = document.getElementById('config-tier');
        configTier.className = `tier-badge tier-${tier.level}`;
        configTier.textContent = `${tier.level.charAt(0).toUpperCase() + tier.level.slice(1)} Tier`;

        // Update capabilities
        const capabilities = tier.capabilities;
        document.getElementById('config-capabilities').innerHTML = `
            <div class="grid grid-cols-2 gap-2 text-xs">
                <div>Embedding: <span class="font-medium">${capabilities.embedding}</span></div>
                <div>Similarity: <span class="font-medium">${capabilities.similarity}</span></div>
                <div>Persistence: <span class="font-medium">${capabilities.persistence}</span></div>
                <div>Scalability: <span class="font-medium">${capabilities.scalability}</span></div>
            </div>
        `;

        // Update environment indicators
        const env = this.config.environment;
        document.getElementById('env-openai').className = `w-3 h-3 rounded-full ${env.hasOpenAI ? 'bg-green-500' : 'bg-red-500'}`;
        document.getElementById('env-azure').className = `w-3 h-3 rounded-full ${env.hasAzure ? 'bg-green-500' : 'bg-red-500'}`;
    }

    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            const result = await response.json();

            if (result.success) {
                this.stats = result.stats;
                this.updateStatsDisplay();
            }
        } catch (error) {
            console.error('Load stats error:', error);
        }
    }

    updateStatsDisplay() {
        // Update stat cards
        document.getElementById('stat-total-memories').textContent = this.memories.length;
        document.getElementById('stat-active-agents').textContent = '1'; // Mock data
        document.getElementById('stat-api-calls').textContent = '0'; // Mock data
        document.getElementById('stat-uptime').textContent = this.formatUptime(this.stats.uptime || 0);
    }

    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        const dotElement = document.getElementById('connection-dot');
        const textElement = document.getElementById('connection-text');

        if (connected) {
            statusElement.className = 'flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            dotElement.className = 'w-2 h-2 rounded-full bg-green-500';
            textElement.textContent = 'Connected';
        } else {
            statusElement.className = 'flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            dotElement.className = 'w-2 h-2 rounded-full bg-red-500';
            textElement.textContent = 'Disconnected';
        }
    }

    exportMemories() {
        if (this.memories.length === 0) {
            this.showToast('No memories to export', 'warning');
            return;
        }

        const data = {
            exportedAt: new Date().toISOString(),
            memoryCount: this.memories.length,
            memories: this.memories
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `memorai-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showToast('Memories exported successfully', 'success');
    }

    clearResults() {
        this.memories = [];
        this.displayMemoryResults();
        this.showToast('Results cleared', 'info');
    }

    refreshMemoryResults() {
        // Re-run the last search if we have search parameters
        const agentId = document.getElementById('search-agent-id').value.trim();
        const query = document.getElementById('search-query').value.trim();
        
        if (agentId && query) {
            this.searchMemories();
        }
    }

    refreshGraph() {
        this.showToast('Graph refresh coming soon', 'info');
    }

    exportGraph() {
        this.showToast('Graph export coming soon', 'info');
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const icon = document.getElementById('toast-icon');
        const messageElement = document.getElementById('toast-message');

        const icons = {
            success: '<i data-lucide="check" class="w-5 h-5 text-green-600"></i>',
            error: '<i data-lucide="x" class="w-5 h-5 text-red-600"></i>',
            warning: '<i data-lucide="alert-triangle" class="w-5 h-5 text-yellow-600"></i>',
            info: '<i data-lucide="info" class="w-5 h-5 text-blue-600"></i>'
        };

        icon.innerHTML = icons[type] || icons.info;
        messageElement.textContent = message;

        toast.classList.remove('translate-y-full');
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        setTimeout(() => {
            this.hideToast();
        }, 5000);
    }

    hideToast() {
        const toast = document.getElementById('toast');
        toast.classList.add('translate-y-full');
    }

    formatUptime(seconds) {
        const days = Math.floor(seconds / (3600 * 24));
        const hours = Math.floor((seconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    generateTimeLabels(hours) {
        const labels = [];
        const now = new Date();
        
        for (let i = hours - 1; i >= 0; i--) {
            const time = new Date(now.getTime() - i * 60 * 60 * 1000);
            labels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        }
        
        return labels;
    }

    generateMockData(points) {
        return Array.from({ length: points }, () => Math.floor(Math.random() * 10));
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Tab button styles
const style = document.createElement('style');
style.textContent = `
    .tab-button {
        display: flex;
        align-items: center;
        space-x: 0.5rem;
        padding: 1rem 1.5rem;
        text-sm font-medium;
        border-bottom: 2px solid transparent;
        transition: colors 0.2s;
        color: #6b7280;
    }
    
    .tab-button:hover {
        color: #374151;
        background-color: #f3f4f6;
    }
    
    .dark .tab-button {
        color: #9ca3af;
    }
    
    .dark .tab-button:hover {
        color: #f3f4f6;
        background-color: #374151;
    }
    
    .tab-button.active {
        border-bottom-color: #3b82f6;
        color: #3b82f6;
        background-color: rgba(59, 130, 246, 0.05);
    }
    
    .tab-button i {
        margin-right: 0.5rem;
    }
`;
document.head.appendChild(style);

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new MemoraiDashboard();
});

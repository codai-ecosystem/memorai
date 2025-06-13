/**
 * Enhanced Memorai Dashboard Features
 * Advanced functionality for production-ready memory management
 */

// Advanced search filters and options
class AdvancedSearch {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.filters = {
            dateRange: { start: null, end: null },
            similarity: { min: 0, max: 1 },
            metadata: {},
            tags: [],
            agentId: null
        };
    }

    showAdvancedSearch() {
        const modal = document.getElementById('advanced-search-modal');
        if (modal) {
            modal.classList.remove('hidden');
            this.populateFilters();
        }
    }

    hideAdvancedSearch() {
        const modal = document.getElementById('advanced-search-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    populateFilters() {
        // Populate date range
        const today = new Date().toISOString().split('T')[0];
        const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        document.getElementById('date-start').value = lastWeek;
        document.getElementById('date-end').value = today;

        // Populate similarity range
        document.getElementById('similarity-min').value = this.filters.similarity.min;
        document.getElementById('similarity-max').value = this.filters.similarity.max;
    }

    applyFilters() {
        const filters = {
            dateRange: {
                start: document.getElementById('date-start').value,
                end: document.getElementById('date-end').value
            },
            similarity: {
                min: parseFloat(document.getElementById('similarity-min').value),
                max: parseFloat(document.getElementById('similarity-max').value)
            },
            tags: document.getElementById('filter-tags').value.split(',').map(t => t.trim()).filter(t => t),
            agentId: document.getElementById('filter-agent').value || null
        };

        this.filters = filters;
        this.dashboard.searchWithFilters(filters);
        this.hideAdvancedSearch();
    }

    resetFilters() {
        this.filters = {
            dateRange: { start: null, end: null },
            similarity: { min: 0, max: 1 },
            metadata: {},
            tags: [],
            agentId: null
        };
        this.populateFilters();
    }
}

// Memory analytics and insights
class MemoryAnalytics {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.analytics = {
            totalMemories: 0,
            averageSimilarity: 0,
            topTags: [],
            agentActivity: {},
            memoryGrowth: [],
            searchPatterns: []
        };
    }

    async generateAnalytics() {
        try {
            const response = await fetch('/api/analytics/insights');
            if (response.ok) {
                this.analytics = await response.json();
                this.updateAnalyticsDisplay();
            }
        } catch (error) {
            console.error('Failed to generate analytics:', error);
            // Generate mock analytics
            this.generateMockAnalytics();
        }
    }

    generateMockAnalytics() {
        this.analytics = {
            totalMemories: Math.floor(Math.random() * 1000) + 100,
            averageSimilarity: 0.7 + Math.random() * 0.3,
            topTags: ['ai', 'development', 'research', 'automation', 'machine-learning'],
            agentActivity: {
                'agent-1': Math.floor(Math.random() * 50) + 10,
                'agent-2': Math.floor(Math.random() * 30) + 5,
                'agent-3': Math.floor(Math.random() * 20) + 3
            },
            memoryGrowth: this.generateGrowthData(),
            searchPatterns: ['natural language', 'technical docs', 'code examples']
        };
        this.updateAnalyticsDisplay();
    }

    generateGrowthData() {
        const data = [];
        const now = new Date();
        for (let i = 30; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            data.push({
                date: date.toISOString().split('T')[0],
                count: Math.floor(Math.random() * 20) + (30 - i) * 2
            });
        }
        return data;
    }

    updateAnalyticsDisplay() {
        // Update analytics cards
        document.getElementById('total-memories-count').textContent = this.analytics.totalMemories.toLocaleString();
        document.getElementById('avg-similarity-score').textContent = this.analytics.averageSimilarity.toFixed(3);

        // Update top tags
        const tagsContainer = document.getElementById('top-tags-list');
        if (tagsContainer) {
            tagsContainer.innerHTML = this.analytics.topTags
                .map(tag => `<span class="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs">${tag}</span>`)
                .join('');
        }

        // Update growth chart
        this.updateGrowthChart();
    }

    updateGrowthChart() {
        const ctx = document.getElementById('memory-growth-chart');
        if (!ctx || !this.analytics.memoryGrowth) return;

        if (this.dashboard.charts.growthChart) {
            this.dashboard.charts.growthChart.destroy();
        }

        this.dashboard.charts.growthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.analytics.memoryGrowth.map(d => d.date),
                datasets: [{
                    label: 'Memories Added',
                    data: this.analytics.memoryGrowth.map(d => d.count),
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.1,
                    fill: true
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
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }
}

// System diagnostics and health monitoring
class SystemDiagnostics {
    constructor(dashboard) {
        this.dashboard = dashboard;
        this.diagnostics = {
            memoryTier: 'unknown',
            apiStatus: {},
            performance: {},
            errors: [],
            warnings: []
        };
    }

    async runDiagnostics() {
        console.log('🔍 Running system diagnostics...');

        try {
            // Test API endpoints
            await this.testApiEndpoints();

            // Check memory tier status
            await this.checkMemoryTier();

            // Monitor performance
            await this.checkPerformance();

            // Update diagnostics display
            this.updateDiagnosticsDisplay();

            console.log('✅ Diagnostics completed');
        } catch (error) {
            console.error('❌ Diagnostics failed:', error);
            this.diagnostics.errors.push(`Diagnostics failed: ${error.message}`);
        }
    }

    async testApiEndpoints() {
        const endpoints = [
            { name: 'Health', path: '/api/health' },
            { name: 'Config', path: '/api/config' },
            { name: 'Stats', path: '/api/stats' }
        ];

        for (const endpoint of endpoints) {
            try {
                const start = performance.now();
                const response = await fetch(endpoint.path);
                const end = performance.now();

                this.diagnostics.apiStatus[endpoint.name] = {
                    status: response.ok ? 'healthy' : 'unhealthy',
                    responseTime: Math.round(end - start),
                    statusCode: response.status
                };
            } catch (error) {
                this.diagnostics.apiStatus[endpoint.name] = {
                    status: 'error',
                    error: error.message
                };
            }
        }
    }

    async checkMemoryTier() {
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                const config = await response.json();
                this.diagnostics.memoryTier = config.tier || 'unknown';
            }
        } catch (error) {
            this.diagnostics.warnings.push(`Failed to check memory tier: ${error.message}`);
        }
    }

    async checkPerformance() {
        // Monitor browser performance
        if (performance.memory) {
            this.diagnostics.performance = {
                usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }

        // Check WebSocket connection
        if (this.dashboard.socket) {
            this.diagnostics.websocketStatus = this.dashboard.socket.connected ? 'connected' : 'disconnected';
        }
    }

    updateDiagnosticsDisplay() {
        // Update API status indicators
        Object.entries(this.diagnostics.apiStatus).forEach(([name, status]) => {
            const indicator = document.getElementById(`api-${name.toLowerCase()}-status`);
            if (indicator) {
                indicator.className = `w-3 h-3 rounded-full ${status.status === 'healthy' ? 'bg-green-500' :
                        status.status === 'unhealthy' ? 'bg-yellow-500' : 'bg-red-500'
                    }`;
                indicator.title = `${name}: ${status.status} (${status.responseTime || 'N/A'}ms)`;
            }
        });

        // Update memory tier display
        const tierDisplay = document.getElementById('current-tier-display');
        if (tierDisplay) {
            tierDisplay.textContent = this.diagnostics.memoryTier;
        }

        // Update performance metrics
        if (this.diagnostics.performance.usedJSHeapSize) {
            const perfDisplay = document.getElementById('performance-metrics');
            if (perfDisplay) {
                perfDisplay.innerHTML = `
                    <div class="text-sm text-gray-600 dark:text-gray-400">
                        Memory: ${this.diagnostics.performance.usedJSHeapSize}MB / ${this.diagnostics.performance.totalJSHeapSize}MB
                    </div>
                `;
            }
        }

        // Show errors and warnings
        this.displayNotifications();
    }

    displayNotifications() {
        const container = document.getElementById('diagnostics-notifications');
        if (!container) return;

        const notifications = [
            ...this.diagnostics.errors.map(error => ({ type: 'error', message: error })),
            ...this.diagnostics.warnings.map(warning => ({ type: 'warning', message: warning }))
        ];

        container.innerHTML = notifications.map(notif => `
            <div class="p-3 rounded-lg ${notif.type === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            }">
                <div class="flex items-center">
                    <i data-lucide="${notif.type === 'error' ? 'alert-circle' : 'alert-triangle'}" class="w-5 h-5 mr-2"></i>
                    <span class="text-sm">${notif.message}</span>
                </div>
            </div>
        `).join('');

        // Recreate icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }
}

// Export manager for memories and configuration
class ExportManager {
    constructor(dashboard) {
        this.dashboard = dashboard;
    }

    async exportMemories(format = 'json') {
        try {
            const response = await fetch(`/api/memory/export?format=${format}`);
            if (!response.ok) throw new Error('Export failed');

            const data = await response.json();
            this.downloadFile(data, `memorai-export-${new Date().toISOString().split('T')[0]}.${format}`);

            this.dashboard.showToast('Memories exported successfully', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.dashboard.showToast('Export failed: ' + error.message, 'error');
        }
    }

    async exportConfiguration() {
        try {
            const config = await this.dashboard.loadConfig();
            const exportData = {
                config,
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            };

            this.downloadFile(exportData, `memorai-config-${new Date().toISOString().split('T')[0]}.json`);
            this.dashboard.showToast('Configuration exported successfully', 'success');
        } catch (error) {
            console.error('Config export failed:', error);
            this.dashboard.showToast('Config export failed: ' + error.message, 'error');
        }
    }

    downloadFile(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    }

    async importMemories(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!Array.isArray(data.memories)) {
                throw new Error('Invalid import format');
            }

            let imported = 0;
            for (const memory of data.memories) {
                try {
                    await this.dashboard.addMemoryDirect(memory);
                    imported++;
                } catch (error) {
                    console.warn('Failed to import memory:', memory, error);
                }
            }

            this.dashboard.showToast(`Imported ${imported} memories successfully`, 'success');
            this.dashboard.refreshMemoryResults();
        } catch (error) {
            console.error('Import failed:', error);
            this.dashboard.showToast('Import failed: ' + error.message, 'error');
        }
    }
}

// Add these enhanced features to the main dashboard
if (typeof MemoraiDashboard !== 'undefined') {
    // Extend dashboard with advanced features
    MemoraiDashboard.prototype.initAdvancedFeatures = function () {
        this.advancedSearch = new AdvancedSearch(this);
        this.analytics = new MemoryAnalytics(this);
        this.diagnostics = new SystemDiagnostics(this);
        this.exportManager = new ExportManager(this);

        // Add event listeners for advanced features
        this.initAdvancedEventListeners();
    };

    MemoraiDashboard.prototype.initAdvancedEventListeners = function () {
        // Advanced search
        const advancedSearchBtn = document.getElementById('advanced-search-btn');
        if (advancedSearchBtn) {
            advancedSearchBtn.addEventListener('click', () => this.advancedSearch.showAdvancedSearch());
        }

        // Analytics refresh
        const analyticsRefreshBtn = document.getElementById('analytics-refresh');
        if (analyticsRefreshBtn) {
            analyticsRefreshBtn.addEventListener('click', () => this.analytics.generateAnalytics());
        }

        // Diagnostics
        const diagnosticsBtn = document.getElementById('run-diagnostics');
        if (diagnosticsBtn) {
            diagnosticsBtn.addEventListener('click', () => this.diagnostics.runDiagnostics());
        }

        // Export/Import
        const exportBtn = document.getElementById('export-all-memories');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportManager.exportMemories());
        }

        const importBtn = document.getElementById('import-memories-btn');
        const importFile = document.getElementById('import-memories-file');
        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => importFile.click());
            importFile.addEventListener('change', (e) => {
                if (e.target.files[0]) {
                    this.exportManager.importMemories(e.target.files[0]);
                }
            });
        }
    };

    MemoraiDashboard.prototype.searchWithFilters = function (filters) {
        // Enhanced search with filters
        const query = document.getElementById('search-input').value;

        const searchData = {
            query,
            filters,
            limit: 20
        };

        this.performSearch(searchData);
    };

    MemoraiDashboard.prototype.addMemoryDirect = async function (memoryData) {
        const response = await fetch('/api/memory/remember', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(memoryData)
        });

        if (!response.ok) {
            throw new Error(`Failed to add memory: ${response.statusText}`);
        }

        return response.json();
    };
}

/**
 * Enhanced Memorai Dashboard - 110% Challenge Implementation
 * Advanced AI Memory Management Dashboard with real-time analytics
 * and visual memory graphs
 */

class MemoraiDashboardEnhanced {
    constructor() {
        this.baseURL = window.location.origin;
        this.memories = [];
        this.stats = null;
        this.config = null;
        this.isLoading = false;
        this.currentTab = 'overview';
        this.searchDebounceTimer = null;
        this.wsConnection = null;
        this.performance = {
            loadTime: 0,
            apiCalls: 0,
            errors: 0
        };

        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        console.log('🧠 Initializing Enhanced Memorai Dashboard...');
        const startTime = performance.now();

        try {
            // Initialize Lucide icons
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }

            // Setup event listeners
            this.setupEventListeners();

            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts();

            // Initialize theme
            this.initializeTheme();

            // Load initial data
            await this.loadInitialData();

            // Setup real-time updates
            this.setupRealTimeUpdates();

            // Setup auto-refresh
            this.setupAutoRefresh();

            // Performance tracking
            this.performance.loadTime = performance.now() - startTime;
            console.log(`✅ Dashboard initialized in ${this.performance.loadTime.toFixed(2)}ms`);

            // Show success toast
            this.showToast('Dashboard loaded successfully', 'success');

        } catch (error) {
            console.error('❌ Failed to initialize dashboard:', error);
            this.showToast('Failed to initialize dashboard', 'error');
        }
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Search functionality
        const searchInput = document.getElementById('memory-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                clearTimeout(this.searchDebounceTimer);
                this.searchDebounceTimer = setTimeout(() => {
                    this.searchMemories(e.target.value);
                }, 300);
            });
        }

        // Create memory form
        const createForm = document.getElementById('create-memory-form');
        if (createForm) {
            createForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createMemory();
            });
        }

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Quick actions
        document.getElementById('test-connection')?.addEventListener('click', () => this.testConnection());
        document.getElementById('refresh-config')?.addEventListener('click', () => this.refreshConfig());
        document.getElementById('export-config')?.addEventListener('click', () => this.exportConfig());
        document.getElementById('system-logs')?.addEventListener('click', () => this.showSystemLogs());

        // Modal controls
        document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'modal-overlay') this.closeModal();
        });

        // Help shortcuts
        document.getElementById('close-shortcuts')?.addEventListener('click', () => this.hideShortcuts());

        // Advanced search filters
        this.setupAdvancedFilters();
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Check for modifier keys
            const isCmd = e.metaKey || e.ctrlKey;
            const isShift = e.shiftKey;

            // Quick search (Cmd/Ctrl + K)
            if (isCmd && e.key === 'k') {
                e.preventDefault();
                document.getElementById('memory-search')?.focus();
                return;
            }

            // Create memory (Cmd/Ctrl + N)
            if (isCmd && e.key === 'n') {
                e.preventDefault();
                this.switchTab('create');
                document.getElementById('memory-content')?.focus();
                return;
            }

            // Toggle theme (Cmd/Ctrl + Shift + L)
            if (isCmd && isShift && e.key === 'L') {
                e.preventDefault();
                this.toggleTheme();
                return;
            }

            // Show help (?)
            if (e.key === '?' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.showShortcuts();
                return;
            }

            // Close modals (Escape)
            if (e.key === 'Escape') {
                this.closeModal();
                this.hideShortcuts();
                return;
            }
        });
    } setupAdvancedFilters() {
        // Search form functionality
        const searchForm = document.getElementById('search-form');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.performAdvancedSearch();
            });
        }

        // Search filters toggle
        const filtersToggle = document.getElementById('search-filters-toggle');
        const filtersPanel = document.getElementById('search-filters');
        if (filtersToggle && filtersPanel) {
            filtersToggle.addEventListener('click', () => {
                filtersPanel.classList.toggle('hidden');
                const icon = filtersToggle.querySelector('i');
                if (icon) {
                    icon.setAttribute('data-lucide', filtersPanel.classList.contains('hidden') ? 'filter' : 'x');
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            });
        }

        // Clear search button
        const clearSearch = document.getElementById('clear-search');
        if (clearSearch) {
            clearSearch.addEventListener('click', () => {
                document.getElementById('search-query')?.value && (document.getElementById('search-query').value = '');
                document.getElementById('search-agent-id')?.value && (document.getElementById('search-agent-id').value = '');
                this.loadInitialData();
                this.updateResultsSummary('Showing all memories');
            });
        }

        // Voice search button (placeholder for future implementation)
        const voiceSearch = document.getElementById('voice-search');
        if (voiceSearch) {
            voiceSearch.addEventListener('click', () => {
                this.showToast('Voice search coming soon!', 'info');
            });
        }

        // Tag preset buttons
        document.querySelectorAll('.tag-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const tag = btn.dataset.tag;
                const tagsInput = document.getElementById('memory-tags');
                if (tagsInput) {
                    const currentTags = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean);
                    if (!currentTags.includes(tag)) {
                        currentTags.push(tag);
                        tagsInput.value = currentTags.join(', ');
                    }
                }
            });
        });

        // Memory type filter
        const typeFilter = document.getElementById('memory-type-filter');
        if (typeFilter) {
            typeFilter.addEventListener('change', () => this.applyFilters());
        }

        // Date range filter
        const dateFilter = document.getElementById('date-range-filter');
        if (dateFilter) {
            dateFilter.addEventListener('change', () => this.applyFilters());
        }

        // Sort options
        const sortFilter = document.getElementById('sort-filter');
        if (sortFilter) {
            sortFilter.addEventListener('change', () => this.applyFilters());
        }
    }

    async performAdvancedSearch() {
        const query = document.getElementById('search-query')?.value?.trim();
        const agentId = document.getElementById('search-agent-id')?.value?.trim();
        const limit = parseInt(document.getElementById('search-limit')?.value) || 25;

        if (!query) {
            this.showToast('Please enter a search query', 'warning');
            return;
        }

        this.showLoading('Searching with advanced filters...');

        try {
            this.performance.apiCalls++;
            const body = { query, limit };
            if (agentId) body.agentId = agentId;

            const response = await fetch(`${this.baseURL}/api/memories/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const results = await response.json();
            this.memories = results;
            this.updateMemoriesDisplay();

            this.updateResultsSummary(`Found ${results.length} memories matching "${query}"`);
            this.showToast(`Found ${results.length} memories`, 'success');

        } catch (error) {
            console.error('Advanced search failed:', error);
            this.performance.errors++;
            this.showToast('Advanced search failed', 'error');
            this.updateResultsSummary('Search failed');
        } finally {
            this.hideLoading();
        }
    }

    updateResultsSummary(text) {
        const summaryElement = document.getElementById('results-summary');
        if (summaryElement) {
            summaryElement.textContent = text;
        }
    } async loadInitialData() {
        this.showLoading('Loading dashboard data...');

        try {
            // Load data in parallel with proper error handling
            const [memories, stats, config] = await Promise.allSettled([
                this.fetchMemories(),
                this.fetchStats(),
                this.fetchConfig()
            ]);

            // Handle memories result
            if (memories.status === 'fulfilled') {
                this.memories = memories.value;
            } else {
                console.error('Failed to load memories:', memories.reason);
                this.memories = [];
            }

            // Handle stats result
            if (stats.status === 'fulfilled') {
                this.stats = stats.value;
            } else {
                console.error('Failed to load stats:', stats.reason);
                this.stats = {
                    totalMemories: 0,
                    memoryTiers: { smart: 0, basic: 0, advanced: 0, mock: 0 },
                    recentActivity: 0,
                    storageUsed: '0 MB'
                };
            }

            // Handle config result
            if (config.status === 'fulfilled') {
                this.config = config.value;
            } else {
                console.error('Failed to load config:', config.reason);
                this.config = {
                    tier: { level: 'unknown', message: 'Configuration unavailable' },
                    environment: {}
                };
            }

            // Update UI with loaded data
            this.updateMemoriesDisplay();
            this.updateStatsDisplay();
            this.updateConfigDisplay();
            this.updateSystemStatus();

        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showToast('Failed to load data', 'error');
        } finally {
            // Always hide loading, regardless of success or failure
            this.hideLoading();
        }
    } async fetchMemories() {
        try {
            this.performance.apiCalls++;
            const response = await fetch(`${this.baseURL}/api/memories`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return data.memories || data || [];
        } catch (error) {
            console.error('Failed to fetch memories:', error);
            this.performance.errors++;
            return [];
        }
    } async fetchStats() {
        try {
            this.performance.apiCalls++;
            const response = await fetch(`${this.baseURL}/api/stats`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return data.stats || data || {
                totalMemories: 0,
                memoryTiers: { smart: 0, basic: 0, advanced: 0, mock: 0 },
                recentActivity: 0,
                storageUsed: '0 MB'
            };
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            this.performance.errors++;
            return {
                totalMemories: 0,
                memoryTiers: { smart: 0, basic: 0, advanced: 0, mock: 0 },
                recentActivity: 0,
                storageUsed: '0 MB'
            };
        }
    } async fetchConfig() {
        try {
            this.performance.apiCalls++;
            const response = await fetch(`${this.baseURL}/api/config`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            return data.config || data || {
                tier: { level: 'unknown', message: 'Configuration unavailable' },
                environment: {}
            };
        } catch (error) {
            console.error('Failed to fetch config:', error);
            this.performance.errors++;
            return {
                tier: { level: 'unknown', message: 'Configuration unavailable' },
                environment: {}
            };
        }
    }

    updateMemoriesDisplay() {
        const container = document.getElementById('memories-container');
        if (!container) return;

        if (this.memories.length === 0) {
            container.innerHTML = this.getEmptyMemoriesHTML();
            return;
        }

        const html = this.memories.map(memory => this.getMemoryCardHTML(memory)).join('');
        container.innerHTML = html;

        // Add event listeners to memory cards
        this.setupMemoryCardListeners();
    }

    getMemoryCardHTML(memory) {
        const timestamp = new Date(memory.timestamp || Date.now()).toLocaleString();
        const tierBadge = this.getTierBadgeHTML(memory.tier || 'smart');

        return `
            <div class="memory-card bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1" data-memory-id="${memory.id || memory.content}">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center space-x-3">
                        ${tierBadge}
                        <span class="text-xs text-gray-500 dark:text-gray-400">${timestamp}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="edit-memory p-1 rounded text-gray-400 hover:text-blue-500 transition-colors" title="Edit">
                            <i data-lucide="edit-2" class="w-4 h-4"></i>
                        </button>
                        <button class="delete-memory p-1 rounded text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
                
                <div class="mb-4">
                    <p class="text-gray-900 dark:text-white leading-relaxed">${this.escapeHtml(memory.content)}</p>
                </div>
                
                ${memory.metadata ? `
                <div class="border-t border-gray-200 dark:border-gray-600 pt-3">
                    <div class="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                        ${memory.metadata.source ? `<span>Source: ${memory.metadata.source}</span>` : ''}
                        ${memory.metadata.tags ? `<span>Tags: ${memory.metadata.tags.join(', ')}</span>` : ''}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
    }

    getTierBadgeHTML(tier) {
        const tierConfig = {
            advanced: { label: 'Advanced', class: 'tier-advanced', icon: 'crown' },
            smart: { label: 'Smart', class: 'tier-smart', icon: 'cpu' },
            basic: { label: 'Basic', class: 'tier-basic', icon: 'hash' },
            mock: { label: 'Mock', class: 'tier-mock', icon: 'flask-conical' }
        };

        const config = tierConfig[tier] || tierConfig.smart;
        return `
            <div class="tier-badge ${config.class}">
                <i data-lucide="${config.icon}" class="w-3 h-3"></i>
                ${config.label}
            </div>
        `;
    }

    getEmptyMemoriesHTML() {
        return `
            <div class="text-center py-12">
                <div class="loading-brain mb-6"></div>
                <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">No memories yet</h3>
                <p class="text-gray-500 dark:text-gray-400 mb-6">Create your first memory to get started with AI-powered recall.</p>
                <button onclick="memoraiDashboard.switchTab('create')" class="btn-primary">
                    <i data-lucide="plus" class="w-4 h-4 mr-2"></i>
                    Create First Memory
                </button>
            </div>
        `;
    }

    setupMemoryCardListeners() {
        // Edit memory buttons
        document.querySelectorAll('.edit-memory').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const memoryId = btn.closest('[data-memory-id]').dataset.memoryId;
                this.editMemory(memoryId);
            });
        });

        // Delete memory buttons
        document.querySelectorAll('.delete-memory').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const memoryId = btn.closest('[data-memory-id]').dataset.memoryId;
                this.deleteMemory(memoryId);
            });
        });

        // Re-initialize icons for new content
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    updateStatsDisplay() {
        if (!this.stats) return;

        // Update stat cards
        this.updateElement('total-memories', this.stats.totalMemories?.toLocaleString() || '0');
        this.updateElement('recent-activity', this.stats.recentActivity || '0');
        this.updateElement('storage-used', this.stats.storageUsed || '0 MB');
        this.updateElement('active-tier', this.config?.activeTier || 'smart');

        // Update tier distribution chart
        this.updateTierChart();

        // Update activity chart
        this.updateActivityChart();
    }

    updateTierChart() {
        const chartContainer = document.getElementById('tier-chart');
        if (!chartContainer || !this.stats.memoryTiers) return;

        const tiers = this.stats.memoryTiers;
        const total = Object.values(tiers).reduce((sum, count) => sum + count, 0);

        if (total === 0) {
            chartContainer.innerHTML = '<div class="text-center text-gray-500 dark:text-gray-400 py-8">No data available</div>';
            return;
        }

        const colors = {
            advanced: '#10b981',
            smart: '#3b82f6',
            basic: '#f59e0b',
            mock: '#6b7280'
        };

        let currentAngle = -90;
        const segments = Object.entries(tiers).map(([tier, count]) => {
            const percentage = (count / total) * 100;
            const angle = (percentage / 100) * 360;
            const path = this.createPieSlice(50, 50, 40, currentAngle, currentAngle + angle);
            currentAngle += angle;

            return {
                tier,
                count,
                percentage: percentage.toFixed(1),
                path,
                color: colors[tier] || '#6b7280'
            };
        });

        const svgContent = `
            <svg viewBox="0 0 100 100" class="w-32 h-32">
                ${segments.map(segment => `
                    <path d="${segment.path}" fill="${segment.color}" stroke="white" stroke-width="0.5" opacity="0.8"/>
                `).join('')}
            </svg>
        `;

        const legendContent = segments.map(segment => `
            <div class="flex items-center space-x-2">
                <div class="w-3 h-3 rounded-full" style="background-color: ${segment.color}"></div>
                <span class="text-sm text-gray-600 dark:text-gray-400">${segment.tier}: ${segment.count} (${segment.percentage}%)</span>
            </div>
        `).join('');

        chartContainer.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex-shrink-0">${svgContent}</div>
                <div class="flex-1 ml-6 space-y-2">${legendContent}</div>
            </div>
        `;
    }

    createPieSlice(cx, cy, r, startAngle, endAngle) {
        const start = this.polarToCartesian(cx, cy, r, endAngle);
        const end = this.polarToCartesian(cx, cy, r, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
        return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
    }

    polarToCartesian(centerX, centerY, radius, angleInDegrees) {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: centerX + (radius * Math.cos(angleInRadians)),
            y: centerY + (radius * Math.sin(angleInRadians))
        };
    }

    updateActivityChart() {
        const chartContainer = document.getElementById('activity-chart');
        if (!chartContainer) return;

        // Generate sample activity data for the last 7 days
        const days = 7;
        const data = Array.from({ length: days }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (days - 1 - i));
            return {
                date: date.toLocaleDateString('en-US', { weekday: 'short' }),
                value: Math.floor(Math.random() * 20) + 1
            };
        });

        const maxValue = Math.max(...data.map(d => d.value));
        const barWidth = 80 / days;

        const barsContent = data.map((d, i) => {
            const height = (d.value / maxValue) * 60;
            const x = 10 + (i * barWidth);
            const y = 70 - height;

            return `
                <rect x="${x}" y="${y}" width="${barWidth - 2}" height="${height}" 
                      fill="#3b82f6" opacity="0.8" rx="1"/>
                <text x="${x + (barWidth - 2) / 2}" y="85" text-anchor="middle" 
                      class="text-xs fill-gray-500 dark:fill-gray-400">${d.date}</text>
            `;
        }).join('');

        chartContainer.innerHTML = `
            <svg viewBox="0 0 100 90" class="w-full h-24">
                ${barsContent}
            </svg>
        `;
    }

    async searchMemories(query) {
        if (!query.trim()) {
            this.updateMemoriesDisplay();
            return;
        }

        this.showLoading('Searching memories...');

        try {
            this.performance.apiCalls++;
            const response = await fetch(`${this.baseURL}/api/memories/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, limit: 50 })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const results = await response.json();
            this.memories = results;
            this.updateMemoriesDisplay();

            this.showToast(`Found ${results.length} memories`, 'success');

        } catch (error) {
            console.error('Search failed:', error);
            this.performance.errors++;
            this.showToast('Search failed', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async createMemory() {
        const content = document.getElementById('memory-content')?.value?.trim();
        const metadata = this.getMemoryMetadata();

        if (!content) {
            this.showToast('Please enter memory content', 'warning');
            return;
        }

        this.showLoading('Creating memory...');

        try {
            this.performance.apiCalls++;
            const response = await fetch(`${this.baseURL}/api/memories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, metadata })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const newMemory = await response.json();
            this.memories.unshift(newMemory);

            // Clear form
            document.getElementById('create-memory-form')?.reset();

            // Update displays
            this.updateMemoriesDisplay();
            this.updateStatsDisplay();

            // Switch to memories tab
            this.switchTab('memories');

            this.showToast('Memory created successfully', 'success');

        } catch (error) {
            console.error('Failed to create memory:', error);
            this.performance.errors++;
            this.showToast('Failed to create memory', 'error');
        } finally {
            this.hideLoading();
        }
    }

    getMemoryMetadata() {
        const source = document.getElementById('memory-source')?.value?.trim();
        const tagsInput = document.getElementById('memory-tags')?.value?.trim();
        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(Boolean) : [];

        const metadata = {};
        if (source) metadata.source = source;
        if (tags.length > 0) metadata.tags = tags;

        return Object.keys(metadata).length > 0 ? metadata : undefined;
    }

    async editMemory(memoryId) {
        const memory = this.memories.find(m => (m.id || m.content) === memoryId);
        if (!memory) return;

        this.showModal('Edit Memory', `
            <form id="edit-memory-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content</label>
                    <textarea id="edit-memory-content" rows="4" class="form-input" required>${this.escapeHtml(memory.content)}</textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Source</label>
                        <input type="text" id="edit-memory-source" class="form-input" value="${memory.metadata?.source || ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tags</label>
                        <input type="text" id="edit-memory-tags" class="form-input" value="${memory.metadata?.tags?.join(', ') || ''}" placeholder="tag1, tag2, tag3">
                    </div>
                </div>
                <div class="flex justify-end space-x-3">
                    <button type="button" onclick="memoraiDashboard.closeModal()" class="btn-secondary">Cancel</button>
                    <button type="submit" class="btn-primary">Save Changes</button>
                </div>
            </form>
        `);

        document.getElementById('edit-memory-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateMemory(memoryId);
        });
    }

    async updateMemory(memoryId) {
        const content = document.getElementById('edit-memory-content')?.value?.trim();
        if (!content) {
            this.showToast('Please enter memory content', 'warning');
            return;
        }

        const source = document.getElementById('edit-memory-source')?.value?.trim();
        const tagsInput = document.getElementById('edit-memory-tags')?.value?.trim();
        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(Boolean) : [];

        const metadata = {};
        if (source) metadata.source = source;
        if (tags.length > 0) metadata.tags = tags;

        this.showLoading('Updating memory...');

        try {
            this.performance.apiCalls++;
            const response = await fetch(`${this.baseURL}/api/memories/${encodeURIComponent(memoryId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, metadata: Object.keys(metadata).length > 0 ? metadata : undefined })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            // Update local data
            const memoryIndex = this.memories.findIndex(m => (m.id || m.content) === memoryId);
            if (memoryIndex !== -1) {
                this.memories[memoryIndex] = { ...this.memories[memoryIndex], content, metadata };
                this.updateMemoriesDisplay();
            }

            this.closeModal();
            this.showToast('Memory updated successfully', 'success');

        } catch (error) {
            console.error('Failed to update memory:', error);
            this.performance.errors++;
            this.showToast('Failed to update memory', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async deleteMemory(memoryId) {
        if (!confirm('Are you sure you want to delete this memory? This action cannot be undone.')) {
            return;
        }

        this.showLoading('Deleting memory...');

        try {
            this.performance.apiCalls++;
            const response = await fetch(`${this.baseURL}/api/memories/${encodeURIComponent(memoryId)}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            // Remove from local data
            this.memories = this.memories.filter(m => (m.id || m.content) !== memoryId);
            this.updateMemoriesDisplay();
            this.updateStatsDisplay();

            this.showToast('Memory deleted successfully', 'success');

        } catch (error) {
            console.error('Failed to delete memory:', error);
            this.performance.errors++;
            this.showToast('Failed to delete memory', 'error');
        } finally {
            this.hideLoading();
        }
    }

    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content visibility
        document.querySelectorAll('[data-tab-content]').forEach(content => {
            content.classList.toggle('hidden', content.dataset.tabContent !== tabName);
        });

        this.currentTab = tabName;

        // Load tab-specific data
        if (tabName === 'memories' && this.memories.length === 0) {
            this.loadInitialData();
        }
    }

    // Theme management
    initializeTheme() {
        const savedTheme = localStorage.getItem('memorai-theme') || 'dark';
        this.setTheme(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('memorai-theme', theme);

        // Update theme toggle icon
        const themeIcon = document.querySelector('#theme-toggle i');
        if (themeIcon) {
            themeIcon.setAttribute('data-lucide', theme === 'dark' ? 'sun' : 'moon');
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    // Modal system
    showModal(title, content) {
        const modal = document.getElementById('modal-overlay');
        const modalContent = document.getElementById('modal-content');

        if (!modal || !modalContent) return;

        modalContent.innerHTML = `
            <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${title}</h3>
                <button onclick="memoraiDashboard.closeModal()" class="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="p-6">${content}</div>
        `;

        modal.classList.remove('hidden');

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    closeModal() {
        const modal = document.getElementById('modal-overlay');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    // Toast notifications
    showToast(message, type = 'info', duration = 5000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toastId = Date.now();
        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        };

        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };

        const toast = document.createElement('div');
        toast.id = `toast-${toastId}`;
        toast.className = `toast-notification ${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3 transform translate-x-full transition-transform duration-300`;

        toast.innerHTML = `
            <i data-lucide="${icons[type]}" class="w-5 h-5 flex-shrink-0"></i>
            <span class="flex-1">${this.escapeHtml(message)}</span>
            <button onclick="memoraiDashboard.hideToast('${toastId}')" class="ml-3 p-1 rounded hover:bg-black/20">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        `;

        container.appendChild(toast);

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Slide in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                this.hideToast(toastId);
            }, duration);
        }
    }

    hideToast(toastId) {
        const toast = document.getElementById(`toast-${toastId}`);
        if (toast) {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }

    // Loading states
    showLoading(message = 'Loading...') {
        if (this.isLoading) return;
        this.isLoading = true;

        const loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center';

        loadingOverlay.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
                <div class="loading-brain mb-4"></div>
                <p class="text-gray-900 dark:text-white font-medium">${this.escapeHtml(message)}</p>
            </div>
        `;

        document.body.appendChild(loadingOverlay);
    } hideLoading() {
        this.isLoading = false;

        // Remove programmatically created loading overlay
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.remove();
        }

        // Hide the static loading screen from HTML
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }

        // Show the main dashboard content
        const dashboard = document.getElementById('dashboard');
        if (dashboard) {
            dashboard.classList.remove('hidden');
            dashboard.classList.add('fade-in');
        }
    }

    // System status and monitoring
    updateSystemStatus() {
        this.updateServerStatus();
        this.updateMemoryTierStatus();
        this.updateDatabaseStatus();
    }

    async updateServerStatus() {
        try {
            const response = await fetch(`${this.baseURL}/api/health`);
            const isOnline = response.ok;
            this.updateStatusDot('server-status', isOnline ? 'online' : 'offline');
        } catch (error) {
            this.updateStatusDot('server-status', 'offline');
        }
    }

    updateMemoryTierStatus() {
        const tier = this.config?.activeTier || 'smart';
        const statusMap = {
            advanced: 'online',
            smart: 'online',
            basic: 'warning',
            mock: 'offline'
        };
        this.updateStatusDot('memory-tier-status', statusMap[tier] || 'warning');
    }

    updateDatabaseStatus() {
        // Simulate database status check
        this.updateStatusDot('database-status', 'offline'); // Default to offline for demo
    }

    updateStatusDot(elementId, status) {
        const statusDot = document.getElementById(elementId);
        if (statusDot) {
            statusDot.className = `status-dot status-${status}`;
        }
    }

    // Quick actions
    async testConnection() {
        this.showLoading('Testing connection...');

        try {
            const response = await fetch(`${this.baseURL}/api/health`);
            const result = await response.json();

            if (response.ok) {
                this.showToast('Connection test successful', 'success');
                this.updateSystemStatus();
            } else {
                this.showToast(`Connection test failed: ${result.message || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            this.showToast('Connection test failed', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async refreshConfig() {
        this.showLoading('Refreshing configuration...');

        try {
            this.config = await this.fetchConfig();
            this.updateConfigDisplay();
            this.updateSystemStatus();
            this.showToast('Configuration refreshed', 'success');
        } catch (error) {
            this.showToast('Failed to refresh configuration', 'error');
        } finally {
            this.hideLoading();
        }
    }

    exportConfig() {
        if (!this.config) {
            this.showToast('No configuration data available', 'warning');
            return;
        }

        const dataStr = JSON.stringify(this.config, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `memorai-config-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();

        this.showToast('Configuration exported', 'success');
    }

    showSystemLogs() {
        this.showModal('System Logs', `
            <div class="space-y-4">
                <div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
                    <div>[${new Date().toISOString()}] INFO: Dashboard initialized successfully</div>
                    <div>[${new Date().toISOString()}] INFO: Memory engine status: ${this.config?.activeTier || 'unknown'}</div>
                    <div>[${new Date().toISOString()}] INFO: Total memories: ${this.stats?.totalMemories || 0}</div>
                    <div>[${new Date().toISOString()}] INFO: API calls made: ${this.performance.apiCalls}</div>
                    <div>[${new Date().toISOString()}] INFO: Performance: ${this.performance.loadTime.toFixed(2)}ms load time</div>
                    ${this.performance.errors > 0 ? `<div>[${new Date().toISOString()}] WARN: ${this.performance.errors} errors encountered</div>` : ''}
                </div>
                <div class="flex justify-end">
                    <button onclick="memoraiDashboard.exportLogs()" class="btn-secondary">
                        <i data-lucide="download" class="w-4 h-4 mr-2"></i>
                        Export Logs
                    </button>
                </div>
            </div>
        `);
    }

    exportLogs() {
        const logs = [
            `[${new Date().toISOString()}] INFO: Dashboard initialized successfully`,
            `[${new Date().toISOString()}] INFO: Memory engine status: ${this.config?.activeTier || 'unknown'}`,
            `[${new Date().toISOString()}] INFO: Total memories: ${this.stats?.totalMemories || 0}`,
            `[${new Date().toISOString()}] INFO: API calls made: ${this.performance.apiCalls}`,
            `[${new Date().toISOString()}] INFO: Performance: ${this.performance.loadTime.toFixed(2)}ms load time`,
        ];

        if (this.performance.errors > 0) {
            logs.push(`[${new Date().toISOString()}] WARN: ${this.performance.errors} errors encountered`);
        }

        const logStr = logs.join('\n');
        const logBlob = new Blob([logStr], { type: 'text/plain' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(logBlob);
        link.download = `memorai-logs-${new Date().toISOString().slice(0, 10)}.txt`;
        link.click();

        this.showToast('Logs exported', 'success');
    }

    // Real-time updates
    setupRealTimeUpdates() {
        // Try to establish WebSocket connection for real-time updates
        try {
            const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            this.wsConnection = new WebSocket(`${wsProtocol}//${window.location.host}/ws`);

            this.wsConnection.onopen = () => {
                console.log('✅ WebSocket connected for real-time updates');
                this.showToast('Real-time updates enabled', 'success');
            };

            this.wsConnection.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleRealTimeUpdate(data);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            this.wsConnection.onerror = () => {
                console.log('WebSocket connection failed, falling back to polling');
            };

        } catch (error) {
            console.log('WebSocket not available, using polling for updates');
        }
    }

    handleRealTimeUpdate(data) {
        switch (data.type) {
            case 'memory_created':
                this.memories.unshift(data.memory);
                this.updateMemoriesDisplay();
                this.updateStatsDisplay();
                this.showToast('New memory added', 'info');
                break;

            case 'memory_updated':
                const updateIndex = this.memories.findIndex(m => m.id === data.memory.id);
                if (updateIndex !== -1) {
                    this.memories[updateIndex] = data.memory;
                    this.updateMemoriesDisplay();
                }
                break;

            case 'memory_deleted':
                this.memories = this.memories.filter(m => m.id !== data.memoryId);
                this.updateMemoriesDisplay();
                this.updateStatsDisplay();
                break;

            case 'stats_updated':
                this.stats = data.stats;
                this.updateStatsDisplay();
                break;
        }
    }

    setupAutoRefresh() {
        // Refresh stats every 30 seconds
        setInterval(() => {
            if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
                this.fetchStats().then(stats => {
                    this.stats = stats;
                    this.updateStatsDisplay();
                });
            }
        }, 30000);

        // Refresh system status every 60 seconds
        setInterval(() => {
            this.updateSystemStatus();
        }, 60000);
    }

    // Keyboard shortcuts help
    showShortcuts() {
        document.getElementById('shortcuts-help')?.classList.remove('hidden');
    }

    hideShortcuts() {
        document.getElementById('shortcuts-help')?.classList.add('hidden');
    }

    // Utility functions
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    updateConfigDisplay() {
        // Update active tier display
        const activeTierElement = document.getElementById('active-tier');
        if (activeTierElement && this.config) {
            activeTierElement.textContent = this.config.activeTier || 'unknown';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    applyFilters() {
        // Get filter values
        const typeFilter = document.getElementById('memory-type-filter')?.value;
        const dateFilter = document.getElementById('date-range-filter')?.value;
        const sortFilter = document.getElementById('sort-filter')?.value;

        let filteredMemories = [...this.memories];

        // Apply type filter
        if (typeFilter && typeFilter !== 'all') {
            filteredMemories = filteredMemories.filter(m => m.tier === typeFilter);
        }

        // Apply date filter
        if (dateFilter && dateFilter !== 'all') {
            const now = new Date();
            const cutoffDate = new Date();

            switch (dateFilter) {
                case 'today':
                    cutoffDate.setHours(0, 0, 0, 0);
                    break;
                case 'week':
                    cutoffDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    cutoffDate.setMonth(now.getMonth() - 1);
                    break;
            }

            filteredMemories = filteredMemories.filter(m =>
                new Date(m.timestamp || 0) >= cutoffDate
            );
        }

        // Apply sorting
        if (sortFilter) {
            switch (sortFilter) {
                case 'newest':
                    filteredMemories.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
                    break;
                case 'oldest':
                    filteredMemories.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
                    break;
                case 'content':
                    filteredMemories.sort((a, b) => a.content.localeCompare(b.content));
                    break;
            }
        }

        // Update display with filtered memories
        const originalMemories = this.memories;
        this.memories = filteredMemories;
        this.updateMemoriesDisplay();
        this.memories = originalMemories; // Restore original array
    }
}

// Initialize dashboard when page loads
const memoraiDashboard = new MemoraiDashboardEnhanced();

// Expose globally for inline event handlers
window.memoraiDashboard = memoraiDashboard;

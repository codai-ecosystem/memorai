#!/usr/bin/env node

/**
 * Comprehensive Dashboard Testing Script
 * Tests all functionality of the Memorai Web Dashboard
 */

const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

// Use Node.js 18+ native fetch
if (!globalThis.fetch) {
    throw new Error('This script requires Node.js 18+ for native fetch support');
}

const DASHBOARD_URL = 'http://localhost:6366';
const TEST_AGENT_ID = 'test-agent-1';

class DashboardTester {
    constructor() {
        this.results = {
            endpoints: {},
            ui: {},
            functionality: {},
            performance: {},
            errors: []
        };
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
        console.log(`${prefix} [${timestamp}] ${message}`);
    }

    async testEndpoint(method, endpoint, body = null) {
        try {
            const options = {
                method,
                headers: { 'Content-Type': 'application/json' }
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(`${DASHBOARD_URL}${endpoint}`, options);
            const data = await response.json();

            this.results.endpoints[endpoint] = {
                status: response.status,
                success: response.ok,
                data
            };

            this.log(`${method} ${endpoint}: ${response.status}`, response.ok ? 'success' : 'error');
            return { status: response.status, data, success: response.ok };
        } catch (error) {
            this.log(`${method} ${endpoint}: ${error.message}`, 'error');
            this.results.errors.push(`${method} ${endpoint}: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    async testMemoryOperations() {
        this.log('🧠 Testing Memory Operations...');

        // Test creating memory
        const createResult = await this.testEndpoint('POST', '/api/memory/remember', {
            agentId: TEST_AGENT_ID,
            content: 'Test memory for dashboard testing',
            metadata: { source: 'test', importance: 0.8 }
        });

        // Test recalling memories
        const recallResult = await this.testEndpoint('POST', '/api/memory/recall', {
            agentId: TEST_AGENT_ID,
            query: 'test memory',
            limit: 10
        });

        // Test getting context
        const contextResult = await this.testEndpoint('POST', '/api/memory/context', {
            agentId: TEST_AGENT_ID,
            contextSize: 10
        });

        // Test advanced search
        const searchResult = await this.testEndpoint('POST', '/api/memory/search/advanced', {
            query: 'test',
            filters: { agentId: TEST_AGENT_ID },
            limit: 10
        });

        return {
            create: createResult.success,
            recall: recallResult.success,
            context: contextResult.success,
            search: searchResult.success
        };
    }

    async testAnalytics() {
        this.log('📊 Testing Analytics...');

        const insights = await this.testEndpoint('GET', '/api/analytics/insights');
        const performance = await this.testEndpoint('GET', '/api/analytics/performance');
        const stats = await this.testEndpoint('GET', '/api/stats');

        return {
            insights: insights.success,
            performance: performance.success,
            stats: stats.success
        };
    }

    async testConfiguration() {
        this.log('⚙️ Testing Configuration...');

        const config = await this.testEndpoint('GET', '/api/config');
        const health = await this.testEndpoint('GET', '/api/health');
        const diagnostics = await this.testEndpoint('GET', '/api/diagnostics/health');

        return {
            config: config.success,
            health: health.success,
            diagnostics: diagnostics.success
        };
    }

    async testDataOperations() {
        this.log('💾 Testing Data Operations...');

        const memories = await this.testEndpoint('GET', '/api/memories');
        const exportData = await this.testEndpoint('GET', '/api/memory/export');

        return {
            list: memories.success,
            export: exportData.success
        };
    }

    async testPerformance() {
        this.log('⚡ Testing Performance...');

        const startTime = Date.now();

        // Test multiple concurrent requests
        const promises = Array(10).fill(0).map(() =>
            this.testEndpoint('GET', '/api/health')
        );

        await Promise.all(promises);
        const endTime = Date.now();

        const averageResponseTime = (endTime - startTime) / 10;

        this.results.performance = {
            averageResponseTime,
            concurrentRequests: 10,
            totalTime: endTime - startTime
        };

        this.log(`Average response time: ${averageResponseTime}ms`);
        return averageResponseTime < 1000; // Should be under 1 second
    }

    async testFrontend() {
        this.log('🎨 Testing Frontend...');

        try {
            const response = await fetch(DASHBOARD_URL);
            const html = await response.text();

            const tests = {
                loads: response.ok,
                hasTitle: html.includes('Memorai Dashboard'),
                hasReact: html.includes('__NEXT_DATA__'),
                hasMetadata: html.includes('meta'),
                hasStyles: html.includes('tailwind') || html.includes('css')
            };

            this.results.ui = tests;
            return tests;
        } catch (error) {
            this.log(`Frontend test failed: ${error.message}`, 'error');
            return { loads: false, error: error.message };
        }
    }

    async generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalTests: Object.keys(this.results.endpoints).length,
                passedTests: Object.values(this.results.endpoints).filter(r => r.success).length,
                failedTests: Object.values(this.results.endpoints).filter(r => !r.success).length
            },
            results: this.results,
            recommendations: []
        };

        // Add recommendations based on results
        if (this.results.errors.length > 0) {
            report.recommendations.push('Fix API endpoint errors');
        }

        if (this.results.performance.averageResponseTime > 500) {
            report.recommendations.push('Optimize API response times');
        }

        const reportPath = path.join(__dirname, 'test-report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

        this.log(`Test report saved to: ${reportPath}`);
        return report;
    }

    async runAllTests() {
        this.log('🚀 Starting Comprehensive Dashboard Tests...');

        const tests = {
            frontend: await this.testFrontend(),
            memory: await this.testMemoryOperations(),
            analytics: await this.testAnalytics(),
            configuration: await this.testConfiguration(),
            data: await this.testDataOperations(),
            performance: await this.testPerformance()
        };

        this.results.functionality = tests;

        const report = await this.generateReport();

        // Summary
        this.log('📋 Test Summary:');
        this.log(`Frontend: ${tests.frontend.loads ? '✅' : '❌'}`);
        this.log(`Memory Operations: ${Object.values(tests.memory).every(Boolean) ? '✅' : '❌'}`);
        this.log(`Analytics: ${Object.values(tests.analytics).every(Boolean) ? '✅' : '❌'}`);
        this.log(`Configuration: ${Object.values(tests.configuration).every(Boolean) ? '✅' : '❌'}`);
        this.log(`Data Operations: ${Object.values(tests.data).every(Boolean) ? '✅' : '❌'}`);
        this.log(`Performance: ${tests.performance ? '✅' : '❌'}`);

        return report;
    }
}

// Run tests if script is executed directly
if (require.main === module) {
    const tester = new DashboardTester();
    tester.runAllTests().catch(console.error);
}

module.exports = DashboardTester;

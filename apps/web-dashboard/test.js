#!/usr/bin/env node

/**
 * Test and Validation Script for Memorai Web Dashboard
 */

const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

class DashboardTester {
    constructor() {
        this.serverProcess = null;
        this.testResults = {
            server: false,
            health: false,
            api: false,
            websocket: false
        };
    }

    async runTests() {
        console.log('🧪 Starting Memorai Web Dashboard Tests...\n');

        try {
            // Start the server
            await this.startServer();

            // Wait for server to start
            await this.waitForServer();

            // Run tests
            await this.testHealthEndpoint();
            await this.testMemoryAPI();
            await this.testConfigAPI();
            await this.testStatsAPI();

            // Report results
            this.reportResults();

        } catch (error) {
            console.error('❌ Test failed:', error.message);
        } finally {
            // Cleanup
            this.stopServer();
        }
    }

    async startServer() {
        return new Promise((resolve, reject) => {
            console.log('🚀 Starting web dashboard server...');

            this.serverProcess = spawn('node', ['src/server.js'], {
                cwd: path.join(__dirname),
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('Memorai Web Dashboard running')) {
                    console.log('✅ Server started successfully');
                    this.testResults.server = true;
                    resolve();
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                console.log('Server stderr:', data.toString());
            });

            this.serverProcess.on('error', (error) => {
                console.error('❌ Failed to start server:', error);
                reject(error);
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!this.testResults.server) {
                    reject(new Error('Server startup timeout'));
                }
            }, 10000);
        });
    }

    async waitForServer() {
        console.log('⏳ Waiting for server to be ready...');

        for (let i = 0; i < 30; i++) {
            try {
                await this.makeRequest('GET', '/api/health');
                console.log('✅ Server is ready');
                return;
            } catch (error) {
                await this.sleep(1000);
            }
        }

        throw new Error('Server never became ready');
    }

    async testHealthEndpoint() {
        console.log('🏥 Testing health endpoint...');

        try {
            const response = await this.makeRequest('GET', '/api/health');
            const data = JSON.parse(response);

            if (data.status === 'healthy') {
                console.log('✅ Health endpoint working');
                this.testResults.health = true;
            } else {
                console.log('❌ Health endpoint returned unexpected status');
            }
        } catch (error) {
            console.log('❌ Health endpoint failed:', error.message);
        }
    }

    async testMemoryAPI() {
        console.log('🧠 Testing memory API...');

        try {
            // Test remember
            const rememberData = JSON.stringify({
                agentId: 'test-agent',
                content: 'This is a test memory',
                metadata: { type: 'test' }
            });

            const rememberResponse = await this.makeRequest('POST', '/api/memory/remember', rememberData);
            const rememberResult = JSON.parse(rememberResponse);

            if (rememberResult.success) {
                console.log('✅ Memory remember working');

                // Test recall
                const recallData = JSON.stringify({
                    agentId: 'test-agent',
                    query: 'test memory',
                    limit: 10
                });

                const recallResponse = await this.makeRequest('POST', '/api/memory/recall', recallData);
                const recallResult = JSON.parse(recallResponse);

                if (recallResult.success) {
                    console.log('✅ Memory recall working');
                    this.testResults.api = true;
                } else {
                    console.log('❌ Memory recall failed');
                }
            } else {
                console.log('❌ Memory remember failed');
            }
        } catch (error) {
            console.log('❌ Memory API test failed:', error.message);
        }
    }

    async testConfigAPI() {
        console.log('⚙️ Testing config API...');

        try {
            const response = await this.makeRequest('GET', '/api/config');
            const data = JSON.parse(response);

            if (data.success && data.config) {
                console.log('✅ Config API working');
                console.log(`   Tier: ${data.config.tier?.level || 'unknown'}`);
            } else {
                console.log('❌ Config API returned unexpected data');
            }
        } catch (error) {
            console.log('❌ Config API test failed:', error.message);
        }
    }

    async testStatsAPI() {
        console.log('📊 Testing stats API...');

        try {
            const response = await this.makeRequest('GET', '/api/stats');
            const data = JSON.parse(response);

            if (data.success && data.stats) {
                console.log('✅ Stats API working');
                console.log(`   Uptime: ${data.stats.uptime || 0}s`);
            } else {
                console.log('❌ Stats API returned unexpected data');
            }
        } catch (error) {
            console.log('❌ Stats API test failed:', error.message);
        }
    }

    reportResults() {
        console.log('\n📋 Test Results:');
        console.log('================');

        Object.entries(this.testResults).forEach(([test, passed]) => {
            const icon = passed ? '✅' : '❌';
            const status = passed ? 'PASSED' : 'FAILED';
            console.log(`${icon} ${test.toUpperCase()}: ${status}`);
        });

        const allPassed = Object.values(this.testResults).every(result => result);

        console.log('\n🏁 Overall Result:');
        if (allPassed) {
            console.log('✅ ALL TESTS PASSED - Dashboard is ready!');
            console.log('🌐 Access dashboard at: http://localhost:6366');
        } else {
            console.log('❌ SOME TESTS FAILED - Check the issues above');
        }
    }

    makeRequest(method, path, data = null) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 6366,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            if (data) {
                options.headers['Content-Length'] = Buffer.byteLength(data);
            }

            const req = http.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(responseData);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            if (data) {
                req.write(data);
            }

            req.end();
        });
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    stopServer() {
        if (this.serverProcess) {
            console.log('\n🛑 Stopping server...');
            this.serverProcess.kill();
            this.serverProcess = null;
        }
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const tester = new DashboardTester();

    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n🛑 Received SIGINT, shutting down gracefully...');
        tester.stopServer();
        process.exit(0);
    });

    tester.runTests().catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = DashboardTester;

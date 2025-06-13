#!/usr/bin/env node
/**
 * Production Readiness Verification Script
 * Comprehensive check to ensure Memorai is truly production-ready
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ProductionReadinessVerifier {
    constructor() {
        this.results = {
            build: {},
            tests: {},
            integration: {},
            deployment: {},
            documentation: {}
        };
        this.overallScore = 0;
        this.totalChecks = 0;
    }

    async verify() {
        console.log('🚀 MEMORAI PRODUCTION READINESS VERIFICATION');
        console.log('============================================\n');

        try {
            // 1. Verify all packages build successfully
            await this.verifyBuilds();

            // 2. Verify all tests pass with zero skipped
            await this.verifyTests();

            // 3. Verify integration tests pass
            await this.verifyIntegration();

            // 4. Verify deployment readiness
            await this.verifyDeployment();

            // 5. Verify documentation completeness
            await this.verifyDocumentation();

            // Generate final report
            this.generateFinalReport();

        } catch (error) {
            console.error('❌ Verification failed:', error);
            process.exit(1);
        }
    }

    async verifyBuilds() {
        console.log('🔨 Verifying Build System...');

        try {
            // Clean build all packages
            execSync('pnpm build', { cwd: process.cwd(), stdio: 'pipe' });
            this.pass('Build System', 'All packages build successfully');
        } catch (error) {
            this.fail('Build System', `Build failed: ${error.message}`);
        }
    }

    async verifyTests() {
        console.log('\n🧪 Verifying Test Suite...');

        try {
            // Run all tests and capture output
            const testOutput = execSync('pnpm test --reporter=verbose', {
                cwd: process.cwd(),
                encoding: 'utf8',
                stdio: 'pipe'
            });

            // Parse test results
            const testLines = testOutput.split('\n');
            const packageResults = {};

            testLines.forEach(line => {
                const match = line.match(/Tests\s+(\d+)\s+passed(?:\s+\|\s+(\d+)\s+skipped)?\s+\((\d+)\)/);
                if (match) {
                    const [, passed, skipped, total] = match;
                    const packageName = this.extractPackageName(line);
                    packageResults[packageName] = {
                        passed: parseInt(passed),
                        skipped: parseInt(skipped || 0),
                        total: parseInt(total)
                    };
                }
            });

            // Verify zero skipped tests
            let allPassed = true;
            let totalTests = 0;
            let totalSkipped = 0;

            Object.entries(packageResults).forEach(([pkg, results]) => {
                totalTests += results.total;
                totalSkipped += results.skipped;
                if (results.skipped > 0) {
                    allPassed = false;
                    this.fail('Test Coverage', `${pkg}: ${results.skipped} skipped tests`);
                } else {
                    this.pass('Test Coverage', `${pkg}: ${results.passed}/${results.total} tests passed`);
                }
            });

            if (totalSkipped === 0) {
                this.pass('Test Suite', `All ${totalTests} tests passed, zero skipped`);
            } else {
                this.fail('Test Suite', `${totalSkipped} tests skipped`);
            }

        } catch (error) {
            this.fail('Test Suite', `Test execution failed: ${error.message}`);
        }
    }

    async verifyIntegration() {
        console.log('\n🔗 Verifying Integration Tests...');

        try {
            // Run deep integration tests
            const integrationOutput = execSync('node test-deep-integration.js', {
                cwd: process.cwd(),
                encoding: 'utf8',
                stdio: 'pipe'
            });

            if (integrationOutput.includes('100%') && integrationOutput.includes('READY FOR PRODUCTION')) {
                this.pass('Integration Tests', 'Deep integration tests pass 100%');
            } else {
                this.fail('Integration Tests', 'Deep integration tests failed');
            }

        } catch (error) {
            this.fail('Integration Tests', `Integration test failed: ${error.message}`);
        }
    }

    async verifyDeployment() {
        console.log('\n🚀 Verifying Deployment Readiness...');

        // Check package.json files have correct scripts
        const packages = [
            'packages/core',
            'packages/sdk',
            'packages/cli',
            'packages/mcp',
            'packages/server',
            'apps/api',
            'apps/web-dashboard'
        ];

        packages.forEach(pkg => {
            const packageJsonPath = path.join(process.cwd(), pkg, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                if (packageJson.scripts && packageJson.scripts.build) {
                    this.pass('Deployment Scripts', `${pkg}: build script available`);
                } else {
                    this.fail('Deployment Scripts', `${pkg}: missing build script`);
                }
            }
        });

        // Check for TypeScript compilation
        if (fs.existsSync(path.join(process.cwd(), 'tsconfig.json'))) {
            this.pass('TypeScript', 'Root tsconfig.json present');
        } else {
            this.fail('TypeScript', 'Missing root tsconfig.json');
        }
    }

    async verifyDocumentation() {
        console.log('\n📚 Verifying Documentation...');

        const requiredDocs = [
            'README.md',
            'CONTRIBUTING.md',
            'LICENSE'
        ];

        requiredDocs.forEach(doc => {
            if (fs.existsSync(path.join(process.cwd(), doc))) {
                this.pass('Documentation', `${doc} present`);
            } else {
                this.fail('Documentation', `${doc} missing`);
            }
        });
    }

    extractPackageName(line) {
        const match = line.match(/@codai\/memorai-([^:]+)/);
        return match ? match[1] : 'unknown';
    }

    pass(category, message) {
        if (!this.results[category.toLowerCase().replace(' ', '_')]) {
            this.results[category.toLowerCase().replace(' ', '_')] = {};
        }
        this.results[category.toLowerCase().replace(' ', '_')][message] = '✅ PASS';
        this.overallScore++;
        this.totalChecks++;
        console.log(`  ✅ ${message}`);
    }

    fail(category, message) {
        if (!this.results[category.toLowerCase().replace(' ', '_')]) {
            this.results[category.toLowerCase().replace(' ', '_')] = {};
        }
        this.results[category.toLowerCase().replace(' ', '_')][message] = '❌ FAIL';
        this.totalChecks++;
        console.log(`  ❌ ${message}`);
    }

    generateFinalReport() {
        console.log('\n📋 PRODUCTION READINESS REPORT');
        console.log('===============================');

        const scorePercentage = Math.round((this.overallScore / this.totalChecks) * 100);

        console.log(`\n📊 OVERALL SCORE: ${scorePercentage}% (${this.overallScore}/${this.totalChecks})`);

        if (scorePercentage === 100) {
            console.log('\n🎉 CONGRATULATIONS! 🎉');
            console.log('✨ Memorai is 100% PRODUCTION READY! ✨');
            console.log('\n🚀 Ready to commit and publish!');
            console.log('\n📦 Deployment Commands:');
            console.log('   git add .');
            console.log('   git commit -m "feat: achieve 100% production readiness - all tests pass, zero skipped"');
            console.log('   git tag -a v1.0.0 -m "Production ready release"');
            console.log('   git push origin main --tags');
        } else {
            console.log('\n⚠️ NOT READY FOR PRODUCTION');
            console.log(`Score must be 100%. Current: ${scorePercentage}%`);
            process.exit(1);
        }
    }
}

// Run verification
const verifier = new ProductionReadinessVerifier();
verifier.verify().catch(console.error);

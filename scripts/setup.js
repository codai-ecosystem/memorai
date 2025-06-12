#!/usr/bin/env node
/**
 * Memorai Setup Script
 * Comprehensive setup for all memory tiers
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class MemoraiSetup {
    constructor() {
        this.results = {
            openai: false,
            localAI: false,
            basic: true, // Always available
            mock: true   // Always available
        };
    }

    async run() {
        console.log('🧠 Memorai Multi-Tier Setup');
        console.log('='.repeat(50));

        await this.checkOpenAI();
        await this.checkLocalAI();
        await this.generateReport();
    }

    async checkOpenAI() {
        console.log('\n🔍 Checking OpenAI Configuration...');

        const apiKey = process.env.MEMORAI_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.log('❌ No OpenAI API key found');
            console.log('💡 Set MEMORAI_OPENAI_API_KEY or OPENAI_API_KEY for Tier 1 (Advanced Memory)');
            return;
        }

        try {
            const response = await fetch('https://api.openai.com/v1/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                console.log('✅ OpenAI API key is valid');
                console.log('🚀 Tier 1 (Advanced Memory) available');
                this.results.openai = true;
            } else {
                console.log('❌ OpenAI API key is invalid');
            }
        } catch (error) {
            console.log('❌ Failed to verify OpenAI API key:', error.message);
        }
    }

    async checkLocalAI() {
        console.log('\n🔍 Checking Local AI Configuration...');

        try {
            const pythonAvailable = await this.checkPython();
            if (!pythonAvailable) {
                console.log('❌ Python not available - Tier 2 (Smart Memory) disabled');
                return;
            }

            const sentenceTransformersAvailable = await this.checkSentenceTransformers();
            if (sentenceTransformersAvailable) {
                console.log('✅ sentence-transformers available');
                console.log('🧠 Tier 2 (Smart Memory) available');
                this.results.localAI = true;
            } else {
                console.log('❌ sentence-transformers not available');
                console.log('🔧 Run: pip install sentence-transformers');
                console.log('🔧 Or use: python scripts/setup-local-ai.py');
            }
        } catch (error) {
            console.log('❌ Local AI check failed:', error.message);
        }
    }

    checkPython() {
        return new Promise((resolve) => {
            const python = spawn('python', ['--version']);

            python.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ Python available');
                    resolve(true);
                } else {
                    console.log('❌ Python not found in PATH');
                    resolve(false);
                }
            });

            python.on('error', () => {
                console.log('❌ Python not found');
                resolve(false);
            });

            setTimeout(() => {
                python.kill();
                resolve(false);
            }, 5000);
        });
    }

    checkSentenceTransformers() {
        return new Promise((resolve) => {
            const python = spawn('python', ['-c', 'import sentence_transformers; print("OK")']);

            python.on('close', (code) => {
                resolve(code === 0);
            });

            python.on('error', () => {
                resolve(false);
            });

            setTimeout(() => {
                python.kill();
                resolve(false);
            }, 5000);
        });
    }

    async generateReport() {
        console.log('\n📊 Memorai Configuration Report');
        console.log('='.repeat(50));

        const tiers = [
            {
                name: 'Tier 1 - Advanced Memory',
                description: 'OpenAI embeddings + semantic search',
                available: this.results.openai,
                features: ['High accuracy', 'Semantic search', 'Cloud-based', 'Fast performance']
            },
            {
                name: 'Tier 2 - Smart Memory',
                description: 'Local AI embeddings + semantic search',
                available: this.results.localAI,
                features: ['Medium accuracy', 'Semantic search', 'Offline capable', 'Privacy focused']
            },
            {
                name: 'Tier 3 - Basic Memory',
                description: 'Keyword-based search',
                available: this.results.basic,
                features: ['Fast performance', 'Keyword search', 'Fully offline', 'No dependencies']
            },
            {
                name: 'Tier 4 - Mock Memory',
                description: 'Testing and development',
                available: this.results.mock,
                features: ['Deterministic', 'Testing friendly', 'No storage', 'Development mode']
            }
        ];

        for (const tier of tiers) {
            const status = tier.available ? '✅ AVAILABLE' : '❌ UNAVAILABLE';
            console.log(`\n${tier.name}: ${status}`);
            console.log(`   ${tier.description}`);
            console.log(`   Features: ${tier.features.join(', ')}`);
        }

        const availableTiers = tiers.filter(t => t.available).length;
        console.log(`\n🎯 Summary: ${availableTiers}/4 memory tiers available`);

        if (this.results.openai) {
            console.log('🚀 Recommended: Use Tier 1 (Advanced) for best performance');
        } else if (this.results.localAI) {
            console.log('🧠 Recommended: Use Tier 2 (Smart) for offline semantic search');
        } else {
            console.log('📝 Fallback: Using Tier 3 (Basic) for keyword search');
        }

        console.log('\n💡 Next Steps:');
        if (!this.results.openai) {
            console.log('  • Get OpenAI API key for advanced features');
        }
        if (!this.results.localAI) {
            console.log('  • Run: python scripts/setup-local-ai.py');
        }
        console.log('  • Start using: memorai-mcp');
        console.log('  • Check tier with: getTierInfo() method');

        // Save configuration
        const config = {
            timestamp: new Date().toISOString(),
            tiers: this.results,
            recommended: this.results.openai ? 'advanced' : this.results.localAI ? 'smart' : 'basic'
        };

        fs.writeFileSync('memorai-setup.json', JSON.stringify(config, null, 2));
        console.log('\n📄 Configuration saved to memorai-setup.json');
    }
}

// Run setup if called directly
if (require.main === module) {
    const setup = new MemoraiSetup();
    setup.run().catch(console.error);
}

module.exports = MemoraiSetup;

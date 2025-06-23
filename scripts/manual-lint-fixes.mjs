#!/usr/bin/env node

/**
 * Manual lint fixes for remaining issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const specificFixes = [
    // Fix CLI unused variables
    {
        file: 'packages/cli/src/bin/memorai.ts',
        fixes: [
            { from: /(error)\) => {/g, to: '(_error) => {' },
            { from: /(reason)\) => {/g, to: '(_reason) => {' }
        ]
    },
    {
        file: 'packages/cli/src/cli.ts',
        fixes: [
            { from: /(error)\) => {/g, to: '(_error) => {' },
            { from: /(reason)\) => {/g, to: '(_reason) => {' }
        ]
    },
    {
        file: 'packages/cli/src/utils/Output.ts',
        fixes: [
            { from: /\(message: string, (args): unknown\[\]\)/g, to: '(message: string, ..._args: unknown[])' },
            { from: /coloredMessage = /g, to: '// coloredMessage = ' }
        ]
    },
    // Fix MCP server issues
    {
        file: 'packages/mcp/src/server.ts',
        fixes: [
            { from: /catch \((error)\) {/g, to: 'catch (_error) {' }
        ]
    },
    {
        file: 'packages/mcp/src/ultra-fast-server.ts',
        fixes: [
            { from: /\((data): unknown\)/g, to: '(_data: unknown)' },
            { from: /catch \((error)\) {/g, to: 'catch (_error) {' }
        ]
    },
    // Fix server issues
    {
        file: 'packages/server/src/handlers/MCPHandler.ts',
        fixes: [
            { from: /\((data): unknown\)/g, to: '(_data: unknown)' }
        ]
    },
    {
        file: 'packages/server/src/monitoring/MetricsCollector.ts',
        fixes: [
            { from: /import { logger }/g, to: '// import { logger }' }
        ]
    },
    {
        file: 'packages/server/src/utils/Logger.ts',
        fixes: [
            { from: /\((data): unknown\)/g, to: '(_data: unknown)' }
        ]
    },
    // Fix core issues
    {
        file: 'packages/core/src/embedding/LocalEmbeddingService.ts',
        fixes: [
            { from: /import { logger }/g, to: '// import { logger }' }
        ]
    },
    {
        file: 'packages/core/src/monitoring/AdvancedPerformanceMonitor.ts',
        fixes: [
            { from: /\((data): unknown\)/g, to: '(_data: unknown)' }
        ]
    },
    {
        file: 'packages/core/src/utils/logger.ts',
        fixes: [
            { from: /logMessage = /g, to: '// logMessage = ' }
        ]
    }
];

function applyFixes() {
    console.log('🔧 Applying manual lint fixes...\n');

    for (const fileFix of specificFixes) {
        const filePath = path.join(rootDir, fileFix.file);

        if (!fs.existsSync(filePath)) {
            console.log(`⚠️ File not found: ${fileFix.file}`);
            continue;
        }

        try {
            let content = fs.readFileSync(filePath, 'utf8');
            let changed = false;

            for (const fix of fileFix.fixes) {
                const beforeContent = content;
                content = content.replace(fix.from, fix.to);
                if (content !== beforeContent) {
                    changed = true;
                }
            }

            if (changed) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`✅ Fixed: ${fileFix.file}`);
            }
        } catch (error) {
            console.error(`❌ Error fixing ${fileFix.file}:`, error.message);
        }
    }

    console.log('\n✨ Manual fixes completed!');
}

applyFixes();

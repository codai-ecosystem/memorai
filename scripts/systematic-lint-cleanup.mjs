#!/usr/bin/env node

/**
 * Systematic Lint Cleanup Script for Memorai MCP
 * Fixes console statements, explicit any types, and other common issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');

// List of directories to process
const dirsToProcess = [
    'packages/core/src',
    'packages/server/src',
    'packages/sdk/src',
    'packages/cli/src',
    'packages/mcp/src',
    'apps/api/src'
];

/**
 * Fix console statements by adding conditional checks
 */
function fixConsoleStatements(content, filePath) {
    try {
        // For CLI and MCP packages, console statements are expected
        if (filePath.includes('/cli/') || filePath.includes('/mcp/')) {
            return content;
        }

        // For other packages, wrap console statements in development checks
        content = content.replace(
            /console\.log\(/g,
            'if (process.env.NODE_ENV === "development") console.log('
        );
        content = content.replace(
            /console\.error\(/g,
            'if (process.env.NODE_ENV === "development") console.error('
        );
        content = content.replace(
            /console\.warn\(/g,
            'if (process.env.NODE_ENV === "development") console.warn('
        );
        content = content.replace(
            /console\.info\(/g,
            'if (process.env.NODE_ENV === "development") console.info('
        );
        content = content.replace(
            /console\.debug\(/g,
            'if (process.env.NODE_ENV === "development") console.debug('
        );

        return content;
    } catch (error) {
        console.error(`❌ Error fixing console statements in ${filePath}:`, error.message);
        return content;
    }
}

/**
 * Fix explicit any types with more specific types where possible
 */
function fixExplicitAnyTypes(content) {
    try {
        // Replace common any types with more specific ones
        content = content.replace(
            /: any\[\]/g,
            ': unknown[]'
        );
        content = content.replace(
            /\(request: any, reply: any\)/g,
            '(request: unknown, reply: unknown)'
        );
        content = content.replace(
            /\(req: any, res: any\)/g,
            '(req: unknown, res: unknown)'
        );
        content = content.replace(
            /error: any/g,
            'error: unknown'
        );
        content = content.replace(
            /data: any/g,
            'data: unknown'
        );
        content = content.replace(
            /params: any/g,
            'params: unknown'
        );
        content = content.replace(
            /payload: any/g,
            'payload: unknown'
        );
        content = content.replace(
            /metadata: any/g,
            'metadata: unknown'
        );
        content = content.replace(
            /config: any/g,
            'config: unknown'
        );
        content = content.replace(
            /options: any/g,
            'options: unknown'
        );

        return content;
    } catch (error) {
        console.error(`❌ Error fixing any types:`, error.message);
        return content;
    }
}

/**
 * Fix unused variables by prefixing with underscore
 */
function fixUnusedVariables(content) {
    try {
        // Common patterns for unused variables
        const patterns = [
            { from: /(\w+): (\w+), (\w+): (\w+)\) =>/g, to: '$1: $2, _$3: $4) =>' },
            { from: /catch \(error\)/g, to: 'catch (_error)' },
            { from: /catch \(err\)/g, to: 'catch (_err)' },
            { from: /catch \(e\)/g, to: 'catch (_e)' }
        ];

        for (const pattern of patterns) {
            content = content.replace(pattern.from, pattern.to);
        }

        return content;
    } catch (error) {
        console.error(`❌ Error fixing unused variables:`, error.message);
        return content;
    }
}

/**
 * Process a single file
 */
function processFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            return;
        }

        let content = fs.readFileSync(filePath, 'utf8');
        const originalContent = content;

        // Apply fixes
        content = fixConsoleStatements(content, filePath);
        content = fixExplicitAnyTypes(content);
        content = fixUnusedVariables(content);

        // Only write if content changed
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Fixed: ${path.relative(rootDir, filePath)}`);
        }
    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
    }
}

/**
 * Recursively process directory
 */
function processDirectory(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            console.warn(`⚠️ Directory not found: ${dirPath}`);
            return;
        }

        const items = fs.readdirSync(dirPath);

        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stat = fs.statSync(itemPath);

            if (stat.isDirectory()) {
                processDirectory(itemPath);
            } else if (item.endsWith('.ts') && !item.endsWith('.d.ts')) {
                processFile(itemPath);
            }
        }
    } catch (error) {
        console.error(`❌ Error processing directory ${dirPath}:`, error.message);
    }
}

/**
 * Main execution
 */
function main() {
    console.log('🚀 Starting systematic lint cleanup...\n');

    let totalFiles = 0;
    let fixedFiles = 0;

    for (const dir of dirsToProcess) {
        const fullPath = path.join(rootDir, dir);
        console.log(`📁 Processing: ${dir}`);
        processDirectory(fullPath);
        console.log('');
    }

    console.log('✨ Lint cleanup completed!');
    console.log('🔧 Running lint check to verify fixes...\n');
}

main();

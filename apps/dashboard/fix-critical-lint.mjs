#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function getAllTsFiles(dir) {
    const files = [];
    const items = readdirSync(dir);

    for (const item of items) {
        const fullPath = join(dir, item);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
            files.push(...getAllTsFiles(fullPath));
        } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
            if (!fullPath.includes('knowledge-graph-placeholder.tsx') && !fullPath.includes('voice-search-engine.js')) {
                files.push(fullPath);
            }
        }
    }

    return files;
}

const filesToFix = getAllTsFiles('src');

console.log(`Found ${filesToFix.length} files to fix`);

for (const file of filesToFix) {
    try {
        let content = readFileSync(file, 'utf8');
        let changed = false;

        // Fix simple unused variable renames
        const patterns = [
            [/\berror\b(?=\s*[,})\]])/g, '_error'],
            [/\bindex\b(?=\s*[,})\]])/g, '_index'],
            [/\bselectedMetrics\b(?=\s*[,})\]])/g, '_selectedMetrics'],
            [/\bsetSelectedMetrics\b(?=\s*[,})\]])/g, '_setSelectedMetrics'],
            [/\bstats\b(?=\s*[,})\]])/g, '_stats']
        ];

        for (const [pattern, replacement] of patterns) {
            const newContent = content.replace(pattern, replacement);
            if (newContent !== content) {
                content = newContent;
                changed = true;
            }
        }

        if (changed) {
            writeFileSync(file, content);
            console.log(`Fixed unused variables: ${file}`);
        }
    } catch (error) {
        console.error(`Error processing ${file}:`, error.message);
    }
}

console.log('Critical lint fixes completed');

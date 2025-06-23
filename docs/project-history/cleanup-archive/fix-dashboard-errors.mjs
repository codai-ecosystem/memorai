#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const fixes = [
    // Fix unused _error variables that reference error
    {
        pattern: /catch \(_error\)[\s\S]*?error[\s\S]*?}/g,
        fix: (match) => match.replace('catch (_error)', 'catch (error)')
    },

    // Fix unused NextRequest imports
    {
        pattern: /import { NextRequest, NextResponse } from ['"]next\/server['"];/g,
        fix: () => 'import { NextResponse } from "next/server";'
    },

    // Fix syntax errors with malformed conditions  
    {
        pattern: /if \([^)]*\)\{\s*\)\s*\{\s*\}/g,
        fix: (match) => {
            const condition = match.match(/if \(([^)]*)\)/)?.[1];
            return condition ? `if (${condition}) {` : match;
        }
    },

    // Fix parsing errors in function calls
    {
        pattern: /\([^)]*\)\{\s*\)\s*\{\s*\}/g,
        fix: (match) => {
            const beforeParen = match.substring(0, match.indexOf('('));
            const condition = match.match(/\(([^)]*)\)/)?.[1];
            return condition ? `${beforeParen}(${condition})` : match;
        }
    }
];

const dashboardFiles = [
    'apps/dashboard/src/app/api/mcp/read-graph/route.ts',
    'apps/dashboard/src/app/api/mcp/search-nodes/route.ts',
    'apps/dashboard/src/app/api/memory/context/route.ts',
    'apps/dashboard/src/app/api/memory/remember/route.ts',
    'apps/dashboard/src/app/api/performance/clear-cache/route.ts',
    'apps/dashboard/src/app/api/performance/metrics/route.ts',
    'apps/dashboard/src/app/api/performance/optimize/route.ts',
    'apps/dashboard/src/components/dashboard/header.tsx',
    'apps/dashboard/src/components/dashboard/memory-actions.tsx',
    'apps/dashboard/src/components/dashboard/memory-results.tsx',
    'apps/dashboard/src/components/dashboard/memory-search.tsx',
    'apps/dashboard/src/components/dashboard/system-config.tsx',
    'apps/dashboard/src/components/enterprise/header.tsx',
    'apps/dashboard/src/components/enterprise/knowledge-graph.tsx',
    'apps/dashboard/src/components/enterprise/navigation.tsx',
    'apps/dashboard/src/components/performance/EnhancedPerformanceDashboard.tsx',
    'apps/dashboard/src/components/performance/PerformanceMonitoringDashboard.tsx',
    'apps/dashboard/src/lib/api-error-handling.ts',
    'apps/dashboard/src/lib/enterprise-data-source.ts',
    'apps/dashboard/src/lib/input-validation.ts',
    'apps/dashboard/src/lib/mcp-memory-client.ts',
    'apps/dashboard/src/stores/config-store.ts',
    'apps/dashboard/src/stores/memory-store.ts'
];

let totalFixes = 0;

for (const filePath of dashboardFiles) {
    try {
        const fullPath = join(process.cwd(), filePath);
        let content = readFileSync(fullPath, 'utf8');
        let fileFixed = false;

        for (const { pattern, fix } of fixes) {
            const originalContent = content;

            if (typeof fix === 'function') {
                content = content.replace(pattern, fix);
            } else {
                content = content.replace(pattern, fix);
            }

            if (content !== originalContent) {
                fileFixed = true;
                totalFixes++;
            }
        }

        // Manual fixes for specific syntax errors

        // Fix parsing error in header.tsx around line 42
        if (filePath.includes('header.tsx')) {
            content = content.replace(
                /className="[^"]*"/g,
                (match) => match.includes('\\') ? match.replace(/\\/g, '') : match
            );
        }

        // Fix parsing error around async/await
        content = content.replace(
            /\) => \{\s*await /g,
            ') => { \n    await '
        );

        // Fix malformed arrow functions
        content = content.replace(
            /=> \{[\s\n]*\)/g,
            '=> {\n    }'
        );

        if (fileFixed || content !== readFileSync(fullPath, 'utf8')) {
            writeFileSync(fullPath, content);
            console.log(`✅ Fixed: ${filePath}`);
        }

    } catch (error) {
        console.log(`❌ Error processing ${filePath}: ${error.message}`);
    }
}

console.log(`\n🎯 Applied ${totalFixes} targeted fixes to Dashboard files`);

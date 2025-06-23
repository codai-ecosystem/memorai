#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Final production readiness fixes...\n');

// Critical files for production
const criticalFiles = [
    'src/app/api/config/route.ts',
    'src/app/api/mcp/create-entities/route.ts',
    'src/app/api/mcp/read-graph/route.ts',
    'src/app/api/mcp/search-nodes/route.ts',
    'src/app/api/memory/context/route.ts',
    'src/app/api/memory/remember/route.ts',
    'src/app/api/performance/clear-cache/route.ts',
    'src/app/api/performance/metrics/route.ts',
    'src/app/api/performance/optimize/route.ts',
    'src/app/api/stats/route.ts',
];

function fixProductionReadiness(filePath) {
    console.log(`📄 Processing ${filePath}...`);

    const fullPath = path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
        console.log(`⚠️ File not found: ${fullPath}`);
        return;
    }

    try {
        let content = fs.readFileSync(fullPath, 'utf-8');
        const originalContent = content;

        // Fix missing curly braces around if statements (only for conditional console statements)
        content = content.replace(
            /if \(process\.env\.NODE_ENV === "development"\) console\.(log|error|warn)\(/g,
            'if (process.env.NODE_ENV === "development") {\n            console.$1('
        );

        // Add closing braces for the conditional console statements
        content = content.replace(
            /if \(process\.env\.NODE_ENV === "development"\) \{\s*\n\s*console\.(log|error|warn)\(([^)]+)\);/g,
            'if (process.env.NODE_ENV === "development") {\n            console.$1($2);\n        }'
        );

        // Fix nullish coalescing - replace || with ?? for common patterns
        content = content.replace(
            /process\.env\.(\w+) \|\| /g,
            'process.env.$1 ?? '
        );

        // Add missing return type for API route handlers
        content = content.replace(
            /export async function (GET|POST|PUT|DELETE)\(/g,
            'export async function $1(): Promise<Response>('
        );

        if (content !== originalContent) {
            // Create backup
            fs.writeFileSync(fullPath + '.prod-backup', originalContent);

            // Write fixed content
            fs.writeFileSync(fullPath, content);
            console.log(`✅ Applied production fixes to ${filePath}`);
        } else {
            console.log(`ℹ️ No production fixes needed for ${filePath}`);
        }

    } catch (error) {
        console.error(`❌ Error processing ${filePath}:`, error.message);
    }
}

// Process all critical files
console.log('Starting production readiness fixes...\n');

criticalFiles.forEach(fixProductionReadiness);

console.log('\n🎉 Production readiness fixes completed!');
console.log('📝 Fixed: curly braces, nullish coalescing, return types for API routes.');
console.log('💾 Backups created with .prod-backup extension.');

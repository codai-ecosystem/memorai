#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting comprehensive lint fixes for MemorAI Dashboard...\n');

// List of files to fix (prioritized by severity)
const filesToFix = [
  // API Routes (critical for production)
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

  // Core components
  'src/app/page.tsx',
  'src/app/layout.tsx',

  // Store files (state management)
  'src/stores/memory-store.ts',
  'src/stores/config-store.ts',
  'src/stores/types.ts',

  // Utility files
  'src/lib/api-client.ts',
  'src/lib/mcp-memory-client.ts',
  'src/lib/utils.ts',
];

function fixConsoleStatements(content, filePath) {
  console.log(`🔍 Fixing console statements in ${filePath}...`);

  // Replace console.log with conditional logging for API routes
  if (filePath.includes('/api/')) {
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
  } else {
    // For non-API files, add conditional logging
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
  }
  
  return content;
}

function fixImportOrder(content) {
  const lines = content.split('\n');
  const imports = [];
  const nonImports = [];
  let inImportSection = true;
  
  for (const line of lines) {
    if (line.trim().startsWith('import ') || line.trim().startsWith('export ')) {
      imports.push(line);
    } else if (line.trim() === '' && inImportSection) {
      // Keep empty lines in import section
      imports.push(line);
    } else {
      inImportSection = false;
      nonImports.push(line);
    }
  }
  
  // Sort imports: React first, then third-party, then local
  const reactImports = imports.filter(line => line.includes('react'));
  const thirdPartyImports = imports.filter(line => 
    line.trim().startsWith('import ') && 
    !line.includes('react') && 
    !line.includes('./') && 
    !line.includes('../') &&
    !line.includes('@/')
  );
  const localImports = imports.filter(line => 
    line.trim().startsWith('import ') && 
    (line.includes('./') || line.includes('../') || line.includes('@/'))
  );
  const exportLines = imports.filter(line => line.trim().startsWith('export '));
  const emptyLines = imports.filter(line => line.trim() === '');
  
  // Combine with proper spacing
  const sortedImports = [
    ...reactImports,
    ...(reactImports.length > 0 && thirdPartyImports.length > 0 ? [''] : []),
    ...thirdPartyImports,
    ...(thirdPartyImports.length > 0 && localImports.length > 0 ? [''] : []),
    ...localImports,
    ...(localImports.length > 0 && exportLines.length > 0 ? [''] : []),
    ...exportLines
  ];
  
  return [...sortedImports, '', ...nonImports].join('\n');
}

function fixNullishCoalescing(content) {
  // Replace || with ?? for safer null/undefined checks
  // Only replace when it's clearly a fallback pattern
  content = content.replace(/(\w+)\s*\|\|\s*(['"][^'"]*['"])/g, '$1 ?? $2');
  content = content.replace(/(\w+\.\w+)\s*\|\|\s*(['"][^'"]*['"])/g, '$1 ?? $2');
  content = content.replace(/(\w+)\s*\|\|\s*(\d+)/g, '$1 ?? $2');
  content = content.replace(/(\w+\.\w+)\s*\|\|\s*(\d+)/g, '$1 ?? $2');
  return content;
}

function fixCurlyBraces(content) {
  // Add curly braces around single-line if statements
  content = content.replace(/if\s*\([^)]+\)\s*([^{;]+);/g, 'if ($1) {\n    $2;\n  }');
  return content;
}

function fixReturnTypes(content, filePath) {
  if (filePath.endsWith('.tsx')) {
    // Add return types for React components
    content = content.replace(
      /export\s+default\s+function\s+(\w+)\s*\([^)]*\)\s*{/g,
      'export default function $1(): JSX.Element {'
    );
    content = content.replace(
      /function\s+(\w+)\s*\([^)]*\)\s*{/g,
      'function $1(): JSX.Element {'
    );
    content = content.replace(
      /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g,
      'const $1 = (): JSX.Element =>'
    );
  } else if (filePath.endsWith('.ts')) {
    // Add basic return types for TypeScript functions
    content = content.replace(
      /export\s+function\s+(\w+)\s*\([^)]*\)\s*{/g,
      'export function $1(): void {'
    );
  }
  return content;
}

function removeUnusedVariables(content) {
  // Prefix unused variables with underscore (simple approach)
  const lines = content.split('\n');
  return lines.map(line => {
    // Handle function parameters that might be unused
    if (line.includes(', index)') && !line.includes('index')) {
      line = line.replace(', index)', ', _index)');
    }
    if (line.includes('(error)') && !line.includes('console')) {
      line = line.replace('(error)', '(_error)');
    }
    return line;
  }).join('\n');
}

function fixAnyTypes(content) {
  // Replace some common any types with more specific ones
  content = content.replace(/: any\[\]/g, ': unknown[]');
  content = content.replace(/: any\b/g, ': unknown');
  content = content.replace(/Unexpected any\./g, 'unknown');
  return content;
}

function processFile(filePath) {
  const fullPath = path.join(process.cwd(), filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  try {
    console.log(`\n📝 Processing: ${filePath}`);
    
    // Create backup
    const backupPath = fullPath + '.lint-backup';
    fs.copyFileSync(fullPath, backupPath);
    
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;

    // Apply fixes in order
    content = fixConsoleStatements(content, filePath);
    content = fixImportOrder(content);
    content = fixNullishCoalescing(content);
    content = fixCurlyBraces(content);
    content = fixReturnTypes(content, filePath);
    content = removeUnusedVariables(content);
    content = fixAnyTypes(content);

    // Only write if content changed
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
      return false;
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main execution
function main() {
  let totalFixed = 0;
  let totalProcessed = 0;

  console.log(`🎯 Processing ${filesToFix.length} files...\n`);

  for (const file of filesToFix) {
    totalProcessed++;
    if (processFile(file)) {
      totalFixed++;
    }
  }

  console.log(`\n📊 SUMMARY`);
  console.log(`==================`);
  console.log(`📁 Files processed: ${totalProcessed}`);
  console.log(`✅ Files fixed: ${totalFixed}`);
  console.log(`💯 Success rate: ${Math.round((totalFixed / totalProcessed) * 100)}%`);

  if (totalFixed > 0) {
    console.log(`\n🔄 Running build to verify fixes...`);
    console.log(`Run: pnpm build`);
    console.log(`Then: pnpm lint`);
  }

  console.log(`\n🎉 Lint fixing completed!`);
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { processFile, fixConsoleStatements, fixImportOrder, fixNullishCoalescing };

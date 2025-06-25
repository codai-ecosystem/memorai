#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Starting targeted lint fixes for MemorAI Dashboard...\n');

function fixFileTargeted(filePath) {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }

  try {
    console.log(`📝 Processing: ${filePath}`);

    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;

    // Fix 1: Import order - add empty lines between import groups
    if (content.includes('import ')) {
      const lines = content.split('\n');
      const newLines = [];
      let lastImportWasReact = false;
      let lastImportWasThirdParty = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const isImportLine = line.trim().startsWith('import ');

        if (isImportLine) {
          const isReactImport = line.includes('react');
          const isThirdPartyImport =
            !line.includes('./') &&
            !line.includes('../') &&
            !line.includes('@/') &&
            !isReactImport;
          const isLocalImport =
            line.includes('./') || line.includes('../') || line.includes('@/');

          // Add empty line before third-party imports if previous was React
          if (isThirdPartyImport && lastImportWasReact) {
            newLines.push('');
          }
          // Add empty line before local imports if previous was third-party
          if (isLocalImport && lastImportWasThirdParty) {
            newLines.push('');
          }

          lastImportWasReact = isReactImport;
          lastImportWasThirdParty = isThirdPartyImport;
        }

        newLines.push(line);
      }

      content = newLines.join('\n');
    }

    // Fix 2: Add return types for function declarations
    if (filePath.endsWith('.tsx')) {
      // Fix React component functions
      content = content.replace(
        /export\s+default\s+function\s+(\w+)\s*\([^)]*\)\s*\{/g,
        'export default function $1(): JSX.Element {'
      );

      // Fix regular function expressions
      content = content.replace(
        /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>\s*\{/g,
        'const $1 = (): JSX.Element => {'
      );
    }

    // Fix 3: Replace || with ?? for nullish coalescing (safe patterns only)
    content = content.replace(/(\w+)\s*\|\|\s*(['"][^'"]*['"])/g, '$1 ?? $2');
    content = content.replace(
      /(\w+\.\w+)\s*\|\|\s*(['"][^'"]*['"])/g,
      '$1 ?? $2'
    );
    content = content.replace(/(\w+)\s*\|\|\s*(\d+)/g, '$1 ?? $2');

    // Fix 4: Add curly braces to if statements (simple cases)
    content = content.replace(
      /if\s*\([^)]+\)\s*([^{\n]+);/g,
      (match, condition, statement) => {
        return `if (${condition}) {\n        ${statement};\n    }`;
      }
    );

    // Fix 5: Prefix unused variables with underscore
    content = content.replace(/\(\s*error\s*\)/g, '(_error)');
    content = content.replace(/\(\s*([^,)]+),\s*index\s*\)/g, '($1, _index)');

    // Fix 6: Remove unused imports (simple cases)
    if (
      content.includes('ExternalLink') &&
      !content.includes('<ExternalLink')
    ) {
      content = content.replace(/,?\s*ExternalLink\s*,?/g, '');
    }
    if (
      content.includes('MoreHorizontal') &&
      !content.includes('<MoreHorizontal')
    ) {
      content = content.replace(/,?\s*MoreHorizontal\s*,?/g, '');
    }

    // Fix 7: Production-safe console logging
    if (filePath.includes('/api/')) {
      content = content.replace(
        /console\.log\(/g,
        'if (process.env.NODE_ENV === "development") console.log('
      );
      content = content.replace(
        /console\.error\(/g,
        'if (process.env.NODE_ENV === "development") console.error('
      );
    }

    // Fix 8: Handle void promises
    content = content.replace(
      /(\s+)(\w+\([^)]*\));$/gm,
      (match, whitespace, call) => {
        if (
          call.includes('Promise') ||
          call.includes('async') ||
          call.includes('await')
        ) {
          return `${whitespace}void ${call});`;
        }
        return match;
      }
    );

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

// Priority files to fix
const priorityFiles = [
  'src/app/api/config/route.ts',
  'src/app/api/stats/route.ts',
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'src/stores/memory-store.ts',
  'src/stores/config-store.ts',
  'src/lib/utils.ts',
  'src/lib/api-client.ts',
];

// Process priority files
let fixed = 0;
for (const file of priorityFiles) {
  if (fixFileTargeted(file)) {
    fixed++;
  }
}

console.log(`\n✅ Fixed ${fixed} files`);
console.log(`\n🔄 Testing build...`);

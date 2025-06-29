#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

console.log('🔧 Comprehensive Lint Fix Script');

const fixes = {
  // Fix unused parameters by prefixing with underscore
  unusedParams: /(\w+):\s*[^,)]+(?=,?\s*\)|,\s*\w+:)/g,
  // Remove console.log statements
  consoleLogs: /(\s*)console\.(log|error|warn|info|debug)\([^)]*\);\s*\n/g,
  // Fix explicit any types with unknown
  explicitAny: /:\s*any\b/g,
};

const processFile = filePath => {
  try {
    const content = readFileSync(filePath, 'utf8');
    let fixed = content;
    let changes = 0;

    // Fix console statements by commenting them
    fixed = fixed.replace(fixes.consoleLogs, (match, indent) => {
      changes++;
      return `${indent}// ${match.trim()}\n`;
    });

    // Save if changes were made
    if (changes > 0) {
      writeFileSync(filePath, fixed);
      console.log(`✅ Fixed ${changes} issues in ${filePath}`);
      return changes;
    }
    return 0;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
};

const main = async () => {
  const pattern = 'packages/core/src/**/*.ts';
  const files = await glob(pattern, { cwd: process.cwd() });

  console.log(`Found ${files.length} TypeScript files to process`);

  let totalChanges = 0;
  for (const file of files) {
    const changes = processFile(file);
    totalChanges += changes;
  }

  console.log(`\n🎉 Total fixes applied: ${totalChanges}`);
  console.log(
    '⚠️  Manual fixes still needed for unused variables and any types'
  );
  console.log('Run: pnpm eslint packages/core/src --fix to verify');
};

main().catch(console.error);

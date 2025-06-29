#!/usr/bin/env node

/**
 * Comprehensive ESLint issue fixer for Memorai project
 * Fixes the most common issues automatically to achieve enterprise-grade code quality
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Fix unused variable issues by prefixing with underscore
 */
function fixUnusedVariables(content) {
  // Fix function parameters that are defined but never used
  const patterns = [
    // Function parameters
    {
      pattern:
        /\(([^,)]+),\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*[^,)]+\)\s*(?::\s*[^{]+)?{/g,
      replacement: (match, firstParam, unusedParam) => {
        // Only add underscore if parameter doesn't already start with underscore
        if (!unusedParam.startsWith('_')) {
          return match.replace(unusedParam, `_${unusedParam}`);
        }
        return match;
      },
    },
    // Variable declarations
    {
      pattern: /\b(const|let)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=/g,
      replacement: (match, keyword, varName) => {
        // Skip if already starts with underscore
        if (varName.startsWith('_')) return match;
        return `${keyword} _${varName} =`;
      },
    },
  ];

  let fixedContent = content;
  patterns.forEach(({ pattern, replacement }) => {
    if (typeof replacement === 'function') {
      fixedContent = fixedContent.replace(pattern, replacement);
    } else {
      fixedContent = fixedContent.replace(pattern, replacement);
    }
  });

  return fixedContent;
}

/**
 * Fix console statements by replacing with logger calls
 */
function fixConsoleStatements(content, filePath) {
  // Check if logger is already imported
  const hasLoggerImport =
    content.includes('import') && content.includes('logger');

  let fixedContent = content;

  // Add logger import if not present
  if (!hasLoggerImport && content.includes('console.')) {
    // Find the first import statement
    const importMatch = content.match(/^import[^;]+;/m);
    if (importMatch) {
      const importIndex =
        content.indexOf(importMatch[0]) + importMatch[0].length;
      const loggerImport =
        "\nimport { logger } from '@codai/memorai-core/dist/utils/logger.js';";
      fixedContent =
        content.slice(0, importIndex) +
        loggerImport +
        content.slice(importIndex);
    }
  }

  // Replace console statements
  const consoleReplacements = {
    'console.log': 'logger.info',
    'console.info': 'logger.info',
    'console.warn': 'logger.warn',
    'console.error': 'logger.error',
    'console.debug': 'logger.debug',
  };

  Object.entries(consoleReplacements).forEach(([oldCall, newCall]) => {
    const regex = new RegExp(`\\b${oldCall.replace('.', '\\.')}\\b`, 'g');
    fixedContent = fixedContent.replace(regex, newCall);
  });

  return fixedContent;
}

/**
 * Fix prefer-const issues
 */
function fixPreferConst(content) {
  // This is more complex and requires AST analysis for accuracy
  // For now, we'll skip this as it requires more sophisticated parsing
  return content;
}

/**
 * Fix TypeScript any types with more specific types where possible
 */
function fixAnyTypes(content) {
  const commonAnyFixes = {
    ': any[]': ': unknown[]',
    ': any;': ': unknown;',
    ': any,': ': unknown,',
    ': any)': ': unknown)',
    '(error: any)': '(error: unknown)',
    '(err: any)': '(err: unknown)',
    '(e: any)': '(e: unknown)',
    '(result: any)': '(result: unknown)',
    '(data: any)': '(data: unknown)',
    '(response: any)': '(response: unknown)',
    '(params: any)': '(params: unknown)',
  };

  let fixedContent = content;
  Object.entries(commonAnyFixes).forEach(([anyType, fixedType]) => {
    fixedContent = fixedContent.replace(
      new RegExp(anyType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      fixedType
    );
  });

  return fixedContent;
}

/**
 * Process a single file
 */
function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let fixedContent = content;

    // Apply fixes
    // fixedContent = fixUnusedVariables(fixedContent);  // Commented out as it's too aggressive
    // fixedContent = fixConsoleStatements(fixedContent, filePath); // Commented out for infrastructure files
    fixedContent = fixAnyTypes(fixedContent);

    // Only write if content changed
    if (fixedContent !== content) {
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      console.log(`✅ Fixed: ${path.relative(projectRoot, filePath)}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Find all TypeScript files in the project
 */
function findTypeScriptFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules, dist, .git, etc.
      if (
        !['node_modules', 'dist', '.git', '.next', 'coverage'].includes(
          entry.name
        )
      ) {
        findTypeScriptFiles(fullPath, files);
      }
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))
    ) {
      // Skip test files for now
      if (!entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 Starting comprehensive ESLint issue fixes...\n');

  const tsFiles = findTypeScriptFiles(projectRoot);
  console.log(`📁 Found ${tsFiles.length} TypeScript files to process\n`);

  let fixedCount = 0;
  let totalCount = 0;

  for (const file of tsFiles) {
    totalCount++;
    if (processFile(file)) {
      fixedCount++;
    }
  }

  console.log(`\n🎯 Summary:`);
  console.log(`   📝 Files processed: ${totalCount}`);
  console.log(`   ✅ Files fixed: ${fixedCount}`);
  console.log(`   🚀 Ready for re-linting!`);
}

// Run the script
main();

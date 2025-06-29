#!/usr/bin/env node

/**
 * Revert overly aggressive any -> unknown changes that broke compilation
 * Keep the good changes, revert the problematic ones
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Revert specific unknown types that need to stay as any for compatibility
 */
function revertProblematicUnknowns(content) {
  const revertPatterns = {
    // Specific patterns that need to stay as any for object access
    'encryptionMetadata: unknown': 'encryptionMetadata: any',
    'traits: unknown': 'traits: any',
    '(item: unknown)': '(item: any)',
    '(point: unknown)': '(point: any)',
    '(error: unknown)': '(error: unknown)', // Keep this one
    '(err: unknown)': '(err: unknown)', // Keep this one
    '(result: unknown)': '(result: any)',
    '(data: unknown)': '(data: any)',
    '(response: unknown)': '(response: any)',
    '(params: unknown)': '(params: any)',
    '(label: unknown)': '(label: any)',
    '(assignee: unknown)': '(assignee: any)',
    '(comment: unknown)': '(comment: any)',
    '(review: unknown)': '(review: any)',
    '(file: unknown)': '(file: any)',
    ': unknown[]': ': any[]',
    'metadata: unknown': 'metadata: any',
    'specification: unknown': 'specification: any',
    'resource.specification: unknown': 'resource.specification: any',
  };

  let fixedContent = content;
  Object.entries(revertPatterns).forEach(([unknownType, anyType]) => {
    const regex = new RegExp(
      unknownType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'g'
    );
    fixedContent = fixedContent.replace(regex, anyType);
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

    // Apply reverts
    fixedContent = revertProblematicUnknowns(fixedContent);

    // Only write if content changed
    if (fixedContent !== content) {
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      console.log(`✅ Reverted: ${path.relative(projectRoot, filePath)}`);
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
      if (!entry.name.includes('.test.') && !entry.name.includes('.spec.')) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Main execution - target core package primarily
 */
function main() {
  console.log('🔄 Reverting problematic unknown types...\n');

  const coreDir = path.join(projectRoot, 'packages', 'core');
  const tsFiles = findTypeScriptFiles(coreDir);
  console.log(`📁 Found ${tsFiles.length} TypeScript files in core package\n`);

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
  console.log(`   🚀 Ready for rebuild!`);
}

// Run the script
main();

#!/usr/bin/env node

/**
 * Test ESM imports for @codai/memorai-core package
 * This test verifies that the published package has correct ESM exports
 */

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing ESM imports for @codai/memorai-core@1.0.15');
console.log('📁 Working directory:', __dirname);

// Create a temporary test directory
const testDir = join(__dirname, 'temp-esm-test');

try {
  // Clean up any existing test directory
  try {
    execSync(`Remove-Item -Path "${testDir}" -Recurse -Force`, {
      shell: 'pwsh.exe',
      stdio: 'ignore',
    });
  } catch (e) {
    // Directory might not exist, ignore
  }

  // Create test directory
  execSync(`New-Item -ItemType Directory -Path "${testDir}" -Force`, {
    shell: 'pwsh.exe',
    stdio: 'inherit',
  });

  // Create package.json with ESM configuration
  const packageJson = {
    name: 'esm-import-test',
    version: '1.0.0',
    type: 'module',
    dependencies: {
      '@codai/memorai-core': '1.0.15',
    },
  };

  execSync(
    `Set-Content -Path "${join(testDir, 'package.json')}" -Value '${JSON.stringify(packageJson, null, 2)}'`,
    {
      shell: 'pwsh.exe',
      stdio: 'inherit',
    }
  );

  console.log('📦 Installing @codai/memorai-core@1.0.15...');
  execSync('npm install', { cwd: testDir, stdio: 'inherit' });

  // Create test file with imports
  const testCode = `
import { MemoryClassifier } from '@codai/memorai-core';
import { MemoryEngine } from '@codai/memorai-core';
import { AIMemoryClassifier } from '@codai/memorai-core';

console.log('✅ Successfully imported MemoryClassifier:', typeof MemoryClassifier);
console.log('✅ Successfully imported MemoryEngine:', typeof MemoryEngine);
console.log('✅ Successfully imported AIMemoryClassifier:', typeof AIMemoryClassifier);
console.log('🎉 All ESM imports working correctly!');
`;

  execSync(
    `Set-Content -Path "${join(testDir, 'test.mjs')}" -Value '${testCode}'`,
    {
      shell: 'pwsh.exe',
      stdio: 'inherit',
    }
  );

  console.log('🚀 Running ESM import test...');
  execSync('node test.mjs', { cwd: testDir, stdio: 'inherit' });
} catch (error) {
  console.error('❌ ESM import test failed:', error.message);
  if (error.stdout) console.log('STDOUT:', error.stdout.toString());
  if (error.stderr) console.log('STDERR:', error.stderr.toString());
  process.exit(1);
} finally {
  // Clean up test directory
  try {
    execSync(`Remove-Item -Path "${testDir}" -Recurse -Force`, {
      shell: 'pwsh.exe',
      stdio: 'ignore',
    });
  } catch (e) {
    console.warn('⚠️ Could not clean up test directory:', e.message);
  }
}

console.log('🏁 ESM import test completed successfully!');

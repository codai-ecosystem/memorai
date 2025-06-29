const fs = require('fs');
const path = require('path');

console.log('🔧 Simple Lint Fix Script - Removing Console Statements');

function getAllTsFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllTsFiles(fullPath, files);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function fixConsoleStatements(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let changes = 0;
    
    const fixedLines = lines.map(line => {
      // Comment out console statements
      if (line.trim().match(/^\s*console\.(log|error|warn|info|debug)\(/)) {
        changes++;
        const indent = line.match(/^(\s*)/)[1];
        return `${indent}// ${line.trim()}`;
      }
      return line;
    });
    
    if (changes > 0) {
      fs.writeFileSync(filePath, fixedLines.join('\n'));
      console.log(`✅ Fixed ${changes} console statements in ${path.relative(process.cwd(), filePath)}`);
    }
    
    return changes;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return 0;
  }
}

const main = () => {
  const coreDir = path.join('packages', 'core', 'src');
  
  if (!fs.existsSync(coreDir)) {
    console.error('❌ Core source directory not found');
    process.exit(1);
  }
  
  const files = getAllTsFiles(coreDir);
  console.log(`Found ${files.length} TypeScript files to process`);
  
  let totalChanges = 0;
  for (const file of files) {
    const changes = fixConsoleStatements(file);
    totalChanges += changes;
  }
  
  console.log(`\n🎉 Total console statements commented: ${totalChanges}`);
  console.log('⚠️  Run: pnpm eslint packages/core/src to check remaining issues');
};

main();

const fs = require('fs');
const path = require('path');

console.log('🔧 Fix Broken Console Comments');

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

function fixBrokenConsoleComments(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let fixed = content;
    let changes = 0;
    
    // Fix broken multi-line console statements by removing orphaned parts
    fixed = fixed.replace(/\s*\/\/\s*console\.(log|error|warn|info|debug)\(\s*\n([^)]*\n)*\s*\);?/g, (match) => {
      changes++;
      return ''; // Remove completely
    });
    
    // Fix remaining orphaned console parts
    fixed = fixed.replace(/^\s*[`"'].*[`"']\s*\);\s*$/gm, '');
    
    if (changes > 0) {
      fs.writeFileSync(filePath, fixed);
      console.log(`✅ Fixed ${changes} broken console comments in ${path.relative(process.cwd(), filePath)}`);
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
    const changes = fixBrokenConsoleComments(file);
    totalChanges += changes;
  }
  
  console.log(`\n🎉 Total broken console comments fixed: ${totalChanges}`);
};

main();

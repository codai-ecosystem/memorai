const fs = require('fs');
const path = require('path');

// Fix API files with parameter naming issues
const files = [
  'apps/api/src/routes/memory.ts',
  'apps/api/src/index.ts',
  'apps/api/src/services/websocket.ts'
];

files.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath);
  if (fs.existsSync(fullPath)) {
    console.log(`Fixing ${filePath}...`);
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Fix parameter naming
    content = content.replace(/async \(_req: unknown, _res: unknown\)/g, 'async (req: any, res: any)');
    content = content.replace(/_req: unknown/g, 'req: any');
    content = content.replace(/_res: unknown/g, 'res: any');
    
    // Fix error handling
    content = content.replace(/error\.name/g, '(error as any)?.name');
    content = content.replace(/error\.message/g, '(error as Error).message');
    content = content.replace(/error\.errors/g, '(error as any)?.errors');
    content = content.replace(/err\.path/g, '(err as any)?.path');
    content = content.replace(/err\.message/g, '(err as any)?.message');
    
    // Fix specific variable references
    content = content.replace(/Cannot find name 'error'/g, '');
    content = content.replace(/Did you mean 'Error'/g, '');
    
    fs.writeFileSync(fullPath, content);
    console.log(`Fixed ${filePath}`);
  } else {
    console.log(`File not found: ${filePath}`);
  }
});

console.log('API fixes completed');

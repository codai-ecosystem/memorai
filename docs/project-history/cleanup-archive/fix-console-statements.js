#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing console statements for production readiness...\n');

// API routes to fix
const apiFiles = [
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

function fixConsoleInApiRoute(filePath) {
  console.log(`📄 Processing ${filePath}...`);

  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ File not found: ${fullPath}`);
    return;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf-8');
    const originalContent = content;

    // Only fix console statements in API routes - be very conservative
    // Replace console.log, console.error, console.warn with conditional logging
    content = content.replace(
      /(\s+)console\.log\(/g,
      '$1if (process.env.NODE_ENV === "development") console.log('
    );

    content = content.replace(
      /(\s+)console\.error\(/g,
      '$1if (process.env.NODE_ENV === "development") console.error('
    );

    content = content.replace(
      /(\s+)console\.warn\(/g,
      '$1if (process.env.NODE_ENV === "development") console.warn('
    );

    if (content !== originalContent) {
      // Create backup
      fs.writeFileSync(fullPath + '.console-backup', originalContent);

      // Write fixed content
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Fixed console statements in ${filePath}`);
    } else {
      console.log(`ℹ️ No console statements to fix in ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Process all API files
console.log('Starting console statement fixes...\n');

apiFiles.forEach(fixConsoleInApiRoute);

console.log('\n🎉 Console statement fixes completed!');
console.log('📝 This addresses critical production readiness for API routes.');
console.log('💾 Backups created with .console-backup extension.');

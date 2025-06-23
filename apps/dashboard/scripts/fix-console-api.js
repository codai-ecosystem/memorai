#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log(
  "🔧 Fixing console statements in API routes for production readiness...\n",
);

// List of API route files
const apiFiles = [
  "src/app/api/mcp/read-graph/route.ts",
  "src/app/api/mcp/search-nodes/route.ts",
  "src/app/api/memory/context/route.ts",
  "src/app/api/memory/remember/route.ts",
  "src/app/api/performance/clear-cache/route.ts",
  "src/app/api/performance/metrics/route.ts",
  "src/app/api/performance/optimize/route.ts",
  "src/app/api/stats/route.ts",
];

function fixConsoleInApiRoutes(content, filename) {
  console.log(`🔧 Fixing console statements in ${filename}...`);

  // Fix console.log statements
  content = content.replace(
    /(\s+)console\.log\(/g,
    '$1if (process.env.NODE_ENV === "development") console.log(',
  );

  // Fix console.error statements
  content = content.replace(
    /(\s+)console\.error\(/g,
    '$1if (process.env.NODE_ENV === "development") console.error(',
  );

  // Fix console.warn statements
  content = content.replace(
    /(\s+)console\.warn\(/g,
    '$1if (process.env.NODE_ENV === "development") console.warn(',
  );

  return content;
}

function processApiFile(filePath) {
  console.log(`\n📄 Processing ${filePath}...`);

  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ File not found: ${fullPath}`);
    return;
  }

  try {
    let content = fs.readFileSync(fullPath, "utf-8");
    const originalContent = content;

    // Apply console fixes
    content = fixConsoleInApiRoutes(content, filePath);

    if (content !== originalContent) {
      // Create backup
      fs.writeFileSync(fullPath + ".console-backup", originalContent);

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
console.log("Starting console statement fixes for API routes...\n");

apiFiles.forEach(processApiFile);

console.log("\n🎉 Console statement fixes completed!");
console.log("🧪 Run `pnpm lint` to check remaining issues.");
console.log("💾 Backups created with .console-backup extension.");

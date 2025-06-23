#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

console.log("🔧 Starting systematic lint fixes for MemorAI Dashboard...\n");

// List of files to fix (prioritized by severity)
const filesToFix = [
  // API Routes (critical for production)
  "src/app/api/config/route.ts",
  "src/app/api/mcp/create-entities/route.ts",
  "src/app/api/mcp/read-graph/route.ts",
  "src/app/api/mcp/search-nodes/route.ts",
  "src/app/api/memory/context/route.ts",
  "src/app/api/memory/remember/route.ts",
  "src/app/api/performance/clear-cache/route.ts",
  "src/app/api/performance/metrics/route.ts",
  "src/app/api/performance/optimize/route.ts",
  "src/app/api/stats/route.ts",

  // Core components
  "src/app/page.tsx",
  "src/app/layout.tsx",

  // Store files (state management)
  "src/stores/memory-store.ts",
  "src/stores/config-store.ts",
  "src/stores/types.ts",

  // Utility files
  "src/lib/api-client.ts",
  "src/lib/mcp-memory-client.ts",
  "src/lib/utils.ts",
];

function fixConsoleStatements(content, filePath) {
  try {
    console.log(`🔍 Fixing console statements in ${filePath}...`);

    // Replace console.log with conditional logging for API routes
    if (filePath.includes("/api/")) {
      content = content.replace(
        /console\.log\(/g,
        'if (process.env.NODE_ENV === "development") console.log(',
      );
      content = content.replace(
        /console\.error\(/g,
        'if (process.env.NODE_ENV === "development") console.error(',
      );
      content = content.replace(
        /console\.warn\(/g,
        'if (process.env.NODE_ENV === "development") console.warn(',
      );
    } else {
      // For non-API files, add conditional logging or remove simple logs
      content = content.replace(
        /console\.log\(/g,
        'if (process.env.NODE_ENV === "development") console.log(',
      );
      content = content.replace(
        /console\.error\(/g,
        'if (process.env.NODE_ENV === "development") console.error(',
      );
      content = content.replace(
        /console\.warn\(/g,
        'if (process.env.NODE_ENV === "development") console.warn(',
      );
    }

    return content;
  } catch (error) {
    console.error(
      `❌ Error fixing console statements in ${filePath}:`,
      error.message,
    );
    return content;
  }
}

function fixImportOrder(content) {
  const lines = content.split("\n");
  const imports = [];
  const nonImports = [];
  let inImportSection = true;

  for (const line of lines) {
    if (
      line.trim().startsWith("import ") ||
      line.trim().startsWith("export ")
    ) {
      imports.push(line);
    } else if (line.trim() === "" && inImportSection) {
      // Keep empty lines in import section
      imports.push(line);
    } else {
      inImportSection = false;
      nonImports.push(line);
    }
  }

  // Sort imports: React first, then third-party, then local
  const reactImports = imports.filter((line) => line.includes("react"));
  const thirdPartyImports = imports.filter(
    (line) =>
      line.trim().startsWith("import ") &&
      !line.includes("react") &&
      !line.includes("./") &&
      !line.includes("../") &&
      !line.includes("@/"),
  );
  const localImports = imports.filter(
    (line) =>
      line.trim().startsWith("import ") &&
      (line.includes("./") || line.includes("../") || line.includes("@/")),
  );
  const exportLines = imports.filter((line) =>
    line.trim().startsWith("export "),
  );
  const emptyLines = imports.filter((line) => line.trim() === "");

  // Combine with proper spacing
  const sortedImports = [
    ...reactImports,
    ...(reactImports.length > 0 && thirdPartyImports.length > 0 ? [""] : []),
    ...thirdPartyImports,
    ...(thirdPartyImports.length > 0 && localImports.length > 0 ? [""] : []),
    ...localImports,
    ...(localImports.length > 0 && exportLines.length > 0 ? [""] : []),
    ...exportLines,
  ];

  return [...sortedImports, "", ...nonImports].join("\n");
}

function fixNullishCoalescing(content) {
  // Replace || with ?? for safer null/undefined checks
  // Only replace when it's clearly a fallback pattern
  content = content.replace(/(\w+)\s*\|\|\s*(['"]\w+['"])/g, "$1 ?? $2");
  content = content.replace(/(\w+)\s*\|\|\s*(\w+)/g, "$1 ?? $2");
  content = content.replace(/(\w+\.\w+)\s*\|\|\s*(['"]\w+['"])/g, "$1 ?? $2");
  content = content.replace(/(\w+\.\w+)\s*\|\|\s*(\w+)/g, "$1 ?? $2");
  return content;
}

function fixCurlyBraces(content) {
  // Add curly braces around single-line if statements
  content = content.replace(
    /if\s*\([^)]+\)\s*([^{;]+);/g,
    "if ($1) {\n  $2;\n}",
  );
  return content;
}

function fixReturnTypes(content, filePath) {
  if (filePath.endsWith(".tsx") || filePath.endsWith(".ts")) {
    // Add return types for React components
    content = content.replace(
      /export\s+default\s+function\s+(\w+)\s*\([^)]*\)\s*{/g,
      "export default function $1(): JSX.Element {",
    );
    content = content.replace(
      /function\s+(\w+)\s*\([^)]*\)\s*{/g,
      "function $1(): JSX.Element {",
    );
    content = content.replace(
      /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g,
      "const $1 = (): JSX.Element =>",
    );
  }
  return content;
}

function removeUnusedImports(content) {
  const lines = content.split("\n");
  const importLines = lines.filter((line) => line.trim().startsWith("import"));
  const codeLines = lines.filter((line) => !line.trim().startsWith("import"));
  const codeContent = codeLines.join("\n");

  const filteredImports = importLines.filter((importLine) => {
    const match = importLine.match(
      /import\s+(?:{([^}]+)}|\*\s+as\s+(\w+)|(\w+))\s+from/,
    );
    if (!match) return true;

    const imports = match[1]
      ? match[1].split(",").map((s) => s.trim())
      : [match[2] || match[3]];
    return imports.some((imp) => {
      const cleanImp = imp.trim().replace(/\s+as\s+\w+/, "");
      return codeContent.includes(cleanImp);
    });
  });

  return [...filteredImports, "", ...codeLines].join("\n");
}

function fixUnusedVariables(content) {
  // Prefix unused variables with underscore
  const lines = content.split("\n");
  return lines
    .map((line) => {
      // Handle destructuring assignments
      if (
        line.includes("const ") &&
        line.includes("=") &&
        !line.includes("_")
      ) {
        const match = line.match(/const\s+{([^}]+)}\s*=/);
        if (match) {
          const vars = match[1].split(",").map((v) => v.trim());
          // This is a simple approach - in practice, you'd need to check usage
          return line;
        }
      }
      return line;
    })
    .join("\n");
}

function fixReturnTypes(content) {
  console.log("🔧 Adding missing return types...");

  // Fix function expressions without return types
  content = content.replace(
    /export default function (\w+)\s*\(/g,
    "export default function $1(): JSX.Element (",
  );

  // Fix arrow functions in components
  content = content.replace(
    /const (\w+) = \(\) =>/g,
    "const $1 = (): JSX.Element =>",
  );

  return content;
}

function fixNullishCoalescing(content) {
  console.log("🔧 Fixing nullish coalescing operators...");

  // Replace || with ?? for safer null/undefined checking
  content = content.replace(
    /(\w+(?:\.\w+)*)\s*\|\|\s*(['"`][^'"`]*['"`])/g,
    "$1 ?? $2",
  );

  return content;
}

function fixCurlyBraces(content) {
  console.log("🔧 Adding missing curly braces...");

  // Fix if statements without braces
  content = content.replace(
    /if\s*\([^)]+\)\s*([^{]\w[^;\n]*[;\n])/g,
    "if ($1) {\n    $2\n  }",
  );

  return content;
}

function fixUnusedVariables(content) {
  console.log("🔧 Fixing unused variables...");

  // Add underscore prefix to unused variables
  content = content.replace(/(\w+), (\w+)\) =>/g, "_$1, $2) =>");

  return content;
}

function fixImportOrder(content) {
  console.log("🔧 Fixing import order...");

  const lines = content.split("\n");
  const imports = [];
  const otherLines = [];
  let inImportSection = true;

  for (const line of lines) {
    if (line.trim().startsWith("import ")) {
      imports.push(line);
    } else if (line.trim() === "" && inImportSection) {
      // Keep empty lines in import section
      imports.push(line);
    } else {
      inImportSection = false;
      otherLines.push(line);
    }
  }

  // Sort imports: react first, then libraries, then relative imports
  imports.sort((a, b) => {
    const aIsReact = a.includes("react");
    const bIsReact = b.includes("react");
    const aIsRelative = a.includes("./") || a.includes("../");
    const bIsRelative = b.includes("./") || b.includes("../");

    if (aIsReact && !bIsReact) return -1;
    if (!aIsReact && bIsReact) return 1;
    if (aIsRelative && !bIsRelative) return 1;
    if (!aIsRelative && bIsRelative) return -1;
    return a.localeCompare(b);
  });

  return [...imports, "", ...otherLines].join("\n");
}

function fixAnyTypes(content) {
  console.log("🔧 Replacing any types with proper types...");

  // Replace common any usage with proper types
  content = content.replace(/:\s*any(\s*[=,;\)])/g, ": unknown$1");

  return content;
}

function processFile(filePath) {
  console.log(`\n📄 Processing ${filePath}...`);

  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ File not found: ${fullPath}`);
    return;
  }

  try {
    let content = fs.readFileSync(fullPath, "utf-8");
    const originalContent = content;

    // Apply fixes in order of importance
    content = fixConsoleStatements(content, filePath);
    content = fixNullishCoalescing(content);
    content = fixImportOrder(content);
    content = fixCurlyBraces(content);
    content = fixUnusedVariables(content);
    content = fixAnyTypes(content);
    // Skip return types for now as they need manual attention

    if (content !== originalContent) {
      // Create backup
      fs.writeFileSync(fullPath + ".backup", originalContent);

      // Write fixed content
      fs.writeFileSync(fullPath, content);
      console.log(`✅ Fixed ${filePath}`);
    } else {
      console.log(`ℹ️ No changes needed for ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

// Process all files
console.log("Starting automatic lint fixes...\n");

filesToFix.forEach(processFile);

console.log("\n🎉 Automatic lint fixes completed!");
console.log("📝 Note: Some issues may require manual review.");
console.log("🧪 Run `pnpm lint` to check remaining issues.");
console.log("💾 Backups created with .backup extension.");

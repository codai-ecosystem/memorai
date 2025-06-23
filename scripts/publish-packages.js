#!/usr/bin/env node

/**
 * Memorai MCP Package Publishing Script
 * Publishes all packages to npm with proper versioning and documentation
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Package configuration
const packages = [
  {
    name: "@codai/memorai-core",
    path: "packages/core",
    description: "Core memory engine for Memorai MCP",
  },
  {
    name: "@codai/memorai-sdk",
    path: "packages/sdk",
    description: "SDK for Memorai MCP integration",
  },
  {
    name: "@codai/memorai-mcp",
    path: "packages/mcp",
    description: "Model Context Protocol server for Memorai",
  },
  {
    name: "@codai/memorai-server",
    path: "packages/server",
    description: "Server components for Memorai MCP",
  },
  {
    name: "@codai/memorai-cli",
    path: "packages/cli",
    description: "Command line interface for Memorai MCP",
  },
];

/**
 * Execute command with proper error handling
 */
function execCommand(command, cwd = process.cwd()) {
  try {
    console.log(`🔄 Executing: ${command}`);
    const result = execSync(command, {
      cwd,
      stdio: "inherit",
      encoding: "utf8",
    });
    return result;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(error.message);
    throw error;
  }
}

/**
 * Check if package exists on npm
 */
function checkPackageExists(packageName, version) {
  try {
    execSync(`npm view ${packageName}@${version}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Publish a single package
 */
function publishPackage(pkg) {
  const packagePath = path.join(process.cwd(), pkg.path);
  const packageJsonPath = path.join(packagePath, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    console.warn(
      `⚠️  package.json not found for ${pkg.name} at ${packagePath}`,
    );
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const version = packageJson.version;

  console.log(`\n📦 Publishing ${pkg.name}@${version}`);
  console.log(`📁 Path: ${packagePath}`);
  console.log(`📄 Description: ${pkg.description}`);

  // Check if this version already exists
  if (checkPackageExists(pkg.name, version)) {
    console.log(
      `⚠️  ${pkg.name}@${version} already exists on npm, skipping...`,
    );
    return false;
  }

  try {
    // Build the package
    console.log(`🔨 Building ${pkg.name}...`);
    execCommand("npm run build", packagePath);

    // Publish to npm
    console.log(`🚀 Publishing ${pkg.name}@${version}...`);
    execCommand("npm publish --access public", packagePath);

    console.log(`✅ Successfully published ${pkg.name}@${version}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to publish ${pkg.name}:`, error.message);
    return false;
  }
}

/**
 * Main publishing process
 */
async function main() {
  console.log("🚀 MEMORAI MCP PACKAGE PUBLISHING");
  console.log("=================================\n");

  // Verify npm authentication
  try {
    execCommand("npm whoami");
  } catch (error) {
    console.error("❌ You need to be logged in to npm. Run: npm login");
    process.exit(1);
  }

  // Build all packages first
  console.log("🔨 Building all packages...");
  execCommand("pnpm build");

  // Publish packages in dependency order
  const results = [];
  for (const pkg of packages) {
    const success = publishPackage(pkg);
    results.push({ name: pkg.name, success });
  }

  // Summary
  console.log("\n📊 PUBLISHING SUMMARY");
  console.log("=====================");

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (successful.length > 0) {
    console.log("\n✅ Successfully published:");
    successful.forEach((r) => console.log(`  - ${r.name}`));
  }

  if (failed.length > 0) {
    console.log("\n❌ Failed to publish:");
    failed.forEach((r) => console.log(`  - ${r.name}`));
  }

  console.log(`\n📦 Total: ${results.length} packages`);
  console.log(`✅ Success: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);

  if (failed.length === 0) {
    console.log("\n🎉 All packages published successfully!");
    console.log("\n📚 To install Memorai MCP:");
    console.log("npm install @codai/memorai-mcp");
    console.log("npm install @codai/memorai-sdk");
    console.log("npm install @codai/memorai-cli");
  }
}

// Run the script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("❌ Publishing failed:", error);
    process.exit(1);
  });
}

export { publishPackage, checkPackageExists };

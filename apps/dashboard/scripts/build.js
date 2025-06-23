#!/usr/bin/env node

/**
 * Build script for Memorai Web Dashboard
 * Optimizes assets and prepares for production deployment
 */

const fs = require("fs").promises;
const path = require("path");

async function build() {
  console.log("🔨 Building Memorai Web Dashboard...");

  try {
    // Create dist directory
    const distDir = path.join(__dirname, "../dist");
    await fs.mkdir(distDir, { recursive: true });

    // Copy public files to dist
    const publicDir = path.join(__dirname, "../public");
    const files = await fs.readdir(publicDir);

    for (const file of files) {
      const srcPath = path.join(publicDir, file);
      const destPath = path.join(distDir, file);
      await fs.copyFile(srcPath, destPath);
      console.log(`✅ Copied ${file} to dist/`);
    }

    // Copy server files
    const serverDir = path.join(__dirname, "../src");
    const distServerDir = path.join(distDir, "server");
    await fs.mkdir(distServerDir, { recursive: true });

    const serverFiles = await fs.readdir(serverDir);
    for (const file of serverFiles) {
      if (file.endsWith(".js")) {
        const srcPath = path.join(serverDir, file);
        const destPath = path.join(distServerDir, file);
        await fs.copyFile(srcPath, destPath);
        console.log(`✅ Copied server/${file} to dist/server/`);
      }
    }

    // Create production package.json
    const packageJson = {
      name: "@codai/memorai-dashboard",
      version: "1.0.0",
      private: true,
      main: "server/server.js",
      scripts: {
        start: "node server/server.js",
      },
      dependencies: {
        express: "^4.19.2",
        "socket.io": "^4.7.5",
        cors: "^2.8.5",
        helmet: "^7.1.0",
        "express-rate-limit": "^7.2.0",
        winston: "^3.13.0",
        dotenv: "^16.4.5",
      },
    };

    await fs.writeFile(
      path.join(distDir, "package.json"),
      JSON.stringify(packageJson, null, 2),
    );
    console.log("✅ Created production package.json");

    // Create startup script
    const startScript = `#!/usr/bin/env node
require('dotenv').config();
require('./server/server.js');
`;

    await fs.writeFile(path.join(distDir, "start.js"), startScript);
    console.log("✅ Created startup script");

    console.log("\n🎉 Build completed successfully!");
    console.log("📁 Output directory: dist/");
    console.log("🚀 To run: cd dist && npm install && node start.js");
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  build();
}

module.exports = build;

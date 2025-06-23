const fs = require('fs');
const path = require('path');

// Fix specific Server package issues
function fixServerIssues() {
    const serverDir = path.join(__dirname, 'packages', 'server', 'src');

    // Fix cli.ts
    const cliPath = path.join(serverDir, 'cli.ts');
    if (fs.existsSync(cliPath)) {
        let content = fs.readFileSync(cliPath, 'utf8');
        content = content.replace(/Logger\.error\(\$1,/, 'Logger.error("Failed to start server",');
        fs.writeFileSync(cliPath, content, 'utf8');
        console.log('Fixed cli.ts');
    }

    // Fix MCPHandler.ts
    const mcpHandlerPath = path.join(serverDir, 'handlers', 'MCPHandler.ts');
    if (fs.existsSync(mcpHandlerPath)) {
        let content = fs.readFileSync(mcpHandlerPath, 'utf8');
        content = content.replace(/Logger\.error\(\$1,/, 'Logger.error("MCP request failed",');
        fs.writeFileSync(mcpHandlerPath, content, 'utf8');
        console.log('Fixed MCPHandler.ts');
    }

    // Fix AuthMiddleware.ts
    const authPath = path.join(serverDir, 'middleware', 'AuthMiddleware.ts');
    if (fs.existsSync(authPath)) {
        let content = fs.readFileSync(authPath, 'utf8');
        content = content.replace(/Logger\.error\(\$1,/, 'Logger.error("Authentication failed",');
        content = content.replace(/Logger\.debug\('Authentication successful',\s*\{[^}]+\}\);/g,
            'Logger.debug("Authentication successful");');
        content = content.replace(/_reply\./g, 'reply.');
        fs.writeFileSync(authPath, content, 'utf8');
        console.log('Fixed AuthMiddleware.ts');
    }

    // Fix RateLimitMiddleware.ts
    const rateLimitPath = path.join(serverDir, 'middleware', 'RateLimitMiddleware.ts');
    if (fs.existsSync(rateLimitPath)) {
        let content = fs.readFileSync(rateLimitPath, 'utf8');
        content = content.replace(/Logger\.warn\('Rate limit exceeded',\s*\{[^}]+\}\);/g,
            'Logger.warn("Rate limit exceeded");');
        content = content.replace(/_reply\./g, 'reply.');
        content = content.replace(/request\./g, '_request.');
        fs.writeFileSync(rateLimitPath, content, 'utf8');
        console.log('Fixed RateLimitMiddleware.ts');
    }

    // Fix TenantMiddleware.ts
    const tenantPath = path.join(serverDir, 'middleware', 'TenantMiddleware.ts');
    if (fs.existsSync(tenantPath)) {
        let content = fs.readFileSync(tenantPath, 'utf8');
        content = content.replace(/Logger\.error\(\$1,/, 'Logger.error("Failed to load tenant context",');
        content = content.replace(/Logger\.debug\('Tenant loaded',\s*\{[^}]+\}\);/g,
            'Logger.debug("Tenant loaded");');
        content = content.replace(/Logger\.warn\('[^']+',\s*\{[^}]+\}\);/g, (match) => {
            const message = match.match(/Logger\.warn\('([^']+)'/)?.[1] || 'Warning';
            return `Logger.warn("${message}");`;
        });
        content = content.replace(/_reply\./g, 'reply.');
        fs.writeFileSync(tenantPath, content, 'utf8');
        console.log('Fixed TenantMiddleware.ts');
    }

    // Fix MetricsCollector.ts
    const metricsPath = path.join(serverDir, 'monitoring', 'MetricsCollector.ts');
    if (fs.existsSync(metricsPath)) {
        let content = fs.readFileSync(metricsPath, 'utf8');
        content = content.replace(/Logger\.error\(\$1,/, 'Logger.error("Error recording periodic memory usage",');
        fs.writeFileSync(metricsPath, content, 'utf8');
        console.log('Fixed MetricsCollector.ts');
    }
}

console.log('Fixing specific Server package issues...');
fixServerIssues();
console.log('Done!');

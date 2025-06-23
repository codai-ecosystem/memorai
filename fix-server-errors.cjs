const fs = require('fs');
const path = require('path');

// Fix Server package TypeScript errors
function fixServerPackage() {
    const serverDir = path.join(__dirname, 'packages', 'server', 'src');

    // Fix Logger.ts static methods
    const loggerPath = path.join(serverDir, 'utils', 'Logger.ts');
    if (fs.existsSync(loggerPath)) {
        let content = fs.readFileSync(loggerPath, 'utf8');

        // Fix missing parameter declarations in static methods
        content = content.replace(
            /static info\(\) \{[^}]+Logger\.getInstance\(\)\.info\(message, meta\);[^}]+\}/g,
            'static info(message: string, meta?: Record<string, unknown>) {\n    Logger.getInstance().info(message, meta);\n  }'
        );
        content = content.replace(
            /static warn\(\) \{[^}]+Logger\.getInstance\(\)\.warn\(message, meta\);[^}]+\}/g,
            'static warn(message: string, meta?: Record<string, unknown>) {\n    Logger.getInstance().warn(message, meta);\n  }'
        );
        content = content.replace(
            /static debug\(\) \{[^}]+Logger\.getInstance\(\)\.debug\(message, meta\);[^}]+\}/g,
            'static debug(message: string, meta?: Record<string, unknown>) {\n    Logger.getInstance().debug(message, meta);\n  }'
        );

        fs.writeFileSync(loggerPath, content, 'utf8');
        console.log('Fixed Logger.ts static method parameters');
    }

    // Fix all TypeScript files in server package
    const filesToFix = [
        'cli.ts',
        'handlers/MCPHandler.ts',
        'middleware/AuthMiddleware.ts',
        'middleware/RateLimitMiddleware.ts',
        'middleware/TenantMiddleware.ts',
        'monitoring/MetricsCollector.ts'
    ];

    filesToFix.forEach(relativeFilePath => {
        const filePath = path.join(serverDir, relativeFilePath);
        if (fs.existsSync(filePath)) {
            let content = fs.readFileSync(filePath, 'utf8');

            // Fix catch blocks missing error parameter
            content = content.replace(/} catch \{/g, '} catch (error: unknown) {');

            // Fix reference to 'error' variable that doesn't exist
            content = content.replace(/Logger\.error\([^,]+, error\)/g,
                'Logger.error($1, { error: error instanceof Error ? error.message : String(error) })');

            // Fix missing function parameters in middleware
            if (relativeFilePath.includes('middleware/')) {
                // Fix missing request parameter references
                content = content.replace(/request\./g, '_request.');
                content = content.replace(/reply\./g, '_reply.');

                // Fix shorthand property issues
                content = content.replace(/\{ tenantId, error \}/g, '{ tenantId, error: error instanceof Error ? error.message : String(error) }');
            }

            // Fix MCPHandler specific issues
            if (relativeFilePath.includes('MCPHandler.ts')) {
                // Fix params destructuring with unknown type
                content = content.replace(/const \{ ([^}]+) \} = params;/g,
                    'const { $1 } = params as any;');

                // Fix type guard function
                content = content.replace(/private isValidMCPRequest\(_data: unknown\): request is MCPRequest/g,
                    'private isValidMCPRequest(request: unknown): request is MCPRequest');
                content = content.replace(/request &&[^}]+request\.method === 'string'/g,
                    '(request as any) && (request as any).jsonrpc === "2.0" && typeof (request as any).method === "string"');
            }

            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Fixed ${relativeFilePath}`);
        }
    });
}

console.log('Fixing Server package TypeScript errors...');
fixServerPackage();
console.log('Done!');

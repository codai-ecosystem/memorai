const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'apps', 'api', 'src');

// Common type replacements for API context
const typeReplacements = [
    // Request/Response objects
    { pattern: /req: any/g, replacement: 'req: Request' },
    { pattern: /res: any/g, replacement: 'res: Response' },
    { pattern: /next: any/g, replacement: 'next: NextFunction' },

    // Memory-related types
    { pattern: /memory: any/g, replacement: 'memory: unknown' },
    { pattern: /memories: any/g, replacement: 'memories: unknown[]' },
    { pattern: /metadata: any/g, replacement: 'metadata: Record<string, unknown>' },

    // Generic object types
    { pattern: /data: any/g, replacement: 'data: unknown' },
    { pattern: /result: any/g, replacement: 'result: unknown' },
    { pattern: /payload: any/g, replacement: 'payload: unknown' },
    { pattern: /response: any/g, replacement: 'response: unknown' },
    { pattern: /content: any/g, replacement: 'content: unknown' },

    // WebSocket and error types
    { pattern: /ws: any/g, replacement: 'ws: unknown' },
    { pattern: /error: any/g, replacement: 'error: unknown' },

    // Generic function parameters
    { pattern: /\(([a-zA-Z_][a-zA-Z0-9_]*): any\)/g, replacement: '($1: unknown)' },

    // Array and object generics
    { pattern: /: any\[\]/g, replacement: ': unknown[]' },
    { pattern: /Array<any>/g, replacement: 'Array<unknown>' },
    { pattern: /Record<string, any>/g, replacement: 'Record<string, unknown>' },
];

function fixAnyTypes(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;

        for (const { pattern, replacement } of typeReplacements) {
            const newContent = content.replace(pattern, replacement);
            if (newContent !== content) {
                content = newContent;
                changed = true;
            }
        }

        if (changed) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Fixed types in: ${path.relative(__dirname, filePath)}`);
        }
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
    }
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
        } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
            fixAnyTypes(fullPath);
        }
    }
}

console.log('Fixing explicit any types in API package...');
processDirectory(apiDir);
console.log('Done!');

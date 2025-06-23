const fs = require('fs');
const path = require('path');

// Fix MCP package TypeScript errors
function fixMCPPackage() {
    const mcpDir = path.join(__dirname, 'packages', 'mcp', 'src');

    // Fix server.ts
    const serverPath = path.join(mcpDir, 'server.ts');
    if (fs.existsSync(serverPath)) {
        let content = fs.readFileSync(serverPath, 'utf8');

        // Fix remaining catch blocks
        content = content.replace(/} catch \{/g, '} catch (error: unknown) {');

        // Fix spread operator with unknown context
        content = content.replace(/\.\.\.context,/g, '...(context as Record<string, unknown>),');

        fs.writeFileSync(serverPath, content, 'utf8');
        console.log('Fixed server.ts catch blocks and spread operators');
    }

    // Fix ultra-fast-server.ts
    const ultraFastPath = path.join(mcpDir, 'ultra-fast-server.ts');
    if (fs.existsSync(ultraFastPath)) {
        let content = fs.readFileSync(ultraFastPath, 'utf8');

        // Fix variable references
        content = content.replace(/this\.key\(agent, 'remember', content\.substr\(0, 50\)\)/g,
            `this.key(params.agentId, 'remember', params.content.substr(0, 50))`);

        // Fix cached data type assertion
        content = content.replace(/return cached\.data;/g, 'return cached.data as unknown[];');

        // Fix spread operator issues
        content = content.replace(/\.\.\.context/g, '...(context as Record<string, unknown>)');

        // Fix catch blocks
        content = content.replace(/} catch \{/g, '} catch (error: unknown) {');

        fs.writeFileSync(ultraFastPath, content, 'utf8');
        console.log('Fixed ultra-fast-server.ts variable references and types');
    }
}

console.log('Fixing MCP package TypeScript errors...');
fixMCPPackage();
console.log('Done!');

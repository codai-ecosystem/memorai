#!/usr/bin/env node

/**
 * Test script to verify real persistence in MCP server
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';

console.log('🧪 Testing Real Persistence in MCP Server...\n');

// Load environment variables
const envPath = 'E:\\GitHub\\workspace-ai\\.env';
const envContent = readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
    }
});

// Start MCP server with environment
const serverProcess = spawn('node', ['packages/mcp/dist/server.js'], {
    env: { ...process.env, ...envVars },
    stdio: ['pipe', 'pipe', 'pipe']
});

let serverOutput = '';
let timerStarted = false;

serverProcess.stdout.on('data', (data) => {
    serverOutput += data.toString();
    console.log('SERVER:', data.toString().trim());

    if (!timerStarted && serverOutput.includes('server started')) {
        timerStarted = true;
        setTimeout(() => {
            console.log('\n✅ Server should be ready now. Check tier info in next test...');
            serverProcess.kill();
        }, 2000);
    }
});

serverProcess.stderr.on('data', (data) => {
    console.log('SERVER ERROR:', data.toString().trim());
});

serverProcess.on('close', (code) => {
    console.log(`\n🔄 Server process exited with code ${code}`);

    if (serverOutput.includes('Mock Memory') || serverOutput.includes('tier: mock')) {
        console.log('❌ FAILED: Server is still using mock tier mode');
    } else if (serverOutput.includes('SMART') || serverOutput.includes('Azure')) {
        console.log('✅ SUCCESS: Server appears to be using real Azure configuration');
    } else {
        console.log('⚠️  UNCLEAR: Could not determine tier from output');
    }

    process.exit(code);
});

setTimeout(() => {
    console.log('\n⏰ Timeout reached, killing server...');
    serverProcess.kill();
}, 10000);

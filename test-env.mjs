import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

console.log('🔧 Environment Configuration Test');
console.log('================================');

const requiredVars = [
    'AZURE_OPENAI_API_KEY',
    'AZURE_OPENAI_ENDPOINT',
    'AZURE_OPENAI_DEPLOYMENT_NAME',
    'MEMORAI_OPENAI_PROVIDER',
    'MEMORAI_OPENAI_API_KEY'
];

let allConfigured = true;

requiredVars.forEach(varName => {
    const value = process.env[varName];
    const status = value ? '✅ Configured' : '❌ Missing';
    const displayValue = value ? (value.length > 20 ? value.substring(0, 20) + '...' : value) : 'Not set';
    console.log(`${varName}: ${status} (${displayValue})`);
    if (!value) allConfigured = false;
});

console.log('\n🎯 Configuration Status:', allConfigured ? '✅ All Required Variables Set' : '❌ Missing Variables');

if (allConfigured) {
    console.log('\n🚀 Testing MCP Memory Initialization...');
    // Test memory initialization
    try {
        const { default: MemoraiMCPServer } = await import('./packages/mcp/dist/server.js');
        console.log('✅ MCP Server module loaded successfully');
    } catch (error) {
        console.log('❌ MCP Server load error:', error.message);
    }
}

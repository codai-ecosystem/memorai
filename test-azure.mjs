import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Use Node.js 18+ native fetch
if (!globalThis.fetch) {
    throw new Error('This script requires Node.js 18+ for native fetch support');
}

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

console.log('🔧 Testing Azure OpenAI Connectivity');
console.log('===================================');

const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

console.log('📍 Azure Endpoint:', azureEndpoint);
console.log('🔑 API Key:', azureApiKey ? `${azureApiKey.substring(0, 10)}...` : 'Not set');
console.log('📅 API Version:', azureApiVersion);

if (azureEndpoint && azureApiKey) {
    try {
        console.log('\n🚀 Testing Azure OpenAI availability...');
        const testUrl = `${azureEndpoint}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT_NAME}/chat/completions?api-version=${azureApiVersion}`;
        console.log('🔗 Test URL:', testUrl);

        const response = await fetch(testUrl, {
            method: 'POST',
            headers: {
                'api-key': azureApiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: 'test' }],
                max_tokens: 1
            })
        });

        console.log('📊 Response Status:', response.status, response.statusText);

        if (response.ok) {
            const data = await response.json();
            console.log('✅ Azure OpenAI is available!');
            console.log('📋 Available deployments:', JSON.stringify(data, null, 2));
        } else {
            const errorText = await response.text();
            console.log('❌ Azure OpenAI test failed');
            console.log('📄 Error response:', errorText);
        }
    } catch (error) {
        console.log('❌ Azure OpenAI test error:', error.message);
    }
} else {
    console.log('❌ Missing Azure configuration');
}

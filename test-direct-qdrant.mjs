import { config } from 'dotenv';
import { QdrantClient } from '@qdrant/js-client-rest';

// Load environment variables
config();

async function testDirectQdrantAccess() {
    console.log('� Testing Direct Qdrant Access');
    console.log('='.repeat(50));
    
    try {
        // Create client with compatibility check disabled
        console.log('🔌 Creating Qdrant client (compatibility check disabled)...');
        const client = new QdrantClient({
            url: process.env.QDRANT_URL || 'http://localhost:6333',
            apiKey: process.env.QDRANT_API_KEY,
            checkCompatibility: false  // Disable version check
        });
        
        console.log('📊 Getting cluster info...');
        const clusterInfo = await client.cluster_info();
        console.log('Cluster info:', JSON.stringify(clusterInfo, null, 2));
        
        console.log('📋 Listing collections...');
        const collections = await client.getCollections();
        console.log('Collections:', collections);
        
        // Test collection creation/access
        const collectionName = 'test-memories';
        console.log(`🔧 Ensuring collection '${collectionName}' exists...`);
        
        try {
            await client.getCollection(collectionName);
            console.log('✅ Collection exists');
        } catch (error) {
            console.log('❌ Collection doesn\'t exist, creating...');
            await client.createCollection(collectionName, {
                vectors: {
                    size: 1536,
                    distance: 'Cosine'
                }
            });
            console.log('✅ Collection created');
        }
        
        // Test simple upsert with minimal payload
        console.log('� Testing simple upsert...');
        const testPoint = {
            id: 'test-simple-' + Date.now(),
            vector: new Array(1536).fill(0.1),
            payload: {
                test: 'simple'
            }
        };
        
        console.log('Upserting point:', {
            id: testPoint.id,
            vector_length: testPoint.vector.length,
            payload: testPoint.payload
        });
        
        await client.upsert(collectionName, {
            wait: true,
            points: [testPoint]
        });
        console.log('✅ Simple upsert successful!');
        
        // Test with timestamp payload (like our real data)
        console.log('🔄 Testing timestamp payload...');
        const timestampPoint = {
            id: 'test-timestamp-' + Date.now(),
            vector: new Array(1536).fill(0.2),
            payload: {
                id: 'test-timestamp-' + Date.now(),
                content: 'Test content',
                category: 'test',
                importance: 0.5,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_accessed_at: new Date().toISOString()
            }
        };
        
        console.log('Upserting timestamp point:', {
            id: timestampPoint.id,
            vector_length: timestampPoint.vector.length,
            payload_keys: Object.keys(timestampPoint.payload)
        });
        
        await client.upsert(collectionName, {
            wait: true,
            points: [timestampPoint]
        });
        console.log('✅ Timestamp upsert successful!');
        
        console.log('🎉 All direct Qdrant tests passed!');
        
    } catch (error) {
        console.error('❌ Error occurred:', error);
        console.error('Full error:', error);
    }
}

testDirectQdrantAccess().catch(console.error);
            })
        });
        
        const responseText = await response.text();
        
        if (response.ok) {
            console.log('✅ Direct Qdrant API call successful');
            console.log('Response:', responseText);
        } else {
            console.log('❌ Direct Qdrant API call failed');
            console.log('Status:', response.status);
            console.log('Response:', responseText);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testDirectQdrantAPI().catch(console.error);

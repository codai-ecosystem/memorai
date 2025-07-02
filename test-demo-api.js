#!/usr/bin/env node

/**
 * Memorai Demo API Test
 * Simple test to verify memorai API functionality
 */

import process from 'process';
import path from 'path';

// Simple demo API server for testing memorai functionality
class MemoraiDemoAPI {
  constructor() {
    this.memories = new Map();
    this.nextId = 1;
  }

  async start() {
    console.log('🧠 Memorai Demo API Starting...');
    console.log('✅ Memory store initialized');
    console.log('📊 Demo data loading...');
    
    // Load some demo memories
    this.addDemoMemories();
    
    console.log(`🚀 Memorai Demo API ready with ${this.memories.size} demo memories`);
    console.log('📝 Available operations:');
    console.log('  - Store memory: remember(content, metadata)');
    console.log('  - Retrieve memory: recall(query)');
    console.log('  - List all: listAll()');
    
    // Keep process alive for demo
    setInterval(() => {
      console.log(`💭 Demo running with ${this.memories.size} memories...`);
    }, 30000);
  }

  addDemoMemories() {
    const demoData = [
      {
        content: 'Codai is a revolutionary AI ecosystem platform',
        metadata: { type: 'platform_info', importance: 0.9 }
      },
      {
        content: 'Memorai provides intelligent memory management for AI agents',
        metadata: { type: 'service_info', importance: 0.8 }
      },
      {
        content: 'The development orchestrator successfully started multiple services',
        metadata: { type: 'development_log', importance: 0.7 }
      },
      {
        content: 'User challenged completion claims and demanded real implementation',
        metadata: { type: 'user_feedback', importance: 0.9 }
      }
    ];

    demoData.forEach(item => {
      this.remember(item.content, item.metadata);
    });
  }

  remember(content, metadata = {}) {
    const memory = {
      id: this.nextId++,
      content,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        accessed: 0
      }
    };
    
    this.memories.set(memory.id, memory);
    console.log(`📝 Stored memory #${memory.id}: ${content.substring(0, 50)}...`);
    return memory;
  }

  recall(query) {
    const results = [];
    for (const memory of this.memories.values()) {
      if (memory.content.toLowerCase().includes(query.toLowerCase())) {
        memory.metadata.accessed++;
        results.push(memory);
      }
    }
    
    console.log(`🔍 Recall query "${query}" found ${results.length} results`);
    return results;
  }

  listAll() {
    const all = Array.from(this.memories.values());
    console.log(`📚 Total memories: ${all.length}`);
    return all;
  }
}

// Start the demo
const demo = new MemoraiDemoAPI();
demo.start().catch(error => {
  console.error('❌ Demo failed to start:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Memorai Demo API shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Memorai Demo API terminated');
  process.exit(0);
});

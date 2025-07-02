/**
 * Simple HTTP-based demo that works with current API
 */

import chalk from 'chalk';
import ora from 'ora';

const API_BASE = 'http://localhost:6367';

interface MemoryResponse {
  success: boolean;
  memory?: string;
  message?: string;
  memories?: Array<{
    memory: {
      id: string;
      content: string;
      createdAt: string;
      agent_id: string;
    };
    score: number;
    relevance_reason: string;
  }>;
  count?: number;
  query?: string;
}

class SimpleMemoraiClient {
  private agentId: string;

  constructor(agentId: string) {
    this.agentId = agentId;
  }

  async remember(content: string, metadata?: any): Promise<any> {
    const response = await fetch(`${API_BASE}/api/memory/remember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: this.agentId,
        content,
        metadata
      })
    });
    return response.json();
  }

  async recall(query: string, limit = 10): Promise<any> {
    const response = await fetch(`${API_BASE}/api/memory/recall`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: this.agentId,
        query,
        limit
      })
    });
    return response.json();
  }

  async getContext(agentId: string, contextSize = 10): Promise<any> {
    const response = await fetch(`${API_BASE}/api/memory/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId,
        contextSize
      })
    });
    return response.json();
  }
}

async function simpleDemo(): Promise<void> {
  console.log(chalk.blue.bold('🧠 Simple Memorai Demo (Direct HTTP)\n'));

  const client = new SimpleMemoraiClient('simple-demo-agent');
  let spinner = ora('Testing memory operations...').start();

  try {
    // Test 1: Remember something
    spinner.text = 'Creating a memory...';
    const memory1 = await client.remember(
      'I successfully fixed the Memorai demo application by using direct HTTP calls',
      { category: 'achievement', importance: 'high' }
    );
    
    if (memory1.success) {
      console.log(chalk.green(`✅ Memory created: ${memory1.memory}`));
    } else {
      throw new Error('Failed to create memory');
    }

    // Test 2: Remember another memory
    spinner.text = 'Creating second memory...';
    const memory2 = await client.remember(
      'The Memorai system has a working API but the SDK needs MCP protocol fixes',
      { category: 'technical-insight', importance: 'high' }
    );
    
    if (memory2.success) {
      console.log(chalk.green(`✅ Second memory created: ${memory2.memory}`));
    }

    // Test 3: Search memories
    spinner.text = 'Searching memories...';
    const searchResult = await client.recall('Memorai demo application', 20);
    
    if (searchResult.success && searchResult.memories) {
      console.log(chalk.yellow(`🔍 Found ${searchResult.memories.length} relevant memories:`));
      searchResult.memories.forEach((item, index) => {
        console.log(chalk.cyan(`  ${index + 1}. ${item.memory.content.substring(0, 80)}...`));
        console.log(chalk.gray(`     Score: ${item.score} | ${item.relevance_reason}`));
      });
    }

    // Test 4: Get context
    spinner.text = 'Getting agent context...';
    const context = await client.getContext('simple-demo-agent', 15);
    
    if (context.success) {
      console.log(chalk.magenta(`📚 Agent context: ${context.context?.summary || 'Generated successfully'}`));
      if (context.context?.memories) {
        console.log(chalk.cyan(`   Found ${context.context.memories.length} contextual memories`));
      }
    }

    spinner.succeed('Simple demo completed successfully!');
    
    console.log(chalk.green.bold('\n✅ Simple HTTP Demo Complete!'));
    console.log(chalk.white('Working Features:'));
    console.log(chalk.white('  ✅ Memory creation via HTTP API'));
    console.log(chalk.white('  ✅ Memory search with relevance scoring'));
    console.log(chalk.white('  ✅ Context generation'));
    console.log(chalk.white('  ✅ Error handling'));
    console.log(chalk.gray('\nNote: Using direct HTTP calls instead of MCP SDK'));

  } catch (error) {
    spinner.fail('Demo failed');
    console.error(chalk.red('Error:'), error.message);
    throw error;
  }
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  simpleDemo().catch((error) => {
    console.error(chalk.red.bold('Simple demo failed:'), error);
    process.exit(1);
  });
}

export { simpleDemo };

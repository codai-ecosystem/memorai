/**
 * Basic Memorai Demo - Core memory operations
 */

import chalk from 'chalk';
import ora from 'ora';
import { MemoraiClient } from '@codai/memorai-sdk';

const client = new MemoraiClient({
  serverUrl: 'http://localhost:6367',
  apiKey: 'demo-key',
  agentId: 'basic-demo-agent',
});

async function basicDemo(): Promise<void> {
  console.log(chalk.blue.bold('🧠 Basic Memorai Demo\n'));

  const spinner = ora('Testing basic memory operations...').start();

  try {
    // Test 1: Remember something
    spinner.text = 'Creating memories...';
    const memory1 = await client.remember(
      'I learned TypeScript today and built an awesome MCP server',
      { tags: ['learning', 'typescript'], metadata: { importance: 0.8 } }
    );
    console.log(chalk.green(`✅ Memory created: ${memory1.id}`));

    const memory2 = await client.remember(
      'The Memorai system uses Qdrant for vector storage and PostgreSQL for metadata',
      { tags: ['technical', 'architecture'], metadata: { importance: 0.9 } }
    );
    console.log(chalk.green(`✅ Memory created: ${memory2.id}`));

    // Test 2: Recall memories
    spinner.text = 'Searching memories...';
    const memories = await client.recall('TypeScript learning');
    console.log(chalk.yellow(`🔍 Found ${memories.length} relevant memories`));
    
    memories.forEach((memory, index) => {
      console.log(chalk.cyan(`  ${index + 1}. ${memory.content} (Score: ${memory.relevanceScore || 'N/A'})`));
    });

    // Test 3: Get context
    spinner.text = 'Getting context...';
    const context = await client.getContext({ topic: 'learning' });
    console.log(chalk.magenta(`📚 Context: Found ${context.length} contextual memories`));

    spinner.succeed('Basic demo completed successfully!');
    
    console.log(chalk.green.bold('\n✅ All basic operations completed!'));
    console.log(chalk.white('- Memory creation: Working'));
    console.log(chalk.white('- Memory search: Working'));
    console.log(chalk.white('- Context retrieval: Working'));

  } catch (error) {
    spinner.fail('Basic demo failed');
    console.error(chalk.red('Error:'), error.message);
    throw error;
  }
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  basicDemo().catch((error) => {
    console.error(chalk.red.bold('Demo failed:'), error);
    process.exit(1);
  });
}

export { basicDemo };

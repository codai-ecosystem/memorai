/**
 * @fileoverview Memorai Demo - Showcase agent-native memory capabilities
 */

import chalk from 'chalk';
import ora from 'ora';
import { MemoraiClient } from '@codai/memorai-sdk';

console.log(chalk.blue.bold('🧠 Memorai MCP Demo\n'));

// Demo configuration
const client = new MemoraiClient({
  serverUrl: 'http://localhost:3000',
  apiKey: 'demo-key',
  agentId: 'demo-agent-001',
});

/**
 * Basic memory operations demo
 */
async function basicDemo(): Promise<void> {
  const spinner = ora('Running basic memory operations...').start();

  try {
    // Remember something
    await client.remember(
      'I learned TypeScript today and built an awesome MCP server'
    );

    // Recall memories
    const memories = await client.recall('TypeScript learning');
    // Generate context
    const context = await client.getContext({ topic: 'learning' });
    spinner.succeed('Basic demo completed!');
    console.log(chalk.green(`Found ${memories.length} relevant memories`));
    console.log(
      chalk.yellow(`Context: Found ${context.length} contextual memories`)
    );
  } catch (error) {
    spinner.fail('Demo failed');
    console.error(chalk.red('Error:'), error);
  }
}

/**
 * Agent conversation demo
 */
async function agentDemo(): Promise<void> {
  const spinner = ora('Simulating agent conversation...').start();

  try {
    // Simulate an agent learning about a user
    await client.remember('User prefers dark mode and minimal UI designs');
    await client.remember('User is working on a React project with TypeScript');
    await client.remember(
      'User asked for help with state management using Zustand'
    );
    // Agent recalls user preferences for a new request
    const userContext = await client.getContext({
      topic: 'user preferences',
    });
    spinner.succeed('Agent demo completed!');
    console.log(
      chalk.blue('Agent learned:'),
      `Found ${userContext.length} contextual memories about user preferences`
    );
  } catch (error) {
    spinner.fail('Agent demo failed');
    console.error(chalk.red('Error:'), error);
  }
}

/**
 * Run all demos
 */
async function runDemos(): Promise<void> {
  try {
    await basicDemo();
    console.log();
    await agentDemo();

    console.log(chalk.green.bold('\n✅ All demos completed successfully!'));
  } catch (error) {
    console.error(chalk.red.bold('\n❌ Demo failed:'), error);
    process.exit(1);
  }
}

// Run demos if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemos();
}

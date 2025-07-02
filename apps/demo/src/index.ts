/**
 * @fileoverview Memorai Demo - Showcase agent-native memory capabilities
 */

import chalk from 'chalk';
import ora from 'ora';
import { MemoraiClient } from '@codai/memorai-sdk';
import { basicDemo } from './demos/basic.js';
import { agentDemo } from './demos/agent.js';
import { contextDemo } from './demos/context.js';
import { performanceDemo } from './demos/performance.js';

console.log(chalk.blue.bold('🧠 Memorai MCP Demo Suite\n'));

// Demo configuration
const client = new MemoraiClient({
  serverUrl: 'http://localhost:6367',
  apiKey: 'demo-key',
  agentId: 'demo-suite-coordinator',
});

/**
 * Run all demos in sequence
 */
async function runAllDemos(): Promise<void> {
  console.log(chalk.green.bold('Starting comprehensive demo suite...\n'));
  
  try {
    // Run basic demo
    console.log(chalk.yellow('═'.repeat(60)));
    await basicDemo();
    console.log(chalk.yellow('═'.repeat(60)));
    console.log();

    // Run agent demo
    console.log(chalk.yellow('═'.repeat(60)));
    await agentDemo();
    console.log(chalk.yellow('═'.repeat(60)));
    console.log();

    // Run context demo
    console.log(chalk.yellow('═'.repeat(60)));
    await contextDemo();
    console.log(chalk.yellow('═'.repeat(60)));
    console.log();

    // Run performance demo
    console.log(chalk.yellow('═'.repeat(60)));
    await performanceDemo();
    console.log(chalk.yellow('═'.repeat(60)));

    console.log(chalk.green.bold('\n🎉 ALL DEMOS COMPLETED SUCCESSFULLY!'));
    console.log(chalk.white('Demo Suite Coverage:'));
    console.log(chalk.white('  ✅ Basic memory operations'));
    console.log(chalk.white('  ✅ Agent conversation patterns'));
    console.log(chalk.white('  ✅ Context generation capabilities'));
    console.log(chalk.white('  ✅ Performance benchmarking'));
    console.log(chalk.cyan('\nMemoriai is ready for production use! 🚀'));

  } catch (error) {
    console.error(chalk.red.bold('\n❌ Demo suite failed:'), error);
    process.exit(1);
  }
}

/**
 * Interactive demo selection
 */
async function interactiveDemo(): Promise<void> {
  console.log(chalk.cyan('Available demos:'));
  console.log('1. Basic Operations Demo');
  console.log('2. Agent Conversation Demo');
  console.log('3. Context Generation Demo');
  console.log('4. Performance Benchmarking Demo');
  console.log('5. Run All Demos');
  console.log();

  // For now, run all demos
  // In a real implementation, you'd use readline for user input
  await runAllDemos();
}

// Run demos if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args.includes('--all')) {
    runAllDemos();
  } else if (args.includes('--basic')) {
    basicDemo();
  } else if (args.includes('--agent')) {
    agentDemo();
  } else if (args.includes('--context')) {
    contextDemo();
  } else if (args.includes('--performance')) {
    performanceDemo();
  } else {
    interactiveDemo();
  }
}

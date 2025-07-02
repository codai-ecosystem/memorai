/**
 * Agent Conversation Demo - Advanced memory interactions
 */

import chalk from 'chalk';
import ora from 'ora';
import { MemoraiClient } from '@codai/memorai-sdk';

const client = new MemoraiClient({
  serverUrl: 'http://localhost:6367',
  apiKey: 'demo-key',
  agentId: 'agent-demo-assistant',
});

async function agentDemo(): Promise<void> {
  console.log(chalk.blue.bold('🤖 Agent Conversation Demo\n'));

  const spinner = ora('Simulating intelligent agent conversations...').start();

  try {
    // Simulate learning about a user
    spinner.text = 'Agent learning about user preferences...';
    
    await client.remember('User prefers dark mode and minimal UI designs', {
      tags: ['user-preference', 'ui', 'design'],
      metadata: { category: 'preference', confidence: 0.9 }
    });

    await client.remember('User is working on a React project with TypeScript', {
      tags: ['user-project', 'react', 'typescript'],
      metadata: { category: 'current-work', confidence: 1.0 }
    });

    await client.remember('User asked for help with state management using Zustand', {
      tags: ['user-request', 'zustand', 'state-management'],
      metadata: { category: 'help-request', priority: 'high' }
    });

    await client.remember('User successfully implemented Zustand store with TypeScript', {
      tags: ['user-achievement', 'zustand', 'implementation'],
      metadata: { category: 'success', confidence: 0.8 }
    });

    console.log(chalk.green('✅ Agent learned 4 facts about the user'));

    // Agent recalls user preferences for a new request
    spinner.text = 'Agent recalling user context for new request...';
    
    const userPreferences = await client.recall('user preferences UI design', {
      limit: 10,
      filters: { tags: ['user-preference'] }
    });

    const userProjects = await client.recall('user React TypeScript project', {
      limit: 10,
      filters: { tags: ['user-project'] }
    });

    const userRequests = await client.recall('user help state management', {
      limit: 10,
      filters: { tags: ['user-request'] }
    });

    console.log(chalk.yellow('🔍 Agent memory recall:'));
    console.log(chalk.cyan(`  • User preferences: ${userPreferences.length} memories`));
    console.log(chalk.cyan(`  • User projects: ${userProjects.length} memories`));
    console.log(chalk.cyan(`  • User requests: ${userRequests.length} memories`));

    // Get comprehensive user context
    spinner.text = 'Generating comprehensive user context...';
    
    const userContext = await client.getContext({
      topic: 'user interaction history',
      limit: 20,
      includeMemories: true
    });

    console.log(chalk.magenta(`📚 User context: ${userContext.length} contextual memories`));

    // Simulate agent making intelligent recommendations
    spinner.text = 'Agent generating personalized recommendations...';
    
    // Based on learned preferences, suggest dark theme components
    if (userPreferences.some(m => m.content.includes('dark mode'))) {
      await client.remember('Agent recommended dark theme React components for user project', {
        tags: ['agent-recommendation', 'dark-theme', 'react'],
        metadata: { 
          category: 'recommendation',
          basedOn: 'user-preference',
          confidence: 0.85 
        }
      });
      console.log(chalk.blue('💡 Agent: Recommended dark theme components based on user preference'));
    }

    // Based on TypeScript usage, suggest advanced patterns
    if (userProjects.some(m => m.content.includes('TypeScript'))) {
      await client.remember('Agent suggested TypeScript advanced patterns for React state management', {
        tags: ['agent-suggestion', 'typescript', 'patterns'],
        metadata: { 
          category: 'suggestion',
          basedOn: 'user-project',
          confidence: 0.9 
        }
      });
      console.log(chalk.blue('💡 Agent: Suggested TypeScript patterns based on user project'));
    }

    spinner.succeed('Agent conversation demo completed!');
    
    console.log(chalk.green.bold('\n✅ Agent Conversation Simulation Complete!'));
    console.log(chalk.white('Agent Capabilities Demonstrated:'));
    console.log(chalk.white('  • User preference learning'));
    console.log(chalk.white('  • Context-aware memory recall'));
    console.log(chalk.white('  • Intelligent recommendations'));
    console.log(chalk.white('  • Conversation history tracking'));
    console.log(chalk.white('  • Personalized assistance'));

  } catch (error) {
    spinner.fail('Agent demo failed');
    console.error(chalk.red('Error:'), error.message);
    throw error;
  }
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  agentDemo().catch((error) => {
    console.error(chalk.red.bold('Agent demo failed:'), error);
    process.exit(1);
  });
}

export { agentDemo };

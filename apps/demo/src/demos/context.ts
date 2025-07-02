/**
 * Context Demo - Advanced context generation and management
 */

import chalk from 'chalk';
import ora from 'ora';
import { MemoraiClient } from '@codai/memorai-sdk';

const client = new MemoraiClient({
  serverUrl: 'http://localhost:6367',
  apiKey: 'demo-key',
  agentId: 'context-demo-agent',
});

async function contextDemo(): Promise<void> {
  console.log(chalk.blue.bold('📚 Context Generation Demo\n'));

  const spinner = ora('Demonstrating context generation capabilities...').start();

  try {
    // Create a rich set of related memories
    spinner.text = 'Building knowledge base...';
    
    const memories = [
      {
        content: 'Memorai uses vector embeddings for semantic search capabilities',
        tags: ['technical', 'embeddings', 'search']
      },
      {
        content: 'The system supports multiple memory types: facts, procedures, preferences',
        tags: ['technical', 'memory-types', 'architecture']
      },
      {
        content: 'Qdrant database provides high-performance vector storage for Memorai',
        tags: ['technical', 'qdrant', 'database']
      },
      {
        content: 'PostgreSQL stores metadata and relational data for memory management',
        tags: ['technical', 'postgresql', 'metadata']
      },
      {
        content: 'Redis provides caching layer for improved performance',
        tags: ['technical', 'redis', 'caching']
      },
      {
        content: 'MCP protocol enables seamless integration with AI development tools',
        tags: ['technical', 'mcp', 'protocol']
      },
      {
        content: 'Next.js dashboard provides visual interface for memory exploration',
        tags: ['technical', 'nextjs', 'dashboard']
      },
      {
        content: 'Docker orchestration ensures consistent deployment across environments',
        tags: ['technical', 'docker', 'deployment']
      }
    ];

    // Store all memories
    for (const memory of memories) {
      await client.remember(memory.content, {
        tags: memory.tags,
        metadata: { category: 'knowledge-base', importance: 0.8 }
      });
    }

    console.log(chalk.green(`✅ Created ${memories.length} knowledge base entries`));

    // Test different context generation scenarios
    spinner.text = 'Testing technical architecture context...';
    
    const architectureContext = await client.getContext({
      topic: 'technical architecture',
      limit: 15,
      includeMemories: true,
      summaryType: 'detailed'
    });

    console.log(chalk.yellow('🏗️ Architecture Context:'));
    console.log(chalk.cyan(`   Found ${architectureContext.length} related memories`));

    // Test database-specific context
    spinner.text = 'Testing database technology context...';
    
    const databaseContext = await client.getContext({
      topic: 'database storage',
      limit: 10,
      includeMemories: true,
      summaryType: 'brief'
    });

    console.log(chalk.yellow('💾 Database Context:'));
    console.log(chalk.cyan(`   Found ${databaseContext.length} database-related memories`));

    // Test performance context
    spinner.text = 'Testing performance optimization context...';
    
    const performanceContext = await client.getContext({
      topic: 'performance optimization',
      limit: 8,
      includeMemories: true,
      summaryType: 'highlights'
    });

    console.log(chalk.yellow('⚡ Performance Context:'));
    console.log(chalk.cyan(`   Found ${performanceContext.length} performance-related memories`));

    // Test time-based context
    spinner.text = 'Testing recent activity context...';
    
    const recentContext = await client.getContext({
      timeframe: {
        start: new Date(Date.now() - 60 * 60 * 1000) // Last hour
      },
      limit: 20,
      includeMemories: true
    });

    console.log(chalk.yellow('🕐 Recent Activity Context:'));
    console.log(chalk.cyan(`   Found ${recentContext.length} recent memories`));

    // Advanced context with filters
    spinner.text = 'Testing filtered context generation...';
    
    const filteredRecall = await client.recall('technical system architecture', {
      limit: 5,
      filters: {
        tags: ['technical'],
        metadata: { category: 'knowledge-base' }
      }
    });

    console.log(chalk.yellow('🔍 Filtered Technical Recall:'));
    filteredRecall.forEach((memory, index) => {
      console.log(chalk.cyan(`   ${index + 1}. ${memory.content.substring(0, 60)}...`));
      const tags = Array.isArray(memory.metadata?.tags) ? memory.metadata.tags : [];
      console.log(chalk.gray(`      Tags: ${tags.join(', ') || 'N/A'}`));
    });

    spinner.succeed('Context generation demo completed!');
    
    console.log(chalk.green.bold('\n✅ Context Generation Demo Complete!'));
    console.log(chalk.white('Context Capabilities Demonstrated:'));
    console.log(chalk.white('  • Topic-based context generation'));
    console.log(chalk.white('  • Time-based context filtering'));
    console.log(chalk.white('  • Detailed vs brief summaries'));
    console.log(chalk.white('  • Memory relationship mapping'));
    console.log(chalk.white('  • Advanced filtering options'));
    console.log(chalk.white('  • Relevance scoring'));

  } catch (error) {
    spinner.fail('Context demo failed');
    console.error(chalk.red('Error:'), error.message);
    throw error;
  }
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  contextDemo().catch((error) => {
    console.error(chalk.red.bold('Context demo failed:'), error);
    process.exit(1);
  });
}

export { contextDemo };

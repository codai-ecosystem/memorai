/**
 * Performance Demo - Load testing and performance benchmarks
 */

import chalk from 'chalk';
import ora from 'ora';
import { MemoraiClient } from '@codai/memorai-sdk';

const client = new MemoraiClient({
  serverUrl: 'http://localhost:6367',
  apiKey: 'demo-key',
  agentId: 'performance-demo-agent',
});

async function performanceDemo(): Promise<void> {
  console.log(chalk.blue.bold('⚡ Performance Benchmarking Demo\n'));

  let spinner = ora('Preparing performance tests...').start();

  try {
    // Test 1: Single operations performance
    spinner.text = 'Testing single operation performance...';
    
    const singleOpStart = Date.now();
    await client.remember('Performance test memory for latency measurement', {
      tags: ['performance', 'latency'],
      metadata: { test: 'single-operation', timestamp: Date.now() }
    });
    const singleOpTime = Date.now() - singleOpStart;
    
    console.log(chalk.green(`✅ Single memory creation: ${singleOpTime}ms`));

    // Test 2: Bulk memory creation
    spinner.text = 'Testing bulk memory creation (10 memories)...';
    
    const bulkStart = Date.now();
    const bulkPromises = [];
    
    for (let i = 1; i <= 10; i++) {
      const promise = client.remember(
        `Bulk performance test memory ${i} with detailed content for realistic testing`,
        {
          tags: ['performance', 'bulk', `batch-${Math.ceil(i/5)}`],
          metadata: { 
            test: 'bulk-creation',
            iteration: i,
            timestamp: Date.now()
          }
        }
      );
      bulkPromises.push(promise);
    }
    
    await Promise.all(bulkPromises);
    const bulkTime = Date.now() - bulkStart;
    
    console.log(chalk.green(`✅ Bulk creation (10 memories): ${bulkTime}ms`));
    console.log(chalk.cyan(`   Average per memory: ${(bulkTime/10).toFixed(1)}ms`));

    // Test 3: Search performance with different query complexities
    spinner.text = 'Testing search performance...';
    
    const searches = [
      { query: 'performance', label: 'Simple search' },
      { query: 'performance test memory bulk', label: 'Multi-word search' },
      { query: 'detailed content realistic testing batch', label: 'Complex search' }
    ];

    for (const search of searches) {
      const searchStart = Date.now();
      const results = await client.recall(search.query, { limit: 20 });
      const searchTime = Date.now() - searchStart;
      
      console.log(chalk.yellow(`🔍 ${search.label}: ${searchTime}ms (${results.length} results)`));
    }

    // Test 4: Concurrent operations stress test
    spinner.text = 'Running concurrent operations stress test...';
    
    const concurrentStart = Date.now();
    const concurrentPromises = [];
    
    // Mix of operations: 60% remember, 30% recall, 10% context
    for (let i = 1; i <= 20; i++) {
      if (i <= 12) {
        // Remember operations
        concurrentPromises.push(
          client.remember(`Concurrent test memory ${i}`, {
            tags: ['concurrent', 'stress-test'],
            metadata: { operation: 'remember', index: i }
          })
        );
      } else if (i <= 18) {
        // Recall operations
        concurrentPromises.push(
          client.recall(`concurrent test ${i % 3 === 0 ? 'memory' : 'performance'}`, {
            limit: 5
          })
        );
      } else {
        // Context operations
        concurrentPromises.push(
          client.getContext({
            topic: 'concurrent testing',
            limit: 10
          })
        );
      }
    }
    
    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentTime = Date.now() - concurrentStart;
    
    console.log(chalk.green(`✅ Concurrent operations (20 mixed): ${concurrentTime}ms`));
    console.log(chalk.cyan(`   Operations per second: ${(20 / (concurrentTime / 1000)).toFixed(2)}`));
    console.log(chalk.cyan(`   Average operation time: ${(concurrentTime / 20).toFixed(1)}ms`));

    // Test 5: Memory retrieval patterns
    spinner.text = 'Testing memory retrieval patterns...';
    
    const patterns = [
      { filter: { tags: ['performance'] }, label: 'Tag-based filter' },
      { filter: { tags: ['concurrent', 'stress-test'] }, label: 'Multi-tag filter' },
      { 
        filter: { 
          metadata: { test: 'bulk-creation' },
          tags: ['bulk'] 
        }, 
        label: 'Metadata + tag filter' 
      }
    ];

    for (const pattern of patterns) {
      const patternStart = Date.now();
      const results = await client.recall('test memory', {
        limit: 50,
        filters: pattern.filter
      });
      const patternTime = Date.now() - patternStart;
      
      console.log(chalk.magenta(`🎯 ${pattern.label}: ${patternTime}ms (${results.length} results)`));
    }

    // Test 6: Large context generation
    spinner.text = 'Testing large context generation...';
    
    const contextStart = Date.now();
    const largeContext = await client.getContext({
      topic: 'performance testing memory management',
      limit: 100,
      includeMemories: true,
      summaryType: 'detailed'
    });
    const contextTime = Date.now() - contextStart;
    
    console.log(chalk.blue(`📚 Large context generation: ${contextTime}ms (${largeContext.length} memories)`));

    spinner.succeed('Performance benchmarking completed!');
    
    // Performance summary
    console.log(chalk.green.bold('\n⚡ Performance Benchmark Results:'));
    console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    console.log(chalk.white(`Single Operation Latency:     ${singleOpTime}ms`));
    console.log(chalk.white(`Bulk Operations (10):         ${bulkTime}ms`));
    console.log(chalk.white(`Concurrent Mixed (20):        ${concurrentTime}ms`));
    console.log(chalk.white(`Large Context Generation:     ${contextTime}ms`));
    console.log(chalk.white(`Operations per Second:        ${(20 / (concurrentTime / 1000)).toFixed(2)}`));
    console.log(chalk.white('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));

    // Performance rating
    const avgOpTime = concurrentTime / 20;
    let rating = 'Unknown';
    let ratingColor = chalk.white;

    if (avgOpTime < 50) {
      rating = 'Excellent';
      ratingColor = chalk.green;
    } else if (avgOpTime < 100) {
      rating = 'Good';
      ratingColor = chalk.yellow;
    } else if (avgOpTime < 200) {
      rating = 'Fair';
      ratingColor = chalk.magenta;
    } else {
      rating = 'Needs Optimization';
      ratingColor = chalk.red;
    }

    console.log(ratingColor.bold(`Performance Rating: ${rating}`));
    console.log(chalk.gray(`(Based on average operation time: ${avgOpTime.toFixed(1)}ms)`));

  } catch (error) {
    spinner.fail('Performance demo failed');
    console.error(chalk.red('Error:'), error.message);
    throw error;
  }
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  performanceDemo().catch((error) => {
    console.error(chalk.red.bold('Performance demo failed:'), error);
    process.exit(1);
  });
}

export { performanceDemo };

/**
 * @fileoverview Main CLI interface for Memorai
 */

import { Command } from 'commander';
import { MemoryCommands } from '../commands/MemoryCommands.js';
import { ServerCommands } from '../commands/ServerCommands.js';
import { ConfigCommands } from '../commands/ConfigCommands.js';
import { CLIConfig } from '../config/CLIConfig.js';
import { Output } from '../utils/Output.js';

/**
 * Main CLI class
 */
export class CLI {
  private program: Command;
  private config: CLIConfig;
  private output: Output;
  private memoryCommands: MemoryCommands;
  private serverCommands: ServerCommands;
  private configCommands: ConfigCommands;

  constructor() {
    this.program = new Command();
    this.config = new CLIConfig();
    this.output = new Output();
    this.memoryCommands = new MemoryCommands(this.config, this.output);
    this.serverCommands = new ServerCommands(this.config, this.output);
    this.configCommands = new ConfigCommands(this.config, this.output);
    
    this.setupProgram();
    this.setupCommands();
  }

  /**
   * Setup the commander program
   */
  private setupProgram(): void {
    this.program
      .name('memorai')
      .description('Memorai CLI - Agent-native memory management')
      .version('1.0.0', '-v, --version', 'Display version number')
      .option('-c, --config <path>', 'Configuration file path')
      .option('-s, --server <url>', 'Server URL')
      .option('-k, --api-key <key>', 'API key')
      .option('-t, --timeout <ms>', 'Request timeout in milliseconds', '30000')
      .option('--verbose', 'Verbose output')
      .option('--json', 'JSON output format')
      .option('--no-color', 'Disable colored output');

    // Global error handler
    this.program.exitOverride();
  }

  /**
   * Setup command groups
   */
  private setupCommands(): void {
    // Memory commands
    const memoryCmd = this.program
      .command('memory')
      .alias('m')
      .description('Memory operations');

    this.memoryCommands.register(memoryCmd);

    // Server commands
    const serverCmd = this.program
      .command('server')
      .alias('s')
      .description('Server management');

    this.serverCommands.register(serverCmd);

    // Config commands
    const configCmd = this.program
      .command('config')
      .alias('c')
      .description('Configuration management');

    this.configCommands.register(configCmd);

    // Quick memory operations (shortcuts)
    this.program
      .command('remember <content>')
      .alias('r')
      .description('Quick remember operation')
      .option('-t, --tags <tags>', 'Comma-separated tags')
      .option('-p, --priority <priority>', 'Priority (1-10)', '5')
      .option('-a, --agent-id <id>', 'Agent ID')
      .action(async (content, options) => {
        await this.memoryCommands.handleRemember(content, options);
      });

    this.program
      .command('recall <query>')
      .alias('rc')
      .description('Quick recall operation')
      .option('-l, --limit <number>', 'Limit results', '10')
      .option('-t, --threshold <number>', 'Similarity threshold', '0.7')
      .option('-a, --agent-id <id>', 'Agent ID')
      .action(async (query, options) => {
        await this.memoryCommands.handleRecall(query, options);
      });

    this.program
      .command('forget <id>')
      .alias('f')
      .description('Quick forget operation')
      .option('-a, --agent-id <id>', 'Agent ID')
      .option('--confirm', 'Skip confirmation')
      .action(async (id, options) => {
        await this.memoryCommands.handleForget(id, options);
      });
  }

  /**
   * Parse command line arguments and execute
   */
  public async run(argv?: string[]): Promise<void> {
    try {
      // Load global options first
      const args = argv || process.argv;
      const parsedOptions = this.program.parse(args, { from: 'node' });
      const globalOptions = parsedOptions.opts();

      // Apply global configuration
      if (globalOptions.config) {
        await this.config.loadFromFile(globalOptions.config);
      }

      if (globalOptions.server) {
        this.config.setServerUrl(globalOptions.server);
      }

      if (globalOptions.apiKey) {
        this.config.setApiKey(globalOptions.apiKey);
      }

      if (globalOptions.timeout) {
        this.config.setTimeout(parseInt(globalOptions.timeout));
      }

      if (globalOptions.verbose) {
        this.output.setVerbose(true);
      }

      if (globalOptions.json) {
        this.output.setFormat('json');
      }

      if (globalOptions.noColor) {
        this.output.setColors(false);
      }

      // Execute the program (this will trigger the appropriate command handler)
      await this.program.parseAsync(args);

    } catch (error) {
      if (error instanceof Error) {
        this.output.error(`CLI Error: ${error.message}`);
      } else {
        this.output.error(`Unknown error: ${String(error)}`);
      }
      process.exit(1);
    }
  }

  /**
   * Display help information
   */
  public help(): void {
    this.program.help();
  }

  /**
   * Get CLI configuration
   */
  public getConfig(): CLIConfig {
    return this.config;
  }

  /**
   * Get output handler
   */
  public getOutput(): Output {
    return this.output;
  }
}

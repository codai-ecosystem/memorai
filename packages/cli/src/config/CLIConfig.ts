/**
 * @fileoverview CLI Configuration management
 */

import { readFile, writeFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';

/**
 * CLI configuration interface
 */
export interface CLIConfigData {
  serverUrl?: string;
  apiKey?: string;
  timeout?: number;
  defaultAgentId?: string;
  outputFormat?: 'text' | 'json' | 'table';
  verbose?: boolean;
  colors?: boolean;
}

/**
 * CLI configuration manager
 */
export class CLIConfig {
  private config: CLIConfigData = {};
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || join(homedir(), '.memorai', 'config.json');
  }

  /**
   * Load configuration from file
   */  public async loadFromFile(path?: string): Promise<void> {
    const filePath = path || this.configPath;
    
    try {
      const content = await readFile(filePath, 'utf-8');
      this.config = JSON.parse(content);
    } catch (_error) {
      // File doesn't exist or is invalid, use defaults
      this.config = {};
    }
  }

  /**
   * Save configuration to file
   */
  public async saveToFile(path?: string): Promise<void> {
    const filePath = path || this.configPath;
    
    try {
      // Ensure directory exists
      const dir = filePath.substring(0, filePath.lastIndexOf('/'));
      await writeFile(dir + '/.keepdir', '', { flag: 'w' });
      
      await writeFile(filePath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get server URL
   */
  public getServerUrl(): string | undefined {
    return this.config.serverUrl || process.env.MEMORAI_SERVER_URL;
  }

  /**
   * Set server URL
   */
  public setServerUrl(url: string): void {
    this.config.serverUrl = url;
  }

  /**
   * Get API key
   */
  public getApiKey(): string | undefined {
    return this.config.apiKey || process.env.MEMORAI_API_KEY;
  }

  /**
   * Set API key
   */
  public setApiKey(key: string): void {
    this.config.apiKey = key;
  }

  /**
   * Get timeout
   */
  public getTimeout(): number {
    return this.config.timeout || parseInt(process.env.MEMORAI_TIMEOUT || '30000');
  }

  /**
   * Set timeout
   */
  public setTimeout(timeout: number): void {
    this.config.timeout = timeout;
  }

  /**
   * Get default agent ID
   */
  public getDefaultAgentId(): string | undefined {
    return this.config.defaultAgentId || process.env.MEMORAI_AGENT_ID;
  }

  /**
   * Set default agent ID
   */
  public setDefaultAgentId(agentId: string): void {
    this.config.defaultAgentId = agentId;
  }

  /**
   * Get output format
   */
  public getOutputFormat(): 'text' | 'json' | 'table' {
    return this.config.outputFormat || 'text';
  }

  /**
   * Set output format
   */
  public setOutputFormat(format: 'text' | 'json' | 'table'): void {
    this.config.outputFormat = format;
  }

  /**
   * Get verbose setting
   */
  public getVerbose(): boolean {
    return this.config.verbose || false;
  }

  /**
   * Set verbose setting
   */
  public setVerbose(verbose: boolean): void {
    this.config.verbose = verbose;
  }

  /**
   * Get colors setting
   */
  public getColors(): boolean {
    return this.config.colors !== false; // Default to true
  }

  /**
   * Set colors setting
   */
  public setColors(colors: boolean): void {
    this.config.colors = colors;
  }

  /**
   * Get all configuration
   */
  public getAll(): CLIConfigData {
    return { ...this.config };
  }

  /**
   * Reset configuration to defaults
   */
  public reset(): void {
    this.config = {};
  }

  /**
   * Validate configuration
   */
  public validate(): string[] {
    const errors: string[] = [];

    if (this.config.serverUrl && !/^https?:\/\/.+/.test(this.config.serverUrl)) {
      errors.push('Server URL must be a valid HTTP/HTTPS URL');
    }

    if (this.config.timeout && (this.config.timeout < 1000 || this.config.timeout > 300000)) {
      errors.push('Timeout must be between 1 and 300 seconds');
    }

    return errors;
  }

  /**
   * Get configuration file path
   */
  public getConfigPath(): string {
    return this.configPath;
  }
}

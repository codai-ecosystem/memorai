/**
 * @fileoverview Memory Agent - High-level interface for agent memory operations
 */

import type { 
  AgentMemory, 
  MemorySession, 
  RememberOptions, 
  RecallOptions, 
  ForgetOptions, 
  ContextOptions,
  ClientOptions 
} from '../types/index.js';
import { MemoraiClient } from '../client/MemoraiClient.js';

/**
 * Agent-specific memory operations wrapper
 */
export class MemoryAgent {
  private client: MemoraiClient;
  private agentId: string;
  private currentSession: MemorySession | undefined;

  constructor(agentId: string, options: ClientOptions) {
    this.agentId = agentId;
    this.client = new MemoraiClient({ ...options, agentId });
  }
  /**
   * Initialize agent memory
   */
  public async initialize(_sessionId?: string): Promise<void> {
    await this.client.connect();
    this.currentSession = await this.client.getSession();
  }

  /**
   * Remember something important
   */
  public async remember(
    what: string, 
    options: Partial<RememberOptions> = {}
  ): Promise<AgentMemory> {
    return await this.client.remember(what, options);
  }

  /**
   * Recall memories about a topic
   */
  public async recall(
    about: string, 
    options: Partial<RecallOptions> = {}
  ): Promise<AgentMemory[]> {
    return await this.client.recall(about, options);
  }

  /**
   * Get relevant context for current conversation
   */
  public async getContext(options: ContextOptions = {}): Promise<AgentMemory[]> {
    return await this.client.getContext(options);
  }

  /**
   * Forget specific memories
   */
  public async forget(options: ForgetOptions): Promise<void> {
    return await this.client.forget(options);
  }

  /**
   * Get memory statistics
   */
  public async getStats() {
    return await this.client.getStats();
  }

  /**
   * Start a new memory session
   */
  public async startNewSession(): Promise<MemorySession> {
    this.currentSession = await this.client.getSession();
    return this.currentSession;
  }

  /**
   * End current session
   */
  public async endSession(): Promise<void> {
    await this.client.clearSession();
    this.currentSession = undefined;
  }

  /**
   * Get current session
   */
  public getCurrentSession(): MemorySession | undefined {
    return this.currentSession;
  }

  /**
   * Disconnect agent
   */
  public async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  /**
   * Check if agent is connected
   */
  public get isConnected(): boolean {
    return this.client.isConnected;
  }

  /**
   * Get agent ID
   */
  public get id(): string {
    return this.agentId;
  }
}

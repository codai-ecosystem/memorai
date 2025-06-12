import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryCommands } from '../src/commands/MemoryCommands';
import { CLIConfig } from '../src/config/CLIConfig';
import { Output } from '../src/utils/Output';
import { Command } from 'commander';

// Mock the dependencies
vi.mock('../src/config/CLIConfig');
vi.mock('../src/utils/Output');

describe('MemoryCommands', () => {
  let memoryCommands: MemoryCommands;
  let mockConfig: any;
  let mockOutput: any;
  let mockProgram: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockConfig = {
      get: vi.fn(),
      set: vi.fn(),
      getServerUrl: vi.fn().mockReturnValue('http://localhost:3000'),
      getApiKey: vi.fn().mockReturnValue('test-key')
    };
    
    mockOutput = {
      info: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    };

    mockProgram = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis()
    };

    (CLIConfig as any).mockImplementation(() => mockConfig);
    (Output as any).mockImplementation(() => mockOutput);

    memoryCommands = new MemoryCommands(mockConfig, mockOutput);
  });

  describe('constructor', () => {
    it('should create MemoryCommands instance', () => {
      expect(memoryCommands).toBeDefined();
    });
  });

  describe('register', () => {
    it('should register memory commands with program', () => {
      memoryCommands.register(mockProgram as Command);
      
      expect(mockProgram.command).toHaveBeenCalledWith('list');
      expect(mockProgram.description).toHaveBeenCalledWith('List memories');
      expect(mockProgram.action).toHaveBeenCalled();
    });
  });

  describe('remember', () => {
    it('should handle remember command', async () => {
      const content = 'Test memory content';
      const options = { priority: 1, tags: ['test'] };

      await memoryCommands.remember(content, options);

      expect(mockOutput.info).toHaveBeenCalledWith(
        `Remember: ${content} (options: ${JSON.stringify(options)})`
      );
    });

    it('should handle remember through handler method', async () => {
      const content = 'Test memory content';
      const options = { priority: 1 };

      await memoryCommands.handleRemember(content, options);

      expect(mockOutput.info).toHaveBeenCalledWith(
        `Remember: ${content} (options: ${JSON.stringify(options)})`
      );
    });
  });

  describe('recall', () => {
    it('should handle recall command', async () => {
      const query = 'Test query';
      const options = { limit: 10, threshold: 0.8 };

      await memoryCommands.recall(query, options);

      expect(mockOutput.info).toHaveBeenCalledWith(
        `Recall: ${query} (options: ${JSON.stringify(options)})`
      );
    });

    it('should handle recall through handler method', async () => {
      const query = 'Test query';
      const options = { limit: 5 };

      await memoryCommands.handleRecall(query, options);

      expect(mockOutput.info).toHaveBeenCalledWith(
        `Recall: ${query} (options: ${JSON.stringify(options)})`
      );
    });
  });

  describe('context', () => {
    it('should handle context command', async () => {
      const topic = 'Test topic';
      const options = { limit: 5, timeframe: '1d' };

      await memoryCommands.context(topic, options);

      expect(mockOutput.info).toHaveBeenCalledWith(
        `Context: ${topic} (options: ${JSON.stringify(options)})`
      );
    });
  });

  describe('forget', () => {
    it('should handle forget command', async () => {
      const query = 'Test forget query';
      const options = { confirmDeletion: true };

      await memoryCommands.forget(query, options);

      expect(mockOutput.info).toHaveBeenCalledWith(
        `Forget: ${query} (options: ${JSON.stringify(options)})`
      );
    });

    it('should handle forget through handler method', async () => {
      const query = 'Test forget query';
      const options = { force: true };

      await memoryCommands.handleForget(query, options);

      expect(mockOutput.info).toHaveBeenCalledWith(
        `Forget: ${query} (options: ${JSON.stringify(options)})`
      );
    });
  });
});

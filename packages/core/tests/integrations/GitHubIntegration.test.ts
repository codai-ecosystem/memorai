import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHubIntegration, GitHubIntegrationConfig } from '../../src/integrations/GitHubIntegration.js';

// Mock Octokit methods
const mockOctokitMethods = {
  rest: {
    git: {
      getTree: vi.fn(),
    },
    repos: {
      getContent: vi.fn(),
      listCommits: vi.fn(),
    },
    issues: {
      listForRepo: vi.fn(),
      get: vi.fn(),
      listComments: vi.fn(),
    },
    pulls: {
      list: vi.fn(),
      get: vi.fn(),
      listFiles: vi.fn(),
      listReviews: vi.fn(),
    },
  },
};

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => mockOctokitMethods),
}));

describe('GitHubIntegration', () => {
  let integration: GitHubIntegration;
  
  const config: GitHubIntegrationConfig = {
    token: 'test-token',
    owner: 'test-owner',
    repo: 'test-repo',
    branches: ['main'],
    fileExtensions: ['ts', 'js'],
    includePaths: ['src/'],
    excludePaths: ['node_modules/'],
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    integration = new GitHubIntegration(config);
  });

  describe('extractCodeContext', () => {
    it('should extract code context from repository files', async () => {
      // Mock tree response
      mockOctokitMethods.rest.git.getTree.mockResolvedValue({
        data: {
          tree: [
            { type: 'blob', path: 'src/index.ts' },
            { type: 'blob', path: 'src/utils.js' },
            { type: 'blob', path: 'node_modules/package.json' }, // Should be excluded
          ],
        },
      });

      // Mock file content
      mockOctokitMethods.rest.repos.getContent.mockResolvedValue({
        data: { content: Buffer.from('function hello() { return "world"; }').toString('base64') },
      });

      // Mock commits
      mockOctokitMethods.rest.repos.listCommits.mockResolvedValue({
        data: [
          {
            sha: 'abc123',
            commit: {
              author: { name: 'Test Author', date: '2023-01-01T00:00:00Z' },
              message: 'Initial commit',
            },
          },
        ],
      });

      const contexts = await integration.extractCodeContext();      expect(contexts).toHaveLength(2); // Only .ts and .js files, excluding node_modules
      expect(contexts[0]).toMatchObject({
        filePath: expect.any(String),
        functions: expect.any(Array),
        classes: expect.any(Array),
        language: expect.any(String),
      });
    });

    it('should handle API errors gracefully', async () => {
      mockOctokitMethods.rest.git.getTree.mockRejectedValue(new Error('API Error'));

      const contexts = await integration.extractCodeContext();
      expect(contexts).toEqual([]);
    });
  });

  describe('Language Detection', () => {
    it('should detect languages correctly', () => {
      expect((integration as any).detectLanguage('test.ts')).toBe('typescript');
      expect((integration as any).detectLanguage('test.js')).toBe('javascript');
      expect((integration as any).detectLanguage('test.py')).toBe('python');
      expect((integration as any).detectLanguage('test.java')).toBe('java');
      expect((integration as any).detectLanguage('test.cpp')).toBe('cpp');
      expect((integration as any).detectLanguage('test.unknown')).toBe('text');
    });
  });

  describe('Code Parsing', () => {
    it('should extract JavaScript functions correctly', () => {
      const content = `
        function regularFunction() {}
        const arrowFunction = () => {};
        function* generatorFunction() {}
        async function asyncFunction() {}
      `;
      const functions = (integration as any).extractFunctions(content, 'javascript');
      expect(functions).toContain('regularFunction');
      expect(functions).toContain('arrowFunction');
      expect(functions).toContain('generatorFunction');
      expect(functions).toContain('asyncFunction');
    });

    it('should extract Python functions correctly', () => {
      const content = `
        def regular_function():
            pass
        
        async def async_function():
            pass
      `;
      const functions = (integration as any).extractFunctions(content, 'python');
      expect(functions).toContain('regular_function');
      expect(functions).toContain('async_function');
    });

    it('should extract classes correctly', () => {
      const content = `
        class TestClass {
          constructor() {}
        }
        class AnotherClass extends BaseClass {}
      `;
      const classes = (integration as any).extractClasses(content, 'javascript');
      expect(classes).toContain('TestClass');
      expect(classes).toContain('AnotherClass');
    });    it('should extract imports correctly', () => {
      const content = `
        import { Component } from 'react';
        import * as utils from './utils';
      `;
      const imports = (integration as any).extractImports(content, 'javascript');
      expect(imports).toContain('react');
      expect(imports).toContain('./utils');
    });
  });
  describe('File Filtering', () => {    it('should filter files by extension correctly', () => {
      const testConfig = {
        ...config,
        fileExtensions: ['ts', 'js'],
        includePaths: undefined, // Remove include path restriction
        excludePaths: undefined, // Remove exclude path restriction
      };
      const testIntegration = new GitHubIntegration(testConfig);

      expect((testIntegration as any).shouldProcessFile('test.ts')).toBe(true);
      expect((testIntegration as any).shouldProcessFile('test.js')).toBe(true);
      expect((testIntegration as any).shouldProcessFile('test.py')).toBe(false);
    });

    it('should filter files by include paths correctly', () => {
      const testConfig = {
        ...config,
        includePaths: ['src/', 'lib/'],
      };
      const testIntegration = new GitHubIntegration(testConfig);

      expect((testIntegration as any).shouldProcessFile('src/test.ts')).toBe(true);
      expect((testIntegration as any).shouldProcessFile('lib/utils.js')).toBe(true);
      expect((testIntegration as any).shouldProcessFile('docs/readme.md')).toBe(false);
    });

    it('should process all files when no filters are specified', () => {
      const testConfig = {
        ...config,
        fileExtensions: undefined,
        includePaths: undefined,
        excludePaths: undefined,
      };
      const testIntegration = new GitHubIntegration(testConfig);

      expect((testIntegration as any).shouldProcessFile('test.ts')).toBe(true);
      expect((testIntegration as any).shouldProcessFile('test.py')).toBe(true);
      expect((testIntegration as any).shouldProcessFile('node_modules/package.json')).toBe(true);
    });
  });
});
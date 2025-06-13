#!/usr/bin/env node

// Quick fix script for remaining ESLint errors
import fs from 'fs/promises';
import path from 'path';

const fixes = [
  // Remove unused imports
  {
    file: 'src/search/SemanticSearchEngine.ts',
    search: "import { MemoryQuery, SemanticSearchResult, VectorEmbedding, MemoryContent } from '../types/index.js';",
    replace: "import { SemanticSearchResult, VectorEmbedding, MemoryContent } from '../types/index.js';"
  },
  // Fix unused parameters
  {
    file: 'src/graph/KnowledgeGraph.ts',
    search: "findPotentialConnections(entities: KnowledgeEntity[], relations: KnowledgeRelation[]): PotentialConnection[] {",
    replace: "findPotentialConnections(entities: KnowledgeEntity[], _relations: KnowledgeRelation[]): PotentialConnection[] {"
  },
  {
    file: 'src/search/SemanticSearchEngine.ts',
    search: "private async rerank(results: SearchResult[], query: string, context?: SearchContext): Promise<SearchResult[]> {",
    replace: "private async rerank(results: SearchResult[], query: string, _context?: SearchContext): Promise<SearchResult[]> {"
  },
  {
    file: 'src/search/SemanticSearchEngine.ts',
    search: "private calculateSemanticScore(result: SearchResult, query: string, context?: SearchContext): number {",
    replace: "private calculateSemanticScore(result: SearchResult, query: string, _context?: SearchContext): number {"
  }
];

async function applyFixes() {
  for (const fix of fixes) {
    try {
      const filePath = path.join('packages/core', fix.file);
      const content = await fs.readFile(filePath, 'utf-8');
      const newContent = content.replace(fix.search, fix.replace);
      if (newContent !== content) {
        await fs.writeFile(filePath, newContent);
        console.log(`Fixed: ${fix.file}`);
      }
    } catch (error) {
      console.log(`Could not fix ${fix.file}: ${error.message}`);
    }
  }
}

applyFixes().then(() => console.log('All fixes applied!'));

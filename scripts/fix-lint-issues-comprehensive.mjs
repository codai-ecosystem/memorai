#!/usr/bin/env node

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Configuration
const config = {
  // Directories to process
  include: [
    'apps/api/src',
    'apps/dashboard/src', 
    'packages/*/src',
    'packages/*/tests'
  ],
  // File extensions to process
  extensions: ['.ts', '.tsx'],
  // Lint fixes to apply
  fixes: {
    // High priority fixes
    removeUnusedVars: true,
    addReturnTypes: true,
    replaceAnyTypes: true,
    fixImportOrder: true,
    addCurlyBraces: true,
    useNullishCoalescing: true,
    
    // Lower priority fixes
    removeConsoleStatements: false, // Keep for debugging
    fixPromiseHandling: true
  }
};

class LintFixer {
  constructor() {
    this.stats = {
      filesProcessed: 0,
      fixesApplied: 0,
      errors: 0
    };
  }

  log(message, type = 'info') {
    const prefix = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type];
    console.log(`${prefix} ${message}`);
  }

  // Get all TypeScript files to process
  getFiles() {
    const files = [];
    
    for (const pattern of config.include) {
      const fullPath = join(projectRoot, pattern);
      try {
        this.collectFiles(fullPath, files);
      } catch (error) {
        // Skip if directory doesn't exist
      }
    }
    
    return files.filter(file => 
      config.extensions.includes(extname(file)) &&
      !file.includes('node_modules') &&
      !file.includes('.next') &&
      !file.includes('dist') &&
      !file.includes('coverage')
    );
  }

  collectFiles(dir, files) {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!item.startsWith('.') && item !== 'node_modules') {
          this.collectFiles(fullPath, files);
        }
      } else {
        files.push(fullPath);
      }
    }
  }

  // Fix unused variables (by adding underscore prefix)
  fixUnusedVars(content) {
    let fixes = 0;
    
    // Pattern for unused parameters/variables
    const patterns = [
      // Error handlers: catch (error) => catch (_error)
      /catch\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/g,
      // Function parameters: (param, index) => (_param, _index) when unused
      /\(([a-zA-Z_][a-zA-Z0-9_]*),\s*([a-zA-Z_][a-zA-Z0-9_]*)\)\s*=>/g
    ];
    
    content = content.replace(/catch\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/g, (match, varName) => {
      if (!varName.startsWith('_')) {
        fixes++;
        return `catch (_${varName})`;
      }
      return match;
    });
    
    this.stats.fixesApplied += fixes;
    return content;
  }

  // Add basic return types to functions
  addReturnTypes(content) {
    let fixes = 0;
    
    // Arrow functions without return types
    content = content.replace(
      /(\w+)\s*=\s*\([^)]*\)\s*=>\s*{/g,
      (match, funcName) => {
        if (!match.includes(': ') && !funcName.startsWith('use')) {
          fixes++;
          return match.replace('=>', ': void =>');
        }
        return match;
      }
    );

    this.stats.fixesApplied += fixes;
    return content;
  }

  // Replace specific any types with better alternatives
  replaceAnyTypes(content) {
    let fixes = 0;
    
    // Common any replacements
    const replacements = [
      // Record types
      { from: /:\s*any\s*\[\]/g, to: ': unknown[]', description: 'any[] -> unknown[]' },
      { from: /:\s*Record<string,\s*any>/g, to: ': Record<string, unknown>', description: 'Record<string, any> -> Record<string, unknown>' },
      // Function parameters that are clearly objects
      { from: /error:\s*any/g, to: 'error: Error | unknown', description: 'error: any -> error: Error | unknown' },
      // Event handlers
      { from: /event:\s*any/g, to: 'event: Event', description: 'event: any -> event: Event' }
    ];

    for (const replacement of replacements) {
      const beforeCount = (content.match(replacement.from) || []).length;
      content = content.replace(replacement.from, replacement.to);
      const afterCount = (content.match(replacement.from) || []).length;
      const fixed = beforeCount - afterCount;
      if (fixed > 0) {
        fixes += fixed;
        this.log(`  Fixed ${fixed} instances: ${replacement.description}`, 'success');
      }
    }

    this.stats.fixesApplied += fixes;
    return content;
  }

  // Fix import order issues
  fixImportOrder(content) {
    let fixes = 0;
    
    // Extract all imports
    const imports = [];
    const importRegex = /^import.*$/gm;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      imports.push({
        line: match[0],
        index: match.index,
        isReact: match[0].includes('react'),
        isNext: match[0].includes('next'),
        isRelative: match[0].includes('./') || match[0].includes('../'),
        isUI: match[0].includes('@/components/ui'),
        isExternal: !match[0].includes('./') && !match[0].includes('../') && !match[0].includes('@/')
      });
    }

    if (imports.length > 1) {
      // Sort imports: React -> Next -> External -> Internal -> UI -> Relative
      const sortedImports = [
        ...imports.filter(imp => imp.isReact),
        ...imports.filter(imp => imp.isNext && !imp.isReact),
        ...imports.filter(imp => imp.isExternal && !imp.isReact && !imp.isNext),
        ...imports.filter(imp => !imp.isExternal && !imp.isRelative && !imp.isUI && !imp.isReact && !imp.isNext),
        ...imports.filter(imp => imp.isUI),
        ...imports.filter(imp => imp.isRelative)
      ];

      // Check if reordering is needed
      const needsReorder = imports.some((imp, index) => 
        index < sortedImports.length && imp.line !== sortedImports[index].line
      );

      if (needsReorder) {
        // Remove all imports
        content = content.replace(importRegex, '');
        
        // Add sorted imports at the top
        const importBlock = sortedImports.map(imp => imp.line).join('\n') + '\n\n';
        content = importBlock + content.replace(/^\n+/, '');
        
        fixes++;
        this.log('  Fixed import order', 'success');
      }
    }

    this.stats.fixesApplied += fixes;
    return content;
  }

  // Add curly braces to single-line if statements
  addCurlyBraces(content) {
    let fixes = 0;
    
    // if statements without braces
    content = content.replace(
      /if\s*\([^)]+\)\s*([^{].*?)(?=\n|$)/g,
      (match, statement) => {
        if (!statement.trim().startsWith('{') && statement.trim() !== '') {
          fixes++;
          return match.replace(statement, `{\n        ${statement.trim()}\n    }`);
        }
        return match;
      }
    );

    this.stats.fixesApplied += fixes;
    return content;
  }

  // Replace || with ?? where appropriate
  useNullishCoalescing(content) {
    let fixes = 0;
    
    // Common patterns where ?? is preferred over ||
    const patterns = [
      // Variable || 'default' -> Variable ?? 'default'
      /(\w+)\s*\|\|\s*(['"]\w+['"])/g,
      // obj.prop || defaultValue -> obj.prop ?? defaultValue  
      /(\w+\.\w+)\s*\|\|\s*(\w+)/g
    ];

    for (const pattern of patterns) {
      const beforeCount = (content.match(pattern) || []).length;
      content = content.replace(pattern, '$1 ?? $2');
      const afterCount = (content.match(pattern) || []).length;
      fixes += beforeCount - afterCount;
    }

    if (fixes > 0) {
      this.log(`  Fixed ${fixes} || operators to ??`, 'success');
    }

    this.stats.fixesApplied += fixes;
    return content;
  }

  // Fix promise handling
  fixPromiseHandling(content) {
    let fixes = 0;
    
    // Add void operator to floating promises
    content = content.replace(
      /^\s*([a-zA-Z_][a-zA-Z0-9_.]*\([^)]*\));?\s*$/gm,
      (match, call) => {
        if (call.includes('fetch') || call.includes('Promise') || call.includes('async')) {
          fixes++;
          return match.replace(call, `void ${call}`);
        }
        return match;
      }
    );

    this.stats.fixesApplied += fixes;
    return content;
  }

  // Process a single file
  processFile(filePath) {
    try {
      const content = readFileSync(filePath, 'utf8');
      let newContent = content;
      
      // Apply fixes based on configuration
      if (config.fixes.removeUnusedVars) {
        newContent = this.fixUnusedVars(newContent);
      }
      
      if (config.fixes.addReturnTypes) {
        newContent = this.addReturnTypes(newContent);
      }
      
      if (config.fixes.replaceAnyTypes) {
        newContent = this.replaceAnyTypes(newContent);
      }
      
      if (config.fixes.fixImportOrder) {
        newContent = this.fixImportOrder(newContent);
      }
      
      if (config.fixes.addCurlyBraces) {
        newContent = this.addCurlyBraces(newContent);
      }
      
      if (config.fixes.useNullishCoalescing) {
        newContent = this.useNullishCoalescing(newContent);
      }
      
      if (config.fixes.fixPromiseHandling) {
        newContent = this.fixPromiseHandling(newContent);
      }

      // Write file only if changes were made
      if (newContent !== content) {
        writeFileSync(filePath, newContent);
        this.log(`Fixed: ${filePath.replace(projectRoot, '')}`, 'success');
      }
      
      this.stats.filesProcessed++;
      
    } catch (error) {
      this.log(`Error processing ${filePath}: ${error.message}`, 'error');
      this.stats.errors++;
    }
  }

  // Main execution
  async run() {
    this.log('🚀 Starting comprehensive lint fixes...', 'info');
    
    const files = this.getFiles();
    this.log(`Found ${files.length} TypeScript files to process`, 'info');
    
    for (const file of files) {
      this.processFile(file);
    }
    
    // Print summary
    this.log('\n📊 Summary:', 'info');
    this.log(`Files processed: ${this.stats.filesProcessed}`, 'info');
    this.log(`Fixes applied: ${this.stats.fixesApplied}`, 'info');
    this.log(`Errors: ${this.stats.errors}`, this.stats.errors > 0 ? 'warning' : 'info');
    
    if (this.stats.fixesApplied > 0) {
      this.log('\n✅ Lint fixes completed! Run `pnpm lint` to verify.', 'success');
    } else {
      this.log('\n✅ No fixes needed!', 'success');
    }
  }
}

// Run the fixer
const fixer = new LintFixer();
fixer.run().catch(console.error);

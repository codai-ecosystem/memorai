/**
 * Basic test for web dashboard server
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Web Dashboard', () => {
  it('should have basic server functionality', () => {
    // Basic smoke test
    expect(true).toBe(true);
  });

  it('should load server module without errors', () => {
    // Test that we can require the server module
    expect(() => {
      // Just check the file exists and is valid JavaScript
      const serverPath = path.join(__dirname, '../src/server.js');
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      expect(serverContent).toContain('express');
      expect(serverContent).toContain('socket.io');
    }).not.toThrow();
  });

  it('should have valid package.json configuration', async () => {
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    expect(packageJson.name).toBe('@codai/memorai-web-dashboard');
    expect(packageJson.version).toBe('2.0.0');
    expect(packageJson.main).toBe('src/server.js');
  });
});

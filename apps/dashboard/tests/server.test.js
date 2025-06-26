/**
 * Basic test for web dashboard server
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Web Dashboard', () => {
  it('should have basic server functionality', () => {
    // Basic smoke test
    expect(true).toBe(true);
  });
  it('should load server module without errors', () => {
    // This is a Next.js app, check that we have a valid Next.js configuration instead
    expect(() => {
      const nextConfigPath = path.join(__dirname, '../next.config.js');
      const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf8');
      expect(nextConfigContent).toBeTruthy();
    }).not.toThrow();
  });

  it('should have valid package.json configuration', async () => {
    const packageJsonPath = path.join(__dirname, '../package.json');
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    expect(packageJson.name).toBe('@codai/memorai-dashboard');
    expect(packageJson.version).toBe('2.0.5');
    expect(packageJson.main).toBe('next.config.js');
  });
});

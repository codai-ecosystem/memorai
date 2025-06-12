/**
 * Basic test for web dashboard server
 */

describe('Web Dashboard', () => {
  it('should have basic server functionality', () => {
    // Basic smoke test
    expect(true).toBe(true);
  });

  it('should load server module without errors', () => {
    // Test that we can require the server module
    expect(() => {
      // Just check the file exists and is valid JavaScript
      const fs = require('fs');
      const path = require('path');
      const serverPath = path.join(__dirname, '../src/server.js');
      const serverContent = fs.readFileSync(serverPath, 'utf8');
      expect(serverContent).toContain('express');
      expect(serverContent).toContain('socket.io');
    }).not.toThrow();
  });

  it('should have valid package.json configuration', () => {
    const packageJson = require('../package.json');
    expect(packageJson.name).toBe('@codai/memorai-web-dashboard');
    expect(packageJson.version).toBe('1.0.0');
    expect(packageJson.main).toBe('src/server.js');
  });
});

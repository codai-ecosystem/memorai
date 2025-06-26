import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import * as net from 'net';

/**
 * Infrastructure startup utility for Memorai MCP Server
 * Automatically starts and manages Docker services (Qdrant, Redis, PostgreSQL)
 */

const sleep = promisify(setTimeout);

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ServiceHealthCheck {
  name: string;
  url?: string;
  port?: number;
  timeout?: number;
}

export class InfrastructureManager {
  private dockerComposeFile: string;
  private services: ServiceHealthCheck[] = [
    { name: 'Qdrant', url: 'http://localhost:6333/', timeout: 45000 },
    { name: 'Redis', port: 6379, timeout: 30000 },
    { name: 'PostgreSQL', port: 5432, timeout: 30000 },
  ];
  constructor() {
    // Find Docker Compose file - try multiple locations
    const packageDir = path.dirname(__dirname); // dist -> mcp package

    // Potential locations for docker-compose.dev.yml
    const candidatePaths = [
      // 1. In the package itself (when published)
      path.join(packageDir, 'docker-compose.dev.yml'),
      // 2. In project root (when developing)
      path.join(process.cwd(), 'tools', 'docker', 'docker-compose.dev.yml'),
      // 3. Parent directories (when installed globally)
      path.join(
        path.dirname(packageDir),
        'tools',
        'docker',
        'docker-compose.dev.yml'
      ),
      path.join(
        path.dirname(path.dirname(packageDir)),
        'tools',
        'docker',
        'docker-compose.dev.yml'
      ),
      // 4. Fallback to current directory
      path.join(process.cwd(), 'docker-compose.dev.yml'),
    ];

    // Find the first existing file
    this.dockerComposeFile =
      candidatePaths.find(filePath => fs.existsSync(filePath)) ||
      candidatePaths[0]; // Default to first path if none found

    console.error(`🔍 Using Docker Compose file: ${this.dockerComposeFile}`);
  }

  /**
   * Check if a service is healthy
   */
  private async checkServiceHealth(
    service: ServiceHealthCheck
  ): Promise<boolean> {
    try {
      if (service.url) {
        // HTTP health check
        const response = await fetch(service.url, {
          method: 'GET',
          signal: AbortSignal.timeout(2000),
        });
        return response.ok;
      } else if (service.port) {
        // TCP port check
        return new Promise(resolve => {
          const socket = new net.Socket();

          const timeout = setTimeout(() => {
            socket.destroy();
            resolve(false);
          }, 2000);

          socket.on('connect', () => {
            clearTimeout(timeout);
            socket.destroy();
            resolve(true);
          });

          socket.on('error', () => {
            clearTimeout(timeout);
            resolve(false);
          });

          socket.connect(service.port!, 'localhost');
        });
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for a service to become healthy
   */
  private async waitForService(service: ServiceHealthCheck): Promise<boolean> {
    const timeout = service.timeout || 30000;
    const startTime = Date.now();

    console.error(`   ⏳ Waiting for ${service.name}...`);

    while (Date.now() - startTime < timeout) {
      if (await this.checkServiceHealth(service)) {
        console.error(`   ✅ ${service.name}: Ready`);
        return true;
      }
      await sleep(1000);
      process.stdout.write('.');
    }

    console.error(`\n   ❌ ${service.name}: Timeout after ${timeout}ms`);
    return false;
  }

  /**
   * Check if all services are already running
   */
  public async areServicesRunning(): Promise<boolean> {
    console.error('🔍 Checking existing infrastructure...');

    for (const service of this.services) {
      if (!(await this.checkServiceHealth(service))) {
        return false;
      }
    }

    console.error('✅ All infrastructure services are already running!');
    return true;
  }

  /**
   * Start Docker Compose services
   */
  private async startDockerServices(): Promise<boolean> {
    return new Promise(resolve => {
      console.error('🐳 Starting Docker infrastructure services...');

      // First, try to stop any existing services
      const downProcess = spawn(
        'docker-compose',
        ['-f', this.dockerComposeFile, 'down', '--remove-orphans'],
        { stdio: 'pipe' }
      );

      downProcess.on('close', () => {
        // Start services
        const upProcess = spawn(
          'docker-compose',
          ['-f', this.dockerComposeFile, 'up', '-d'],
          { stdio: 'pipe' }
        );

        let output = '';
        upProcess.stdout?.on('data', data => {
          output += data.toString();
        });

        upProcess.stderr?.on('data', data => {
          output += data.toString();
        });

        upProcess.on('close', code => {
          if (code === 0) {
            console.error('✅ Docker services started successfully');
            resolve(true);
          } else {
            console.error('❌ Failed to start Docker services:');
            console.error(output);
            resolve(false);
          }
        });

        upProcess.on('error', error => {
          console.error('❌ Docker command failed:', error.message);
          resolve(false);
        });
      });

      downProcess.on('error', () => {
        // Ignore down errors and continue with up
        const upProcess = spawn(
          'docker-compose',
          ['-f', this.dockerComposeFile, 'up', '-d'],
          { stdio: 'pipe' }
        );

        upProcess.on('close', code => {
          resolve(code === 0);
        });
      });
    });
  }

  /**
   * Start and wait for all infrastructure services
   */
  public async startInfrastructure(force: boolean = false): Promise<boolean> {
    try {
      console.error('🚀 Starting Complete Memorai Infrastructure...');
      console.error(
        '============================================================'
      );

      // Check if services are already running
      if (!force && (await this.areServicesRunning())) {
        return true;
      }

      // Start Docker services
      if (!(await this.startDockerServices())) {
        return false;
      }

      // Wait for all services to be ready
      console.error('⏳ Waiting for all services to be ready...');
      let allReady = true;

      for (const service of this.services) {
        if (!(await this.waitForService(service))) {
          allReady = false;
        }
      }

      if (allReady) {
        console.error('\n🎯 All Infrastructure Ready!');
        console.error('✅ Qdrant Vector Database: http://localhost:6333');
        console.error('✅ Redis Cache: localhost:6379');
        console.error('✅ PostgreSQL Database: localhost:5432');
        return true;
      } else {
        console.error('\n❌ Some services failed to start properly');
        return false;
      }
    } catch (error) {
      console.error('❌ Infrastructure startup failed:', error);
      return false;
    }
  }

  /**
   * Stop all infrastructure services
   */
  public async stopInfrastructure(): Promise<boolean> {
    return new Promise(resolve => {
      console.error('🛑 Stopping infrastructure services...');

      const downProcess = spawn(
        'docker-compose',
        ['-f', this.dockerComposeFile, 'down'],
        { stdio: 'pipe' }
      );

      downProcess.on('close', code => {
        if (code === 0) {
          console.error('✅ Infrastructure services stopped');
          resolve(true);
        } else {
          console.error('❌ Failed to stop infrastructure services');
          resolve(false);
        }
      });

      downProcess.on('error', error => {
        console.error('❌ Failed to stop infrastructure:', error.message);
        resolve(false);
      });
    });
  }
}

// Singleton instance
export const infrastructureManager = new InfrastructureManager();

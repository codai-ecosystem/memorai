/**
 * Local AI Embedding Service
 * Provides semantic embeddings without external dependencies
 */

import { spawn, type ChildProcess } from "child_process";
import { promises as fs } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { EmbeddingResult } from "./EmbeddingService.js";
// import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface LocalEmbeddingConfig {
  model: string;
  maxLength: number;
  cachePath?: string;
  pythonPath?: string;
}

export class LocalEmbeddingService {
  private config: LocalEmbeddingConfig;
  private cache: Map<string, number[]> = new Map();
  private pythonScriptPath: string;

  constructor(config: Partial<LocalEmbeddingConfig> = {}) {
    this.config = {
      model: "all-MiniLM-L6-v2",
      maxLength: 512,
      cachePath: join(__dirname, "..", "..", ".cache", "embeddings.json"),
      pythonPath: "python",
      ...config,
    };

    this.pythonScriptPath = join(__dirname, "local_embeddings.py");
    this.loadCache();
  }

  /**
   * Generate embeddings for text using local sentence-transformers
   */
  public async embed(text: string): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty");
    }

    const normalizedText = text.trim().slice(0, this.config.maxLength);

    // Check cache first
    if (this.cache.has(normalizedText)) {
      const embedding = this.cache.get(normalizedText)!;
      return {
        embedding,
        model: this.config.model,
        tokens: this.estimateTokens(normalizedText),
      };
    }

    try {
      const embedding = await this.generateEmbedding(normalizedText);

      // Cache the result
      this.cache.set(normalizedText, embedding);
      await this.saveCache();

      return {
        embedding,
        model: this.config.model,
        tokens: this.estimateTokens(normalizedText),
      };
    } catch (error) {
      throw new Error(
        `Local embedding generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Generate embedding using Python sentence-transformers
   */ private async generateEmbedding(text: string): Promise<number[]> {
    await this.ensurePythonScript();

    return new Promise((resolve, reject) => {
      const python: ChildProcess = spawn(this.config.pythonPath!, [
        this.pythonScriptPath,
        "--model",
        this.config.model,
        "--text",
        text,
      ]);

      let stdout = "";
      let stderr = "";

      python.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      python.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      python.on("close", (code: number | null) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout.trim());
            if (result.embedding && Array.isArray(result.embedding)) {
              resolve(result.embedding);
            } else {
              reject(new Error("Invalid embedding format from Python script"));
            }
          } catch (error) {
            reject(
              new Error(
                `Failed to parse embedding result: ${error instanceof Error ? error.message : "Unknown error"}`,
              ),
            );
          }
        } else {
          reject(
            new Error(`Python script failed with code ${code}: ${stderr}`),
          );
        }
      });

      python.on("error", (error: Error) => {
        reject(new Error(`Failed to spawn Python process: ${error.message}`));
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        python.kill();
        reject(new Error("Embedding generation timeout"));
      }, 30000);
    });
  }

  /**
   * Ensure the Python script exists
   */ private async ensurePythonScript(): Promise<void> {
    try {
      await fs.access(this.pythonScriptPath);
    } catch {
      await this.createPythonScript();
    }
  }

  /**
   * Create the Python embedding script
   */
  private async createPythonScript(): Promise<void> {
    const scriptContent = `#!/usr/bin/env python3
"""
Local Embedding Service - Python Backend
Generates embeddings using sentence-transformers
"""

import sys
import json
import argparse
from sentence_transformers import SentenceTransformer

def main():
    parser = argparse.ArgumentParser(description='Generate embeddings using sentence-transformers')
    parser.add_argument('--model', default='all-MiniLM-L6-v2', help='Model name')
    parser.add_argument('--text', required=True, help='Text to embed')
    
    args = parser.parse_args()
    
    try:
        # Load model
        model = SentenceTransformer(args.model)
        
        # Generate embedding
        embedding = model.encode(args.text)
        
        # Convert to list for JSON serialization
        embedding_list = embedding.tolist()
        
        # Output result as JSON
        result = {
            'embedding': embedding_list,
            'model': args.model,
            'dimension': len(embedding_list)
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
`;

    await fs.mkdir(dirname(this.pythonScriptPath), { recursive: true });
    await fs.writeFile(this.pythonScriptPath, scriptContent);

    // Make script executable on Unix systems
    if (process.platform !== "win32") {
      await fs.chmod(this.pythonScriptPath, 0o755);
    }
  }

  /**
   * Load embedding cache from disk
   */
  private async loadCache(): Promise<void> {
    try {
      if (this.config.cachePath) {
        const cacheData = await fs.readFile(this.config.cachePath, "utf-8");
        const cacheObject = JSON.parse(cacheData);
        this.cache = new Map(Object.entries(cacheObject));
      }
    } catch {
      // Cache doesn't exist or is invalid, start fresh
      this.cache = new Map();
    }
  }

  /**
   * Save embedding cache to disk
   */
  private async saveCache(): Promise<void> {
    try {
      if (this.config.cachePath) {
        await fs.mkdir(dirname(this.config.cachePath), { recursive: true });
        const cacheObject = Object.fromEntries(this.cache);
        await fs.writeFile(
          this.config.cachePath,
          JSON.stringify(cacheObject, null, 2),
        );
      }
    } catch {
      // Error ignored
    }
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if local AI is available
   */ public static async isAvailable(pythonPath = "python"): Promise<boolean> {
    return new Promise((resolve) => {
      const python: ChildProcess = spawn(pythonPath, [
        "-c",
        'import sentence_transformers; print("OK")',
      ]);

      python.on("close", (code: number | null) => {
        resolve(code === 0);
      });

      python.on("error", () => {
        resolve(false);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        python.kill();
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Install sentence-transformers if not available
   */
  public static async install(pythonPath = "python"): Promise<boolean> {
    return new Promise((resolve) => {
      const pip: ChildProcess = spawn(pythonPath, [
        "-m",
        "pip",
        "install",
        "sentence-transformers",
      ]);

      pip.on("close", (code: number | null) => {
        resolve(code === 0);
      });

      pip.on("error", () => {
        resolve(false);
      });

      // Timeout after 2 minutes
      setTimeout(() => {
        pip.kill();
        resolve(false);
      }, 120000);
    });
  }
}

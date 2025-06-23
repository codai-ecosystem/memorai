import OpenAI from "openai";

import type { MemoryConfig } from "../types/index.js";
import { EmbeddingError } from "../types/index.js";

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
  model: string;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<EmbeddingResult>;
  embedBatch(texts: string[]): Promise<EmbeddingResult[]>;
  getDimension(): number;
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private client: OpenAI;
  private model: string;
  private dimension: number;

  constructor(config: MemoryConfig["embedding"]) {
    if (!config.api_key) {
      throw new EmbeddingError("OpenAI API key is required");
    }

    this.client = new OpenAI({
      apiKey: config.api_key,
      baseURL: config.endpoint,
    });

    this.model = config.model;
    this.dimension = this.getModelDimension(config.model);
  }

  public async embed(text: string): Promise<EmbeddingResult> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text.replace(/\n/g, " "),
        encoding_format: "float",
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new EmbeddingError("No embedding returned from OpenAI");
      }

      return {
        embedding,
        tokens: response.usage.total_tokens,
        model: this.model,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new EmbeddingError(`OpenAI embedding failed: ${error.message}`, {
          text: text.substring(0, 100),
          model: this.model,
        });
      }
      throw new EmbeddingError("Unknown embedding error");
    }
  }

  public async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    try {
      const cleanTexts = texts.map((text) => text.replace(/\n/g, " "));

      const response = await this.client.embeddings.create({
        model: this.model,
        input: cleanTexts,
        encoding_format: "float",
      });

      return response.data.map((item) => ({
        embedding: item.embedding,
        tokens: Math.floor(response.usage.total_tokens / texts.length), // Approximate
        model: this.model,
      }));
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new EmbeddingError(
          `OpenAI batch embedding failed: ${error.message}`,
          {
            batch_size: texts.length,
            model: this.model,
          },
        );
      }
      throw new EmbeddingError("Unknown batch embedding error");
    }
  }

  public getDimension(): number {
    return this.dimension;
  }

  private getModelDimension(model: string): number {
    const dimensions: Record<string, number> = {
      "text-embedding-3-small": 1536,
      "text-embedding-3-large": 3072,
      "text-embedding-ada-002": 1536,
    };

    return dimensions[model] ?? 1536;
  }
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
  private dimension: number;

  constructor(dimension = 1536) {
    this.dimension = dimension;
  }

  public async embed(text: string): Promise<EmbeddingResult> {
    // Simplified local embedding using text hash - NOT for production
    const hash = this.simpleHash(text);
    const embedding = this.hashToVector(hash, this.dimension);

    return {
      embedding,
      tokens: Math.ceil(text.length / 4), // Approximate token count
      model: "local-hash",
    };
  }

  public async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    return Promise.all(texts.map((text) => this.embed(text)));
  }

  public getDimension(): number {
    return this.dimension;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private hashToVector(hash: number, dimension: number): number[] {
    const vector: number[] = [];
    let currentHash = hash;

    for (let i = 0; i < dimension; i++) {
      // Create pseudo-random values from hash
      currentHash = (currentHash * 1103515245 + 12345) & 0x7fffffff;
      vector.push((currentHash / 0x7fffffff) * 2 - 1); // Normalize to [-1, 1]
    }

    // Normalize vector
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0),
    );
    return vector.map((val) => val / magnitude);
  }
}

export class EmbeddingService {
  private provider: EmbeddingProvider;

  constructor(config: MemoryConfig["embedding"]) {
    switch (config.provider) {
      case "openai":
        this.provider = new OpenAIEmbeddingProvider(config);
        break;
      case "azure":
        this.provider = new OpenAIEmbeddingProvider({
          ...config,
          endpoint:
            config.endpoint ?? "https://api.cognitive.microsoft.com/openai",
        });
        break;
      case "local":
        this.provider = new LocalEmbeddingProvider();
        break;
      default:
        throw new EmbeddingError(
          `Unsupported embedding provider: ${config.provider}`,
        );
    }
  }

  public async embed(text: string): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
      throw new EmbeddingError("Text cannot be empty");
    }

    return this.provider.embed(text.trim());
  }

  public async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) {
      return [];
    }

    const validTexts = texts.filter((text) => text && text.trim().length > 0);
    if (validTexts.length === 0) {
      throw new EmbeddingError("No valid texts provided");
    }

    return this.provider.embedBatch(validTexts.map((text) => text.trim()));
  }

  public getDimension(): number {
    return this.provider.getDimension();
  }

  public async embedWithRetry(
    text: string,
    maxRetries = 3,
    baseDelay = 1000,
  ): Promise<EmbeddingResult> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.embed(text);
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error("Unknown error");

        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new EmbeddingError(
      `Failed to embed after ${maxRetries} attempts: ${lastError?.message}`,
      { text: text.substring(0, 100), attempts: maxRetries },
    );
  }
}

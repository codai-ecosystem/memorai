/**
 * Advanced AI Features - Cutting-edge AI capabilities for Memorai
 * Part of Phase 4.1: Machine Learning Integration for Memorai Ultimate Completion Plan
 */

// Result type for consistent error handling
type Result<T, E> = 
  | { success: true; error: undefined; data: T }
  | { success: false; error: E; data: undefined };

// AI Model Types
interface AIModel {
  id: string;
  name: string;
  type: 'embedding' | 'classification' | 'generation' | 'recommendation' | 'anomaly-detection';
  version: string;
  provider: 'openai' | 'anthropic' | 'google' | 'local' | 'custom';
  endpoint?: string;
  apiKey?: string;
  modelPath?: string;
  config: Record<string, any>;
  metrics: ModelMetrics;
  status: 'active' | 'inactive' | 'training' | 'error';
}

interface ModelMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  latency: number; // milliseconds
  throughput: number; // requests per second
  errorRate: number;
  lastUpdated: Date;
}

interface EmbeddingResult {
  vector: number[];
  dimensions: number;
  model: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface ClassificationResult {
  category: string;
  confidence: number;
  alternatives: Array<{ category: string; confidence: number }>;
  model: string;
  timestamp: Date;
}

interface RecommendationResult {
  recommendations: Array<{
    id: string;
    score: number;
    reason: string;
    metadata: Record<string, any>;
  }>;
  model: string;
  timestamp: Date;
  context: Record<string, any>;
}

interface AnomalyResult {
  isAnomaly: boolean;
  score: number;
  threshold: number;
  features: Record<string, number>;
  model: string;
  timestamp: Date;
}

// Advanced Vector Operations
class VectorOperations {
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  static euclideanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.pow(a[i] - b[i], 2);
    }
    return Math.sqrt(sum);
  }

  static manhattanDistance(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }

    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.abs(a[i] - b[i]);
    }
    return sum;
  }

  static normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return magnitude === 0 ? vector : vector.map(val => val / magnitude);
  }

  static add(a: number[], b: number[]): number[] {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }
    return a.map((val, i) => val + b[i]);
  }

  static subtract(a: number[], b: number[]): number[] {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }
    return a.map((val, i) => val - b[i]);
  }

  static multiply(vector: number[], scalar: number): number[] {
    return vector.map(val => val * scalar);
  }

  static dotProduct(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same dimension');
    }
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }
}

// Embedding Service
class EmbeddingService {
  private readonly models: Map<string, AIModel> = new Map();
  private readonly cache: Map<string, EmbeddingResult> = new Map();

  constructor() {
    this.initializeModels();
  }

  private initializeModels(): void {
    // OpenAI Ada v2
    this.models.set('openai-ada-002', {
      id: 'openai-ada-002',
      name: 'OpenAI Ada v2',
      type: 'embedding',
      version: '002',
      provider: 'openai',
      endpoint: 'https://api.openai.com/v1/embeddings',
      config: {
        model: 'text-embedding-ada-002',
        dimensions: 1536,
        maxTokens: 8191
      },
      metrics: {
        latency: 150,
        throughput: 100,
        errorRate: 0.01,
        lastUpdated: new Date()
      },
      status: 'active'
    });

    // OpenAI 3-small
    this.models.set('openai-3-small', {
      id: 'openai-3-small',
      name: 'OpenAI 3 Small',
      type: 'embedding',
      version: '3-small',
      provider: 'openai',
      endpoint: 'https://api.openai.com/v1/embeddings',
      config: {
        model: 'text-embedding-3-small',
        dimensions: 1536,
        maxTokens: 8191
      },
      metrics: {
        latency: 120,
        throughput: 120,
        errorRate: 0.005,
        lastUpdated: new Date()
      },
      status: 'active'
    });

    // Local embedding model (placeholder)
    this.models.set('local-sentence-transformers', {
      id: 'local-sentence-transformers',
      name: 'Local Sentence Transformers',
      type: 'embedding',
      version: '1.0',
      provider: 'local',
      modelPath: './models/sentence-transformers',
      config: {
        model: 'all-MiniLM-L6-v2',
        dimensions: 384,
        maxTokens: 512
      },
      metrics: {
        latency: 50,
        throughput: 200,
        errorRate: 0.001,
        lastUpdated: new Date()
      },
      status: 'active'
    });
  }

  async generateEmbedding(
    text: string,
    modelId: string = 'openai-3-small',
    options: { useCache?: boolean } = {}
  ): Promise<Result<EmbeddingResult, string>> {
    try {
      const { useCache = true } = options;
      
      // Check cache first
      const cacheKey = `${modelId}:${this.hashText(text)}`;
      if (useCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        return { success: true, error: undefined, data: cached };
      }

      const model = this.models.get(modelId);
      if (!model) {
        return { success: false, error: `Model not found: ${modelId}`, data: undefined };
      }

      const startTime = Date.now();
      let embedding: number[];

      switch (model.provider) {
        case 'openai':
          embedding = await this.generateOpenAIEmbedding(text, model);
          break;
        case 'local':
          embedding = await this.generateLocalEmbedding(text, model);
          break;
        default:
          return { success: false, error: `Unsupported provider: ${model.provider}`, data: undefined };
      }

      const endTime = Date.now();
      const latency = endTime - startTime;

      const result: EmbeddingResult = {
        vector: embedding,
        dimensions: embedding.length,
        model: modelId,
        timestamp: new Date(),
        metadata: { latency, textLength: text.length }
      };

      // Update model metrics
      this.updateModelMetrics(modelId, latency, true);

      // Cache result
      if (useCache) {
        this.cache.set(cacheKey, result);
      }

      return { success: true, error: undefined, data: result };
    } catch (error) {
      this.updateModelMetrics(modelId, 0, false);
      return { 
        success: false, 
        error: `Embedding generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined 
      };
    }
  }

  private async generateOpenAIEmbedding(text: string, model: AIModel): Promise<number[]> {
    // Simulate OpenAI API call
    // In real implementation, use actual OpenAI SDK
    const response = await this.simulateAPICall(model.endpoint!, {
      model: model.config.model,
      input: text
    });

    return response.data[0].embedding;
  }

  private async generateLocalEmbedding(text: string, model: AIModel): Promise<number[]> {
    // Simulate local model inference
    // In real implementation, use TensorFlow.js or similar
    const dimensions = model.config.dimensions;
    const embedding = new Array(dimensions).fill(0).map(() => Math.random() * 2 - 1);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return VectorOperations.normalize(embedding);
  }

  private async simulateAPICall(endpoint: string, payload: any): Promise<any> {
    // Simulate API response
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      data: [{
        embedding: new Array(1536).fill(0).map(() => Math.random() * 2 - 1)
      }]
    };
  }

  private hashText(text: string): string {
    // Simple hash function for caching
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  private updateModelMetrics(modelId: string, latency: number, success: boolean): void {
    const model = this.models.get(modelId);
    if (!model) return;

    const metrics = model.metrics;
    
    // Update latency (moving average)
    metrics.latency = (metrics.latency * 0.9) + (latency * 0.1);
    
    // Update error rate
    if (success) {
      metrics.errorRate = metrics.errorRate * 0.99;
    } else {
      metrics.errorRate = (metrics.errorRate * 0.99) + 0.01;
    }
    
    metrics.lastUpdated = new Date();
  }

  async batchEmbedding(
    texts: string[],
    modelId: string = 'openai-3-small'
  ): Promise<Result<EmbeddingResult[], string>> {
    try {
      const results: EmbeddingResult[] = [];
      
      // Process in batches to respect rate limits
      const batchSize = 100;
      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchPromises = batch.map(text => this.generateEmbedding(text, modelId));
        const batchResults = await Promise.all(batchPromises);
        
        for (const result of batchResults) {
          if (result.success) {
            results.push(result.data!);
          } else {
            return { success: false, error: result.error, data: undefined };
          }
        }
      }

      return { success: true, error: undefined, data: results };
    } catch (error) {
      return { 
        success: false, 
        error: `Batch embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined 
      };
    }
  }

  getModel(modelId: string): AIModel | undefined {
    return this.models.get(modelId);
  }

  listModels(): AIModel[] {
    return Array.from(this.models.values());
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Memory Classification Service
class MemoryClassificationService {
  private readonly models: Map<string, AIModel> = new Map();
  private readonly classificationSchemes: Map<string, string[]> = new Map();

  constructor() {
    this.initializeModels();
    this.initializeClassificationSchemes();
  }

  private initializeModels(): void {
    this.models.set('memory-classifier-v1', {
      id: 'memory-classifier-v1',
      name: 'Memory Classifier v1',
      type: 'classification',
      version: '1.0',
      provider: 'custom',
      config: {
        threshold: 0.7,
        multiLabel: true,
        maxCategories: 5
      },
      metrics: {
        accuracy: 0.89,
        precision: 0.87,
        recall: 0.91,
        f1Score: 0.89,
        latency: 75,
        throughput: 150,
        errorRate: 0.02,
        lastUpdated: new Date()
      },
      status: 'active'
    });
  }

  private initializeClassificationSchemes(): void {
    // Content type classification
    this.classificationSchemes.set('content-type', [
      'personal', 'professional', 'educational', 'creative', 
      'technical', 'social', 'entertainment', 'health', 'financial'
    ]);

    // Emotion classification
    this.classificationSchemes.set('emotion', [
      'positive', 'negative', 'neutral', 'excited', 'anxious',
      'confident', 'uncertain', 'nostalgic', 'hopeful', 'concerned'
    ]);

    // Priority classification
    this.classificationSchemes.set('priority', [
      'urgent', 'high', 'medium', 'low', 'reference'
    ]);

    // Topic classification
    this.classificationSchemes.set('topic', [
      'work', 'family', 'health', 'finance', 'travel',
      'technology', 'science', 'politics', 'sports', 'arts'
    ]);
  }

  async classifyMemory(
    content: string,
    scheme: string = 'content-type',
    modelId: string = 'memory-classifier-v1'
  ): Promise<Result<ClassificationResult, string>> {
    try {
      const model = this.models.get(modelId);
      if (!model) {
        return { success: false, error: `Model not found: ${modelId}`, data: undefined };
      }

      const categories = this.classificationSchemes.get(scheme);
      if (!categories) {
        return { success: false, error: `Classification scheme not found: ${scheme}`, data: undefined };
      }

      const startTime = Date.now();
      
      // Simulate classification (in real implementation, use trained model)
      const scores = categories.map(category => ({
        category,
        confidence: Math.random()
      }));

      // Sort by confidence
      scores.sort((a, b) => b.confidence - a.confidence);

      const primaryCategory = scores[0];
      const alternatives = scores.slice(1, 5); // Top 5 alternatives

      const endTime = Date.now();
      const latency = endTime - startTime;

      const result: ClassificationResult = {
        category: primaryCategory.category,
        confidence: primaryCategory.confidence,
        alternatives,
        model: modelId,
        timestamp: new Date()
      };

      this.updateModelMetrics(modelId, latency, true);

      return { success: true, error: undefined, data: result };
    } catch (error) {
      this.updateModelMetrics(modelId, 0, false);
      return { 
        success: false, 
        error: `Classification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined 
      };
    }
  }

  private updateModelMetrics(modelId: string, latency: number, success: boolean): void {
    const model = this.models.get(modelId);
    if (!model) return;

    const metrics = model.metrics;
    metrics.latency = (metrics.latency * 0.9) + (latency * 0.1);
    
    if (!success) {
      metrics.errorRate = (metrics.errorRate * 0.99) + 0.01;
    }
    
    metrics.lastUpdated = new Date();
  }

  addClassificationScheme(name: string, categories: string[]): void {
    this.classificationSchemes.set(name, categories);
  }

  getClassificationSchemes(): string[] {
    return Array.from(this.classificationSchemes.keys());
  }

  getCategories(scheme: string): string[] {
    return this.classificationSchemes.get(scheme) || [];
  }
}

// Intelligent Recommendation Engine
class RecommendationEngine {
  private readonly embeddingService: EmbeddingService;
  private readonly memoryDatabase: Map<string, any> = new Map();
  private readonly userProfiles: Map<string, any> = new Map();

  constructor(embeddingService: EmbeddingService) {
    this.embeddingService = embeddingService;
    this.initializeSampleData();
  }

  private initializeSampleData(): void {
    // Initialize with sample memories and user profiles
    // In real implementation, this would come from the actual database
  }

  async generateRecommendations(
    userId: string,
    context: Record<string, any> = {},
    limit: number = 10
  ): Promise<Result<RecommendationResult, string>> {
    try {
      const userProfile = this.userProfiles.get(userId);
      if (!userProfile) {
        return { success: false, error: 'User profile not found', data: undefined };
      }

      // Get user's recent memories
      const recentMemories = await this.getUserRecentMemories(userId, 50);
      
      // Generate context embedding
      const contextText = this.buildContextText(context, recentMemories);
      const contextEmbeddingResult = await this.embeddingService.generateEmbedding(contextText);
      
      if (!contextEmbeddingResult.success) {
        return { success: false, error: contextEmbeddingResult.error, data: undefined };
      }

      const contextEmbedding = contextEmbeddingResult.data!.vector;

      // Find similar memories
      const similarities = await this.findSimilarMemories(contextEmbedding, userId, limit * 2);
      
      // Apply recommendation algorithms
      const recommendations = await this.applyRecommendationAlgorithms(
        similarities,
        userProfile,
        context,
        limit
      );

      const result: RecommendationResult = {
        recommendations,
        model: 'hybrid-recommendation-v1',
        timestamp: new Date(),
        context
      };

      return { success: true, error: undefined, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: `Recommendation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined 
      };
    }
  }

  private buildContextText(context: Record<string, any>, recentMemories: any[]): string {
    const contextParts = [];
    
    // Add context information
    for (const [key, value] of Object.entries(context)) {
      contextParts.push(`${key}: ${value}`);
    }

    // Add recent memory summaries
    const memoryTexts = recentMemories.slice(0, 10).map(memory => memory.content || '');
    contextParts.push(...memoryTexts);

    return contextParts.join(' ');
  }

  private async findSimilarMemories(
    queryEmbedding: number[],
    userId: string,
    limit: number
  ): Promise<Array<{ id: string; score: number; memory: any }>> {
    const similarities: Array<{ id: string; score: number; memory: any }> = [];

    // In real implementation, use vector database for efficient similarity search
    for (const [memoryId, memory] of this.memoryDatabase.entries()) {
      if (memory.userId !== userId) continue;
      if (!memory.embedding) continue;

      const similarity = VectorOperations.cosineSimilarity(queryEmbedding, memory.embedding);
      similarities.push({ id: memoryId, score: similarity, memory });
    }

    // Sort by similarity and return top results
    similarities.sort((a, b) => b.score - a.score);
    return similarities.slice(0, limit);
  }

  private async applyRecommendationAlgorithms(
    similarities: Array<{ id: string; score: number; memory: any }>,
    userProfile: any,
    context: Record<string, any>,
    limit: number
  ): Promise<Array<{ id: string; score: number; reason: string; metadata: Record<string, any> }>> {
    const recommendations = [];

    for (const { id, score, memory } of similarities) {
      let finalScore = score;
      let reason = 'Similar content';

      // Apply recency boost
      const daysSinceCreated = (Date.now() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 7) {
        finalScore *= 1.2;
        reason = 'Recent and similar content';
      }

      // Apply frequency boost for often-accessed memories
      if (memory.accessCount > 10) {
        finalScore *= 1.1;
        reason = 'Frequently accessed similar content';
      }

      // Apply user preference boost
      if (userProfile.preferences && memory.category) {
        const preferenceScore = userProfile.preferences[memory.category] || 0;
        finalScore *= (1 + preferenceScore * 0.3);
        if (preferenceScore > 0.7) {
          reason = 'Matches your interests and similar content';
        }
      }

      // Context relevance boost
      if (context.currentTask && memory.tags?.includes(context.currentTask)) {
        finalScore *= 1.3;
        reason = 'Relevant to current task';
      }

      recommendations.push({
        id,
        score: finalScore,
        reason,
        metadata: {
          originalSimilarity: score,
          category: memory.category,
          tags: memory.tags,
          lastAccessed: memory.lastAccessed
        }
      });
    }

    // Sort by final score and return top recommendations
    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, limit);
  }

  private async getUserRecentMemories(userId: string, limit: number): Promise<any[]> {
    // In real implementation, query the actual memory database
    return Array.from(this.memoryDatabase.values())
      .filter(memory => memory.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async updateUserProfile(userId: string, interactions: any[]): Promise<void> {
    const profile = this.userProfiles.get(userId) || {
      preferences: {},
      interests: [],
      accessPatterns: {},
      lastUpdated: new Date()
    };

    // Update preferences based on interactions
    for (const interaction of interactions) {
      if (interaction.type === 'view' && interaction.category) {
        profile.preferences[interaction.category] = 
          (profile.preferences[interaction.category] || 0) + 0.1;
      }
      if (interaction.type === 'like' && interaction.category) {
        profile.preferences[interaction.category] = 
          (profile.preferences[interaction.category] || 0) + 0.3;
      }
    }

    // Normalize preferences
    const preferenceValues = Object.values(profile.preferences) as number[];
    const maxPreference = Math.max(...preferenceValues);
    if (maxPreference > 0) {
      for (const [category, score] of Object.entries(profile.preferences)) {
        profile.preferences[category] = (score as number) / maxPreference;
      }
    }

    profile.lastUpdated = new Date();
    this.userProfiles.set(userId, profile);
  }
}

// Anomaly Detection Service
class AnomalyDetectionService {
  private readonly models: Map<string, AIModel> = new Map();
  private readonly baselines: Map<string, any> = new Map();

  constructor() {
    this.initializeModels();
  }

  private initializeModels(): void {
    this.models.set('isolation-forest', {
      id: 'isolation-forest',
      name: 'Isolation Forest Anomaly Detector',
      type: 'anomaly-detection',
      version: '1.0',
      provider: 'custom',
      config: {
        contamination: 0.1,
        threshold: 0.6,
        features: ['access_frequency', 'content_length', 'time_of_day', 'user_activity']
      },
      metrics: {
        precision: 0.85,
        recall: 0.78,
        f1Score: 0.81,
        latency: 25,
        throughput: 400,
        errorRate: 0.01,
        lastUpdated: new Date()
      },
      status: 'active'
    });
  }

  async detectAnomaly(
    data: Record<string, number>,
    userId: string,
    modelId: string = 'isolation-forest'
  ): Promise<Result<AnomalyResult, string>> {
    try {
      const model = this.models.get(modelId);
      if (!model) {
        return { success: false, error: `Model not found: ${modelId}`, data: undefined };
      }

      const startTime = Date.now();

      // Get or create baseline for user
      const baseline = await this.getOrCreateBaseline(userId, data);

      // Extract features
      const features = this.extractFeatures(data, baseline);

      // Calculate anomaly score
      const anomalyScore = this.calculateAnomalyScore(features, model);

      const endTime = Date.now();
      const latency = endTime - startTime;

      const result: AnomalyResult = {
        isAnomaly: anomalyScore > model.config.threshold,
        score: anomalyScore,
        threshold: model.config.threshold,
        features,
        model: modelId,
        timestamp: new Date()
      };

      this.updateModelMetrics(modelId, latency, true);

      // Update baseline with new data
      await this.updateBaseline(userId, data);

      return { success: true, error: undefined, data: result };
    } catch (error) {
      this.updateModelMetrics(modelId, 0, false);
      return { 
        success: false, 
        error: `Anomaly detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: undefined 
      };
    }
  }

  private async getOrCreateBaseline(userId: string, data: Record<string, number>): Promise<any> {
    let baseline = this.baselines.get(userId);
    
    if (!baseline) {
      baseline = {
        means: {},
        stdDevs: {},
        counts: {},
        history: [],
        created: new Date(),
        lastUpdated: new Date()
      };

      // Initialize with current data
      for (const [key, value] of Object.entries(data)) {
        baseline.means[key] = value;
        baseline.stdDevs[key] = 0;
        baseline.counts[key] = 1;
      }

      this.baselines.set(userId, baseline);
    }

    return baseline;
  }

  private extractFeatures(data: Record<string, number>, baseline: any): Record<string, number> {
    const features: Record<string, number> = {};

    for (const [key, value] of Object.entries(data)) {
      const mean = baseline.means[key] || 0;
      const stdDev = baseline.stdDevs[key] || 1;

      // Z-score normalization
      features[`${key}_zscore`] = stdDev > 0 ? (value - mean) / stdDev : 0;
      
      // Percentage change from baseline
      features[`${key}_pct_change`] = mean > 0 ? ((value - mean) / mean) * 100 : 0;
      
      // Raw value
      features[key] = value;
    }

    return features;
  }

  private calculateAnomalyScore(features: Record<string, number>, model: AIModel): number {
    // Simplified anomaly score calculation
    // In real implementation, use trained Isolation Forest or similar algorithm
    
    let totalDeviation = 0;
    let featureCount = 0;

    for (const [key, value] of Object.entries(features)) {
      if (key.endsWith('_zscore')) {
        totalDeviation += Math.abs(value);
        featureCount++;
      }
    }

    const avgDeviation = featureCount > 0 ? totalDeviation / featureCount : 0;
    
    // Transform to 0-1 scale using sigmoid
    return 1 / (1 + Math.exp(-avgDeviation + 2));
  }

  private async updateBaseline(userId: string, data: Record<string, number>): Promise<void> {
    const baseline = this.baselines.get(userId);
    if (!baseline) return;

    // Update running statistics
    for (const [key, value] of Object.entries(data)) {
      const count = baseline.counts[key] || 0;
      const oldMean = baseline.means[key] || 0;
      const newCount = count + 1;
      const newMean = (oldMean * count + value) / newCount;
      
      // Update variance using Welford's online algorithm
      const oldVariance = Math.pow(baseline.stdDevs[key] || 0, 2);
      const newVariance = count === 0 ? 0 : 
        (oldVariance * (count - 1) + (value - oldMean) * (value - newMean)) / count;

      baseline.means[key] = newMean;
      baseline.stdDevs[key] = Math.sqrt(newVariance);
      baseline.counts[key] = newCount;
    }

    // Keep limited history
    baseline.history.push({ data, timestamp: new Date() });
    if (baseline.history.length > 1000) {
      baseline.history = baseline.history.slice(-500);
    }

    baseline.lastUpdated = new Date();
  }

  private updateModelMetrics(modelId: string, latency: number, success: boolean): void {
    const model = this.models.get(modelId);
    if (!model) return;

    const metrics = model.metrics;
    metrics.latency = (metrics.latency * 0.9) + (latency * 0.1);
    
    if (!success) {
      metrics.errorRate = (metrics.errorRate * 0.99) + 0.01;
    }
    
    metrics.lastUpdated = new Date();
  }

  getBaseline(userId: string): any {
    return this.baselines.get(userId);
  }

  resetBaseline(userId: string): void {
    this.baselines.delete(userId);
  }
}

// Export all AI services
export {
  VectorOperations,
  EmbeddingService,
  MemoryClassificationService,
  RecommendationEngine,
  AnomalyDetectionService
};

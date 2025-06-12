/**
 * @fileoverview Temporal memory management for time-based operations
 */

import type { MemoryMetadata, MemoryType } from '../types/index.js';

/**
 * Time-based memory decay factors
 */
export interface DecayParameters {
  /** Importance multiplier (0-1) */
  importance: number;
  /** Access frequency multiplier (0-1) */
  frequency: number;
  /** Emotional weight multiplier (0-1) */
  emotional: number;
  /** Base decay rate per day */
  baseDecayRate: number;
}

/**
 * Default decay parameters for different memory types
 */
export const DEFAULT_DECAY_PARAMETERS: Record<MemoryType, DecayParameters> = {
  personality: {
    importance: 0.9,
    frequency: 0.8,
    emotional: 0.95,
    baseDecayRate: 0.001 // Very slow decay
  },
  procedure: {
    importance: 0.8,
    frequency: 0.9,
    emotional: 0.5,
    baseDecayRate: 0.005 // Slow decay
  },
  preference: {
    importance: 0.7,
    frequency: 0.6,
    emotional: 0.8,
    baseDecayRate: 0.01 // Medium decay
  },  fact: {
    importance: 0.6,
    frequency: 0.7,
    emotional: 0.3,
    baseDecayRate: 0.02 // Faster decay
  },
  thread: {
    importance: 0.5,
    frequency: 0.5,
    emotional: 0.4,
    baseDecayRate: 0.05 // Fastest decay
  },
  task: {
    importance: 0.8,
    frequency: 0.7,
    emotional: 0.6,
    baseDecayRate: 0.03 // Medium-fast decay
  },
  emotion: {
    importance: 0.7,
    frequency: 0.6,
    emotional: 0.95,
    baseDecayRate: 0.015 // Medium-slow decay
  }
};

/**
 * Temporal memory engine for managing time-based memory operations
 */
export class TemporalEngine {
  private decayParameters: Record<MemoryType, DecayParameters>;
  
  constructor(customDecayParameters?: Partial<Record<MemoryType, Partial<DecayParameters>>>) {
    this.decayParameters = { ...DEFAULT_DECAY_PARAMETERS };
    
    // Apply custom parameters if provided
    if (customDecayParameters) {
      for (const [type, params] of Object.entries(customDecayParameters)) {
        if (params) {
          this.decayParameters[type as MemoryType] = {
            ...this.decayParameters[type as MemoryType],
            ...params
          };
        }
      }
    }
  }
  
  /**
   * Calculate time-adjusted confidence for a memory
   */
  calculateTimeDecay(memory: MemoryMetadata, currentTime: Date = new Date()): number {
    const ageInDays = (currentTime.getTime() - memory.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const daysSinceAccess = (currentTime.getTime() - memory.lastAccessedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    const params = this.decayParameters[memory.type];
    
    // Calculate decay factors
    const importanceFactor = Math.pow(memory.importance, 1 - params.importance);
    const frequencyFactor = Math.pow(memory.accessCount + 1, params.frequency);
    const emotionalFactor = memory.emotional_weight ? 
      1 + (Math.abs(memory.emotional_weight) * params.emotional) : 1;
    
    // Base decay over time
    const ageDecay = Math.exp(-params.baseDecayRate * ageInDays);
    
    // Additional decay based on lack of access
    const accessDecay = Math.exp(-params.baseDecayRate * daysSinceAccess * 0.5);
    
    // Combine all factors
    const timeAdjustedConfidence = memory.confidence * 
      ageDecay * 
      accessDecay * 
      importanceFactor * 
      Math.log(frequencyFactor + 1) * 
      emotionalFactor;
    
    return Math.max(0, Math.min(1, timeAdjustedConfidence));
  }
  
  /**
   * Determine if a memory should be archived based on its decay
   */
  shouldArchive(memory: MemoryMetadata, archiveThreshold: number = 0.1, currentTime: Date = new Date()): boolean {
    const decayedConfidence = this.calculateTimeDecay(memory, currentTime);
    return decayedConfidence < archiveThreshold;
  }
  
  /**
   * Determine if a memory should be forgotten based on TTL and decay
   */
  shouldForget(memory: MemoryMetadata, forgetThreshold: number = 0.05, currentTime: Date = new Date()): boolean {
    // Check TTL first
    if (memory.ttl && currentTime > memory.ttl) {
      return true;
    }
    
    // Check decay threshold
    const decayedConfidence = this.calculateTimeDecay(memory, currentTime);
    return decayedConfidence < forgetThreshold;
  }
  
  /**
   * Calculate relevance score considering temporal factors
   */
  calculateTemporalRelevance(
    memory: MemoryMetadata, 
    baseRelevance: number, 
    currentTime: Date = new Date()
  ): number {
    const timeDecay = this.calculateTimeDecay(memory, currentTime);
    
    // Recent memories get a boost
    const ageInHours = (currentTime.getTime() - memory.createdAt.getTime()) / (1000 * 60 * 60);
    const recencyBoost = ageInHours < 24 ? 1.2 : 1.0;
    
    // Recently accessed memories get a boost
    const accessAgeInHours = (currentTime.getTime() - memory.lastAccessedAt.getTime()) / (1000 * 60 * 60);
    const accessBoost = accessAgeInHours < 1 ? 1.1 : 1.0;
    
    return baseRelevance * timeDecay * recencyBoost * accessBoost;
  }
  
  /**
   * Update memory access statistics
   */
  updateAccess(memory: MemoryMetadata, currentTime: Date = new Date()): MemoryMetadata {
    return {
      ...memory,
      lastAccessedAt: currentTime,
      accessCount: memory.accessCount + 1,
      updatedAt: currentTime
    };
  }
  
  /**
   * Get memories that need maintenance (archiving/forgetting)
   */
  getMemoriesForMaintenance(
    memories: MemoryMetadata[],
    archiveThreshold: number = 0.1,
    forgetThreshold: number = 0.05,
    currentTime: Date = new Date()
  ): {
    toArchive: MemoryMetadata[];
    toForget: MemoryMetadata[];
  } {
    const toArchive: MemoryMetadata[] = [];
    const toForget: MemoryMetadata[] = [];
    
    for (const memory of memories) {
      if (this.shouldForget(memory, forgetThreshold, currentTime)) {
        toForget.push(memory);
      } else if (this.shouldArchive(memory, archiveThreshold, currentTime)) {
        toArchive.push(memory);
      }
    }
    
    return { toArchive, toForget };
  }
  
  /**
   * Set custom decay parameters for a memory type
   */
  setDecayParameters(type: MemoryType, parameters: Partial<DecayParameters>): void {
    this.decayParameters[type] = {
      ...this.decayParameters[type],
      ...parameters
    };
  }
  
  /**
   * Get current decay parameters for a memory type
   */
  getDecayParameters(type: MemoryType): DecayParameters {
    return { ...this.decayParameters[type] };
  }
  
  /**
   * Reset decay parameters to defaults
   */
  resetDecayParameters(): void {
    this.decayParameters = { ...DEFAULT_DECAY_PARAMETERS };
  }
}

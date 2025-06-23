import { describe, it, expect, beforeEach } from "vitest";

import {
  TemporalEngine,
  DEFAULT_DECAY_PARAMETERS,
} from "../../src/temporal/TemporalEngine.js";
import type { MemoryMetadata, MemoryType } from "../../src/types/index.js";

describe("TemporalEngine", () => {
  let engine: TemporalEngine;
  let baseMemory: MemoryMetadata;
  let currentTime: Date;

  beforeEach(() => {
    engine = new TemporalEngine();
    currentTime = new Date("2024-01-15T12:00:00Z");
    baseMemory = {
      id: "test-memory",
      agent_id: "test-agent",
      tenant_id: "test-tenant",
      content: "Test memory content",
      embedding: [0.1, 0.2, 0.3],
      type: "fact" as MemoryType,
      confidence: 0.8,
      importance: 0.7,
      createdAt: new Date("2024-01-10T12:00:00Z"), // 5 days ago
      updatedAt: new Date("2024-01-10T12:00:00Z"),
      lastAccessedAt: new Date("2024-01-12T12:00:00Z"), // 3 days ago
      accessCount: 5,
      tags: [],
    };
  });

  describe("constructor", () => {
    it("should initialize with default decay parameters", () => {
      const defaultEngine = new TemporalEngine();

      expect(defaultEngine.getDecayParameters("fact")).toEqual(
        DEFAULT_DECAY_PARAMETERS.fact,
      );
      expect(defaultEngine.getDecayParameters("personality")).toEqual(
        DEFAULT_DECAY_PARAMETERS.personality,
      );
      expect(defaultEngine.getDecayParameters("procedure")).toEqual(
        DEFAULT_DECAY_PARAMETERS.procedure,
      );
    });

    it("should apply custom decay parameters", () => {
      const customParams = {
        fact: {
          importance: 0.9,
          baseDecayRate: 0.01,
        },
        personality: {
          emotional: 0.8,
        },
      };

      const customEngine = new TemporalEngine(customParams);

      const factParams = customEngine.getDecayParameters("fact");
      expect(factParams.importance).toBe(0.9);
      expect(factParams.baseDecayRate).toBe(0.01);
      expect(factParams.frequency).toBe(
        DEFAULT_DECAY_PARAMETERS.fact.frequency,
      ); // Should keep default

      const personalityParams = customEngine.getDecayParameters("personality");
      expect(personalityParams.emotional).toBe(0.8);
      expect(personalityParams.importance).toBe(
        DEFAULT_DECAY_PARAMETERS.personality.importance,
      ); // Should keep default
    });

    it("should handle partial custom parameters", () => {
      const customParams = {
        thread: {
          importance: 0.6,
        },
      };

      const customEngine = new TemporalEngine(customParams);
      const threadParams = customEngine.getDecayParameters("thread");

      expect(threadParams.importance).toBe(0.6);
      expect(threadParams.frequency).toBe(
        DEFAULT_DECAY_PARAMETERS.thread.frequency,
      );
      expect(threadParams.emotional).toBe(
        DEFAULT_DECAY_PARAMETERS.thread.emotional,
      );
      expect(threadParams.baseDecayRate).toBe(
        DEFAULT_DECAY_PARAMETERS.thread.baseDecayRate,
      );
    });

    it("should handle empty custom parameters", () => {
      const customEngine = new TemporalEngine({});

      expect(customEngine.getDecayParameters("fact")).toEqual(
        DEFAULT_DECAY_PARAMETERS.fact,
      );
    });
  });

  describe("calculateTimeDecay", () => {
    it("should calculate decay for a basic memory", () => {
      const decay = engine.calculateTimeDecay(baseMemory, currentTime);

      expect(decay).toBeGreaterThan(0);
      expect(decay).toBeLessThanOrEqual(1);
      // Memory from 5 days ago should have some form of time-based adjustment
      expect(typeof decay).toBe("number");
    });

    it("should use current time as default", () => {
      const decay1 = engine.calculateTimeDecay(baseMemory);
      const decay2 = engine.calculateTimeDecay(baseMemory, new Date());

      // Should be very close (within a small time difference)
      expect(Math.abs(decay1 - decay2)).toBeLessThan(0.001);
    });

    it("should handle different memory types with different decay rates", () => {
      const personalityMemory = {
        ...baseMemory,
        type: "personality" as MemoryType,
      };
      const threadMemory = { ...baseMemory, type: "thread" as MemoryType };

      const personalityDecay = engine.calculateTimeDecay(
        personalityMemory,
        currentTime,
      );
      const threadDecay = engine.calculateTimeDecay(threadMemory, currentTime);

      // Personality should decay slower than thread
      expect(personalityDecay).toBeGreaterThan(threadDecay);
    });

    it("should handle emotional weight in decay calculation", () => {
      const emotionalMemory = { ...baseMemory, emotional_weight: 0.8 };
      const nonEmotionalMemory = { ...baseMemory };

      const emotionalDecay = engine.calculateTimeDecay(
        emotionalMemory,
        currentTime,
      );
      const normalDecay = engine.calculateTimeDecay(
        nonEmotionalMemory,
        currentTime,
      );

      // Emotional memories should decay slower
      expect(emotionalDecay).toBeGreaterThan(normalDecay);
    });

    it("should handle negative emotional weight", () => {
      const negativeEmotionalMemory = { ...baseMemory, emotional_weight: -0.5 };

      const decay = engine.calculateTimeDecay(
        negativeEmotionalMemory,
        currentTime,
      );

      expect(decay).toBeGreaterThan(0);
      expect(decay).toBeLessThanOrEqual(1);
    });

    it("should handle high importance memories", () => {
      const highImportanceMemory = { ...baseMemory, importance: 0.95 };
      const lowImportanceMemory = { ...baseMemory, importance: 0.1 };

      const highDecay = engine.calculateTimeDecay(
        highImportanceMemory,
        currentTime,
      );
      const lowDecay = engine.calculateTimeDecay(
        lowImportanceMemory,
        currentTime,
      );

      // Higher importance should decay slower
      expect(highDecay).toBeGreaterThan(lowDecay);
    });

    it("should handle frequently accessed memories", () => {
      const frequentMemory = { ...baseMemory, accessCount: 50 };
      const rareMemory = { ...baseMemory, accessCount: 1 };

      const frequentDecay = engine.calculateTimeDecay(
        frequentMemory,
        currentTime,
      );
      const rareDecay = engine.calculateTimeDecay(rareMemory, currentTime);

      // Frequently accessed memories should decay slower
      expect(frequentDecay).toBeGreaterThan(rareDecay);
    });
    it("should handle recently created memories", () => {
      const recentMemory = {
        ...baseMemory,
        createdAt: new Date(currentTime.getTime() - 1000 * 60 * 60), // 1 hour ago
        lastAccessedAt: new Date(currentTime.getTime() - 1000 * 60 * 30), // 30 minutes ago
      };

      const decay = engine.calculateTimeDecay(recentMemory, currentTime);

      // Recent memories should have good retention - likely boosted above original confidence
      expect(decay).toBeGreaterThan(0.5);
      expect(decay).toBeLessThanOrEqual(1);
    });

    it("should handle very old memories", () => {
      const oldMemory = {
        ...baseMemory,
        createdAt: new Date(currentTime.getTime() - 1000 * 60 * 60 * 24 * 365), // 1 year ago
        lastAccessedAt: new Date(
          currentTime.getTime() - 1000 * 60 * 60 * 24 * 365,
        ), // 1 year ago
      };

      const decay = engine.calculateTimeDecay(oldMemory, currentTime);

      // Old memories should have significant decay
      expect(decay).toBeLessThan(0.1);
    });

    it("should ensure decay is between 0 and 1", () => {
      const extremeMemory = {
        ...baseMemory,
        confidence: 2.0, // Invalid high confidence
        importance: 1.5, // Invalid high importance
        createdAt: new Date(currentTime.getTime() - 1000 * 60 * 60 * 24 * 1000), // Very old
        lastAccessedAt: new Date(
          currentTime.getTime() - 1000 * 60 * 60 * 24 * 1000,
        ),
      };

      const decay = engine.calculateTimeDecay(extremeMemory, currentTime);

      expect(decay).toBeGreaterThanOrEqual(0);
      expect(decay).toBeLessThanOrEqual(1);
    });
  });

  describe("shouldArchive", () => {
    it("should return true for memories below archive threshold", () => {
      const weakMemory = { ...baseMemory, confidence: 0.05 };
      const shouldArchive = engine.shouldArchive(weakMemory, 0.1, currentTime);

      expect(shouldArchive).toBe(true);
    });

    it("should return false for memories above archive threshold", () => {
      const strongMemory = { ...baseMemory, confidence: 0.9, importance: 0.9 };
      const shouldArchive = engine.shouldArchive(
        strongMemory,
        0.1,
        currentTime,
      );

      expect(shouldArchive).toBe(false);
    });

    it("should use default threshold when not provided", () => {
      const weakMemory = { ...baseMemory, confidence: 0.05 };
      const shouldArchive = engine.shouldArchive(weakMemory);

      expect(typeof shouldArchive).toBe("boolean");
    });

    it("should use current time as default", () => {
      const shouldArchive = engine.shouldArchive(baseMemory);

      expect(typeof shouldArchive).toBe("boolean");
    });
  });

  describe("shouldForget", () => {
    it("should return true for memories past TTL", () => {
      const expiredMemory = {
        ...baseMemory,
        ttl: new Date(currentTime.getTime() - 1000 * 60 * 60), // 1 hour ago
      };

      const shouldForget = engine.shouldForget(
        expiredMemory,
        0.05,
        currentTime,
      );

      expect(shouldForget).toBe(true);
    });

    it("should return false for memories with future TTL", () => {
      const validMemory = {
        ...baseMemory,
        ttl: new Date(currentTime.getTime() + 1000 * 60 * 60), // 1 hour in future
      };

      const shouldForget = engine.shouldForget(validMemory, 0.05, currentTime);

      expect(shouldForget).toBe(false);
    });

    it("should return true for memories below forget threshold", () => {
      const weakMemory = { ...baseMemory, confidence: 0.01 };
      const shouldForget = engine.shouldForget(weakMemory, 0.05, currentTime);

      expect(shouldForget).toBe(true);
    });

    it("should return false for memories above forget threshold", () => {
      const strongMemory = { ...baseMemory, confidence: 0.9, importance: 0.9 };
      const shouldForget = engine.shouldForget(strongMemory, 0.05, currentTime);

      expect(shouldForget).toBe(false);
    });

    it("should handle memories without TTL", () => {
      const noTtlMemory = { ...baseMemory };
      delete noTtlMemory.ttl;

      const shouldForget = engine.shouldForget(noTtlMemory, 0.05, currentTime);

      expect(typeof shouldForget).toBe("boolean");
    });

    it("should use default parameters when not provided", () => {
      const shouldForget = engine.shouldForget(baseMemory);

      expect(typeof shouldForget).toBe("boolean");
    });
  });

  describe("calculateTemporalRelevance", () => {
    it("should calculate relevance with temporal factors", () => {
      const baseRelevance = 0.8;
      const relevance = engine.calculateTemporalRelevance(
        baseMemory,
        baseRelevance,
        currentTime,
      );

      expect(relevance).toBeGreaterThan(0);
      expect(relevance).toBeLessThanOrEqual(1);
    });

    it("should boost recent memories (created < 24 hours ago)", () => {
      const recentMemory = {
        ...baseMemory,
        createdAt: new Date(currentTime.getTime() - 1000 * 60 * 60 * 12), // 12 hours ago
      };

      const baseRelevance = 0.5;
      const relevance = engine.calculateTemporalRelevance(
        recentMemory,
        baseRelevance,
        currentTime,
      );
      const normalRelevance = engine.calculateTemporalRelevance(
        baseMemory,
        baseRelevance,
        currentTime,
      );

      expect(relevance).toBeGreaterThan(normalRelevance);
    });

    it("should boost recently accessed memories (< 1 hour ago)", () => {
      const recentlyAccessedMemory = {
        ...baseMemory,
        lastAccessedAt: new Date(currentTime.getTime() - 1000 * 60 * 30), // 30 minutes ago
      };

      const baseRelevance = 0.5;
      const relevance = engine.calculateTemporalRelevance(
        recentlyAccessedMemory,
        baseRelevance,
        currentTime,
      );
      const normalRelevance = engine.calculateTemporalRelevance(
        baseMemory,
        baseRelevance,
        currentTime,
      );

      expect(relevance).toBeGreaterThan(normalRelevance);
    });

    it("should handle high base relevance", () => {
      const baseRelevance = 0.95;
      const relevance = engine.calculateTemporalRelevance(
        baseMemory,
        baseRelevance,
        currentTime,
      );

      expect(relevance).toBeGreaterThan(0);
      expect(relevance).toBeLessThanOrEqual(1);
    });

    it("should use current time as default", () => {
      const baseRelevance = 0.6;
      const relevance = engine.calculateTemporalRelevance(
        baseMemory,
        baseRelevance,
      );

      expect(relevance).toBeGreaterThan(0);
    });
  });

  describe("updateAccess", () => {
    it("should update access statistics", () => {
      const updatedMemory = engine.updateAccess(baseMemory, currentTime);

      expect(updatedMemory.lastAccessedAt).toEqual(currentTime);
      expect(updatedMemory.accessCount).toBe(baseMemory.accessCount + 1);
      expect(updatedMemory.updatedAt).toEqual(currentTime);
      expect(updatedMemory.id).toBe(baseMemory.id); // Should preserve other fields
    });

    it("should increment access count", () => {
      const initialCount = 10;
      const memoryWithCount = { ...baseMemory, accessCount: initialCount };
      const updatedMemory = engine.updateAccess(memoryWithCount, currentTime);

      expect(updatedMemory.accessCount).toBe(initialCount + 1);
    });

    it("should use current time as default", () => {
      const updatedMemory = engine.updateAccess(baseMemory);

      expect(updatedMemory.lastAccessedAt).toBeInstanceOf(Date);
      expect(updatedMemory.updatedAt).toBeInstanceOf(Date);
      expect(updatedMemory.accessCount).toBe(baseMemory.accessCount + 1);
    });

    it("should preserve original memory properties", () => {
      const updatedMemory = engine.updateAccess(baseMemory, currentTime);

      expect(updatedMemory.id).toBe(baseMemory.id);
      expect(updatedMemory.content).toBe(baseMemory.content);
      expect(updatedMemory.type).toBe(baseMemory.type);
      expect(updatedMemory.confidence).toBe(baseMemory.confidence);
      expect(updatedMemory.importance).toBe(baseMemory.importance);
    });
  });

  describe("getMemoriesForMaintenance", () => {
    let memories: MemoryMetadata[];

    beforeEach(() => {
      memories = [
        {
          ...baseMemory,
          id: "strong-memory",
          confidence: 0.9,
          importance: 0.9,
        },
        { ...baseMemory, id: "weak-memory", confidence: 0.05 },
        {
          ...baseMemory,
          id: "expired-memory",
          ttl: new Date(currentTime.getTime() - 1000),
        },
        { ...baseMemory, id: "medium-memory", confidence: 0.08 },
      ];
    });
    it("should categorize memories for maintenance", () => {
      const result = engine.getMemoriesForMaintenance(
        memories,
        0.1,
        0.05,
        currentTime,
      );

      // Check the structure is correct
      expect(Array.isArray(result.toArchive)).toBe(true);
      expect(Array.isArray(result.toForget)).toBe(true);

      // Check that expired memory is in forget list
      expect(result.toForget.some((m) => m.id === "expired-memory")).toBe(true);

      // Check that strong memory is not in either list
      expect(result.toArchive.some((m) => m.id === "strong-memory")).toBe(
        false,
      );
      expect(result.toForget.some((m) => m.id === "strong-memory")).toBe(false);

      // Total should match original memories count
      expect(
        result.toArchive.length + result.toForget.length,
      ).toBeLessThanOrEqual(memories.length);
    });

    it("should handle empty memory list", () => {
      const result = engine.getMemoriesForMaintenance(
        [],
        0.1,
        0.05,
        currentTime,
      );

      expect(result.toArchive).toHaveLength(0);
      expect(result.toForget).toHaveLength(0);
    });

    it("should use default thresholds when not provided", () => {
      const result = engine.getMemoriesForMaintenance(memories);

      expect(Array.isArray(result.toArchive)).toBe(true);
      expect(Array.isArray(result.toForget)).toBe(true);
    });

    it("should prioritize forgetting over archiving", () => {
      const veryWeakMemory = {
        ...baseMemory,
        id: "very-weak",
        confidence: 0.01,
      };
      const memoriesWithVeryWeak = [...memories, veryWeakMemory];

      const result = engine.getMemoriesForMaintenance(
        memoriesWithVeryWeak,
        0.1,
        0.05,
        currentTime,
      );

      // Should be in forget list, not archive list
      expect(result.toForget.some((m) => m.id === "very-weak")).toBe(true);
      expect(result.toArchive.some((m) => m.id === "very-weak")).toBe(false);
    });

    it("should use current time as default", () => {
      const result = engine.getMemoriesForMaintenance(memories, 0.1, 0.05);

      expect(Array.isArray(result.toArchive)).toBe(true);
      expect(Array.isArray(result.toForget)).toBe(true);
    });
  });

  describe("setDecayParameters", () => {
    it("should update decay parameters for a memory type", () => {
      const newParams = {
        importance: 0.95,
        baseDecayRate: 0.001,
      };

      engine.setDecayParameters("fact", newParams);
      const updatedParams = engine.getDecayParameters("fact");

      expect(updatedParams.importance).toBe(0.95);
      expect(updatedParams.baseDecayRate).toBe(0.001);
      expect(updatedParams.frequency).toBe(
        DEFAULT_DECAY_PARAMETERS.fact.frequency,
      ); // Should preserve
    });

    it("should handle partial parameter updates", () => {
      const originalParams = engine.getDecayParameters("personality");

      engine.setDecayParameters("personality", { emotional: 0.5 });
      const updatedParams = engine.getDecayParameters("personality");

      expect(updatedParams.emotional).toBe(0.5);
      expect(updatedParams.importance).toBe(originalParams.importance);
      expect(updatedParams.frequency).toBe(originalParams.frequency);
      expect(updatedParams.baseDecayRate).toBe(originalParams.baseDecayRate);
    });

    it("should update all memory types independently", () => {
      engine.setDecayParameters("fact", { importance: 0.8 });
      engine.setDecayParameters("thread", { importance: 0.9 });

      expect(engine.getDecayParameters("fact").importance).toBe(0.8);
      expect(engine.getDecayParameters("thread").importance).toBe(0.9);
      expect(engine.getDecayParameters("personality").importance).toBe(
        DEFAULT_DECAY_PARAMETERS.personality.importance,
      );
    });
  });

  describe("getDecayParameters", () => {
    it("should return decay parameters for a memory type", () => {
      const params = engine.getDecayParameters("procedure");

      expect(params).toEqual(DEFAULT_DECAY_PARAMETERS.procedure);
    });

    it("should return a copy, not reference", () => {
      const params1 = engine.getDecayParameters("fact");
      const params2 = engine.getDecayParameters("fact");

      expect(params1).toEqual(params2);
      expect(params1).not.toBe(params2); // Different objects

      // Modifying returned params should not affect engine
      params1.importance = 0.999;
      const params3 = engine.getDecayParameters("fact");
      expect(params3.importance).not.toBe(0.999);
    });

    it("should handle all memory types", () => {
      const types: MemoryType[] = [
        "personality",
        "procedure",
        "preference",
        "fact",
        "thread",
        "task",
        "emotion",
      ];

      for (const type of types) {
        const params = engine.getDecayParameters(type);
        expect(params).toBeDefined();
        expect(typeof params.importance).toBe("number");
        expect(typeof params.frequency).toBe("number");
        expect(typeof params.emotional).toBe("number");
        expect(typeof params.baseDecayRate).toBe("number");
      }
    });
  });

  describe("resetDecayParameters", () => {
    it("should reset all decay parameters to defaults", () => {
      // Modify some parameters
      engine.setDecayParameters("fact", { importance: 0.999 });
      engine.setDecayParameters("personality", { emotional: 0.1 });

      // Reset
      engine.resetDecayParameters();

      // Check they're back to defaults
      expect(engine.getDecayParameters("fact")).toEqual(
        DEFAULT_DECAY_PARAMETERS.fact,
      );
      expect(engine.getDecayParameters("personality")).toEqual(
        DEFAULT_DECAY_PARAMETERS.personality,
      );
    });

    it("should not affect default constants", () => {
      // Modify engine parameters
      engine.setDecayParameters("thread", { baseDecayRate: 0.999 });
      engine.resetDecayParameters();

      // Check defaults are unchanged
      expect(DEFAULT_DECAY_PARAMETERS.thread.baseDecayRate).toBe(0.05);
    });

    it("should reset all memory types", () => {
      const types: MemoryType[] = [
        "personality",
        "procedure",
        "preference",
        "fact",
        "thread",
        "task",
        "emotion",
      ];

      // Modify all types
      for (const type of types) {
        engine.setDecayParameters(type, { importance: 0.999 });
      }

      // Reset
      engine.resetDecayParameters();

      // Check all are back to defaults
      for (const type of types) {
        expect(engine.getDecayParameters(type)).toEqual(
          DEFAULT_DECAY_PARAMETERS[type],
        );
      }
    });
  });

  describe("DEFAULT_DECAY_PARAMETERS", () => {
    it("should have parameters for all memory types", () => {
      const types: MemoryType[] = [
        "personality",
        "procedure",
        "preference",
        "fact",
        "thread",
        "task",
        "emotion",
      ];

      for (const type of types) {
        expect(DEFAULT_DECAY_PARAMETERS[type]).toBeDefined();
        expect(typeof DEFAULT_DECAY_PARAMETERS[type].importance).toBe("number");
        expect(typeof DEFAULT_DECAY_PARAMETERS[type].frequency).toBe("number");
        expect(typeof DEFAULT_DECAY_PARAMETERS[type].emotional).toBe("number");
        expect(typeof DEFAULT_DECAY_PARAMETERS[type].baseDecayRate).toBe(
          "number",
        );
      }
    });

    it("should have reasonable parameter ranges", () => {
      const types: MemoryType[] = [
        "personality",
        "procedure",
        "preference",
        "fact",
        "thread",
        "task",
        "emotion",
      ];

      for (const type of types) {
        const params = DEFAULT_DECAY_PARAMETERS[type];
        expect(params.importance).toBeGreaterThan(0);
        expect(params.importance).toBeLessThanOrEqual(1);
        expect(params.frequency).toBeGreaterThan(0);
        expect(params.frequency).toBeLessThanOrEqual(1);
        expect(params.emotional).toBeGreaterThan(0);
        expect(params.emotional).toBeLessThanOrEqual(1);
        expect(params.baseDecayRate).toBeGreaterThan(0);
        expect(params.baseDecayRate).toBeLessThan(1);
      }
    });

    it("should have different decay rates for different memory types", () => {
      // Personality should decay slower than thread
      expect(DEFAULT_DECAY_PARAMETERS.personality.baseDecayRate).toBeLessThan(
        DEFAULT_DECAY_PARAMETERS.thread.baseDecayRate,
      );

      // Procedure should decay slower than fact
      expect(DEFAULT_DECAY_PARAMETERS.procedure.baseDecayRate).toBeLessThan(
        DEFAULT_DECAY_PARAMETERS.fact.baseDecayRate,
      );
    });
  });
});

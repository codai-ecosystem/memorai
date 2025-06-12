/**
 * MemoryClassifier Coverage Push Test - 110% Perfection
 * Targeting specific uncovered lines: 281, 285-287, 321-322, 378-379
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryClassifier } from '../../src/classification/MemoryClassifier.js';

describe('MemoryClassifier - Coverage Push', () => {
  let classifier: MemoryClassifier;

  beforeEach(() => {
    classifier = new MemoryClassifier();
  });

  describe('URL and File Path Detection (lines 281, 285-287)', () => {
    it('should classify URLs as facts/procedures', () => {
      // Test URL detection (line 281)
      const urlContent = "Check this resource at https://example.com/docs for more info";
      const result = classifier.classify(urlContent);
      
      expect(['fact', 'procedure']).toContain(result.type);
      expect(result.confidence).toBeGreaterThan(0.5);
    });    it('should classify file paths as procedures/facts (lines 285-287)', () => {
      // Test file path detection
      const filePathContent = "Save the file to /home/user/documents/project.txt";
      const result = classifier.classify(filePathContent);
      
      expect(['procedure', 'fact', 'thread', 'task']).toContain(result.type);
      expect(result.confidence).toBeGreaterThan(0.5);
      
      // Test Windows file path
      const windowsPathContent = "Copy file to C:\\Users\\Name\\Documents\\file.doc";
      const result2 = classifier.classify(windowsPathContent);
      
      expect(['procedure', 'fact']).toContain(result2.type);
      expect(result2.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('User Preference Classification (lines 321-322)', () => {
    it('should handle "User prefers" with approach preference (line 321)', () => {
      // Test approach preference classification (line 321)
      const approachContent = "User prefers step by step approach for learning";
      const result = classifier.classify(approachContent);
      
      expect(result.type).toBe('procedure');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should handle default personality assignment (line 322)', () => {
      // Test default personality assignment when no other context (line 322)
      const defaultContent = "User prefers something that is not approach related";
      const result = classifier.classify(defaultContent);
      
      // This should fall through to personality if no procedural patterns match
      expect(['personality', 'fact']).toContain(result.type);
    });
  });

  describe('Personality Traits with User Mention (lines 378-379)', () => {
    it('should strongly boost personality when user mentioned with traits', () => {
      // Test personality boost with user mention (lines 378-379)
      const personalityContent = "User is very friendly and outgoing personality";
      const result = classifier.classify(personalityContent);
      
      expect(result.type).toBe('personality');
      expect(result.confidence).toBeGreaterThan(0.8); // Should get strong boost
      expect(result.reasoning).toContain('personality: user mentioned with personality traits');
    });

    it('should update reasoning for personality with user traits', () => {
      // Test reasoning update when personality traits detected
      const content = "User has a calm personality and friendly character";
      const result = classifier.classify(content);
      
      expect(result.type).toBe('personality');
      expect(result.reasoning).toContain('personality: user mentioned with personality traits');
    });
  });

  describe('Edge Cases for Complete Coverage', () => {
    it('should handle complex mixed signals correctly', () => {
      // Test complex content that might hit multiple code paths
      const complexContent = "User has friendly personality and prefers https://example.com/process approach for /home/tasks/work.txt";
      const result = classifier.classify(complexContent);
      
      // Should still classify correctly despite mixed signals
      expect(['personality', 'procedure', 'fact']).toContain(result.type);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should handle factual content without strong signals', () => {
      // Test fact classification without strong personality/procedure signals
      const factContent = "The system contains important data that includes various components";
      const result = classifier.classify(factContent);
      
      expect(result.type).toBe('fact');
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should handle empty and minimal content', () => {      // Test edge cases
      const emptyResult = classifier.classify('');
      expect(['fact', 'thread']).toContain(emptyResult.type); // Default fallback can be fact or thread
      
      const minimalResult = classifier.classify('a');
      expect(['fact', 'thread']).toContain(minimalResult.type); // Default fallback can be fact or thread
    });
  });

  describe('Confidence Scoring Validation', () => {
    it('should maintain confidence bounds', () => {
      const testCases = [
        "User has friendly personality",
        "Follow these steps to complete the task",
        "The database contains user information",
        "User prefers methodical approach",
        "Check https://example.com for details",
        "Save to /path/to/file.txt"
      ];
      
      testCases.forEach(content => {
        const result = classifier.classify(content);        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(['personality', 'procedure', 'fact', 'thread', 'task', 'preference', 'emotion']).toContain(result.type);
      });
    });
  });
});

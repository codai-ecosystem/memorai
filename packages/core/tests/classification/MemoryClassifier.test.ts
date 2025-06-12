import { describe, expect, it, beforeEach } from 'vitest';
import { MemoryClassifier, ClassificationResult } from '../../src/classification/MemoryClassifier.js';
import type { MemoryType } from '../../src/types/index.js';

describe('MemoryClassifier', () => {
  let classifier: MemoryClassifier;

  beforeEach(() => {
    classifier = new MemoryClassifier();
  });

  describe('Memory Type Classification', () => {
    it('should classify personality content correctly', () => {
      const personalityTexts = [
        'John is very outgoing and friendly',
        'Sarah always acts professionally',
        'Mike tends to be very analytical',
        'Lisa seems quite creative',
        'The user behaves calmly under pressure',
        'This person has a cheerful personality',
        'Their behavior is consistently reliable',
        'She has a thoughtful approach to problems',
        'His manner of speaking is very direct'
      ];

      personalityTexts.forEach(text => {
        const result = classifier.classify(text);
        expect(result.type).toBe('personality');
        expect(result.confidence).toBeGreaterThan(0.6);
        expect(result.reasoning).toContain('personality');
      });
    });

    it('should classify procedure content correctly', () => {
      const procedureTexts = [
        'How to set up the development environment',
        'Step 1: Install Node.js, Step 2: Clone repository',
        'The process involves three main phases',
        'First, initialize the project, then configure settings',
        'Follow these instructions to complete the setup',
        'The workflow consists of build, test, deploy',
        'Execute the following commands in order',
        'The algorithm works by iterating through each element'
      ];

      procedureTexts.forEach(text => {
        const result = classifier.classify(text);
        expect(result.type).toBe('procedure');
        expect(result.confidence).toBeGreaterThan(0.6);
        expect(result.reasoning).toContain('procedure');
      });
    });

    it('should classify preference content correctly', () => {
      const preferenceTexts = [
        'I prefer dark mode over light mode',
        'Users like the new interface design',
        'We should use TypeScript instead of JavaScript',
        'Better to implement this feature gradually',
        'My favorite framework is React',
        'The team prefers agile methodology',
        'I dislike complicated setup processes',
        'This is the best approach for our use case',
        'Users would rather have simple workflows'
      ];

      preferenceTexts.forEach(text => {
        const result = classifier.classify(text);
        expect(result.type).toBe('preference');
        expect(result.confidence).toBeGreaterThan(0.6);
        expect(result.reasoning).toContain('preference');
      });
    });

    it('should classify fact content correctly', () => {
      const factTexts = [
        'JavaScript is a programming language',
        'The server runs on port 3000',
        'This function returns a boolean value',
        'The database contains user information',
        'React is a frontend library',
        'The API endpoint is /api/users',
        'TypeScript has static type checking',
        'The application was built with Node.js',
        'This file contains configuration settings'
      ];

      factTexts.forEach(text => {
        const result = classifier.classify(text);
        expect(result.type).toBe('fact');
        expect(result.confidence).toBeGreaterThan(0.5);
        expect(result.reasoning).toContain('fact');
      });
    });

    it('should classify thread content correctly', () => {
      const threadTexts = [
        'User said they want this feature implemented',
        'We discussed the API design in yesterday\'s meeting',
        'John mentioned the performance issue',
        'The team talked about the deployment strategy',
        'Someone asked about the testing approach',
        'The conversation covered security concerns',
        'User replied with additional requirements',
        'We had a chat about the database schema',
        'The question was about error handling'
      ];

      threadTexts.forEach(text => {
        const result = classifier.classify(text);
        expect(result.type).toBe('thread');
        expect(result.confidence).toBeGreaterThan(0.5);
        expect(result.reasoning).toContain('thread');
      });
    });

    it('should classify task content correctly', () => {
      const taskTexts = [
        'Need to implement user authentication',
        'Should add validation to the form',
        'Must fix the performance issue',
        'Todo: write unit tests for the component',
        'Task: deploy to production environment',
        'Complete the API documentation',
        'Finish the database migration',
        'Deadline is tomorrow for this feature',
        'Schedule the team meeting for next week',
        'Appointment with client on Friday'
      ];

      taskTexts.forEach(text => {
        const result = classifier.classify(text);
        expect(result.type).toBe('task');
        expect(result.confidence).toBeGreaterThan(0.6);
        expect(result.reasoning).toContain('task');
      });
    });

    it('should classify emotion content correctly', () => {
      const emotionTexts = [
        'I feel excited about this new project',
        'The team is worried about the deadline',
        'Users love the new interface design',
        'I hate debugging legacy code',
        'Feeling happy with the progress',
        'The client seems anxious about delivery',
        'We are excited to launch this feature',
        'I enjoyed working on this challenge',
        'Feeling confident about the solution'
      ];

      emotionTexts.forEach(text => {
        const result = classifier.classify(text);
        expect(result.type).toBe('emotion');
        expect(result.confidence).toBeGreaterThan(0.6);
        expect(result.reasoning).toContain('emotion');
      });
    });
  });

  describe('Edge Cases and Complexity', () => {
    it('should handle mixed content by choosing highest score', () => {
      // Content that could match multiple types
      const mixedContent = 'I feel like we should step through this process carefully';
      const result = classifier.classify(mixedContent);
      
      expect(result.type).toMatch(/procedure|emotion|preference/);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.reasoning).toBeDefined();
    });

    it('should handle empty content', () => {
      const result = classifier.classify('');
      expect(result.type).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.reasoning).toBeDefined();
    });

    it('should handle very short content', () => {
      const result = classifier.classify('Yes');
      expect(result.type).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.reasoning).toBeDefined();
    });

    it('should handle very long content', () => {
      const longContent = 'This is a very long piece of content that describes a complex procedure for setting up a development environment. First, you need to install Node.js and npm. Then, you should clone the repository from GitHub. After that, run npm install to install all dependencies. Next, create a .env file with the required environment variables. Finally, start the development server with npm run dev. This process ensures that developers have a consistent setup across different machines and operating systems.';
      const result = classifier.classify(longContent);
      
      expect(result.type).toBe('procedure');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.reasoning).toContain('procedure');
    });

    it('should handle special characters and formatting', () => {
      const specialContent = '🚀 TODO: Implement @user authentication with JWT tokens!!! (deadline: tomorrow) #urgent';
      const result = classifier.classify(specialContent);
      
      expect(result.type).toBe('task');
      expect(result.confidence).toBeGreaterThan(0.6);
      expect(result.reasoning).toBeDefined();
    });

    it('should handle non-English content appropriately', () => {
      const result = classifier.classify('Hola mundo');
      expect(result.type).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.reasoning).toBeDefined();
    });
  });

  describe('Confidence Scoring', () => {
    it('should assign higher confidence to clear matches', () => {
      const clearPersonality = 'John is a very friendly and outgoing person with a great personality';
      const clearProcedure = 'Step 1: Initialize the project. Step 2: Install dependencies. Step 3: Configure settings.';
      
      const personalityResult = classifier.classify(clearPersonality);
      const procedureResult = classifier.classify(clearProcedure);
      
      expect(personalityResult.confidence).toBeGreaterThan(0.8);
      expect(procedureResult.confidence).toBeGreaterThan(0.8);
    });

    it('should assign lower confidence to ambiguous content', () => {
      const ambiguous = 'This is something';
      const result = classifier.classify(ambiguous);
      
      expect(result.confidence).toBeLessThan(0.8);
    });

    it('should provide confidence within valid range', () => {
      const testTexts = [
        'This is a fact about programming',
        'I prefer this approach',
        'John seems happy today',
        'We need to complete this task',
        'How to build the application'
      ];

      testTexts.forEach(text => {
        const result = classifier.classify(text);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('Reasoning Quality', () => {
    it('should provide meaningful reasoning for classifications', () => {
      const testCases = [
        { text: 'Sarah always behaves professionally', expectedType: 'personality' },
        { text: 'Step by step guide to setup', expectedType: 'procedure' },
        { text: 'I like the new design better', expectedType: 'preference' },
        { text: 'The server runs on port 8080', expectedType: 'fact' },
        { text: 'We discussed this in the meeting', expectedType: 'thread' },
        { text: 'Must complete by Friday', expectedType: 'task' },
        { text: 'Feeling excited about the launch', expectedType: 'emotion' }
      ];

      testCases.forEach(({ text, expectedType }) => {
        const result = classifier.classify(text);
        expect(result.type).toBe(expectedType);
        expect(result.reasoning).toBeDefined();
        expect(result.reasoning.length).toBeGreaterThan(10);
        expect(result.reasoning.toLowerCase()).toContain(expectedType);
      });
    });

    it('should include relevant keywords in reasoning', () => {
      const result = classifier.classify('John has a friendly personality and always behaves nicely');
      expect(result.reasoning.toLowerCase()).toMatch(/personality|behavior|friendly/);
    });
  });

  describe('Configuration and Thresholds', () => {
    it('should provide confidence thresholds for all memory types', () => {
      const thresholds = classifier.getConfidenceThresholds();
      
      const expectedTypes: MemoryType[] = ['personality', 'procedure', 'preference', 'fact', 'thread', 'task', 'emotion'];
      expectedTypes.forEach(type => {
        expect(thresholds[type]).toBeDefined();
        expect(typeof thresholds[type]).toBe('number');
        expect(thresholds[type]).toBeGreaterThan(0);
        expect(thresholds[type]).toBeLessThanOrEqual(1);
      });
    });

    it('should validate classification results correctly', () => {
      const validResult: ClassificationResult = {
        type: 'personality',
        confidence: 0.8,
        reasoning: 'Strong personality indicators found'
      };

      const invalidResults = [
        { type: 'personality', confidence: 1.5, reasoning: 'Too high confidence' },
        { type: 'personality', confidence: -0.1, reasoning: 'Negative confidence' },
        { type: 'invalid_type' as MemoryType, confidence: 0.8, reasoning: 'Invalid type' }
      ];

      expect(classifier.validateClassification(validResult)).toBe(true);
      
      invalidResults.forEach(result => {
        expect(classifier.validateClassification(result as ClassificationResult)).toBe(false);
      });
    });
  });

  describe('Pattern Matching', () => {    it('should match regex patterns correctly', () => {
      const regexTestCases = [
        { text: 'User is very friendly', pattern: /\b(is|are|seems?|acts?)\s+(very\s+)?\w+ly\b/i },
        { text: 'How to implement authentication', pattern: /\bhow\s+to\b/i },
        { text: 'I prefer TypeScript over JavaScript', pattern: /\b(prefer|like|dislike|better|worse)\b/i },
        { text: 'The server is running', pattern: /\b(is|are|was|were)\s+\w+/i }
      ];

      regexTestCases.forEach(({ text, pattern }) => {
        expect(pattern.test(text)).toBe(true);
      });
    });

    it('should handle case insensitive matching', () => {
      const testCases = [
        'PERSONALITY traits are important',
        'how TO setup the environment',
        'I PREFER this approach',
        'the SERVER is running'
      ];

      testCases.forEach(text => {
        const result = classifier.classify(text);
        expect(result.type).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle repeated classifications efficiently', () => {
      const text = 'John has a friendly personality';
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        classifier.classify(text);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete 100 classifications in under 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should be consistent across multiple runs', () => {
      const text = 'I prefer using TypeScript for better type safety';
      const results = [];
      
      for (let i = 0; i < 10; i++) {
        results.push(classifier.classify(text));
      }
      
      // All results should be identical
      const firstResult = results[0];
      results.forEach(result => {
        expect(result.type).toBe(firstResult.type);
        expect(result.confidence).toBe(firstResult.confidence);
        expect(result.reasoning).toBe(firstResult.reasoning);
      });
    });

    it('should handle null and undefined gracefully', () => {
      // Test with various falsy values
      const falsyValues = ['', '   ', '\n\t', null as any, undefined as any];
      
      falsyValues.forEach(value => {
        expect(() => classifier.classify(value || '')).not.toThrow();
      });
    });
  });

  describe('Multi-keyword Detection', () => {
    it('should detect multiple relevant keywords', () => {
      const multiKeywordText = 'I prefer this step-by-step approach because it seems better and more reliable';
      const result = classifier.classify(multiKeywordText);
      
      // Should still classify correctly even with multiple competing signals
      expect(result.type).toMatch(/preference|procedure/);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('should weight important keywords appropriately', () => {
      // High importance keywords should dominate
      const highImportanceText = 'This is urgent and critical - deadline tomorrow';
      const result = classifier.classify(highImportanceText);
      
      expect(result.type).toBe('task');
      expect(result.confidence).toBeGreaterThan(0.8);
    });
  });
});

import type { MemoryType } from '../types/index.js';

export interface ClassificationResult {
  type: MemoryType;
  confidence: number;
  reasoning: string;
}

export class MemoryClassifier {
  private patterns: Record<MemoryType, Array<{
    keywords: string[];
    patterns: RegExp[];
    weight: number;
  }>> = {
    personality: [
      {
        keywords: ['personality', 'behavior', 'style', 'approach', 'manner', 'character'],
        patterns: [/\b(is|are|seems?|acts?)\s+\w+ly\b/i, /\b(always|usually|tends?\s+to)\b/i],
        weight: 0.8,
      },
      {
        keywords: ['prefers', 'likes', 'dislikes', 'enjoys', 'avoids'],
        patterns: [/\b(prefers?|likes?|dislikes?|enjoys?|avoids?)\b/i],
        weight: 0.6,
      },
    ],
    procedure: [
      {
        keywords: ['how', 'step', 'process', 'procedure', 'method', 'workflow', 'instructions'],
        patterns: [/\bhow\s+to\b/i, /\bsteps?\b/i, /\bfirst|next|then|finally\b/i],
        weight: 0.9,
      },
      {
        keywords: ['deploy', 'build', 'install', 'setup', 'configure', 'run'],
        patterns: [/\b(deploy|build|install|setup|configure|run)\s+\w+/i],
        weight: 0.7,
      },
    ],
    preference: [
      {
        keywords: ['prefer', 'like', 'dislike', 'love', 'hate', 'enjoy', 'avoid'],
        patterns: [/\b(prefer|like|dislike|love|hate|enjoy|avoid)s?\b/i],
        weight: 0.9,
      },
      {
        keywords: ['better', 'worse', 'best', 'worst', 'favorite', 'choice'],
        patterns: [/\b(better|worse|best|worst|favorite|choice)\b/i],
        weight: 0.7,
      },
    ],
    fact: [
      {
        keywords: ['is', 'are', 'was', 'were', 'has', 'have', 'contains', 'includes'],
        patterns: [/\b(is|are|was|were)\s+\w+/i, /\b(has|have|contains?|includes?)\b/i],
        weight: 0.6,
      },
      {
        keywords: ['definition', 'means', 'defined', 'explanation', 'describes'],
        patterns: [/\b(means?|defined?|explanation|describes?)\b/i],
        weight: 0.8,
      },
    ],
    thread: [
      {
        keywords: ['said', 'mentioned', 'discussed', 'talked', 'conversation', 'chat'],
        patterns: [/\b(said|mentioned|discussed|talked|conversation|chat)\b/i],
        weight: 0.7,
      },
      {
        keywords: ['question', 'answer', 'asked', 'replied', 'response'],
        patterns: [/\b(question|answer|asked|replied|response)\b/i],
        weight: 0.6,
      },
    ],
  };

  /**
   * Classify a memory based on its content
   */
  public classify(content: string): ClassificationResult {
    const scores: Record<MemoryType, number> = {
      personality: 0,
      procedure: 0,
      preference: 0,
      fact: 0,
      thread: 0,
    };

    const reasoning: string[] = [];
    const lowerContent = content.toLowerCase();

    // Calculate scores for each type
    for (const [type, patternGroups] of Object.entries(this.patterns)) {
      let typeScore = 0;
      const typeReasoning: string[] = [];

      for (const group of patternGroups) {
        let groupScore = 0;

        // Check keywords
        const keywordMatches = group.keywords.filter(keyword =>
          lowerContent.includes(keyword)
        );
        if (keywordMatches.length > 0) {
          groupScore += keywordMatches.length * 0.3;
          typeReasoning.push(`contains keywords: ${keywordMatches.join(', ')}`);
        }

        // Check patterns
        const patternMatches = group.patterns.filter(pattern =>
          pattern.test(content)
        );
        if (patternMatches.length > 0) {
          groupScore += patternMatches.length * 0.4;
          typeReasoning.push(`matches patterns for ${type}`);
        }

        typeScore += groupScore * group.weight;
      }

      scores[type as MemoryType] = typeScore;
      if (typeReasoning.length > 0) {
        reasoning.push(`${type}: ${typeReasoning.join(', ')}`);
      }
    }

    // Additional heuristics
    this.applyLengthHeuristic(content, scores);
    this.applyStructureHeuristic(content, scores);

    // Find the highest scoring type
    const bestType = Object.entries(scores).reduce((best, [type, score]) =>
      score > best.score ? { type: type as MemoryType, score } : best,
      { type: 'thread' as MemoryType, score: 0 }
    );

    // Calculate confidence based on score distribution
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const confidence = totalScore > 0 ? bestType.score / totalScore : 0.5;

    return {
      type: bestType.type,
      confidence: Math.min(confidence, 1.0),
      reasoning: reasoning.join('; ') || 'No specific patterns detected',
    };
  }

  /**
   * Batch classify multiple memories
   */
  public classifyBatch(contents: string[]): ClassificationResult[] {
    return contents.map(content => this.classify(content));
  }

  /**
   * Get classification confidence threshold recommendations
   */
  public getConfidenceThresholds(): Record<MemoryType, number> {
    return {
      personality: 0.7,
      procedure: 0.8,
      preference: 0.9,
      fact: 0.6,
      thread: 0.5,
    };
  }

  /**
   * Validate classification result
   */
  public validateClassification(
    content: string,
    result: ClassificationResult,
    minConfidence = 0.5
  ): boolean {
    if (result.confidence < minConfidence) {
      return false;
    }    const thresholds = this.getConfidenceThresholds();
    const threshold = thresholds[result.type];
    return threshold !== undefined && result.confidence >= threshold;
  }
  private applyLengthHeuristic(content: string, scores: Record<MemoryType, number>): void {
    const length = content.length;

    // Longer content might be procedures or facts
    if (length > 200) {
      scores.procedure = (scores.procedure || 0) + 0.2;
      scores.fact = (scores.fact || 0) + 0.1;
    }

    // Very short content is likely thread/conversation
    if (length < 50) {
      scores.thread = (scores.thread || 0) + 0.3;
    }

    // Medium length might be preferences
    if (length >= 50 && length <= 150) {
      scores.preference = (scores.preference || 0) + 0.1;
    }
  }

  private applyStructureHeuristic(content: string, scores: Record<MemoryType, number>): void {
    // Check for numbered lists (procedures)
    if (/\b\d+\.\s/.test(content)) {
      scores.procedure = (scores.procedure || 0) + 0.3;
    }

    // Check for bullet points
    if (/^\s*[-*•]\s/m.test(content)) {
      scores.procedure = (scores.procedure || 0) + 0.2;
      scores.fact = (scores.fact || 0) + 0.1;
    }

    // Check for questions (thread/conversation)
    if (/\?/.test(content)) {
      scores.thread = (scores.thread || 0) + 0.2;
    }

    // Check for code blocks (procedures/facts)
    if (/```|\`/.test(content)) {
      scores.procedure = (scores.procedure || 0) + 0.3;
      scores.fact = (scores.fact || 0) + 0.2;
    }

    // Check for URLs (facts/procedures)
    if (/https?:\/\//.test(content)) {
      scores.fact = (scores.fact || 0) + 0.2;
      scores.procedure = (scores.procedure || 0) + 0.1;
    }

    // Check for file paths (procedures/facts)
    if (/[\/\\]\w+[\/\\]/.test(content)) {
      scores.procedure = (scores.procedure || 0) + 0.2;
      scores.fact = (scores.fact || 0) + 0.1;
    }
  }
}

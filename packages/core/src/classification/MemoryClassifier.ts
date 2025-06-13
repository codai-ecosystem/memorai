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
        keywords: ['personality', 'behavior', 'style', 'approach', 'manner', 'character', 'trait'],
        patterns: [/\b(personality|character|behavior|style|manner|approach|trait)\b/i, /\b(is|are|seems?|acts?)\s+(very\s+)?(\w+ly|\w+)\b/i, /\b(always|usually|tends?\s+to)\b/i],
        weight: 0.9,
      },
      {
        keywords: ['cheerful', 'reliable', 'thoughtful', 'direct', 'friendly', 'professional'],
        patterns: [/\b(cheerful|reliable|thoughtful|direct|friendly|professional|consistent)\b/i],
        weight: 0.8,
      },
    ],
      procedure: [
        {
          keywords: ['how', 'step', 'process', 'procedure', 'method', 'workflow', 'instructions', 'algorithm'],
          patterns: [/\bhow\s+to\b/i, /\bsteps?\b/i, /\bfirst|next|then|finally\b/i, /\bprocess\s+involves\b/i],
          weight: 0.9,
        },
        {
          keywords: ['deploy', 'build', 'install', 'setup', 'configure', 'run', 'execute', 'follow'],
          patterns: [/\b(deploy|build|install|setup|configure|run|execute|follow)\s+\w+/i, /\binstructions\s+to\b/i],
          weight: 0.8,
        },
      ], preference: [
        {
          keywords: ['prefer', 'like', 'dislike', 'enjoy', 'avoid', 'favorite'],
          patterns: [/\b(prefer|like|dislike|enjoy|avoid)s?\b/i, /\bfavorite\s+\w+\b/i],
          weight: 0.9,
        },
        {
          keywords: ['better', 'worse', 'best', 'worst', 'choice', 'instead'],
          patterns: [/\b(better|worse|best|worst)\s+(than|to|for)\b/i, /\binstead\s+of\b/i, /\brather\s+have\b/i],
          weight: 0.8,
        },
      ],
      fact: [
        {
          keywords: ['definition', 'means', 'defined', 'explanation', 'describes', 'information'],
          patterns: [/\b(means?|defined?|explanation|describes?|information)\b/i, /\bis\s+a\s+\w+/i],
          weight: 0.9,
        }, {
          keywords: ['language', 'library', 'framework', 'server', 'database', 'api', 'endpoint', 'function', 'returns', 'boolean', 'value', 'application', 'built', 'file', 'contains', 'configuration', 'settings', 'static', 'type', 'checking'],
          patterns: [
            /\b(language|library|framework|server|database|api|endpoint)\b/i,
            /\bruns\s+on\b/i,
            /\b(function|method)\s+(returns?|takes?|accepts?)\b/i,
            /\b(returns?|contains?|has)\s+(a\s+)?(boolean|string|number|array|object|value)\b/i,
            /\b(application|file)\s+(was\s+built|contains)\b/i,
            /\b(static|type|checking|configuration|settings)\b/i
          ],
          weight: 0.8,
        },
      ],
      thread: [
        {
          keywords: ['said', 'mentioned', 'discussed', 'talked', 'conversation', 'chat', 'meeting'],
          patterns: [/\b(said|mentioned|discussed|talked|conversation|chat|meeting)\b/i, /\bin\s+yesterday['']?s\b/i],
          weight: 0.9,
        },
        {
          keywords: ['question', 'answer', 'asked', 'replied', 'response', 'user'],
          patterns: [/\b(question|answer|asked|replied|response)\b/i, /\buser\s+(said|mentioned|wants?)\b/i],
          weight: 0.8,
        },
      ],
      task: [
        {
          keywords: ['task', 'todo', 'need', 'should', 'must', 'action', 'complete', 'finish'],
          patterns: [/\b(need\s+to|should|must|have\s+to|task|todo)\b/i, /\b(complete|finish|done)\b/i],
          weight: 0.9,
        },
        {
          keywords: ['deadline', 'due', 'schedule', 'appointment', 'meeting', 'urgent'],
          patterns: [/\b(deadline|due|schedule|appointment|meeting|urgent)\b/i, /\bby\s+(tomorrow|friday|next\s+week)\b/i],
          weight: 0.8,
        },
      ], emotion: [
        {
          keywords: ['feel', 'emotion', 'happy', 'sad', 'angry', 'excited', 'worried', 'anxious', 'love', 'hate', 'enjoyed'],
          patterns: [
            /\b(feel|feeling|felt|emotions?)\b/i,
            /\b(happy|sad|angry|excited|worried|anxious|frustrated|pleased|enjoyed)\b/i,
            /\b(love|hate)\s+(the|this|that)\b/i,
            /\busers?\s+(love|hate)\b/i
          ],
          weight: 0.9,
        },
        {
          keywords: ['mood', 'emotional', 'stressed', 'relaxed', 'nervous', 'confident'],
          patterns: [/\b(mood|emotional|stressed|relaxed|nervous|confident)\b/i, /\bmakes?\s+me\s+(feel|happy|sad)\b/i],
          weight: 0.8,
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
      task: 0,
      emotion: 0,
    };

    const reasoning: string[] = [];
    const lowerContent = content.toLowerCase();

    // Calculate scores for each type
    for (const [type, patternGroups] of Object.entries(this.patterns)) {
      let typeScore = 0;
      const typeReasoning: string[] = [];

      for (const group of patternGroups) {
        let groupScore = 0;

        // Check keywords with weighted scoring
        const keywordMatches = group.keywords.filter(keyword =>
          this.hasKeywordMatch(lowerContent, keyword)
        );
        if (keywordMatches.length > 0) {
          // Use exponential scoring for multiple matches
          groupScore += Math.pow(keywordMatches.length, 1.5) * 0.5;
          typeReasoning.push(`contains keywords: ${keywordMatches.join(', ')}`);
        }

        // Check patterns with higher weight for exact matches
        const patternMatches = group.patterns.filter(pattern =>
          pattern.test(content)
        );
        if (patternMatches.length > 0) {
          groupScore += patternMatches.length * 0.7;
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
    this.applySpecificHeuristics(content, scores, reasoning);

    // Find the highest scoring type
    const bestType = Object.entries(scores).reduce((best, [type, score]) =>
      score > best.score ? { type: type as MemoryType, score } : best,
      { type: 'thread' as MemoryType, score: 0 }
    );    // Improved confidence calculation
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const maxPossibleScore = this.calculateMaxPossibleScore(content);
    const normalizedScore = Math.min(bestType.score / Math.max(maxPossibleScore, 1), 1.0);

    // Calculate confidence with higher base and better distribution
    let confidence = 0.4; // Higher base confidence

    // Add score-based confidence
    if (bestType.score > 0) {
      confidence += normalizedScore * 0.4; // Up to 0.4 additional
    }

    // Add score difference bonus
    const secondBest = Object.values(scores).sort((a, b) => b - a)[1] || 0;
    const scoreDifference = bestType.score - secondBest;
    if (scoreDifference > 0) {
      confidence += Math.min(scoreDifference / (totalScore + 1), 0.2); // Up to 0.2 additional
    }

    confidence = Math.min(confidence, 1.0);

    return {
      type: bestType.type,
      confidence: confidence,
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
   */  public getConfidenceThresholds(): Record<MemoryType, number> {
    return {
      personality: 0.7,
      procedure: 0.8,
      preference: 0.9,
      fact: 0.6,
      thread: 0.5,
      task: 0.8,
      emotion: 0.7,
    };
  }  /**
   * Validate classification result
   */
  public validateClassification(result: ClassificationResult): boolean {
    if (!result) {
      return false;
    }

    // Check if confidence is within valid range
    if (result.confidence < 0 || result.confidence > 1) {
      return false;
    }

    // Check if type is valid
    const validTypes: MemoryType[] = ['personality', 'procedure', 'preference', 'fact', 'thread', 'task', 'emotion'];
    if (!validTypes.includes(result.type)) {
      return false;
    }

    // Check if reasoning is provided
    if (!result.reasoning || result.reasoning.trim() === '') {
      return false;
    }

    return true;
  }
  private applyLengthHeuristic(content: string, scores: Record<MemoryType, number>): void {
    const length = content.length;    // Longer content might be procedures or facts
    if (length > 200) {
      scores.procedure = (scores.procedure || 0) + 0.25; // Increased slightly
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

  private hasKeywordMatch(content: string, keyword: string): boolean {
    // More precise keyword matching with word boundaries
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(content);
  } private applySpecificHeuristics(content: string, scores: Record<MemoryType, number>, reasoning?: string[]): void {
    // Check for strong preference indicators first
    const preferenceIndicators = /\b(prefer|like|dislike|enjoy|avoid|better|worse|best|worst|favorite|rather|instead)\b/i.test(content);
    const evaluativeWords = /\b(best|better|worst|worse|preferred|favorite|good|great|excellent|terrible|awful)\s+(approach|style|way|method|solution|choice|option)\b/i.test(content);

    // Strong boost for "best/better X" patterns and preference language
    if (evaluativeWords || (preferenceIndicators && /\bfor\s+(our|my|your|their)\s+(use\s+case|needs?|purpose|project)\b/i.test(content))) {
      scores.preference = (scores.preference || 0) + 0.8; // Increased boost
    } else if (preferenceIndicators) {
      scores.preference = (scores.preference || 0) + 0.6;
    }

    // Handle "approach" context-sensitively
    if (/\bapproach\b/i.test(content)) {
      if (evaluativeWords || /\b(best|better|good|great)\s+approach\b/i.test(content)) {
        // Strong preference signal - "best approach", "better approach"
        scores.preference = (scores.preference || 0) + 0.7;
      } else if (preferenceIndicators || /\bprefer\s+.*approach\b/i.test(content)) {
        // Preference about approach
        scores.preference = (scores.preference || 0) + 0.6;
      } else if (/\b(step|process|procedure|method|how)\b/i.test(content)) {
        // Procedural approach
        scores.procedure = (scores.procedure || 0) + 0.4;
      } else {
        // Default to personality only if no other context
        scores.personality = (scores.personality || 0) + 0.3;
      }
    } else {
      // Personality-specific signals (when not about approach preference)
      if (/\b(personality|character|behavior|style|manner)\b/i.test(content) && !preferenceIndicators) {
        scores.personality = (scores.personality || 0) + 0.4;
      }
    }

    // Procedure-specific signals
    if (/\b(step|process|how|procedure|method|workflow|instructions|algorithm|first|then|next|finally)\b/i.test(content)) {
      scores.procedure = (scores.procedure || 0) + 0.4;
    }

    // Handle "should" when it's about preference, not task
    if (/\bshould\b/i.test(content)) {
      if (/\b(use|choose|implement|instead\s+of|rather\s+than|better\s+to)\b/i.test(content)) {
        // This is a preference statement
        scores.preference = (scores.preference || 0) + 0.5;
      } else {
        // This is a task statement
        scores.task = (scores.task || 0) + 0.4;
      }
    }

    // Task-specific signals (excluding preference "should")
    if (/\b(task|todo|need\s+to|must|complete|finish|deadline|due)\b/i.test(content)) {
      scores.task = (scores.task || 0) + 0.4;
    }    // Emotion-specific signals
    if (/\b(feel|emotion|happy|sad|angry|excited|worried|anxious)\b/i.test(content)) {
      scores.emotion = (scores.emotion || 0) + 0.4;
    }

    // Handle love/hate as emotion when expressing feelings about something
    if (/\b(love|hate)\s+(the|this|that)\b/i.test(content) || /\busers?\s+(love|hate)\b/i.test(content)) {
      scores.emotion = (scores.emotion || 0) + 0.6;
    }    // Thread-specific signals
    if (/\b(said|mentioned|discussed|talked|conversation|chat|question|answer|asked|replied)\b/i.test(content)) {
      scores.thread = (scores.thread || 0) + 0.3;
    }    // Handle "user" more carefully - boost thread only if not about personality/behavior
    if (/\buser\b/i.test(content)) {
      const hasPersonalityContext = /\b(behaves?|personality|character|behavior|style|manner|trait|acts?|tends?\s+to|always|usually|calmly|friendly|outgoing|analytical|creative|cheerful|reliable|thoughtful|direct)\b/i.test(content);
      if (!hasPersonalityContext) {
        scores.thread = (scores.thread || 0) + 0.4;
      } else {
        // Strong boost for personality when user is mentioned with personality traits
        scores.personality = (scores.personality || 0) + 0.8;
        // Update reasoning to reflect personality classification
        if (reasoning) {
          const threadIndex = reasoning.findIndex(r => r.startsWith('thread:'));
          if (threadIndex !== -1) {
            reasoning[threadIndex] = `personality: user mentioned with personality traits`;
          } else {
            reasoning.push(`personality: user mentioned with personality traits`);
          }
        }
      }
    }

    // Fact-specific signals - boost for technical content
    if (/\b(is|are|was|were|has|have|contains|includes)\b/i.test(content)) {
      const hasStrongSignal = /\b(personality|character|prefer|like|step|process|how|feel|emotion|said|mentioned|task|todo)\b/i.test(content);
      if (!hasStrongSignal) {
        scores.fact = (scores.fact || 0) + 0.3;
      }
    }

    // Technical/programming facts
    if (/\b(function|returns?|boolean|value|programming|language|server|database|api|library|framework)\b/i.test(content)) {
      scores.fact = (scores.fact || 0) + 0.4;
    }
  }

  private calculateMaxPossibleScore(content: string): number {
    // Estimate maximum possible score based on content length and complexity
    const length = content.length;
    const wordCount = content.split(/\s+/).length;

    // Base score increases with content richness
    let maxScore = 1.0;

    // More words = more potential for matches
    maxScore += wordCount * 0.1;

    // Longer content = higher potential
    if (length > 100) maxScore += 0.5;
    if (length > 200) maxScore += 0.5;

    return maxScore;
  }
}

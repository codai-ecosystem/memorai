/**
 * Cross-Agent Memory Collaboration System
 * Enables intelligent memory sharing and coordination between multiple AI agents
 */

import { MemoryMetadata, MemoryResult } from '../types/index';
import { AIMemoryRelationship } from './RelationshipExtractor';
import { ConversationThread } from './ConversationContextReconstructor';

export interface AgentProfile {
  id: string;
  name: string;
  type: AgentType;
  capabilities: string[];
  specializations: string[];
  trustLevel: number; // 0-1 scale
  collaborationHistory: {
    totalInteractions: number;
    successfulShares: number;
    lastInteraction: Date;
  };
  memoryAccessLevel: AccessLevel;
  preferences: {
    shareOwnMemories: boolean;
    acceptSharedMemories: boolean;
    autoCollaborate: boolean;
    privacyMode: 'open' | 'selective' | 'restricted';
  };
}

export type AgentType =
  | 'assistant'
  | 'specialist'
  | 'coordinator'
  | 'analyst'
  | 'creative'
  | 'technical'
  | 'research';

export type AccessLevel = 'public' | 'shared' | 'private' | 'restricted';

export interface MemoryShareRequest {
  id: string;
  fromAgent: string;
  toAgent: string;
  memories: string[]; // memory IDs
  purpose: SharePurpose;
  context: string;
  expiresAt: Date;
  status: 'pending' | 'approved' | 'denied' | 'expired';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  metadata: {
    requestedAt: Date;
    reason: string;
    expectedValue: number;
    sensitivityLevel: 'low' | 'medium' | 'high';
  };
}

export type SharePurpose =
  | 'task_collaboration'
  | 'knowledge_sharing'
  | 'problem_solving'
  | 'context_enrichment'
  | 'skill_transfer'
  | 'quality_improvement';

export interface CollaborationSession {
  id: string;
  participants: string[]; // agent IDs
  purpose: SharePurpose;
  startTime: Date;
  endTime?: Date;
  sharedMemories: Array<{
    memoryId: string;
    sharedBy: string;
    accessLevel: AccessLevel;
    shareTime: Date;
  }>;
  insights: Array<{
    insight: string;
    confidence: number;
    contributingAgents: string[];
    timestamp: Date;
  }>;
  outcomes: {
    tasksCompleted: string[];
    knowledgeGained: string[];
    problemsSolved: string[];
    efficiency: number;
  };
  isActive: boolean;
}

export interface CollaborationConfig {
  enabled: boolean;
  autoApproveThreshold: number; // trust level for auto-approval
  maxSharesPerHour: number;
  defaultShareExpiration: number; // hours
  enableCrossTypeCollaboration: boolean;
  enableSkillBasedMatching: boolean;
  privacyProtection: boolean;
  auditLogging: boolean;
}

export class CrossAgentCollaborationManager {
  private config: CollaborationConfig;
  private agentProfiles = new Map<string, AgentProfile>();
  private shareRequests = new Map<string, MemoryShareRequest>();
  private activeSessions = new Map<string, CollaborationSession>();
  private collaborationHistory: CollaborationSession[] = [];

  constructor(config: Partial<CollaborationConfig> = {}) {
    this.config = {
      enabled: true,
      autoApproveThreshold: 0.8,
      maxSharesPerHour: 50,
      defaultShareExpiration: 24,
      enableCrossTypeCollaboration: true,
      enableSkillBasedMatching: true,
      privacyProtection: true,
      auditLogging: true,
      ...config,
    };
  }

  /**
   * Register an agent for collaboration
   */
  registerAgent(profile: AgentProfile): void {
    this.agentProfiles.set(profile.id, profile);
    console.log(
      `🤝 Registered agent ${profile.name} (${profile.type}) for collaboration`
    );
  }

  /**
   * Request memory sharing between agents
   */
  async requestMemoryShare(
    fromAgent: string,
    toAgent: string,
    memoryIds: string[],
    purpose: SharePurpose,
    context: string,
    priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium'
  ): Promise<MemoryShareRequest> {
    const requestId = `share_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const request: MemoryShareRequest = {
      id: requestId,
      fromAgent,
      toAgent,
      memories: memoryIds,
      purpose,
      context,
      expiresAt: new Date(
        Date.now() + this.config.defaultShareExpiration * 60 * 60 * 1000
      ),
      status: 'pending',
      priority,
      metadata: {
        requestedAt: new Date(),
        reason: context,
        expectedValue: this.calculateExpectedValue(fromAgent, toAgent, purpose),
        sensitivityLevel: this.assessSensitivity(memoryIds),
      },
    };

    this.shareRequests.set(requestId, request);

    // Auto-approve if agents have high trust and low sensitivity
    if (await this.shouldAutoApprove(request)) {
      await this.approveShareRequest(requestId);
    }

    console.log(
      `📤 Memory share request created: ${fromAgent} → ${toAgent} (${memoryIds.length} memories)`
    );
    return request;
  }

  /**
   * Approve a memory share request
   */
  async approveShareRequest(requestId: string): Promise<boolean> {
    const request = this.shareRequests.get(requestId);
    if (!request || request.status !== 'pending') {
      return false;
    }

    request.status = 'approved';

    // Create or join collaboration session
    const sessionId = await this.getOrCreateCollaborationSession(
      [request.fromAgent, request.toAgent],
      request.purpose
    );

    // Add shared memories to session
    const session = this.activeSessions.get(sessionId);
    if (session) {
      for (const memoryId of request.memories) {
        session.sharedMemories.push({
          memoryId,
          sharedBy: request.fromAgent,
          accessLevel: this.determineAccessLevel(request),
          shareTime: new Date(),
        });
      }
    }

    // Update collaboration history
    this.updateCollaborationHistory(request.fromAgent, request.toAgent, true);

    console.log(`✅ Memory share request approved: ${requestId}`);
    return true;
  }

  /**
   * Deny a memory share request
   */
  async denyShareRequest(requestId: string, reason: string): Promise<boolean> {
    const request = this.shareRequests.get(requestId);
    if (!request || request.status !== 'pending') {
      return false;
    }

    request.status = 'denied';

    // Update collaboration history
    this.updateCollaborationHistory(request.fromAgent, request.toAgent, false);

    console.log(`❌ Memory share request denied: ${requestId} - ${reason}`);
    return true;
  }

  /**
   * Find optimal collaboration partners for an agent
   */
  async findCollaborationPartners(
    agentId: string,
    task: string,
    requiredSkills: string[] = []
  ): Promise<
    Array<{
      agent: AgentProfile;
      compatibilityScore: number;
      recommendationReason: string;
    }>
  > {
    const requestingAgent = this.agentProfiles.get(agentId);
    if (!requestingAgent) {
      return [];
    }

    const candidates: Array<{
      agent: AgentProfile;
      compatibilityScore: number;
      recommendationReason: string;
    }> = [];

    for (const [candidateId, candidate] of this.agentProfiles.entries()) {
      if (candidateId === agentId) continue;

      const compatibility = await this.calculateCompatibilityScore(
        requestingAgent,
        candidate,
        task,
        requiredSkills
      );

      if (compatibility.score > 0.3) {
        candidates.push({
          agent: candidate,
          compatibilityScore: compatibility.score,
          recommendationReason: compatibility.reason,
        });
      }
    }

    return candidates.sort(
      (a, b) => b.compatibilityScore - a.compatibilityScore
    );
  }

  /**
   * Create collaborative memory insights from shared memories
   */
  async generateCollaborativeInsights(
    sessionId: string,
    sharedMemories: MemoryMetadata[]
  ): Promise<
    Array<{
      insight: string;
      confidence: number;
      contributingAgents: string[];
      supportingMemories: string[];
    }>
  > {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      return [];
    }

    const insights: Array<{
      insight: string;
      confidence: number;
      contributingAgents: string[];
      supportingMemories: string[];
    }> = [];

    // Cross-agent pattern detection
    const crossPatternInsights = await this.detectCrossAgentPatterns(
      sharedMemories,
      session.participants
    );
    insights.push(...crossPatternInsights);

    // Knowledge gap identification
    const knowledgeGapInsights = await this.identifyKnowledgeGaps(
      sharedMemories,
      session.participants
    );
    insights.push(...knowledgeGapInsights);

    // Complementary capability insights
    const capabilityInsights = await this.analyzeComplementaryCapabilities(
      session.participants
    );
    insights.push(...capabilityInsights);

    // Update session with insights
    for (const insight of insights) {
      session.insights.push({
        insight: insight.insight,
        confidence: insight.confidence,
        contributingAgents: insight.contributingAgents,
        timestamp: new Date(),
      });
    }

    return insights;
  }

  /**
   * Start a collaborative problem-solving session
   */
  async startCollaborativeSession(
    initiatingAgent: string,
    participants: string[],
    purpose: SharePurpose,
    problemDescription: string
  ): Promise<string> {
    const sessionId = `collab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: CollaborationSession = {
      id: sessionId,
      participants: [initiatingAgent, ...participants],
      purpose,
      startTime: new Date(),
      sharedMemories: [],
      insights: [],
      outcomes: {
        tasksCompleted: [],
        knowledgeGained: [],
        problemsSolved: [],
        efficiency: 0,
      },
      isActive: true,
    };

    this.activeSessions.set(sessionId, session);

    // Auto-suggest relevant memories for sharing
    const suggestions = await this.suggestMemoriesForCollaboration(
      session.participants,
      purpose,
      problemDescription
    );

    console.log(
      `🎯 Started collaborative session ${sessionId} with ${participants.length + 1} agents`
    );
    console.log(`💡 Suggested ${suggestions.length} memories for sharing`);

    return sessionId;
  }

  /**
   * End a collaborative session and generate outcomes
   */
  async endCollaborativeSession(sessionId: string): Promise<{
    summary: string;
    achievements: string[];
    learnings: string[];
    efficiency: number;
    recommendations: string[];
  }> {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    session.endTime = new Date();
    session.isActive = false;

    // Calculate session efficiency
    const duration =
      (session.endTime.getTime() - session.startTime.getTime()) /
      (1000 * 60 * 60); // hours
    const efficiency = this.calculateSessionEfficiency(session, duration);
    session.outcomes.efficiency = efficiency;

    // Generate final insights
    const finalInsights = await this.generateSessionSummary(session);

    // Move to history
    this.collaborationHistory.push(session);
    this.activeSessions.delete(sessionId);

    console.log(
      `🏁 Collaborative session ${sessionId} completed with ${efficiency}% efficiency`
    );

    return {
      summary: finalInsights.summary,
      achievements: session.outcomes.tasksCompleted,
      learnings: session.outcomes.knowledgeGained,
      efficiency,
      recommendations: finalInsights.recommendations,
    };
  }

  // Private helper methods

  private async shouldAutoApprove(
    request: MemoryShareRequest
  ): Promise<boolean> {
    const fromAgent = this.agentProfiles.get(request.fromAgent);
    const toAgent = this.agentProfiles.get(request.toAgent);

    if (!fromAgent || !toAgent) return false;

    // Check trust levels
    const trustThreshold =
      fromAgent.trustLevel >= this.config.autoApproveThreshold &&
      toAgent.trustLevel >= this.config.autoApproveThreshold;

    // Check sensitivity
    const lowSensitivity = request.metadata.sensitivityLevel === 'low';

    // Check agent preferences
    const preferencesAllow =
      fromAgent.preferences.shareOwnMemories &&
      toAgent.preferences.acceptSharedMemories;

    return trustThreshold && lowSensitivity && preferencesAllow;
  }

  private calculateExpectedValue(
    fromAgent: string,
    toAgent: string,
    purpose: SharePurpose
  ): number {
    // Simplified value calculation based on agent compatibility and purpose
    const purposeValues = {
      task_collaboration: 0.8,
      knowledge_sharing: 0.7,
      problem_solving: 0.9,
      context_enrichment: 0.6,
      skill_transfer: 0.8,
      quality_improvement: 0.7,
    };

    return purposeValues[purpose] || 0.5;
  }

  private assessSensitivity(memoryIds: string[]): 'low' | 'medium' | 'high' {
    // Simplified sensitivity assessment
    // In real implementation, would analyze memory content and context
    if (memoryIds.length > 10) return 'high';
    if (memoryIds.length > 5) return 'medium';
    return 'low';
  }

  private determineAccessLevel(request: MemoryShareRequest): AccessLevel {
    if (request.metadata.sensitivityLevel === 'high') return 'restricted';
    if (request.metadata.sensitivityLevel === 'medium') return 'shared';
    return 'public';
  }

  private async getOrCreateCollaborationSession(
    participants: string[],
    purpose: SharePurpose
  ): Promise<string> {
    // Look for existing active session with same participants
    for (const [sessionId, session] of this.activeSessions.entries()) {
      const sameParticipants =
        participants.every(p => session.participants.includes(p)) &&
        session.participants.every(p => participants.includes(p));

      if (sameParticipants && session.purpose === purpose) {
        return sessionId;
      }
    }

    // Create new session
    const sessionId = `auto_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session: CollaborationSession = {
      id: sessionId,
      participants,
      purpose,
      startTime: new Date(),
      sharedMemories: [],
      insights: [],
      outcomes: {
        tasksCompleted: [],
        knowledgeGained: [],
        problemsSolved: [],
        efficiency: 0,
      },
      isActive: true,
    };

    this.activeSessions.set(sessionId, session);
    return sessionId;
  }

  private updateCollaborationHistory(
    fromAgent: string,
    toAgent: string,
    successful: boolean
  ): void {
    const fromProfile = this.agentProfiles.get(fromAgent);
    const toProfile = this.agentProfiles.get(toAgent);

    if (fromProfile) {
      fromProfile.collaborationHistory.totalInteractions++;
      if (successful) {
        fromProfile.collaborationHistory.successfulShares++;
      }
      fromProfile.collaborationHistory.lastInteraction = new Date();
    }

    if (toProfile) {
      toProfile.collaborationHistory.totalInteractions++;
      toProfile.collaborationHistory.lastInteraction = new Date();
    }
  }

  private async calculateCompatibilityScore(
    requestingAgent: AgentProfile,
    candidate: AgentProfile,
    task: string,
    requiredSkills: string[]
  ): Promise<{ score: number; reason: string }> {
    let score = 0;
    const reasons: string[] = [];

    // Trust level compatibility
    const trustScore = (requestingAgent.trustLevel + candidate.trustLevel) / 2;
    score += trustScore * 0.3;
    if (trustScore > 0.7) reasons.push('High mutual trust');

    // Skill matching
    const skillMatch =
      requiredSkills.filter(
        skill =>
          candidate.capabilities.includes(skill) ||
          candidate.specializations.includes(skill)
      ).length / Math.max(requiredSkills.length, 1);
    score += skillMatch * 0.4;
    if (skillMatch > 0.5) reasons.push('Strong skill alignment');

    // Agent type complementarity
    const typeCompatibility = this.config.enableCrossTypeCollaboration
      ? this.getTypeCompatibility(requestingAgent.type, candidate.type)
      : 0.5;
    score += typeCompatibility * 0.2;

    // Collaboration history
    const historyScore =
      candidate.collaborationHistory.successfulShares > 0
        ? candidate.collaborationHistory.successfulShares /
          candidate.collaborationHistory.totalInteractions
        : 0.5;
    score += historyScore * 0.1;

    return {
      score: Math.min(1, score),
      reason: reasons.join(', ') || 'Basic compatibility',
    };
  }

  private getTypeCompatibility(type1: AgentType, type2: AgentType): number {
    const compatibilityMatrix: Record<AgentType, Record<AgentType, number>> = {
      assistant: {
        specialist: 0.8,
        coordinator: 0.9,
        analyst: 0.7,
        creative: 0.6,
        technical: 0.7,
        research: 0.6,
        assistant: 0.5,
      },
      specialist: {
        assistant: 0.8,
        coordinator: 0.7,
        analyst: 0.9,
        creative: 0.5,
        technical: 0.8,
        research: 0.7,
        specialist: 0.6,
      },
      coordinator: {
        assistant: 0.9,
        specialist: 0.7,
        analyst: 0.8,
        creative: 0.7,
        technical: 0.6,
        research: 0.6,
        coordinator: 0.4,
      },
      analyst: {
        assistant: 0.7,
        specialist: 0.9,
        coordinator: 0.8,
        creative: 0.6,
        technical: 0.8,
        research: 0.9,
        analyst: 0.5,
      },
      creative: {
        assistant: 0.6,
        specialist: 0.5,
        coordinator: 0.7,
        analyst: 0.6,
        technical: 0.5,
        research: 0.7,
        creative: 0.8,
      },
      technical: {
        assistant: 0.7,
        specialist: 0.8,
        coordinator: 0.6,
        analyst: 0.8,
        creative: 0.5,
        research: 0.6,
        technical: 0.7,
      },
      research: {
        assistant: 0.6,
        specialist: 0.7,
        coordinator: 0.6,
        analyst: 0.9,
        creative: 0.7,
        technical: 0.6,
        research: 0.8,
      },
    };

    return compatibilityMatrix[type1]?.[type2] || 0.5;
  }

  private async detectCrossAgentPatterns(
    memories: MemoryMetadata[],
    participants: string[]
  ): Promise<
    Array<{
      insight: string;
      confidence: number;
      contributingAgents: string[];
      supportingMemories: string[];
    }>
  > {
    // Simplified cross-agent pattern detection
    const insights: Array<{
      insight: string;
      confidence: number;
      contributingAgents: string[];
      supportingMemories: string[];
    }> = [];

    // Find common themes across agents
    const agentMemories = new Map<string, MemoryMetadata[]>();
    for (const memory of memories) {
      if (memory.agent_id && participants.includes(memory.agent_id)) {
        if (!agentMemories.has(memory.agent_id)) {
          agentMemories.set(memory.agent_id, []);
        }
        agentMemories.get(memory.agent_id)!.push(memory);
      }
    }

    // Find common tags across agents
    const commonTags = new Map<string, Set<string>>();
    for (const [agentId, agentMems] of agentMemories.entries()) {
      for (const memory of agentMems) {
        for (const tag of memory.tags) {
          if (!commonTags.has(tag)) {
            commonTags.set(tag, new Set());
          }
          commonTags.get(tag)!.add(agentId);
        }
      }
    }

    // Generate insights for tags shared by multiple agents
    for (const [tag, agentSet] of commonTags.entries()) {
      if (agentSet.size > 1) {
        const supportingMemories = memories
          .filter(
            m => m.tags.includes(tag) && m.agent_id && agentSet.has(m.agent_id)
          )
          .map(m => m.id);

        insights.push({
          insight: `Multiple agents share expertise in "${tag}" domain`,
          confidence: Math.min(0.9, agentSet.size / participants.length),
          contributingAgents: Array.from(agentSet),
          supportingMemories,
        });
      }
    }

    return insights;
  }

  private async identifyKnowledgeGaps(
    memories: MemoryMetadata[],
    participants: string[]
  ): Promise<
    Array<{
      insight: string;
      confidence: number;
      contributingAgents: string[];
      supportingMemories: string[];
    }>
  > {
    // Simplified knowledge gap identification
    const insights: Array<{
      insight: string;
      confidence: number;
      contributingAgents: string[];
      supportingMemories: string[];
    }> = [];

    // Identify areas where only one agent has knowledge
    const agentTopics = new Map<string, Set<string>>();

    for (const memory of memories) {
      if (memory.agent_id && participants.includes(memory.agent_id)) {
        if (!agentTopics.has(memory.agent_id)) {
          agentTopics.set(memory.agent_id, new Set());
        }
        for (const tag of memory.tags) {
          agentTopics.get(memory.agent_id)!.add(tag);
        }
      }
    }

    // Find unique knowledge areas
    for (const [agentId, topics] of agentTopics.entries()) {
      for (const topic of topics) {
        const otherAgentsWithTopic = Array.from(agentTopics.entries()).filter(
          ([otherId, otherTopics]) =>
            otherId !== agentId && otherTopics.has(topic)
        ).length;

        if (otherAgentsWithTopic === 0) {
          insights.push({
            insight: `Agent ${agentId} has unique expertise in "${topic}" - knowledge sharing opportunity`,
            confidence: 0.8,
            contributingAgents: [agentId],
            supportingMemories: memories
              .filter(m => m.agent_id === agentId && m.tags.includes(topic))
              .map(m => m.id),
          });
        }
      }
    }

    return insights;
  }

  private async analyzeComplementaryCapabilities(
    participants: string[]
  ): Promise<
    Array<{
      insight: string;
      confidence: number;
      contributingAgents: string[];
      supportingMemories: string[];
    }>
  > {
    const insights: Array<{
      insight: string;
      confidence: number;
      contributingAgents: string[];
      supportingMemories: string[];
    }> = [];

    const agentProfiles = participants
      .map(id => this.agentProfiles.get(id))
      .filter((profile): profile is AgentProfile => profile !== undefined);

    if (agentProfiles.length < 2) return insights;

    // Analyze capability complementarity
    const allCapabilities = new Set<string>();
    agentProfiles.forEach(profile => {
      profile.capabilities.forEach(cap => allCapabilities.add(cap));
      profile.specializations.forEach(spec => allCapabilities.add(spec));
    });

    for (const capability of allCapabilities) {
      const agentsWithCapability = agentProfiles.filter(
        profile =>
          profile.capabilities.includes(capability) ||
          profile.specializations.includes(capability)
      );

      if (agentsWithCapability.length > 1) {
        insights.push({
          insight: `Synergistic "${capability}" capabilities across ${agentsWithCapability.length} agents`,
          confidence: 0.7,
          contributingAgents: agentsWithCapability.map(a => a.id),
          supportingMemories: [],
        });
      }
    }

    return insights;
  }

  private async suggestMemoriesForCollaboration(
    participants: string[],
    purpose: SharePurpose,
    problemDescription: string
  ): Promise<
    Array<{
      memoryId: string;
      agent: string;
      relevanceScore: number;
      reason: string;
    }>
  > {
    // Simplified memory suggestion algorithm
    const suggestions: Array<{
      memoryId: string;
      agent: string;
      relevanceScore: number;
      reason: string;
    }> = [];

    // This would be implemented with actual memory retrieval and analysis
    // For now, return empty array as placeholder

    return suggestions;
  }

  private calculateSessionEfficiency(
    session: CollaborationSession,
    durationHours: number
  ): number {
    // Simplified efficiency calculation
    const insightsPerHour =
      session.insights.length / Math.max(durationHours, 0.1);
    const memoriesSharedPerHour =
      session.sharedMemories.length / Math.max(durationHours, 0.1);
    const participantEfficiency = session.participants.length > 1 ? 1 : 0.5;

    const efficiency = Math.min(
      100,
      insightsPerHour * 20 +
        memoriesSharedPerHour * 10 +
        participantEfficiency * 30
    );

    return Math.round(efficiency);
  }

  private async generateSessionSummary(session: CollaborationSession): Promise<{
    summary: string;
    recommendations: string[];
  }> {
    const duration = session.endTime
      ? (session.endTime.getTime() - session.startTime.getTime()) / (1000 * 60)
      : 0;

    const summary =
      `Collaborative session completed with ${session.participants.length} agents over ${Math.round(duration)} minutes. ` +
      `Generated ${session.insights.length} insights from ${session.sharedMemories.length} shared memories. ` +
      `Efficiency: ${session.outcomes.efficiency}%.`;

    const recommendations = [
      'Schedule follow-up sessions for ongoing collaboration',
      'Document key insights for future reference',
      'Consider expanding successful collaboration patterns',
      'Review and optimize memory sharing processes',
    ];

    return { summary, recommendations };
  }

  /**
   * Get collaboration analytics
   */
  getCollaborationAnalytics(): {
    totalSessions: number;
    activeSessions: number;
    averageEfficiency: number;
    topCollaborators: Array<{ agentId: string; collaborations: number }>;
    collaborationTrends: Array<{ purpose: SharePurpose; count: number }>;
  } {
    const totalSessions =
      this.collaborationHistory.length + this.activeSessions.size;
    const activeSessions = this.activeSessions.size;

    const avgEfficiency =
      this.collaborationHistory.length > 0
        ? this.collaborationHistory.reduce(
            (sum, session) => sum + session.outcomes.efficiency,
            0
          ) / this.collaborationHistory.length
        : 0;

    const collaboratorCounts = new Map<string, number>();
    const purposeCounts = new Map<SharePurpose, number>();

    [...this.collaborationHistory, ...this.activeSessions.values()].forEach(
      session => {
        session.participants.forEach(participant => {
          collaboratorCounts.set(
            participant,
            (collaboratorCounts.get(participant) || 0) + 1
          );
        });
        purposeCounts.set(
          session.purpose,
          (purposeCounts.get(session.purpose) || 0) + 1
        );
      }
    );

    const topCollaborators = Array.from(collaboratorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([agentId, collaborations]) => ({ agentId, collaborations }));

    const collaborationTrends = Array.from(purposeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([purpose, count]) => ({ purpose, count }));

    return {
      totalSessions,
      activeSessions,
      averageEfficiency: Math.round(avgEfficiency),
      topCollaborators,
      collaborationTrends,
    };
  }
}

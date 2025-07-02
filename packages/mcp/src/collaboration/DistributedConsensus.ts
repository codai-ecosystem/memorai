/**
 * MCP v3.0 - Distributed Consensus System
 * Consensus protocols for multi-agent decision making and data agreement
 */

// MCP v3.0 types - will be integrated with main types
interface Memory {
  id: string;
  content: string;
  type: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ConsensusProposal {
  id: string;
  type: ProposalType;
  proposer: string;
  title: string;
  description: string;
  data: any;
  targetAgents: string[];
  requiredParticipants: number;
  threshold: number; // 0-1 scale (percentage of agreement needed)
  timeout: number;
  createdAt: number;
  status: ProposalStatus;
  votes: Vote[];
  result?: ConsensusResult;
}

export type ProposalType =
  | 'memory_update' // Update shared memory
  | 'policy_change' // Change system policy
  | 'agent_action' // Coordinate agent action
  | 'resource_allocation' // Allocate shared resources
  | 'conflict_resolution' // Resolve conflicts
  | 'configuration' // System configuration change
  | 'emergency_action' // Emergency response
  | 'custom'; // Custom proposal type

export type ProposalStatus =
  | 'pending' // Waiting for votes
  | 'voting' // Active voting period
  | 'passed' // Consensus reached, approved
  | 'rejected' // Consensus reached, rejected
  | 'expired' // Timeout reached
  | 'cancelled' // Cancelled by proposer
  | 'executing' // Being executed
  | 'completed'; // Execution completed

export interface Vote {
  agentId: string;
  decision: VoteDecision;
  weight: number;
  confidence: number;
  reasoning?: string;
  timestamp: number;
  signature?: string; // For verification
}

export type VoteDecision = 'approve' | 'reject' | 'abstain';

export interface ConsensusResult {
  outcome: 'approved' | 'rejected';
  finalTally: VoteTally;
  confidence: number;
  participationRate: number;
  consensusQuality: number;
  executionPlan?: ExecutionPlan;
}

export interface VoteTally {
  approve: number;
  reject: number;
  abstain: number;
  totalWeight: number;
  participantCount: number;
}

export interface ExecutionPlan {
  steps: ExecutionStep[];
  estimatedDuration: number;
  dependencies: string[];
  rollbackPlan?: string[];
}

export interface ExecutionStep {
  id: string;
  description: string;
  agentId: string;
  action: string;
  parameters: Record<string, any>;
  timeout: number;
  retries: number;
}

export interface ConsensusProtocol {
  name: string;
  type: ProtocolType;
  parameters: ProtocolParameters;
  enabled: boolean;
  priority: number;
}

export type ProtocolType =
  | 'simple_majority' // 50% + 1
  | 'supermajority' // 66% or higher
  | 'unanimous' // 100% agreement
  | 'weighted_voting' // Weight-based voting
  | 'byzantine_fault' // Byzantine fault tolerance
  | 'raft' // Raft consensus algorithm
  | 'pbft' // Practical Byzantine Fault Tolerance
  | 'hybrid'; // Hybrid approach

export interface ProtocolParameters {
  threshold: number;
  timeout: number;
  maxRetries: number;
  byzantineTolerance?: number;
  weightFunction?: string;
  tieBreaker?: 'random' | 'proposer' | 'oldest_agent' | 'highest_weight';
  verificationRequired?: boolean;
}

export interface ConsensusMetrics {
  totalProposals: number;
  successfulConsensus: number;
  averageConsensusTime: number;
  participationRates: Map<string, number>;
  consensusQuality: number;
  protocolEffectiveness: Map<ProtocolType, number>;
  agentReliability: Map<string, number>;
}

export interface AgentParticipant {
  agentId: string;
  weight: number;
  reliability: number;
  expertise: string[];
  status: 'active' | 'inactive' | 'suspended';
  lastSeen: number;
  votingHistory: VotingHistory;
}

export interface VotingHistory {
  totalVotes: number;
  correctPredictions: number;
  averageConfidence: number;
  responsiveness: number; // How quickly they respond to proposals
  consistencyScore: number;
}

export interface ConsensusEvent {
  type:
    | 'proposal_created'
    | 'vote_cast'
    | 'consensus_reached'
    | 'execution_started'
    | 'execution_completed';
  proposalId: string;
  agentId: string;
  timestamp: number;
  data: any;
}

export class DistributedConsensus {
  private proposals: Map<string, ConsensusProposal> = new Map();
  private participants: Map<string, AgentParticipant> = new Map();
  private protocols: Map<string, ConsensusProtocol> = new Map();
  private events: ConsensusEvent[] = [];
  private metrics: ConsensusMetrics = {
    totalProposals: 0,
    successfulConsensus: 0,
    averageConsensusTime: 0,
    participationRates: new Map(),
    consensusQuality: 0,
    protocolEffectiveness: new Map(),
    agentReliability: new Map(),
  };

  private executionQueue: Array<{
    proposal: ConsensusProposal;
    plan: ExecutionPlan;
  }> = [];
  private isExecuting = false;

  constructor(
    private localAgentId: string,
    private config: ConsensusConfig = {
      defaultProtocol: 'simple_majority',
      defaultTimeout: 300000, // 5 minutes
      maxProposalsPerAgent: 10,
      enableByzantineProtection: true,
      autoExecute: true,
      participantVerification: true,
      eventLogging: true,
    }
  ) {
    this.initializeProtocols();
    this.registerLocalParticipant();
    this.startEventLoop();
  }

  /**
   * Create a new consensus proposal
   */
  async createProposal(
    type: ProposalType,
    title: string,
    description: string,
    data: any,
    options: Partial<{
      targetAgents: string[];
      requiredParticipants: number;
      threshold: number;
      timeout: number;
      protocol: ProtocolType;
    }> = {}
  ): Promise<string> {
    const proposalId = this.generateProposalId();

    // Determine target agents
    const targetAgents =
      options.targetAgents ||
      Array.from(this.participants.keys()).filter(
        id => id !== this.localAgentId
      );

    // Select appropriate protocol
    const protocolType =
      options.protocol || this.selectOptimalProtocol(type, targetAgents.length);
    const protocol = this.protocols.get(protocolType);

    if (!protocol || !protocol.enabled) {
      throw new Error(`Protocol not available: ${protocolType}`);
    }

    const proposal: ConsensusProposal = {
      id: proposalId,
      type,
      proposer: this.localAgentId,
      title,
      description,
      data,
      targetAgents,
      requiredParticipants:
        options.requiredParticipants || Math.ceil(targetAgents.length * 0.67),
      threshold: options.threshold || protocol.parameters.threshold,
      timeout: options.timeout || protocol.parameters.timeout,
      createdAt: Date.now(),
      status: 'pending',
      votes: [],
    };

    this.proposals.set(proposalId, proposal);
    this.metrics.totalProposals++;

    // Broadcast proposal to target agents
    await this.broadcastProposal(proposal);

    // Start voting process
    proposal.status = 'voting';
    this.scheduleTimeout(proposal);

    // Log event
    this.logEvent('proposal_created', proposalId, this.localAgentId, {
      type,
      title,
    });

    console.log(`Consensus proposal created: ${proposalId} (${title})`);
    return proposalId;
  }

  /**
   * Cast a vote on a proposal
   */
  async castVote(
    proposalId: string,
    decision: VoteDecision,
    confidence: number = 1.0,
    reasoning?: string
  ): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.status !== 'voting') {
      throw new Error(`Proposal not in voting state: ${proposalId}`);
    }

    if (!proposal.targetAgents.includes(this.localAgentId)) {
      throw new Error(`Agent not eligible to vote on proposal: ${proposalId}`);
    }

    // Check if agent already voted
    const existingVoteIndex = proposal.votes.findIndex(
      vote => vote.agentId === this.localAgentId
    );

    const participant = this.participants.get(this.localAgentId);
    const weight = participant?.weight || 1.0;

    const vote: Vote = {
      agentId: this.localAgentId,
      decision,
      weight,
      confidence: Math.max(0, Math.min(1, confidence)),
      reasoning,
      timestamp: Date.now(),
      signature: this.config.participantVerification
        ? this.generateVoteSignature(proposal, decision)
        : undefined,
    };

    if (existingVoteIndex >= 0) {
      // Update existing vote
      proposal.votes[existingVoteIndex] = vote;
    } else {
      // Add new vote
      proposal.votes.push(vote);
    }

    // Update participant voting history
    this.updateVotingHistory(this.localAgentId, vote);

    // Check if consensus is reached
    const consensusCheck = await this.checkConsensus(proposal);
    if (consensusCheck.reached) {
      await this.finalizeConsensus(proposal, consensusCheck.result);
    }

    // Log event
    this.logEvent('vote_cast', proposalId, this.localAgentId, {
      decision,
      confidence,
    });

    console.log(
      `Vote cast on proposal ${proposalId}: ${decision} (confidence: ${confidence})`
    );
  }

  /**
   * Get proposal by ID
   */
  getProposal(proposalId: string): ConsensusProposal | undefined {
    return this.proposals.get(proposalId);
  }

  /**
   * Get proposals by criteria
   */
  getProposals(criteria: {
    status?: ProposalStatus;
    type?: ProposalType;
    proposer?: string;
    participant?: string;
    timeRange?: { start?: number; end?: number };
  }): ConsensusProposal[] {
    let proposals = Array.from(this.proposals.values());

    if (criteria.status) {
      proposals = proposals.filter(p => p.status === criteria.status);
    }

    if (criteria.type) {
      proposals = proposals.filter(p => p.type === criteria.type);
    }

    if (criteria.proposer) {
      proposals = proposals.filter(p => p.proposer === criteria.proposer);
    }

    if (criteria.participant) {
      proposals = proposals.filter(
        p =>
          p.targetAgents.includes(criteria.participant!) ||
          p.votes.some(v => v.agentId === criteria.participant)
      );
    }

    if (criteria.timeRange) {
      proposals = proposals.filter(p => {
        const time = p.createdAt;
        return (
          (!criteria.timeRange!.start || time >= criteria.timeRange!.start) &&
          (!criteria.timeRange!.end || time <= criteria.timeRange!.end)
        );
      });
    }

    return proposals.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * Register a new participant
   */
  async registerParticipant(
    agentId: string,
    weight: number = 1.0,
    expertise: string[] = []
  ): Promise<void> {
    const participant: AgentParticipant = {
      agentId,
      weight: Math.max(0.1, Math.min(10.0, weight)), // Bounded weight
      reliability: 1.0, // Start with perfect reliability
      expertise,
      status: 'active',
      lastSeen: Date.now(),
      votingHistory: {
        totalVotes: 0,
        correctPredictions: 0,
        averageConfidence: 0,
        responsiveness: 1.0,
        consistencyScore: 1.0,
      },
    };

    this.participants.set(agentId, participant);
    console.log(`Participant registered: ${agentId} (weight: ${weight})`);
  }

  /**
   * Update participant status
   */
  async updateParticipantStatus(
    agentId: string,
    status: AgentParticipant['status']
  ): Promise<void> {
    const participant = this.participants.get(agentId);
    if (participant) {
      participant.status = status;
      participant.lastSeen = Date.now();
      console.log(`Participant status updated: ${agentId} -> ${status}`);
    }
  }

  /**
   * Get consensus statistics
   */
  getConsensusStats(): {
    overview: ConsensusMetrics;
    recentProposals: ConsensusProposal[];
    topParticipants: Array<{
      agentId: string;
      reliability: number;
      participation: number;
    }>;
    protocolPerformance: Array<{
      protocol: ProtocolType;
      effectiveness: number;
      usage: number;
    }>;
    trends: {
      consensusTimesByType: Map<ProposalType, number>;
      participationTrends: Map<string, number[]>;
    };
  } {
    const recentProposals = this.getProposals({
      timeRange: { start: Date.now() - 24 * 60 * 60 * 1000 }, // Last 24 hours
    }).slice(0, 20);

    const topParticipants = Array.from(this.participants.values())
      .map(p => ({
        agentId: p.agentId,
        reliability: p.reliability,
        participation: this.metrics.participationRates.get(p.agentId) || 0,
      }))
      .sort(
        (a, b) =>
          b.reliability * b.participation - a.reliability * a.participation
      )
      .slice(0, 10);

    const protocolPerformance = Array.from(this.protocols.values())
      .map(p => ({
        protocol: p.type,
        effectiveness: this.metrics.protocolEffectiveness.get(p.type) || 0,
        usage: this.calculateProtocolUsage(p.type),
      }))
      .sort((a, b) => b.effectiveness - a.effectiveness);

    // Calculate trends
    const consensusTimesByType = new Map<ProposalType, number>();
    const proposalsByType = new Map<ProposalType, ConsensusProposal[]>();

    for (const proposal of this.proposals.values()) {
      if (!proposalsByType.has(proposal.type)) {
        proposalsByType.set(proposal.type, []);
      }
      proposalsByType.get(proposal.type)!.push(proposal);
    }

    for (const [type, proposals] of proposalsByType) {
      const completedProposals = proposals.filter(p => p.result);
      if (completedProposals.length > 0) {
        const avgTime =
          completedProposals.reduce((sum, p) => {
            const duration =
              (p.result ? Date.now() : p.createdAt) - p.createdAt;
            return sum + duration;
          }, 0) / completedProposals.length;
        consensusTimesByType.set(type, avgTime);
      }
    }

    return {
      overview: { ...this.metrics },
      recentProposals,
      topParticipants,
      protocolPerformance,
      trends: {
        consensusTimesByType,
        participationTrends: new Map(), // Would be populated with historical data
      },
    };
  }

  /**
   * Execute approved proposals
   */
  async executeProposal(proposalId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.status !== 'passed') {
      throw new Error(`Proposal not approved for execution: ${proposalId}`);
    }

    if (!proposal.result?.executionPlan) {
      throw new Error(
        `No execution plan available for proposal: ${proposalId}`
      );
    }

    proposal.status = 'executing';
    this.logEvent('execution_started', proposalId, this.localAgentId, {});

    try {
      await this.executeSteps(proposal.result.executionPlan);
      proposal.status = 'completed';
      this.logEvent('execution_completed', proposalId, this.localAgentId, {
        success: true,
      });
      console.log(`Proposal execution completed: ${proposalId}`);
    } catch (error) {
      console.error(`Proposal execution failed: ${proposalId}`, error);
      // Could implement rollback here
      throw error;
    }
  }

  /**
   * Private methods
   */

  private initializeProtocols(): void {
    // Simple Majority Protocol
    this.protocols.set('simple_majority', {
      name: 'Simple Majority',
      type: 'simple_majority',
      parameters: {
        threshold: 0.51,
        timeout: 300000,
        maxRetries: 3,
        tieBreaker: 'proposer',
      },
      enabled: true,
      priority: 1,
    });

    // Supermajority Protocol
    this.protocols.set('supermajority', {
      name: 'Supermajority',
      type: 'supermajority',
      parameters: {
        threshold: 0.67,
        timeout: 600000,
        maxRetries: 3,
        tieBreaker: 'proposer',
      },
      enabled: true,
      priority: 2,
    });

    // Unanimous Protocol
    this.protocols.set('unanimous', {
      name: 'Unanimous',
      type: 'unanimous',
      parameters: {
        threshold: 1.0,
        timeout: 900000,
        maxRetries: 5,
        tieBreaker: 'proposer',
      },
      enabled: true,
      priority: 3,
    });

    // Weighted Voting Protocol
    this.protocols.set('weighted_voting', {
      name: 'Weighted Voting',
      type: 'weighted_voting',
      parameters: {
        threshold: 0.6,
        timeout: 300000,
        maxRetries: 3,
        weightFunction: 'expertise_based',
        tieBreaker: 'highest_weight',
      },
      enabled: true,
      priority: 2,
    });
  }

  private registerLocalParticipant(): void {
    this.registerParticipant(this.localAgentId, 1.0, [
      'memory_management',
      'mcp_protocol',
    ]);
  }

  private selectOptimalProtocol(
    type: ProposalType,
    participantCount: number
  ): ProtocolType {
    // Emergency actions require unanimous consensus
    if (type === 'emergency_action') {
      return 'unanimous';
    }

    // Policy changes need supermajority
    if (type === 'policy_change' || type === 'configuration') {
      return 'supermajority';
    }

    // Small groups can use unanimous
    if (participantCount <= 3) {
      return 'unanimous';
    }

    // Large groups use weighted voting
    if (participantCount > 10) {
      return 'weighted_voting';
    }

    // Default to simple majority
    return 'simple_majority';
  }

  private async broadcastProposal(proposal: ConsensusProposal): Promise<void> {
    // Simulate broadcasting to target agents
    console.log(
      `Broadcasting proposal ${proposal.id} to ${proposal.targetAgents.length} agents`
    );

    // In real implementation, this would send to other agents via network
    for (const agentId of proposal.targetAgents) {
      if (this.participants.has(agentId)) {
        // Simulate network delay
        await new Promise(resolve =>
          setTimeout(resolve, Math.random() * 100 + 50)
        );
      }
    }
  }

  private scheduleTimeout(proposal: ConsensusProposal): void {
    setTimeout(async () => {
      if (proposal.status === 'voting') {
        proposal.status = 'expired';
        console.log(`Proposal expired: ${proposal.id}`);
        await this.handleExpiredProposal(proposal);
      }
    }, proposal.timeout);
  }

  private async handleExpiredProposal(
    proposal: ConsensusProposal
  ): Promise<void> {
    // Check if we can still reach consensus with current votes
    const consensusCheck = await this.checkConsensus(proposal);
    if (consensusCheck.reached) {
      await this.finalizeConsensus(proposal, consensusCheck.result);
    } else {
      // Update participant reliability scores for non-voters
      this.penalizeNonParticipants(proposal);
    }
  }

  private async checkConsensus(proposal: ConsensusProposal): Promise<{
    reached: boolean;
    result?: ConsensusResult;
  }> {
    const protocol = this.protocols.get(this.getProposalProtocol(proposal));
    if (!protocol) {
      return { reached: false };
    }

    const tally = this.calculateVoteTally(proposal);

    // Check minimum participation
    if (tally.participantCount < proposal.requiredParticipants) {
      return { reached: false };
    }

    let consensusReached = false;
    let outcome: 'approved' | 'rejected' = 'rejected';

    switch (protocol.type) {
      case 'simple_majority':
      case 'supermajority':
      case 'unanimous':
        const approvalRate = tally.approve / (tally.approve + tally.reject);
        consensusReached = approvalRate >= protocol.parameters.threshold;
        outcome = approvalRate > 0.5 ? 'approved' : 'rejected';
        break;

      case 'weighted_voting':
        const weightedApproval = this.calculateWeightedApproval(proposal);
        consensusReached = weightedApproval >= protocol.parameters.threshold;
        outcome = weightedApproval > 0.5 ? 'approved' : 'rejected';
        break;

      default:
        return { reached: false };
    }

    if (consensusReached) {
      const result: ConsensusResult = {
        outcome,
        finalTally: tally,
        confidence: this.calculateConsensusConfidence(proposal),
        participationRate:
          tally.participantCount / proposal.targetAgents.length,
        consensusQuality: this.calculateConsensusQuality(proposal, tally),
        executionPlan:
          outcome === 'approved'
            ? await this.generateExecutionPlan(proposal)
            : undefined,
      };

      return { reached: true, result };
    }

    return { reached: false };
  }

  private calculateVoteTally(proposal: ConsensusProposal): VoteTally {
    let approve = 0;
    let reject = 0;
    let abstain = 0;
    let totalWeight = 0;

    for (const vote of proposal.votes) {
      totalWeight += vote.weight;
      switch (vote.decision) {
        case 'approve':
          approve += vote.weight;
          break;
        case 'reject':
          reject += vote.weight;
          break;
        case 'abstain':
          abstain += vote.weight;
          break;
      }
    }

    return {
      approve,
      reject,
      abstain,
      totalWeight,
      participantCount: proposal.votes.length,
    };
  }

  private calculateWeightedApproval(proposal: ConsensusProposal): number {
    const tally = this.calculateVoteTally(proposal);
    return tally.totalWeight > 0 ? tally.approve / tally.totalWeight : 0;
  }

  private calculateConsensusConfidence(proposal: ConsensusProposal): number {
    if (proposal.votes.length === 0) return 0;

    const avgConfidence =
      proposal.votes.reduce((sum, vote) => sum + vote.confidence, 0) /
      proposal.votes.length;
    const participationRate =
      proposal.votes.length / proposal.targetAgents.length;

    return avgConfidence * participationRate;
  }

  private calculateConsensusQuality(
    proposal: ConsensusProposal,
    tally: VoteTally
  ): number {
    // Quality based on participation, confidence, and agreement level
    const participationScore =
      tally.participantCount / proposal.targetAgents.length;
    const agreementScore =
      Math.max(tally.approve, tally.reject) /
      (tally.approve + tally.reject + tally.abstain);
    const confidenceScore = this.calculateConsensusConfidence(proposal);

    return (
      participationScore * 0.3 + agreementScore * 0.4 + confidenceScore * 0.3
    );
  }

  private async generateExecutionPlan(
    proposal: ConsensusProposal
  ): Promise<ExecutionPlan> {
    // Generate execution plan based on proposal type and data
    const steps: ExecutionStep[] = [];

    switch (proposal.type) {
      case 'memory_update':
        steps.push({
          id: 'update_memory',
          description: 'Update shared memory',
          agentId: proposal.proposer,
          action: 'updateMemory',
          parameters: proposal.data,
          timeout: 30000,
          retries: 3,
        });
        break;

      case 'policy_change':
        steps.push({
          id: 'update_policy',
          description: 'Update system policy',
          agentId: proposal.proposer,
          action: 'updatePolicy',
          parameters: proposal.data,
          timeout: 60000,
          retries: 2,
        });
        break;

      default:
        steps.push({
          id: 'execute_proposal',
          description: `Execute ${proposal.type} proposal`,
          agentId: proposal.proposer,
          action: 'execute',
          parameters: proposal.data,
          timeout: 120000,
          retries: 1,
        });
    }

    return {
      steps,
      estimatedDuration: steps.reduce((sum, step) => sum + step.timeout, 0),
      dependencies: [],
      rollbackPlan: steps.map(step => `rollback_${step.id}`),
    };
  }

  private async finalizeConsensus(
    proposal: ConsensusProposal,
    result: ConsensusResult
  ): Promise<void> {
    proposal.result = result;
    proposal.status = result.outcome === 'approved' ? 'passed' : 'rejected';

    // Update metrics
    this.metrics.successfulConsensus++;
    this.updateParticipationMetrics(proposal);

    // Queue for execution if approved and auto-execute enabled
    if (
      result.outcome === 'approved' &&
      this.config.autoExecute &&
      result.executionPlan
    ) {
      this.executionQueue.push({ proposal, plan: result.executionPlan });
    }

    // Log event
    this.logEvent('consensus_reached', proposal.id, this.localAgentId, {
      outcome: result.outcome,
      quality: result.consensusQuality,
    });

    console.log(
      `Consensus reached for proposal ${proposal.id}: ${result.outcome}`
    );
  }

  private async executeSteps(plan: ExecutionPlan): Promise<void> {
    for (const step of plan.steps) {
      console.log(`Executing step: ${step.id} - ${step.description}`);

      // Simulate step execution
      await new Promise(resolve =>
        setTimeout(resolve, Math.random() * 1000 + 500)
      );

      // Could implement actual step execution here based on action type
      switch (step.action) {
        case 'updateMemory':
          await this.executeMemoryUpdate(step);
          break;
        case 'updatePolicy':
          await this.executePolicyUpdate(step);
          break;
        default:
          await this.executeGenericAction(step);
      }
    }
  }

  private async executeMemoryUpdate(step: ExecutionStep): Promise<void> {
    console.log(`Memory update executed: ${step.id}`);
    // Implementation would update actual memory
  }

  private async executePolicyUpdate(step: ExecutionStep): Promise<void> {
    console.log(`Policy update executed: ${step.id}`);
    // Implementation would update system policy
  }

  private async executeGenericAction(step: ExecutionStep): Promise<void> {
    console.log(`Generic action executed: ${step.id}`);
    // Implementation for generic actions
  }

  private updateParticipationMetrics(proposal: ConsensusProposal): void {
    for (const agentId of proposal.targetAgents) {
      const voted = proposal.votes.some(vote => vote.agentId === agentId);
      const currentRate = this.metrics.participationRates.get(agentId) || 0;

      if (voted) {
        this.metrics.participationRates.set(agentId, currentRate * 0.9 + 0.1);
      } else {
        this.metrics.participationRates.set(agentId, currentRate * 0.9);
      }
    }
  }

  private updateVotingHistory(agentId: string, vote: Vote): void {
    const participant = this.participants.get(agentId);
    if (participant) {
      participant.votingHistory.totalVotes++;
      participant.votingHistory.averageConfidence =
        (participant.votingHistory.averageConfidence *
          (participant.votingHistory.totalVotes - 1) +
          vote.confidence) /
        participant.votingHistory.totalVotes;
    }
  }

  private penalizeNonParticipants(proposal: ConsensusProposal): void {
    for (const agentId of proposal.targetAgents) {
      const voted = proposal.votes.some(vote => vote.agentId === agentId);
      if (!voted) {
        const participant = this.participants.get(agentId);
        if (participant) {
          participant.reliability *= 0.95; // Small penalty
        }
      }
    }
  }

  private getProposalProtocol(proposal: ConsensusProposal): ProtocolType {
    // Determine which protocol was used for this proposal
    return this.selectOptimalProtocol(
      proposal.type,
      proposal.targetAgents.length
    );
  }

  private calculateProtocolUsage(protocolType: ProtocolType): number {
    const proposalsUsingProtocol = Array.from(this.proposals.values()).filter(
      p => this.getProposalProtocol(p) === protocolType
    );

    return proposalsUsingProtocol.length / this.proposals.size;
  }

  private generateVoteSignature(
    proposal: ConsensusProposal,
    decision: VoteDecision
  ): string {
    // Simple signature generation (in real implementation, use proper cryptographic signing)
    const data = `${proposal.id}:${decision}:${this.localAgentId}:${Date.now()}`;
    return Buffer.from(data).toString('base64');
  }

  private logEvent(
    type: ConsensusEvent['type'],
    proposalId: string,
    agentId: string,
    data: any
  ): void {
    if (this.config.eventLogging) {
      this.events.push({
        type,
        proposalId,
        agentId,
        timestamp: Date.now(),
        data,
      });

      // Limit event history
      if (this.events.length > 10000) {
        this.events = this.events.slice(-5000);
      }
    }
  }

  private startEventLoop(): void {
    // Process execution queue
    setInterval(async () => {
      if (!this.isExecuting && this.executionQueue.length > 0) {
        this.isExecuting = true;
        try {
          const { proposal, plan } = this.executionQueue.shift()!;
          await this.executeProposal(proposal.id);
        } catch (error) {
          console.error('Execution queue error:', error);
        } finally {
          this.isExecuting = false;
        }
      }
    }, 5000);

    // Update metrics periodically
    setInterval(() => {
      this.updateMetrics();
    }, 60000);
  }

  private updateMetrics(): void {
    // Update consensus metrics
    const completedProposals = Array.from(this.proposals.values()).filter(
      p => p.result
    );

    if (completedProposals.length > 0) {
      const avgTime =
        completedProposals.reduce((sum, p) => {
          const duration = (p.result ? Date.now() : p.createdAt) - p.createdAt;
          return sum + duration;
        }, 0) / completedProposals.length;

      this.metrics.averageConsensusTime = avgTime;

      const avgQuality =
        completedProposals.reduce(
          (sum, p) => sum + (p.result?.consensusQuality || 0),
          0
        ) / completedProposals.length;

      this.metrics.consensusQuality = avgQuality;
    }
  }

  private generateProposalId(): string {
    return `proposal_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Public API methods
   */

  /**
   * Update consensus configuration
   */
  updateConfiguration(config: Partial<ConsensusConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get consensus configuration
   */
  getConfiguration(): ConsensusConfig {
    return { ...this.config };
  }

  /**
   * Get participant information
   */
  getParticipant(agentId: string): AgentParticipant | undefined {
    return this.participants.get(agentId);
  }

  /**
   * Get all participants
   */
  getParticipants(): AgentParticipant[] {
    return Array.from(this.participants.values());
  }

  /**
   * Get consensus events
   */
  getEvents(proposalId?: string, limit: number = 100): ConsensusEvent[] {
    let events = this.events;

    if (proposalId) {
      events = events.filter(e => e.proposalId === proposalId);
    }

    return events.slice(-limit).reverse();
  }

  /**
   * Cancel a proposal (only by proposer)
   */
  async cancelProposal(proposalId: string): Promise<void> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error(`Proposal not found: ${proposalId}`);
    }

    if (proposal.proposer !== this.localAgentId) {
      throw new Error('Only proposer can cancel proposal');
    }

    if (proposal.status !== 'pending' && proposal.status !== 'voting') {
      throw new Error(`Cannot cancel proposal in status: ${proposal.status}`);
    }

    proposal.status = 'cancelled';
    console.log(`Proposal cancelled: ${proposalId}`);
  }

  /**
   * Export consensus data
   */
  exportConsensusData(): {
    proposals: ConsensusProposal[];
    participants: AgentParticipant[];
    protocols: ConsensusProtocol[];
    metrics: ConsensusMetrics;
    events: ConsensusEvent[];
  } {
    return {
      proposals: Array.from(this.proposals.values()),
      participants: Array.from(this.participants.values()),
      protocols: Array.from(this.protocols.values()),
      metrics: { ...this.metrics },
      events: [...this.events],
    };
  }

  /**
   * Import consensus data
   */
  importConsensusData(data: {
    proposals?: ConsensusProposal[];
    participants?: AgentParticipant[];
    protocols?: ConsensusProtocol[];
    events?: ConsensusEvent[];
  }): void {
    if (data.proposals) {
      this.proposals.clear();
      for (const proposal of data.proposals) {
        this.proposals.set(proposal.id, proposal);
      }
    }

    if (data.participants) {
      this.participants.clear();
      for (const participant of data.participants) {
        this.participants.set(participant.agentId, participant);
      }
    }

    if (data.protocols) {
      this.protocols.clear();
      for (const protocol of data.protocols) {
        this.protocols.set(protocol.type, protocol);
      }
    }

    if (data.events) {
      this.events = [...data.events];
    }

    this.updateMetrics();
  }

  /**
   * Shutdown consensus system
   */
  shutdown(): void {
    // Cancel all pending proposals
    for (const proposal of this.proposals.values()) {
      if (proposal.status === 'pending' || proposal.status === 'voting') {
        proposal.status = 'cancelled';
      }
    }

    console.log('Distributed consensus system shutdown');
  }
}

// Configuration interface
interface ConsensusConfig {
  defaultProtocol: ProtocolType;
  defaultTimeout: number;
  maxProposalsPerAgent: number;
  enableByzantineProtection: boolean;
  autoExecute: boolean;
  participantVerification: boolean;
  eventLogging: boolean;
}

export default DistributedConsensus;

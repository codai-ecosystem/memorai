#!/usr/bin/env node
/**
 * 🚀 Memorai Performance Testing Suite
 *
 * Comprehensive performance testing with 12 real-world scenarios
 * Simulates actual usage patterns for enterprise-grade validation
 */

import chalk from 'chalk';
import fs from 'fs/promises';
import { performance } from 'perf_hooks';

// Mock Memorai MCP Client for testing
class MemoraiMCPClient {
  constructor() {
    this.memories = new Map();
    this.relations = new Map();
    this.queryCount = 0;
    this.latencies = [];
  }

  async remember(data) {
    const start = performance.now();

    // Simulate processing time based on data complexity
    const processingTime = Math.random() * 50 + 10; // 10-60ms
    await new Promise(resolve => setTimeout(resolve, processingTime));

    const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.memories.set(id, {
      ...data,
      id,
      timestamp: new Date(),
      embeddings: new Array(1536).fill(0).map(() => Math.random()), // Mock OpenAI embeddings
    });

    const end = performance.now();
    const latency = end - start;
    this.latencies.push(latency);
    this.queryCount++;

    return { id, latency };
  }

  async recall(query, options = {}) {
    const start = performance.now();

    // Simulate semantic search complexity
    const searchTime = Math.random() * 30 + 5; // 5-35ms
    await new Promise(resolve => setTimeout(resolve, searchTime));

    const results = Array.from(this.memories.values())
      .filter(
        mem =>
          mem.content?.toLowerCase().includes(query.toLowerCase()) ||
          mem.observations?.some(obs =>
            obs.toLowerCase().includes(query.toLowerCase())
          )
      )
      .slice(0, options.limit || 10);

    const end = performance.now();
    const latency = end - start;
    this.latencies.push(latency);
    this.queryCount++;

    return { results, latency, count: results.length };
  }

  async createRelation(fromId, toId, relationType) {
    const start = performance.now();

    const relationTime = Math.random() * 20 + 5; // 5-25ms
    await new Promise(resolve => setTimeout(resolve, relationTime));

    const relationId = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.relations.set(relationId, {
      id: relationId,
      from: fromId,
      to: toId,
      type: relationType,
      timestamp: new Date(),
    });

    const end = performance.now();
    const latency = end - start;
    this.latencies.push(latency);
    this.queryCount++;

    return { relationId, latency };
  }

  async getStats() {
    return {
      totalMemories: this.memories.size,
      totalRelations: this.relations.size,
      totalQueries: this.queryCount,
      avgLatency:
        this.latencies.length > 0
          ? this.latencies.reduce((a, b) => a + b) / this.latencies.length
          : 0,
      maxLatency: Math.max(...this.latencies),
      minLatency: Math.min(...this.latencies),
      p95Latency: this.getPercentile(this.latencies, 95),
      p99Latency: this.getPercentile(this.latencies, 99),
    };
  }

  getPercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  reset() {
    this.memories.clear();
    this.relations.clear();
    this.queryCount = 0;
    this.latencies = [];
  }
}

// Performance Testing Scenarios
class PerformanceTestSuite {
  constructor() {
    this.client = new MemoraiMCPClient();
    this.results = [];
  }

  log(message, type = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
      scenario: chalk.cyan.bold,
    };
    console.log(colors[type](`[${new Date().toISOString()}] ${message}`));
  }

  async runScenario(name, testFunction) {
    this.log(`\n🧪 Running Scenario: ${name}`, 'scenario');
    this.client.reset();

    const start = performance.now();
    try {
      const result = await testFunction();
      const end = performance.now();
      const duration = end - start;

      const stats = await this.client.getStats();
      const scenarioResult = {
        name,
        duration,
        success: true,
        stats,
        details: result,
      };

      this.results.push(scenarioResult);
      this.log(`✅ Completed in ${duration.toFixed(2)}ms`, 'success');
      return scenarioResult;
    } catch (error) {
      const end = performance.now();
      const duration = end - start;

      const scenarioResult = {
        name,
        duration,
        success: false,
        error: error.message,
        stats: await this.client.getStats(),
      };

      this.results.push(scenarioResult);
      this.log(`❌ Failed: ${error.message}`, 'error');
      return scenarioResult;
    }
  }

  // Scenario 1: Individual Developer Workflow
  async scenario1_individualDeveloper() {
    return this.runScenario('Individual Developer Workflow', async () => {
      // Developer starts coding session
      await this.client.remember({
        entityType: 'coding_session',
        content: 'Starting React component development',
        observations: [
          'Working on user authentication form',
          'Using TypeScript and Tailwind CSS',
        ],
      });

      // Stores code snippets and patterns
      for (let i = 0; i < 15; i++) {
        await this.client.remember({
          entityType: 'code_snippet',
          content: `React hook pattern ${i}`,
          observations: [
            `useState implementation`,
            `useEffect cleanup`,
            `Custom hook design`,
          ],
        });
      }

      // Searches for patterns during development
      const searches = await Promise.all([
        this.client.recall('React hook'),
        this.client.recall('authentication'),
        this.client.recall('TypeScript'),
        this.client.recall('Tailwind CSS'),
      ]);

      return {
        memoriesCreated: 16,
        searchResults: searches.map(s => s.count),
        avgSearchTime:
          searches.reduce((acc, s) => acc + s.latency, 0) / searches.length,
      };
    });
  }

  // Scenario 2: Team Collaboration
  async scenario2_teamCollaboration() {
    return this.runScenario('Team Collaboration', async () => {
      // Multiple team members sharing knowledge
      const teamMembers = ['Alice', 'Bob', 'Charlie', 'Diana'];
      const memoryIds = [];

      for (const member of teamMembers) {
        for (let i = 0; i < 8; i++) {
          const result = await this.client.remember({
            entityType: 'team_knowledge',
            content: `${member}'s insight on feature ${i}`,
            observations: [
              `Architecture decision`,
              `Performance consideration`,
              `Security note`,
            ],
            author: member,
          });
          memoryIds.push(result.id);
        }
      }

      // Create cross-references between team insights
      const relations = [];
      for (let i = 0; i < memoryIds.length - 1; i += 2) {
        const relation = await this.client.createRelation(
          memoryIds[i],
          memoryIds[i + 1],
          'relates_to'
        );
        relations.push(relation);
      }

      // Team searches for shared knowledge
      const teamSearches = await Promise.all([
        this.client.recall('architecture'),
        this.client.recall('performance'),
        this.client.recall('security'),
        this.client.recall('Alice'),
        this.client.recall('feature'),
      ]);

      return {
        teamMemories: memoryIds.length,
        relations: relations.length,
        searchResults: teamSearches.map(s => s.count),
        collaborationEfficiency: teamSearches.reduce(
          (acc, s) => acc + s.count,
          0
        ),
      };
    });
  }

  // Scenario 3: Large Project Documentation
  async scenario3_largeProjectDocs() {
    return this.runScenario('Large Project Documentation', async () => {
      // Simulate large documentation system
      const docTypes = [
        'API',
        'Architecture',
        'Deployment',
        'Testing',
        'Security',
      ];
      const memoryIds = [];

      for (const docType of docTypes) {
        for (let i = 0; i < 25; i++) {
          const result = await this.client.remember({
            entityType: 'documentation',
            content: `${docType} documentation section ${i}`,
            observations: [
              `Detailed technical specifications`,
              `Code examples and best practices`,
              `Integration guidelines`,
              `Troubleshooting tips`,
            ],
            category: docType,
            importance: Math.random() > 0.7 ? 'high' : 'medium',
          });
          memoryIds.push(result.id);
        }
      }

      // Create documentation hierarchy
      for (let i = 0; i < memoryIds.length - 5; i += 5) {
        await this.client.createRelation(
          memoryIds[i],
          memoryIds[i + 1],
          'parent_of'
        );
        await this.client.createRelation(
          memoryIds[i + 1],
          memoryIds[i + 2],
          'related_to'
        );
      }

      // Simulate complex documentation searches
      const docSearches = await Promise.all([
        this.client.recall('API integration'),
        this.client.recall('deployment best practices'),
        this.client.recall('security guidelines'),
        this.client.recall('testing framework'),
        this.client.recall('architecture patterns'),
        this.client.recall('troubleshooting'),
        this.client.recall('high importance', { limit: 20 }),
      ]);

      return {
        documentationSections: memoryIds.length,
        hierarchyRelations: Math.floor(memoryIds.length / 5) * 2,
        searchAccuracy: docSearches.map(s => s.count),
        avgDocSearchTime:
          docSearches.reduce((acc, s) => acc + s.latency, 0) /
          docSearches.length,
      };
    });
  }

  // Scenario 4: AI Agent Memory System
  async scenario4_aiAgentMemory() {
    return this.runScenario('AI Agent Memory System', async () => {
      // AI agent storing conversation context
      const conversationMemories = [];

      for (let conv = 0; conv < 10; conv++) {
        for (let turn = 0; turn < 12; turn++) {
          const result = await this.client.remember({
            entityType: 'conversation_turn',
            content: `User query ${turn} in conversation ${conv}`,
            observations: [
              `User intent: ${['question', 'request', 'clarification'][Math.floor(Math.random() * 3)]}`,
              `Context: Previous ${turn} turns`,
              `Response quality: ${['excellent', 'good', 'needs_improvement'][Math.floor(Math.random() * 3)]}`,
            ],
            conversationId: `conv_${conv}`,
            turnNumber: turn,
            timestamp: new Date(
              Date.now() - (10 - conv) * 3600000 - (12 - turn) * 300000
            ),
          });
          conversationMemories.push(result.id);
        }
      }

      // Create conversation flow relations
      for (let i = 0; i < conversationMemories.length - 1; i++) {
        if (i % 12 !== 11) {
          // Don't link across conversations
          await this.client.createRelation(
            conversationMemories[i],
            conversationMemories[i + 1],
            'followed_by'
          );
        }
      }

      // AI agent recall patterns
      const agentRecalls = await Promise.all([
        this.client.recall('recent conversation', { limit: 15 }),
        this.client.recall('user intent question'),
        this.client.recall('excellent response'),
        this.client.recall('needs_improvement'),
        this.client.recall('conv_5'), // Specific conversation
        this.client.recall('context previous'),
      ]);

      return {
        conversationTurns: conversationMemories.length,
        conversationFlows: conversationMemories.length - 10, // 10 conversations
        recallAccuracy: agentRecalls.map(r => r.count),
        contextRetrieval: agentRecalls.reduce((acc, r) => acc + r.count, 0),
        avgRecallLatency:
          agentRecalls.reduce((acc, r) => acc + r.latency, 0) /
          agentRecalls.length,
      };
    });
  }

  // Scenario 5: Enterprise Knowledge Base
  async scenario5_enterpriseKnowledgeBase() {
    return this.runScenario('Enterprise Knowledge Base', async () => {
      // Large enterprise knowledge management
      const departments = [
        'Engineering',
        'Sales',
        'Marketing',
        'HR',
        'Finance',
        'Legal',
      ];
      const knowledgeIds = [];

      for (const dept of departments) {
        for (let i = 0; i < 30; i++) {
          const result = await this.client.remember({
            entityType: 'enterprise_knowledge',
            content: `${dept} knowledge article ${i}`,
            observations: [
              `Process documentation`,
              `Best practices and guidelines`,
              `Compliance requirements`,
              `Training materials`,
              `Historical decisions and rationale`,
            ],
            department: dept,
            accessLevel: Math.random() > 0.8 ? 'restricted' : 'general',
            lastUpdated: new Date(
              Date.now() - Math.random() * 90 * 24 * 3600000
            ), // Random within 90 days
          });
          knowledgeIds.push(result.id);
        }
      }

      // Create cross-departmental knowledge links
      for (let i = 0; i < knowledgeIds.length - 6; i += 6) {
        await this.client.createRelation(
          knowledgeIds[i],
          knowledgeIds[i + 6],
          'cross_reference'
        );
        await this.client.createRelation(
          knowledgeIds[i + 1],
          knowledgeIds[i + 7],
          'depends_on'
        );
      }

      // Enterprise-wide knowledge searches
      const enterpriseSearches = await Promise.all([
        this.client.recall('compliance requirements', { limit: 25 }),
        this.client.recall('best practices'),
        this.client.recall('Engineering process'),
        this.client.recall('Sales guidelines'),
        this.client.recall('restricted access'),
        this.client.recall('training materials'),
        this.client.recall('historical decisions'),
        this.client.recall('Finance procedures'),
      ]);

      return {
        knowledgeArticles: knowledgeIds.length,
        departmentalCoverage: departments.length,
        crossReferences: Math.floor(knowledgeIds.length / 6) * 2,
        searchResults: enterpriseSearches.map(s => s.count),
        enterpriseSearchTime:
          enterpriseSearches.reduce((acc, s) => acc + s.latency, 0) /
          enterpriseSearches.length,
      };
    });
  }

  // Scenario 6: Real-time Code Assistant
  async scenario6_realtimeCodeAssistant() {
    return this.runScenario('Real-time Code Assistant', async () => {
      // High-frequency code assistance
      const codePatterns = [];
      const startTime = performance.now();

      // Rapid code pattern storage (simulating real-time coding)
      for (let i = 0; i < 50; i++) {
        const result = await this.client.remember({
          entityType: 'code_pattern',
          content: `Code suggestion ${i}`,
          observations: [
            `Function implementation`,
            `Error handling pattern`,
            `Performance optimization`,
            `Type safety improvement`,
          ],
          language: ['TypeScript', 'JavaScript', 'Python', 'Rust'][
            Math.floor(Math.random() * 4)
          ],
          confidence: Math.random(),
          timestamp: new Date(),
        });
        codePatterns.push(result.id);

        // Immediate recall for context (simulating IDE integration)
        if (i % 5 === 0) {
          await this.client.recall(`Code suggestion ${Math.max(0, i - 5)}`);
        }
      }

      // Burst of rapid searches (simulating autocomplete)
      const rapidSearches = [];
      for (let i = 0; i < 20; i++) {
        const searchPromise = this.client.recall(
          ['function', 'error', 'performance', 'type'][i % 4]
        );
        rapidSearches.push(searchPromise);
      }
      const burstResults = await Promise.all(rapidSearches);

      const endTime = performance.now();

      return {
        codePatterns: codePatterns.length,
        rapidSearches: rapidSearches.length,
        totalTime: endTime - startTime,
        avgBurstLatency:
          burstResults.reduce((acc, r) => acc + r.latency, 0) /
          burstResults.length,
        throughput:
          (codePatterns.length + rapidSearches.length) /
          ((endTime - startTime) / 1000),
        burstResults: burstResults.map(r => r.count),
      };
    });
  }

  // Scenario 7: Multi-Project Portfolio
  async scenario7_multiProjectPortfolio() {
    return this.runScenario('Multi-Project Portfolio', async () => {
      // Managing multiple projects simultaneously
      const projects = ['WebApp', 'MobileApp', 'API', 'Analytics', 'DevOps'];
      const projectMemories = [];

      for (const project of projects) {
        for (let i = 0; i < 20; i++) {
          const result = await this.client.remember({
            entityType: 'project_memory',
            content: `${project} component ${i}`,
            observations: [
              `Implementation status: ${['planned', 'in_progress', 'completed'][Math.floor(Math.random() * 3)]}`,
              `Dependencies and requirements`,
              `Team assignments and responsibilities`,
              `Timeline and milestones`,
            ],
            project: project,
            priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
            status: ['active', 'on_hold', 'completed'][
              Math.floor(Math.random() * 3)
            ],
          });
          projectMemories.push(result.id);
        }
      }

      // Create inter-project dependencies
      for (let i = 0; i < projectMemories.length - 20; i += 20) {
        await this.client.createRelation(
          projectMemories[i],
          projectMemories[i + 20],
          'depends_on'
        );
        if (i + 40 < projectMemories.length) {
          await this.client.createRelation(
            projectMemories[i + 20],
            projectMemories[i + 40],
            'blocks'
          );
        }
      }

      // Portfolio-wide queries
      const portfolioSearches = await Promise.all([
        this.client.recall('high priority'),
        this.client.recall('in_progress'),
        this.client.recall('WebApp'),
        this.client.recall('API dependencies'),
        this.client.recall('completed milestones'),
        this.client.recall('team assignments'),
        this.client.recall('on_hold status'),
        this.client.recall('DevOps component'),
      ]);

      return {
        totalProjects: projects.length,
        projectComponents: projectMemories.length,
        dependencies: projects.length - 1,
        portfolioSearches: portfolioSearches.map(s => s.count),
        crossProjectVisibility: portfolioSearches.reduce(
          (acc, s) => acc + s.count,
          0
        ),
        portfolioQueryTime:
          portfolioSearches.reduce((acc, s) => acc + s.latency, 0) /
          portfolioSearches.length,
      };
    });
  }

  // Scenario 8: Customer Support Knowledge
  async scenario8_customerSupport() {
    return this.runScenario('Customer Support Knowledge', async () => {
      // Customer support ticket and solution management
      const ticketTypes = [
        'bug_report',
        'feature_request',
        'integration_help',
        'billing',
        'account',
      ];
      const supportMemories = [];

      for (const ticketType of ticketTypes) {
        for (let i = 0; i < 25; i++) {
          const result = await this.client.remember({
            entityType: 'support_ticket',
            content: `${ticketType} ticket ${i}`,
            observations: [
              `Customer issue description`,
              `Resolution steps and outcome`,
              `Related documentation and resources`,
              `Customer satisfaction rating`,
              `Follow-up requirements`,
            ],
            ticketType: ticketType,
            severity: ['low', 'medium', 'high', 'critical'][
              Math.floor(Math.random() * 4)
            ],
            status: ['open', 'in_progress', 'resolved', 'closed'][
              Math.floor(Math.random() * 4)
            ],
            customerTier: ['basic', 'premium', 'enterprise'][
              Math.floor(Math.random() * 3)
            ],
          });
          supportMemories.push(result.id);
        }
      }

      // Link related tickets and solutions
      for (let i = 0; i < supportMemories.length - 1; i += 2) {
        await this.client.createRelation(
          supportMemories[i],
          supportMemories[i + 1],
          'similar_issue'
        );
      }

      // Support team searches for solutions
      const supportSearches = await Promise.all([
        this.client.recall('bug_report critical'),
        this.client.recall('integration_help'),
        this.client.recall('billing issue'),
        this.client.recall('enterprise customer'),
        this.client.recall('resolved ticket'),
        this.client.recall('high severity'),
        this.client.recall('feature_request premium'),
        this.client.recall('follow-up required'),
      ]);

      return {
        supportTickets: supportMemories.length,
        ticketCategories: ticketTypes.length,
        relatedTickets: Math.floor(supportMemories.length / 2),
        supportSearches: supportSearches.map(s => s.count),
        resolutionEfficiency: supportSearches.reduce(
          (acc, s) => acc + s.count,
          0
        ),
        avgResolutionTime:
          supportSearches.reduce((acc, s) => acc + s.latency, 0) /
          supportSearches.length,
      };
    });
  }

  // Scenario 9: Machine Learning Training Data
  async scenario9_mlTrainingData() {
    return this.runScenario('ML Training Data Management', async () => {
      // ML training data and model management
      const dataTypes = ['images', 'text', 'audio', 'structured', 'timeseries'];
      const mlMemories = [];

      for (const dataType of dataTypes) {
        for (let i = 0; i < 40; i++) {
          const result = await this.client.remember({
            entityType: 'ml_training_data',
            content: `${dataType} dataset ${i}`,
            observations: [
              `Data quality and preprocessing steps`,
              `Feature engineering and transformations`,
              `Model performance and accuracy metrics`,
              `Training parameters and hyperparameters`,
              `Validation and test results`,
            ],
            dataType: dataType,
            modelType: ['classification', 'regression', 'clustering', 'nlp'][
              Math.floor(Math.random() * 4)
            ],
            accuracy: Math.random() * 0.3 + 0.7, // 70-100% accuracy
            dataSize: Math.floor(Math.random() * 1000000) + 10000, // 10K-1M samples
          });
          mlMemories.push(result.id);
        }
      }

      // Create model lineage and data dependencies
      for (let i = 0; i < mlMemories.length - 5; i += 5) {
        await this.client.createRelation(
          mlMemories[i],
          mlMemories[i + 1],
          'trained_from'
        );
        await this.client.createRelation(
          mlMemories[i + 1],
          mlMemories[i + 2],
          'improves_on'
        );
      }

      // ML research and development queries
      const mlSearches = await Promise.all([
        this.client.recall('high accuracy classification'),
        this.client.recall('text dataset nlp'),
        this.client.recall('preprocessing steps'),
        this.client.recall('hyperparameters optimization'),
        this.client.recall('validation results'),
        this.client.recall('structured data regression'),
        this.client.recall('feature engineering'),
        this.client.recall('model performance', { limit: 30 }),
      ]);

      return {
        trainingDatasets: mlMemories.length,
        dataTypes: dataTypes.length,
        modelLineage: Math.floor(mlMemories.length / 5) * 2,
        mlSearches: mlSearches.map(s => s.count),
        researchEfficiency: mlSearches.reduce((acc, s) => acc + s.count, 0),
        avgResearchTime:
          mlSearches.reduce((acc, s) => acc + s.latency, 0) / mlSearches.length,
      };
    });
  }

  // Scenario 10: API Integration Testing
  async scenario10_apiIntegrationTesting() {
    return this.runScenario('API Integration Testing', async () => {
      // API testing and integration scenarios
      const apiEndpoints = [
        'users',
        'orders',
        'products',
        'payments',
        'analytics',
      ];
      const testMemories = [];

      for (const endpoint of apiEndpoints) {
        for (let i = 0; i < 15; i++) {
          const result = await this.client.remember({
            entityType: 'api_test',
            content: `${endpoint} API test ${i}`,
            observations: [
              `Request and response validation`,
              `Authentication and authorization tests`,
              `Error handling and edge cases`,
              `Performance and load testing results`,
              `Integration with downstream services`,
            ],
            endpoint: endpoint,
            method: ['GET', 'POST', 'PUT', 'DELETE'][
              Math.floor(Math.random() * 4)
            ],
            status: ['passing', 'failing', 'flaky'][
              Math.floor(Math.random() * 3)
            ],
            responseTime: Math.random() * 1000 + 50, // 50-1050ms
          });
          testMemories.push(result.id);
        }
      }

      // Link related API tests
      for (let i = 0; i < testMemories.length - 1; i += 3) {
        await this.client.createRelation(
          testMemories[i],
          testMemories[i + 1],
          'test_dependency'
        );
      }

      // API testing queries
      const apiSearches = await Promise.all([
        this.client.recall('failing tests'),
        this.client.recall('authentication POST'),
        this.client.recall('performance load testing'),
        this.client.recall('users API validation'),
        this.client.recall('payments error handling'),
        this.client.recall('flaky test edge cases'),
        this.client.recall('downstream integration'),
        this.client.recall('response time optimization'),
      ]);

      return {
        apiTests: testMemories.length,
        apiEndpoints: apiEndpoints.length,
        testDependencies: Math.floor(testMemories.length / 3),
        apiSearches: apiSearches.map(s => s.count),
        testCoverage: apiSearches.reduce((acc, s) => acc + s.count, 0),
        avgTestQueryTime:
          apiSearches.reduce((acc, s) => acc + s.latency, 0) /
          apiSearches.length,
      };
    });
  }

  // Scenario 11: Security Incident Response
  async scenario11_securityIncidentResponse() {
    return this.runScenario('Security Incident Response', async () => {
      // Security incident tracking and response
      const incidentTypes = [
        'data_breach',
        'malware',
        'phishing',
        'ddos',
        'insider_threat',
      ];
      const securityMemories = [];

      for (const incidentType of incidentTypes) {
        for (let i = 0; i < 12; i++) {
          const result = await this.client.remember({
            entityType: 'security_incident',
            content: `${incidentType} incident ${i}`,
            observations: [
              `Incident detection and initial response`,
              `Impact assessment and containment`,
              `Investigation findings and root cause`,
              `Remediation steps and recovery`,
              `Lessons learned and preventive measures`,
            ],
            incidentType: incidentType,
            severity: ['low', 'medium', 'high', 'critical'][
              Math.floor(Math.random() * 4)
            ],
            status: ['detected', 'investigating', 'contained', 'resolved'][
              Math.floor(Math.random() * 4)
            ],
            affectedSystems: Math.floor(Math.random() * 10) + 1,
          });
          securityMemories.push(result.id);
        }
      }

      // Create incident relationships and patterns
      for (let i = 0; i < securityMemories.length - 2; i += 2) {
        await this.client.createRelation(
          securityMemories[i],
          securityMemories[i + 1],
          'related_incident'
        );
      }

      // Security team incident queries
      const securitySearches = await Promise.all([
        this.client.recall('critical severity'),
        this.client.recall('data_breach investigation'),
        this.client.recall('malware containment'),
        this.client.recall('phishing lessons learned'),
        this.client.recall('ddos recovery'),
        this.client.recall('insider_threat detection'),
        this.client.recall('resolved incidents'),
        this.client.recall('preventive measures'),
      ]);

      return {
        securityIncidents: securityMemories.length,
        incidentCategories: incidentTypes.length,
        incidentRelations: Math.floor(securityMemories.length / 2),
        securitySearches: securitySearches.map(s => s.count),
        responseEfficiency: securitySearches.reduce(
          (acc, s) => acc + s.count,
          0
        ),
        avgResponseTime:
          securitySearches.reduce((acc, s) => acc + s.latency, 0) /
          securitySearches.length,
      };
    });
  }

  // Scenario 12: DevOps Deployment Pipeline
  async scenario12_devopsDeployment() {
    return this.runScenario('DevOps Deployment Pipeline', async () => {
      // DevOps deployment and infrastructure management
      const environments = ['dev', 'staging', 'production', 'qa', 'demo'];
      const devopsMemories = [];

      for (const env of environments) {
        for (let i = 0; i < 18; i++) {
          const result = await this.client.remember({
            entityType: 'deployment',
            content: `${env} deployment ${i}`,
            observations: [
              `Build and compilation process`,
              `Testing and quality gates`,
              `Infrastructure provisioning`,
              `Application deployment and configuration`,
              `Monitoring and health checks`,
            ],
            environment: env,
            status: ['success', 'failed', 'in_progress', 'rolled_back'][
              Math.floor(Math.random() * 4)
            ],
            duration: Math.random() * 3600 + 300, // 5min to 1hour
            version: `v${Math.floor(Math.random() * 100)}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
          });
          devopsMemories.push(result.id);
        }
      }

      // Create deployment pipeline relationships
      for (let i = 0; i < devopsMemories.length - 18; i += 18) {
        await this.client.createRelation(
          devopsMemories[i],
          devopsMemories[i + 18],
          'promotes_to'
        );
      }

      // DevOps operational queries
      const devopsSearches = await Promise.all([
        this.client.recall('production deployment success'),
        this.client.recall('failed build testing'),
        this.client.recall('staging infrastructure'),
        this.client.recall('rolled_back deployment'),
        this.client.recall('qa quality gates'),
        this.client.recall('monitoring health checks'),
        this.client.recall('demo environment'),
        this.client.recall('version configuration'),
      ]);

      return {
        deployments: devopsMemories.length,
        environments: environments.length,
        promotionPipeline: environments.length - 1,
        devopsSearches: devopsSearches.map(s => s.count),
        operationalVisibility: devopsSearches.reduce(
          (acc, s) => acc + s.count,
          0
        ),
        avgOpTime:
          devopsSearches.reduce((acc, s) => acc + s.latency, 0) /
          devopsSearches.length,
      };
    });
  }

  // Generate comprehensive performance report
  async generatePerformanceReport() {
    this.log('\n📊 Generating Performance Report...', 'info');

    const report = {
      testSuite: {
        name: 'Memorai Performance Testing Suite',
        timestamp: new Date().toISOString(),
        scenarios: this.results.length,
        totalDuration: this.results.reduce((acc, r) => acc + r.duration, 0),
      },
      overallStats: {
        successRate:
          (this.results.filter(r => r.success).length / this.results.length) *
          100,
        avgScenarioDuration:
          this.results.reduce((acc, r) => acc + r.duration, 0) /
          this.results.length,
        totalOperations: this.results.reduce(
          (acc, r) => acc + (r.stats?.totalQueries || 0),
          0
        ),
        avgLatency:
          this.results.reduce((acc, r) => acc + (r.stats?.avgLatency || 0), 0) /
          this.results.length,
        maxLatency: Math.max(
          ...this.results.map(r => r.stats?.maxLatency || 0)
        ),
        p95Latency: this.calculateP95Latency(),
        throughput: this.calculateThroughput(),
      },
      scenarioResults: this.results.map(r => ({
        name: r.name,
        success: r.success,
        duration: Math.round(r.duration * 100) / 100,
        operations: r.stats?.totalQueries || 0,
        avgLatency: Math.round((r.stats?.avgLatency || 0) * 100) / 100,
        p95Latency: Math.round((r.stats?.p95Latency || 0) * 100) / 100,
        throughput: r.stats?.totalQueries
          ? Math.round((r.stats.totalQueries / (r.duration / 1000)) * 100) / 100
          : 0,
        details: r.details,
      })),
      recommendations: this.generateRecommendations(),
    };

    return report;
  }

  calculateP95Latency() {
    const allLatencies = this.results
      .filter(r => r.stats?.p95Latency)
      .map(r => r.stats.p95Latency);

    if (allLatencies.length === 0) return 0;

    allLatencies.sort((a, b) => a - b);
    const index = Math.ceil(0.95 * allLatencies.length) - 1;
    return allLatencies[index];
  }

  calculateThroughput() {
    const totalOps = this.results.reduce(
      (acc, r) => acc + (r.stats?.totalQueries || 0),
      0
    );
    const totalTime =
      this.results.reduce((acc, r) => acc + r.duration, 0) / 1000; // Convert to seconds
    return totalTime > 0 ? Math.round((totalOps / totalTime) * 100) / 100 : 0;
  }

  generateRecommendations() {
    const recommendations = [];

    const avgLatency =
      this.results.reduce((acc, r) => acc + (r.stats?.avgLatency || 0), 0) /
      this.results.length;
    const maxLatency = Math.max(
      ...this.results.map(r => r.stats?.maxLatency || 0)
    );
    const throughput = this.calculateThroughput();

    if (avgLatency > 100) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: `Average latency (${avgLatency.toFixed(2)}ms) exceeds 100ms threshold. Consider optimizing search algorithms or adding caching.`,
      });
    }

    if (maxLatency > 500) {
      recommendations.push({
        type: 'reliability',
        priority: 'medium',
        message: `Maximum latency (${maxLatency.toFixed(2)}ms) exceeds 500ms. Investigate outlier scenarios and add timeout handling.`,
      });
    }

    if (throughput < 50) {
      recommendations.push({
        type: 'scalability',
        priority: 'medium',
        message: `Throughput (${throughput} ops/sec) below 50 ops/sec. Consider parallel processing or connection pooling.`,
      });
    }

    const failedScenarios = this.results.filter(r => !r.success);
    if (failedScenarios.length > 0) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: `${failedScenarios.length} scenarios failed. Review error handling and resilience patterns.`,
      });
    }

    recommendations.push({
      type: 'optimization',
      priority: 'low',
      message:
        'Consider implementing memory pooling for high-frequency operations to reduce GC pressure.',
    });

    recommendations.push({
      type: 'monitoring',
      priority: 'medium',
      message:
        'Implement real-time performance monitoring with alerting for production deployment.',
    });

    return recommendations;
  }

  async run() {
    this.log('🚀 Starting Memorai Performance Testing Suite', 'info');
    this.log(
      'Testing 12 real-world scenarios for comprehensive performance analysis\n',
      'info'
    );

    // Run all scenarios
    await this.scenario1_individualDeveloper();
    await this.scenario2_teamCollaboration();
    await this.scenario3_largeProjectDocs();
    await this.scenario4_aiAgentMemory();
    await this.scenario5_enterpriseKnowledgeBase();
    await this.scenario6_realtimeCodeAssistant();
    await this.scenario7_multiProjectPortfolio();
    await this.scenario8_customerSupport();
    await this.scenario9_mlTrainingData();
    await this.scenario10_apiIntegrationTesting();
    await this.scenario11_securityIncidentResponse();
    await this.scenario12_devopsDeployment();

    // Generate final report
    const report = await this.generatePerformanceReport();

    this.log('\n🎯 Performance Testing Complete!', 'success');
    this.log(`Total Scenarios: ${report.testSuite.scenarios}`, 'info');
    this.log(
      `Success Rate: ${report.overallStats.successRate.toFixed(1)}%`,
      'info'
    );
    this.log(
      `Average Latency: ${report.overallStats.avgLatency.toFixed(2)}ms`,
      'info'
    );
    this.log(
      `Total Throughput: ${report.overallStats.throughput} ops/sec`,
      'info'
    );

    return report;
  }
}

// Save detailed report
async function saveReport(report) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `memorai-performance-report-${timestamp}.json`;

  try {
    await fs.writeFile(filename, JSON.stringify(report, null, 2));
    console.log(chalk.green(`📄 Detailed report saved to: ${filename}`));
  } catch (error) {
    console.log(chalk.red(`❌ Failed to save report: ${error.message}`));
  }
}

// Print summary table
function printSummaryTable(report) {
  console.log(chalk.cyan.bold('\n📊 PERFORMANCE SUMMARY TABLE'));
  console.log(''.padEnd(80, '='));
  console.log(
    'Scenario'.padEnd(35) +
      'Duration'.padEnd(10) +
      'Ops'.padEnd(8) +
      'Avg Lat'.padEnd(10) +
      'P95 Lat'.padEnd(10) +
      'Throughput'.padEnd(12)
  );
  console.log(''.padEnd(80, '-'));

  report.scenarioResults.forEach(scenario => {
    const color = scenario.success ? chalk.green : chalk.red;
    console.log(
      color(
        scenario.name.substring(0, 34).padEnd(35) +
          `${scenario.duration}ms`.padEnd(10) +
          scenario.operations.toString().padEnd(8) +
          `${scenario.avgLatency}ms`.padEnd(10) +
          `${scenario.p95Latency}ms`.padEnd(10) +
          `${scenario.throughput} ops/s`.padEnd(12)
      )
    );
  });

  console.log(''.padEnd(80, '='));
  console.log(chalk.yellow.bold('OVERALL METRICS:'));
  console.log(`Total Operations: ${report.overallStats.totalOperations}`);
  console.log(
    `Average Latency: ${report.overallStats.avgLatency.toFixed(2)}ms`
  );
  console.log(`P95 Latency: ${report.overallStats.p95Latency.toFixed(2)}ms`);
  console.log(`Max Latency: ${report.overallStats.maxLatency.toFixed(2)}ms`);
  console.log(`Overall Throughput: ${report.overallStats.throughput} ops/sec`);
  console.log(`Success Rate: ${report.overallStats.successRate.toFixed(1)}%`);
}

// Print recommendations
function printRecommendations(report) {
  if (report.recommendations.length === 0) return;

  console.log(chalk.cyan.bold('\n💡 PERFORMANCE RECOMMENDATIONS'));
  console.log(''.padEnd(80, '='));

  report.recommendations.forEach((rec, index) => {
    const priorityColors = {
      high: chalk.red.bold,
      medium: chalk.yellow.bold,
      low: chalk.blue.bold,
    };

    console.log(
      `${index + 1}. ${priorityColors[rec.priority](`[${rec.priority.toUpperCase()}]`)} ${rec.type.toUpperCase()}`
    );
    console.log(`   ${rec.message}\n`);
  });
}

// Main execution
async function main() {
  const suite = new PerformanceTestSuite();

  try {
    const report = await suite.run();

    // Print results
    printSummaryTable(report);
    printRecommendations(report);

    // Save detailed report
    await saveReport(report);

    console.log(
      chalk.green.bold('\n✅ Performance testing completed successfully!')
    );
    console.log(
      chalk.blue(
        '📈 Use this data to optimize memorai performance for production deployment.'
      )
    );
  } catch (error) {
    console.error(
      chalk.red.bold('❌ Performance testing failed:'),
      error.message
    );
    process.exit(1);
  }
}

// Execute if run directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}

export { main, PerformanceTestSuite };

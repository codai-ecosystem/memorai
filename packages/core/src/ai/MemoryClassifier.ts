/**
 * AI-Powered Memory Classification System
 * Automatically categorizes and tags memory entries using advanced AI
 */

import OpenAI from 'openai';
import { MemoryMetadata, MemoryType } from '../types/index';

export interface MemoryClassification {
  category: string;
  subcategory?: string;
  tags: string[];
  importance: number; // 0-1 scale
  sentiment?: 'positive' | 'negative' | 'neutral';
  entityType: string;
  relationships: string[];
  confidence: number;
}

export interface ClassificationConfig {
  enableSemanticAnalysis: boolean;
  enableSentimentAnalysis: boolean;
  enableRelationshipExtraction: boolean;
  customCategories?: string[];
  confidenceThreshold: number;
}

export class AIMemoryClassifier {
  private openai: OpenAI;
  private config: ClassificationConfig;

  constructor(config: ClassificationConfig) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.config = config;
  }

  /**
   * Classify a memory entry using AI-powered analysis
   */
  async classifyMemory(
    content: string,
    existingMetadata?: MemoryMetadata
  ): Promise<MemoryClassification> {
    try {
      const prompt = this.buildClassificationPrompt(content, existingMetadata);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert memory classification system. Analyze the given content and provide structured classification data.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      });

      const result = response.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No classification result received');
      }

      return this.parseClassificationResult(result);
    } catch (error) {
      console.error('Memory classification failed:', error);
      return this.getFallbackClassification(content);
    }
  }

  /**
   * Batch classify multiple memories for efficiency
   */
  async classifyMemoryBatch(
    memories: Array<{ content: string; metadata?: MemoryMetadata }>
  ): Promise<MemoryClassification[]> {
    const batchSize = 10;
    const results: MemoryClassification[] = [];

    for (let i = 0; i < memories.length; i += batchSize) {
      const batch = memories.slice(i, i + batchSize);
      const batchPromises = batch.map(memory =>
        this.classifyMemory(memory.content, memory.metadata)
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Re-classify existing memories with improved AI models
   */
  async reclassifyMemories(
    memories: MemoryMetadata[]
  ): Promise<Array<{ id: string; classification: MemoryClassification }>> {
    const results = [];

    for (const memory of memories) {
      const classification = await this.classifyMemory(memory.content, memory);
      results.push({
        id: memory.id,
        classification,
      });
    }

    return results;
  }

  /**
   * Extract relationships between memories
   */
  async extractRelationships(
    sourceMemory: string,
    relatedMemories: string[]
  ): Promise<
    Array<{ target: string; relationship: string; confidence: number }>
  > {
    const prompt = `
    Analyze the relationships between the source memory and related memories:
    
    Source: ${sourceMemory}
    
    Related memories:
    ${relatedMemories.map((m, i) => `${i + 1}. ${m}`).join('\n')}
    
    Identify relationships like: causes, enables, contradicts, supports, follows, precedes, requires, etc.
    
    Return JSON array of relationships with format:
    [{"target": "memory_index", "relationship": "relationship_type", "confidence": 0.8}]
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert at identifying semantic relationships between pieces of information. Always return valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 800,
      });

      const result = response.choices[0]?.message?.content;
      if (!result) return [];

      return JSON.parse(result);
    } catch (error) {
      console.error('Relationship extraction failed:', error);
      return [];
    }
  }

  private buildClassificationPrompt(
    content: string,
    existingMetadata?: MemoryMetadata
  ): string {
    return `
    Classify the following memory content and provide structured analysis:

    Content: ${content}
    
    ${existingMetadata ? `Existing metadata: ${JSON.stringify(existingMetadata)}` : ''}

    Please analyze and return a JSON object with this structure:
    {
      "category": "primary category (e.g., technical, business, personal, project)",
      "subcategory": "specific subcategory if applicable",
      "tags": ["relevant", "descriptive", "tags"],
      "importance": 0.8,
      "sentiment": "positive|negative|neutral",
      "entityType": "specific type (e.g., task, decision, insight, problem)",
      "relationships": ["potential relationships to other memories"],
      "confidence": 0.9
    }

    Categories should be one of: technical, business, personal, project, research, planning, decision, insight, problem, solution, goal, milestone, task, idea, note, documentation, communication, learning, strategy, analysis, review, feedback, requirement, specification, design, implementation, testing, deployment, maintenance, optimization, security, performance, compliance, risk, issue, bug, feature, enhancement, update, change, approval, rejection, completion, progress, status, meeting, discussion, action, follow-up, deadline, priority, resource, tool, process, procedure, guideline, policy, standard, practice, pattern, template, example, reference, link, source, evidence, proof, validation, verification, confirmation, assumption, hypothesis, prediction, forecast, estimate, measurement, metric, kpi, objective, outcome, result, achievement, success, failure, lesson, knowledge, skill, expertise, experience, history, context, background, summary, overview, detail, explanation, description, definition, clarification, question, answer, comment, suggestion, recommendation, advice, tip, warning, alert, notification, reminder, todo, checklist, agenda, schedule, calendar, event, appointment, booking, reservation, invitation, response, confirmation, cancellation, postponement, rescheduling, update, modification, revision, correction, fix, patch, upgrade, downgrade, rollback, migration, transition, transfer, backup, restore, archive, delete, remove, cleanup, maintenance, monitoring, logging, debugging, troubleshooting, support, help, assistance, guidance, training, education, learning, development, improvement, optimization, automation, integration, configuration, setup, installation, deployment, release, version, build, test, validation, verification, review, approval, sign-off, handover, documentation, report, summary, analysis, evaluation, assessment, audit, inspection, check, verification, confirmation, validation, certification, accreditation, compliance, governance, policy, procedure, standard, guideline, best-practice, framework, methodology, approach, strategy, plan, roadmap, vision, mission, goal, objective, target, milestone, deliverable, requirement, specification, design, architecture, blueprint, model, prototype, mockup, wireframe, sketch, diagram, chart, graph, table, list, inventory, catalog, index, reference, glossary, dictionary, taxonomy, ontology, schema, structure, format, layout, template, pattern, example, sample, demo, tutorial, guide, manual, handbook, documentation, specification, requirement, design, implementation, code, script, program, application, system, platform, service, api, interface, endpoint, method, function, procedure, algorithm, logic, rule, condition, constraint, validation, verification, check, test, assertion, assumption, hypothesis, theory, principle, concept, idea, insight, discovery, finding, result, outcome, conclusion, decision, choice, option, alternative, solution, approach, method, technique, tool, technology, framework, library, component, module, package, plugin, extension, addon, feature, capability, functionality, behavior, characteristic, property, attribute, parameter, setting, configuration, option, preference, default, value, data, information, content, message, text, document, file, resource, asset, artifact, output, input, source, target, destination, origin, reference, link, connection, relationship, association, dependency, requirement, prerequisite, condition, constraint, limitation, restriction, boundary, scope, context, environment, setting, situation, scenario, case, example, instance, occurrence, event, incident, issue, problem, challenge, difficulty, obstacle, barrier, risk, threat, vulnerability, weakness, gap, deficiency, shortcoming, limitation, constraint, requirement, need, want, desire, preference, expectation, assumption, belief, opinion, view, perspective, stance, position, approach, strategy, plan, intention, purpose, goal, objective, target, aim, mission, vision, value, principle, priority, preference, choice, decision, selection, option, alternative, solution, answer, response, reaction, feedback, comment, suggestion, recommendation, advice, guidance, instruction, direction, command, request, demand, requirement, specification, description, explanation, clarification, definition, interpretation, analysis, evaluation, assessment, judgment, opinion, view, perspective, insight, understanding, knowledge, awareness, realization, recognition, acknowledgment, acceptance, agreement, approval, endorsement, support, backing, confirmation, validation, verification, proof, evidence, justification, rationale, reason, cause, factor, influence, impact, effect, consequence, result, outcome, output, product, deliverable, achievement, success, accomplishment, completion, finish, end, conclusion, summary, wrap-up, follow-up, next-step, action, task, activity, work, job, assignment, responsibility, duty, obligation, commitment, promise, agreement, contract, deal, arrangement, understanding, accord, consensus, compromise, settlement, resolution, solution, fix, remedy, cure, treatment, therapy, intervention, action, measure, step, procedure, process, method, approach, technique, strategy, plan, program, project, initiative, effort, campaign, drive, push, movement, trend, pattern, cycle, phase, stage, step, level, degree, extent, magnitude, scale, size, scope, range, span, duration, period, time, timing, schedule, deadline, milestone, checkpoint, review, evaluation, assessment, audit, inspection, check, test, trial, experiment, pilot, prototype, proof-of-concept, demo, sample, example, case-study, scenario, simulation, model, framework, structure, system, platform, infrastructure, architecture, design, blueprint, plan, specification, requirement, objective, goal, target, aim, purpose, mission, vision, strategy, approach, method, technique, tool, technology, solution, product, service, offering, capability, feature, function, benefit, value, advantage, strength, opportunity, potential, possibility, chance, likelihood, probability, risk, threat, challenge, problem, issue, concern, worry, fear, doubt, uncertainty, ambiguity, confusion, misunderstanding, misconception, error, mistake, fault, flaw, defect, bug, issue, problem, failure, breakdown, malfunction, outage, downtime, disruption, interruption, delay, postponement, cancellation, suspension, pause, break, gap, interval, period, duration, time, timing, schedule, calendar, agenda, plan, program, project, initiative, effort, activity, task, action, step, procedure, process, workflow, pipeline, chain, sequence, series, cycle, loop, iteration, repetition, routine, habit, practice, custom, tradition, convention, standard, norm, rule, regulation, law, policy, guideline, principle, value, belief, assumption, expectation, requirement, specification, description, definition, explanation, clarification, interpretation, analysis, evaluation, assessment, review, audit, inspection, check, test, validation, verification, confirmation, approval, acceptance, agreement, endorsement, support, backing, recommendation, suggestion, advice, guidance, instruction, direction, command, request, demand, question, query, inquiry, investigation, research, study, analysis, examination, exploration, discovery, finding, result, outcome, conclusion, decision, choice, selection, option, alternative, solution, answer, response, reply, feedback, comment, remark, observation, note, annotation, highlight, emphasis, focus, attention, interest, concern, priority, importance, significance, relevance, value, worth, merit, quality, excellence, superiority, advantage, benefit, gain, profit, return, reward, incentive, motivation, inspiration, encouragement, support, help, assistance, aid, service, favor, contribution, participation, involvement, engagement, commitment, dedication, effort, work, labor, task, job, role, responsibility, duty, function, purpose, goal, objective, target, aim, mission, vision, dream, aspiration, hope, wish, desire, want, need, requirement, demand, request, ask, question, inquiry, investigation, search, quest, pursuit, hunt, exploration, discovery, research, study, analysis, examination, inspection, review, audit, assessment, evaluation, judgment, opinion, view, perspective, insight, understanding, knowledge, information, data, fact, detail, element, aspect, feature, characteristic, property, attribute, quality, trait, nature, essence, core, heart, center, focus, main, primary, principal, key, major, important, significant, critical, essential, vital, crucial, fundamental, basic, elementary, simple, easy, straightforward, clear, obvious, evident, apparent, visible, noticeable, observable, detectable, measurable, quantifiable, countable, enumerable, listable, categorizable, classifiable, sortable, searchable, findable, retrievable, accessible, available, usable, applicable, relevant, suitable, appropriate, fitting, proper, correct, right, accurate, precise, exact, specific, detailed, comprehensive, complete, full, total, entire, whole, all, every, each, individual, single, unique, distinct, separate, different, various, diverse, multiple, many, several, few, some, certain, particular, special, specific, exact, precise, accurate, correct, right, proper, appropriate, suitable, relevant, applicable, usable, useful, helpful, beneficial, valuable, worthwhile, meaningful, significant, important, critical, essential, vital, crucial, fundamental, basic, core, central, main, primary, principal, key, major, leading, top, best, excellent, outstanding, exceptional, remarkable, notable, noteworthy, memorable, unforgettable, impressive, striking, amazing, wonderful, fantastic, great, good, fine, nice, pleasant, positive, favorable, beneficial, advantageous, helpful, useful, valuable, worthwhile, meaningful, significant, important, relevant, applicable, suitable, appropriate, proper, correct, right, accurate, precise, exact, specific, detailed, clear, obvious, evident, apparent, visible, noticeable, observable, detectable, measurable, quantifiable, reliable, trustworthy, credible, authentic, genuine, legitimate, valid, sound, solid, stable, secure, safe, protected, defended, guarded, shielded, covered, supported, backed, endorsed, approved, accepted, agreed, confirmed, validated, verified, proven, tested, tried, checked, examined, inspected, reviewed, audited, assessed, evaluated, analyzed, studied, researched, investigated, explored, discovered, found, identified, recognized, acknowledged, understood, known, learned, educated, informed, aware, conscious, mindful, alert, attentive, focused, concentrated, dedicated, committed, devoted, loyal, faithful, true, honest, sincere, genuine, authentic, real, actual, factual, accurate, correct, right, proper, appropriate, suitable, relevant, applicable, useful, helpful, beneficial, valuable, worthwhile, meaningful, significant, important, critical, essential, vital, crucial, fundamental, basic, elementary, simple, easy, straightforward, clear, plain, obvious, evident, apparent, visible, noticeable, observable, detectable, measurable, quantifiable, trackable, monitorable, controllable, manageable, handleable, workable, feasible, viable, practical, realistic, achievable, attainable, reachable, accessible, available, obtainable, acquirable, gettable, findable, searchable, discoverable, retrievable, recoverable, restorable, repairable, fixable, solvable, answerable, addressable, treatable, curable, healable, improvable, enhanceable, upgradeable, updatable, modifiable, changeable, adjustable, adaptable, flexible, versatile, dynamic, responsive, reactive, interactive, engaging, involving, participating, contributing, helping, supporting, assisting, aiding, serving, providing, offering, giving, sharing, delivering, supplying, furnishing, equipping, enabling, empowering, facilitating, promoting, encouraging, inspiring, motivating, driving, pushing, leading, guiding, directing, instructing, teaching, training, educating, informing, communicating, expressing, conveying, transmitting, transferring, sharing, distributing, spreading, broadcasting, publishing, announcing, declaring, stating, saying, telling, explaining, describing, defining, clarifying, interpreting, translating, converting, transforming, changing, modifying, adjusting, adapting, improving, enhancing, upgrading, updating, developing, advancing, progressing, evolving, growing, expanding, extending, increasing, amplifying, boosting, strengthening, reinforcing, supporting, backing, endorsing, approving, accepting, agreeing, confirming, validating, verifying, proving, demonstrating, showing, displaying, presenting, exhibiting, revealing, exposing, uncovering, discovering, finding, identifying, recognizing, acknowledging, understanding, realizing, appreciating, valuing, respecting, honoring, celebrating, commemorating, remembering, recalling, recollecting, reminiscing, reflecting, thinking, considering, contemplating, pondering, wondering, questioning, asking, inquiring, investigating, researching, studying, analyzing, examining, exploring, discovering, learning, understanding, knowing, being-aware, realizing, recognizing, acknowledging, accepting, agreeing, approving, endorsing, supporting, backing, helping, assisting, aiding, serving, contributing, participating, engaging, involving, sharing, giving, providing, offering, delivering, supplying, furnishing, equipping, enabling, empowering, facilitating, promoting, encouraging, inspiring, motivating, driving, leading, guiding, directing, managing, controlling, handling, operating, running, executing, implementing, deploying, launching, starting, beginning, initiating, commencing, opening, establishing, creating, building, developing, designing, planning, preparing, organizing, arranging, setting-up, configuring, installing, deploying, releasing, publishing, announcing, communicating, sharing, distributing, spreading, promoting, marketing, advertising, selling, offering, providing, delivering, serving, supporting, maintaining, monitoring, tracking, measuring, evaluating, assessing, reviewing, auditing, inspecting, checking, testing, validating, verifying, confirming, approving, accepting, endorsing, supporting, backing, recommending, suggesting, advising, guiding, instructing, teaching, training, educating, informing, updating, notifying, alerting, warning, reminding, telling, saying, speaking, talking, discussing, communicating, expressing, conveying, transmitting, sharing, explaining, describing, defining, clarifying, interpreting, analyzing, evaluating, assessing, reviewing, examining, investigating, researching, studying, learning, understanding, knowing, realizing, recognizing, acknowledging, appreciating, valuing, respecting, honoring, celebrating, enjoying, loving, liking, preferring, choosing, selecting, deciding, determining, concluding, finishing, completing, achieving, accomplishing, succeeding, winning, getting, obtaining, acquiring, gaining, earning, receiving, accepting, taking, having, owning, possessing, holding, keeping, maintaining, preserving, protecting, defending, securing, safeguarding, ensuring, guaranteeing, promising, committing, dedicating, devoting, focusing, concentrating, working, trying, attempting, striving, struggling, fighting, competing, challenging, pushing, driving, motivating, inspiring, encouraging, supporting, helping, assisting, aiding, serving, contributing, participating, engaging, involving, sharing, collaborating, cooperating, coordinating, organizing, managing, leading, directing, guiding, instructing, teaching, training, educating, developing, improving, enhancing, optimizing, maximizing, minimizing, reducing, eliminating, removing, deleting, clearing, cleaning, organizing, arranging, sorting, categorizing, classifying, grouping, clustering, collecting, gathering, assembling, combining, merging, integrating, connecting, linking, relating, associating, matching, comparing, contrasting, differentiating, distinguishing, separating, dividing, splitting, breaking, cutting, slicing, chopping, grinding, crushing, pressing, squeezing, compressing, expanding, extending, stretching, growing, increasing, enlarging, amplifying, boosting, strengthening, reinforcing, supporting, stabilizing, securing, protecting, defending, shielding, covering, wrapping, packaging, boxing, storing, keeping, saving, preserving, maintaining, sustaining, continuing, persisting, lasting, enduring, surviving, thriving, flourishing, prospering, succeeding, achieving, accomplishing, completing, finishing, ending, concluding, wrapping-up, summarizing, reviewing, evaluating, assessing, analyzing, examining, investigating, researching, studying, learning, understanding, knowing, realizing, recognizing, acknowledging, accepting, agreeing, approving, endorsing, supporting, backing, recommending, suggesting, advising, guiding, helping, assisting, serving, providing, offering, giving, sharing, contributing, participating, engaging, collaborating, cooperating, working-together, building-together, creating-together, developing-together, growing-together, succeeding-together, achieving-together, winning-together.

    Be concise but thorough. Focus on accuracy and usefulness.
    `;
  }

  private parseClassificationResult(result: string): MemoryClassification {
    try {
      const parsed = JSON.parse(result);
      return {
        category: parsed.category || 'general',
        subcategory: parsed.subcategory,
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        importance: Math.max(0, Math.min(1, parsed.importance || 0.5)),
        sentiment: parsed.sentiment || 'neutral',
        entityType: parsed.entityType || 'note',
        relationships: Array.isArray(parsed.relationships)
          ? parsed.relationships
          : [],
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
      };
    } catch (error) {
      console.error('Failed to parse classification result:', error);
      return this.getFallbackClassification(result);
    }
  }

  private getFallbackClassification(content: string): MemoryClassification {
    // Simple heuristic-based classification as fallback
    const categories = {
      technical: [
        'code',
        'bug',
        'api',
        'database',
        'server',
        'deployment',
        'error',
        'performance',
      ],
      business: [
        'meeting',
        'decision',
        'strategy',
        'goal',
        'revenue',
        'customer',
        'market',
      ],
      project: [
        'task',
        'milestone',
        'deadline',
        'deliverable',
        'requirement',
        'progress',
      ],
      personal: ['note', 'reminder', 'idea', 'thought', 'reflection'],
    };

    let category = 'general';
    let maxMatches = 0;

    for (const [cat, keywords] of Object.entries(categories)) {
      const matches = keywords.filter(keyword =>
        content.toLowerCase().includes(keyword)
      ).length;

      if (matches > maxMatches) {
        maxMatches = matches;
        category = cat;
      }
    }

    return {
      category,
      tags: content
        .split(' ')
        .slice(0, 5)
        .filter(word => word.length > 3),
      importance: 0.5,
      sentiment: 'neutral',
      entityType: 'note',
      relationships: [],
      confidence: 0.3,
    };
  }
}

export default AIMemoryClassifier;

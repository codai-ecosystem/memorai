/**
 * 🧠 AI-Powered Interfaces - Index
 * Export all advanced AI interface components
 *
 * @version 3.2.0
 * @author Memorai AI Team
 */

// Natural Language Interface
export {
  EntityExtractor,
  IntentClassifier,
  NaturalLanguageEngine,
  ResponseGenerator,
} from './NaturalLanguageEngine';

export type {
  AnalyticsService,
  AutoCompletion,
  ConversationAction,
  ConversationContext,
  ConversationMessage,
  ConversationResponse,
  Entity,
  Intent,
  Memory,
  MemoryService,
  NLEngineOptions,
  QuerySuggestion,
  UserPreferences,
} from './NaturalLanguageEngine';

// Voice to Memory Conversion
export { VoiceToMemoryEngine } from './VoiceToMemoryEngine';

export type {
  AudioConfig,
  SpeechAlternative,
  SpeechRecognitionResult,
  VoiceActivity,
  VoiceCommand,
  VoiceMemory,
  VoiceProcessingOptions,
} from './VoiceToMemoryEngine';

// Memory Visualization
export { MemoryVisualizationEngine } from './MemoryVisualizationEngine';

export type {
  CameraState,
  ColorHSL,
  ColorRGB,
  InteractionState,
  MemoryCluster,
  MemoryEdge,
  MemoryNode,
  TimelineMarker,
  Vector2D,
  Vector3D,
  VisualizationConfig,
  VisualizationFilters,
  VisualizationMetrics,
} from './MemoryVisualizationEngine';

/**
 * AI-Powered Interfaces Factory
 * Creates and configures AI interface components
 */
export class AIInterfacesFactory {
  /**
   * Create a complete AI-powered memory interface
   */
  static createCompleteInterface(options: {
    memoryService: any;
    analyticsService: any;
    enableVoice?: boolean;
    enableVisualization?: boolean;
    visualizationConfig?: any;
    voiceOptions?: any;
  }) {
    const { memoryService, analyticsService } = options;

    // Natural Language Interface
    const nlEngine =
      new (require('./NaturalLanguageEngine').NaturalLanguageEngine)({
        memoryService,
        analyticsService,
        enableVoiceProcessing: options.enableVoice || false,
        enableAdvancedNLP: true,
        defaultLanguage: 'en',
        maxContextLength: 4000,
      });

    // Voice Interface (if enabled)
    let voiceEngine = null;
    if (options.enableVoice) {
      const { VoiceToMemoryEngine } = require('./VoiceToMemoryEngine');
      voiceEngine = new VoiceToMemoryEngine({
        enableContinuousListening: true,
        enableVoiceCommands: true,
        enableAudioStorage: true,
        supportedLanguages: ['en-US', 'en-GB'],
        confidenceThreshold: 0.7,
        noiseReductionLevel: 'medium',
        enableSpeakerRecognition: false,
        ...options.voiceOptions,
      });
    }

    // Visualization Interface (if enabled)
    let visualizationEngine = null;
    if (options.enableVisualization) {
      const {
        MemoryVisualizationEngine,
      } = require('./MemoryVisualizationEngine');
      visualizationEngine = new MemoryVisualizationEngine({
        width: 1200,
        height: 800,
        enableAnimations: true,
        enableInteractions: true,
        theme: 'dark',
        colorScheme: 'semantic',
        layoutAlgorithm: 'force-directed',
        renderQuality: 'high',
        ...options.visualizationConfig,
      });
    }

    return {
      naturalLanguage: nlEngine,
      voice: voiceEngine,
      visualization: visualizationEngine,
    };
  }

  /**
   * Create natural language interface only
   */
  static createNaturalLanguageInterface(
    memoryService: any,
    analyticsService: any
  ) {
    const { NaturalLanguageEngine } = require('./NaturalLanguageEngine');

    return new NaturalLanguageEngine({
      memoryService,
      analyticsService,
      enableVoiceProcessing: false,
      enableAdvancedNLP: true,
      defaultLanguage: 'en',
      maxContextLength: 4000,
    });
  }

  /**
   * Create voice interface only
   */
  static createVoiceInterface(options?: any) {
    const { VoiceToMemoryEngine } = require('./VoiceToMemoryEngine');

    return new VoiceToMemoryEngine({
      enableContinuousListening: true,
      enableVoiceCommands: true,
      enableAudioStorage: true,
      supportedLanguages: ['en-US', 'en-GB'],
      confidenceThreshold: 0.7,
      noiseReductionLevel: 'medium',
      enableSpeakerRecognition: false,
      ...options,
    });
  }

  /**
   * Create visualization interface only
   */
  static createVisualizationInterface(config?: any) {
    const {
      MemoryVisualizationEngine,
    } = require('./MemoryVisualizationEngine');

    return new MemoryVisualizationEngine({
      width: 1200,
      height: 800,
      enableAnimations: true,
      enableInteractions: true,
      theme: 'dark',
      colorScheme: 'semantic',
      layoutAlgorithm: 'force-directed',
      renderQuality: 'high',
      ...config,
    });
  }
}

/**
 * AI Interface Integration Helper
 * Provides utilities for integrating AI interfaces
 */
export class AIInterfaceIntegration {
  /**
   * Connect natural language and voice interfaces
   */
  static connectNLAndVoice(nlEngine: any, voiceEngine: any) {
    voiceEngine.on('voice_memory_created', (voiceMemory: any) => {
      // Process voice transcription through NL engine
      nlEngine.processMessage(
        voiceMemory.transcription,
        `voice-${voiceMemory.id}`,
        'voice-user'
      );
    });

    voiceEngine.on('voice_command_detected', (event: any) => {
      // Process voice command through NL engine
      nlEngine.processMessage(
        event.command.command,
        `voice-command-${event.voiceMemory.id}`,
        'voice-user'
      );
    });
  }

  /**
   * Connect natural language and visualization interfaces
   */
  static connectNLAndVisualization(nlEngine: any, visualizationEngine: any) {
    nlEngine.on('message_processed', (event: any) => {
      // Add conversation to visualization if it involves memory
      if (
        event.response.actions.some((a: any) => a.type.startsWith('memory_'))
      ) {
        // Add memory interactions to visualization
        visualizationEngine.addMemory({
          id: event.sessionId,
          content: event.message,
          timestamp: new Date(),
          metadata: { type: 'conversation', intent: event.response.intent },
        });
      }
    });
  }

  /**
   * Connect all three interfaces
   */
  static connectAllInterfaces(
    nlEngine: any,
    voiceEngine: any,
    visualizationEngine: any
  ) {
    this.connectNLAndVoice(nlEngine, voiceEngine);
    this.connectNLAndVisualization(nlEngine, visualizationEngine);

    // Additional integration logic
    voiceEngine.on('voice_memory_created', (voiceMemory: any) => {
      visualizationEngine.addMemory({
        id: voiceMemory.id,
        content: voiceMemory.transcription,
        timestamp: voiceMemory.timestamp,
        metadata: { type: 'voice', confidence: voiceMemory.confidence },
      });
    });
  }
}

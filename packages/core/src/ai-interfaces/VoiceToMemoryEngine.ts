/**
 * 🎤 Voice to Memory Conversion Engine
 * Advanced speech processing for hands-free memory management
 * 
 * Features:
 * - Real-time speech-to-text conversion
 * - Voice activity detection
 * - Multi-language support
 * - Noise reduction and audio enhancement
 * - Voice command recognition
 * - Memory creation from voice notes
 * 
 * @version 3.2.0
 * @author Memorai AI Team
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

// Browser API type definitions for Node.js compatibility
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
  
  interface Navigator {
    mediaDevices?: {
      getUserMedia(constraints: any): Promise<any>;
    };
  }
  
  const navigator: Navigator;
  const window: Window;
  const AudioContext: any;
  const requestAnimationFrame: (callback: () => void) => void;
}

// Mock types for server-side compatibility
type MediaStream = any;
type AudioNode = any;
type AnalyserNode = any;
type AudioContextType = any;

// Audio processing interfaces
interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  bufferSize: number;
  enableNoiseReduction: boolean;
  enableEchoCancellation: boolean;
}

interface VoiceActivity {
  isActive: boolean;
  confidence: number;
  timestamp: Date;
  duration: number;
}

interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  language: string;
  alternatives: SpeechAlternative[];
  timestamp: Date;
  duration: number;
}

interface SpeechAlternative {
  text: string;
  confidence: number;
}

interface VoiceCommand {
  command: string;
  parameters: Record<string, any>;
  confidence: number;
  action: 'create_memory' | 'search_memory' | 'update_memory' | 'delete_memory' | 'start_recording' | 'stop_recording';
}

interface VoiceMemory {
  id: string;
  transcription: string;
  audioData?: ArrayBuffer;
  duration: number;
  language: string;
  confidence: number;
  timestamp: Date;
  metadata: {
    voiceProfile?: string;
    audioQuality: number;
    backgroundNoise: number;
    speakingRate: number;
  };
}

interface VoiceProcessingOptions {
  enableContinuousListening: boolean;
  enableVoiceCommands: boolean;
  enableAudioStorage: boolean;
  supportedLanguages: string[];
  confidenceThreshold: number;
  noiseReductionLevel: 'low' | 'medium' | 'high';
  enableSpeakerRecognition: boolean;
}

/**
 * Speech Recognition Engine
 * Handles speech-to-text conversion with advanced features
 */
class SpeechRecognitionEngine {
  private recognition: any; // WebKit SpeechRecognition or equivalent
  private isListening = false;
  private audioContext: AudioContextType | null = null;
  private options: VoiceProcessingOptions;

  constructor(options: VoiceProcessingOptions) {
    this.options = options;
    this.initializeSpeechRecognition();
  }

  private initializeSpeechRecognition(): void {
    // Check if speech recognition is available
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.configureSpeechRecognition();
      }
    }
  }

  private configureSpeechRecognition(): void {
    if (!this.recognition) return;

    this.recognition.continuous = this.options.enableContinuousListening;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    this.recognition.lang = this.options.supportedLanguages[0] || 'en-US';
  }

  async startListening(): Promise<void> {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported');
    }

    if (this.isListening) {
      return;
    }

    try {
      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      throw new Error(`Failed to start speech recognition: ${error}`);
    }
  }

  async stopListening(): Promise<void> {
    if (!this.recognition || !this.isListening) {
      return;
    }

    this.recognition.stop();
    this.isListening = false;
  }

  async processAudioStream(audioStream: MediaStream): Promise<SpeechRecognitionResult[]> {
    const results: SpeechRecognitionResult[] = [];
    
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not available'));
        return;
      }

      this.recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          
          if (result.isFinal) {
            const alternatives: SpeechAlternative[] = [];
            
            for (let j = 0; j < result.length; j++) {
              alternatives.push({
                text: result[j].transcript,
                confidence: result[j].confidence
              });
            }

            const speechResult: SpeechRecognitionResult = {
              text: result[0].transcript,
              confidence: result[0].confidence,
              language: this.recognition.lang,
              alternatives,
              timestamp: new Date(),
              duration: 0 // Will be calculated by caller
            };

            results.push(speechResult);
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.onend = () => {
        resolve(results);
      };

      this.startListening();
    });
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  getSupportedLanguages(): string[] {
    return this.options.supportedLanguages;
  }

  setLanguage(language: string): void {
    if (this.recognition && this.options.supportedLanguages.includes(language)) {
      this.recognition.lang = language;
    }
  }
}

/**
 * Voice Activity Detection
 * Detects when user is speaking vs silence
 */
class VoiceActivityDetector {
  private audioContext: AudioContextType | null = null;
  private analyser: AnalyserNode | null = null;
  private isActive = false;
  private threshold = 0.01;
  private smoothingTimeConstant = 0.8;

  async initialize(audioStream: MediaStream): Promise<void> {
    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(audioStream);
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = this.smoothingTimeConstant;
      
      source.connect(this.analyser);
    } catch (error) {
      throw new Error(`Failed to initialize voice activity detection: ${error}`);
    }
  }

  detectActivity(): VoiceActivity {
    if (!this.analyser) {
      return {
        isActive: false,
        confidence: 0,
        timestamp: new Date(),
        duration: 0
      };
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate RMS (Root Mean Square) for volume level
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / bufferLength) / 255;

    const isActive = rms > this.threshold;
    const confidence = Math.min(rms / this.threshold, 1.0);

    return {
      isActive,
      confidence,
      timestamp: new Date(),
      duration: 0 // Will be tracked by caller
    };
  }

  setThreshold(threshold: number): void {
    this.threshold = Math.max(0, Math.min(1, threshold));
  }

  cleanup(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
  }
}

/**
 * Voice Command Processor
 * Recognizes and processes voice commands for memory operations
 */
class VoiceCommandProcessor {
  private commandPatterns: Map<string, RegExp[]> = new Map();

  constructor() {
    this.initializeCommandPatterns();
  }

  private initializeCommandPatterns(): void {
    // Memory creation commands
    this.commandPatterns.set('create_memory', [
      /^(remember|save|store|note down|create memory)/i,
      /^(add to memory|keep this|make a note)/i,
      /^(memorize|record this|save this information)/i
    ]);

    // Memory search commands
    this.commandPatterns.set('search_memory', [
      /^(find|search|look for|retrieve|get)/i,
      /^(show me|tell me about|what do I know about)/i,
      /^(recall|remind me|find memories about)/i
    ]);

    // Memory update commands
    this.commandPatterns.set('update_memory', [
      /^(update|modify|change|edit)/i,
      /^(correct|fix|update memory|change memory)/i
    ]);

    // Memory deletion commands
    this.commandPatterns.set('delete_memory', [
      /^(delete|remove|forget|clear)/i,
      /^(erase|get rid of|remove memory)/i
    ]);

    // Recording control commands
    this.commandPatterns.set('start_recording', [
      /^(start recording|begin recording|start listening)/i,
      /^(record|listen|start)/i
    ]);

    this.commandPatterns.set('stop_recording', [
      /^(stop recording|end recording|stop listening)/i,
      /^(stop|finish|end)/i
    ]);
  }

  processCommand(text: string): VoiceCommand | null {
    const normalizedText = text.toLowerCase().trim();

    for (const [action, patterns] of this.commandPatterns) {
      for (const pattern of patterns) {
        const match = normalizedText.match(pattern);
        if (match) {
          return {
            command: match[0],
            parameters: this.extractCommandParameters(normalizedText, action),
            confidence: this.calculateCommandConfidence(normalizedText, pattern),
            action: action as any
          };
        }
      }
    }

    return null;
  }

  private extractCommandParameters(text: string, action: string): Record<string, any> {
    const params: Record<string, any> = {};

    switch (action) {
      case 'create_memory':
        // Extract content after command
        const createContent = text.replace(/^(remember|save|store|note down|create memory)\s*/i, '');
        params.content = createContent.trim();
        break;

      case 'search_memory':
        // Extract search query
        const searchQuery = text.replace(/^(find|search|look for|retrieve|get|show me|tell me about|what do I know about)\s*/i, '');
        params.query = searchQuery.trim();
        break;

      case 'update_memory':
        // Extract update content
        const updateContent = text.replace(/^(update|modify|change|edit)\s*/i, '');
        params.content = updateContent.trim();
        break;

      case 'delete_memory':
        // Extract deletion target
        const deleteTarget = text.replace(/^(delete|remove|forget|clear)\s*/i, '');
        params.target = deleteTarget.trim();
        break;
    }

    return params;
  }

  private calculateCommandConfidence(text: string, pattern: RegExp): number {
    const match = text.match(pattern);
    if (!match) return 0;

    // Base confidence on match strength and text clarity
    const matchLength = match[0].length;
    const textLength = text.length;
    const matchRatio = matchLength / textLength;

    return Math.min(0.95, matchRatio + 0.3);
  }
}

/**
 * Audio Enhancement Engine
 * Improves audio quality for better speech recognition
 */
class AudioEnhancementEngine {
  private audioContext: AudioContextType | null = null;
  private noiseReducer: AudioNode | null = null;
  private echoCanceller: AudioNode | null = null;

  async initializeAudioProcessing(audioStream: MediaStream, config: AudioConfig): Promise<MediaStream> {
    try {
      this.audioContext = new AudioContext({
        sampleRate: config.sampleRate
      });

      const source = this.audioContext.createMediaStreamSource(audioStream);
      const destination = this.audioContext.createMediaStreamDestination();

      // Apply noise reduction if enabled
      if (config.enableNoiseReduction) {
        const noiseFilter = await this.createNoiseFilter();
        source.connect(noiseFilter);
        noiseFilter.connect(destination);
      } else {
        source.connect(destination);
      }

      return destination.stream;
    } catch (error) {
      throw new Error(`Failed to initialize audio processing: ${error}`);
    }
  }

  private async createNoiseFilter(): Promise<AudioNode> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    // Create a simple high-pass filter for noise reduction
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(100, this.audioContext.currentTime); // Remove low-frequency noise
    filter.Q.setValueAtTime(1, this.audioContext.currentTime);

    return filter;
  }

  cleanup(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

/**
 * Main Voice to Memory Conversion Engine
 * Orchestrates all voice processing components
 */
export class VoiceToMemoryEngine extends EventEmitter {
  private speechRecognition: SpeechRecognitionEngine;
  private voiceActivityDetector: VoiceActivityDetector;
  private commandProcessor: VoiceCommandProcessor;
  private audioEnhancer: AudioEnhancementEngine;
  private currentAudioStream: MediaStream | null = null;
  private isProcessing = false;
  private voiceMemories: Map<string, VoiceMemory> = new Map();
  private options: VoiceProcessingOptions;

  constructor(options: VoiceProcessingOptions) {
    super();
    
    this.options = options;
    this.speechRecognition = new SpeechRecognitionEngine(options);
    this.voiceActivityDetector = new VoiceActivityDetector();
    this.commandProcessor = new VoiceCommandProcessor();
    this.audioEnhancer = new AudioEnhancementEngine();
  }

  /**
   * Start voice processing and memory conversion
   */
  async startVoiceProcessing(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    try {
      // Request microphone access
      if (!navigator.mediaDevices) {
        throw new Error('Media devices not supported');
      }
      
      this.currentAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        }
      });

      // Initialize audio enhancement
      const enhancedStream = await this.audioEnhancer.initializeAudioProcessing(
        this.currentAudioStream,
        {
          sampleRate: 16000,
          channels: 1,
          bitDepth: 16,
          bufferSize: 4096,
          enableNoiseReduction: true,
          enableEchoCancellation: true
        }
      );

      // Initialize voice activity detection
      await this.voiceActivityDetector.initialize(enhancedStream);

      // Start continuous processing
      this.isProcessing = true;
      this.startContinuousProcessing(enhancedStream);

      this.emit('voice_processing_started');

    } catch (error) {
      this.emit('error', new Error(`Failed to start voice processing: ${error}`));
      throw error;
    }
  }

  /**
   * Stop voice processing
   */
  async stopVoiceProcessing(): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    this.isProcessing = false;

    if (this.currentAudioStream) {
      this.currentAudioStream.getTracks().forEach((track: any) => track.stop());
      this.currentAudioStream = null;
    }

    await this.speechRecognition.stopListening();
    this.voiceActivityDetector.cleanup();
    this.audioEnhancer.cleanup();

    this.emit('voice_processing_stopped');
  }

  /**
   * Process a single voice note and convert to memory
   */
  async processVoiceNote(audioData: ArrayBuffer, language?: string): Promise<VoiceMemory> {
    const voiceMemoryId = uuidv4();
    
    try {
      // For now, we'll simulate speech recognition
      // In a real implementation, this would use actual ASR
      const mockTranscription = await this.simulateSpeechRecognition(audioData);
      
      const voiceMemory: VoiceMemory = {
        id: voiceMemoryId,
        transcription: mockTranscription.text,
        audioData: this.options.enableAudioStorage ? audioData : undefined,
        duration: mockTranscription.duration,
        language: language || this.options.supportedLanguages[0],
        confidence: mockTranscription.confidence,
        timestamp: new Date(),
        metadata: {
          audioQuality: 0.8,
          backgroundNoise: 0.2,
          speakingRate: 150 // words per minute
        }
      };

      this.voiceMemories.set(voiceMemoryId, voiceMemory);

      // Check for voice commands
      const command = this.commandProcessor.processCommand(voiceMemory.transcription);
      if (command) {
        this.emit('voice_command_detected', {
          voiceMemory,
          command
        });
      }

      this.emit('voice_memory_created', voiceMemory);
      
      return voiceMemory;

    } catch (error) {
      this.emit('error', new Error(`Failed to process voice note: ${error}`));
      throw error;
    }
  }

  /**
   * Get voice memory by ID
   */
  getVoiceMemory(id: string): VoiceMemory | undefined {
    return this.voiceMemories.get(id);
  }

  /**
   * Get all voice memories
   */
  getAllVoiceMemories(): VoiceMemory[] {
    return Array.from(this.voiceMemories.values());
  }

  /**
   * Delete voice memory
   */
  deleteVoiceMemory(id: string): boolean {
    return this.voiceMemories.delete(id);
  }

  /**
   * Check if currently processing voice
   */
  isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return this.options.supportedLanguages;
  }

  /**
   * Set processing language
   */
  setLanguage(language: string): void {
    if (this.options.supportedLanguages.includes(language)) {
      this.speechRecognition.setLanguage(language);
    }
  }

  private async startContinuousProcessing(audioStream: MediaStream): Promise<void> {
    const processVoiceActivity = () => {
      if (!this.isProcessing) return;

      const activity = this.voiceActivityDetector.detectActivity();
      
      if (activity.isActive && activity.confidence > this.options.confidenceThreshold) {
        this.emit('voice_activity_detected', activity);
        
        // Start speech recognition when voice is detected
        if (!this.speechRecognition.isCurrentlyListening()) {
          this.speechRecognition.startListening();
        }
      }

      // Continue monitoring
      requestAnimationFrame(processVoiceActivity);
    };

    processVoiceActivity();
  }

  private async simulateSpeechRecognition(audioData: ArrayBuffer): Promise<SpeechRecognitionResult> {
    // This is a simulation - in a real implementation, you would:
    // 1. Send audio to a speech recognition service (Google, Azure, AWS, etc.)
    // 2. Or use a local speech recognition library
    // 3. Process the audio buffer and return transcription
    
    return {
      text: "This is a simulated transcription of the voice note.",
      confidence: 0.85,
      language: this.options.supportedLanguages[0],
      alternatives: [
        { text: "This is a simulated transcription of the voice note.", confidence: 0.85 },
        { text: "This is a generated transcription of the voice note.", confidence: 0.75 }
      ],
      timestamp: new Date(),
      duration: 3000 // 3 seconds
    };
  }
}

// Export types for external use
export type {
  AudioConfig,
  VoiceActivity,
  SpeechRecognitionResult,
  SpeechAlternative,
  VoiceCommand,
  VoiceMemory,
  VoiceProcessingOptions
};

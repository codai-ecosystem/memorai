/**
 * Voice Search Enhancement for Memorai Dashboard
 * Revolutionary feature for 110% perfection achievement
 */

class VoiceSearchEngine {
  constructor(dashboard) {
    this.dashboard = dashboard;
    this.recognition = null;
    this.isListening = false;
    this.supportedLanguages = ["en-US", "en-GB", "es-ES", "fr-FR", "de-DE"];
    this.confidence = 0;
    this.transcript = "";

    this.initializeVoiceRecognition();
  }

  /**
   * Initialize Web Speech API with advanced configuration
   */
  initializeVoiceRecognition() {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      console.warn("Voice search not supported in this browser");
      this.showFallbackUI();
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();

    // Advanced configuration
    this.recognition.continuous = false;
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 3;
    this.recognition.lang = this.getPreferredLanguage();

    this.setupEventListeners();
  }

  /**
   * Setup advanced event listeners with intelligent processing
   */
  setupEventListeners() {
    this.recognition.onstart = () => {
      this.isListening = true;
      this.updateVoiceUI("listening");
      this.showTranscriptFeedback();
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;

        if (result.isFinal) {
          finalTranscript += transcript;
          this.confidence = result[0].confidence;
        } else {
          interimTranscript += transcript;
        }
      }

      this.transcript = finalTranscript || interimTranscript;
      this.updateTranscriptDisplay(this.transcript, !finalTranscript);

      if (finalTranscript) {
        this.processVoiceQuery(finalTranscript, this.confidence);
      }
    };

    this.recognition.onerror = (event) => {
      this.handleVoiceError(event.error);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.updateVoiceUI("idle");
    };
  }

  /**
   * Intelligent voice query processing with NLP enhancement
   */
  async processVoiceQuery(transcript, confidence) {
    try {
      // Normalize and clean the transcript
      const cleanQuery = this.normalizeVoiceQuery(transcript);

      // Apply confidence-based filtering
      if (confidence < 0.7) {
        this.showConfirmationDialog(cleanQuery, confidence);
        return;
      }

      // Detect command vs search intent
      const intent = this.detectIntent(cleanQuery);

      switch (intent.type) {
        case "search":
          await this.executeVoiceSearch(intent.query);
          break;
        case "command":
          await this.executeVoiceCommand(intent.command, intent.parameters);
          break;
        case "navigation":
          this.executeNavigation(intent.target);
          break;
        default:
          await this.executeVoiceSearch(cleanQuery);
      }

      this.logVoiceInteraction(transcript, intent, confidence);
    } catch (error) {
      console.error("Voice query processing failed:", error);
      this.showVoiceError("Processing failed. Please try again.");
    }
  }

  /**
   * Advanced intent detection with natural language understanding
   */
  detectIntent(query) {
    const lowerQuery = query.toLowerCase();

    // Command patterns
    const commandPatterns = {
      "add memory": /^(add|create|store|remember)\s+(memory|note)\s+(.+)/i,
      "delete memory": /^(delete|remove|forget)\s+(memory|note)\s+(.+)/i,
      "show analytics": /^(show|display|open)\s+(analytics|statistics|stats)/i,
      "export data": /^(export|download|save)\s+(data|memories|all)/i,
      "clear search": /^(clear|reset)\s+(search|filter)/i,
    };

    for (const [command, pattern] of Object.entries(commandPatterns)) {
      const match = lowerQuery.match(pattern);
      if (match) {
        return {
          type: "command",
          command: command,
          parameters: match[3] || null,
          confidence: 0.9,
        };
      }
    }

    // Navigation patterns
    const navigationPatterns = {
      "go to analytics": /^(go\s+to|open|show)\s+(analytics|dashboard)/i,
      "go to settings": /^(go\s+to|open|show)\s+(settings|configuration)/i,
      "go to memories": /^(go\s+to|open|show)\s+(memories|memory\s+list)/i,
    };

    for (const [target, pattern] of Object.entries(navigationPatterns)) {
      if (lowerQuery.match(pattern)) {
        return {
          type: "navigation",
          target: target.split(" ")[2], // Extract target
          confidence: 0.85,
        };
      }
    }

    // Default to search
    return {
      type: "search",
      query: query,
      confidence: 0.8,
    };
  }

  /**
   * Execute intelligent voice search with enhanced algorithms
   */
  async executeVoiceSearch(query) {
    try {
      // Show voice search indicator
      this.updateVoiceUI("searching");

      // Enhanced query preprocessing
      const processedQuery = this.enhanceSearchQuery(query);

      // Execute search with voice-specific parameters
      const searchOptions = {
        query: processedQuery,
        fuzzyMatch: true,
        voiceSearch: true,
        confidenceBoost: 0.1, // Boost for voice queries
      };

      // Use advanced search if available
      let results;
      if (this.dashboard.advancedSearch) {
        results =
          await this.dashboard.advancedSearch.performSearch(searchOptions);
      } else {
        // Fallback to standard search
        await this.dashboard.searchMemories(processedQuery);
        return;
      }

      // Enhanced result processing for voice
      this.processVoiceSearchResults(results, query);

      // Provide audio feedback
      this.announceSearchResults(results.length);
    } catch (error) {
      console.error("Voice search failed:", error);
      this.showVoiceError("Search failed. Please try again.");
    } finally {
      this.updateVoiceUI("idle");
    }
  }

  /**
   * Execute voice commands with intelligent parameter extraction
   */
  async executeVoiceCommand(command, parameters) {
    this.updateVoiceUI("processing");

    try {
      switch (command) {
        case "add memory":
          if (parameters) {
            await this.dashboard.addMemoryFromVoice(parameters);
            this.announceSuccess("Memory added successfully");
          } else {
            this.requestMoreInfo("What would you like to remember?");
          }
          break;

        case "show analytics":
          this.dashboard.showAnalytics();
          this.announceSuccess("Analytics opened");
          break;

        case "export data":
          await this.dashboard.exportManager?.exportMemories();
          this.announceSuccess("Export started");
          break;

        case "clear search":
          this.dashboard.clearSearch();
          this.announceSuccess("Search cleared");
          break;

        default:
          this.showVoiceError("Command not recognized");
      }
    } catch (error) {
      console.error("Voice command failed:", error);
      this.showVoiceError("Command failed. Please try again.");
    } finally {
      this.updateVoiceUI("idle");
    }
  }

  /**
   * Enhanced query preprocessing for voice input
   */
  enhanceSearchQuery(query) {
    // Remove filler words
    const fillerWords = [
      "um",
      "uh",
      "like",
      "you know",
      "actually",
      "basically",
    ];
    let enhanced = query;

    fillerWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      enhanced = enhanced.replace(regex, "");
    });

    // Normalize spacing
    enhanced = enhanced.replace(/\s+/g, " ").trim();

    // Apply voice-specific enhancements
    enhanced = this.applyVoiceCorrections(enhanced);

    return enhanced;
  }

  /**
   * Apply common voice recognition corrections
   */
  applyVoiceCorrections(query) {
    const corrections = {
      "type script": "typescript",
      "java script": "javascript",
      "react j s": "reactjs",
      "node j s": "nodejs",
      "vs code": "vscode",
      "git hub": "github",
      "mem ori": "memory",
      "ai agent": "AI agent",
    };

    let corrected = query;
    Object.entries(corrections).forEach(([wrong, right]) => {
      const regex = new RegExp(wrong, "gi");
      corrected = corrected.replace(regex, right);
    });

    return corrected;
  }

  /**
   * Announce search results with audio feedback
   */
  announceSearchResults(count) {
    if (!this.shouldProvideAudioFeedback()) return;

    let message;
    if (count === 0) {
      message = "No memories found. Try a different search term.";
    } else if (count === 1) {
      message = "Found 1 memory.";
    } else {
      message = `Found ${count} memories.`;
    }

    this.speakMessage(message);
  }

  /**
   * Text-to-speech feedback
   */
  speakMessage(message) {
    if (!("speechSynthesis" in window)) return;

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = this.getPreferredLanguage();
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    speechSynthesis.speak(utterance);
  }

  /**
   * Get user's preferred language
   */
  getPreferredLanguage() {
    const userLang = navigator.language || navigator.userLanguage;
    return this.supportedLanguages.includes(userLang) ? userLang : "en-US";
  }

  /**
   * Toggle voice search listening
   */
  toggleVoiceSearch() {
    if (this.isListening) {
      this.stopListening();
    } else {
      this.startListening();
    }
  }

  /**
   * Start voice recognition
   */
  startListening() {
    if (!this.recognition) {
      this.showVoiceError("Voice search not supported");
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error("Failed to start voice recognition:", error);
      this.showVoiceError("Failed to start voice search");
    }
  }

  /**
   * Stop voice recognition
   */
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  /**
   * Update voice search UI with intelligent state management
   */
  updateVoiceUI(state) {
    const voiceButton = document.getElementById("voice-search");
    const voiceStatus = document.getElementById("voice-status");

    if (!voiceButton) return;

    // Reset classes
    voiceButton.className = "voice-search-btn";

    switch (state) {
      case "listening":
        voiceButton.classList.add("listening");
        voiceButton.setAttribute("aria-label", "Stop voice search");
        this.updateVoiceStatus("Listening...", "listening");
        break;

      case "processing":
        voiceButton.classList.add("processing");
        voiceButton.setAttribute("aria-label", "Processing voice input");
        this.updateVoiceStatus("Processing...", "processing");
        break;

      case "searching":
        voiceButton.classList.add("searching");
        this.updateVoiceStatus("Searching...", "searching");
        break;

      default:
        voiceButton.classList.add("idle");
        voiceButton.setAttribute("aria-label", "Start voice search");
        this.updateVoiceStatus("", "idle");
    }
  }

  /**
   * Update voice status display
   */
  updateVoiceStatus(message, state) {
    const voiceStatus = document.getElementById("voice-status");
    if (voiceStatus) {
      voiceStatus.textContent = message;
      voiceStatus.className = `voice-status ${state}`;
    }
  }

  /**
   * Enhanced error handling
   */
  handleVoiceError(error) {
    console.error("Voice recognition error:", error);

    const errorMessages = {
      network: "Network error. Please check your connection.",
      "not-allowed":
        "Microphone access denied. Please allow microphone access.",
      "no-speech": "No speech detected. Please try again.",
      "audio-capture": "Microphone not available.",
      aborted: "Voice search was cancelled.",
    };

    const message =
      errorMessages[error] || "Voice search error. Please try again.";
    this.showVoiceError(message);
  }

  /**
   * Show voice error with user-friendly messaging
   */
  showVoiceError(message) {
    this.dashboard.showToast(message, "error");
    this.updateVoiceUI("idle");
  }

  /**
   * Show fallback UI for unsupported browsers
   */
  showFallbackUI() {
    const voiceButton = document.getElementById("voice-search");
    if (voiceButton) {
      voiceButton.style.display = "none";
    }

    // Show alternative input method
    this.showKeyboardShortcutHint();
  }

  /**
   * Show keyboard shortcut hint as alternative
   */
  showKeyboardShortcutHint() {
    const hint = document.createElement("div");
    hint.className = "keyboard-hint";
    hint.innerHTML = "💡 Tip: Press Ctrl+K for quick search";

    const searchContainer = document.querySelector(".search-container");
    if (searchContainer) {
      searchContainer.appendChild(hint);
    }
  }

  /**
   * Check if audio feedback should be provided
   */
  shouldProvideAudioFeedback() {
    // Check user preferences and accessibility settings
    return localStorage.getItem("voice-feedback") !== "disabled";
  }

  /**
   * Log voice interaction for analytics
   */
  logVoiceInteraction(transcript, intent, confidence) {
    if (this.dashboard.analytics) {
      this.dashboard.analytics.logEvent("voice_search", {
        transcript: transcript,
        intent: intent.type,
        confidence: confidence,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

// Initialize voice search when dashboard is ready
document.addEventListener("DOMContentLoaded", () => {
  if (typeof MemoraiDashboard !== "undefined") {
    MemoraiDashboard.prototype.initVoiceSearch = function () {
      this.voiceSearch = new VoiceSearchEngine(this);

      // Setup voice search button
      const voiceButton = document.getElementById("voice-search");
      if (voiceButton) {
        voiceButton.addEventListener("click", () => {
          this.voiceSearch.toggleVoiceSearch();
        });
      }

      // Setup keyboard shortcut (Ctrl+Shift+V)
      document.addEventListener("keydown", (event) => {
        if (event.ctrlKey && event.shiftKey && event.key === "V") {
          event.preventDefault();
          this.voiceSearch.toggleVoiceSearch();
        }
      });
    };
  }
});

export { VoiceSearchEngine };

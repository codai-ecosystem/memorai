/**
 * STREAMING PROTOCOL - Bidirectional Real-time Communication
 * Enables live memory synchronization and event streaming
 */

import EventEmitter from 'events';
import { WebSocket } from 'ws';

export interface StreamingMessage {
  id: string;
  type: 'request' | 'response' | 'event' | 'stream';
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
  event?: string;
  data?: unknown;
  timestamp: number;
}

export interface StreamingOptions {
  heartbeatInterval: number;
  maxReconnectAttempts: number;
  bufferSize: number;
  compression: boolean;
}

export class StreamingProtocol extends EventEmitter {
  private ws: WebSocket | null = null;
  private messageQueue: StreamingMessage[] = [];
  private pendingRequests = new Map<
    string,
    (response: StreamingMessage) => void
  >();
  private subscriptions = new Map<string, Set<(data: unknown) => void>>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private options: StreamingOptions;

  constructor(options: Partial<StreamingOptions> = {}) {
    super();
    this.options = {
      heartbeatInterval: 30000, // 30 seconds
      maxReconnectAttempts: 5,
      bufferSize: 1000,
      compression: true,
      ...options,
    };
  }

  /**
   * Connect to streaming server
   */
  async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url);

        this.ws.on('open', () => {
          console.log('✅ Streaming protocol connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.flushMessageQueue();
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          this.handleMessage(data);
        });

        this.ws.on('close', () => {
          console.log('🔌 Streaming protocol disconnected');
          this.stopHeartbeat();
          this.handleDisconnect();
        });

        this.ws.on('error', error => {
          console.error('❌ Streaming protocol error:', error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send request and wait for response
   */
  async request(method: string, params?: unknown): Promise<unknown> {
    const id = this.generateId();
    const message: StreamingMessage = {
      id,
      type: 'request',
      method,
      params,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, response => {
        if (response.error) {
          reject(new Error(response.error as string));
        } else {
          resolve(response.result);
        }
      });

      this.sendMessage(message);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Send notification (no response expected)
   */
  notify(method: string, params?: unknown): void {
    const message: StreamingMessage = {
      id: this.generateId(),
      type: 'event',
      method,
      params,
      timestamp: Date.now(),
    };

    this.sendMessage(message);
  }

  /**
   * Subscribe to event stream
   */
  subscribe(event: string, callback: (data: unknown) => void): () => void {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
    }

    this.subscriptions.get(event)!.add(callback);

    // Send subscription request
    this.notify('subscribe', { event });

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscriptions.get(event);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscriptions.delete(event);
          this.notify('unsubscribe', { event });
        }
      }
    };
  }

  /**
   * Create memory stream for real-time updates
   */
  createMemoryStream(agentId: string): AsyncGenerator<unknown> {
    const streamId = this.generateId();

    return async function* (this: StreamingProtocol) {
      const buffer: unknown[] = [];
      let resolveNext: ((value: IteratorResult<unknown>) => void) | null = null;

      const unsubscribe = this.subscribe(`memory_stream_${streamId}`, data => {
        if (resolveNext) {
          resolveNext({ value: data, done: false });
          resolveNext = null;
        } else {
          buffer.push(data);
        }
      });

      // Start the stream
      this.notify('create_memory_stream', { streamId, agentId });

      try {
        while (true) {
          if (buffer.length > 0) {
            yield buffer.shift();
          } else {
            yield new Promise<IteratorResult<unknown>>(resolve => {
              resolveNext = resolve;
            }).then(result => result.value);
          }
        }
      } finally {
        unsubscribe();
        this.notify('close_memory_stream', { streamId });
      }
    }.call(this);
  }

  /**
   * Batch multiple operations
   */
  async batch(
    operations: Array<{ method: string; params?: unknown }>
  ): Promise<unknown[]> {
    const batchId = this.generateId();
    return this.request('batch', { batchId, operations }) as Promise<unknown[]>;
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: Buffer): void {
    try {
      const message: StreamingMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'response':
          this.handleResponse(message);
          break;

        case 'event':
          this.handleEvent(message);
          break;

        case 'stream':
          this.handleStreamData(message);
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Failed to parse message:', error);
    }
  }

  /**
   * Handle response message
   */
  private handleResponse(message: StreamingMessage): void {
    const callback = this.pendingRequests.get(message.id);
    if (callback) {
      this.pendingRequests.delete(message.id);
      callback(message);
    }
  }

  /**
   * Handle event message
   */
  private handleEvent(message: StreamingMessage): void {
    if (message.event) {
      const subscribers = this.subscriptions.get(message.event);
      if (subscribers) {
        subscribers.forEach(callback => {
          try {
            callback(message.data);
          } catch (error) {
            console.error('Event callback error:', error);
          }
        });
      }
    }

    this.emit('event', message);
  }

  /**
   * Handle stream data
   */
  private handleStreamData(message: StreamingMessage): void {
    if (message.event) {
      const subscribers = this.subscriptions.get(message.event);
      if (subscribers) {
        subscribers.forEach(callback => callback(message.data));
      }
    }
  }

  /**
   * Send message
   */
  private sendMessage(message: StreamingMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const data = JSON.stringify(message);
      this.ws.send(data);
    } else {
      // Queue message for when connection is restored
      if (this.messageQueue.length < this.options.bufferSize) {
        this.messageQueue.push(message);
      } else {
        console.warn('Message queue full, dropping message');
      }
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    while (
      this.messageQueue.length > 0 &&
      this.ws?.readyState === WebSocket.OPEN
    ) {
      const message = this.messageQueue.shift()!;
      this.sendMessage(message);
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.notify('ping');
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Handle disconnection and attempt reconnection
   */
  private handleDisconnect(): void {
    if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      console.log(
        `🔄 Attempting reconnection ${this.reconnectAttempts}/${this.options.maxReconnectAttempts} in ${delay}ms`
      );

      setTimeout(() => {
        // Reconnection logic would go here
        this.emit('reconnect_attempt', this.reconnectAttempts);
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.emit('connection_failed');
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Close connection
   */
  close(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingRequests.clear();
    this.subscriptions.clear();
    this.messageQueue.length = 0;
  }

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      isConnected: this.isConnected,
      pendingRequests: this.pendingRequests.size,
      subscriptions: this.subscriptions.size,
      queuedMessages: this.messageQueue.length,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

export default StreamingProtocol;

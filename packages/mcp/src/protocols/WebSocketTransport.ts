/**
 * WEBSOCKET TRANSPORT - Real-time Bidirectional Communication
 * High-performance WebSocket transport for MCP v3.0
 */

import { EventEmitter } from 'events';
import { Server } from 'http';
import { WebSocket, Server as WebSocketServer } from 'ws';
import { StreamingMessage } from './StreamingProtocol.js';

export interface WebSocketTransportOptions {
  port?: number;
  server?: Server;
  maxConnections?: number;
  heartbeatInterval?: number;
  compression?: boolean;
  maxMessageSize?: number;
}

export interface ClientConnection {
  id: string;
  ws: WebSocket;
  agentId?: string;
  tenantId?: string;
  authenticated: boolean;
  subscriptions: Set<string>;
  lastHeartbeat: number;
  metadata: Record<string, unknown>;
}

export class WebSocketTransport extends EventEmitter {
  private wss: WebSocketServer;
  private connections = new Map<string, ClientConnection>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private options: Required<WebSocketTransportOptions>;

  constructor(options: WebSocketTransportOptions = {}) {
    super();

    this.options = {
      port: 8080,
      server: undefined,
      maxConnections: 1000,
      heartbeatInterval: 30000,
      compression: true,
      maxMessageSize: 10 * 1024 * 1024, // 10MB
      ...options,
    };

    // Create WebSocket server
    if (options.server) {
      this.wss = new WebSocketServer({
        server: options.server,
        perMessageDeflate: this.options.compression,
        maxPayload: this.options.maxMessageSize,
      });
    } else {
      this.wss = new WebSocketServer({
        port: this.options.port,
        perMessageDeflate: this.options.compression,
        maxPayload: this.options.maxMessageSize,
      });
    }

    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  /**
   * Setup WebSocket server event handlers
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientId = this.generateClientId();

      // Check connection limit
      if (this.connections.size >= this.options.maxConnections) {
        ws.close(1013, 'Server overloaded');
        return;
      }

      // Create client connection
      const connection: ClientConnection = {
        id: clientId,
        ws,
        authenticated: false,
        subscriptions: new Set(),
        lastHeartbeat: Date.now(),
        metadata: {
          ip: request.socket.remoteAddress,
          userAgent: request.headers['user-agent'],
          connectedAt: new Date().toISOString(),
        },
      };

      this.connections.set(clientId, connection);
      console.log(
        `🔌 WebSocket client connected: ${clientId} (${this.connections.size} total)`
      );

      // Setup client event handlers
      ws.on('message', (data: Buffer) => {
        this.handleClientMessage(clientId, data);
      });

      ws.on('close', (code: number, reason: Buffer) => {
        this.handleClientDisconnect(clientId, code, reason.toString());
      });

      ws.on('error', (error: Error) => {
        console.error(`❌ WebSocket error for client ${clientId}:`, error);
        this.connections.delete(clientId);
      });

      ws.on('pong', () => {
        const conn = this.connections.get(clientId);
        if (conn) {
          conn.lastHeartbeat = Date.now();
        }
      });

      // Send welcome message
      this.sendToClient(clientId, {
        id: this.generateMessageId(),
        type: 'event',
        event: 'connected',
        data: {
          clientId,
          serverVersion: '3.0.0',
          capabilities: this.getServerCapabilities(),
        },
        timestamp: Date.now(),
      });

      this.emit('client_connected', { clientId, connection });
    });

    this.wss.on('error', (error: Error) => {
      console.error('❌ WebSocket server error:', error);
      this.emit('server_error', error);
    });
  }

  /**
   * Handle incoming client message
   */
  private handleClientMessage(clientId: string, data: Buffer): void {
    const connection = this.connections.get(clientId);
    if (!connection) return;

    try {
      const message: StreamingMessage = JSON.parse(data.toString());

      // Update heartbeat
      connection.lastHeartbeat = Date.now();

      // Handle different message types
      switch (message.type) {
        case 'request':
          this.handleClientRequest(clientId, message);
          break;

        case 'response':
          this.handleClientResponse(clientId, message);
          break;

        case 'event':
          this.handleClientEvent(clientId, message);
          break;

        default:
          this.sendError(clientId, message.id, 'Unknown message type');
      }

      this.emit('message_received', { clientId, message });
    } catch (error) {
      console.error(`❌ Failed to parse message from ${clientId}:`, error);
      this.sendError(clientId, 'parse_error', 'Invalid message format');
    }
  }

  /**
   * Handle client request
   */
  private async handleClientRequest(
    clientId: string,
    message: StreamingMessage
  ): Promise<void> {
    const connection = this.connections.get(clientId);
    if (!connection) return;

    try {
      // Handle built-in methods
      switch (message.method) {
        case 'authenticate':
          await this.handleAuthentication(clientId, message);
          break;

        case 'subscribe':
          this.handleSubscription(clientId, message);
          break;

        case 'unsubscribe':
          this.handleUnsubscription(clientId, message);
          break;

        case 'ping':
          this.sendToClient(clientId, {
            id: message.id,
            type: 'response',
            result: { pong: true, timestamp: Date.now() },
            timestamp: Date.now(),
          });
          break;

        default:
          // Forward to application handler
          this.emit('client_request', { clientId, message, connection });
      }
    } catch (error) {
      this.sendError(clientId, message.id, `Request failed: ${error}`);
    }
  }

  /**
   * Handle client response
   */
  private handleClientResponse(
    clientId: string,
    message: StreamingMessage
  ): void {
    this.emit('client_response', { clientId, message });
  }

  /**
   * Handle client event
   */
  private handleClientEvent(clientId: string, message: StreamingMessage): void {
    this.emit('client_event', { clientId, message });
  }

  /**
   * Handle authentication
   */
  private async handleAuthentication(
    clientId: string,
    message: StreamingMessage
  ): Promise<void> {
    const connection = this.connections.get(clientId);
    if (!connection) return;

    const { token, agentId, tenantId } = message.params as any;

    // Basic token validation (implement proper JWT validation)
    if (this.validateToken(token)) {
      connection.authenticated = true;
      connection.agentId = agentId;
      connection.tenantId = tenantId;

      this.sendToClient(clientId, {
        id: message.id,
        type: 'response',
        result: {
          authenticated: true,
          agentId,
          tenantId,
          permissions: this.getClientPermissions(agentId),
        },
        timestamp: Date.now(),
      });

      console.log(`✅ Client ${clientId} authenticated as ${agentId}`);
    } else {
      this.sendError(clientId, message.id, 'Authentication failed');
    }
  }

  /**
   * Handle subscription
   */
  private handleSubscription(
    clientId: string,
    message: StreamingMessage
  ): void {
    const connection = this.connections.get(clientId);
    if (!connection) return;

    const { event } = message.params as any;

    if (event && typeof event === 'string') {
      connection.subscriptions.add(event);

      this.sendToClient(clientId, {
        id: message.id,
        type: 'response',
        result: { subscribed: true, event },
        timestamp: Date.now(),
      });

      console.log(`📡 Client ${clientId} subscribed to ${event}`);
      this.emit('subscription_added', { clientId, event });
    } else {
      this.sendError(clientId, message.id, 'Invalid event name');
    }
  }

  /**
   * Handle unsubscription
   */
  private handleUnsubscription(
    clientId: string,
    message: StreamingMessage
  ): void {
    const connection = this.connections.get(clientId);
    if (!connection) return;

    const { event } = message.params as any;

    if (event && connection.subscriptions.has(event)) {
      connection.subscriptions.delete(event);

      this.sendToClient(clientId, {
        id: message.id,
        type: 'response',
        result: { unsubscribed: true, event },
        timestamp: Date.now(),
      });

      console.log(`📡 Client ${clientId} unsubscribed from ${event}`);
      this.emit('subscription_removed', { clientId, event });
    }
  }

  /**
   * Handle client disconnect
   */
  private handleClientDisconnect(
    clientId: string,
    code: number,
    reason: string
  ): void {
    const connection = this.connections.get(clientId);
    if (connection) {
      console.log(`🔌 Client ${clientId} disconnected: ${code} ${reason}`);
      this.connections.delete(clientId);
      this.emit('client_disconnected', { clientId, code, reason, connection });
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId: string, message: StreamingMessage): boolean {
    const connection = this.connections.get(clientId);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const data = JSON.stringify(message);
      connection.ws.send(data);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send message to ${clientId}:`, error);
      return false;
    }
  }

  /**
   * Send error to client
   */
  private sendError(clientId: string, messageId: string, error: string): void {
    this.sendToClient(clientId, {
      id: messageId,
      type: 'response',
      error,
      timestamp: Date.now(),
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(
    message: StreamingMessage,
    filter?: (connection: ClientConnection) => boolean
  ): number {
    let sent = 0;

    for (const [clientId, connection] of this.connections) {
      if (!filter || filter(connection)) {
        if (this.sendToClient(clientId, message)) {
          sent++;
        }
      }
    }

    return sent;
  }

  /**
   * Broadcast to subscribed clients
   */
  broadcastToSubscribers(event: string, data: unknown): number {
    const message: StreamingMessage = {
      id: this.generateMessageId(),
      type: 'stream',
      event,
      data,
      timestamp: Date.now(),
    };

    return this.broadcast(message, conn => conn.subscriptions.has(event));
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      const timeout = this.options.heartbeatInterval * 2;

      for (const [clientId, connection] of this.connections) {
        if (now - connection.lastHeartbeat > timeout) {
          console.log(`💔 Client ${clientId} heartbeat timeout, disconnecting`);
          connection.ws.terminate();
          this.connections.delete(clientId);
        } else if (connection.ws.readyState === WebSocket.OPEN) {
          // Send ping
          connection.ws.ping();
        }
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Validate authentication token
   */
  private validateToken(token: string): boolean {
    // Implement proper JWT validation here
    return token && token.length > 10;
  }

  /**
   * Get client permissions
   */
  private getClientPermissions(agentId: string): string[] {
    // Implement role-based permissions
    return ['memory:read', 'memory:write', 'memory:delete'];
  }

  /**
   * Get server capabilities
   */
  private getServerCapabilities(): Record<string, unknown> {
    return {
      streaming: true,
      compression: this.options.compression,
      maxMessageSize: this.options.maxMessageSize,
      heartbeatInterval: this.options.heartbeatInterval,
      features: [
        'real_time_sync',
        'memory_streaming',
        'cross_agent_collaboration',
        'natural_language_queries',
        'semantic_search',
      ],
    };
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    const connectionsByAgent = new Map<string, number>();
    const connectionsByTenant = new Map<string, number>();
    let authenticatedConnections = 0;

    for (const connection of this.connections.values()) {
      if (connection.authenticated) {
        authenticatedConnections++;
      }

      if (connection.agentId) {
        connectionsByAgent.set(
          connection.agentId,
          (connectionsByAgent.get(connection.agentId) || 0) + 1
        );
      }

      if (connection.tenantId) {
        connectionsByTenant.set(
          connection.tenantId,
          (connectionsByTenant.get(connection.tenantId) || 0) + 1
        );
      }
    }

    return {
      totalConnections: this.connections.size,
      authenticatedConnections,
      maxConnections: this.options.maxConnections,
      connectionsByAgent: Object.fromEntries(connectionsByAgent),
      connectionsByTenant: Object.fromEntries(connectionsByTenant),
      serverUptime: process.uptime(),
    };
  }

  /**
   * Get connected clients
   */
  getConnectedClients(): ClientConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get client by ID
   */
  getClient(clientId: string): ClientConnection | undefined {
    return this.connections.get(clientId);
  }

  /**
   * Disconnect client
   */
  disconnectClient(
    clientId: string,
    code = 1000,
    reason = 'Server initiated'
  ): boolean {
    const connection = this.connections.get(clientId);
    if (connection) {
      connection.ws.close(code, reason);
      return true;
    }
    return false;
  }

  /**
   * Close server
   */
  async close(): Promise<void> {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    // Close all client connections
    for (const connection of this.connections.values()) {
      connection.ws.close(1001, 'Server shutting down');
    }

    this.connections.clear();

    // Close WebSocket server
    return new Promise(resolve => {
      this.wss.close(() => {
        console.log('✅ WebSocket transport closed');
        resolve();
      });
    });
  }
}

export default WebSocketTransport;

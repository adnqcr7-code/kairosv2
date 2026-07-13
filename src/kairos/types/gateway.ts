// Gateway Type Definitions
// Inspired by OpenClaw's Gateway architecture

/**
 * Gateway Message
 * Standard message format for all gateway communications
 */
export interface GatewayMessage {
  id: string;
  platform: string;
  channelId: string;
  userId?: string;
  sessionId?: string;
  content: string;
  timestamp: Date;
  metadata?: GatewayMessageMetadata;
  attachments?: GatewayAttachment[];
}

/**
 * Gateway Message Metadata
 */
export interface GatewayMessageMetadata {
  type?: GatewayMessageType;
  command?: string;
  args?: any[];
  request?: GatewayRequest;
  toolCall?: any;
  toolResult?: any;
  error?: string;
  [key: string]: any;
}

/**
 * Gateway Message Types
 */
export type GatewayMessageType = 
  | 'message'
  | 'command'
  | 'tool-call'
  | 'tool-result'
  | 'agent-request'
  | 'agent-response'
  | 'error'
  | 'help'
  | 'status'
  | 'unknown-command';

/**
 * Gateway Attachment
 */
export interface GatewayAttachment {
  id: string;
  name: string;
  type: 'file' | 'image' | 'audio' | 'video' | 'document';
  url?: string;
  path?: string;
  content?: string; // Base64 encoded for small attachments
  size: number;
  mimeType: string;
  metadata?: Record<string, any>;
}

/**
 * Gateway Request
 * For agent requests and other structured requests
 */
export interface GatewayRequest {
  id: string;
  type: GatewayRequestType;
  timestamp: Date;
  [key: string]: any;
}

/**
 * Gateway Request Types
 */
export type GatewayRequestType = 
  | 'start'
  | 'stop'
  | 'status'
  | 'pause'
  | 'resume'
  | 'configure'
  | 'custom';

/**
 * Channel Types
 * Supported communication platforms
 */
export type ChannelPlatform = 
  | 'cli'
  | 'telegram'
  | 'discord'
  | 'slack'
  | 'whatsapp'
  | 'signal'
  | 'imessage'
  | 'irc'
  | 'microsoft-teams'
  | 'matrix'
  | 'feishu'
  | 'line'
  | 'mattermost'
  | 'nextcloud-talk'
  | 'nostr'
  | 'synology-chat'
  | 'tlon'
  | 'twitch'
  | 'zalo'
  | 'wechat'
  | 'qq'
  | 'webchat'
  | 'web'
  | 'desktop'
  | 'mobile'
  | 'custom';

/**
 * Channel Adapter Interface
 * Base interface for all channel adapters
 */
export interface ChannelAdapter {
  // Channel identity
  id: string;
  platform: ChannelPlatform;
  name: string;
  description?: string;
  
  // Connection management
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  reconnect(): Promise<void>;
  
  // Message handling
  send(message: GatewayMessage): Promise<void>;
  onMessage(handler: (message: GatewayMessage) => Promise<void>): void;
  
  // Command handling
  sendCommand(command: string, args: any[]): Promise<any>;
  onCommand(command: string, handler: (...args: any[]) => Promise<any>): void;
  
  // Metadata
  getInfo(): Promise<ChannelInfo>;
  
  // Lifecycle
  initialize?(): Promise<void>;
  cleanup?(): Promise<void>;
  
  // Health
  checkHealth?(): Promise<ChannelHealth>;
}

/**
 * Channel Information
 */
export interface ChannelInfo {
  id: string;
  platform: ChannelPlatform;
  name: string;
  description?: string;
  isConnected: boolean;
  lastMessageAt?: Date;
  messageCount: number;
  errorCount: number;
  metadata?: Record<string, any>;
}

/**
 * Channel Health
 */
export interface ChannelHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  checks: ChannelHealthCheck[];
  issues: string[];
  warnings: string[];
}

/**
 * Channel Health Check
 */
export interface ChannelHealthCheck {
  name: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  message: string;
  details?: Record<string, any>;
}

/**
 * Channel Configuration
 */
export interface ChannelConfig {
  id: string;
  platform: ChannelPlatform;
  name: string;
  
  // Connection settings
  enabled: boolean;
  autoConnect: boolean;
  
  // Platform-specific settings
  settings: Record<string, any>;
  
  // Security
  auth?: {
    type: 'none' | 'api-key' | 'oauth' | 'token' | 'custom';
    credentials: Record<string, string>;
  };
  
  // Rate limiting
  rateLimit?: {
    messagesPerMinute: number;
    burstLimit: number;
  };
  
  // Metadata
  tags?: string[];
  priority?: number;
}

/**
 * Channel Registry Entry
 */
export interface ChannelRegistryEntry {
  id: string;
  platform: ChannelPlatform;
  adapter: ChannelAdapter;
  config: ChannelConfig;
  status: 'connected' | 'disconnected' | 'error' | 'disabled';
  error?: string;
  connectedAt?: Date;
  disconnectedAt?: Date;
}

/**
 * Session Configuration
 */
export interface SessionConfig {
  id?: string;
  userId?: string;
  channelId?: string;
  platform?: ChannelPlatform;
  
  // Agent
  agentId?: string;
  agentConfig?: any;
  
  // Provider
  providerId?: string;
  modelId?: string;
  
  // Tools
  availableTools?: string[];
  enabledToolsets?: string[];
  
  // Context
  workingDirectory?: string;
  environment?: Record<string, string>;
  capabilities?: string[];
  
  // Conversation
  conversationId?: string;
  messageHistory?: GatewayMessage[];
  
  // Settings
  timeout?: number;
  maxIterations?: number;
  budget?: number;
}

/**
 * Session Event Types
 */
export type SessionEventType = 
  | 'created'
  | 'connected'
  | 'disconnected'
  | 'message-received'
  | 'message-sent'
  | 'tool-called'
  | 'tool-result'
  | 'agent-started'
  | 'agent-completed'
  | 'agent-error'
  | 'error'
  | 'closed'
  | 'timeout';

/**
 * Session Event
 */
export interface SessionEvent {
  type: SessionEventType;
  timestamp: Date;
  sessionId: string;
  data?: any;
  metadata?: Record<string, any>;
}

/**
 * Session Event Handler
 */
export type SessionEventHandler = (event: SessionEvent) => Promise<void>;

/**
 * Gateway API Configuration
 */
export interface GatewayApiConfig {
  // REST API
  rest?: {
    enabled: boolean;
    prefix: string;
    cors: {
      enabled: boolean;
      origins: string[];
      methods: string[];
      headers: string[];
    };
  };
  
  // WebSocket
  websocket?: {
    enabled: boolean;
    path: string;
    pingInterval: number;
    maxConnections: number;
  };
  
  // JSON-RPC
  jsonRpc?: {
    enabled: boolean;
    path: string;
    version: string;
  };
  
  // Authentication
  auth?: {
    enabled: boolean;
    type: 'none' | 'api-key' | 'jwt' | 'session-token';
    apiKey?: string;
    jwtSecret?: string;
    sessionTimeout: number;
  };
  
  // Rate limiting
  rateLimit?: {
    enabled: boolean;
    requestsPerMinute: number;
    burstLimit: number;
    whitelist: string[];
  };
}

/**
 * Gateway API Endpoint
 */
export interface GatewayApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'WEBSOCKET';
  path: string;
  handler: (request: any) => Promise<any>;
  middleware?: ((request: any, next: () => Promise<any>) => Promise<any>)[];
  authRequired?: boolean;
  rateLimited?: boolean;
}

/**
 * Gateway Middleware
 */
export type GatewayMiddleware = (
  request: any,
  next: () => Promise<any>
) => Promise<any>;

/**
 * Gateway Error
 */
export class GatewayError extends Error {
  code: string;
  statusCode: number;
  details?: any;
  
  constructor(
    message: string,
    options?: {
      code?: string;
      statusCode?: number;
      details?: any;
      cause?: Error;
    }
  ) {
    super(message);
    this.name = 'GatewayError';
    this.code = options?.code || 'GATEWAY_ERROR';
    this.statusCode = options?.statusCode || 500;
    this.details = options?.details;
    
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Gateway Rate Limit Error
 */
export class GatewayRateLimitError extends GatewayError {
  retryAfter: number;
  
  constructor(retryAfter: number, message?: string) {
    super(
      message || `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
      {
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        details: { retryAfter }
      }
    );
    this.retryAfter = retryAfter;
  }
}

/**
 * Gateway Authentication Error
 */
export class GatewayAuthError extends GatewayError {
  constructor(message?: string) {
    super(
      message || 'Authentication required',
      {
        code: 'AUTHENTICATION_REQUIRED',
        statusCode: 401
      }
    );
  }
}

/**
 * Gateway Authorization Error
 */
export class GatewayAuthzError extends GatewayError {
  constructor(message?: string) {
    super(
      message || 'Authorization denied',
      {
        code: 'AUTHORIZATION_DENIED',
        statusCode: 403
      }
    );
  }
}

/**
 * Gateway Not Found Error
 */
export class GatewayNotFoundError extends GatewayError {
  constructor(resource: string, id: string, message?: string) {
    super(
      message || `${resource} not found: ${id}`,
      {
        code: 'NOT_FOUND',
        statusCode: 404,
        details: { resource, id }
      }
    );
  }
}

/**
 * Gateway Validation Error
 */
export class GatewayValidationError extends GatewayError {
  errors: Record<string, string[]>;
  
  constructor(errors: Record<string, string[]>, message?: string) {
    super(
      message || 'Validation failed',
      {
        code: 'VALIDATION_FAILED',
        statusCode: 400,
        details: { errors }
      }
    );
    this.errors = errors;
  }
}

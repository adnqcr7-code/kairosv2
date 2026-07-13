// Gateway Architecture
// Inspired by OpenClaw's Gateway control plane
// Single control plane for sessions, channels, tools, and events

import type {
  GatewayMessage,
  AgentMessage
} from '../../types/gateway';

import type {
  AgentConfig,
  AgentState,
  AgentTask
} from '../../types/agents';

import type {
  ToolSchema,
  ToolCall,
  ToolResult
} from '../../types/tools';

import type {
  ProviderConfig,
  ProviderHealth
} from '../../types/providers';

/**
 * Gateway Configuration
 */
export interface GatewayConfig {
  id: string;
  name: string;
  description?: string;
  
  // Network
  host: string;
  port: number;
  
  // Security
  authToken?: string;
  corsOrigins?: string[];
  rateLimit?: {
    requestsPerMinute: number;
    burstLimit: number;
  };
  
  // Features
  enableWebSocket: boolean;
  enableRest: boolean;
  enableJsonRpc: boolean;
  
  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // SSL/TLS
  ssl?: {
    certPath: string;
    keyPath: string;
  };
}

/**
 * Gateway Session
 * Represents an active session with a user/agent
 */
export interface GatewaySession {
  id: string;
  userId?: string;
  agentId?: string;
  channelId: string;
  platform: string;
  
  // State
  status: 'active' | 'idle' | 'closed' | 'error';
  createdAt: Date;
  lastActivityAt: Date;
  
  // Context
  workingDirectory?: string;
  environment: Record<string, string>;
  capabilities: string[];
  
  // Conversation
  conversationId?: string;
  messageHistory: GatewayMessage[];
  
  // Tools
  availableTools: string[];
  enabledToolsets: string[];
  
  // Provider
  providerId?: string;
  modelId?: string;
}

/**
 * Gateway Channel
 * Interface for communication channels
 */
export interface GatewayChannel {
  id: string;
  platform: string;
  name: string;
  description?: string;
  
  // Connection
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // Messaging
  send(message: GatewayMessage): Promise<void>;
  onMessage(handler: (message: GatewayMessage) => Promise<void>): void;
  
  // Commands
  sendCommand(command: string, args: any[]): Promise<any>;
  onCommand(command: string, handler: (...args: any[]) => Promise<any>): void;
  
  // Metadata
  getInfo(): Promise<ChannelInfo>;
}

/**
 * Channel Information
 */
export interface ChannelInfo {
  id: string;
  platform: string;
  name: string;
  description?: string;
  isConnected: boolean;
  lastMessageAt?: Date;
  messageCount: number;
  errorCount: number;
}

/**
 * Gateway Event Types
 */
export type GatewayEventType = 
  | 'session:created'
  | 'session:closed'
  | 'session:error'
  | 'message:received'
  | 'message:sent'
  | 'tool:called'
  | 'tool:result'
  | 'agent:started'
  | 'agent:completed'
  | 'agent:error'
  | 'provider:connected'
  | 'provider:disconnected'
  | 'provider:error'
  | 'channel:connected'
  | 'channel:disconnected'
  | 'custom';

/**
 * Gateway Event
 */
export interface GatewayEvent {
  type: GatewayEventType;
  timestamp: Date;
  sessionId?: string;
  channelId?: string;
  agentId?: string;
  data?: any;
  metadata?: Record<string, any>;
}

/**
 * Gateway Event Handler
 */
export type GatewayEventHandler = (event: GatewayEvent) => Promise<void>;

/**
 * Gateway Statistics
 */
export interface GatewayStats {
  // Sessions
  totalSessions: number;
  activeSessions: number;
  idleSessions: number;
  
  // Messages
  messagesReceived: number;
  messagesSent: number;
  
  // Tools
  toolCalls: number;
  toolSuccesses: number;
  toolFailures: number;
  
  // Agents
  agentsStarted: number;
  agentsCompleted: number;
  agentsFailed: number;
  
  // Channels
  channelsConnected: number;
  channelsActive: number;
  
  // Performance
  uptime: number; // Seconds
  startTime: Date;
  lastReset: Date;
}

/**
 * Gateway Health Status
 */
export interface GatewayHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheck[];
  issues: string[];
  warnings: string[];
}

/**
 * Health Check Result
 */
export interface HealthCheck {
  name: string;
  status: 'passed' | 'failed' | 'warning' | 'skipped';
  message: string;
  details?: Record<string, any>;
}

/**
 * Main Gateway Class
 * Single control plane for all Kairos operations
 */
export class KairosGateway {
  private config: GatewayConfig;
  private logger: any;
  private eventBus: EventBus;
  private sessionManager: SessionManager;
  private channelManager: ChannelManager;
  private toolRegistry: any;
  private agentRegistry: any;
  private providerRegistry: any;
  
  // State
  private startedAt: Date | null = null;
  private isRunning: boolean = false;
  private stats: GatewayStats;

  constructor(
    config: Partial<GatewayConfig> = {},
    logger: any = console,
    dependencies: {
      eventBus?: EventBus;
      sessionManager?: SessionManager;
      channelManager?: ChannelManager;
      toolRegistry?: any;
      agentRegistry?: any;
      providerRegistry?: any;
    } = {}
  ) {
    this.config = {
      id: 'kairos-gateway',
      name: 'Kairos Gateway',
      host: 'localhost',
      port: 3000,
      enableWebSocket: true,
      enableRest: true,
      enableJsonRpc: true,
      logLevel: 'info',
      ...config
    };
    
    this.logger = logger;
    this.eventBus = dependencies.eventBus || new EventBus();
    this.sessionManager = dependencies.sessionManager || new SessionManager(this);
    this.channelManager = dependencies.channelManager || new ChannelManager(this);
    this.toolRegistry = dependencies.toolRegistry;
    this.agentRegistry = dependencies.agentRegistry;
    this.providerRegistry = dependencies.providerRegistry;
    
    this.stats = this.createEmptyStats();
  }

  /**
   * Create empty statistics
   */
  private createEmptyStats(): GatewayStats {
    return {
      totalSessions: 0,
      activeSessions: 0,
      idleSessions: 0,
      messagesReceived: 0,
      messagesSent: 0,
      toolCalls: 0,
      toolSuccesses: 0,
      toolFailures: 0,
      agentsStarted: 0,
      agentsCompleted: 0,
      agentsFailed: 0,
      channelsConnected: 0,
      channelsActive: 0,
      uptime: 0,
      startTime: new Date(),
      lastReset: new Date()
    };
  }

  /**
   * Start the gateway
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Gateway is already running');
      return;
    }

    this.logger.info(`Starting Kairos Gateway on ${this.config.host}:${this.config.port}`);
    
    try {
      // Initialize all managers
      await this.sessionManager.initialize();
      await this.channelManager.initialize();
      
      // Start event bus
      this.eventBus.start();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Mark as running
      this.isRunning = true;
      this.startedAt = new Date();
      
      this.logger.info('Kairos Gateway started successfully');
      
      // Emit start event
      await this.eventBus.emit({
        type: 'gateway:started',
        timestamp: new Date(),
        data: {
          config: this.config,
          timestamp: this.startedAt
        }
      });
      
    } catch (error) {
      this.logger.error(`Failed to start gateway: ${error}`);
      throw error;
    }
  }

  /**
   * Stop the gateway
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Gateway is not running');
      return;
    }

    this.logger.info('Stopping Kairos Gateway...');
    
    try {
      // Stop all sessions
      await this.sessionManager.closeAll();
      
      // Disconnect all channels
      await this.channelManager.disconnectAll();
      
      // Stop event bus
      this.eventBus.stop();
      
      // Mark as stopped
      this.isRunning = false;
      
      this.logger.info('Kairos Gateway stopped');
      
      // Emit stop event
      await this.eventBus.emit({
        type: 'gateway:stopped',
        timestamp: new Date(),
        data: {
          uptime: this.stats.uptime
        }
      });
      
    } catch (error) {
      this.logger.error(`Failed to stop gateway: ${error}`);
      throw error;
    }
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Session events
    this.eventBus.on('session:created', async (event) => {
      this.stats.totalSessions++;
      this.stats.activeSessions++;
    });
    
    this.eventBus.on('session:closed', async (event) => {
      this.stats.activeSessions--;
      this.stats.idleSessions--;
    });
    
    this.eventBus.on('session:error', async (event) => {
      this.stats.activeSessions--;
    });
    
    // Message events
    this.eventBus.on('message:received', async (event) => {
      this.stats.messagesReceived++;
    });
    
    this.eventBus.on('message:sent', async (event) => {
      this.stats.messagesSent++;
    });
    
    // Tool events
    this.eventBus.on('tool:called', async (event) => {
      this.stats.toolCalls++;
    });
    
    this.eventBus.on('tool:result', async (event: any) => {
      if (event.data?.success) {
        this.stats.toolSuccesses++;
      } else {
        this.stats.toolFailures++;
      }
    });
    
    // Agent events
    this.eventBus.on('agent:started', async (event) => {
      this.stats.agentsStarted++;
    });
    
    this.eventBus.on('agent:completed', async (event) => {
      this.stats.agentsCompleted++;
    });
    
    this.eventBus.on('agent:error', async (event) => {
      this.stats.agentsFailed++;
    });
    
    // Channel events
    this.eventBus.on('channel:connected', async (event) => {
      this.stats.channelsConnected++;
      this.stats.channelsActive++;
    });
    
    this.eventBus.on('channel:disconnected', async (event) => {
      this.stats.channelsActive--;
    });
  }

  /**
   * Get gateway configuration
   */
  getConfig(): GatewayConfig {
    return { ...this.config };
  }

  /**
   * Update gateway configuration
   */
  updateConfig(updates: Partial<GatewayConfig>): void {
    this.config = { ...this.config, ...updates };
    this.logger.info('Gateway configuration updated');
  }

  /**
   * Get gateway statistics
   */
  getStats(): GatewayStats {
    // Update uptime
    if (this.startedAt) {
      this.stats.uptime = Math.floor((Date.now() - this.startedAt.getTime()) / 1000);
    }
    
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = this.createEmptyStats();
    this.stats.startTime = new Date();
    this.stats.lastReset = new Date();
    this.logger.info('Gateway statistics reset');
  }

  /**
   * Get gateway health
   */
  async getHealth(): Promise<GatewayHealth> {
    const checks: HealthCheck[] = [];
    const issues: string[] = [];
    const warnings: string[] = [];
    
    // Check if running
    checks.push({
      name: 'gateway:running',
      status: this.isRunning ? 'passed' : 'failed',
      message: this.isRunning ? 'Gateway is running' : 'Gateway is not running'
    });
    
    if (!this.isRunning) {
      issues.push('Gateway is not running');
    }
    
    // Check session manager
    try {
      const sessionStats = this.sessionManager.getStats();
      checks.push({
        name: 'sessions',
        status: 'passed',
        message: `${sessionStats.active} active sessions`,
        details: sessionStats
      });
    } catch (error) {
      checks.push({
        name: 'sessions',
        status: 'failed',
        message: `Session manager error: ${error}`
      });
      issues.push(`Session manager error: ${error}`);
    }
    
    // Check channel manager
    try {
      const channelStats = this.channelManager.getStats();
      checks.push({
        name: 'channels',
        status: channelStats.connected > 0 ? 'passed' : 'warning',
        message: `${channelStats.connected} connected channels`,
        details: channelStats
      });
      
      if (channelStats.connected === 0) {
        warnings.push('No channels are connected');
      }
    } catch (error) {
      checks.push({
        name: 'channels',
        status: 'failed',
        message: `Channel manager error: ${error}`
      });
      issues.push(`Channel manager error: ${error}`);
    }
    
    // Check tool registry
    try {
      const tools = this.toolRegistry?.list?.() || [];
      checks.push({
        name: 'tools',
        status: tools.length > 0 ? 'passed' : 'warning',
        message: `${tools.length} tools registered`,
        details: { count: tools.length }
      });
      
      if (tools.length === 0) {
        warnings.push('No tools are registered');
      }
    } catch (error) {
      checks.push({
        name: 'tools',
        status: 'failed',
        message: `Tool registry error: ${error}`
      });
      issues.push(`Tool registry error: ${error}`);
    }
    
    // Check provider registry
    try {
      const providers = this.providerRegistry?.list?.() || [];
      const readyProviders = providers.filter((p: any) => p.status === 'ready');
      
      checks.push({
        name: 'providers',
        status: readyProviders.length > 0 ? 'passed' : 'warning',
        message: `${readyProviders.length}/${providers.length} providers ready`,
        details: { total: providers.length, ready: readyProviders.length }
      });
      
      if (readyProviders.length === 0) {
        warnings.push('No providers are ready');
      }
    } catch (error) {
      checks.push({
        name: 'providers',
        status: 'failed',
        message: `Provider registry error: ${error}`
      });
      issues.push(`Provider registry error: ${error}`);
    }
    
    // Determine overall status
    const failedChecks = checks.filter(c => c.status === 'failed');
    const warningChecks = checks.filter(c => c.status === 'warning');
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (failedChecks.length > 0) {
      status = 'unhealthy';
    } else if (warningChecks.length > 0) {
      status = 'degraded';
    }
    
    return {
      status,
      checks,
      issues,
      warnings
    };
  }

  /**
   * Process a message through the gateway
   */
  async processMessage(message: GatewayMessage): Promise<GatewayMessage[]> {
    this.logger.debug(`Processing message: ${message.id}`);
    
    // Increment received counter
    this.stats.messagesReceived++;
    
    // Find or create session
    let session = this.sessionManager.getSession(message.sessionId || '');
    
    if (!session) {
      session = await this.sessionManager.createSession({
        channelId: message.channelId,
        platform: message.platform,
        userId: message.userId
      });
    }
    
    // Process the message
    const responses: GatewayMessage[] = [];
    
    try {
      // Handle different message types
      switch (message.metadata?.type) {
        case 'command':
          responses.push(...await this.handleCommand(session, message));
          break;
          
        case 'tool-call':
          responses.push(...await this.handleToolCall(session, message));
          break;
          
        case 'agent-request':
          responses.push(...await this.handleAgentRequest(session, message));
          break;
          
        default:
          // Regular message - pass to agent
          responses.push(...await this.handleAgentMessage(session, message));
      }
      
      // Update session last activity
      this.sessionManager.updateSession(session.id, {
        lastActivityAt: new Date()
      });
      
    } catch (error) {
      this.logger.error(`Error processing message ${message.id}: ${error}`);
      
      // Send error response
      responses.push({
        id: `error:${message.id}`,
        platform: message.platform,
        channelId: message.channelId,
        userId: message.userId,
        content: `Error processing your request: ${error}`,
        timestamp: new Date(),
        metadata: {
          type: 'error',
          error: error.message,
          originalMessageId: message.id
        }
      });
    }
    
    // Increment sent counter
    this.stats.messagesSent += responses.length;
    
    return responses;
  }

  /**
   * Handle a command message
   */
  private async handleCommand(
    session: GatewaySession,
    message: GatewayMessage
  ): Promise<GatewayMessage[]> {
    const command = message.metadata?.command;
    const args = message.metadata?.args || [];
    
    this.logger.debug(`Handling command: ${command}`);
    
    // Check if it's a slash command
    if (command?.startsWith('/')) {
      const commandName = command.slice(1);
      
      // Handle built-in commands
      switch (commandName) {
        case 'help':
          return [this.createHelpResponse(session)];
          
        case 'status':
          return [this.createStatusResponse(session)];
          
        case 'tools':
          return [this.createToolsResponse(session)];
          
        case 'agents':
          return [this.createAgentsResponse(session)];
          
        case 'providers':
          return [this.createProvidersResponse(session)];
          
        default:
          // Try to find a custom command or skill
          return [this.createUnknownCommandResponse(session, commandName)];
      }
    }
    
    // Handle regular commands
    return [this.createUnknownCommandResponse(session, command || '')];
  }

  /**
   * Handle a tool call message
   */
  private async handleToolCall(
    session: GatewaySession,
    message: GatewayMessage
  ): Promise<GatewayMessage[]> {
    const toolCall: ToolCall = message.metadata?.toolCall;
    
    if (!toolCall) {
      return [this.createErrorResponse(session, 'No tool call in message')];
    }
    
    this.logger.debug(`Handling tool call: ${toolCall.name}`);
    this.stats.toolCalls++;
    
    try {
      // Get tool from registry
      const tool = this.toolRegistry?.get?.(toolCall.name);
      
      if (!tool) {
        return [this.createErrorResponse(session, `Tool not found: ${toolCall.name}`)];
      }
      
      // Execute tool
      const result = await this.toolRegistry?.call?.(toolCall.name, toolCall.arguments);
      
      // Create response
      const toolResult: ToolResult = {
        id: toolCall.id,
        toolCallId: toolCall.id,
        name: toolCall.name,
        success: result?.success || true,
        output: result?.output || result,
        error: result?.error,
        executionTime: result?.executionTime,
        timestamp: new Date()
      };
      
      this.stats.toolSuccesses++;
      
      return [{
        id: `tool-result:${toolCall.id}`,
        platform: session.platform,
        channelId: session.channelId,
        userId: session.userId,
        content: JSON.stringify(toolResult, null, 2),
        timestamp: new Date(),
        metadata: {
          type: 'tool-result',
          toolCallId: toolCall.id,
          toolResult
        }
      }];
      
    } catch (error) {
      this.stats.toolFailures++;
      
      return [this.createErrorResponse(session, `Tool execution failed: ${error}`)];
    }
  }

  /**
   * Handle an agent request message
   */
  private async handleAgentRequest(
    session: GatewaySession,
    message: GatewayMessage
  ): Promise<GatewayMessage[]> {
    const request = message.metadata?.request;
    
    if (!request) {
      return [this.createErrorResponse(session, 'No agent request in message')];
    }
    
    this.logger.debug(`Handling agent request: ${request.type}`);
    
    try {
      switch (request.type) {
        case 'start':
          return await this.handleAgentStart(session, request);
          
        case 'stop':
          return await this.handleAgentStop(session, request);
          
        case 'status':
          return await this.handleAgentStatus(session, request);
          
        default:
          return [this.createErrorResponse(session, `Unknown agent request type: ${request.type}`)];
      }
      
    } catch (error) {
      return [this.createErrorResponse(session, `Agent request failed: ${error}`)];
    }
  }

  /**
   * Handle agent start request
   */
  private async handleAgentStart(
    session: GatewaySession,
    request: any
  ): Promise<GatewayMessage[]> {
    const agentId = request.agentId;
    const task = request.task;
    const config = request.config;
    
    try {
      // Start agent
      const agent = this.agentRegistry?.get?.(agentId);
      
      if (!agent) {
        return [this.createErrorResponse(session, `Agent not found: ${agentId}`)];
      }
      
      const result = await this.agentRegistry?.run?.(agentId, task, {
        sessionId: session.id,
        userId: session.userId,
        ...config
      });
      
      this.stats.agentsStarted++;
      
      return [{
        id: `agent-start:${request.id}`,
        platform: session.platform,
        channelId: session.channelId,
        userId: session.userId,
        content: JSON.stringify(result, null, 2),
        timestamp: new Date(),
        metadata: {
          type: 'agent-start',
          agentId,
          requestId: request.id,
          result
        }
      }];
      
    } catch (error) {
      this.stats.agentsFailed++;
      return [this.createErrorResponse(session, `Failed to start agent: ${error}`)];
    }
  }

  /**
   * Handle agent stop request
   */
  private async handleAgentStop(
    session: GatewaySession,
    request: any
  ): Promise<GatewayMessage[]> {
    const agentId = request.agentId;
    
    try {
      const result = await this.agentRegistry?.stop?.(agentId);
      
      return [{
        id: `agent-stop:${request.id}`,
        platform: session.platform,
        channelId: session.channelId,
        userId: session.userId,
        content: JSON.stringify(result, null, 2),
        timestamp: new Date(),
        metadata: {
          type: 'agent-stop',
          agentId,
          requestId: request.id,
          result
        }
      }];
      
    } catch (error) {
      return [this.createErrorResponse(session, `Failed to stop agent: ${error}`)];
    }
  }

  /**
   * Handle agent status request
   */
  private async handleAgentStatus(
    session: GatewaySession,
    request: any
  ): Promise<GatewayMessage[]> {
    const agentId = request.agentId;
    
    try {
      const agent = this.agentRegistry?.get?.(agentId);
      
      if (!agent) {
        return [this.createErrorResponse(session, `Agent not found: ${agentId}`)];
      }
      
      const state = this.agentRegistry?.getState?.(agentId);
      
      return [{
        id: `agent-status:${request.id}`,
        platform: session.platform,
        channelId: session.channelId,
        userId: session.userId,
        content: JSON.stringify(state, null, 2),
        timestamp: new Date(),
        metadata: {
          type: 'agent-status',
          agentId,
          requestId: request.id,
          state
        }
      }];
      
    } catch (error) {
      return [this.createErrorResponse(session, `Failed to get agent status: ${error}`)];
    }
  }

  /**
   * Handle regular agent message
   */
  private async handleAgentMessage(
    session: GatewaySession,
    message: GatewayMessage
  ): Promise<GatewayMessage[]> {
    try {
      // Get or create agent for this session
      let agentId = session.agentId;
      
      if (!agentId) {
        // Use default agent
        agentId = this.agentRegistry?.getDefault?.();
        
        if (!agentId) {
          return [this.createErrorResponse(session, 'No default agent configured')];
        }
      }
      
      const agent = this.agentRegistry?.get?.(agentId);
      
      if (!agent) {
        return [this.createErrorResponse(session, `Agent not found: ${agentId}`)];
      }
      
      // Run agent with message
      const result = await this.agentRegistry?.run?.(agentId, message.content, {
        sessionId: session.id,
        userId: session.userId,
        channelId: session.channelId,
        platform: session.platform
      });
      
      this.stats.agentsStarted++;
      
      // Create response message
      const response: GatewayMessage = {
        id: `agent-response:${message.id}`,
        platform: session.platform,
        channelId: session.channelId,
        userId: session.userId,
        content: result?.output || result || '',
        timestamp: new Date(),
        metadata: {
          type: 'agent-response',
          agentId,
          originalMessageId: message.id,
          result
        }
      };
      
      return [response];
      
    } catch (error) {
      this.stats.agentsFailed++;
      return [this.createErrorResponse(session, `Agent error: ${error}`)];
    }
  }

  /**
   * Create help response
   */
  private createHelpResponse(session: GatewaySession): GatewayMessage {
    const helpText = `
Kairos Gateway - Available Commands

General:
  /help - Show this help
  /status - Show gateway status
  /stats - Show gateway statistics

Agents:
  /agents list - List available agents
  /agents start <name> - Start an agent
  /agents stop <name> - Stop an agent
  /agents status <name> - Get agent status

Tools:
  /tools list - List available tools
  /tools call <name> <args> - Call a tool

Providers:
  /providers list - List available providers
  /providers status - Show provider status

Memory:
  /memory search <query> - Search memory
  /memory list - List memory entries

Sessions:
  /session info - Show session info
  /session close - Close this session
`.trim();

    return {
      id: `help:${Date.now()}`,
      platform: session.platform,
      channelId: session.channelId,
      userId: session.userId,
      content: helpText,
      timestamp: new Date(),
      metadata: {
        type: 'help'
      }
    };
  }

  /**
   * Create status response
   */
  private createStatusResponse(session: GatewaySession): GatewayMessage {
    const status = {
      gateway: {
        status: this.isRunning ? 'running' : 'stopped',
        startedAt: this.startedAt,
        uptime: this.stats.uptime
      },
      sessions: this.sessionManager.getStats(),
      channels: this.channelManager.getStats(),
      tools: this.toolRegistry?.list?.().length || 0,
      agents: this.agentRegistry?.list?.().length || 0,
      providers: this.providerRegistry?.list?.().length || 0
    };

    return {
      id: `status:${Date.now()}`,
      platform: session.platform,
      channelId: session.channelId,
      userId: session.userId,
      content: JSON.stringify(status, null, 2),
      timestamp: new Date(),
      metadata: {
        type: 'status'
      }
    };
  }

  /**
   * Create tools response
   */
  private createToolsResponse(session: GatewaySession): GatewayMessage {
    const tools = this.toolRegistry?.list?.() || [];
    
    const toolList = tools.map((tool: any) => ({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      category: tool.category,
      status: tool.status
    }));

    return {
      id: `tools:${Date.now()}`,
      platform: session.platform,
      channelId: session.channelId,
      userId: session.userId,
      content: JSON.stringify(toolList, null, 2),
      timestamp: new Date(),
      metadata: {
        type: 'tools',
        count: tools.length
      }
    };
  }

  /**
   * Create agents response
   */
  private createAgentsResponse(session: GatewaySession): GatewayMessage {
    const agents = this.agentRegistry?.list?.() || [];
    
    const agentList = agents.map((agent: any) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      status: agent.status,
      description: agent.description
    }));

    return {
      id: `agents:${Date.now()}`,
      platform: session.platform,
      channelId: session.channelId,
      userId: session.userId,
      content: JSON.stringify(agentList, null, 2),
      timestamp: new Date(),
      metadata: {
        type: 'agents',
        count: agents.length
      }
    };
  }

  /**
   * Create providers response
   */
  private createProvidersResponse(session: GatewaySession): GatewayMessage {
    const providers = this.providerRegistry?.list?.() || [];
    
    const providerList = providers.map((provider: any) => ({
      id: provider.id,
      name: provider.name,
      type: provider.type,
      status: provider.status,
      defaultModel: provider.defaultModel
    }));

    return {
      id: `providers:${Date.now()}`,
      platform: session.platform,
      channelId: session.channelId,
      userId: session.userId,
      content: JSON.stringify(providerList, null, 2),
      timestamp: new Date(),
      metadata: {
        type: 'providers',
        count: providers.length
      }
    };
  }

  /**
   * Create error response
   */
  private createErrorResponse(session: GatewaySession, error: string): GatewayMessage {
    return {
      id: `error:${Date.now()}`,
      platform: session.platform,
      channelId: session.channelId,
      userId: session.userId,
      content: error,
      timestamp: new Date(),
      metadata: {
        type: 'error',
        error
      }
    };
  }

  /**
   * Create unknown command response
   */
  private createUnknownCommandResponse(session: GatewaySession, command: string): GatewayMessage {
    return {
      id: `unknown:${Date.now()}`,
      platform: session.platform,
      channelId: session.channelId,
      userId: session.userId,
      content: `Unknown command: ${command}. Type /help for available commands.`,
      timestamp: new Date(),
      metadata: {
        type: 'unknown-command',
        command
      }
    };
  }

  /**
   * Get session manager
   */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  /**
   * Get channel manager
   */
  getChannelManager(): ChannelManager {
    return this.channelManager;
  }

  /**
   * Get event bus
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }
}

/**
 * Event Bus
 * Handles event emission and subscription
 */
export class EventBus {
  private listeners: Map<string, Set<GatewayEventHandler>> = new Map();
  private wildcardListeners: Set<GatewayEventHandler> = new Set();
  private logger: any;
  private isRunning: boolean = false;

  constructor(logger: any = console) {
    this.logger = logger;
  }

  /**
   * Start the event bus
   */
  start(): void {
    if (this.isRunning) {
      this.logger.warn('Event bus is already running');
      return;
    }
    
    this.isRunning = true;
    this.logger.debug('Event bus started');
  }

  /**
   * Stop the event bus
   */
  stop(): void {
    if (!this.isRunning) {
      this.logger.warn('Event bus is not running');
      return;
    }
    
    this.isRunning = false;
    this.logger.debug('Event bus stopped');
  }

  /**
   * Emit an event
   */
  async emit(event: GatewayEvent): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn('Event bus is not running, cannot emit events');
      return;
    }

    this.logger.debug(`Emitting event: ${event.type}`);
    
    // Notify specific listeners
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
        try {
          await listener(event);
        } catch (error) {
          this.logger.error(`Error in event listener for ${event.type}: ${error}`);
        }
      }
    }
    
    // Notify wildcard listeners
    for (const listener of this.wildcardListeners) {
      try {
        await listener(event);
      } catch (error) {
        this.logger.error(`Error in wildcard event listener: ${error}`);
      }
    }
  }

  /**
   * Subscribe to an event
   */
  on(event: GatewayEventType, handler: GatewayEventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(handler);
    this.logger.debug(`Added listener for event: ${event}`);
  }

  /**
   * Subscribe to all events (wildcard)
   */
  onAll(handler: GatewayEventHandler): void {
    this.wildcardListeners.add(handler);
    this.logger.debug('Added wildcard listener');
  }

  /**
   * Unsubscribe from an event
   */
  off(event: GatewayEventType, handler: GatewayEventHandler): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(handler);
      this.logger.debug(`Removed listener for event: ${event}`);
    }
  }

  /**
   * Unsubscribe from all events
   */
  offAll(handler: GatewayEventHandler): void {
    this.wildcardListeners.delete(handler);
    this.logger.debug('Removed wildcard listener');
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: GatewayEventType): void {
    if (event) {
      this.listeners.delete(event);
      this.logger.debug(`Removed all listeners for event: ${event}`);
    } else {
      this.listeners.clear();
      this.wildcardListeners.clear();
      this.logger.debug('Removed all listeners');
    }
  }

  /**
   * Get listener count for an event
   */
  listenerCount(event: GatewayEventType): number {
    const listeners = this.listeners.get(event);
    return listeners ? listeners.size : 0;
  }

  /**
   * Get all event types with listeners
   */
  eventTypes(): string[] {
    return Array.from(this.listeners.keys());
  }
}

/**
 * Session Manager
 * Manages all gateway sessions
 */
export class SessionManager {
  private gateway: KairosGateway;
  private sessions: Map<string, GatewaySession> = new Map();
  private logger: any;

  constructor(gateway: KairosGateway) {
    this.gateway = gateway;
    this.logger = gateway['logger'];
  }

  /**
   * Initialize the session manager
   */
  async initialize(): Promise<void> {
    this.logger.debug('Session manager initialized');
  }

  /**
   * Create a new session
   */
  async createSession(config: Partial<GatewaySession>): Promise<GatewaySession> {
    const session: GatewaySession = {
      id: this.generateId(),
      channelId: config.channelId || '',
      platform: config.platform || 'unknown',
      userId: config.userId,
      
      // State
      status: 'active',
      createdAt: new Date(),
      lastActivityAt: new Date(),
      
      // Context
      workingDirectory: config.workingDirectory,
      environment: config.environment || {},
      capabilities: config.capabilities || [],
      
      // Conversation
      conversationId: config.conversationId || this.generateId(),
      messageHistory: config.messageHistory || [],
      
      // Tools
      availableTools: config.availableTools || [],
      enabledToolsets: config.enabledToolsets || [],
      
      // Provider
      providerId: config.providerId,
      modelId: config.modelId
    };
    
    this.sessions.set(session.id, session);
    
    // Emit session created event
    await this.gateway.getEventBus().emit({
      type: 'session:created',
      timestamp: new Date(),
      sessionId: session.id,
      channelId: session.channelId,
      platform: session.platform,
      data: { session }
    });
    
    this.logger.debug(`Created session: ${session.id}`);
    return session;
  }

  /**
   * Get a session by ID
   */
  getSession(sessionId: string): GatewaySession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all sessions
   */
  getAllSessions(): GatewaySession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get sessions by user
   */
  getSessionsByUser(userId: string): GatewaySession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.userId === userId);
  }

  /**
   * Get sessions by channel
   */
  getSessionsByChannel(channelId: string): GatewaySession[] {
    return Array.from(this.sessions.values())
      .filter(s => s.channelId === channelId);
  }

  /**
   * Update a session
   */
  updateSession(sessionId: string, updates: Partial<GatewaySession>): GatewaySession | undefined {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return undefined;
    }
    
    const updatedSession = { ...session, ...updates };
    this.sessions.set(sessionId, updatedSession);
    
    this.logger.debug(`Updated session: ${sessionId}`);
    return updatedSession;
  }

  /**
   * Close a session
   */
  async closeSession(sessionId: string, reason?: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }
    
    session.status = 'closed';
    
    // Emit session closed event
    await this.gateway.getEventBus().emit({
      type: 'session:closed',
      timestamp: new Date(),
      sessionId: session.id,
      channelId: session.channelId,
      platform: session.platform,
      data: { session, reason }
    });
    
    this.logger.debug(`Closed session: ${sessionId}`);
    return true;
  }

  /**
   * Close all sessions
   */
  async closeAll(reason?: string): Promise<number> {
    const sessionIds = Array.from(this.sessions.keys());
    
    for (const sessionId of sessionIds) {
      await this.closeSession(sessionId, reason);
    }
    
    return sessionIds.length;
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }
    
    this.sessions.delete(sessionId);
    this.logger.debug(`Deleted session: ${sessionId}`);
    return true;
  }

  /**
   * Get session statistics
   */
  getStats(): {
    total: number;
    active: number;
    idle: number;
    closed: number;
    byPlatform: Record<string, number>;
    byUser: Record<string, number>;
  } {
    const stats = {
      total: this.sessions.size,
      active: 0,
      idle: 0,
      closed: 0,
      byPlatform: {} as Record<string, number>,
      byUser: {} as Record<string, number>
    };
    
    const now = Date.now();
    const idleThreshold = 5 * 60 * 1000; // 5 minutes
    
    for (const session of this.sessions.values()) {
      // Count by status
      if (session.status === 'active') {
        // Check if idle
        const lastActivity = session.lastActivityAt?.getTime() || 0;
        if (now - lastActivity > idleThreshold) {
          stats.idle++;
        } else {
          stats.active++;
        }
      } else if (session.status === 'closed') {
        stats.closed++;
      }
      
      // Count by platform
      stats.byPlatform[session.platform] = (stats.byPlatform[session.platform] || 0) + 1;
      
      // Count by user
      if (session.userId) {
        stats.byUser[session.userId] = (stats.byUser[session.userId] || 0) + 1;
      }
    }
    
    return stats;
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Channel Manager
 * Manages all communication channels
 */
export class ChannelManager {
  private gateway: KairosGateway;
  private channels: Map<string, GatewayChannel> = new Map();
  private logger: any;

  constructor(gateway: KairosGateway) {
    this.gateway = gateway;
    this.logger = gateway['logger'];
  }

  /**
   * Initialize the channel manager
   */
  async initialize(): Promise<void> {
    this.logger.debug('Channel manager initialized');
  }

  /**
   * Register a channel
   */
  registerChannel(channel: GatewayChannel): void {
    this.channels.set(channel.id, channel);
    this.logger.debug(`Registered channel: ${channel.id} (${channel.platform})`);
    
    // Emit channel connected event
    this.gateway.getEventBus().emit({
      type: 'channel:connected',
      timestamp: new Date(),
      channelId: channel.id,
      platform: channel.platform,
      data: { channel }
    });
  }

  /**
   * Unregister a channel
   */
  unregisterChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    
    if (!channel) {
      return false;
    }
    
    this.channels.delete(channelId);
    this.logger.debug(`Unregistered channel: ${channelId}`);
    
    // Emit channel disconnected event
    this.gateway.getEventBus().emit({
      type: 'channel:disconnected',
      timestamp: new Date(),
      channelId: channel.id,
      platform: channel.platform,
      data: { channel }
    });
    
    return true;
  }

  /**
   * Get a channel by ID
   */
  getChannel(channelId: string): GatewayChannel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Get all channels
   */
  getAllChannels(): GatewayChannel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get channels by platform
   */
  getChannelsByPlatform(platform: string): GatewayChannel[] {
    return Array.from(this.channels.values())
      .filter(c => c.platform === platform);
  }

  /**
   * Get connected channels
   */
  getConnectedChannels(): GatewayChannel[] {
    return Array.from(this.channels.values())
      .filter(c => c.isConnected());
  }

  /**
   * Connect all channels
   */
  async connectAll(): Promise<void> {
    const channels = this.getAllChannels();
    
    for (const channel of channels) {
      try {
        await channel.connect();
        this.logger.debug(`Connected channel: ${channel.id}`);
      } catch (error) {
        this.logger.error(`Failed to connect channel ${channel.id}: ${error}`);
      }
    }
  }

  /**
   * Disconnect all channels
   */
  async disconnectAll(): Promise<void> {
    const channels = this.getAllChannels();
    
    for (const channel of channels) {
      try {
        await channel.disconnect();
        this.logger.debug(`Disconnected channel: ${channel.id}`);
      } catch (error) {
        this.logger.error(`Failed to disconnect channel ${channel.id}: ${error}`);
      }
    }
  }

  /**
   * Send a message through a channel
   */
  async sendMessage(channelId: string, message: GatewayMessage): Promise<boolean> {
    const channel = this.channels.get(channelId);
    
    if (!channel) {
      this.logger.error(`Channel not found: ${channelId}`);
      return false;
    }
    
    try {
      await channel.send(message);
      this.logger.debug(`Sent message through channel: ${channelId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send message through channel ${channelId}: ${error}`);
      return false;
    }
  }

  /**
   * Get channel statistics
   */
  getStats(): {
    total: number;
    connected: number;
    byPlatform: Record<string, {
      total: number;
      connected: number;
    }>;
  } {
    const stats = {
      total: this.channels.size,
      connected: 0,
      byPlatform: {} as Record<string, { total: number; connected: number }>
    };
    
    for (const channel of this.channels.values()) {
      // Count by platform
      if (!stats.byPlatform[channel.platform]) {
        stats.byPlatform[channel.platform] = { total: 0, connected: 0 };
      }
      
      stats.byPlatform[channel.platform].total++;
      
      if (channel.isConnected()) {
        stats.connected++;
        stats.byPlatform[channel.platform].connected++;
      }
    }
    
    return stats;
  }

  /**
   * Get channel information
   */
  async getChannelInfo(channelId: string): Promise<ChannelInfo | undefined> {
    const channel = this.channels.get(channelId);
    
    if (!channel) {
      return undefined;
    }
    
    try {
      return await channel.getInfo();
    } catch (error) {
      this.logger.error(`Failed to get channel info for ${channelId}: ${error}`);
      return undefined;
    }
  }
}

// Export types
export type {
  GatewayConfig,
  GatewaySession,
  GatewayChannel,
  ChannelInfo,
  GatewayEventType,
  GatewayEvent,
  GatewayEventHandler,
  GatewayStats,
  GatewayHealth,
  HealthCheck
};

export default {
  KairosGateway,
  EventBus,
  SessionManager,
  ChannelManager
};

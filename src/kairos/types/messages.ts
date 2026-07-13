// Message Type Definitions

/**
 * Message Role Types
 * Standard message roles in AI conversations
 */
export type MessageRole = 
  | 'system'
  | 'user'
  | 'assistant'
  | 'tool'
  | 'agent'
  | 'function'
  | 'error';

/**
 * Base Message Interface
 * Common properties for all message types
 */
export interface BaseMessage {
  role: MessageRole;
  content: string;
  timestamp?: Date;
  id?: string;
}

/**
 * System Message
 * Instructions and context for the AI
 */
export interface SystemMessage extends BaseMessage {
  role: 'system';
  name?: string; // Optional name for the system
  priority?: number; // Priority level (0-10)
}

/**
 * User Message
 * Messages from the user
 */
export interface UserMessage extends BaseMessage {
  role: 'user';
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

/**
 * Assistant Message
 * Responses from the AI assistant
 */
export interface AssistantMessage extends BaseMessage {
  role: 'assistant';
  agentId?: string;
  model?: string;
  provider?: string;
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'error' | 'interrupted';
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  reasoning?: string; // Internal reasoning/chain of thought
  toolCalls?: ToolCall[];
}

/**
 * Tool Message
 * Messages from tool executions
 */
export interface ToolMessage extends BaseMessage {
  role: 'tool';
  toolCallId: string;
  toolName: string;
  success: boolean;
  output?: any;
  error?: string;
  executionTime?: number;
}

/**
 * Agent Message
 * Messages between agents in multi-agent systems
 */
export interface AgentMessage extends BaseMessage {
  role: 'agent';
  agentId: string;
  agentName?: string;
  agentRole?: string;
  targetAgentId?: string; // For directed messages
  delegation?: AgentDelegation;
}

/**
 * Function Message
 * For function/tool call results
 */
export interface FunctionMessage extends BaseMessage {
  role: 'function';
  name: string;
  arguments: Record<string, any>;
  result?: any;
  error?: string;
}

/**
 * Error Message
 * Error messages in the conversation
 */
export interface ErrorMessage extends BaseMessage {
  role: 'error';
  error: string;
  code?: string;
  details?: any;
  recoverable?: boolean;
}

/**
 * Union type for all message types
 */
export type ConversationMessage = 
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | ToolMessage
  | AgentMessage
  | FunctionMessage
  | ErrorMessage;

/**
 * Message in a conversation thread
 */
export interface ThreadMessage {
  id: string;
  message: ConversationMessage;
  threadId: string;
  parentId?: string; // For nested threads
  createdAt: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Message Metadata
 * Additional information about a message
 */
export interface MessageMetadata {
  sessionId?: string;
  userId?: string;
  agentId?: string;
  channelId?: string;
  platform?: string;
  conversationId?: string;
  
  // Context
  workingDirectory?: string;
  environment?: Record<string, string>;
  
  // Processing
  processedAt?: Date;
  processingTime?: number;
  
  // Quality
  confidence?: number; // 0-1
  relevance?: number; // 0-1
  
  // Custom metadata
  [key: string]: any;
}

/**
 * Message Context
 * Context for message processing
 */
export interface MessageContext {
  sessionId: string;
  userId?: string;
  agentId?: string;
  channelId?: string;
  platform?: string;
  conversationId?: string;
  
  // History
  previousMessages: ConversationMessage[];
  
  // Environment
  workingDirectory?: string;
  environment: Record<string, string>;
  availableTools: string[];
  
  // State
  iteration: number;
  maxIterations: number;
  budget: number;
  usedBudget: number;
  
  // Timing
  startTime: Date;
  timeout?: Date;
}

/**
 * Message Processing Options
 */
export interface MessageProcessingOptions {
  // Model selection
  model?: string;
  provider?: string;
  
  // Tool execution
  enableTools?: boolean;
  maxToolCalls?: number;
  
  // Memory
  useMemory?: boolean;
  memoryLimit?: number;
  
  // Streaming
  stream?: boolean;
  
  // Quality
  temperature?: number; // 0-2
  topP?: number; // 0-1
  topK?: number;
  
  // Cost control
  maxTokens?: number;
  maxCost?: number;
  
  // Timeout
  timeout?: number;
  
  // Retries
  maxRetries?: number;
}

/**
 * Message Processing Result
 */
export interface MessageProcessingResult {
  message: AssistantMessage;
  
  // Processing info
  processedAt: Date;
  processingTime: number;
  
  // Usage
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
  };
  
  // Tool calls
  toolCalls?: ToolCall[];
  toolResults?: any[];
  
  // Quality
  confidence?: number;
  
  // State
  finished: boolean;
  finishReason?: string;
  
  // Next steps
  nextAction?: 'continue' | 'stop' | 'wait' | 'delegate';
  
  // Errors
  error?: string;
  warnings?: string[];
}

/**
 * Message Stream Chunk
 * For streaming responses
 */
export interface MessageStreamChunk {
  id: string;
  content: string;
  role: MessageRole;
  finishReason?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Message Stream
 * Complete streaming response
 */
export interface MessageStream {
  id: string;
  chunks: MessageStreamChunk[];
  complete: boolean;
  finishReason?: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  error?: string;
}

/**
 * Message Batch
 * For batch processing multiple messages
 */
export interface MessageBatch {
  id: string;
  messages: ConversationMessage[];
  processedAt: Date;
  processingTime: number;
  results: MessageProcessingResult[];
  errors: string[];
  warnings: string[];
}

/**
 * Message Filter
 * For filtering messages
 */
export interface MessageFilter {
  roles?: MessageRole[];
  contentPattern?: string | RegExp;
  metadata?: Record<string, any>;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'role' | 'content';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Message Search Options
 */
export interface MessageSearchOptions {
  query: string;
  roles?: MessageRole[];
  limit?: number;
  offset?: number;
  fromDate?: Date;
  toDate?: Date;
  sortBy?: 'relevance' | 'timestamp';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Message Search Result
 */
export interface MessageSearchResult {
  message: ConversationMessage;
  score: number;
  matches: string[];
  metadata?: Record<string, any>;
}

/**
 * Message Transformation
 * For modifying messages before processing
 */
export interface MessageTransformation {
  id: string;
  name: string;
  description?: string;
  transform: (message: ConversationMessage, context: MessageContext) => Promise<ConversationMessage>;
}

/**
 * Message Validator
 * For validating messages
 */
export interface MessageValidator {
  id: string;
  name: string;
  validate: (message: ConversationMessage) => Promise<{
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  }>;
}

/**
 * Message Formatter
 * For formatting messages for display
 */
export interface MessageFormatter {
  id: string;
  name: string;
  format: (message: ConversationMessage, options?: any) => Promise<string>;
}

/**
 * Tool Call
 * Represents a tool/function call from the AI
 */
export interface ToolCall {
  id: string;
  type: 'function';
  name: string;
  arguments: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Tool Call Result
 * Result of a tool call execution
 */
export interface ToolCallResult {
  id: string;
  toolCallId: string;
  name: string;
  success: boolean;
  output?: any;
  error?: string;
  executionTime?: number;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Agent Delegation
 * For delegating tasks between agents
 */
export interface AgentDelegation {
  task: string;
  targetAgentId: string;
  context?: any;
  callback?: (result: any) => Promise<void>;
  timeout?: number;
}

/**
 * Message Queue Item
 * For queued message processing
 */
export interface MessageQueueItem {
  id: string;
  message: ConversationMessage;
  context: MessageContext;
  priority: number; // 0-10, higher is more important
  createdAt: Date;
  scheduledAt?: Date; // For delayed processing
  attempts: number;
  maxAttempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Message Queue
 * For managing message processing queues
 */
export interface MessageQueue {
  id: string;
  name: string;
  items: MessageQueueItem[];
  processing: boolean;
  createdAt: Date;
  stats: {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

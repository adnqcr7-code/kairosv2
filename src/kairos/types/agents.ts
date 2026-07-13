// Agent Type Definitions
// Inspired by OpenClaw and Hermes multi-agent systems

/**
 * Agent Role Types
 * Defines the different roles agents can play in the system
 */
export type AgentRole = 
  | 'planner'
  | 'builder'
  | 'reviewer'
  | 'tester'
  | 'packager'
  | 'researcher'
  | 'coordinator'
  | 'general'
  | 'specialist';

/**
 * Agent Status Types
 */
export type AgentStatus = 
  | 'idle'
  | 'working'
  | 'waiting'
  | 'error'
  | 'completed'
  | 'paused';

/**
 * Agent Configuration
 */
export interface AgentConfig {
  id: string;
  name: string;
  role: AgentRole;
  description?: string;
  model?: string;
  provider?: string;
  maxIterations?: number;
  timeout?: number;
  budget?: number;
  capabilities?: string[];
  tags?: string[];
}

/**
 * Agent State
 */
export interface AgentState {
  id: string;
  status: AgentStatus;
  currentTask?: string;
  progress?: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  iterations: number;
  cost: number;
}

/**
 * Agent Task
 */
export interface AgentTask {
  id: string;
  description: string;
  agentId?: string;
  parentTaskId?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  priority: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  dependencies?: string[];
  retryCount: number;
  maxRetries?: number;
}

/**
 * Multi-Agent Board
 * Kanban-style task board for multi-agent coordination
 */
export interface MultiAgentBoard {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  columns: BoardColumn[];
  agents: AgentConfig[];
  tasks: AgentTask[];
}

export interface BoardColumn {
  id: string;
  name: string;
  order: number;
  taskIds: string[];
  wipLimit?: number;
}

/**
 * Agent Message
 * Standard message format for agent communication
 */
export interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool' | 'agent';
  content: string;
  agentId?: string;
  taskId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

/**
 * Agent Capabilities
 */
export interface AgentCapabilities {
  canUseTools: boolean;
  canBrowseWeb: boolean;
  canExecuteCode: boolean;
  canAccessFilesystem: boolean;
  canUseMemory: boolean;
  canDelegate: boolean;
  canSchedule: boolean;
  maxConcurrentTasks?: number;
}

/**
 * Agent Context
 * Context passed to agents during execution
 */
export interface AgentContext {
  agentId: string;
  sessionId: string;
  userId?: string;
  conversationId?: string;
  workingDirectory?: string;
  environment: Record<string, string>;
  capabilities: AgentCapabilities;
  memory?: any;
  tools?: any[];
}

/**
 * Agent Result
 */
export interface AgentResult {
  success: boolean;
  output?: string;
  data?: any;
  error?: string;
  warnings?: string[];
  metrics?: AgentMetrics;
}

/**
 * Agent Metrics
 */
export interface AgentMetrics {
  tokensUsed: number;
  apiCalls: number;
  toolCalls: number;
  executionTime: number;
  cost: number;
  iterations: number;
}

/**
 * Subagent Configuration
 * For delegating tasks to specialized agents
 */
export interface SubagentConfig {
  name: string;
  role: AgentRole;
  model?: string;
  instructions?: string;
  tools?: string[];
  timeout?: number;
  budget?: number;
}

/**
 * Agent Delegation Request
 */
export interface AgentDelegation {
  task: string;
  subagent: SubagentConfig;
  context?: any;
  callback?: (result: AgentResult) => void;
}

// Tool Type Definitions
// Inspired by Hermes' tool system and MCP

/**
 * Tool Status Types
 */
export type ToolStatus = 'ready' | 'disabled' | 'error' | 'loading' | 'deprecated';

/**
 * Tool Category Types
 */
export type ToolCategory = 
  | 'filesystem'
  | 'network'
  | 'system'
  | 'development'
  | 'memory'
  | 'ai'
  | 'messaging'
  | 'scheduling'
  | 'custom';

/**
 * Tool Parameter Schema
 * Defines the parameters a tool accepts
 */
export interface ToolParameter {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required?: boolean;
  default?: any;
  enum?: any[];
  min?: number;
  max?: number;
  pattern?: string;
  items?: ToolParameter;
  properties?: Record<string, ToolParameter>;
}

/**
 * Tool Schema
 * Complete definition of a tool
 */
export interface ToolSchema {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  status: ToolStatus;
  version?: string;
  author?: string;
  
  // Execution
  handler: string | ((params: Record<string, any>, context: any) => Promise<any>);
  
  // Parameters
  parameters?: Record<string, ToolParameter>;
  strict?: boolean; // Strict parameter validation
  
  // Metadata
  tags?: string[];
  icon?: string;
  docsUrl?: string;
  
  // Safety
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval?: boolean;
  sandboxed?: boolean;
  
  // Access control
  permissions?: string[];
  scopes?: string[];
  
  // Execution limits
  timeout?: number;
  maxRetries?: number;
}

/**
 * Tool Call
 * Represents a tool call from an agent
 */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  type: 'function';
}

/**
 * Tool Result
 * Result of a tool execution
 */
export interface ToolResult {
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
 * Tool Registry Entry
 */
export interface ToolRegistryEntry {
  schema: ToolSchema;
  implementation: any;
  loadedAt: Date;
  source: 'core' | 'plugin' | 'mcp' | 'custom';
  pluginId?: string;
}

/**
 * Tool Execution Context
 */
export interface ToolExecutionContext {
  agentId: string;
  sessionId: string;
  userId?: string;
  workingDirectory?: string;
  environment: Record<string, string>;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Tool Execution Options
 */
export interface ToolExecutionOptions {
  timeout?: number;
  retries?: number;
  sandbox?: boolean;
  approvalRequired?: boolean;
  dryRun?: boolean;
}

/**
 * Tool Set
 * Collection of related tools
 */
export interface ToolSet {
  id: string;
  name: string;
  description: string;
  tools: string[]; // Tool IDs
  enabled: boolean;
  priority: number;
}

/**
 * Tool Discovery Result
 */
export interface ToolDiscoveryResult {
  tools: ToolSchema[];
  toolsets: ToolSet[];
  errors: string[];
  warnings: string[];
}

/**
 * MCP Tool Definition
 * For Model Context Protocol integration
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  outputSchema?: {
    type: string;
    properties?: Record<string, any>;
  };
}

/**
 * MCP Server Configuration
 */
export interface MCPServerConfig {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
  timeout?: number;
  enabled: boolean;
}

/**
 * Service-Gated Tool
 * Tools that are only available when certain conditions are met
 */
export interface ServiceGatedTool {
  id: string;
  check: () => Promise<boolean>;
  tool: ToolSchema;
}

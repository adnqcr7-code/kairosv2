// Provider Type Definitions
// Inspired by OpenClaw's provider system and Hermes' pluggable transports

/**
 * Provider Types
 */
export type ProviderType = 
  | 'local'
  | 'cloud'
  | 'custom'
  | 'openrouter';

/**
 * Provider Status Types
 */
export type ProviderStatus = 
  | 'ready'
  | 'unconfigured'
  | 'error'
  | 'loading'
  | 'disabled'
  | 'rate-limited'
  | 'unreachable';

/**
 * Provider Authentication Types
 */
export type AuthType = 
  | 'none'
  | 'api-key'
  | 'oauth'
  | 'token'
  | 'custom';

/**
 * Provider Model Information
 */
export interface ProviderModel {
  id: string;
  name: string;
  description?: string;
  contextWindow: number;
  maxTokens: number;
  pricing: {
    prompt: number;
    completion: number;
    unit: 'token' | 'character';
  };
  capabilities: string[];
  supported: boolean;
  deprecated?: boolean;
  alias?: string[];
}

/**
 * Provider Configuration
 */
export interface ProviderConfig {
  id: string;
  name: string;
  type: ProviderType;
  description?: string;
  
  // Authentication
  authType: AuthType;
  apiKeyEnv?: string; // Environment variable for API key
  oauthConfig?: OAuthConfig;
  
  // Connection
  baseUrl?: string;
  apiVersion?: string;
  
  // Defaults
  defaultModel?: string;
  models?: ProviderModel[];
  
  // Settings
  timeout?: number;
  maxRetries?: number;
  rateLimit?: number;
  
  // Features
  supportsStreaming?: boolean;
  supportsTools?: boolean;
  supportsVision?: boolean;
  supportsAudio?: boolean;
  
  // Metadata
  homepage?: string;
  docsUrl?: string;
  icon?: string;
}

/**
 * OAuth Configuration
 */
export interface OAuthConfig {
  clientId: string;
  clientSecretEnv: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri?: string;
}

/**
 * Provider Health Status
 */
export interface ProviderHealth {
  id: string;
  status: ProviderStatus;
  error?: string;
  lastChecked?: Date;
  latency?: number;
  models?: ProviderModel[];
  authenticated: boolean;
}

/**
 * Provider Routing Configuration
 */
export interface ProviderRoutingConfig {
  strategy: 'cheap' | 'balanced' | 'best' | 'custom';
  fallbackChain?: string[];
  modelPreferences?: Record<string, string[]>; // task type -> model ids
  costLimit?: number;
  
  // Scoring weights (0-10)
  weights?: {
    cost?: number;
    speed?: number;
    coding?: number;
    reasoning?: number;
    privacy?: number;
    reliability?: number;
  };
}

/**
 * Provider Selection Result
 */
export interface ProviderSelection {
  providerId: string;
  modelId: string;
  score: number;
  breakdown: Record<string, number>;
  reason: string;
}

/**
 * Model Router Configuration
 * For smart model selection based on task requirements
 */
export interface ModelRouterConfig {
  providers: Record<string, ProviderConfig>;
  routing: ProviderRoutingConfig;
  
  // Task type definitions
  taskTypes?: Record<string, {
    description: string;
    preferredModels: string[];
    requiredCapabilities: string[];
  }>;
}

/**
 * Provider Capabilities
 */
export interface ProviderCapabilities {
  chat: boolean;
  completions: boolean;
  embeddings: boolean;
  tools: boolean;
  vision: boolean;
  audio: boolean;
  streaming: boolean;
  batch: boolean;
}

/**
 * Provider Rate Limit Information
 */
export interface RateLimitInfo {
  requestsPerMinute?: number;
  tokensPerMinute?: number;
  requestsPerDay?: number;
  tokensPerDay?: number;
  burstLimit?: number;
  retryAfter?: number;
}

/**
 * Provider Usage Statistics
 */
export interface ProviderUsage {
  providerId: string;
  modelId: string;
  requests: number;
  tokens: number;
  cost: number;
  errors: number;
  lastUsed: Date;
}

/**
 * Local Provider Configuration (Ollama, LM Studio, etc.)
 */
export interface LocalProviderConfig extends ProviderConfig {
  type: 'local';
  baseUrl: string;
  models: ProviderModel[];
  gpuEnabled?: boolean;
  gpuMemory?: number;
}

/**
 * Cloud Provider Configuration
 */
export interface CloudProviderConfig extends ProviderConfig {
  type: 'cloud';
  authType: 'api-key' | 'oauth';
  apiKeyEnv: string;
}

/**
 * OpenRouter Configuration
 */
export interface OpenRouterConfig extends ProviderConfig {
  type: 'openrouter';
  apiKeyEnv: string;
  appName?: string;
  appVersion?: string;
  siteUrl?: string;
  siteName?: string;
}

/**
 * Provider Fallback Chain
 */
export interface FallbackChain {
  primary: string;
  fallbacks: string[];
  strategy: 'sequential' | 'parallel' | 'load-balanced';
  timeout?: number;
}

// Configuration Type Definitions

/**
 * Kairos Configuration
 * Main configuration for the Kairos agent system
 */
export interface KairosConfig {
  // Version
  version: string;
  
  // Environment
  environment: 'development' | 'production' | 'test';
  
  // Paths
  paths: {
    root: string;
    data: string;
    config: string;
    logs: string;
    plugins: string;
    skills: string;
    memory: string;
    temp: string;
  };
  
  // Gateway
  gateway?: GatewayConfig;
  
  // Agents
  agents?: AgentConfig;
  
  // Tools
  tools?: ToolConfig;
  
  // Providers
  providers?: ProviderConfig;
  
  // Memory
  memory?: MemoryConfig;
  
  // Skills
  skills?: SkillConfig;
  
  // Plugins
  plugins?: PluginConfig;
  
  // Security
  security?: SecurityConfig;
  
  // Sandbox
  sandbox?: SandboxConfig;
  
  // Network
  network?: NetworkConfig;
  
  // Logging
  logging?: LoggingConfig;
  
  // Features
  features?: FeatureConfig;
  
  // Experimental
  experimental?: ExperimentalConfig;
}

/**
 * Gateway Configuration
 */
export interface GatewayConfig {
  enabled: boolean;
  host: string;
  port: number;
  
  // API
  api: {
    rest: boolean;
    websocket: boolean;
    jsonRpc: boolean;
  };
  
  // Authentication
  auth: {
    enabled: boolean;
    type: 'none' | 'api-key' | 'jwt' | 'session';
    apiKey?: string;
    jwtSecret?: string;
    sessionTimeout: number;
  };
  
  // CORS
  cors: {
    enabled: boolean;
    origins: string[];
    methods: string[];
    headers: string[];
  };
  
  // Rate limiting
  rateLimit: {
    enabled: boolean;
    requestsPerMinute: number;
    burstLimit: number;
    whitelist: string[];
  };
}

/**
 * Agent Configuration
 */
export interface AgentConfig {
  // Default agent
  default: string;
  
  // Agent registry
  registry: {
    paths: string[];
    autoLoad: boolean;
    watch: boolean;
  };
  
  // Multi-agent
  multiAgent: {
    enabled: boolean;
    maxWorkers: number;
    taskTimeout: number;
    retryLimit: number;
  };
  
  // Agent settings
  settings: {
    maxIterations: number;
    timeout: number;
    temperature: number;
    topP: number;
    topK: number;
  };
}

/**
 * Tool Configuration
 */
export interface ToolConfig {
  // Tool registry
  registry: {
    paths: string[];
    autoLoad: boolean;
    watch: boolean;
  };
  
  // Tool execution
  execution: {
    timeout: number;
    maxRetries: number;
    sandbox: boolean;
    approvalRequired: boolean;
  };
  
  // Tool sets
  toolsets: Record<string, {
    tools: string[];
    enabled: boolean;
  }>;
  
  // MCP
  mcp: {
    enabled: boolean;
    servers: Record<string, {
      command: string;
      args: string[];
      env: Record<string, string>;
      enabled: boolean;
    }>;
  };
}

/**
 * Provider Configuration
 */
export interface ProviderConfig {
  // Default provider
  default: string;
  
  // Provider registry
  registry: {
    paths: string[];
    autoLoad: boolean;
  };
  
  // Routing
  routing: {
    strategy: 'cheap' | 'balanced' | 'best' | 'custom';
    fallbackChain: string[];
    weights: {
      cost: number;
      speed: number;
      coding: number;
      reasoning: number;
      privacy: number;
    };
  };
  
  // Providers
  providers: Record<string, {
    type: 'local' | 'cloud' | 'custom';
    baseUrl?: string;
    apiKeyEnv?: string;
    defaultModel?: string;
    models?: string[];
    enabled: boolean;
    timeout?: number;
    maxRetries?: number;
  }>;
}

/**
 * Memory Configuration
 */
export interface MemoryConfig {
  // Provider
  provider: {
    type: 'sqlite' | 'vector' | 'file' | 'custom';
    config: Record<string, any>;
  };
  
  // Storage
  storage: {
    path: string;
    compression: boolean;
    encryption: boolean;
  };
  
  // Indexing
  indexing: {
    enabled: boolean;
    type: 'fts5' | 'vector' | 'both';
    fts5: {
      enabled: boolean;
      tokenize: boolean;
      prefixSearch: boolean;
    };
    vector: {
      enabled: boolean;
      model: string;
      dimensions: number;
    };
  };
  
  // Conversation
  conversation: {
    maxHistory: number;
    compression: boolean;
    summarization: boolean;
  };
  
  // Cache
  cache: {
    enabled: boolean;
    ttl: number; // Seconds
    maxSize: number; // Entries
  };
}

/**
 * Skill Configuration
 */
export interface SkillConfig {
  // Skill paths
  paths: string[];
  
  // Auto-loading
  autoLoad: boolean;
  watch: boolean;
  
  // Indexing
  indexing: {
    enabled: boolean;
    interval: number; // Minutes
  };
  
  // Curator
  curator: {
    enabled: boolean;
    autoCreate: boolean;
    autoImprove: boolean;
    autoConsolidate: boolean;
    autoArchive: boolean;
  };
  
  // Execution
  execution: {
    timeout: number;
    maxRetries: number;
    sandbox: boolean;
  };
}

/**
 * Plugin Configuration
 */
export interface PluginConfig {
  // Plugin paths
  paths: string[];
  
  // Auto-loading
  autoLoad: boolean;
  watch: boolean;
  
  // Security
  security: {
    sandboxAll: boolean;
    allowedTypes: string[];
    blockedPlugins: string[];
  };
  
  // Performance
  performance: {
    maxPlugins: number;
    loadTimeout: number;
  };
}

/**
 * Security Configuration
 */
export interface SecurityConfig {
  // General
  enabled: boolean;
  
  // Input validation
  inputValidation: {
    enabled: boolean;
    maxLength: number;
    blockedPatterns: string[];
    allowedPatterns: string[];
  };
  
  // Prompt injection protection
  promptProtection: {
    enabled: boolean;
    patterns: string[];
    scanMemory: boolean;
    scanSkills: boolean;
    scanToolOutput: boolean;
  };
  
  // Command approval
  commandApproval: {
    enabled: boolean;
    riskLevels: ('low' | 'medium' | 'high' | 'critical')[];
    requireApproval: boolean;
    autoApprove: string[]; // Commands to auto-approve
  };
  
  // Sandbox
  sandbox: {
    enabled: boolean;
    default: string; // 'host' | 'docker' | 'wsl' | 'none'
    images: string[]; // Allowed Docker images
    network: 'none' | 'host' | 'bridge' | 'full';
    readOnly: boolean;
  };
  
  // Secrets
  secrets: {
    scan: boolean;
    patterns: string[];
    redact: boolean;
  };
  
  // Audit
  audit: {
    enabled: boolean;
    logCommands: boolean;
    logToolCalls: boolean;
    logMemoryAccess: boolean;
  };
}

/**
 * Sandbox Configuration
 */
export interface SandboxConfig {
  // Default sandbox mode
  default: 'host' | 'docker' | 'wsl' | 'none';
  
  // Docker
  docker: {
    enabled: boolean;
    image: string;
    pull: boolean;
    user: string; // UID:GID
    workspaceMode: 'ro' | 'rw';
    network: 'none' | 'host' | 'bridge';
    volumes: Record<string, string>;
    env: Record<string, string>;
    capabilities: string[];
    securityOpt: string[];
    memoryLimit: string;
    cpuLimit: number;
  };
  
  // WSL
  wsl: {
    enabled: boolean;
    distro: string;
    user: string;
    workspaceMode: 'ro' | 'rw';
  };
  
  // Host
  host: {
    enabled: boolean;
    allowedPaths: string[];
    blockedPaths: string[];
    allowedCommands: string[];
    blockedCommands: string[];
  };
}

/**
 * Network Configuration
 */
export interface NetworkConfig {
  // Proxy
  proxy: {
    enabled: boolean;
    httpProxy?: string;
    httpsProxy?: string;
    noProxy?: string[];
  };
  
  // Timeout
  timeout: {
    connection: number;
    request: number;
    socket: number;
  };
  
  // Retries
  retries: {
    max: number;
    delay: number;
    backoff: number;
  };
  
  // SSL/TLS
  ssl: {
    rejectUnauthorized: boolean;
    certPath?: string;
    keyPath?: string;
    caPath?: string;
  };
}

/**
 * Logging Configuration
 */
export interface LoggingConfig {
  // Level
  level: 'debug' | 'info' | 'warn' | 'error' | 'silent';
  
  // Output
  output: {
    console: boolean;
    file: boolean;
    path: string;
    maxFiles: number;
    maxSize: number; // Bytes
  };
  
  // Format
  format: 'json' | 'text' | 'pretty';
  
  // Components
  components: {
    agent: boolean;
    gateway: boolean;
    tools: boolean;
    providers: boolean;
    memory: boolean;
    plugins: boolean;
    security: boolean;
  };
  
  // Performance
  performance: {
    enabled: boolean;
    threshold: number; // Milliseconds
  };
}

/**
 * Feature Configuration
 */
export interface FeatureConfig {
  // Multi-agent
  multiAgent: boolean;
  
  // Scheduling
  scheduling: boolean;
  
  // Web dashboard
  dashboard: boolean;
  
  // TUI
  tui: boolean;
  
  // Desktop app
  desktop: boolean;
  
  // Voice
  voice: boolean;
  
  // Raft integration
  raft: boolean;
  
  // MCP
  mcp: boolean;
  
  // Observability
  observability: boolean;
}

/**
 * Experimental Configuration
 */
export interface ExperimentalConfig {
  // Autonomous skill creation
  autonomousSkills: boolean;
  
  // Self-improvement
  selfImprovement: boolean;
  
  // Adaptive personality
  adaptivePersonality: boolean;
  
  // Model routing
  modelRouting: boolean;
  
  // Context compression
  contextCompression: boolean;
}

/**
 * Configuration File Format
 * The structure of the config.yaml file
 */
export interface ConfigFile {
  version: string;
  kairos: KairosConfig;
}

/**
 * Environment Variables
 * Kairos-specific environment variables
 */
export interface KairosEnv {
  // Paths
  KAIROS_ROOT?: string;
  KAIROS_DATA_DIR?: string;
  KAIROS_CONFIG_DIR?: string;
  KAIROS_PLUGINS_DIR?: string;
  KAIROS_SKILLS_DIR?: string;
  
  // Gateway
  KAIROS_GATEWAY_HOST?: string;
  KAIROS_GATEWAY_PORT?: string;
  KAIROS_GATEWAY_AUTH_TOKEN?: string;
  
  // Providers
  KAIROS_PROVIDER?: string;
  KAIROS_MODEL?: string;
  KAIROS_OLLAMA_BASE_URL?: string;
  KAIROS_OLLAMA_MODEL?: string;
  OPENAI_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  GEMINI_API_KEY?: string;
  KIMI_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  
  // Sandbox
  KAIROS_SANDBOX?: 'host' | 'docker' | 'wsl' | 'none';
  KAIROS_UBUNTU_IMAGE?: string;
  KAIROS_WSL_DISTRO?: string;
  KAIROS_SANDBOX_NETWORK?: 'none' | 'host' | 'bridge' | 'full';
  KAIROS_SANDBOX_PULL?: 'always' | 'never' | 'if-not-exists';
  KAIROS_SANDBOX_USER?: string;
  KAIROS_SANDBOX_WORKSPACE_MODE?: 'ro' | 'rw';
  
  // Security
  KAIROS_APPROVAL_MODE?: 'step' | 'auto-safe' | 'manual';
  KAIROS_RISK_LEVEL?: 'low' | 'medium' | 'high';
  
  // Logging
  KAIROS_LOG_LEVEL?: string;
  KAIROS_LOG_FILE?: string;
  
  // Features
  KAIROS_MULTI_AGENT?: string;
  KAIROS_ENABLE_TUI?: string;
  KAIROS_ENABLE_DASHBOARD?: string;
}

/**
 * Configuration Manager
 * Manages Kairos configuration
 */
export interface ConfigManager {
  // Load configuration
  load(): Promise<KairosConfig>;
  loadFromFile(path: string): Promise<KairosConfig>;
  
  // Save configuration
  save(): Promise<void>;
  saveToFile(path: string): Promise<void>;
  
  // Get configuration
  get(): KairosConfig;
  get<T>(path: string, defaultValue?: T): T;
  
  // Set configuration
  set(path: string, value: any): Promise<void>;
  set<T>(path: string, value: T): Promise<void>;
  
  // Check if configuration exists
  has(path: string): boolean;
  
  // Watch for changes
  watch(callback: (path: string, value: any) => void): void;
  unwatch(callback: (path: string, value: any) => void): void;
  
  // Validate configuration
  validate(): Promise<string[]>;
  validate<T>(config: T): Promise<string[]>;
  
  // Reset to defaults
  reset(): Promise<void>;
  reset(path: string): Promise<void>;
  
  // Get defaults
  getDefaults(): KairosConfig;
  
  // Merge configurations
  merge(config: Partial<KairosConfig>): KairosConfig;
  
  // Get environment configuration
  getEnv(): KairosEnv;
}

/**
 * Configuration Schema
 * For validating configuration
 */
export interface ConfigSchema {
  type: string;
  description?: string;
  default?: any;
  required?: boolean;
  enum?: any[];
  min?: number;
  max?: number;
  pattern?: string;
  properties?: Record<string, ConfigSchema>;
  items?: ConfigSchema;
}

/**
 * Configuration Validation Result
 */
export interface ConfigValidationResult {
  valid: boolean;
  errors: ConfigValidationError[];
  warnings: ConfigValidationError[];
}

/**
 * Configuration Validation Error
 */
export interface ConfigValidationError {
  path: string;
  message: string;
  expected?: any;
  actual?: any;
  severity: 'error' | 'warning';
}

/**
 * Configuration Migration
 */
export interface ConfigMigration {
  id: string;
  name: string;
  description: string;
  fromVersion: string;
  toVersion: string;
  migrate: (config: any) => Promise<any>;
}

// Plugin Type Definitions
// Inspired by OpenClaw's plugin SDK and Hermes' plugin system

/**
 * Plugin Types
 */
export type PluginType = 
  | 'tool'
  | 'provider'
  | 'memory'
  | 'channel'
  | 'context-engine'
  | 'model-provider'
  | 'image-gen'
  | 'observability'
  | 'custom';

/**
 * Plugin Status Types
 */
export type PluginStatus = 
  | 'loaded'
  | 'unloaded'
  | 'error'
  | 'disabled'
  | 'loading';

/**
 * Plugin Manifest
 * Defines a plugin's metadata and configuration
 */
export interface PluginManifest {
  // Identity
  name: string;
  version: string;
  description: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  
  // Type and capabilities
  type: PluginType;
  capabilities: string[];
  
  // Entry points
  main: string; // Path to main module
  
  // Configuration
  configSchema?: PluginConfigSchema;
  defaults?: Record<string, any>;
  
  // Dependencies
  dependencies?: PluginDependencies;
  
  // Compatibility
  kairosVersion?: string;
  minKairosVersion?: string;
  maxKairosVersion?: string;
  
  // Metadata
  tags?: string[];
  keywords?: string[];
  icon?: string;
  
  // Security
  permissions?: string[];
  sandboxed?: boolean;
}

/**
 * Plugin Config Schema
 * Defines the configuration options for a plugin
 */
export interface PluginConfigSchema {
  type: 'object';
  properties: Record<string, PluginConfigProperty>;
  required?: string[];
}

export interface PluginConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  default?: any;
  enum?: any[];
  min?: number;
  max?: number;
  pattern?: string;
  items?: PluginConfigProperty;
  properties?: Record<string, PluginConfigProperty>;
  secret?: boolean; // Should be hidden in logs/UI
}

/**
 * Plugin Dependencies
 */
export interface PluginDependencies {
  plugins?: string[]; // Other plugins this depends on
  packages?: Record<string, string>; // npm packages
  nodeVersion?: string;
  os?: string[]; // Supported operating systems
}

/**
 * Plugin Instance
 * A loaded plugin instance
 */
export interface PluginInstance {
  id: string;
  manifest: PluginManifest;
  config: Record<string, any>;
  status: PluginStatus;
  error?: string;
  loadedAt?: Date;
  
  // Plugin API
  api?: any;
  
  // Lifecycle hooks
  hooks?: PluginHooks;
}

/**
 * Plugin Hooks
 * Lifecycle hooks for plugins
 */
export interface PluginHooks {
  // Lifecycle
  onLoad?: () => Promise<void>;
  onUnload?: () => Promise<void>;
  onEnable?: () => Promise<void>;
  onDisable?: () => Promise<void>;
  
  // Agent hooks
  onAgentInit?: (agent: any) => Promise<void>;
  onAgentBeforeRun?: (agent: any, context: any) => Promise<void>;
  onAgentAfterRun?: (agent: any, context: any, result: any) => Promise<void>;
  
  // Tool hooks
  onToolRegister?: (registry: any) => Promise<void>;
  onToolBeforeCall?: (tool: string, params: any) => Promise<any>;
  onToolAfterCall?: (tool: string, params: any, result: any) => Promise<any>;
  
  // Memory hooks
  onMemoryCreate?: (entry: any) => Promise<any>;
  onMemoryRead?: (entry: any) => Promise<any>;
  onMemorySearch?: (query: any, results: any[]) => Promise<any[]>;
  
  // Message hooks
  onMessageBeforeSend?: (message: any) => Promise<any>;
  onMessageAfterReceive?: (message: any) => Promise<any>;
  
  // Command hooks
  onCommand?: (command: string, args: string[]) => Promise<any>;
  
  // Scheduled hooks
  onSchedule?: (job: any) => Promise<void>;
}

/**
 * Plugin Registry Entry
 */
export interface PluginRegistryEntry {
  id: string;
  manifest: PluginManifest;
  path: string;
  status: PluginStatus;
  error?: string;
  loadedAt?: Date;
  instance?: PluginInstance;
}

/**
 * Plugin Loader Configuration
 */
export interface PluginLoaderConfig {
  paths: string[]; // Paths to search for plugins
  autoLoad: boolean;
  watch: boolean; // Watch for changes
  
  // Security
  allowedTypes?: PluginType[];
  blockedPlugins?: string[];
  sandboxAll?: boolean;
  
  // Performance
  maxPlugins?: number;
  loadTimeout?: number;
}

/**
 * Plugin SDK API
 * The API exposed to plugins
 */
export interface PluginSDK {
  // Agent
  agents: {
    register: (config: any) => string;
    get: (id: string) => any;
    list: () => any[];
    run: (id: string, task: string, context?: any) => Promise<any>;
  };
  
  // Tools
  tools: {
    register: (schema: any) => void;
    get: (id: string) => any;
    list: () => any[];
    call: (id: string, params: any) => Promise<any>;
  };
  
  // Memory
  memory: {
    create: (entry: any) => Promise<any>;
    read: (id: string) => Promise<any>;
    search: (query: any) => Promise<any[]>;
    update: (id: string, updates: any) => Promise<any>;
    delete: (id: string) => Promise<void>;
  };
  
  // Providers
  providers: {
    register: (config: any) => void;
    get: (id: string) => any;
    list: () => any[];
    select: (options: any) => Promise<any>;
  };
  
  // Configuration
  config: {
    get: (key: string, defaultValue?: any) => any;
    set: (key: string, value: any) => Promise<void>;
    has: (key: string) => boolean;
  };
  
  // Logging
  logger: {
    debug: (message: string, ...args: any[]) => void;
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
  };
  
  // Utilities
  utils: {
    fs: any;
    path: any;
    fetch: any;
    exec: (command: string, options?: any) => Promise<any>;
  };
  
  // Events
  events: {
    emit: (event: string, data?: any) => Promise<void>;
    on: (event: string, handler: (...args: any[]) => void) => void;
    once: (event: string, handler: (...args: any[]) => void) => void;
    off: (event: string, handler: (...args: any[]) => void) => void;
  };
}

/**
 * Plugin Context
 * Context passed to plugin hooks
 */
export interface PluginContext {
  pluginId: string;
  pluginName: string;
  config: Record<string, any>;
  kairosVersion: string;
  
  // Environment
  env: Record<string, string>;
  cwd: string;
  
  // SDK
  sdk: PluginSDK;
}

/**
 * Plugin Error
 */
export interface PluginError extends Error {
  pluginId: string;
  pluginName: string;
  hook?: string;
  originalError?: Error;
  
  constructor(
    message: string,
    options?: {
      pluginId?: string;
      pluginName?: string;
      hook?: string;
      cause?: Error;
    }
  );
}

/**
 * Plugin Sandbox Configuration
 */
export interface PluginSandboxConfig {
  enabled: boolean;
  type: 'none' | 'vm' | 'container' | 'process';
  
  // Resource limits
  maxMemory?: number; // MB
  maxCPU?: number; // Percentage
  maxTime?: number; // Seconds
  
  // Network
  networkAccess?: boolean;
  allowedHosts?: string[];
  
  // Filesystem
  filesystemAccess?: boolean;
  allowedPaths?: string[];
  readOnly?: boolean;
}

/**
 * Plugin Marketplace Entry
 * For distributing plugins
 */
export interface PluginMarketplaceEntry {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  
  // Metadata
  type: PluginType;
  tags: string[];
  license: string;
  homepage: string;
  repository: string;
  
  // Stats
  downloads: number;
  rating: number;
  reviews: number;
  
  // Compatibility
  kairosVersion: string;
  minKairosVersion: string;
  
  // Installation
  installCommand: string;
  
  // Content
  readme: string;
  changelog: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Plugin Update Info
 */
export interface PluginUpdateInfo {
  currentVersion: string;
  availableVersion: string;
  changelog: string[];
  breakingChanges: boolean;
  updateCommand: string;
}

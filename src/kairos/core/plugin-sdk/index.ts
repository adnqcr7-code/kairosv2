// Plugin SDK
// Inspired by OpenClaw's plugin SDK and Hermes' plugin system
// Provides a clean, safe API for plugins to extend Kairos functionality

import type {
  PluginManifest,
  PluginInstance,
  PluginHooks,
  PluginSDK,
  PluginContext,
  PluginConfigSchema,
  PluginStatus
} from '../../types/plugins';

import type {
  ToolSchema,
  ToolRegistryEntry
} from '../../types/tools';

import type {
  ProviderConfig,
  ProviderModel
} from '../../types/providers';

import type {
  MemoryEntry,
  MemorySearchOptions,
  MemorySearchResult
} from '../../types/memory';

// Re-export types
export * from '../../types/plugins';

/**
 * Plugin SDK Implementation
 * This is the main class that provides the plugin API
 */
export class KairosPluginSDK implements PluginSDK {
  private pluginId: string;
  private pluginName: string;
  private config: Record<string, any>;
  private hooks: PluginHooks = {};
  
  // Private references to Kairos internals (injected at creation)
  private kairosInternals: {
    registerTool: (schema: ToolSchema) => void;
    registerProvider: (config: ProviderConfig) => void;
    getMemory: () => any;
    getLogger: () => any;
    getConfig: () => any;
    emitEvent: (event: string, data?: any) => Promise<void>;
    onEvent: (event: string, handler: (...args: any[]) => void) => void;
  };

  constructor(
    pluginId: string,
    pluginName: string,
    config: Record<string, any>,
    internals: any
  ) {
    this.pluginId = pluginId;
    this.pluginName = pluginName;
    this.config = config;
    this.kairosInternals = internals;
  }

  // ============================================================================
  // AGENT API
  // ============================================================================

  agents = {
    register: (config: any) => {
      // Register a new agent type
      // This will be handled by the agent registry
      return this.kairosInternals.registerAgent?.(config) || '';
    },
    
    get: (id: string) => {
      // Get an agent by ID
      return this.kairosInternals.getAgent?.(id);
    },
    
    list: () => {
      // List all registered agents
      return this.kairosInternals.listAgents?.() || [];
    },
    
    run: async (id: string, task: string, context?: any) => {
      // Run an agent with a task
      return this.kairosInternals.runAgent?.(id, task, context);
    }
  };

  // ============================================================================
  // TOOL API
  // ============================================================================

  tools = {
    register: (schema: ToolSchema) => {
      // Add plugin ID to schema for tracking
      const pluginSchema: ToolSchema = {
        ...schema,
        id: `${this.pluginId}:${schema.id}`,
        // Mark as coming from a plugin
        metadata: {
          ...schema.metadata,
          source: 'plugin',
          pluginId: this.pluginId,
          pluginName: this.pluginName
        }
      };
      
      this.kairosInternals.registerTool(pluginSchema);
    },
    
    get: (id: string) => {
      // Get a tool by ID (can be from any source)
      return this.kairosInternals.getTool?.(id);
    },
    
    list: () => {
      // List all registered tools
      return this.kairosInternals.listTools?.() || [];
    },
    
    call: async (id: string, params: any) => {
      // Call a tool by ID
      return this.kairosInternals.callTool?.(id, params);
    }
  };

  // ============================================================================
  // MEMORY API
  // ============================================================================

  memory = {
    create: async (entry: MemoryEntry) => {
      // Add plugin metadata
      const pluginEntry: MemoryEntry = {
        ...entry,
        metadata: {
          ...entry.metadata,
          source: 'plugin',
          pluginId: this.pluginId,
          pluginName: this.pluginName
        }
      };
      
      return this.kairosInternals.getMemory().create(pluginEntry);
    },
    
    read: async (id: string) => {
      return this.kairosInternals.getMemory().read(id);
    },
    
    search: async (query: MemorySearchOptions) => {
      return this.kairosInternals.getMemory().search(query);
    },
    
    update: async (id: string, updates: Partial<MemoryEntry>) => {
      return this.kairosInternals.getMemory().update(id, updates);
    },
    
    delete: async (id: string) => {
      return this.kairosInternals.getMemory().delete(id);
    }
  };

  // ============================================================================
  // PROVIDER API
  // ============================================================================

  providers = {
    register: (config: ProviderConfig) => {
      // Add plugin metadata
      const pluginConfig: ProviderConfig = {
        ...config,
        id: `${this.pluginId}:${config.id}`,
        metadata: {
          ...config.metadata,
          source: 'plugin',
          pluginId: this.pluginId,
          pluginName: this.pluginName
        }
      };
      
      this.kairosInternals.registerProvider(pluginConfig);
    },
    
    get: (id: string) => {
      return this.kairosInternals.getProvider?.(id);
    },
    
    list: () => {
      return this.kairosInternals.listProviders?.() || [];
    },
    
    select: async (options: any) => {
      return this.kairosInternals.selectProvider?.(options);
    }
  };

  // ============================================================================
  // CONFIGURATION API
  // ============================================================================

  config = {
    get: (key: string, defaultValue?: any) => {
      // First check plugin config, then global config
      if (this.config && Object.prototype.hasOwnProperty.call(this.config, key)) {
        return this.config[key];
      }
      return this.kairosInternals.getConfig().get(key, defaultValue);
    },
    
    set: async (key: string, value: any) => {
      // Plugins can only set their own config
      // Global config changes go through proper channels
      if (key.startsWith(`${this.pluginId}.`)) {
        this.config[key] = value;
        await this.kairosInternals.getConfig().set(key, value);
      } else {
        throw new Error(`Plugin ${this.pluginId} cannot set global config key: ${key}`);
      }
    },
    
    has: (key: string) => {
      return Object.prototype.hasOwnProperty.call(this.config, key) || 
             this.kairosInternals.getConfig().has(key);
    }
  };

  // ============================================================================
  // LOGGING API
  // ============================================================================

  logger = {
    debug: (message: string, ...args: any[]) => {
      this.kairosInternals.getLogger().debug(`[${this.pluginName}] ${message}`, ...args);
    },
    
    info: (message: string, ...args: any[]) => {
      this.kairosInternals.getLogger().info(`[${this.pluginName}] ${message}`, ...args);
    },
    
    warn: (message: string, ...args: any[]) => {
      this.kairosInternals.getLogger().warn(`[${this.pluginName}] ${message}`, ...args);
    },
    
    error: (message: string, ...args: any[]) => {
      this.kairosInternals.getLogger().error(`[${this.pluginName}] ${message}`, ...args);
    }
  };

  // ============================================================================
  // UTILITIES API
  // ============================================================================

  utils = {
    fs: {
      readFile: async (path: string, encoding?: string) => {
        // Use Kairos' safe file reading
        return this.kairosInternals.fs?.readFile(path, encoding);
      },
      
      writeFile: async (path: string, content: string, encoding?: string) => {
        return this.kairosInternals.fs?.writeFile(path, content, encoding);
      },
      
      exists: async (path: string) => {
        return this.kairosInternals.fs?.exists(path);
      },
      
      readdir: async (path: string) => {
        return this.kairosInternals.fs?.readdir(path);
      },
      
      stat: async (path: string) => {
        return this.kairosInternals.fs?.stat(path);
      }
    },
    
    path: {
      join: (...paths: string[]) => {
        return this.kairosInternals.path?.join(...paths);
      },
      
      resolve: (...paths: string[]) => {
        return this.kairosInternals.path?.resolve(...paths);
      },
      
      basename: (path: string, ext?: string) => {
        return this.kairosInternals.path?.basename(path, ext);
      },
      
      dirname: (path: string) => {
        return this.kairosInternals.path?.dirname(path);
      },
      
      extname: (path: string) => {
        return this.kairosInternals.path?.extname(path);
      }
    },
    
    fetch: async (url: string, options?: any) => {
      // Use Kairos' safe fetch with approval checks
      return this.kairosInternals.fetch?.(url, options);
    },
    
    exec: async (command: string, options?: any) => {
      // Use Kairos' safe command execution with approval
      return this.kairosInternals.exec?.(command, {
        ...options,
        pluginId: this.pluginId,
        pluginName: this.pluginName
      });
    }
  };

  // ============================================================================
  // EVENT API
  // ============================================================================

  events = {
    emit: async (event: string, data?: any) => {
      await this.kairosInternals.emitEvent(`plugin:${this.pluginId}:${event}`, {
        pluginId: this.pluginId,
        pluginName: this.pluginName,
        ...data
      });
    },
    
    on: (event: string, handler: (...args: any[]) => void) => {
      this.kairosInternals.onEvent(`plugin:${this.pluginId}:${event}`, handler);
    },
    
    once: (event: string, handler: (...args: any[]) => void) => {
      // For once, we need to track and remove after first call
      const wrappedHandler = (...args: any[]) => {
        handler(...args);
        this.kairosInternals.offEvent?.(`plugin:${this.pluginId}:${event}`, wrappedHandler);
      };
      this.kairosInternals.onEvent(`plugin:${this.pluginId}:${event}`, wrappedHandler);
    },
    
    off: (event: string, handler: (...args: any[]) => void) => {
      this.kairosInternals.offEvent?.(`plugin:${this.pluginId}:${event}`, handler);
    }
  };

  // ============================================================================
  // PLUGIN METADATA
  // ============================================================================

  getPluginId(): string {
    return this.pluginId;
  }

  getPluginName(): string {
    return this.pluginName;
  }

  getConfig(): Record<string, any> {
    return { ...this.config };
  }

  setHooks(hooks: PluginHooks): void {
    this.hooks = hooks;
  }

  getHooks(): PluginHooks {
    return { ...this.hooks };
  }
}

/**
 * Plugin Loader
 * Loads and manages plugins
 */
export class PluginLoader {
  private plugins: Map<string, PluginInstance> = new Map();
  private pluginPaths: string[];
  private config: any;
  private logger: any;
  private eventBus: any;
  
  // Kairos internals to pass to plugins
  private internals: any;

  constructor(
    pluginPaths: string[],
    config: any,
    logger: any,
    eventBus: any,
    internals: any
  ) {
    this.pluginPaths = pluginPaths;
    this.config = config;
    this.logger = logger;
    this.eventBus = eventBus;
    this.internals = internals;
  }

  /**
   * Load all plugins from configured paths
   */
  async loadAll(): Promise<PluginInstance[]> {
    const loadedPlugins: PluginInstance[] = [];
    
    for (const path of this.pluginPaths) {
      try {
        const plugins = await this.loadFromPath(path);
        loadedPlugins.push(...plugins);
      } catch (error) {
        this.logger.error(`Failed to load plugins from ${path}: ${error}`);
      }
    }
    
    return loadedPlugins;
  }

  /**
   * Load plugins from a specific path
   */
  async loadFromPath(path: string): Promise<PluginInstance[]> {
    const plugins: PluginInstance[] = [];
    
    // Check if path exists and is a directory
    const fs = this.internals.fs;
    const exists = await fs.exists(path);
    
    if (!exists) {
      this.logger.debug(`Plugin path does not exist: ${path}`);
      return plugins;
    }
    
    const stat = await fs.stat(path);
    if (!stat.isDirectory()) {
      this.logger.debug(`Plugin path is not a directory: ${path}`);
      return plugins;
    }
    
    // Read directory contents
    const entries = await fs.readdir(path, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const pluginPath = this.internals.path.join(path, entry.name);
        const plugin = await this.loadPlugin(pluginPath);
        
        if (plugin) {
          plugins.push(plugin);
          this.plugins.set(plugin.manifest.name, plugin);
        }
      }
    }
    
    return plugins;
  }

  /**
   * Load a single plugin from its directory
   */
  async loadPlugin(pluginPath: string): Promise<PluginInstance | null> {
    const fs = this.internals.fs;
    const path = this.internals.path;
    
    // Check for manifest file
    const manifestPath = path.join(pluginPath, 'plugin.yaml');
    const manifestExists = await fs.exists(manifestPath);
    
    if (!manifestExists) {
      this.logger.debug(`No plugin.yaml found in ${pluginPath}`);
      return null;
    }
    
    try {
      // Read and parse manifest
      const manifestContent = await fs.readFile(manifestPath, 'utf8');
      const manifest: PluginManifest = this.parseYaml(manifestContent);
      
      // Validate manifest
      if (!this.validateManifest(manifest)) {
        this.logger.error(`Invalid plugin manifest in ${pluginPath}`);
        return null;
      }
      
      // Check version compatibility
      if (!this.checkCompatibility(manifest)) {
        this.logger.warn(`Plugin ${manifest.name} is not compatible with this Kairos version`);
        return null;
      }
      
      // Load plugin configuration
      const pluginConfigPath = path.join(pluginPath, 'config.yaml');
      let pluginConfig: Record<string, any> = {};
      
      if (await fs.exists(pluginConfigPath)) {
        const configContent = await fs.readFile(pluginConfigPath, 'utf8');
        pluginConfig = this.parseYaml(configContent);
      }
      
      // Merge with defaults from manifest
      const finalConfig = {
        ...manifest.defaults,
        ...pluginConfig
      };
      
      // Create plugin instance
      const pluginInstance: PluginInstance = {
        id: manifest.name,
        manifest,
        config: finalConfig,
        status: 'loading',
        error: undefined
      };
      
      try {
        // Load the plugin module
        const mainPath = path.join(pluginPath, manifest.main);
        const pluginModule = require(mainPath);
        
        // Initialize plugin
        const sdk = new KairosPluginSDK(
          manifest.name,
          manifest.name,
          finalConfig,
          this.internals
        );
        
        // Call plugin initialization if it exists
        if (typeof pluginModule.initialize === 'function') {
          await pluginModule.initialize(sdk, finalConfig);
        }
        
        // Set up hooks
        if (pluginModule.hooks) {
          sdk.setHooks(pluginModule.hooks);
        }
        
        // Register plugin components
        if (pluginModule.register) {
          await pluginModule.register(sdk);
        }
        
        pluginInstance.status = 'loaded';
        pluginInstance.api = pluginModule;
        
        this.logger.info(`Loaded plugin: ${manifest.name} v${manifest.version}`);
        
        return pluginInstance;
        
      } catch (error) {
        pluginInstance.status = 'error';
        pluginInstance.error = error.message;
        this.logger.error(`Failed to initialize plugin ${manifest.name}: ${error}`);
        return pluginInstance;
      }
      
    } catch (error) {
      this.logger.error(`Failed to load plugin from ${pluginPath}: ${error}`);
      return null;
    }
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    
    if (!plugin) {
      this.logger.debug(`Plugin ${pluginId} not found`);
      return false;
    }
    
    try {
      // Call plugin cleanup if it exists
      if (plugin.api && typeof plugin.api.cleanup === 'function') {
        await plugin.api.cleanup();
      }
      
      plugin.status = 'unloaded';
      this.plugins.delete(pluginId);
      
      this.logger.info(`Unloaded plugin: ${pluginId}`);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to unload plugin ${pluginId}: ${error}`);
      return false;
    }
  }

  /**
   * Get a loaded plugin
   */
  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all loaded plugins
   */
  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by type
   */
  getPluginsByType(type: string): PluginInstance[] {
    return Array.from(this.plugins.values())
      .filter(p => p.manifest.type === type);
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    
    if (!plugin) {
      return false;
    }
    
    if (plugin.status === 'enabled') {
      return true;
    }
    
    try {
      if (plugin.api && typeof plugin.api.enable === 'function') {
        await plugin.api.enable();
      }
      
      plugin.status = 'loaded';
      this.logger.info(`Enabled plugin: ${pluginId}`);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to enable plugin ${pluginId}: ${error}`);
      return false;
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    
    if (!plugin) {
      return false;
    }
    
    try {
      if (plugin.api && typeof plugin.api.disable === 'function') {
        await plugin.api.disable();
      }
      
      plugin.status = 'disabled';
      this.logger.info(`Disabled plugin: ${pluginId}`);
      return true;
      
    } catch (error) {
      this.logger.error(`Failed to disable plugin ${pluginId}: ${error}`);
      return false;
    }
  }

  /**
   * Parse YAML (simple implementation for now)
   * In production, use a proper YAML parser
   */
  private parseYaml(content: string): any {
    // This is a simplified YAML parser
    // In production, use js-yaml or similar
    
    // Try to parse as JSON first (many YAML files are valid JSON)
    try {
      return JSON.parse(content);
    } catch {
      // Fall back to simple YAML parsing
      const result: any = {};
      const lines = content.split('\n');
      let currentKey: string | null = null;
      let currentValue: any = null;
      let indentLevel = 0;
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }
        
        const match = trimmed.match(/^([^:]+):\s*(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          
          if (value === '' || value.startsWith('|') || value.startsWith('>')) {
            // Multi-line value
            currentKey = key;
            currentValue = '';
            indentLevel = line.search(/\S/);
          } else {
            // Simple value
            result[key] = this.parseYamlValue(value);
          }
        } else if (currentKey && line.startsWith(' '.repeat(indentLevel + 2))) {
          // Continuation of multi-line value
          currentValue += line.slice(indentLevel + 2) + '\n';
          result[currentKey] = currentValue.trim();
        }
      }
      
      return result;
    }
  }

  /**
   * Parse YAML value
   */
  private parseYamlValue(value: string): any {
    if (value === 'true' || value === 'yes' || value === 'on') {
      return true;
    }
    if (value === 'false' || value === 'no' || value === 'off') {
      return false;
    }
    if (value === 'null' || value === '~') {
      return null;
    }
    if (!isNaN(Number(value))) {
      return Number(value);
    }
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      return value.slice(1, -1).split(',').map(v => this.parseYamlValue(v.trim()));
    }
    if (value.startsWith('{') && value.endsWith('}')) {
      // Simple object parsing
      const obj: any = {};
      const pairs = value.slice(1, -1).split(',').map(p => p.trim());
      for (const pair of pairs) {
        const [k, v] = pair.split(':').map(s => s.trim());
        obj[k] = this.parseYamlValue(v);
      }
      return obj;
    }
    
    return value;
  }

  /**
   * Validate plugin manifest
   */
  private validateManifest(manifest: any): manifest is PluginManifest {
    return (
      typeof manifest === 'object' &&
      typeof manifest.name === 'string' &&
      typeof manifest.version === 'string' &&
      typeof manifest.description === 'string' &&
      typeof manifest.main === 'string' &&
      typeof manifest.type === 'string'
    );
  }

  /**
   * Check plugin compatibility
   */
  private checkCompatibility(manifest: PluginManifest): boolean {
    // Check min/max Kairos version
    const currentVersion = this.config.version || '2.0.0';
    
    if (manifest.minKairosVersion) {
      if (!this.compareVersions(currentVersion, manifest.minKairosVersion)) {
        return false;
      }
    }
    
    if (manifest.maxKairosVersion) {
      if (this.compareVersions(currentVersion, manifest.maxKairosVersion) > 0) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Compare semantic versions
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    
    return 0;
  }
}

/**
 * Plugin Registry
 * Central registry for all plugins
 */
export class PluginRegistry {
  private plugins: Map<string, PluginRegistryEntry> = new Map();
  private loader: PluginLoader;
  private logger: any;

  constructor(loader: PluginLoader, logger: any) {
    this.loader = loader;
    this.logger = logger;
  }

  /**
   * Register a plugin
   */
  register(plugin: PluginInstance): PluginRegistryEntry {
    const entry: PluginRegistryEntry = {
      id: plugin.manifest.name,
      manifest: plugin.manifest,
      path: '', // Will be set by loader
      status: plugin.status,
      error: plugin.error,
      loadedAt: new Date(),
      instance: plugin
    };
    
    this.plugins.set(plugin.manifest.name, entry);
    return entry;
  }

  /**
   * Unregister a plugin
   */
  unregister(pluginId: string): boolean {
    return this.plugins.delete(pluginId);
  }

  /**
   * Get a plugin by ID
   */
  get(pluginId: string): PluginRegistryEntry | undefined {
    return this.plugins.get(pluginId);
  }

  /**
   * Get all plugins
   */
  getAll(): PluginRegistryEntry[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by type
   */
  getByType(type: PluginType): PluginRegistryEntry[] {
    return Array.from(this.plugins.values())
      .filter(p => p.manifest.type === type);
  }

  /**
   * Get plugins by capability
   */
  getByCapability(capability: string): PluginRegistryEntry[] {
    return Array.from(this.plugins.values())
      .filter(p => p.manifest.capabilities?.includes(capability));
  }

  /**
   * Load all plugins
   */
  async loadAll(): Promise<PluginRegistryEntry[]> {
    const plugins = await this.loader.loadAll();
    
    for (const plugin of plugins) {
      this.register(plugin);
    }
    
    return Array.from(this.plugins.values());
  }

  /**
   * Reload all plugins
   */
  async reloadAll(): Promise<PluginRegistryEntry[]> {
    // Unload all first
    for (const [id, entry] of this.plugins) {
      if (entry.instance) {
        await this.loader.unloadPlugin(id);
      }
    }
    
    this.plugins.clear();
    
    // Load all again
    return this.loadAll();
  }

  /**
   * Get plugin statistics
   */
  getStats(): {
    total: number;
    loaded: number;
    failed: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  } {
    const stats = {
      total: this.plugins.size,
      loaded: 0,
      failed: 0,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>
    };
    
    for (const entry of this.plugins.values()) {
      // Count by status
      stats.byStatus[entry.status] = (stats.byStatus[entry.status] || 0) + 1;
      
      if (entry.status === 'loaded') {
        stats.loaded++;
      } else if (entry.status === 'error') {
        stats.failed++;
      }
      
      // Count by type
      const type = entry.manifest.type;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }
    
    return stats;
  }
}

// Export plugin SDK factory
export function createPluginSDK(
  pluginId: string,
  pluginName: string,
  config: Record<string, any>,
  internals: any
): KairosPluginSDK {
  return new KairosPluginSDK(pluginId, pluginName, config, internals);
}

export default {
  KairosPluginSDK,
  PluginLoader,
  PluginRegistry,
  createPluginSDK
};

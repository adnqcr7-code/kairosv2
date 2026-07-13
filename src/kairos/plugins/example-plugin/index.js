// Example Plugin for Kairos
// Demonstrates plugin capabilities

/**
 * Plugin initialization
 * Called when the plugin is loaded
 */
async function initialize(sdk, config) {
  console.log(`[Example Plugin] Initializing v${config.version || '1.0.0'}`);
  
  // Log configuration
  if (config.debug) {
    sdk.logger.debug('Example plugin debug mode enabled');
    sdk.logger.debug('Configuration:', config);
  }
  
  // Register tools
  registerTools(sdk);
  
  // Register commands
  registerCommands(sdk);
  
  // Set up hooks
  setupHooks(sdk, config);
  
  console.log('[Example Plugin] Initialized successfully');
}

/**
 * Register example tools
 */
function registerTools(sdk) {
  // Tool 1: Greet user
  sdk.tools.register({
    id: 'example.greet',
    name: 'example_greet',
    description: 'Greet the user with a custom message',
    category: 'custom',
    status: 'ready',
    riskLevel: 'low',
    requiresApproval: false,
    
    parameters: {
      name: {
        type: 'string',
        description: 'Name to greet (optional)',
        required: false
      }
    },
    
    handler: async (params, context) => {
      const name = params.name || 'there';
      const greeting = sdk.config.get('greeting', 'Hello from Example Plugin!');
      
      return {
        success: true,
        output: `${greeting} ${name}!`,
        executionTime: Date.now() - context.timestamp.getTime()
      };
    }
  });

  // Tool 2: Get plugin info
  sdk.tools.register({
    id: 'example.info',
    name: 'example_info',
    description: 'Get information about the example plugin',
    category: 'custom',
    status: 'ready',
    riskLevel: 'low',
    requiresApproval: false,
    
    handler: async (params, context) => {
      return {
        success: true,
        output: {
          name: 'example-plugin',
          version: '1.0.0',
          description: 'An example plugin demonstrating Kairos plugin capabilities',
          author: 'kairos-team',
          capabilities: ['tools', 'custom-commands'],
          loadedAt: new Date().toISOString()
        }
      };
    }
  });

  // Tool 3: Echo with memory
  sdk.tools.register({
    id: 'example.echo',
    name: 'example_echo',
    description: 'Echo a message and optionally store it in memory',
    category: 'custom',
    status: 'ready',
    riskLevel: 'low',
    requiresApproval: false,
    
    parameters: {
      message: {
        type: 'string',
        description: 'Message to echo',
        required: true
      },
      storeInMemory: {
        type: 'boolean',
        description: 'Whether to store the message in memory',
        required: false,
        default: false
      }
    },
    
    handler: async (params, context) => {
      const { message, storeInMemory } = params;
      
      if (storeInMemory) {
        // Store in memory
        await sdk.memory.create({
          id: `example_echo_${Date.now()}`,
          type: 'custom',
          key: 'example_echo',
          value: {
            message,
            timestamp: new Date().toISOString(),
            sessionId: context.sessionId,
            userId: context.userId
          },
          metadata: {
            source: 'example-plugin',
            tool: 'example.echo'
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          tags: ['example', 'echo']
        });
        
        return {
          success: true,
          output: `Echo: ${message} (stored in memory)`
        };
      }
      
      return {
        success: true,
        output: `Echo: ${message}`
      };
    }
  });
}

/**
 * Register example commands
 */
function registerCommands(sdk) {
  // The commands will be registered through the gateway
  // This is a placeholder for future command registration
  
  // For now, we'll just log that commands would be registered
  sdk.logger.debug('[Example Plugin] Commands would be registered here');
}

/**
 * Set up plugin hooks
 */
function setupHooks(sdk, config) {
  const hooks = {
    // Lifecycle hooks
    onLoad: async () => {
      sdk.logger.info('[Example Plugin] onLoad hook called');
    },
    
    onUnload: async () => {
      sdk.logger.info('[Example Plugin] onUnload hook called');
    },
    
    onEnable: async () => {
      sdk.logger.info('[Example Plugin] onEnable hook called');
    },
    
    onDisable: async () => {
      sdk.logger.info('[Example Plugin] onDisable hook called');
    },
    
    // Agent hooks
    onAgentInit: async (agent) => {
      if (config.debug) {
        sdk.logger.debug(`[Example Plugin] Agent initialized: ${agent.id}`);
      }
    },
    
    onAgentBeforeRun: async (agent, context) => {
      if (config.debug) {
        sdk.logger.debug(`[Example Plugin] Agent ${agent.id} about to run`);
      }
    },
    
    onAgentAfterRun: async (agent, context, result) => {
      if (config.debug) {
        sdk.logger.debug(`[Example Plugin] Agent ${agent.id} finished running`);
      }
    },
    
    // Tool hooks
    onToolBeforeCall: async (tool, params) => {
      if (config.debug) {
        sdk.logger.debug(`[Example Plugin] Tool ${tool} about to be called with:`, params);
      }
      // Could modify params here if needed
      return params;
    },
    
    onToolAfterCall: async (tool, params, result) => {
      if (config.debug) {
        sdk.logger.debug(`[Example Plugin] Tool ${tool} returned:`, result);
      }
      // Could modify result here if needed
      return result;
    },
    
    // Memory hooks
    onMemoryCreate: async (entry) => {
      if (config.debug) {
        sdk.logger.debug(`[Example Plugin] Memory entry created:`, entry);
      }
      // Could modify entry here if needed
      return entry;
    },
    
    // Message hooks
    onMessageBeforeSend: async (message) => {
      if (config.debug) {
        sdk.logger.debug(`[Example Plugin] Message about to be sent:`, message);
      }
      // Could modify message here if needed
      return message;
    },
    
    onMessageAfterReceive: async (message) => {
      if (config.debug) {
        sdk.logger.debug(`[Example Plugin] Message received:`, message);
      }
      // Could process message here
      return message;
    }
  };
  
  sdk.setHooks(hooks);
}

/**
 * Plugin cleanup
 * Called when the plugin is unloaded
 */
async function cleanup() {
  console.log('[Example Plugin] Cleaning up...');
  // Clean up any resources
}

/**
 * Plugin enable
 * Called when the plugin is enabled
 */
async function enable() {
  console.log('[Example Plugin] Enabling...');
}

/**
 * Plugin disable
 * Called when the plugin is disabled
 */
async function disable() {
  console.log('[Example Plugin] Disabling...');
}

// Export plugin interface
module.exports = {
  initialize,
  cleanup,
  enable,
  disable,
  
  // Metadata
  name: 'example-plugin',
  version: '1.0.0',
  description: 'An example plugin demonstrating Kairos plugin capabilities'
};

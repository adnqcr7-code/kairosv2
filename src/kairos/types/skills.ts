// Skill Type Definitions
// Inspired by Hermes' autonomous skill system

/**
 * Skill Categories
 */
export type SkillCategory = 
  | 'coding'
  | 'devops'
  | 'security'
  | 'ai-ml'
  | 'documentation'
  | 'product'
  | 'communication'
  | 'learning'
  | 'meta-agent'
  | 'innovation'
  | 'management'
  | 'cybersecurity'
  | 'ethics'
  | 'legal'
  | 'finance'
  | 'marketing'
  | 'sales'
  | 'operations'
  | 'customer-support'
  | 'custom';

/**
 * Skill Status Types
 */
export type SkillStatus = 
  | 'active'
  | 'disabled'
  | 'deprecated'
  | 'archived'
  | 'draft';

/**
 * Skill Trigger Types
 */
export type SkillTrigger = 
  | 'command'
  | 'keyword'
  | 'pattern'
  | 'event'
  | 'manual'
  | 'scheduled';

/**
 * Skill Metadata
 */
export interface SkillMetadata {
  id: string;
  name: string;
  version: string;
  category: SkillCategory;
  description: string;
  author?: string;
  license?: string;
  homepage?: string;
  
  // Status and lifecycle
  status: SkillStatus;
  createdAt: Date;
  updatedAt: Date;
  deprecatedAt?: Date;
  archivedAt?: Date;
  
  // Quality metrics
  rating?: number; // 0-5
  usageCount?: number;
  successRate?: number;
  lastUsedAt?: Date;
  
  // Tags and classification
  tags?: string[];
  keywords?: string[];
  dependencies?: string[];
  conflicts?: string[];
  
  // Requirements
  requires?: {
    models?: string[];
    tools?: string[];
    permissions?: string[];
    environment?: Record<string, string>;
  };
}

/**
 * Skill Content
 * The actual skill definition in markdown format
 */
export interface SkillContent {
  // Frontmatter metadata (parsed from markdown)
  metadata: SkillMetadata;
  
  // Skill sections
  trigger?: string | string[]; // Trigger phrases or patterns
  parameters?: SkillParameter[]; // Parameter definitions
  action?: string; // Main action description
  examples?: string[]; // Usage examples
  notes?: string; // Additional notes
  
  // Raw markdown content
  rawMarkdown: string;
}

/**
 * Skill Parameter
 */
export interface SkillParameter {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'file' | 'directory';
  required?: boolean;
  default?: any;
  enum?: any[];
  pattern?: string;
  min?: number;
  max?: number;
}

/**
 * Skill Execution Context
 */
export interface SkillExecutionContext {
  skillId: string;
  agentId: string;
  sessionId: string;
  userId?: string;
  
  // Input
  query: string;
  parameters: Record<string, any>;
  
  // Environment
  workingDirectory?: string;
  environment: Record<string, string>;
  availableTools: string[];
  
  // Memory
  conversationHistory?: any[];
  userProfile?: any;
  agentNotes?: any[];
}

/**
 * Skill Execution Result
 */
export interface SkillExecutionResult {
  success: boolean;
  output?: string;
  data?: any;
  error?: string;
  warnings?: string[];
  
  // Metrics
  executionTime?: number;
  tokensUsed?: number;
  toolCalls?: number;
  
  // Follow-up
  nextSteps?: string[];
  relatedSkills?: string[];
  
  // Feedback
  userFeedback?: {
    rating: number; // 1-5
    comment?: string;
    timestamp: Date;
  };
}

/**
 * Skill Curator Configuration
 * For autonomous skill management
 */
export interface SkillCuratorConfig {
  enabled: boolean;
  
  // Creation
  autoCreate: boolean;
  creationThreshold: number; // Minimum tool calls to trigger creation
  creationConfidence: number; // 0-1
  
  // Improvement
  autoImprove: boolean;
  improvementThreshold: number; // Minimum usage count
  improvementConfidence: number; // 0-1
  
  // Consolidation
  autoConsolidate: boolean;
  consolidationInterval: number; // Hours
  overlapThreshold: number; // 0-1
  
  // Archiving
  autoArchive: boolean;
  archiveInterval: number; // Days
  staleThreshold: number; // Days without use
  
  // Protection
  protectedSkills: string[]; // Skills that cannot be modified
  pinnedSkills: string[]; // Skills that are always loaded
}

/**
 * Skill Grade
 * For evaluating skill quality
 */
export interface SkillGrade {
  skillId: string;
  
  // Quality metrics
  clarity: number; // 0-10
  usefulness: number; // 0-10
  accuracy: number; // 0-10
  completeness: number; // 0-10
  
  // Usage metrics
  usageCount: number;
  successCount: number;
  failureCount: number;
  
  // Overall
  overallScore: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  
  // Feedback
  feedback: string[];
  suggestions: string[];
  
  // Metadata
  gradedAt: Date;
  gradedBy: string; // Agent ID or user ID
  version: string;
}

/**
 * Skill Version
 * For tracking skill versions
 */
export interface SkillVersion {
  skillId: string;
  version: string;
  changelog: string[];
  createdAt: Date;
  createdBy: string;
  isActive: boolean;
}

/**
 * Skill Dependency
 */
export interface SkillDependency {
  skillId: string;
  dependsOn: string[];
  type: 'required' | 'optional' | 'conflict';
  minVersion?: string;
  maxVersion?: string;
}

/**
 * Skill Trigger Configuration
 */
export interface SkillTriggerConfig {
  skillId: string;
  triggers: SkillTriggerConfigItem[];
}

export interface SkillTriggerConfigItem {
  type: SkillTrigger;
  pattern: string;
  priority: number;
  caseSensitive?: boolean;
  regex?: boolean;
}

/**
 * Skill Command
 * For slash command integration
 */
export interface SkillCommand {
  skillId: string;
  command: string;
  aliases: string[];
  description: string;
  category: string;
  argsHint?: string;
  handler: (args: string[]) => Promise<SkillExecutionResult>;
}

/**
 * Skill Library Configuration
 */
export interface SkillLibraryConfig {
  paths: string[]; // Paths to search for skills
  autoLoad: boolean;
  watch: boolean; // Watch for changes
  
  // Indexing
  indexEnabled: boolean;
  indexInterval: number; // Minutes
  
  // Curator
  curator: SkillCuratorConfig;
}

/**
 * Skill Index Entry
 * For fast skill lookup
 */
export interface SkillIndexEntry {
  skillId: string;
  name: string;
  category: SkillCategory;
  description: string;
  tags: string[];
  keywords: string[];
  triggers: string[];
  
  // For search
  searchableText: string;
  
  // Metadata
  path: string;
  modifiedAt: Date;
  size: number;
}

/**
 * Skill Execution Hook
 * For extending skill behavior
 */
export interface SkillHook {
  name: string;
  beforeExecute?: (context: SkillExecutionContext) => Promise<SkillExecutionContext>;
  afterExecute?: (context: SkillExecutionContext, result: SkillExecutionResult) => Promise<SkillExecutionResult>;
  onError?: (context: SkillExecutionContext, error: Error) => Promise<SkillExecutionResult>;
}

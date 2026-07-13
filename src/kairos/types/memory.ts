// Memory Type Definitions
// Inspired by Hermes' memory system with SQLite and FTS5

/**
 * Memory Types
 */
export type MemoryType = 
  | 'conversation'
  | 'user-profile'
  | 'agent-notes'
  | 'skills'
  | 'project-context'
  | 'lessons'
  | 'custom';

/**
 * Memory Entry
 * Basic unit of memory storage
 */
export interface MemoryEntry {
  id: string;
  type: MemoryType;
  key: string;
  value: any;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  tags?: string[];
  priority?: number;
}

/**
 * Conversation Memory
 * Stores conversation history and context
 */
export interface ConversationMemory {
  id: string;
  sessionId: string;
  userId?: string;
  messages: ConversationMessage[];
  summary?: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Conversation Message
 */
export interface ConversationMessage {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  toolCalls?: any[];
  toolResults?: any[];
  tokenCount?: number;
}

/**
 * User Profile
 * Stores user preferences and information
 */
export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  preferences: Record<string, any>;
  style?: {
    theme?: string;
    language?: string;
    timezone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Agent Notes
 * Agent-specific notes and learnings
 */
export interface AgentNotes {
  id: string;
  agentId: string;
  content: string;
  type: 'learning' | 'observation' | 'preference' | 'warning';
  context?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

/**
 * Memory Search Options
 */
export interface MemorySearchOptions {
  query: string;
  types?: MemoryType[];
  limit?: number;
  offset?: number;
  tags?: string[];
  fromDate?: Date;
  toDate?: Date;
  sortBy?: 'relevance' | 'date' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Memory Search Result
 */
export interface MemorySearchResult {
  entry: MemoryEntry | ConversationMemory | UserProfile | AgentNotes;
  score: number;
  type: MemoryType;
  highlights?: string[];
}

/**
 * Memory Provider Interface
 */
export interface MemoryProvider {
  id: string;
  name: string;
  type: 'sqlite' | 'vector' | 'file' | 'custom';
  
  // Connection
  connect(config: any): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  
  // CRUD operations
  create(entry: MemoryEntry): Promise<MemoryEntry>;
  read(id: string): Promise<MemoryEntry | null>;
  update(id: string, updates: Partial<MemoryEntry>): Promise<MemoryEntry>;
  delete(id: string): Promise<void>;
  
  // Search
  search(options: MemorySearchOptions): Promise<MemorySearchResult[]>;
  
  // Bulk operations
  bulkCreate(entries: MemoryEntry[]): Promise<MemoryEntry[]>;
  bulkDelete(ids: string[]): Promise<void>;
  
  // Management
  clear(type?: MemoryType): Promise<void>;
  stats(): Promise<MemoryStats>;
  optimize(): Promise<void>;
}

/**
 * Memory Statistics
 */
export interface MemoryStats {
  totalEntries: number;
  byType: Record<MemoryType, number>;
  storageSize: number;
  indexSize?: number;
  lastOptimized?: Date;
}

/**
 * SQLite Memory Configuration
 */
export interface SQLiteMemoryConfig {
  databasePath: string;
  enableFTS5?: boolean;
  enableSemanticSearch?: boolean;
  compression?: boolean;
  encryption?: boolean;
  encryptionKey?: string;
}

/**
 * Memory Compression Options
 */
export interface MemoryCompressionOptions {
  enabled: boolean;
  strategy: 'lz4' | 'zstd' | 'gzip';
  threshold: number; // Minimum size to compress
  maxSize: number; // Maximum compressed size
}

/**
 * Memory Index Configuration
 */
export interface MemoryIndexConfig {
  enabled: boolean;
  type: 'fts5' | 'vector' | 'both';
  fts5?: {
    tokenize: boolean;
    prefixSearch: boolean;
    highlight: boolean;
  };
  vector?: {
    model: string;
    dimensions: number;
    similarity: 'cosine' | 'euclidean' | 'dot';
  };
}

/**
 * Memory Context
 * Context for memory operations
 */
export interface MemoryContext {
  sessionId?: string;
  userId?: string;
  agentId?: string;
  conversationId?: string;
  workingDirectory?: string;
}

/**
 * Memory Hook
 * For extending memory behavior
 */
export interface MemoryHook {
  name: string;
  beforeCreate?: (entry: MemoryEntry, context: MemoryContext) => Promise<MemoryEntry>;
  afterCreate?: (entry: MemoryEntry, context: MemoryContext) => Promise<void>;
  beforeSearch?: (options: MemorySearchOptions, context: MemoryContext) => Promise<MemorySearchOptions>;
  afterSearch?: (results: MemorySearchResult[], options: MemorySearchOptions, context: MemoryContext) => Promise<MemorySearchResult[]>;
}

/**
 * Memory Cache Entry
 * For caching frequent memory queries
 */
export interface MemoryCacheEntry {
  key: string;
  value: any;
  ttl: number; // Time to live in milliseconds
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Memory Migration
 * For migrating memory data between versions
 */
export interface MemoryMigration {
  id: string;
  name: string;
  description: string;
  fromVersion: string;
  toVersion: string;
  run: () => Promise<void>;
}

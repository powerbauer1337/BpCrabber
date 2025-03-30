import { z } from 'zod';
import path from 'path';

// Constants
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_MAX_RETRIES = 1;
const DEFAULT_MAX_FILE_SIZE = '10MB';
const DEFAULT_MAX_EXECUTION_TIME = 300000;

// Server Types Enum
export enum ServerType {
  STDIO = 'stdio',
  SHARED_PROCESS = 'shared-process',
}

// Log Levels Enum
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

// Fallback Modes Enum
export enum FallbackMode {
  NONE = 'none',
  RETRY = 'retry',
  FALLBACK = 'fallback',
}

// Process Manager Types Enum
export enum ProcessManagerType {
  SHARED = 'shared',
  ISOLATED = 'isolated',
}

// Error Classes
export class McpConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpConfigError';
  }
}

export class McpServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'McpServerError';
  }
}

// MCP Server Configuration Schema
const McpServerSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  type: z.nativeEnum(ServerType).default(ServerType.STDIO),
  command: z.string().min(1, 'Command is required'),
  args: z.array(z.string()),
  env: z.record(z.string()).optional(),
  fallback: z
    .object({
      command: z.string().min(1, 'Fallback command is required'),
      args: z.array(z.string()),
      env: z.record(z.string()).optional(),
    })
    .optional(),
});

// MCP Server Type
export type McpServer = z.infer<typeof McpServerSchema>;

// Shell Server Type with enhanced validation
export interface ShellServer extends McpServer {
  env?: {
    ALLOWED_COMMANDS: string;
    MAX_EXECUTION_TIME: string;
  };
}

// Performance Settings Schema with enhanced validation
const PerformanceSettingsSchema = z.object({
  parallelInitialization: z.boolean(),
  maxConcurrentServers: z.number().min(1, 'Must have at least 1 concurrent server'),
  poolSize: z.number().min(1, 'Pool size must be at least 1'),
  singleInstance: z.boolean(),
  sharedProcessManager: z.boolean(),
});

// Process Manager Settings Schema with enhanced validation
const ProcessManagerSettingsSchema = z.object({
  enabled: z.boolean(),
  type: z.nativeEnum(ProcessManagerType),
  maxProcesses: z.number().min(1, 'Must have at least 1 process'),
  reuseProcesses: z.boolean(),
  preventNewWindows: z.boolean(),
  consolidateOutputs: z.boolean(),
});

// Security Settings Schema with enhanced validation
const SecuritySettingsSchema = z.object({
  tokenValidation: z.boolean(),
  commandWhitelist: z.boolean(),
  pathValidation: z.boolean(),
  maxFileSize: z.string().regex(/^\d+[KMG]B$/, 'Invalid file size format'),
  maxExecutionTime: z.number().min(1000, 'Execution time must be at least 1000ms'),
});

// MCP Settings Schema with enhanced validation
const McpSettingsSchema = z.object({
  logLevel: z.nativeEnum(LogLevel),
  fallbackMode: z.nativeEnum(FallbackMode),
  maxRetries: z.number().min(1, 'Must have at least 1 retry'),
  timeout: z.number().min(1000, 'Timeout must be at least 1000ms'),
  retryDelay: z.number().min(100, 'Retry delay must be at least 100ms'),
  validateConfig: z.boolean(),
  validateEnv: z.boolean(),
  workspaceRoot: z.string().min(1, 'Workspace root is required'),
  noSpawnCmd: z.boolean().optional(),
  hideConsole: z.boolean().optional(),
  detachedProcesses: z.boolean().optional(),
  singleProcess: z.boolean().optional(),
  performance: PerformanceSettingsSchema.optional(),
  processManager: ProcessManagerSettingsSchema.optional(),
  security: SecuritySettingsSchema,
});

// MCP Config Type
export interface MCPConfig {
  mcpServers: {
    [key: string]: McpServer | undefined;
  };
  settings: z.infer<typeof McpSettingsSchema>;
}

// Shared environment variables for shared-process servers
const sharedProcessEnv = {
  WORKSPACE_ROOT: '${WORKSPACE_ROOT}',
  NO_SPAWN_CMD: 'true',
  DETACHED: 'true',
  HIDE_CONSOLE: 'true',
  SINGLE_PROCESS: 'true',
};

// Consolidated MCP Server Configurations
export const mcpServers: Record<string, McpServer> = {
  // Core Services
  Core: {
    description: 'Core MCP server for essential services',
    type: ServerType.SHARED_PROCESS,
    command: 'npx',
    args: ['cursor-mcp-installer-free@latest', 'core'],
    env: sharedProcessEnv,
  },

  // Code Analysis and Generation
  codeAssistant: {
    description: 'Code analysis and assistance',
    type: ServerType.SHARED_PROCESS,
    command: 'npx',
    args: ['cursor-mcp-installer-free@latest', 'code-assistant'],
    env: { ...sharedProcessEnv, LOG_LEVEL: LogLevel.INFO },
    fallback: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-code-assistant'],
      env: { LOG_LEVEL: LogLevel.INFO },
    },
  },

  // File Operations
  fileOperations: {
    description: 'File management and monitoring',
    type: ServerType.SHARED_PROCESS,
    command: 'npx',
    args: ['cursor-mcp-installer-free@latest', 'files'],
    env: sharedProcessEnv,
  },

  // Version Control
  gitTools: {
    description: 'Version control and Git operations server',
    type: ServerType.STDIO,
    command: 'uvx',
    args: ['mcp-git-tools'],
    env: { LOG_LEVEL: LogLevel.INFO },
    fallback: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-git-tools'],
      env: { LOG_LEVEL: LogLevel.INFO },
    },
  },

  // Task Management
  taskManager: {
    description: 'Task management and workflow server',
    type: ServerType.STDIO,
    command: 'npx',
    args: ['-y', '@kazuph/mcp-taskmanager'],
    env: { LOG_LEVEL: LogLevel.INFO },
    fallback: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-task-manager'],
      env: { LOG_LEVEL: LogLevel.INFO },
    },
  },

  // Documentation
  documentation: {
    description: 'Documentation generation and management server',
    type: ServerType.STDIO,
    command: 'npx',
    args: ['-y', 'documentation-mcp-server'],
    env: { LOG_LEVEL: LogLevel.INFO },
    fallback: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-documentation'],
      env: { LOG_LEVEL: LogLevel.INFO },
    },
  },

  // Testing
  testRunner: {
    description: 'Test execution and reporting server',
    type: ServerType.STDIO,
    command: 'npx',
    args: ['-y', 'test-runner-mcp'],
    env: { LOG_LEVEL: LogLevel.INFO },
    fallback: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-test-runner'],
      env: { LOG_LEVEL: LogLevel.INFO },
    },
  },

  // Security
  securityScanner: {
    description: 'Security scanning and vulnerability detection server',
    type: ServerType.STDIO,
    command: 'npx',
    args: ['-y', 'security-scanner-mcp'],
    env: { LOG_LEVEL: LogLevel.INFO },
    fallback: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-security-scanner'],
      env: { LOG_LEVEL: LogLevel.INFO },
    },
  },

  // Performance
  performanceMonitor: {
    description: 'Performance monitoring and analysis server',
    type: ServerType.STDIO,
    command: 'npx',
    args: ['-y', 'performance-monitor-mcp'],
    env: { LOG_LEVEL: LogLevel.INFO },
    fallback: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-performance-monitor'],
      env: { LOG_LEVEL: LogLevel.INFO },
    },
  },

  // Knowledge Graph
  knowledgeGraph: {
    description: 'Knowledge graph and memory management server',
    type: ServerType.STDIO,
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    env: { LOG_LEVEL: LogLevel.INFO },
    fallback: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-knowledge-graph'],
      env: { LOG_LEVEL: LogLevel.INFO },
    },
  },

  // Sequential Thinking
  sequentialThinking: {
    description: 'Sequential thinking and reasoning server',
    type: ServerType.STDIO,
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    env: { LOG_LEVEL: LogLevel.INFO },
    fallback: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
      env: { LOG_LEVEL: LogLevel.INFO },
    },
  },
};

// Default MCP Settings
export const defaultSettings: MCPConfig['settings'] = {
  logLevel: LogLevel.ERROR,
  fallbackMode: FallbackMode.NONE,
  maxRetries: DEFAULT_MAX_RETRIES,
  timeout: DEFAULT_TIMEOUT,
  retryDelay: DEFAULT_RETRY_DELAY,
  validateConfig: true,
  validateEnv: true,
  workspaceRoot: process.cwd(),
  noSpawnCmd: true,
  hideConsole: true,
  detachedProcesses: true,
  singleProcess: true,
  performance: {
    parallelInitialization: false,
    maxConcurrentServers: 1,
    poolSize: 1,
    singleInstance: true,
    sharedProcessManager: true,
  },
  processManager: {
    enabled: true,
    type: ProcessManagerType.SHARED,
    maxProcesses: 1,
    reuseProcesses: true,
    preventNewWindows: true,
    consolidateOutputs: true,
  },
  security: {
    tokenValidation: true,
    commandWhitelist: true,
    pathValidation: true,
    maxFileSize: DEFAULT_MAX_FILE_SIZE,
    maxExecutionTime: DEFAULT_MAX_EXECUTION_TIME,
  },
};

// MCP Server Manager Class with enhanced error handling and validation
export class McpServerManager {
  private static instance: McpServerManager;
  private servers: Map<string, McpServer> = new Map();
  private settings: MCPConfig['settings'] = defaultSettings;
  private readonly configPath: string;

  private constructor() {
    this.configPath = path.join(process.cwd(), 'mcp.config.json');
  }

  static getInstance(): McpServerManager {
    if (!McpServerManager.instance) {
      McpServerManager.instance = new McpServerManager();
    }
    return McpServerManager.instance;
  }

  private validateServerName(name: string): void {
    if (!mcpServers[name]) {
      throw new McpConfigError(`Server ${name} not found in configuration`);
    }
  }

  async initializeServer(name: string): Promise<void> {
    try {
      this.validateServerName(name);
      const config = mcpServers[name];

      // Validate configuration
      McpServerSchema.parse(config);

      // Initialize server
      this.servers.set(name, config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new McpConfigError(`Invalid configuration for server ${name}: ${error.message}`);
      }
      throw error;
    }
  }

  async getServer(name: string): Promise<McpServer> {
    const server = this.servers.get(name);
    if (!server) {
      throw new McpServerError(`Server ${name} not initialized`);
    }
    return server;
  }

  async updateSettings(settings: Partial<MCPConfig['settings']>): Promise<void> {
    try {
      const updatedSettings = { ...this.settings, ...settings };
      McpSettingsSchema.parse(updatedSettings);
      this.settings = updatedSettings;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new McpConfigError(`Invalid settings: ${error.message}`);
      }
      throw error;
    }
  }

  getSettings(): MCPConfig['settings'] {
    return { ...this.settings };
  }

  async shutdownServer(name: string): Promise<void> {
    try {
      this.validateServerName(name);
      const server = this.servers.get(name);
      if (server) {
        // Perform cleanup if needed
        this.servers.delete(name);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new McpServerError(`Failed to shutdown server ${name}: ${errorMessage}`);
    }
  }

  async shutdownAll(): Promise<void> {
    const errors: Error[] = [];
    for (const name of this.servers.keys()) {
      try {
        await this.shutdownServer(name);
      } catch (error: unknown) {
        if (error instanceof Error) {
          errors.push(error);
        }
      }
    }
    if (errors.length > 0) {
      throw new McpServerError(
        `Failed to shutdown all servers: ${errors.map(e => e.message).join(', ')}`
      );
    }
  }

  // New methods for configuration management
  async saveConfig(): Promise<void> {
    try {
      const config: MCPConfig = {
        mcpServers: Object.fromEntries(this.servers),
        settings: this.settings,
      };
      await McpSettingsSchema.parseAsync(config.settings);
      // Save config implementation here
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new McpConfigError(`Failed to save configuration: ${errorMessage}`);
    }
  }

  async loadConfig(): Promise<void> {
    try {
      // Load config implementation here
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new McpConfigError(`Failed to load configuration: ${errorMessage}`);
    }
  }
}

// Export singleton instance
export const mcpManager = McpServerManager.getInstance();

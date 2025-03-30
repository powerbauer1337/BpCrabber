import { z } from 'zod';
import path from 'path';

// Constants
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRY_DELAY = 1000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_MAX_FILE_SIZE = '100MB';
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

// Add new server mode enum
export enum ServerMode {
  STANDARD = 'standard',
  LIGHTWEIGHT = 'lightweight',
  DEVELOPMENT = 'development',
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
  mode: z.nativeEnum(ServerMode).default(ServerMode.STANDARD),
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
  dynamicLoading: z
    .object({
      enabled: z.boolean(),
      sourcePath: z.string().optional(),
      watchForChanges: z.boolean().optional(),
      hotReload: z.boolean().optional(),
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
  core: {
    description: 'Core MCP functionality and service coordination',
    type: ServerType.SHARED_PROCESS,
    mode: ServerMode.STANDARD,
    command: 'npx',
    args: ['cursor-mcp-installer-free@latest', 'core'],
    env: {
      ...sharedProcessEnv,
      LOG_LEVEL: LogLevel.INFO,
      MAX_MEMORY: '256MB',
      STARTUP_TIMEOUT: '30000',
    },
  },

  codeAssistant: {
    description: 'Intelligent code analysis and assistance',
    type: ServerType.SHARED_PROCESS,
    mode: ServerMode.STANDARD,
    command: 'npx',
    args: ['cursor-mcp-installer-free@latest', 'code-assistant'],
    env: {
      ...sharedProcessEnv,
      LOG_LEVEL: LogLevel.INFO,
      MAX_MEMORY: '512MB',
      ANALYSIS_TIMEOUT: '30000',
      CACHE_SIZE: '100MB',
    },
  },

  fileOperations: {
    description: 'File system operations and monitoring',
    type: ServerType.SHARED_PROCESS,
    mode: ServerMode.STANDARD,
    command: 'npx',
    args: ['cursor-mcp-installer-free@latest', 'files'],
    env: {
      ...sharedProcessEnv,
      WATCH_IGNORE: 'node_modules,dist,build,.git,.cache,temp',
      MAX_FILE_SIZE: '100MB',
      WATCH_INTERVAL: '1000',
    },
  },

  shellServer: {
    description: 'Terminal and command execution',
    type: ServerType.SHARED_PROCESS,
    mode: ServerMode.STANDARD,
    command: 'npx',
    args: ['cursor-mcp-installer-free@latest', 'shell'],
    env: {
      ...sharedProcessEnv,
      ALLOWED_COMMANDS:
        'git,npm,node,npx,yarn,pnpm,python,pip,powershell,cmd,docker,docker-compose',
      MAX_EXECUTION_TIME: '300000',
      MAX_OUTPUT_SIZE: '10MB',
    },
  },

  languageServer: {
    description: 'Language server protocol support',
    type: ServerType.SHARED_PROCESS,
    mode: ServerMode.STANDARD,
    command: 'npx',
    args: ['cursor-mcp-installer-free@latest', 'lsp'],
    env: {
      ...sharedProcessEnv,
      LSP_TIMEOUT: '30000',
      SUPPORTED_LANGUAGES: 'javascript,typescript,python,json,markdown,html,css,sql,shell',
      CACHE_SIZE: '200MB',
    },
  },

  gitServer: {
    description: 'Git operations and version control',
    type: ServerType.SHARED_PROCESS,
    mode: ServerMode.STANDARD,
    command: 'npx',
    args: ['cursor-mcp-installer-free@latest', 'git'],
    env: {
      ...sharedProcessEnv,
      OPERATION_TIMEOUT: '30000',
      MAX_HISTORY_SIZE: '1000',
      CACHE_SIZE: '50MB',
    },
  },

  debugServer: {
    description: 'Debugging and profiling support',
    type: ServerType.SHARED_PROCESS,
    mode: ServerMode.STANDARD,
    command: 'npx',
    args: ['cursor-mcp-installer-free@latest', 'debug'],
    env: {
      ...sharedProcessEnv,
      DEBUG_PORT: '9229',
      PROFILE_INTERVAL: '1000',
      MAX_PROFILE_SIZE: '100MB',
    },
  },

  testServer: {
    description: 'Test execution and coverage',
    type: ServerType.STDIO,
    mode: ServerMode.STANDARD,
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-test-runner'],
    env: {
      LOG_LEVEL: LogLevel.INFO,
      TEST_TIMEOUT: '60000',
      MAX_COVERAGE_SIZE: '50MB',
      HISTORY_SIZE: '100',
    },
  },

  documentationServer: {
    description: 'Documentation generation and management',
    type: ServerType.STDIO,
    mode: ServerMode.STANDARD,
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-documentation'],
    env: {
      LOG_LEVEL: LogLevel.INFO,
      OUTPUT_FORMAT: 'markdown,html',
      MAX_FILE_SIZE: '10MB',
      CACHE_SIZE: '50MB',
    },
  },

  databaseServer: {
    description: 'Database operations and management',
    type: ServerType.STDIO,
    mode: ServerMode.STANDARD,
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-database'],
    env: {
      LOG_LEVEL: LogLevel.INFO,
      QUERY_TIMEOUT: '30000',
      MAX_CONNECTIONS: '10',
      POOL_SIZE: '5',
    },
  },

  searchServer: {
    description: 'Enhanced code and content search with semantic capabilities',
    type: ServerType.STDIO,
    mode: ServerMode.STANDARD,
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-search'],
    env: {
      LOG_LEVEL: LogLevel.INFO,
      INDEX_SIZE: '500MB',
      MAX_RESULTS: '1000',
      UPDATE_INTERVAL: '300000',
      SEMANTIC_SEARCH: 'true',
      FUZZY_MATCHING: 'true',
      LANGUAGE_DETECTION: 'true',
      CACHE_TTL: '3600',
    },
  },

  nextjsServer: {
    description: 'Next.js build error handling and optimization',
    type: ServerType.SHARED_PROCESS,
    mode: ServerMode.STANDARD,
    command: 'npx',
    args: ['cursor-mcp-installer-free@latest', 'nextjs'],
    env: {
      ...sharedProcessEnv,
      LOG_LEVEL: LogLevel.INFO,
      BUILD_ERROR_TIMEOUT: '30000',
      MAX_MEMORY: '512MB',
      CACHE_SIZE: '200MB',
      AUTO_FIX_ENABLED: 'true',
      ERROR_AGGREGATION: 'true',
      ERROR_REPORTING_INTERVAL: '5000',
      SUPPORTED_FEATURES:
        'build-errors,config-validation,performance-monitoring,auto-fix,error-aggregation',
    },
  },

  buildOptimizer: {
    description: 'Build optimization and caching server',
    type: ServerType.SHARED_PROCESS,
    mode: ServerMode.STANDARD,
    command: 'npx',
    args: ['cursor-mcp-installer-free@latest', 'build-optimizer'],
    env: {
      ...sharedProcessEnv,
      LOG_LEVEL: LogLevel.INFO,
      CACHE_DIR: '${WORKSPACE_ROOT}/.build-cache',
      MAX_CACHE_SIZE: '1GB',
      OPTIMIZATION_LEVEL: 'aggressive',
      PARALLEL_BUILDS: 'true',
      INCREMENTAL_BUILDS: 'true',
    },
  },

  configManager: {
    description: 'Dynamic configuration management server',
    type: ServerType.SHARED_PROCESS,
    mode: ServerMode.STANDARD,
    command: 'npx',
    args: ['cursor-mcp-installer-free@latest', 'config-manager'],
    env: {
      ...sharedProcessEnv,
      LOG_LEVEL: LogLevel.INFO,
      CONFIG_WATCH_INTERVAL: '1000',
      HOT_RELOAD: 'true',
      BACKUP_ENABLED: 'true',
      VALIDATION_MODE: 'strict',
      SCHEMA_PATH: '${WORKSPACE_ROOT}/config/schemas',
    },
  },

  lightweightDev: {
    description: 'Lightweight development MCP server',
    type: ServerType.STDIO,
    mode: ServerMode.LIGHTWEIGHT,
    command: 'npx',
    args: ['ts-node'],
    env: {
      LOG_LEVEL: LogLevel.DEBUG,
      NODE_ENV: 'development',
      HOT_RELOAD: 'true',
      WATCH_MODE: 'true',
    },
    dynamicLoading: {
      enabled: true,
      sourcePath: '${WORKSPACE_ROOT}/src/mcp/lightweight.ts',
      watchForChanges: true,
      hotReload: true,
    },
  },

  errorHandler: {
    description: 'Enhanced error handling and reporting server',
    type: ServerType.SHARED_PROCESS,
    mode: ServerMode.STANDARD,
    command: 'npx',
    args: ['cursor-mcp-installer-free@latest', 'error-handler'],
    env: {
      ...sharedProcessEnv,
      LOG_LEVEL: LogLevel.INFO,
      ERROR_TRACKING: 'true',
      NOTIFICATION_MODE: 'immediate',
      AGGREGATION_INTERVAL: '5000',
      MAX_ERROR_HISTORY: '1000',
      ALERT_THRESHOLD: '10',
    },
  },

  performanceMonitor: {
    description: 'Real-time performance monitoring and optimization',
    type: ServerType.SHARED_PROCESS,
    mode: ServerMode.STANDARD,
    command: 'npx',
    args: ['cursor-mcp-installer-free@latest', 'perf-monitor'],
    env: {
      ...sharedProcessEnv,
      LOG_LEVEL: LogLevel.INFO,
      METRICS_INTERVAL: '1000',
      PROFILING_ENABLED: 'true',
      HEAP_SNAPSHOT_INTERVAL: '3600000',
      ALERT_CPU_THRESHOLD: '80',
      ALERT_MEMORY_THRESHOLD: '85',
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
    parallelInitialization: true,
    maxConcurrentServers: 4,
    poolSize: 2,
    singleInstance: true,
    sharedProcessManager: true,
  },
  processManager: {
    enabled: true,
    type: ProcessManagerType.SHARED,
    maxProcesses: 4,
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

  async loadDynamicServer(serverPath: string): Promise<void> {
    try {
      const serverModule = await import(serverPath);
      const serverConfig = serverModule.default;

      if (!serverConfig) {
        throw new McpConfigError(`No default export found in ${serverPath}`);
      }

      // Validate the dynamic server configuration
      McpServerSchema.parse(serverConfig);

      // Add to servers map
      const serverName = path.basename(serverPath, '.ts');
      this.servers.set(serverName, serverConfig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new McpConfigError(`Invalid dynamic server configuration: ${error.message}`);
      }
      throw error;
    }
  }

  async watchDynamicServer(serverPath: string): Promise<void> {
    // Implementation for watching dynamic server changes
    // This would typically use fs.watch or chokidar
    // and reload the server when changes are detected
    const _path = serverPath; // Acknowledge the parameter to satisfy linter
  }
}

// Export singleton instance
export const mcpManager = McpServerManager.getInstance();

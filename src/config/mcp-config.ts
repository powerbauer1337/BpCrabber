import { z } from 'zod';

// MCP Server Configuration Schema
const McpServerSchema = z.object({
  description: z.string(),
  type: z.string(),
  command: z.string(),
  args: z.array(z.string()),
  env: z.record(z.string()).optional(),
  fallback: z
    .object({
      command: z.string(),
      args: z.array(z.string()),
      env: z.record(z.string()).optional(),
    })
    .optional(),
});

// MCP Server Type
export type McpServer = z.infer<typeof McpServerSchema>;

// Shell Server Type
export interface ShellServer extends McpServer {
  env?: {
    ALLOWED_COMMANDS: string;
    MAX_EXECUTION_TIME: string;
  };
}

// MCP Config Type
export interface MCPConfig {
  mcpServers: {
    Shell?: ShellServer;
    [key: string]: McpServer | undefined;
  };
  settings: {
    logLevel: string;
    fallbackMode: string;
    maxRetries: number;
    timeout: number;
    retryDelay: number;
    validateConfig: boolean;
    validateEnv: boolean;
    workspaceRoot: string;
    security: {
      tokenValidation: boolean;
      commandWhitelist: boolean;
      pathValidation: boolean;
      maxFileSize: string;
      maxExecutionTime: number;
    };
  };
}

// MCP Server Configurations
export const mcpServers: Record<string, McpServer> = {
  // Code Analysis and Generation
  codeAssistant: {
    description: 'Code analysis and generation server',
    type: 'stdio',
    command: 'uvx',
    args: ['code-assistant', 'server'],
    env: {
      LOG_LEVEL: 'info',
    },
    fallback: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-code-assistant'],
      env: {
        LOG_LEVEL: 'info',
      },
    },
  },

  // Version Control
  gitTools: {
    description: 'Version control and Git operations server',
    type: 'stdio',
    command: 'uvx',
    args: ['mcp-git-tools'],
    env: {
      LOG_LEVEL: 'info',
    },
    fallback: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-git-tools'],
      env: {
        LOG_LEVEL: 'info',
      },
    },
  },

  // Task Management
  taskManager: {
    description: 'Task management and workflow server',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@kazuph/mcp-taskmanager'],
    env: {
      LOG_LEVEL: 'info',
    },
    fallback: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-task-manager'],
      env: {
        LOG_LEVEL: 'info',
      },
    },
  },

  // Documentation
  documentation: {
    description: 'Documentation generation and management server',
    type: 'stdio',
    command: 'npx',
    args: ['-y', 'documentation-mcp-server'],
    env: {
      LOG_LEVEL: 'info',
    },
    fallback: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-documentation'],
      env: {
        LOG_LEVEL: 'info',
      },
    },
  },

  // Testing
  testRunner: {
    description: 'Test execution and reporting server',
    type: 'stdio',
    command: 'npx',
    args: ['-y', 'test-runner-mcp'],
    env: {
      LOG_LEVEL: 'info',
    },
    fallback: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-test-runner'],
      env: {
        LOG_LEVEL: 'info',
      },
    },
  },

  // Security
  securityScanner: {
    description: 'Security scanning and vulnerability detection server',
    type: 'stdio',
    command: 'npx',
    args: ['-y', 'security-scanner-mcp'],
    env: {
      LOG_LEVEL: 'info',
    },
    fallback: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-security-scanner'],
      env: {
        LOG_LEVEL: 'info',
      },
    },
  },

  // Performance
  performanceMonitor: {
    description: 'Performance monitoring and analysis server',
    type: 'stdio',
    command: 'npx',
    args: ['-y', 'performance-monitor-mcp'],
    env: {
      LOG_LEVEL: 'info',
    },
    fallback: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-performance-monitor'],
      env: {
        LOG_LEVEL: 'info',
      },
    },
  },

  // Knowledge Graph
  knowledgeGraph: {
    description: 'Knowledge graph and memory management server',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-memory'],
    env: {
      LOG_LEVEL: 'info',
    },
    fallback: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-knowledge-graph'],
      env: {
        LOG_LEVEL: 'info',
      },
    },
  },

  // Sequential Thinking
  sequentialThinking: {
    description: 'Sequential thinking and reasoning server',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
    env: {
      LOG_LEVEL: 'info',
    },
    fallback: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sequential-thinking'],
      env: {
        LOG_LEVEL: 'info',
      },
    },
  },
};

// MCP Server Manager Class
export class McpServerManager {
  private static instance: McpServerManager;
  private servers: Map<string, McpServer> = new Map();

  private constructor() {}

  static getInstance(): McpServerManager {
    if (!McpServerManager.instance) {
      McpServerManager.instance = new McpServerManager();
    }
    return McpServerManager.instance;
  }

  async initializeServer(name: string): Promise<void> {
    const config = mcpServers[name];
    if (!config) {
      throw new Error(`Server ${name} not found in configuration`);
    }

    try {
      // Validate configuration
      McpServerSchema.parse(config);

      // Initialize server
      this.servers.set(name, config);
    } catch (error) {
      console.error(`Failed to initialize server ${name}:`, error);
      throw error;
    }
  }

  async getServer(name: string): Promise<McpServer> {
    const server = this.servers.get(name);
    if (!server) {
      throw new Error(`Server ${name} not initialized`);
    }
    return server;
  }

  async shutdownServer(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (server) {
      this.servers.delete(name);
    }
  }

  async shutdownAll(): Promise<void> {
    for (const name of this.servers.keys()) {
      await this.shutdownServer(name);
    }
  }
}

// Export singleton instance
export const mcpManager = McpServerManager.getInstance();

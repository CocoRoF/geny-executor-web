/* Tool store — tool management state */
import { create } from "zustand";
import type {
  MCPServer,
  ToolInfo,
  ToolPreset,
  ToolScope,
  ToolTestResult,
} from "../types/editor";
import * as api from "../api/toolManager";

interface ToolStoreState {
  // Tools
  tools: ToolInfo[];
  toolsLoading: boolean;
  loadTools: (sessionId: string) => Promise<void>;

  // CRUD
  createAdhocTool: (
    sessionId: string,
    def: Record<string, unknown>
  ) => Promise<ToolInfo>;
  deleteTool: (sessionId: string, name: string) => Promise<void>;
  testTool: (
    sessionId: string,
    name: string,
    input: Record<string, unknown>
  ) => Promise<ToolTestResult>;

  // Presets
  presets: ToolPreset[];
  loadPresets: (sessionId: string) => Promise<void>;
  applyPreset: (sessionId: string, name: string) => Promise<void>;

  // MCP
  mcpServers: MCPServer[];
  loadMCPServers: (sessionId: string) => Promise<void>;
  connectMCP: (
    sessionId: string,
    config: Record<string, unknown>
  ) => Promise<MCPServer>;
  disconnectMCP: (sessionId: string, name: string) => Promise<void>;

  // Scope
  scope: ToolScope | null;
  loadScope: (sessionId: string) => Promise<void>;
  updateScope: (
    sessionId: string,
    scope: Partial<ToolScope>
  ) => Promise<void>;
}

export const useToolStore = create<ToolStoreState>((set, get) => ({
  tools: [],
  toolsLoading: false,

  loadTools: async (sessionId) => {
    set({ toolsLoading: true });
    try {
      const tools = await api.fetchTools(sessionId);
      set({ tools });
    } finally {
      set({ toolsLoading: false });
    }
  },

  createAdhocTool: async (sessionId, def) => {
    const tool = await api.createAdhocTool(sessionId, def);
    await get().loadTools(sessionId);
    return tool;
  },

  deleteTool: async (sessionId, name) => {
    await api.deleteTool(sessionId, name);
    await get().loadTools(sessionId);
  },

  testTool: async (sessionId, name, input) => {
    return api.testTool(sessionId, name, input);
  },

  presets: [],

  loadPresets: async (sessionId) => {
    const presets = await api.fetchToolPresets(sessionId);
    set({ presets });
  },

  applyPreset: async (sessionId, name) => {
    await api.applyToolPreset(sessionId, name);
    await get().loadTools(sessionId);
  },

  mcpServers: [],

  loadMCPServers: async (sessionId) => {
    const servers = await api.fetchMCPServers(sessionId);
    set({ mcpServers: servers });
  },

  connectMCP: async (sessionId, config) => {
    const server = await api.connectMCPServer(sessionId, config);
    await get().loadMCPServers(sessionId);
    await get().loadTools(sessionId);
    return server;
  },

  disconnectMCP: async (sessionId, name) => {
    await api.disconnectMCPServer(sessionId, name);
    await get().loadMCPServers(sessionId);
    await get().loadTools(sessionId);
  },

  scope: null,

  loadScope: async (sessionId) => {
    const scope = await api.fetchToolScope(sessionId);
    set({ scope });
  },

  updateScope: async (sessionId, scopeUpdate) => {
    const scope = await api.updateToolScope(sessionId, scopeUpdate);
    set({ scope });
  },
}));

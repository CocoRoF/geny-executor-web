import { create } from "zustand";
import type { SessionInfo, CreateSessionRequest } from "../types/session";
import {
  createSession as apiCreateSession,
  fetchSessions,
  deleteSession as apiDeleteSession,
  fetchConfig,
} from "../api/session";
import { useUIStore } from "./uiStore";

interface SessionStore {
  sessions: SessionInfo[];
  activeSessionId: string | null;
  serverHasApiKey: boolean;
  loading: boolean;
  error: string | null;
  checkConfig: () => Promise<void>;
  createSession: (req: CreateSessionRequest) => Promise<string>;
  loadSessions: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setActiveSession: (id: string | null) => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  serverHasApiKey: false,
  loading: false,
  error: null,

  checkConfig: async () => {
    try {
      const { api_key_configured } = await fetchConfig();
      set({ serverHasApiKey: api_key_configured });
    } catch {
      // ignore — serverHasApiKey stays false, user must provide key manually
    }
  },

  createSession: async (req) => {
    const engine = useUIStore.getState().engine;
    set({ loading: true, error: null });
    try {
      const { session_id } = await apiCreateSession({ ...req, engine });
      set({ activeSessionId: session_id, loading: false });
      await get().loadSessions();
      return session_id;
    } catch (e) {
      set({ error: (e as Error).message, loading: false });
      throw e;
    }
  },

  loadSessions: async () => {
    try {
      const sessions = await fetchSessions();
      set({ sessions });
    } catch (e) {
      set({ error: (e as Error).message });
    }
  },

  deleteSession: async (id) => {
    await apiDeleteSession(id);
    const state = get();
    if (state.activeSessionId === id) {
      set({ activeSessionId: null });
    }
    await state.loadSessions();
  },

  setActiveSession: (id) => set({ activeSessionId: id }),
}));

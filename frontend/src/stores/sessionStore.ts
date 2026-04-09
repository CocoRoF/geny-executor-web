import { create } from "zustand";
import type { SessionInfo, CreateSessionRequest } from "../types/session";
import {
  createSession as apiCreateSession,
  fetchSessions,
  deleteSession as apiDeleteSession,
} from "../api/session";

interface SessionStore {
  sessions: SessionInfo[];
  activeSessionId: string | null;
  loading: boolean;
  error: string | null;
  createSession: (req: CreateSessionRequest) => Promise<string>;
  loadSessions: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setActiveSession: (id: string | null) => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  loading: false,
  error: null,

  createSession: async (req) => {
    set({ loading: true, error: null });
    try {
      const { session_id } = await apiCreateSession(req);
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

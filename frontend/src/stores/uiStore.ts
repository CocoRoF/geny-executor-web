import { create } from "zustand";

export type Locale = "en" | "ko";
export type Engine = "executor" | "harness";

interface UIStore {
  darkMode: boolean;
  locale: Locale;
  engine: Engine;
  selectedStageOrder: number | null;
  sidebarOpen: boolean;
  apiKeyModalOpen: boolean;
  codeViewOpen: boolean;
  toggleDarkMode: () => void;
  setLocale: (l: Locale) => void;
  setEngine: (e: Engine) => void;
  selectStage: (order: number | null) => void;
  setSidebarOpen: (v: boolean) => void;
  setApiKeyModalOpen: (v: boolean) => void;
  setCodeViewOpen: (v: boolean) => void;
}

const getInitialDarkMode = () => {
  if (typeof window === "undefined") return false;
  const saved = localStorage.getItem("darkMode");
  if (saved !== null) return saved === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

const getInitialLocale = (): Locale => {
  if (typeof window === "undefined") return "en";
  return (localStorage.getItem("locale") as Locale) ?? "en";
};

const getInitialEngine = (): Engine => {
  if (typeof window === "undefined") return "executor";
  return (localStorage.getItem("engine") as Engine) ?? "executor";
};

export const useUIStore = create<UIStore>((set) => ({
  darkMode: getInitialDarkMode(),
  locale: getInitialLocale(),
  engine: getInitialEngine(),
  selectedStageOrder: null,
  sidebarOpen: true,
  apiKeyModalOpen: false,
  codeViewOpen: false,

  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      localStorage.setItem("darkMode", String(next));
      document.documentElement.classList.toggle("dark", next);
      return { darkMode: next };
    }),

  setLocale: (l) => {
    localStorage.setItem("locale", l);
    set({ locale: l });
  },

  setEngine: (e) => {
    localStorage.setItem("engine", e);
    set({ engine: e });
  },

  selectStage: (order) => set({ selectedStageOrder: order }),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setApiKeyModalOpen: (v) => set({ apiKeyModalOpen: v }),
  setCodeViewOpen: (v) => set({ codeViewOpen: v }),
}));

import { create } from "zustand";

export type Locale = "en" | "ko";

interface UIStore {
  darkMode: boolean;
  locale: Locale;
  selectedStageOrder: number | null;
  sidebarOpen: boolean;
  apiKeyModalOpen: boolean;
  toggleDarkMode: () => void;
  setLocale: (l: Locale) => void;
  selectStage: (order: number | null) => void;
  setSidebarOpen: (v: boolean) => void;
  setApiKeyModalOpen: (v: boolean) => void;
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

export const useUIStore = create<UIStore>((set) => ({
  darkMode: getInitialDarkMode(),
  locale: getInitialLocale(),
  selectedStageOrder: null,
  sidebarOpen: true,
  apiKeyModalOpen: false,

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

  selectStage: (order) => set({ selectedStageOrder: order }),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  setApiKeyModalOpen: (v) => set({ apiKeyModalOpen: v }),
}));

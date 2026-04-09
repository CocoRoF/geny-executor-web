import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ingress: { light: "#3b82f6", dark: "#60a5fa" },
        preflight: { light: "#f59e0b", dark: "#fbbf24" },
        execution: { light: "#8b5cf6", dark: "#a78bfa" },
        decision: { light: "#10b981", dark: "#34d399" },
        egress: { light: "#f43f5e", dark: "#fb7185" },
      },
      animation: {
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;

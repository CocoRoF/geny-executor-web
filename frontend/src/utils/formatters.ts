export function formatCost(usd: number): string {
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(6)}`;
  return `$${usd.toFixed(4)}`;
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatTimestamp(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    } as Intl.DateTimeFormatOptions);
  } catch {
    return iso;
  }
}

export function getEventTypeColor(type: string): string {
  if (type.startsWith("pipeline.complete")) return "text-green-600 dark:text-green-400";
  if (type.startsWith("pipeline.error")) return "text-red-600 dark:text-red-400";
  if (type.startsWith("pipeline")) return "text-purple-600 dark:text-purple-400";
  if (type === "stage.enter") return "text-blue-600 dark:text-blue-400";
  if (type === "stage.exit") return "text-green-600 dark:text-green-400";
  if (type === "stage.bypass") return "text-gray-500 dark:text-gray-500";
  if (type === "stage.error") return "text-red-600 dark:text-red-400";
  if (type.startsWith("api")) return "text-amber-600 dark:text-amber-400";
  if (type.startsWith("tool")) return "text-cyan-600 dark:text-cyan-400";
  if (type.startsWith("loop")) return "text-emerald-600 dark:text-emerald-400";
  if (type.startsWith("guard")) return "text-orange-600 dark:text-orange-400";
  if (type.startsWith("think")) return "text-violet-600 dark:text-violet-400";
  return "text-gray-600 dark:text-gray-400";
}

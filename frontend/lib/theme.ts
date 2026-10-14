/**
 * Theme helpers: one place that maps domain concepts (severity, cloud
 * provider) to the design tokens defined in src/index.css.
 *
 * - *Class maps* hold complete Tailwind class strings (required so Tailwind
 *   can detect them at build time; never build class names dynamically).
 * - *Var maps* hold CSS variables for places that need raw colours, such as
 *   Recharts/ECharts series.
 */

export const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const severityLabel: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

/** Badge styling: tinted background, coloured text, soft border. */
export const severityBadgeClass: Record<Severity, string> = {
  critical: "bg-severity-critical-soft text-severity-critical border-severity-critical/30",
  high: "bg-severity-high-soft text-severity-high border-severity-high/30",
  medium: "bg-severity-medium-soft text-severity-medium border-severity-medium/30",
  low: "bg-severity-low-soft text-severity-low border-severity-low/30",
  info: "bg-severity-info-soft text-severity-info border-severity-info/30",
};

/** Solid colour for dots, bars and chart series. */
export const severityVar: Record<Severity, string> = {
  critical: "var(--severity-critical)",
  high: "var(--severity-high)",
  medium: "var(--severity-medium)",
  low: "var(--severity-low)",
  info: "var(--severity-info)",
};

/** Numeric ordering, handy for sorting incidents (higher = worse). */
export const severityRank: Record<Severity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
  info: 0,
};

export const CLOUDS = ["aws", "azure"] as const;
export type Cloud = (typeof CLOUDS)[number];

export const cloudLabel: Record<Cloud, string> = {
  aws: "AWS",
  azure: "Azure",
};

export const cloudBadgeClass: Record<Cloud, string> = {
  aws: "bg-aws/15 text-aws border-aws/30",
  azure: "bg-azure/15 text-azure border-azure/30",
};

export const cloudVar: Record<Cloud, string> = {
  aws: "var(--provider-aws)",
  azure: "var(--provider-azure)",
};

/** MITRE heatmap cell colour by detection count. */
export function heatVar(count: number, max: number): string {
  if (count <= 0 || max <= 0) return "var(--heat-0)";
  const ratio = count / max;
  if (ratio > 0.75) return "var(--heat-4)";
  if (ratio > 0.5) return "var(--heat-3)";
  if (ratio > 0.25) return "var(--heat-2)";
  return "var(--heat-1)";
}

export type Theme = "dark" | "light";

/** Apply and persist the theme (call once on app start and on toggle). */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem("cloudsentinel-theme", theme);
  } catch {
    /* storage unavailable: ignore */
  }
}

export function loadTheme(): Theme {
  try {
    return localStorage.getItem("cloudsentinel-theme") === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}
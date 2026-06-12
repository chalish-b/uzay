// Semantic color tokens for the interactive demos. Every demo pulls from this
// small palette (via the t() helper from use-demo-scene) so the whole docs
// site stays visually coherent. Values are picked to sit well on the dusk
// fumadocs theme: indigo primary, teal secondary, rose accent, zinc neutrals.
export type DemoMode = "light" | "dark";

export type DemoTokens = {
  // Scaffolding. Canvas-bound tokens must be plain hex/rgb: three.js colors
  // have no alpha channel (it gets dropped with a warning), transparency goes
  // through a separate opacity field instead, hence gridOpacity. Axis tick
  // labels (axes2d) are DOM: theme them with labelClassName like overlays,
  // they need no token here.
  grid: string;
  gridOpacity: number;
  axes: string;
  // Series roles
  primary: string; // the main curve/object of the demo
  secondary: string; // a second, derived or contrasting series
  accent: string; // highlighted/draggable handles
  neutral: string; // projections, helper lines
  point: string; // plain points without a series role
};

// Reusable class strings for overlay items (overlay2d/overlay3d). Overlays
// are real DOM elements, so unlike canvas colors they need no atoms: fd-*
// tokens and dark: variants theme them through CSS. Compose extras with a
// template string: `${overlayStyles.label} mt-2`. Add variants as demos need
// them, not in advance.
export const overlayStyles = {
  // Floating value readout attached to a scene item.
  label:
    "pointer-events-none rounded-md border border-fd-border bg-fd-popover/90 px-2 py-1 text-xs text-fd-popover-foreground shadow-lg",
};

export const demoTokens: Record<DemoMode, DemoTokens> = {
  light: {
    grid: "#3f3f46",
    gridOpacity: 0.14,
    axes: "#52525b",
    primary: "#5b5bd6",
    secondary: "#0e8c7f",
    accent: "#c8537c",
    neutral: "#71717a",
    point: "#27272a",
  },
  dark: {
    grid: "#e4e4e7",
    gridOpacity: 0.12,
    axes: "#a1a1aa",
    primary: "#8e8efb",
    secondary: "#34d3c2",
    accent: "#e289ab",
    neutral: "#a1a1aa",
    point: "#fafafa",
  },
};

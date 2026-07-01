// A CSS color string or a hex number, e.g. "#e2725b" or 0xe2725b. The common
// subset every render backend understands.
export type Color = string | number;

const warnedRgbaColors = new Set<string>();

export function warnIfRgbaColor(
  color: Color,
  context: string
) {
  if (typeof color !== "string" || !color.trimStart().toLowerCase().startsWith("rgba(")) {
    return;
  }

  const key = `${context}:${color}`;
  if (warnedRgbaColors.has(key)) return;
  warnedRgbaColors.add(key);

  console.warn(
    `[Uzay] ${context} received an rgba() color. ` +
      `Three.js colors do not include alpha; use rgb() or another ColorRepresentation ` +
      `for color, and use the item's opacity field for transparency.`
  );
}

export function checkedColor(color: Color, context: string): Color {
  warnIfRgbaColor(color, context);
  return color;
}

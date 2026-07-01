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
      `Item colors do not carry alpha on any render backend; use rgb() or a hex ` +
      `value for color, and use the item's opacity field for transparency.`
  );
}

export function checkedColor(color: Color, context: string): Color {
  warnIfRgbaColor(color, context);
  return color;
}

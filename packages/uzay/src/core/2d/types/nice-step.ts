export const DEFAULT_AUTO_STEP_SPACING_PX = 56;

export function getNiceStep(
  worldPerPixel: number,
  targetSpacingPx: number = DEFAULT_AUTO_STEP_SPACING_PX
): number {
  if (worldPerPixel <= 0 || targetSpacingPx <= 0) return 1;

  const rawStep = worldPerPixel * targetSpacingPx;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const nice =
    normalized <= 1.5 ? 1 : normalized <= 3 ? 2 : normalized <= 7 ? 5 : 10;

  return nice * magnitude;
}

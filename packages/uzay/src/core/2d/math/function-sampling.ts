import type { ItemSnapshot } from "../types/item-registry";
import type { Viewport2D } from "../types/view-context";

const MIN_SAMPLES = 8;
const INFINITE_DOMAIN_PADDING_RATIO = 0.05;

export function getFunctionDomain(
  item: ItemSnapshot<"function2d">,
  viewport: Viewport2D | null = null
): readonly [number, number] {
  if (item.domain !== "infinite") {
    return item.domain[0] <= item.domain[1]
      ? item.domain
      : [item.domain[1], item.domain[0]];
  }
  if (!viewport) return [-10, 10];

  const { left, right } = viewport.visibleWorldBounds;
  const padding = (right - left) * INFINITE_DOMAIN_PADDING_RATIO;
  return [left - padding, right + padding];
}

// Sample the function into continuous polyline runs. Runs break at declared
// discontinuities and wherever the function returns a non-finite value, so a
// run never bridges a gap.
export function sampleFunctionRuns(
  item: ItemSnapshot<"function2d">,
  viewport: Viewport2D | null = null
): { x: number; y: number }[][] {
  const [domainStart, domainEnd] = getFunctionDomain(item, viewport);
  const sampleCount = Math.round(Math.max(item.samples, MIN_SAMPLES));
  const discontinuities = item.discontinuities
    .filter((x) => x > domainStart && x < domainEnd)
    .sort((a, b) => a - b);
  const boundaries = [domainStart, ...discontinuities, domainEnd];
  const totalWidth = domainEnd - domainStart;
  const runs: { x: number; y: number }[][] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    const width = end - start;
    if (width <= 0 || totalWidth <= 0) continue;

    const segmentSamples = Math.max(
      2,
      Math.round((sampleCount * width) / totalWidth)
    );
    let run: { x: number; y: number }[] = [];

    for (let j = 0; j < segmentSamples; j++) {
      const t = segmentSamples === 1 ? 0 : j / (segmentSamples - 1);
      const x = start + width * t;
      const y = item.f(x);
      if (Number.isFinite(y)) {
        run.push({ x, y });
      } else if (run.length > 0) {
        if (run.length >= 2) runs.push(run);
        run = [];
      }
    }
    if (run.length >= 2) runs.push(run);
  }

  return runs;
}

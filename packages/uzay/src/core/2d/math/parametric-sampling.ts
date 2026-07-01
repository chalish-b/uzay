import type { ItemSnapshot } from "../types/item-registry";

const MIN_SAMPLES = 8;

export function sampleParametricPoints(
  item: ItemSnapshot<"parametricfunction2d">
): { x: number; y: number }[] {
  const sampleCount = Math.round(Math.max(item.samples, MIN_SAMPLES));
  const points: { x: number; y: number }[] = new Array(sampleCount);
  const span = item.tEnd - item.tStart;
  for (let i = 0; i < sampleCount; i++) {
    const t = item.tStart + (span * i) / (sampleCount - 1);
    const p = item.f(t);
    points[i] = { x: p.x, y: p.y };
  }
  return points;
}

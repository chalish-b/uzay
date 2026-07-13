import type { Scene2D } from "../scene2d";
import type { AtomLikeInput } from "../../shared/atom-wrapper";
import { ensureAtom } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import { type Vec2, vec2 } from "../../shared/types/vec2";

type SegmentMark2DOptions = {
  // The segment's endpoints. Read-only: the construction never writes them, it
  // only draws the mark centered between them. They can be any two points, so
  // the mark works on a standalone line, one side of a polygon, or a sub-span
  // of a longer segment.
  a: AtomLikeInput<Vec2>;
  b: AtomLikeInput<Vec2>;
  // What the mark asserts about the segment:
  //  - "tick" (default): short strokes across the segment, the convention for
  //    equal lengths. The tick count distinguishes equality families.
  //  - "arrow": chevrons along the segment pointing from a to b, the convention
  //    for parallel segments.
  variant?: "tick" | "arrow";
  // How many strokes/chevrons to draw, fanned around the midpoint.
  count?: 1 | 2 | 3;
  // Size of the mark, in world units: the tick's length, or the chevron's width.
  size?: AtomLikeInput<number>;
  color?: AtomLikeInput<Color>;
  thickness?: AtomLikeInput<number>;
  // Show or hide the whole construction, applied to every item it creates.
  visible?: AtomLikeInput<boolean>;
};

type Stroke = { start: Vec2; end: Vec2 };

/**
 * A small mark on the segment between `a` and `b`: tick strokes crossing it
 * (equal lengths) or chevrons along it (parallel segments), centered on the
 * midpoint. `count` fans multiple marks to distinguish families, matching the
 * textbook convention of single/double/triple ticks.
 */
export function segmentMark2D(scene: Scene2D, options: SegmentMark2DOptions) {
  const aAtom = ensureAtom(scene.atom, options.a);
  const bAtom = ensureAtom(scene.atom, options.b);
  const sizeAtom = ensureAtom(scene.atom, options.size ?? 0.25);
  const colorAtom = ensureAtom(scene.atom, options.color ?? "white");
  const thicknessAtom = ensureAtom(scene.atom, options.thickness ?? 2);
  const visibleAtom = ensureAtom(scene.atom, options.visible ?? true);
  const variant = options.variant ?? "tick";
  const count = options.count ?? 1;

  // Every stroke endpoint, derived in one place from the segment's frame: the
  // midpoint m, the unit direction u from a to b, and its left perpendicular p.
  // Mark centers sit along u fanned around m; ticks extend along p, chevron
  // legs sweep back from a tip on u. The array's length is fixed by variant and
  // count, so each line2d below can safely pick its stroke by index.
  const strokesAtom = scene.atom<Stroke[]>((get) => {
    const a = get(aAtom);
    const b = get(bAtom);
    const size = get(sizeAtom);
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    const px = -uy;
    const py = ux;
    const m = vec2((a.x + b.x) / 2, (a.y + b.y) / 2);
    const spacing = size * 0.55;

    const strokes: Stroke[] = [];
    for (let i = 0; i < count; i++) {
      const offset = (i - (count - 1) / 2) * spacing;
      const cx = m.x + ux * offset;
      const cy = m.y + uy * offset;
      if (variant === "tick") {
        const h = size / 2;
        strokes.push({
          start: vec2(cx - px * h, cy - py * h),
          end: vec2(cx + px * h, cy + py * h),
        });
      } else {
        // The chevron straddles its center: tip ahead of it along u, the two
        // leg ends behind it, so the fan stays centered on the midpoint.
        const tip = vec2(cx + ux * size * 0.35, cy + uy * size * 0.35);
        const bx = cx - ux * size * 0.35;
        const by = cy - uy * size * 0.35;
        const h = size / 2;
        strokes.push(
          { start: vec2(bx + px * h, by + py * h), end: tip },
          { start: vec2(bx - px * h, by - py * h), end: tip }
        );
      }
    }
    return strokes;
  });

  const strokeCount = variant === "tick" ? count : count * 2;
  const strokes = Array.from({ length: strokeCount }, (_, i) =>
    scene.create("line2d", {
      start: scene.atom((get) => get(strokesAtom)[i].start),
      end: scene.atom((get) => get(strokesAtom)[i].end),
      color: colorAtom,
      thickness: thicknessAtom,
      visible: visibleAtom,
      pointerEvents: "none",
    })
  );

  return {
    dispose: () => {
      for (const stroke of strokes) scene.remove(stroke);
    },
  };
}

"use client";

import { segmentMark2D, vec2, type Vec2 } from "uzay";
import { Scene2DView } from "uzay/react";
import { DemoFrame } from "./demo-frame";
import { useDemoScene2D } from "./use-demo-scene";

export default function SegmentMark2DDemo() {
  const { scene, camera } = useDemoScene2D((scene, t) => {
    const camera = scene.create("camera2d", { center: vec2(-0.2, 0.2), zoom: 1.5 });

    scene.create("grid2d", {
      rangeX: true,
      rangeY: true,
      gap: "auto",
      color: t("grid"),
      opacity: t("gridOpacity"),
    });

    // The midsegment theorem: D and E are the midpoints of [AB] and [AC], so
    // AD = DB, AE = EC, and DE runs parallel to BC. The vertices are free to
    // drag; the midpoints are derived, so every mark stays true.
    const a = scene.create("point2d", { coords: vec2(-0.4, 1.8), color: t("accent"), radius: 7 });
    const b = scene.create("point2d", { coords: vec2(-2.8, -1.2), color: t("accent"), radius: 7 });
    const c = scene.create("point2d", { coords: vec2(2.4, -1.2), color: t("accent"), radius: 7 });

    const midpoint = (p: typeof a, q: typeof a) =>
      scene.atom<Vec2>((get) => {
        const u = get(p.coords);
        const v = get(q.coords);
        return vec2((u.x + v.x) / 2, (u.y + v.y) / 2);
      });
    const d = midpoint(a, b);
    const e = midpoint(a, c);

    scene.create("line2d", { start: a.coords, end: b.coords, color: t("primary"), thickness: 2.5, pointerEvents: "none" });
    scene.create("line2d", { start: b.coords, end: c.coords, color: t("primary"), thickness: 2.5, pointerEvents: "none" });
    scene.create("line2d", { start: c.coords, end: a.coords, color: t("primary"), thickness: 2.5, pointerEvents: "none" });
    scene.create("line2d", { start: d, end: e, color: t("secondary"), thickness: 2.5, pointerEvents: "none" });

    scene.create("point2d", { coords: d, draggable: "none", color: t("point"), radius: 5 });
    scene.create("point2d", { coords: e, draggable: "none", color: t("point"), radius: 5 });

    // Equal halves: single ticks on [AD]/[DB], double ticks on [AE]/[EC].
    segmentMark2D(scene, { a: a.coords, b: d, color: t("secondary"), thickness: 2.5 });
    segmentMark2D(scene, { a: d, b: b.coords, color: t("secondary"), thickness: 2.5 });
    segmentMark2D(scene, { a: a.coords, b: e, count: 2, color: t("secondary"), thickness: 2.5 });
    segmentMark2D(scene, { a: e, b: c.coords, count: 2, color: t("secondary"), thickness: 2.5 });

    // Parallel pair: chevrons on the midsegment and the base, same direction.
    segmentMark2D(scene, { a: d, b: e, variant: "arrow", color: t("secondary"), thickness: 2.5 });
    segmentMark2D(scene, { a: b.coords, b: c.coords, variant: "arrow", color: t("secondary"), thickness: 2.5 });

    return { camera };
  });

  return (
    <DemoFrame
      hint="Drag a vertex, every mark keeps telling the truth"
      sourceFile="segment-mark-2d-demo.tsx"
    >
      <Scene2DView
        scene={scene}
        camera={camera}
        style={{ width: "100%", height: "100%" }}
      />
    </DemoFrame>
  );
}

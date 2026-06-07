import type * as THREE from "three";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./index";
import { Z_DEFAULT } from "./index";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { checkedColor } from "../../shared/types/colors";
import type { Viewport2D } from "../types/view-context";

const MIN_SAMPLES = 8;
const INFINITE_DOMAIN_PADDING_RATIO = 0.05;

function getDomain(
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

function buildGeometry(
  item: ItemSnapshot<"function2d">,
  viewport: Viewport2D | null = null
): LineSegmentsGeometry {
  const [domainStart, domainEnd] = getDomain(item, viewport);
  const sampleCount = Math.round(Math.max(item.samples, MIN_SAMPLES));
  const discontinuities = item.discontinuities
    .filter((x) => x > domainStart && x < domainEnd)
    .sort((a, b) => a - b);
  const boundaries = [domainStart, ...discontinuities, domainEnd];
  const totalWidth = domainEnd - domainStart;
  const positions: number[] = [];

  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i];
    const end = boundaries[i + 1];
    const width = end - start;
    if (width <= 0 || totalWidth <= 0) continue;

    const segmentSamples = Math.max(
      2,
      Math.round((sampleCount * width) / totalWidth)
    );
    let previous: { x: number; y: number } | null = null;

    for (let j = 0; j < segmentSamples; j++) {
      const t = segmentSamples === 1 ? 0 : j / (segmentSamples - 1);
      const x = start + width * t;
      const y = item.f(x);
      const current = Number.isFinite(y) ? { x, y } : null;

      if (previous && current) {
        positions.push(
          previous.x,
          previous.y,
          Z_DEFAULT,
          current.x,
          current.y,
          Z_DEFAULT
        );
      }
      previous = current;
    }
  }

  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(positions);
  return geometry;
}

export const function2dRenderer: ItemRenderer<"function2d"> = {
  create(
    item: ItemSnapshot<"function2d">,
    threeScene: THREE.Scene
  ): ThreeSceneTypes["function2d"] {
    const geometry = buildGeometry(item);
    const material = new LineMaterial({
      color: checkedColor(item.color, "Function2D.color"),
      linewidth: item.thickness,
    });
    const mesh = new LineSegments2(geometry, material);
    mesh.visible = item.visible;
    mesh.userData.itemId = item.id;
    threeScene.add(mesh);
    return { kind: "function2d", geometry, material, mesh, layoutKey: null };
  },

  update(item: ItemSnapshot<"function2d">, obj: ThreeSceneTypes["function2d"]): void {
    obj.material.color.set(checkedColor(item.color, "Function2D.color"));
    obj.material.linewidth = item.thickness;
    obj.material.needsUpdate = true;
    obj.mesh.visible = item.visible;

    obj.geometry.dispose();
    obj.geometry = buildGeometry(item);
    obj.mesh.geometry = obj.geometry;
    obj.layoutKey = null;
  },

  layout(item: ItemSnapshot<"function2d">, obj: ThreeSceneTypes["function2d"], ctx): void {
    if (item.domain !== "infinite") return;
    const domain = getDomain(item, ctx.viewport);
    const layoutKey = JSON.stringify({
      domain,
      samples: item.samples,
      discontinuities: item.discontinuities,
    });
    if (layoutKey === obj.layoutKey) return;

    obj.geometry.dispose();
    obj.geometry = buildGeometry(item, ctx.viewport);
    obj.mesh.geometry = obj.geometry;
    obj.layoutKey = layoutKey;
  },

  dispose(obj: ThreeSceneTypes["function2d"], threeScene: THREE.Scene): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};

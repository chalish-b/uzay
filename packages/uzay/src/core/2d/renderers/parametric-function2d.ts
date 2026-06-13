import * as THREE from "three";
import type { ItemSnapshot } from "../types/item-registry";
import type { ItemRenderer, ThreeSceneTypes } from "./shared";
import { Z_DEFAULT } from "./shared";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { checkedColor } from "../../shared/types/colors";

const MIN_SAMPLES = 8;

function sampleCurve(
  f: (t: number) => { x: number; y: number },
  tStart: number,
  tEnd: number,
  samples: number
): number[] {
  const sampleCount = Math.round(Math.max(samples, MIN_SAMPLES));
  const positions = new Array(sampleCount * 3);
  const span = tEnd - tStart;
  for (let i = 0; i < sampleCount; i++) {
    const t = tStart + (span * i) / (sampleCount - 1);
    const p = f(t);
    positions[i * 3] = p.x;
    positions[i * 3 + 1] = p.y;
    positions[i * 3 + 2] = Z_DEFAULT;
  }
  return positions;
}

function buildGeometry(item: ItemSnapshot<"parametricfunction2d">): LineGeometry {
  const positions = sampleCurve(item.f, item.tStart, item.tEnd, item.samples);
  const geom = new LineGeometry();
  geom.setPositions(positions);
  return geom;
}

export const parametricFunction2dRenderer: ItemRenderer<"parametricfunction2d"> = {
  create(
    item: ItemSnapshot<"parametricfunction2d">,
    threeScene: THREE.Scene
  ): ThreeSceneTypes["parametricfunction2d"] {
    const geometry = buildGeometry(item);
    const material = new LineMaterial({
      color: checkedColor(item.color, "ParametricFunction2D.color"),
      linewidth: item.thickness,
      transparent: item.opacity < 1,
      opacity: item.opacity,
    });
    const mesh = new Line2(geometry, material);
    mesh.visible = item.visible;
    mesh.userData.itemId = item.id;
    threeScene.add(mesh);
    return { kind: "parametricfunction2d", geometry, material, mesh };
  },

  update(
    item: ItemSnapshot<"parametricfunction2d">,
    obj: ThreeSceneTypes["parametricfunction2d"]
  ): void {
    obj.material.color.set(checkedColor(item.color, "ParametricFunction2D.color"));
    obj.material.linewidth = item.thickness;
    obj.material.opacity = item.opacity;
    obj.material.transparent = item.opacity < 1;
    obj.material.needsUpdate = true;
    obj.mesh.visible = item.visible;

    obj.geometry.dispose();
    const next = buildGeometry(item);
    obj.mesh.geometry = next;
    (obj as { geometry: LineGeometry }).geometry = next;
  },

  dispose(
    obj: ThreeSceneTypes["parametricfunction2d"],
    threeScene: THREE.Scene
  ): void {
    threeScene.remove(obj.mesh);
    obj.geometry.dispose();
    obj.material.dispose();
  },
};

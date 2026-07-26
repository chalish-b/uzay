import * as THREE from "three";

// Shared sampling and meshing for the grid-based surface items (surface3d,
// parametricsurface3d): a rectangular parameter grid triangulated cell by
// cell, optionally wrapping around either axis so closed surfaces weld their
// seam into shared vertices instead of duplicating the boundary column.

export type GridTopology = {
  nu: number;
  nv: number;
  wrapU: boolean;
  wrapV: boolean;
};

export function sameGridTopology(a: GridTopology, b: GridTopology): boolean {
  return (
    a.nu === b.nu && a.nv === b.nv && a.wrapU === b.wrapU && a.wrapV === b.wrapV
  );
}

// On a wrapped axis the sample after the last one IS the first, so the grid
// stops one step short of the range end; an open axis samples the end
// inclusively.
function axisParam(
  range: [number, number],
  n: number,
  wrap: boolean,
  i: number
): number {
  const denom = wrap ? n : n - 1;
  return range[0] + ((range[1] - range[0]) * i) / denom;
}

export function buildGridPositions(
  topology: GridTopology,
  uRange: [number, number],
  vRange: [number, number],
  position: (u: number, v: number) => { x: number; y: number; z: number }
): Float32Array {
  const { nu, nv, wrapU, wrapV } = topology;
  const positions = new Float32Array(nu * nv * 3);
  for (let i = 0; i < nu; i++) {
    const u = axisParam(uRange, nu, wrapU, i);
    for (let j = 0; j < nv; j++) {
      const v = axisParam(vRange, nv, wrapV, j);
      const p = position(u, v);
      const idx = (i * nv + j) * 3;
      positions[idx] = p.x;
      positions[idx + 1] = p.y;
      positions[idx + 2] = p.z;
    }
  }
  return positions;
}

export function buildGridIndices(topology: GridTopology): Uint32Array {
  const { nu, nv, wrapU, wrapV } = topology;
  const cellsU = wrapU ? nu : nu - 1;
  const cellsV = wrapV ? nv : nv - 1;
  const indices = new Uint32Array(cellsU * cellsV * 6);
  let k = 0;
  for (let i = 0; i < cellsU; i++) {
    const i2 = (i + 1) % nu;
    for (let j = 0; j < cellsV; j++) {
      const j2 = (j + 1) % nv;
      const a = i * nv + j;
      const b = i2 * nv + j;
      const c = i2 * nv + j2;
      const d = i * nv + j2;
      indices[k++] = a;
      indices[k++] = c;
      indices[k++] = b;
      indices[k++] = a;
      indices[k++] = d;
      indices[k++] = c;
    }
  }
  return indices;
}

export function createGridGeometry(
  topology: GridTopology,
  uRange: [number, number],
  vRange: [number, number],
  position: (u: number, v: number) => { x: number; y: number; z: number }
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      buildGridPositions(topology, uRange, vRange, position),
      3
    )
  );
  geometry.setIndex(new THREE.BufferAttribute(buildGridIndices(topology), 1));
  geometry.computeVertexNormals();
  return geometry;
}

// Refills an existing geometry's position buffer for the same topology. The
// hot path while a reactive function animates: no reallocation, no re-index.
export function updateGridPositions(
  geometry: THREE.BufferGeometry,
  topology: GridTopology,
  uRange: [number, number],
  vRange: [number, number],
  position: (u: number, v: number) => { x: number; y: number; z: number }
): void {
  const posAttr = geometry.attributes.position as THREE.BufferAttribute;
  posAttr.set(buildGridPositions(topology, uRange, vRange, position));
  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();
  (geometry.attributes.normal as THREE.BufferAttribute).needsUpdate = true;
}

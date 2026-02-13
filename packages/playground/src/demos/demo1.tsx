import { useEffect, useRef, useState } from "react";
import { Scene3D, View3D, Vec3, vec3 } from "uzay";
import type { BoundAtom } from "uzay";
import type { PrimitiveAtom } from "jotai";

// Compute two orthonormal tangent vectors for a plane given its normal
function planeBasis(normal: Vec3) {
  // Pick a vector not parallel to normal
  const ref = Math.abs(normal.y) < 0.9 ? vec3(0, 1, 0) : vec3(1, 0, 0);
  // u = normalize(ref × normal)
  const ux = ref.y * normal.z - ref.z * normal.y;
  const uy = ref.z * normal.x - ref.x * normal.z;
  const uz = ref.x * normal.y - ref.y * normal.x;
  const uLen = Math.sqrt(ux * ux + uy * uy + uz * uz);
  const u = vec3(ux / uLen, uy / uLen, uz / uLen);
  // v = normal × u
  const v = vec3(
    normal.y * u.z - normal.z * u.y,
    normal.z * u.x - normal.x * u.z,
    normal.x * u.y - normal.y * u.x,
  );
  return { u, v };
}

export default function Demo1() {
  const containerRef = useRef<HTMLDivElement>(null);
  const widthAtomRef = useRef<BoundAtom<PrimitiveAtom<number>> | null>(null);
  const heightAtomRef = useRef<BoundAtom<PrimitiveAtom<number>> | null>(null);
  const opacityAtomRef = useRef<BoundAtom<PrimitiveAtom<number>> | null>(null);
  const showEdgesAtomRef = useRef<BoundAtom<PrimitiveAtom<boolean>> | null>(null);
  const camXAtomRef = useRef<BoundAtom<PrimitiveAtom<number>> | null>(null);
  const camYAtomRef = useRef<BoundAtom<PrimitiveAtom<number>> | null>(null);
  const camZAtomRef = useRef<BoundAtom<PrimitiveAtom<number>> | null>(null);
  const fovAtomRef = useRef<BoundAtom<PrimitiveAtom<number>> | null>(null);
  const viewRef = useRef<View3D | null>(null);
  const cam2IdRef = useRef<string | null>(null);
  const cam1IdRef = useRef<string | null>(null);
  const [activeCamLabel, setActiveCamLabel] = useState("Camera 1");
  const [width, setWidth] = useState(6);
  const [height, setHeight] = useState(6);
  const [opacity, setOpacity] = useState(0.5);
  const [showEdges, setShowEdges] = useState(true);
  const [camX, setCamX] = useState(12);
  const [camY, setCamY] = useState(10);
  const [camZ, setCamZ] = useState(12);
  const [fov, setFov] = useState(60);
  const [enableOrbit, setEnableOrbit] = useState(true);
  const [enablePan, setEnablePan] = useState(true);
  const [enableZoom, setEnableZoom] = useState(true);
  const enableOrbitAtomRef = useRef<BoundAtom<PrimitiveAtom<boolean>> | null>(null);
  const enablePanAtomRef = useRef<BoundAtom<PrimitiveAtom<boolean>> | null>(null);
  const enableZoomAtomRef = useRef<BoundAtom<PrimitiveAtom<boolean>> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new Scene3D();

    // --- Plane center (draggable point) ---
    const centerAtom = scene.atom(vec3(0, 2, 0));

    scene.create("point3d", {
      coords: centerAtom,
      color: "cyan",
      radius: 3,
      draggable: "x",
    });

    scene.create("overlay3d", {
      position: centerAtom,
      format: "latex",
      content: scene.atom((get) => {
        const c = get(centerAtom);
        return String.raw`\text{center} = (${c.x.toFixed(1)},\; ${c.y.toFixed(1)},\; ${c.z.toFixed(1)})`;
      }),
      anchor: "bottom",
      offset: { x: 0, y: -8 },
      style: "color: cyan; font-size: 12px; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 3px;",
    });

    // --- Normal vector (draggable) ---
    const normalDirAtom = scene.atom(Vec3.normalized(vec3(0, 1, 0)));
    const normalLengthAtom = scene.atom(4);

    const normalVecAtom = scene.atom(
      (get) => Vec3.scaled(get(normalDirAtom), get(normalLengthAtom)),
      (_get, set, next: Vec3) => {
        const len = Math.sqrt(Vec3.dot(next, next));
        if (len < 0.001) return;
        set(normalDirAtom, Vec3.normalized(next));
        set(normalLengthAtom, len);
      },
    );

    scene.create("vector3d", {
      origin: centerAtom,
      vector: normalVecAtom,
      color: "gold",
      thickness: 1,
    });

    // Normal direction label at tip
    const normalTipAtom = scene.atom((get) => Vec3.add(get(centerAtom), get(normalVecAtom)));
    scene.create("overlay3d", {
      position: normalTipAtom,
      format: "latex",
      content: scene.atom((get) => {
        const n = get(normalDirAtom);
        return String.raw`\hat{n} = (${n.x.toFixed(2)},\; ${n.y.toFixed(2)},\; ${n.z.toFixed(2)})`;
      }),
      anchor: "bottom",
      offset: { x: 0, y: -8 },
      style: "color: gold; font-size: 12px; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 3px;",
    });

    // --- Plane size & appearance (controlled by sliders) ---
    const widthAtom = scene.atom(6);
    const heightAtom = scene.atom(6);
    const opacityAtom = scene.atom(0.5);
    const showEdgesAtom = scene.atom(true);

    widthAtomRef.current = widthAtom;
    heightAtomRef.current = heightAtom;
    opacityAtomRef.current = opacityAtom;
    showEdgesAtomRef.current = showEdgesAtom;

    widthAtom.sub(() => setWidth(widthAtom.get()));
    heightAtom.sub(() => setHeight(heightAtom.get()));
    opacityAtom.sub(() => setOpacity(opacityAtom.get()));
    showEdgesAtom.sub(() => setShowEdges(showEdgesAtom.get()));

    // --- The plane itself ---
    scene.create("plane3d", {
      point: centerAtom,
      normal: normalDirAtom,
      width: widthAtom,
      height: heightAtom,
      color: "dodgerblue",
      opacity: opacityAtom,
      showEdges: showEdgesAtom,
      pointerEvents: "none",
    });

    // --- Point constrained to the cyan plane surface ---
    // Store position as offset from plane center in plane-local coordinates
    // so it stays on the plane even when center/normal change
    const surfaceOffsetAtom = scene.atom(vec3(1, 0, 1));

    const surfacePosAtom = scene.atom(
      (get) => {
        const center = get(centerAtom);
        const normal = get(normalDirAtom);
        const offset = get(surfaceOffsetAtom);
        // Build a local frame on the plane: two tangent vectors
        const { u, v } = planeBasis(normal);
        // Position = center + offset.x * u + offset.z * v
        return vec3(
          center.x + offset.x * u.x + offset.z * v.x,
          center.y + offset.x * u.y + offset.z * v.y,
          center.z + offset.x * u.z + offset.z * v.z,
        );
      },
      (_get, set, next: Vec3) => {
        const center = centerAtom.get();
        const normal = normalDirAtom.get();
        // Project next onto plane, then decompose into local coords
        const dx = next.x - center.x;
        const dy = next.y - center.y;
        const dz = next.z - center.z;
        const dot = dx * normal.x + dy * normal.y + dz * normal.z;
        // Project onto plane
        const px = next.x - dot * normal.x - center.x;
        const py = next.y - dot * normal.y - center.y;
        const pz = next.z - dot * normal.z - center.z;
        const { u, v } = planeBasis(normal);
        // Decompose into u,v components
        const uComp = px * u.x + py * u.y + pz * u.z;
        const vComp = px * v.x + py * v.y + pz * v.z;
        set(surfaceOffsetAtom, vec3(uComp, 0, vComp));
      },
    );

    const surfacePoint = scene.create("point3d", {
      coords: surfacePosAtom,
      color: "lime",
      radius: 3,
      draggable: "xyz",
    });

    // Use ray-plane intersection for accurate dragging
    surfacePoint.on("drag", (event) => {
      if (event.phase === "start" || event.phase === "end") return;
      const { origin: o, direction: d } = event.ray;
      const center = centerAtom.get();
      const normal = normalDirAtom.get();
      // Ray-plane intersection: t = dot(center - origin, normal) / dot(direction, normal)
      const denom = d.x * normal.x + d.y * normal.y + d.z * normal.z;
      if (Math.abs(denom) < 1e-6) return; // ray parallel to plane
      const t = ((center.x - o.x) * normal.x + (center.y - o.y) * normal.y + (center.z - o.z) * normal.z) / denom;
      const hit = vec3(o.x + t * d.x, o.y + t * d.y, o.z + t * d.z);
      surfacePosAtom.set(hit);
    });

    scene.create("overlay3d", {
      position: surfacePosAtom,
      format: "text",
      content: "on-plane point",
      anchor: "bottom",
      offset: { x: 0, y: -8 },
      style: "color: lime; font-size: 12px; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 3px;",
    });

    // --- Second plane to show interaction ---
    const center2Atom = scene.atom(vec3(3, 0, 3));

    scene.create("point3d", {
      coords: center2Atom,
      color: "hotpink",
      radius: 3,
      draggable: "xz",
    });

    scene.create("plane3d", {
      point: center2Atom,
      normal: vec3(1, 0, 0),
      width: 4,
      height: 4,
      color: "hotpink",
      opacity: 0.4,
      showEdges: true,
      pointerEvents: "none",
    });

    scene.create("overlay3d", {
      position: center2Atom,
      format: "text",
      content: "xz-draggable plane",
      anchor: "bottom",
      offset: { x: 0, y: -8 },
      style: "color: hotpink; font-size: 12px; background: rgba(0,0,0,0.6); padding: 2px 6px; border-radius: 3px;",
    });

    // --- Axes and grid ---
    scene.create("axes3d", {
      x: [-8, 8],
      y: [-8, 8],
      z: [-8, 8],
      thickness: 0.7,
    });
    scene.create("grid3d", {
      plane: "xz",
      range1: [-8, 8],
      range2: [-8, 8],
      color: "#444",
      thickness: 2,
    });

    // Camera atoms for bidirectional sync
    const camXAtom = scene.atom(12);
    const camYAtom = scene.atom(10);
    const camZAtom = scene.atom(12);
    const fovAtom = scene.atom(60);

    const cameraPosAtom = scene.atom(
      (get) => vec3(get(camXAtom), get(camYAtom), get(camZAtom)),
      (_get, set, next: Vec3) => {
        set(camXAtom, next.x);
        set(camYAtom, next.y);
        set(camZAtom, next.z);
      },
    );

    camXAtomRef.current = camXAtom;
    camYAtomRef.current = camYAtom;
    camZAtomRef.current = camZAtom;
    fovAtomRef.current = fovAtom;

    const enableOrbitAtom = scene.atom(true);
    const enablePanAtom = scene.atom(true);
    const enableZoomAtom = scene.atom(true);
    enableOrbitAtomRef.current = enableOrbitAtom;
    enablePanAtomRef.current = enablePanAtom;
    enableZoomAtomRef.current = enableZoomAtom;

    camXAtom.sub(() => setCamX(camXAtom.get()));
    camYAtom.sub(() => setCamY(camYAtom.get()));
    camZAtom.sub(() => setCamZ(camZAtom.get()));
    fovAtom.sub(() => setFov(fovAtom.get()));

    const camera1 = scene.create("camera3d", {
      position: cameraPosAtom,
      lookAt: vec3(0, 0, 0),
      fov: fovAtom,
      enableOrbit: enableOrbitAtom,
      enablePan: enablePanAtom,
      enableZoom: enableZoomAtom,
    });

    const camera2 = scene.create("camera3d", {
      position: vec3(-10, 15, -10),
      lookAt: vec3(0, 0, 0),
      fov: 45,
    });

    cam1IdRef.current = camera1.id;
    cam2IdRef.current = camera2.id;

    const view = new View3D(scene, camera1.id, containerRef.current);
    viewRef.current = view;

    return () => {
      view.dispose();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => { widthAtomRef.current?.set(width); }, [width]);
  useEffect(() => { heightAtomRef.current?.set(height); }, [height]);
  useEffect(() => { opacityAtomRef.current?.set(opacity); }, [opacity]);
  useEffect(() => { showEdgesAtomRef.current?.set(showEdges); }, [showEdges]);
  useEffect(() => { camXAtomRef.current?.set(camX); }, [camX]);
  useEffect(() => { camYAtomRef.current?.set(camY); }, [camY]);
  useEffect(() => { camZAtomRef.current?.set(camZ); }, [camZ]);
  useEffect(() => { fovAtomRef.current?.set(fov); }, [fov]);
  useEffect(() => { enableOrbitAtomRef.current?.set(enableOrbit); }, [enableOrbit]);
  useEffect(() => { enablePanAtomRef.current?.set(enablePan); }, [enablePan]);
  useEffect(() => { enableZoomAtomRef.current?.set(enableZoom); }, [enableZoom]);

  const sliderStyle = { color: "white", fontSize: 13 } as const;
  const rowStyle = { display: "flex", alignItems: "center", gap: 8 } as const;

  return (
    <div style={{ width: "100%", height: "100%", backgroundColor: "#141414", position: "relative" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }}></div>
      <div style={{
        position: "absolute", top: 12, left: 12,
        display: "flex", flexDirection: "column", gap: 6,
        background: "rgba(0,0,0,0.5)", padding: "10px 14px", borderRadius: 6,
      }}>
        <div style={rowStyle}>
          <label style={{ ...sliderStyle, minWidth: 50 }}>Width</label>
          <input type="range" min="0.5" max="12" step="0.1" value={width}
            onChange={(e) => setWidth(parseFloat(e.target.value))} />
          <span style={{ ...sliderStyle, minWidth: 32 }}>{width.toFixed(1)}</span>
        </div>
        <div style={rowStyle}>
          <label style={{ ...sliderStyle, minWidth: 50 }}>Height</label>
          <input type="range" min="0.5" max="12" step="0.1" value={height}
            onChange={(e) => setHeight(parseFloat(e.target.value))} />
          <span style={{ ...sliderStyle, minWidth: 32 }}>{height.toFixed(1)}</span>
        </div>
        <div style={rowStyle}>
          <label style={{ ...sliderStyle, minWidth: 50 }}>Opacity</label>
          <input type="range" min="0" max="1" step="0.01" value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))} />
          <span style={{ ...sliderStyle, minWidth: 32 }}>{opacity.toFixed(2)}</span>
        </div>
        <div style={rowStyle}>
          <label style={sliderStyle}>Edges</label>
          <input type="checkbox" checked={showEdges}
            onChange={(e) => setShowEdges(e.target.checked)} />
        </div>
        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.2)", margin: "4px 0" }} />
        <div style={rowStyle}>
          <label style={{ ...sliderStyle, minWidth: 50 }}>Cam X</label>
          <input type="range" min="-30" max="30" step="0.1" value={camX}
            onChange={(e) => setCamX(parseFloat(e.target.value))} />
          <span style={{ ...sliderStyle, minWidth: 32 }}>{camX.toFixed(1)}</span>
        </div>
        <div style={rowStyle}>
          <label style={{ ...sliderStyle, minWidth: 50 }}>Cam Y</label>
          <input type="range" min="-30" max="30" step="0.1" value={camY}
            onChange={(e) => setCamY(parseFloat(e.target.value))} />
          <span style={{ ...sliderStyle, minWidth: 32 }}>{camY.toFixed(1)}</span>
        </div>
        <div style={rowStyle}>
          <label style={{ ...sliderStyle, minWidth: 50 }}>Cam Z</label>
          <input type="range" min="-30" max="30" step="0.1" value={camZ}
            onChange={(e) => setCamZ(parseFloat(e.target.value))} />
          <span style={{ ...sliderStyle, minWidth: 32 }}>{camZ.toFixed(1)}</span>
        </div>
        <div style={rowStyle}>
          <label style={{ ...sliderStyle, minWidth: 50 }}>FOV</label>
          <input type="range" min="10" max="120" step="1" value={fov}
            onChange={(e) => setFov(parseFloat(e.target.value))} />
          <span style={{ ...sliderStyle, minWidth: 32 }}>{fov.toFixed(0)}</span>
        </div>
        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.2)", margin: "4px 0" }} />
        <button
          style={{ ...sliderStyle, padding: "4px 10px", borderRadius: 4, cursor: "pointer" }}
          onClick={() => {
            const view = viewRef.current;
            if (!view || !cam1IdRef.current || !cam2IdRef.current) return;
            const isCam1 = activeCamLabel === "Camera 1";
            view.changeActiveCam(isCam1 ? cam2IdRef.current : cam1IdRef.current);
            setActiveCamLabel(isCam1 ? "Camera 2" : "Camera 1");
          }}
        >
          Switch to {activeCamLabel === "Camera 1" ? "Camera 2" : "Camera 1"}
        </button>
        <span style={sliderStyle}>Active: {activeCamLabel}</span>
        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.2)", margin: "4px 0" }} />
        <div style={rowStyle}>
          <label style={sliderStyle}>Orbit</label>
          <input type="checkbox" checked={enableOrbit}
            onChange={(e) => setEnableOrbit(e.target.checked)} />
          <label style={sliderStyle}>Pan</label>
          <input type="checkbox" checked={enablePan}
            onChange={(e) => setEnablePan(e.target.checked)} />
          <label style={sliderStyle}>Zoom</label>
          <input type="checkbox" checked={enableZoom}
            onChange={(e) => setEnableZoom(e.target.checked)} />
        </div>
      </div>
    </div>
  );
}

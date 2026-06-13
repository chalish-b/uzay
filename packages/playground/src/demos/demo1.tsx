import { useMemo } from "react";
import { Scene2D, Scene3D, vec2, vec3 } from "uzay";
import { Scene2DView, Scene3DView, useAtomValue } from "uzay/react";
import type { ItemTags } from "uzay";

// Camera-scoped visibility sandbox.
//
// One scene per dimension, several cameras over it, one view per camera. Each
// camera's `visibleTags` decides what it draws, so stacked panels can frame
// different slices of the same construction. Reactive state is shared for free:
// every dependent item derives from a single source atom (a draggable handle),
// so dragging in one panel updates the others with no value bridge.

// ---- 2D: stacked f / f' panels driven by one handle ----
function buildScene2D() {
  const scene = new Scene2D();

  // Two cameras over one scene. The top frames sin, the bottom frames cos, and
  // each only renders its own tag plus the untagged scaffolding.
  // Shared camera pose. Both panels read and write the same center/zoom atoms,
  // so panning or zooming one 2D panel moves the other in lockstep. Same trick
  // as the 3D pair: hand one bound atom to both cameras and the view writes
  // pan/zoom back through it.
  const camCenter = scene.atom(vec2(0, 0));
  const camZoom = scene.atom(1);

  const camTop = scene.create("camera2d", {
    center: camCenter,
    zoom: camZoom,
    visibleTags: ["top"],
  });
  const camBottom = scene.create("camera2d", {
    center: camCenter,
    zoom: camZoom,
    visibleTags: ["bottom"],
  });

  // Untagged scaffolding: shows in both panels.
  scene.create("grid2d", {
    rangeX: [-12, 12],
    rangeY: [-8, 8],
    gap: 1,
    color: "white",
    opacity: 0.1,
  });
  scene.create("axes2d", {
    x: [-11, 11],
    y: [-6, 6],
    color: "#888",
    thickness: 1.1,
    tickmarks: true,
    tickStep: 1,
    arrows: true,
  });

  // The single source of truth. Tagged "top", so only the top panel renders it
  // and only the top panel can grab it. Everything else derives from its x.
  const handle = scene.create("point2d", {
    coords: vec2(1.5, 0),
    draggable: "x",
    color: "#ffb547",
    radius: 7,
    tags: ["top"],
  });
  const xAtom = scene.atom((get) => get(handle.coords).x);

  // Top panel: f(x) = sin(x).
  const sinCurve = scene.create("function2d", {
    f: (x) => Math.sin(x),
    domain: "infinite",
    color: "#4f9cf9",
    thickness: 2.5,
    pointerEvents: "none",
    tags: ["top"],
  });
  scene.create("line2d", {
    start: scene.atom((get) => vec2(get(xAtom), 0)),
    end: scene.atom((get) => vec2(get(xAtom), Math.sin(get(xAtom)))),
    color: "#ffb547",
    thickness: 1,
    pointerEvents: "none",
    tags: ["top"],
  });
  scene.create("point2d", {
    coords: scene.atom((get) => vec2(get(xAtom), Math.sin(get(xAtom)))),
    draggable: "none",
    color: "#4f9cf9",
    radius: 5,
    pointerEvents: "none",
    tags: ["top"],
  });
  scene.create("overlay2d", {
    position: scene.atom((get) => vec2(get(xAtom), Math.sin(get(xAtom)))),
    content: scene.atom(
      (get) =>
        `sin(${get(xAtom).toFixed(2)}) = ${Math.sin(get(xAtom)).toFixed(2)}`
    ),
    offset: vec2(0, -20),
    style: "color:#cfe3ff;font:12px system-ui;white-space:nowrap;",
    tags: ["top"],
  });

  // Bottom panel: f'(x) = cos(x), reacting to the same handle.
  const cosCurve = scene.create("function2d", {
    f: (x) => Math.cos(x),
    domain: "infinite",
    color: "#6ee7a8",
    thickness: 2.5,
    pointerEvents: "none",
    tags: ["bottom"],
  });
  scene.create("line2d", {
    start: scene.atom((get) => vec2(get(xAtom), 0)),
    end: scene.atom((get) => vec2(get(xAtom), Math.cos(get(xAtom)))),
    color: "#6ee7a8",
    thickness: 1,
    pointerEvents: "none",
    tags: ["bottom"],
  });
  scene.create("point2d", {
    coords: scene.atom((get) => vec2(get(xAtom), Math.cos(get(xAtom)))),
    draggable: "none",
    color: "#6ee7a8",
    radius: 5,
    pointerEvents: "none",
    tags: ["bottom"],
  });
  scene.create("overlay2d", {
    position: scene.atom((get) => vec2(get(xAtom), Math.cos(get(xAtom)))),
    content: scene.atom(
      (get) =>
        `cos(${get(xAtom).toFixed(2)}) = ${Math.cos(get(xAtom)).toFixed(2)}`
    ),
    offset: vec2(0, -20),
    style: "color:#bdf0d4;font:12px system-ui;white-space:nowrap;",
    tags: ["bottom"],
  });

  // A third tag, in neither picker's union. It only shows when a camera drops
  // its filter entirely ("all"), which is what makes "top+bottom" and "all"
  // visibly different.
  scene.create("point2d", {
    coords: vec2(-5, 2),
    draggable: "none",
    color: "#e879f9",
    radius: 6,
    pointerEvents: "none",
    tags: ["extra"],
  });
  scene.create("overlay2d", {
    position: vec2(-5, 2),
    content: "extra (only under 'all')",
    offset: vec2(0, -18),
    style: "color:#f0abfc;font:11px system-ui;white-space:nowrap;",
    tags: ["extra"],
  });

  return { scene, camTop, camBottom, xAtom, sinCurve, cosCurve };
}

// ---- 3D: a draggable point in one view, its derived sphere/vector in another ----
function buildScene3D() {
  const scene = new Scene3D();

  // Shared camera pose. Both panels read and write the same position/lookAt
  // atoms, so orbiting or panning one 3D panel moves the other in lockstep.
  // Passing one bound atom to both cameras' fields makes them share state;
  // OrbitControls writes back through it, so no library change is needed.
  const camPosition = scene.atom(vec3(9, 7, 9));
  const camLookAt = scene.atom(vec3(0, 0, 0));

  const camLeft = scene.create("camera3d", {
    position: camPosition,
    lookAt: camLookAt,
    visibleTags: ["a"],
  });
  const camRight = scene.create("camera3d", {
    position: camPosition,
    lookAt: camLookAt,
    visibleTags: ["b"],
  });

  // Untagged scaffolding: shows in both panels.
  scene.create("axes3d", {
    x: [-6, 6],
    y: [-6, 6],
    z: [-6, 6],
    color: "#888",
    thickness: 2,
    arrows: true,
  });
  scene.create("grid3d", {
    plane: "xz",
    range1: [-6, 6],
    range2: [-6, 6],
    gap: 1,
    color: "white",
    opacity: 0.12,
  });

  // Source of truth: a draggable point, tagged "a".
  const p = scene.create("point3d", {
    coords: vec3(3, 2, 1),
    draggable: "xyz",
    color: "#ffb547",
    tags: ["a"],
  });
  scene.create("line3d", {
    start: vec3(0, 0, 0),
    end: scene.atom((get) => get(p.coords)),
    color: "#ffb547",
    thickness: 2,
    pointerEvents: "none",
    tags: ["a"],
  });

  const radiusAtom = scene.atom((get) => {
    const c = get(p.coords);
    return Math.hypot(c.x, c.y, c.z);
  });

  // Right panel: a sphere of radius |p| and a vector to p, both derived.
  const sphere = scene.create("sphere3d", {
    center: vec3(0, 0, 0),
    radius: radiusAtom,
    color: "#4f9cf9",
    opacity: 0.22,
    pointerEvents: "none",
    tags: ["b"],
  });
  const vector = scene.create("vector3d", {
    origin: vec3(0, 0, 0),
    vector: scene.atom((get) => get(p.coords)),
    color: "#6ee7a8",
    pointerEvents: "none",
    tags: ["b"],
  });
  scene.create("overlay3d", {
    position: scene.atom((get) => get(p.coords)),
    content: scene.atom((get) => `|p| = ${get(radiusAtom).toFixed(2)}`),
    offset: vec2(0, -20),
    style: "color:#bdf0d4;font:12px system-ui;white-space:nowrap;",
    tags: ["b"],
  });

  // Third tag, in neither picker's union; appears only when a camera shows all.
  scene.create("point3d", {
    coords: vec3(-4, 0, -4),
    draggable: "none",
    color: "#e879f9",
    pointerEvents: "none",
    tags: ["c"],
  });
  scene.create("overlay3d", {
    position: vec3(-4, 0, -4),
    content: "extra (only under 'all')",
    offset: vec2(0, -18),
    style: "color:#f0abfc;font:11px system-ui;white-space:nowrap;",
    tags: ["c"],
  });

  return { scene, camLeft, camRight, radiusAtom, sphere, vector };
}

const CHECKLIST = [
  "Untagged grid/axes appear in every panel; tagged items only in their own",
  "Drag the orange handle (2D top): the bottom cos point + readout track it, no bridge",
  "Drag the orange point (3D left): the right sphere grows and the vector follows",
  "You cannot grab a handle from a panel whose camera does not show it",
  "CSS labels follow the same filter (top readout absent from the bottom panel)",
  "Pan/zoom a 2D panel; the other 2D panel mirrors it (shared camera atom)",
  "Orbit/pan a 3D panel; the other 3D panel mirrors it (shared camera atom)",
  "Switch a camera to 'all': the magenta 'extra' marker (tag outside the union) appears",
  "Toggle an item's .visible: it hides even where the camera shows its tag",
];

type TagOption = { label: string; value: ItemTags | undefined };

function CameraTagPicker({
  caption,
  current,
  options,
  onPick,
}: {
  caption: string;
  current: ItemTags | undefined;
  options: TagOption[];
  onPick: (value: ItemTags | undefined) => void;
}) {
  const key = (value: ItemTags | undefined) =>
    value === undefined ? "*" : [...value].sort().join(",");
  const activeKey = key(current);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 96, color: "#999", fontSize: 11 }}>{caption}</span>
      <div style={{ display: "flex", gap: 4 }}>
        {options.map((option) => {
          const active = key(option.value) === activeKey;
          return (
            <button
              key={option.label}
              onClick={() => onPick(option.value)}
              style={{
                padding: "4px 9px",
                border: "none",
                borderRadius: 4,
                backgroundColor: active ? "#4f9cf9" : "#262626",
                color: active ? "#fff" : "#999",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ToggleButton({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 9px",
        border: "none",
        borderRadius: 4,
        backgroundColor: on ? "#2f7d4f" : "#3a2330",
        color: on ? "#eafff0" : "#c98ba8",
        fontSize: 11,
        cursor: "pointer",
      }}
    >
      {label}: {on ? "shown" : "hidden"}
    </button>
  );
}

function Panel({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "relative",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
        border: "1px solid #1f1f1f",
      }}
    >
      {children}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 10,
          color: "#bbb",
          fontFamily: "system-ui, sans-serif",
          fontSize: 11,
          background: "rgba(0,0,0,0.5)",
          padding: "2px 7px",
          borderRadius: 4,
          pointerEvents: "none",
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function Demo1() {
  const two = useMemo(buildScene2D, []);
  const three = useMemo(buildScene3D, []);

  const x = useAtomValue(two.xAtom);
  const radius = useAtomValue(three.radiusAtom);

  const topTags = useAtomValue(two.camTop.visibleTags);
  const bottomTags = useAtomValue(two.camBottom.visibleTags);
  const leftTags = useAtomValue(three.camLeft.visibleTags);
  const rightTags = useAtomValue(three.camRight.visibleTags);

  // Each item's own `visible` field, toggled independently of camera tags.
  const sinVisible = useAtomValue(two.sinCurve.visible);
  const cosVisible = useAtomValue(two.cosCurve.visible);
  const sphereVisible = useAtomValue(three.sphere.visible);
  const vectorVisible = useAtomValue(three.vector.visible);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: 1,
          background: "#000",
        }}
      >
        <Panel label="2D top · camera shows [top]">
          <Scene2DView
            scene={two.scene}
            camera={two.camTop}
            style={{ width: "100%", height: "100%" }}
          />
        </Panel>
        <Panel label="3D left · camera shows [a]">
          <Scene3DView
            scene={three.scene}
            camera={three.camLeft}
            style={{ width: "100%", height: "100%" }}
          />
        </Panel>
        <Panel label="2D bottom · camera shows [bottom]">
          <Scene2DView
            scene={two.scene}
            camera={two.camBottom}
            style={{ width: "100%", height: "100%" }}
          />
        </Panel>
        <Panel label="3D right · camera shows [b]">
          <Scene3DView
            scene={three.scene}
            camera={three.camRight}
            style={{ width: "100%", height: "100%" }}
          />
        </Panel>
      </div>

      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: 14,
          width: 340,
          backgroundColor: "rgba(20, 20, 20, 0.9)",
          border: "1px solid #2a2a2a",
          borderRadius: 8,
          color: "#ddd",
          fontFamily: "system-ui, sans-serif",
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 600 }}>Camera-scoped visibility</div>

        <CameraTagPicker
          caption="2D top"
          current={topTags}
          options={[
            { label: "top", value: ["top"] },
            { label: "top+bottom", value: ["top", "bottom"] },
            { label: "all", value: undefined },
          ]}
          onPick={(value) => two.camTop.visibleTags.set(value)}
        />
        <CameraTagPicker
          caption="2D bottom"
          current={bottomTags}
          options={[
            { label: "bottom", value: ["bottom"] },
            { label: "top+bottom", value: ["top", "bottom"] },
            { label: "all", value: undefined },
          ]}
          onPick={(value) => two.camBottom.visibleTags.set(value)}
        />
        <CameraTagPicker
          caption="3D left"
          current={leftTags}
          options={[
            { label: "a", value: ["a"] },
            { label: "a+b", value: ["a", "b"] },
            { label: "all", value: undefined },
          ]}
          onPick={(value) => three.camLeft.visibleTags.set(value)}
        />
        <CameraTagPicker
          caption="3D right"
          current={rightTags}
          options={[
            { label: "b", value: ["b"] },
            { label: "a+b", value: ["a", "b"] },
            { label: "all", value: undefined },
          ]}
          onPick={(value) => three.camRight.visibleTags.set(value)}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            borderTop: "1px solid #2a2a2a",
            paddingTop: 8,
          }}
        >
          <span style={{ color: "#999", fontSize: 11 }}>
            Item .visible (independent of camera tags)
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            <ToggleButton
              label="sin"
              on={sinVisible}
              onClick={() => two.sinCurve.visible.set(!sinVisible)}
            />
            <ToggleButton
              label="cos"
              on={cosVisible}
              onClick={() => two.cosCurve.visible.set(!cosVisible)}
            />
            <ToggleButton
              label="3D sphere"
              on={sphereVisible}
              onClick={() => three.sphere.visible.set(!sphereVisible)}
            />
            <ToggleButton
              label="3D vector"
              on={vectorVisible}
              onClick={() => three.vector.visible.set(!vectorVisible)}
            />
          </div>
        </div>

        <div
          style={{
            color: "#9fb6cc",
            fontSize: 12,
            fontVariantNumeric: "tabular-nums",
            borderTop: "1px solid #2a2a2a",
            paddingTop: 8,
          }}
        >
          x = {x.toFixed(2)} · sin = {Math.sin(x).toFixed(2)} · cos ={" "}
          {Math.cos(x).toFixed(2)} · |p| = {radius.toFixed(2)}
        </div>

        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            color: "#777",
            fontSize: 11,
            lineHeight: 1.5,
          }}
        >
          {CHECKLIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

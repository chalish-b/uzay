import type { Scene2D } from "../scene2d";
import type { AtomLikeInput } from "../../shared/atom-wrapper";
import { ensureAtom } from "../../shared/atom-wrapper";
import type { Color } from "../../shared/types/colors";
import { Vec2, vec2 } from "../../shared/types/vec2";

type AngleMark2DOptions = {
  // The angle's vertex and the two points its arms point at. Read-only: the
  // construction never writes them, it only draws the mark they imply.
  vertex: AtomLikeInput<Vec2>;
  a: AtomLikeInput<Vec2>;
  b: AtomLikeInput<Vec2>;
  // Size of the mark, in world units: the arc radius, or the square's side.
  radius?: AtomLikeInput<number>;
  color?: AtomLikeInput<Color>;
  thickness?: AtomLikeInput<number>;
  // Show a right-angle square (instead of the arc) when the angle is 90°. On by
  // default; set false to keep the arc at every angle.
  squareRightAngle?: AtomLikeInput<boolean>;
  // Which of the two angles between the arms the mark sweeps, from a to b:
  //  - "minor" (default): the smaller angle, 0–180°.
  //  - "major": the larger angle, 180–360°.
  //  - "ccw" / "cw": a fixed counterclockwise or clockwise sweep, 0–360°. Unlike
  //    "minor"/"major", which always pick by size, these hold one side as b
  //    travels around the vertex, so the mark grows continuously through 180°.
  sweep?: AtomLikeInput<"minor" | "major" | "ccw" | "cw">;
  // A marker on the arc asserting this angle equals others carrying the same
  // marker, the textbook convention for equal-angle families:
  //  - "tick": short radial strokes crossing the arc.
  //  - "dot": small filled disks inside the angle, just short of the arc.
  //  - "none" (default): the arc alone marks the angle.
  // Markers hide while the mark renders as the right-angle square, which
  // asserts its measure by itself.
  marker?: AtomLikeInput<"tick" | "dot" | "none">;
  // How many markers to fan around the arc's midpoint.
  markerCount?: AtomLikeInput<1 | 2 | 3>;
  // Marker size in world units: the tick stroke's length, or the dot's
  // diameter. Defaults scale with the arc radius.
  markerSize?: AtomLikeInput<number>;
  // Show or hide the whole construction, applied to every item it creates.
  visible?: AtomLikeInput<boolean>;
};

// How close to 90° counts as a right angle. ±0.5° so the square appears exactly
// when a degree readout rounded with toFixed(0) reads "90".
const RIGHT_ANGLE_TOL_DEG = 0.5;

const TAU = 2 * Math.PI;

// Ticks and dots are pre-created up to the largest allowed markerCount, so
// marker and markerCount can change reactively; the extras stay hidden.
const MAX_MARKER_COUNT = 3;

/**
 * A small mark for the angle at `vertex` between the arms to `a` and `b`. A bare
 * arc (a circle2d) sweeping the angle chosen by `sweep` (the smaller angle by
 * default), which by convention becomes the right-angle square whenever that
 * angle is 90° (pass `squareRightAngle: false` to keep the arc). The measured
 * angle is returned as `measure`, in radians, so a readout and the mark share
 * one source of truth, and the arc's mid direction as `midDir`, the anchor
 * direction for placing a label inside the marked wedge.
 */
export function angleMark2D(scene: Scene2D, options: AngleMark2DOptions) {
  const vertexAtom = ensureAtom(scene.atom, options.vertex);
  const aAtom = ensureAtom(scene.atom, options.a);
  const bAtom = ensureAtom(scene.atom, options.b);
  const radiusAtom = ensureAtom(scene.atom, options.radius ?? 0.4);
  const colorAtom = ensureAtom(scene.atom, options.color ?? "white");
  const thicknessAtom = ensureAtom(scene.atom, options.thickness ?? 2);
  const visibleAtom = ensureAtom(scene.atom, options.visible ?? true);
  const sweepModeAtom = ensureAtom(scene.atom, options.sweep ?? "minor");

  // Direction to arm a, and the signed sweep from a to b that lands on b's
  // direction either way: positive sweeps counterclockwise, negative clockwise.
  // "minor"/"major" pick the shorter/longer of the two arcs by size; "ccw"/"cw"
  // commit to a turn direction, so the sweep passes through 180° unbroken.
  const sweepAtom = scene.atom((get) => {
    const v = get(vertexAtom);
    const a = get(aAtom);
    const b = get(bAtom);
    const start = Math.atan2(a.y - v.y, a.x - v.x);
    const raw = Math.atan2(b.y - v.y, b.x - v.x) - start;
    // Short signed arc in (-π, π], and the full counterclockwise arc in [0, 2π).
    const minor = ((((raw + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
    const ccw = ((raw % TAU) + TAU) % TAU;
    let delta;
    switch (get(sweepModeAtom)) {
      case "major":
        delta = minor === 0 ? 0 : minor - Math.sign(minor) * TAU;
        break;
      case "ccw":
        delta = ccw;
        break;
      case "cw":
        delta = ccw === 0 ? 0 : ccw - TAU;
        break;
      default:
        delta = minor;
    }
    return { start, delta };
  });

  const measure = scene.atom((get) => Math.abs(get(sweepAtom).delta));

  // Unit direction from the vertex through the midpoint of the drawn arc, i.e.
  // the bisector of the marked angle, on the side the mark actually sweeps.
  // The anchor direction for a label: vertex + midDir * dist sits the label
  // centered in the marked wedge at any sweep mode.
  const midDir = scene.atom((get) => {
    const { start, delta } = get(sweepAtom);
    return Vec2.fromAngle(start + delta / 2);
  });

  // The arc and square coexist and trade visibility as the angle crosses 90° (an
  // item's kind is fixed at creation, so a single item can't morph between them).
  // A "major" sweep never measures 90°, so its square simply never shows.
  const squareRightAngleAtom = ensureAtom(
    scene.atom,
    options.squareRightAngle ?? true
  );
  const rightAngle = scene.atom(
    (get) =>
      get(squareRightAngleAtom) &&
      Math.abs((get(measure) * 180) / Math.PI - 90) < RIGHT_ANGLE_TOL_DEG
  );

  // The arc and square each show only while the construction itself is
  // visible; `visible` gates both sides of the 90° swap.
  const arcVisible = scene.atom((get) => get(visibleAtom) && !get(rightAngle));

  const arc = scene.create("circle2d", {
    center: vertexAtom,
    radius: radiusAtom,
    thetaStart: scene.atom((get) => get(sweepAtom).start),
    thetaEnd: scene.atom((get) => {
      const { start, delta } = get(sweepAtom);
      return start + delta;
    }),
    strokeColor: colorAtom,
    strokeThickness: thicknessAtom,
    visible: arcVisible,
    pointerEvents: "none",
  });

  // The conventional right-angle mark: the two outer sides of a small square in
  // the corner (an L), not a closed box — the other two sides would just lie on
  // the arms. p1 is r along arm a, p3 is r along arm b, p2 is the far corner.
  const corner = scene.atom((get) => {
    const v = get(vertexAtom);
    const a = get(aAtom);
    const b = get(bAtom);
    const r = get(radiusAtom);
    const ma = Math.hypot(a.x - v.x, a.y - v.y) || 1;
    const mb = Math.hypot(b.x - v.x, b.y - v.y) || 1;
    const uax = (a.x - v.x) / ma;
    const uay = (a.y - v.y) / ma;
    const ubx = (b.x - v.x) / mb;
    const uby = (b.y - v.y) / mb;
    return {
      p1: vec2(v.x + uax * r, v.y + uay * r),
      p2: vec2(v.x + (uax + ubx) * r, v.y + (uay + uby) * r),
      p3: vec2(v.x + ubx * r, v.y + uby * r),
    };
  });

  const squareVisible = scene.atom(
    (get) => get(visibleAtom) && get(rightAngle)
  );
  const squareSides = [
    scene.create("line2d", {
      start: scene.atom((get) => get(corner).p1),
      end: scene.atom((get) => get(corner).p2),
      color: colorAtom,
      thickness: thicknessAtom,
      visible: squareVisible,
      pointerEvents: "none",
    }),
    scene.create("line2d", {
      start: scene.atom((get) => get(corner).p2),
      end: scene.atom((get) => get(corner).p3),
      color: colorAtom,
      thickness: thicknessAtom,
      visible: squareVisible,
      pointerEvents: "none",
    }),
  ];

  // Marker positions, one per markerCount: unit radial directions at angles
  // fanned around the arc's midpoint. The angular step keeps a constant
  // arc-length spacing (relative to the radius) but tightens when the angle
  // itself is too narrow to fit the fan.
  const markerAtom = ensureAtom(scene.atom, options.marker ?? "none");
  const markerCountAtom = ensureAtom(scene.atom, options.markerCount ?? 1);
  const markerSizeAtom =
    options.markerSize !== undefined
      ? ensureAtom(scene.atom, options.markerSize)
      : null;
  const markerDirs = scene.atom((get) => {
    const { start, delta } = get(sweepAtom);
    const count = get(markerCountAtom);
    const mid = start + delta / 2;
    const step = Math.min(0.22, Math.abs(delta) / (count + 1));
    const dirs: Vec2[] = [];
    for (let i = 0; i < count; i++) {
      dirs.push(Vec2.fromAngle(mid + (i - (count - 1) / 2) * step));
    }
    return dirs;
  });

  // Markers past the current count park at the vertex, hidden.
  const tickVisible = (i: number) =>
    scene.atom(
      (get) =>
        get(arcVisible) &&
        get(markerAtom) === "tick" &&
        i < get(markerDirs).length
    );
  const dotVisible = (i: number) =>
    scene.atom(
      (get) =>
        get(arcVisible) &&
        get(markerAtom) === "dot" &&
        i < get(markerDirs).length
    );

  // A radial stroke crossing the arc, half inside and half outside.
  const tickHalfLength = scene.atom(
    (get) => (markerSizeAtom ? get(markerSizeAtom) : get(radiusAtom) * 0.4) / 2
  );
  const ticks = Array.from({ length: MAX_MARKER_COUNT }, (_, i) =>
    scene.create("line2d", {
      start: scene.atom((get) => {
        const v = get(vertexAtom);
        const d = get(markerDirs)[i];
        if (!d) return v;
        const r = get(radiusAtom);
        const h = get(tickHalfLength);
        return vec2(v.x + d.x * (r - h), v.y + d.y * (r - h));
      }),
      end: scene.atom((get) => {
        const v = get(vertexAtom);
        const d = get(markerDirs)[i];
        if (!d) return v;
        const r = get(radiusAtom);
        const h = get(tickHalfLength);
        return vec2(v.x + d.x * (r + h), v.y + d.y * (r + h));
      }),
      color: colorAtom,
      thickness: thicknessAtom,
      visible: tickVisible(i),
      pointerEvents: "none",
    })
  );

  // A small filled disk between the vertex and the arc.
  const dots = Array.from({ length: MAX_MARKER_COUNT }, (_, i) =>
    scene.create("circle2d", {
      center: scene.atom((get) => {
        const v = get(vertexAtom);
        const d = get(markerDirs)[i];
        if (!d) return v;
        const r = get(radiusAtom);
        return vec2(v.x + d.x * r * 0.62, v.y + d.y * r * 0.62);
      }),
      radius: scene.atom(
        (get) =>
          (markerSizeAtom ? get(markerSizeAtom) : get(radiusAtom) * 0.16) / 2
      ),
      color: colorAtom,
      opacity: 1,
      strokeOpacity: 0,
      visible: dotVisible(i),
      pointerEvents: "none",
    })
  );

  return {
    mark: arc,
    measure,
    midDir,
    dispose: () => {
      scene.remove(arc);
      for (const side of squareSides) scene.remove(side);
      for (const tick of ticks) scene.remove(tick);
      for (const dot of dots) scene.remove(dot);
    },
  };
}

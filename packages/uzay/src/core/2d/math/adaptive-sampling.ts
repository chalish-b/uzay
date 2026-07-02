// Adaptive curve sampling shared by the function and parametric plotters.
//
// The curve is seeded coarsely, then every span is recursively bisected until
// the true curve stays within a sub-pixel tolerance of the drawn chord. All
// tolerances are measured in screen pixels (via worldPerPixel), so quality is
// tied to what's on screen, not to the parameter range. Refinement spends
// evaluations only where the curve actually bends: straight stretches stop at
// depth 0, corners and near-asymptotic walls go deep.
//
// Non-finite values split the output into separate runs. Spans that still
// fail the flatness test at maximum depth are classified: a chord that stays
// long as the span shrinks to nothing is a jump discontinuity (the run
// breaks), while a steep-but-continuous stretch keeps shrinking and connects.
// Finally, everything is clipped to the caller's world-space rect so the
// emitted coordinates stay bounded no matter how hard the function blows up.

export type CurvePoint = { x: number; y: number };

// World-space rect the sampled geometry is clipped to. Callers include their
// own off-screen margin so strokes visibly run off the edge.
export type ClipRect = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

// One t-interval to sample. An open end sits at a declared discontinuity: the
// curve approaches it from inside the interval via one-sided refinement and
// is never evaluated on or across the boundary.
export type CurveSegment = {
  start: number;
  end: number;
  openStart?: boolean;
  openEnd?: boolean;
};

export type AdaptiveCurveOptions = {
  f: (t: number) => CurvePoint;
  segments: readonly CurveSegment[];
  worldPerPixel: number;
  clip: ClipRect;
  // Seed spacing in t. Seeds snap to absolute multiples of the step, so a pan
  // re-samples the same t positions and the curve doesn't shimmer.
  seedStep?: number;
  // Uniform seed count per segment, for parameters with no natural world
  // scale (parametric t). Used when seedStep is absent.
  seedCount?: number;
};

// Max deviation between the true curve and a drawn chord, in pixels.
const TOLERANCE_PX = 0.25;
// Per-span bisection depth cap: bounds the work spent on spans that never
// flatten (asymptotes, infinitely detailed oscillation).
const MAX_DEPTH = 12;
// Hard budget of function evaluations per sampling pass. Anything hungrier
// (e.g. a wave with a sub-pixel period filling the screen) degrades to
// coarser chords once the budget runs out.
const MAX_EVALS = 32000;
const MAX_SEEDS = 2048;
const DEFAULT_SEED_COUNT = 64;
// Break thresholds for spans that still fail flatness at the depth cap: an
// asymptote (probe escaped past both endpoints) breaks past ASYMPTOTE_PX, a
// jump (probe collapsed onto one endpoint's level) breaks at any visible size.
const ASYMPTOTE_PX = 12;
const JUMP_PX = 3;
// Runaway guard for the edge-approach loops. Real termination comes from the
// directional clip exit, convergence, or float precision; the cap only needs
// to sit above float64's exponent range (~1074 halvings exhaust it).
const MAX_EDGE_STEPS = 1100;

type SampleState = {
  f: (t: number) => CurvePoint;
  worldPerPixel: number;
  clip: ClipRect;
  evals: number;
  runs: CurvePoint[][];
  run: CurvePoint[];
};

function isFinitePoint(p: CurvePoint): boolean {
  return Number.isFinite(p.x) && Number.isFinite(p.y);
}

function evalAt(state: SampleState, t: number): CurvePoint {
  state.evals++;
  return state.f(t);
}

function breakRun(state: SampleState): void {
  if (state.run.length >= 2) state.runs.push(state.run);
  state.run = [];
}

function pushStart(state: SampleState, p: CurvePoint): void {
  if (state.run.length === 0) state.run.push(p);
}

// Cohen-Sutherland-style outcode against the clip rect.
const OUT_LEFT = 1;
const OUT_RIGHT = 2;
const OUT_BOTTOM = 4;
const OUT_TOP = 8;

function outCode(p: CurvePoint, clip: ClipRect): number {
  let code = 0;
  if (p.x < clip.xMin) code |= OUT_LEFT;
  else if (p.x > clip.xMax) code |= OUT_RIGHT;
  if (p.y < clip.yMin) code |= OUT_BOTTOM;
  else if (p.y > clip.yMax) code |= OUT_TOP;
  return code;
}

function chordPx(a: CurvePoint, b: CurvePoint, worldPerPixel: number): number {
  return Math.hypot((b.x - a.x) / worldPerPixel, (b.y - a.y) / worldPerPixel);
}

// Distance in pixels between the curve probed at fraction s of the span and
// the chord at that same fraction. Unlike perpendicular chord distance, this
// stays large across a jump (the probe sits on one side's level while the
// chord's midsection hangs in the gap), so jumps can't pass as flat vertical
// chords. Overflow from astronomically large coordinates reads as "not
// flat", the safe direction: the span subdivides instead of drawing a wall.
function deviationPx(
  pm: CurvePoint,
  p0: CurvePoint,
  p1: CurvePoint,
  s: number,
  worldPerPixel: number
): number {
  const lx = p0.x + (p1.x - p0.x) * s;
  const ly = p0.y + (p1.y - p0.y) * s;
  const d = Math.hypot((pm.x - lx) / worldPerPixel, (pm.y - ly) / worldPerPixel);
  return Number.isFinite(d) ? d : Infinity;
}

// Whether p sits outside the clip rect AND moved further outward relative to
// prev, i.e. the curve is leaving the view for good. Merely being outside is
// not enough to stop an edge approach: when the viewport is panned below a
// plunge's elbow, the early probes sit above the top while still traveling
// down toward the visible band.
function exitedOutward(
  prev: CurvePoint | null,
  p: CurvePoint,
  clip: ClipRect
): boolean {
  if (!prev) return false;
  const code = outCode(p, clip);
  if (code === 0) return false;
  return (
    ((code & OUT_BOTTOM) !== 0 && p.y < prev.y) ||
    ((code & OUT_TOP) !== 0 && p.y > prev.y) ||
    ((code & OUT_LEFT) !== 0 && p.x < prev.x) ||
    ((code & OUT_RIGHT) !== 0 && p.x > prev.x)
  );
}

// Bisect between a finite sample and a non-finite one, returning the finite
// point closest to the domain edge. When the edge sits at the interval's end
// the bisection degenerates into gap-halving toward it, so the loop runs
// until the curve demonstrably leaves the view or float precision is
// exhausted; a fixed small step count would put a zoom-dependent floor on
// how deep a log-type tail can reach.
function bisectEdge(
  state: SampleState,
  tGood: number,
  pGood: CurvePoint,
  tBad: number
): { t: number; p: CurvePoint } {
  let lo = tGood;
  let pLo = pGood;
  let hi = tBad;
  for (let k = 0; k < MAX_EDGE_STEPS && state.evals < MAX_EVALS; k++) {
    const tm = (lo + hi) / 2;
    if (tm === lo || tm === hi) break;
    const pm = evalAt(state, tm);
    if (isFinitePoint(pm)) {
      const exited = exitedOutward(pLo, pm, state.clip);
      lo = tm;
      pLo = pm;
      if (exited) break;
    } else {
      hi = tm;
    }
  }
  return { t: lo, p: pLo };
}

// One-sided approach to a declared discontinuity: halve the remaining gap
// each step to trace the curve toward its limit at the boundary. Never
// evaluates at the boundary itself, where the function may belong to the
// other side. Stops when the curve demonstrably leaves the view (infinite
// limit) or the probes converge (finite one-sided limit).
function approachBoundary(
  state: SampleState,
  tFrom: number,
  tBoundary: number
): { t: number; p: CurvePoint } | null {
  let dist = tBoundary - tFrom;
  let best: { t: number; p: CurvePoint } | null = null;
  let prev: CurvePoint | null = null;
  let prevProgress = Infinity;
  for (let k = 0; k < MAX_EDGE_STEPS && state.evals < MAX_EVALS; k++) {
    dist /= 2;
    const t = tBoundary - dist;
    if (t === tBoundary || t === tFrom) break;
    const p = evalAt(state, t);
    if (!isFinitePoint(p)) continue;
    if (prev) {
      const progress = chordPx(prev, p, state.worldPerPixel);
      // A finite limit shows up as geometrically shrinking progress. Constant
      // progress per step (a log-type tail crawling 0.69 world units per
      // halving) is not convergence and must keep going.
      if (k > 8 && progress < 0.05 && progress < prevProgress * 0.7) {
        best = { t, p };
        break;
      }
      prevProgress = progress;
    }
    best = { t, p };
    if (exitedOutward(prev, p, state.clip)) break;
    prev = p;
  }
  return best;
}

// Emit the curve on (t0, t1]; p0 (finite) is already in the current run and
// p1 is finite. Bisects until the chord is flat to tolerance, breaking the
// run at jumps and domain edges discovered along the way.
function refine(
  state: SampleState,
  t0: number,
  p0: CurvePoint,
  t1: number,
  p1: CurvePoint,
  depth: number
): void {
  if (state.evals >= MAX_EVALS) {
    state.run.push(p1);
    return;
  }

  // Probe positions jitter per span (plain sine hash, deterministic across
  // frames): a fixed probe position could systematically alias with a
  // periodic function whose period tracks the span width.
  const h = Math.sin(t0 * 12.9898 + t1 * 78.233) * 43758.5453;
  const jitter = h - Math.floor(h);
  const s = 0.45 + 0.1 * jitter;
  const tm = t0 + (t1 - t0) * s;
  if (tm <= t0 || tm >= t1) {
    state.run.push(p1);
    return;
  }
  const pm = evalAt(state, tm);

  if (!isFinitePoint(pm)) {
    // The curve leaves its domain inside this span: localize both edges,
    // trace up to the left one, break, and resume from the right one.
    const nextDepth = Math.min(depth + 1, MAX_DEPTH);
    const left = bisectEdge(state, t0, p0, tm);
    if (left.t > t0) refine(state, t0, p0, left.t, left.p, nextDepth);
    breakRun(state);
    const right = bisectEdge(state, t1, p1, tm);
    state.run.push(right.p);
    if (right.t < t1) refine(state, right.t, right.p, t1, p1, nextDepth);
    return;
  }

  // Everything beyond the same clip edge is off-screen; connect and let the
  // clipping pass drop it.
  if ((outCode(p0, state.clip) & outCode(pm, state.clip) & outCode(p1, state.clip)) !== 0) {
    state.run.push(p1);
    return;
  }

  if (deviationPx(pm, p0, p1, s, state.worldPerPixel) <= TOLERANCE_PX) {
    // Spans wider than ~2px must pass a second probe before they're accepted
    // as flat: a single probe can coincidentally land where the curve crosses
    // its own chord, on a span that wiggles everywhere else.
    if (chordPx(p0, p1, state.worldPerPixel) <= 2 || state.evals >= MAX_EVALS) {
      state.run.push(p1);
      return;
    }
    const s2 = 0.7 + 0.1 * jitter;
    const pm2 = evalAt(state, t0 + (t1 - t0) * s2);
    if (
      isFinitePoint(pm2) &&
      deviationPx(pm2, p0, p1, s2, state.worldPerPixel) <= TOLERANCE_PX
    ) {
      state.run.push(p1);
      return;
    }
  }

  if (depth >= MAX_DEPTH) {
    // The span refuses to flatten; classify it by where the probe landed.
    // Asymptote: the probe escaped past both endpoints (tan at a pole).
    // Jump: the probe collapsed onto one endpoint's level, with nothing in
    // between (floor at an integer). Both break the run. Anything else is a
    // continuous stretch too steep to resolve (the log(x) plunge): connect
    // it through the probe; at this depth the span is far below a pixel
    // wide, so the chord draws as a clean vertical line.
    const total = chordPx(p0, p1, state.worldPerPixel);
    const escaped =
      pm.x < Math.min(p0.x, p1.x) ||
      pm.x > Math.max(p0.x, p1.x) ||
      pm.y < Math.min(p0.y, p1.y) ||
      pm.y > Math.max(p0.y, p1.y);
    const collapsed =
      Math.min(
        chordPx(p0, pm, state.worldPerPixel),
        chordPx(pm, p1, state.worldPerPixel)
      ) < 1;
    if ((escaped && total > ASYMPTOTE_PX) || (collapsed && total > JUMP_PX)) {
      breakRun(state);
      state.run.push(p1);
      return;
    }
    state.run.push(pm);
    state.run.push(p1);
    return;
  }

  refine(state, t0, p0, tm, pm, depth + 1);
  refine(state, tm, pm, t1, p1, depth + 1);
}

function buildSeedTs(seg: CurveSegment, options: AdaptiveCurveOptions): number[] {
  const span = seg.end - seg.start;
  const ts: number[] = [];

  if (options.seedStep && options.seedStep > 0) {
    let step = options.seedStep;
    if (span / step > MAX_SEEDS) step = span / MAX_SEEDS;
    const k0 = Math.ceil(seg.start / step);
    const k1 = Math.floor(seg.end / step);
    for (let k = k0; k <= k1; k++) {
      const t = k * step;
      if (t > seg.start && t < seg.end) ts.push(t);
    }
  } else {
    const count = Math.max(2, options.seedCount ?? DEFAULT_SEED_COUNT);
    for (let i = 1; i < count; i++) {
      ts.push(seg.start + (span * i) / count);
    }
  }

  // Closed ends are sampled exactly; open ends are covered by the boundary
  // approach instead. A segment narrower than the seed step still needs an
  // interior point to anchor that approach.
  if (!seg.openStart) ts.unshift(seg.start);
  if (!seg.openEnd) ts.push(seg.end);
  if (ts.length === 0) ts.push(seg.start + span / 2);
  return ts;
}

function sampleSegment(
  state: SampleState,
  seg: CurveSegment,
  options: AdaptiveCurveOptions
): void {
  if (!(seg.end > seg.start)) return;
  const ts = buildSeedTs(seg, options);
  const ps = ts.map((t) => evalAt(state, t));
  const n = ts.length;

  if (seg.openStart && isFinitePoint(ps[0])) {
    const near = approachBoundary(state, ts[0], seg.start);
    if (near) {
      pushStart(state, near.p);
      if (near.t < ts[0]) refine(state, near.t, near.p, ts[0], ps[0], 0);
    }
  }

  for (let i = 1; i < n; i++) {
    const ta = ts[i - 1];
    const pa = ps[i - 1];
    const tb = ts[i];
    const pb = ps[i];
    const aFinite = isFinitePoint(pa);
    const bFinite = isFinitePoint(pb);

    if (aFinite && bFinite) {
      pushStart(state, pa);
      refine(state, ta, pa, tb, pb, 0);
    } else if (aFinite) {
      const near = bisectEdge(state, ta, pa, tb);
      pushStart(state, pa);
      if (near.t > ta) refine(state, ta, pa, near.t, near.p, 0);
      breakRun(state);
    } else if (bFinite) {
      const near = bisectEdge(state, tb, pb, ta);
      pushStart(state, near.p);
      if (near.t < tb) refine(state, near.t, near.p, tb, pb, 0);
    } else if (state.evals < MAX_EVALS) {
      // Both seeds are outside the domain; probe once for an island of
      // definition in between (e.g. sqrt(sin x) pockets narrower than the
      // seed spacing).
      const tm = (ta + tb) / 2;
      const pm = evalAt(state, tm);
      if (isFinitePoint(pm)) {
        const left = bisectEdge(state, tm, pm, ta);
        const right = bisectEdge(state, tm, pm, tb);
        pushStart(state, left.p);
        if (left.t < tm) refine(state, left.t, left.p, tm, pm, 0);
        if (right.t > tm) refine(state, tm, pm, right.t, right.p, 0);
        breakRun(state);
      }
    }
  }

  if (seg.openEnd) {
    const last = ps[n - 1];
    if (isFinitePoint(last)) {
      const near = approachBoundary(state, ts[n - 1], seg.end);
      if (near && near.t > ts[n - 1]) {
        pushStart(state, last);
        refine(state, ts[n - 1], last, near.t, near.p, 0);
      }
    }
  }

  breakRun(state);
}

// Liang-Barsky clip of one segment against the rect. Returns the original
// point objects untouched when an endpoint is inside, so unclipped joints
// compare equal in the run-splitting pass below.
function clipSegment(
  a: CurvePoint,
  b: CurvePoint,
  clip: ClipRect
): { p: CurvePoint; q: CurvePoint } | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t0 = 0;
  let t1 = 1;

  const edges: Array<[number, number]> = [
    [-dx, a.x - clip.xMin],
    [dx, clip.xMax - a.x],
    [-dy, a.y - clip.yMin],
    [dy, clip.yMax - a.y],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return null;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return null;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return null;
      if (t < t1) t1 = t;
    }
  }

  return {
    p: t0 <= 0 ? a : { x: a.x + t0 * dx, y: a.y + t0 * dy },
    q: t1 >= 1 ? b : { x: a.x + t1 * dx, y: a.y + t1 * dy },
  };
}

function clipRunsToRect(runs: CurvePoint[][], clip: ClipRect): CurvePoint[][] {
  const out: CurvePoint[][] = [];
  let cur: CurvePoint[] = [];
  const flush = () => {
    if (cur.length >= 2) out.push(cur);
    cur = [];
  };

  for (const run of runs) {
    flush();
    for (let i = 0; i < run.length - 1; i++) {
      const seg = clipSegment(run[i], run[i + 1], clip);
      if (!seg) {
        flush();
        continue;
      }
      if (cur.length === 0) {
        cur.push(seg.p);
      } else {
        const last = cur[cur.length - 1];
        if (last.x !== seg.p.x || last.y !== seg.p.y) {
          flush();
          cur.push(seg.p);
        }
      }
      cur.push(seg.q);
    }
    flush();
  }
  return out;
}

export function adaptiveSampleCurve(
  options: AdaptiveCurveOptions
): CurvePoint[][] {
  const state: SampleState = {
    f: options.f,
    worldPerPixel: options.worldPerPixel,
    clip: options.clip,
    evals: 0,
    runs: [],
    run: [],
  };

  for (const seg of options.segments) {
    sampleSegment(state, seg, options);
  }
  breakRun(state);

  return clipRunsToRect(state.runs, options.clip);
}

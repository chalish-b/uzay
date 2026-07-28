import type { ItemSnapshot } from "../../../types/item-registry";
import type { Viewport2D } from "../../../types/view-context";
import { vec2 } from "../../../../shared/types/vec2";
import {
  arrowEndSkips,
  buildTickPositions,
  getAxisRange,
  getTickStep,
  type AxisKey,
} from "../../../math/axes-math";
import { hasArrowAt } from "../../../../shared/types/arrows";
import { createAxisTickLabel } from "../../../overlay-dom";
import type {
  SvgAxesLabel,
  SvgItemContainer,
  SvgItemRenderer,
} from "./shared";
import { applyStrokePx, cssColor, setAttrs, svgEl } from "./shared";

// Everything about the axes (ranges, tick spacing and length, arrow size,
// labels) depends on the viewport, so the whole item builds in layout() and
// rebuilds when its layout key changes. update() only invalidates the key;
// the rebuild lands in the same frame's layout pass.

function buildAxis(
  axis: AxisKey,
  item: ItemSnapshot<"axes2d">,
  viewport: Viewport2D,
  g: SVGGElement
): void {
  if (item[axis] === false) return;

  const range = getAxisRange(axis, item[axis], viewport);
  const wpp = viewport.worldPerPixel;
  // The axis line sits at the origin's perpendicular coordinate; ticks skip
  // the crossing point, where the other axis passes.
  const base = axis === "x" ? item.origin.y : item.origin.x;
  const crossing = axis === "x" ? item.origin.x : item.origin.y;

  const line = svgEl("line");
  setAttrs(
    line,
    axis === "x"
      ? { x1: range[0], y1: base, x2: range[1], y2: base }
      : { x1: base, y1: range[0], x2: base, y2: range[1] }
  );
  applyStrokePx(line, item.color, item.thickness);
  g.appendChild(line);

  if (item.tickmarks) {
    const tickStep = getTickStep(item.tickStep, viewport);
    const half = (item.tickLength / 2) * wpp;
    const parts: string[] = [];
    for (const tick of buildTickPositions(range, tickStep, [
      crossing,
      ...arrowEndSkips(range, item.arrows),
    ])) {
      parts.push(
        axis === "x"
          ? `M ${tick} ${base - half} L ${tick} ${base + half}`
          : `M ${base - half} ${tick} L ${base + half} ${tick}`
      );
    }
    const ticks = svgEl("path");
    ticks.setAttribute("d", parts.join(" "));
    applyStrokePx(ticks, item.color, item.thickness);
    g.appendChild(ticks);
  }

  // Unit arrows pointing along the axis, scaled into pixel-sized world units
  // with the BASE at the axis endpoint so ticks at integer positions stay
  // clear of the tip. "end" is the range's max side, "start" the min side.
  const lengthWorld = item.headLength * wpp;
  const halfWidthWorld = (item.headWidth / 2) * wpp;
  const heads: { which: "start" | "end"; d: string; at: number }[] = [
    {
      which: "end",
      d: axis === "x" ? "M 1 0 L 0 0.5 L 0 -0.5 Z" : "M 0 1 L 0.5 0 L -0.5 0 Z",
      at: range[1],
    },
    {
      which: "start",
      d: axis === "x" ? "M -1 0 L 0 0.5 L 0 -0.5 Z" : "M 0 -1 L 0.5 0 L -0.5 0 Z",
      at: range[0],
    },
  ];
  for (const head of heads) {
    if (!hasArrowAt(item.arrows, head.which)) continue;
    const arrow = svgEl("path");
    arrow.setAttribute("d", head.d);
    const translate =
      axis === "x"
        ? `translate(${head.at} ${base})`
        : `translate(${base} ${head.at})`;
    const scale =
      axis === "x"
        ? `scale(${lengthWorld} ${halfWidthWorld * 2})`
        : `scale(${halfWidthWorld * 2} ${lengthWorld})`;
    arrow.setAttribute("transform", `${translate} ${scale}`);
    arrow.setAttribute("fill", cssColor(item.color));
    g.appendChild(arrow);
  }
}

function buildLabels(
  item: ItemSnapshot<"axes2d">,
  viewport: Viewport2D,
  overlay: HTMLDivElement
): SvgAxesLabel[] {
  if (!item.labels) return [];

  const tickStep = getTickStep(item.tickStep, viewport);
  const labels: SvgAxesLabel[] = [];
  const axes: AxisKey[] = ["x", "y"];

  for (const axis of axes) {
    if (item[axis] === false) continue;

    const range = getAxisRange(axis, item[axis], viewport);
    const base = axis === "x" ? item.origin.y : item.origin.x;
    const crossing = axis === "x" ? item.origin.x : item.origin.y;
    for (const tick of buildTickPositions(range, tickStep, [
      crossing,
      ...arrowEndSkips(range, item.arrows),
    ])) {
      const { wrapper } = createAxisTickLabel(item, axis, tick, tickStep);
      wrapper.style.position = "absolute";
      overlay.appendChild(wrapper);
      labels.push({
        wrapper,
        world: axis === "x" ? { x: tick, y: base } : { x: base, y: tick },
      });
    }
  }

  return labels;
}

function rebuild(
  item: ItemSnapshot<"axes2d">,
  viewport: Viewport2D,
  container: SvgItemContainer
): SvgAxesLabel[] {
  container.g.replaceChildren();
  container.overlay.replaceChildren();
  if (!item.visible) return [];

  buildAxis("x", item, viewport, container.g);
  buildAxis("y", item, viewport, container.g);
  return buildLabels(item, viewport, container.overlay);
}

export const axes2dSvgRenderer: SvgItemRenderer<"axes2d"> = {
  create() {
    return { kind: "axes2d", labels: [], layoutKey: null };
  },

  update(_item, obj) {
    obj.layoutKey = null;
  },

  layout(item, obj, ctx) {
    const xRange = getAxisRange("x", item.x, ctx.viewport);
    const yRange = getAxisRange("y", item.y, ctx.viewport);
    const tickStep = getTickStep(item.tickStep, ctx.viewport);
    const layoutKey = JSON.stringify({
      xRange,
      yRange,
      tickStep,
      worldPerPixel: ctx.viewport.worldPerPixel,
      origin: { x: item.origin.x, y: item.origin.y },
      arrows: item.arrows,
      labels: item.labels,
      labelClassName: item.labelClassName,
      labelStyle: item.labelStyle,
      visible: item.visible,
    });
    if (layoutKey !== obj.layoutKey) {
      obj.labels = rebuild(item, ctx.viewport, ctx.container);
      obj.layoutKey = layoutKey;
    }

    // Labels are HTML, outside the SVG's viewBox mapping, so their screen
    // positions move with every pan even when the key is unchanged.
    for (const label of obj.labels) {
      const screen = ctx.viewport.worldToScreen(vec2(label.world.x, label.world.y));
      label.wrapper.style.left = `${screen.x}px`;
      label.wrapper.style.top = `${screen.y}px`;
      label.wrapper.style.transform = "translate(-50%, -50%)";
    }
  },

  dispose(_obj, container) {
    container.g.replaceChildren();
    container.overlay.replaceChildren();
  },
};

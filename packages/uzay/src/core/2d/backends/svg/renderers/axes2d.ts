import type { ItemSnapshot } from "../../../types/item-registry";
import type { Viewport2D } from "../../../types/view-context";
import {
  BASE_TICK_HALF_LENGTH_PX,
  BASE_ARROW_LENGTH_PX,
  BASE_ARROW_HALF_WIDTH_PX,
  buildTickPositions,
  getAxisRange,
  getTickStep,
  type AxisKey,
} from "../../../math/axes-math";
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

  const line = svgEl("line");
  setAttrs(
    line,
    axis === "x"
      ? { x1: range[0], y1: 0, x2: range[1], y2: 0 }
      : { x1: 0, y1: range[0], x2: 0, y2: range[1] }
  );
  applyStrokePx(line, item.color, item.thickness);
  g.appendChild(line);

  if (item.tickmarks) {
    const tickStep = getTickStep(item.tickStep, viewport);
    const half = item.thickness * BASE_TICK_HALF_LENGTH_PX * wpp;
    const parts: string[] = [];
    for (const tick of buildTickPositions(range, tickStep)) {
      parts.push(
        axis === "x"
          ? `M ${tick} ${-half} L ${tick} ${half}`
          : `M ${-half} ${tick} L ${half} ${tick}`
      );
    }
    const ticks = svgEl("path");
    ticks.setAttribute("d", parts.join(" "));
    applyStrokePx(ticks, item.color, item.thickness);
    g.appendChild(ticks);
  }

  if (item.arrows) {
    // Unit arrow pointing along its axis: tip at (1, 0) / (0, 1), base at the
    // origin, scaled into pixel-sized world units with the BASE at the axis
    // endpoint so ticks at integer positions stay clear of the tip.
    const lengthWorld = item.thickness * BASE_ARROW_LENGTH_PX * wpp;
    const halfWidthWorld = item.thickness * BASE_ARROW_HALF_WIDTH_PX * wpp;
    const arrow = svgEl("path");
    arrow.setAttribute(
      "d",
      axis === "x" ? "M 1 0 L 0 0.5 L 0 -0.5 Z" : "M 0 1 L 0.5 0 L -0.5 0 Z"
    );
    const translate =
      axis === "x" ? `translate(${range[1]} 0)` : `translate(0 ${range[1]})`;
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
    for (const tick of buildTickPositions(range, tickStep)) {
      const { wrapper } = createAxisTickLabel(item, axis, tick, tickStep);
      wrapper.style.position = "absolute";
      overlay.appendChild(wrapper);
      labels.push({
        wrapper,
        world: axis === "x" ? { x: tick, y: 0 } : { x: 0, y: tick },
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
      const screen = ctx.viewport.worldToScreen(label.world);
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

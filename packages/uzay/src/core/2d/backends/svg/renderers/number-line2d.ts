import type { ItemSnapshot } from "../../../types/item-registry";
import type { Viewport2D } from "../../../types/view-context";
import { vec2, type Vec2 } from "../../../../shared/types/vec2";
import { arrowEndSkips, buildTickPositions } from "../../../math/axes-math";
import {
  NUMBER_LINE_LABEL_OFFSET_PX,
  getNumberLineTickStep,
  numberLineNormal,
  numberLineValueToWorld,
} from "../../../math/number-line-math";
import { hasArrowAt } from "../../../../shared/types/arrows";
import { createNumberLineTickLabel } from "../../../overlay-dom";
import type {
  SvgAxesLabel,
  SvgItemContainer,
  SvgItemRenderer,
} from "./shared";
import { applyStrokePx, cssColor, setAttrs, svgEl } from "./shared";

// Like axes2d, everything (tick spacing, ornament sizes, label offsets)
// depends on the viewport, so the item builds in layout() and rebuilds when
// its layout key changes.

function valueToWorld(item: ItemSnapshot<"numberline2d">, value: number): Vec2 {
  return numberLineValueToWorld(item.position, item.angle, item.scale, value);
}

function rebuild(
  item: ItemSnapshot<"numberline2d">,
  viewport: Viewport2D,
  container: SvgItemContainer
): SvgAxesLabel[] {
  container.g.replaceChildren();
  container.overlay.replaceChildren();
  if (!item.visible) return [];

  const wpp = viewport.worldPerPixel;
  const normal = numberLineNormal(item.angle);
  const start = valueToWorld(item, item.range[0]);
  const end = valueToWorld(item, item.range[1]);
  const step = getNumberLineTickStep(item.tickStep, viewport, item.scale);

  const line = svgEl("line");
  setAttrs(line, { x1: start.x, y1: start.y, x2: end.x, y2: end.y });
  applyStrokePx(line, item.color, item.thickness);
  container.g.appendChild(line);

  const skip = arrowEndSkips(item.range, item.arrows);

  if (item.tickmarks) {
    const half = (item.tickLength / 2) * wpp;
    const parts: string[] = [];
    for (const value of buildTickPositions(item.range, step, skip)) {
      const p = valueToWorld(item, value);
      const a = p.add(normal.scale(half));
      const b = p.sub(normal.scale(half));
      parts.push(`M ${a.x} ${a.y} L ${b.x} ${b.y}`);
    }
    const ticks = svgEl("path");
    ticks.setAttribute("d", parts.join(" "));
    applyStrokePx(ticks, item.color, item.thickness);
    container.g.appendChild(ticks);
  }

  // Unit arrows scaled to pixel-sized world units, base at the endpoint, tip
  // extending outward, rotated to the line's direction.
  const lengthWorld = item.headLength * wpp;
  const halfWidthWorld = (item.headWidth / 2) * wpp;
  const angleDeg = (item.angle * 180) / Math.PI;
  const heads: { which: "start" | "end"; at: Vec2; deg: number }[] = [
    { which: "end", at: end, deg: angleDeg },
    { which: "start", at: start, deg: angleDeg + 180 },
  ];
  for (const head of heads) {
    if (!hasArrowAt(item.arrows, head.which)) continue;
    const arrow = svgEl("path");
    arrow.setAttribute("d", "M 1 0 L 0 0.5 L 0 -0.5 Z");
    arrow.setAttribute(
      "transform",
      `translate(${head.at.x} ${head.at.y}) rotate(${head.deg}) scale(${lengthWorld} ${halfWidthWorld * 2})`
    );
    arrow.setAttribute("fill", cssColor(item.color));
    container.g.appendChild(arrow);
  }

  if (!item.labels) return [];

  const labelOffset = normal.scale(-NUMBER_LINE_LABEL_OFFSET_PX * wpp);
  const labels: SvgAxesLabel[] = [];
  for (const value of buildTickPositions(item.range, step, skip)) {
    const world = valueToWorld(item, value).add(labelOffset);
    const { wrapper } = createNumberLineTickLabel(item, value, step);
    wrapper.style.position = "absolute";
    container.overlay.appendChild(wrapper);
    labels.push({ wrapper, world: { x: world.x, y: world.y } });
  }
  return labels;
}

export const numberLine2dSvgRenderer: SvgItemRenderer<"numberline2d"> = {
  create() {
    return { kind: "numberline2d", labels: [], layoutKey: null };
  },

  update(_item, obj) {
    obj.layoutKey = null;
  },

  layout(item, obj, ctx) {
    const step = getNumberLineTickStep(item.tickStep, ctx.viewport, item.scale);
    const layoutKey = JSON.stringify({
      position: { x: item.position.x, y: item.position.y },
      angle: item.angle,
      scale: item.scale,
      range: item.range,
      step,
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

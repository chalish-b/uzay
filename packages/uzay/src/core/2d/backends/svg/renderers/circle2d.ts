import type { ItemSnapshot } from "../../../types/item-registry";
import type { SvgItemRenderer, SvgSceneTypes } from "./shared";
import { applyStrokePx, cssColor, setAttrs, setVisible, svgEl } from "./shared";

const FULL_SPAN_EPSILON = 1e-9;

function isFullSpan(item: ItemSnapshot<"circle2d">): boolean {
  return (
    Math.abs(item.thetaEnd - item.thetaStart) >= Math.PI * 2 - FULL_SPAN_EPSILON
  );
}

function arcPoint(
  item: ItemSnapshot<"circle2d">,
  theta: number
): { x: number; y: number } {
  return {
    x: item.center.x + Math.cos(theta) * item.radius,
    y: item.center.y + Math.sin(theta) * item.radius,
  };
}

// The open arc from thetaStart to thetaEnd as SVG arc commands. Split at the
// midpoint so a span approaching a full turn stays representable (a single
// arc command cannot draw 360°).
function arcD(item: ItemSnapshot<"circle2d">): string {
  const r = item.radius;
  const delta = item.thetaEnd - item.thetaStart;
  const sweep = delta >= 0 ? 1 : 0;
  const start = arcPoint(item, item.thetaStart);
  const mid = arcPoint(item, item.thetaStart + delta / 2);
  const end = arcPoint(item, item.thetaEnd);
  return (
    `M ${start.x} ${start.y} ` +
    `A ${r} ${r} 0 0 ${sweep} ${mid.x} ${mid.y} ` +
    `A ${r} ${r} 0 0 ${sweep} ${end.x} ${end.y}`
  );
}

// A partial span fills as the sector wedge, matching the three backend's
// CircleGeometry fan.
function wedgeD(item: ItemSnapshot<"circle2d">): string {
  return `M ${item.center.x} ${item.center.y} L ${arcD(item).slice(2)} Z`;
}

function shouldShowStroke(item: ItemSnapshot<"circle2d">): boolean {
  return item.strokeThickness > 0 && item.strokeOpacity > 0;
}

function build(
  item: ItemSnapshot<"circle2d">,
  container: { g: SVGGElement }
): Pick<SvgSceneTypes["circle2d"], "fill" | "stroke"> {
  const full = isFullSpan(item);

  let fill: SvgSceneTypes["circle2d"]["fill"];
  if (full) {
    fill = svgEl("circle");
    setAttrs(fill, { cx: item.center.x, cy: item.center.y, r: item.radius });
  } else {
    fill = svgEl("path");
    fill.setAttribute("d", wedgeD(item));
  }
  setAttrs(fill, {
    fill: cssColor(item.color),
    "fill-opacity": item.opacity,
  });
  setVisible(fill, item.visible);
  container.g.appendChild(fill);

  let stroke: SvgSceneTypes["circle2d"]["stroke"] = null;
  if (shouldShowStroke(item)) {
    if (full) {
      stroke = svgEl("circle");
      setAttrs(stroke, { cx: item.center.x, cy: item.center.y, r: item.radius });
    } else {
      stroke = svgEl("path");
      stroke.setAttribute("d", arcD(item));
    }
    applyStrokePx(
      stroke,
      item.strokeColor,
      item.strokeThickness,
      item.strokeOpacity
    );
    setVisible(stroke, item.visible);
    container.g.appendChild(stroke);
  }

  return { fill, stroke };
}

export const circle2dSvgRenderer: SvgItemRenderer<"circle2d"> = {
  create(item, container) {
    const { fill, stroke } = build(item, container);
    return { kind: "circle2d", fill, stroke };
  },

  // The fill element's tag depends on the span (circle vs wedge path), so the
  // simplest correct update is rebuild, like the three backend's geometry swap.
  update(item, obj, container) {
    obj.fill.remove();
    obj.stroke?.remove();
    const { fill, stroke } = build(item, container);
    obj.fill = fill;
    obj.stroke = stroke;
  },

  dispose(obj) {
    obj.fill.remove();
    obj.stroke?.remove();
  },
};

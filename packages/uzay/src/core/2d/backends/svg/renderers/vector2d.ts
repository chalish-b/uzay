import type { ItemSnapshot } from "../../../types/item-registry";
import type { SvgItemRenderer, SvgSceneTypes } from "./shared";
import { applyStrokePx, arrowHeadD, cssColor, setAttrs, setVisible, svgEl } from "./shared";

// Everything is written in world coordinates: the shaft as line endpoints,
// the head as an explicit triangle path recomputed in layout (its size is in
// pixels, so it depends on the zoom). No transforms; plain geometry updates
// repaint reliably, where per-frame nested-transform mutation is exactly the
// spot browsers' SVG invalidation gets flaky.
//
// The head's tip sits at the vector's end and its base extends BACKWARD by
// `headLength` pixels, so the pointy end stays at the mathematical tip.

function apply(
  item: ItemSnapshot<"vector2d">,
  obj: SvgSceneTypes["vector2d"]
): void {
  setAttrs(obj.shaft, {
    x1: item.origin.x,
    y1: item.origin.y,
    x2: item.origin.x + item.vector.x,
    y2: item.origin.y + item.vector.y,
  });
  applyStrokePx(obj.shaft, item.color, item.thickness);
  obj.head.setAttribute("fill", cssColor(item.color));
  setVisible(obj.group, item.visible);
}

export const vector2dSvgRenderer: SvgItemRenderer<"vector2d"> = {
  create(item, container) {
    const group = svgEl("g");
    const shaft = svgEl("line");
    const head = svgEl("path");
    group.appendChild(shaft);
    group.appendChild(head);
    container.g.appendChild(group);

    const obj: SvgSceneTypes["vector2d"] = {
      kind: "vector2d",
      group,
      shaft,
      head,
    };
    apply(item, obj);
    return obj;
  },

  update(item, obj) {
    apply(item, obj);
  },

  layout(item, obj, ctx) {
    const tip = {
      x: item.origin.x + item.vector.x,
      y: item.origin.y + item.vector.y,
    };
    obj.head.setAttribute(
      "d",
      arrowHeadD(
        tip,
        item.vector,
        item.headLength,
        item.headWidth,
        ctx.viewport.worldPerPixel
      )
    );
  },

  dispose(obj) {
    obj.group.remove();
  },
};

import type { ItemSnapshot } from "../../../types/item-registry";
import type { SvgItemRenderer, SvgSceneTypes } from "./shared";
import { applyStrokePx, setAttrs, setVisible, svgEl } from "./shared";

function apply(
  item: ItemSnapshot<"line2d">,
  obj: SvgSceneTypes["line2d"]
): void {
  setAttrs(obj.line, {
    x1: item.start.x,
    y1: item.start.y,
    x2: item.end.x,
    y2: item.end.y,
  });
  applyStrokePx(obj.line, item.color, item.thickness, item.opacity);
  setVisible(obj.line, item.visible);
}

export const line2dSvgRenderer: SvgItemRenderer<"line2d"> = {
  create(item, container) {
    const line = svgEl("line");
    container.g.appendChild(line);
    const obj: SvgSceneTypes["line2d"] = { kind: "line2d", line };
    apply(item, obj);
    return obj;
  },

  update(item, obj) {
    apply(item, obj);
  },

  dispose(obj) {
    obj.line.remove();
  },
};

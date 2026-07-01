import type { ItemSnapshot } from "../../../types/item-registry";
import { sampleParametricPoints } from "../../../math/parametric-sampling";
import type { SvgItemRenderer, SvgSceneTypes } from "./shared";
import { applyStrokePx, polylinePathD, setVisible, svgEl } from "./shared";

function apply(
  item: ItemSnapshot<"parametricfunction2d">,
  obj: SvgSceneTypes["parametricfunction2d"]
): void {
  obj.path.setAttribute("d", polylinePathD(sampleParametricPoints(item)));
  applyStrokePx(obj.path, item.color, item.thickness, item.opacity);
  setVisible(obj.path, item.visible);
}

export const parametricFunction2dSvgRenderer: SvgItemRenderer<"parametricfunction2d"> =
  {
    create(item, container) {
      const path = svgEl("path");
      container.g.appendChild(path);
      const obj: SvgSceneTypes["parametricfunction2d"] = {
        kind: "parametricfunction2d",
        path,
      };
      apply(item, obj);
      return obj;
    },

    update(item, obj) {
      apply(item, obj);
    },

    dispose(obj) {
      obj.path.remove();
    },
  };

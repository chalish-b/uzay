import type { ViewBackend2D } from "../../backend";
import type { ItemId, ItemKind } from "../../types/item-registry";
import type { Viewport2D } from "../../types/view-context";
import {
  SVG_NS,
  svgRendererRegistry,
  type SvgItemContainer,
  type SvgSceneTypes,
} from "./renderers";

// Fixed stacking layers replacing the three backend's z offsets: within an
// SVG, paint order is document order.
const LAYER_ORDER = ["grid", "region", "default", "point"] as const;
type LayerName = (typeof LAYER_ORDER)[number];

const KIND_LAYER: Partial<Record<ItemKind, LayerName>> = {
  grid2d: "grid",
  region2d: "region",
  circle2d: "region",
  point2d: "point",
};

// The SVG backend: items render as SVG elements under a world-coordinate
// viewBox (pan/zoom is a viewBox update), labels as HTML in an overlay layer.
export const svgBackend: ViewBackend2D<SvgSceneTypes, SvgItemContainer> = {
  mount(host: HTMLElement) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.style.position = "absolute";
    svg.style.inset = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.display = "block";
    // The viewBox aspect always matches the container's, so no scaling policy
    // is ever exercised; "none" keeps rounding from letterboxing.
    svg.setAttribute("preserveAspectRatio", "none");

    // World coordinates in, screen out: the flip makes world +y point up.
    const flip = document.createElementNS(SVG_NS, "g");
    flip.setAttribute("transform", "scale(1,-1)");
    svg.appendChild(flip);

    const layers = {} as Record<LayerName, SVGGElement>;
    for (const name of LAYER_ORDER) {
      const layer = document.createElementNS(SVG_NS, "g");
      layer.dataset.layer = name;
      flip.appendChild(layer);
      layers[name] = layer;
    }

    const overlayLayer = document.createElement("div");
    overlayLayer.style.position = "absolute";
    overlayLayer.style.inset = "0";
    overlayLayer.style.overflow = "hidden";
    overlayLayer.style.pointerEvents = "none";

    host.appendChild(svg);
    host.appendChild(overlayLayer);

    let lastViewBox = "";

    return {
      eventTarget: svg,
      renderers: svgRendererRegistry,

      createItemContainer(id: ItemId, kind: ItemKind): SvgItemContainer {
        const g = document.createElementNS(SVG_NS, "g");
        g.dataset.itemId = id;
        layers[KIND_LAYER[kind] ?? "default"].appendChild(g);

        const overlay = document.createElement("div");
        overlay.style.position = "absolute";
        overlay.style.inset = "0";
        overlay.style.pointerEvents = "none";
        overlayLayer.appendChild(overlay);

        return { g, overlay };
      },

      removeItemContainer(_id: ItemId, container: SvgItemContainer): void {
        container.g.remove();
        container.overlay.remove();
      },

      setItemVisible(container: SvgItemContainer, visible: boolean): void {
        container.g.style.display = visible ? "" : "none";
        container.overlay.style.display = visible ? "" : "none";
      },

      // Browser hit-testing, top to bottom, skipping non-hittable items the
      // same way the three backend's raycast loop does.
      hitTest(
        event: PointerEvent,
        isHittable: (id: ItemId) => boolean
      ): ItemId | null {
        const els = document.elementsFromPoint(event.clientX, event.clientY);
        const seen = new Set<ItemId>();
        for (const el of els) {
          if (!svg.contains(el)) continue;
          const itemEl = el.closest<SVGGElement>("[data-item-id]");
          if (!itemEl) continue;
          const itemId = itemEl.dataset.itemId as ItemId;
          if (seen.has(itemId)) continue;
          seen.add(itemId);
          if (isHittable(itemId)) return itemId;
        }
        return null;
      },

      resize(): void {
        // The SVG sizes itself via CSS; the viewBox follows in syncCamera.
      },

      syncCamera(viewport: Viewport2D): void {
        const { left, right, bottom, top } = viewport.visibleWorldBounds;
        // The flip maps world (x, y) to (x, -y), so the world's top edge is
        // the viewBox's smallest y.
        const viewBox = `${left} ${-top} ${right - left} ${top - bottom}`;
        if (viewBox !== lastViewBox) {
          svg.setAttribute("viewBox", viewBox);
          lastViewBox = viewBox;
        }
      },

      present(): void {
        // SVG elements update in place; there is no frame to flush.
      },

      dispose(): void {
        svg.remove();
        overlayLayer.remove();
      },
    };
  },
};

import katex from "katex";
import type { ItemSnapshot } from "./types/item-registry";
import {
  anchorToTranslate,
  type OverlayAnchor,
} from "../shared/types/overlay";
import { formatTick, type AxisKey } from "./math/axes-math";
import { NUMBER_LINE_LABEL_OFFSET_PX } from "./math/number-line-math";

// DOM construction and styling for the HTML pieces of a 2D scene (overlay2d
// content, axis tick labels). Backends position the produced elements their
// own way; everything about the elements' content and look lives here.

export function applyOverlay2DElementStyles(
  element: HTMLDivElement,
  item: ItemSnapshot<"overlay2d">
): void {
  if (item.format === "latex") {
    element.innerHTML = katex.renderToString(item.content, {
      throwOnError: false,
    });
  } else {
    element.textContent = item.content;
  }

  element.className = item.className;
  element.style.cssText = item.style;
  element.style.visibility = item.visible ? "visible" : "hidden";
  element.style.pointerEvents = item.pointerEvents;
  if (!element.style.zIndex) {
    element.style.zIndex = "10";
  }

  const offsetX = item.offset.x;
  const offsetY = item.offset.y;
  const anchorTranslate = anchorToTranslate(item.anchor);
  element.style.transform = `${anchorTranslate} translate(${offsetX}px, ${offsetY}px)`;
}

// Renderer requirements, always applied regardless of user styling.
const AXIS_LABEL_BASE_STYLE = [
  "line-height: 1",
  "white-space: nowrap",
  "pointer-events: none",
].join(";");

// The default look, tuned for the library's dark-canvas defaults like every
// other item color. Applied only when the user provides neither labelStyle
// nor labelClassName; either one replaces this block entirely. Inline
// defaults would otherwise outrank any class, making CSS theming impossible.
const AXIS_LABEL_DEFAULT_STYLE = [
  "color: rgba(255, 255, 255, 0.72)",
  "font-size: 12px",
  "font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  "text-shadow: 0 1px 2px black, 0 0 4px black",
].join(";");

// A tick label as a wrapper + inner element pair: the wrapper is what the
// backend positions at the tick's world point (its center lands on the
// point), the inner element carries the text, the user styling, and an
// optional transform that pushes it clear of the line it labels.
function createTickLabel(
  text: string,
  styling: { labelClassName: string; labelStyle: string },
  elementTransform: string
): { wrapper: HTMLDivElement; element: HTMLDivElement } {
  const wrapper = document.createElement("div");
  wrapper.style.width = "max-content";
  wrapper.style.zIndex = "0";

  const element = document.createElement("div");
  element.textContent = text;
  element.className = styling.labelClassName;
  element.style.cssText =
    styling.labelStyle || styling.labelClassName
      ? `${AXIS_LABEL_BASE_STYLE};${styling.labelStyle}`
      : `${AXIS_LABEL_BASE_STYLE};${AXIS_LABEL_DEFAULT_STYLE}`;
  if (elementTransform) element.style.transform = elementTransform;
  wrapper.appendChild(element);

  return { wrapper, element };
}

// The unit direction a label box extends away from its anchored edge, in
// screen axes (y down). Scaled by a clearance, it pushes the box clear of
// the line its tick sits on.
const ANCHOR_AWAY_DIR: Record<OverlayAnchor, [number, number]> = {
  center: [0, 0],
  top: [0, 1],
  bottom: [0, -1],
  left: [1, 0],
  right: [-1, 0],
  "top-left": [1, 1],
  "top-right": [-1, 1],
  "bottom-left": [1, -1],
  "bottom-right": [-1, -1],
};

// The element transform for a tick label anchored at its tick's world point:
// the anchor translate plus a pixel push away from the line.
function anchorClearanceTransform(
  anchor: OverlayAnchor,
  clearancePx: number
): string {
  const [dx, dy] = ANCHOR_AWAY_DIR[anchor];
  return `${anchorToTranslate(anchor)} translate(${dx * clearancePx}px, ${dy * clearancePx}px)`;
}

const AXIS_LABEL_CLEARANCE_PX = 10;

// Axis tick label, pushed clear of its axis on the side labelAnchor picks
// (per axis, x defaulting to "top" and y to "right").
export function createAxisTickLabel(
  item: ItemSnapshot<"axes2d">,
  axis: AxisKey,
  tick: number,
  tickStep: number
): { wrapper: HTMLDivElement; element: HTMLDivElement } {
  const anchor =
    axis === "x"
      ? (item.labelAnchor.x ?? "top")
      : (item.labelAnchor.y ?? "right");
  return createTickLabel(
    formatTick(tick, tickStep),
    item,
    anchorClearanceTransform(anchor, AXIS_LABEL_CLEARANCE_PX)
  );
}

// Number line tick label. With labelAnchor "auto" the backends position the
// wrapper at an already offset world point (pushed off the line along its
// normal), so the element just centers on it; an explicit anchor places the
// wrapper on the line and pushes here instead, like axes2d.
export function createNumberLineTickLabel(
  item: ItemSnapshot<"numberline2d">,
  value: number,
  tickStep: number
): { wrapper: HTMLDivElement; element: HTMLDivElement } {
  return createTickLabel(
    formatTick(value, tickStep),
    item,
    item.labelAnchor === "auto"
      ? ""
      : anchorClearanceTransform(item.labelAnchor, NUMBER_LINE_LABEL_OFFSET_PX)
  );
}

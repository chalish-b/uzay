import katex from "katex";
import type { ItemSnapshot } from "./types/item-registry";
import { anchorToTranslate } from "../shared/types/overlay";
import { formatTick, type AxisKey } from "./math/axes-math";

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
// point), the inner element carries the text, the user styling, and the
// axis-dependent anchor offset that pushes it clear of the axis line.
export function createAxisTickLabel(
  item: ItemSnapshot<"axes2d">,
  axis: AxisKey,
  tick: number,
  tickStep: number
): { wrapper: HTMLDivElement; element: HTMLDivElement } {
  const wrapper = document.createElement("div");
  wrapper.style.width = "max-content";
  wrapper.style.zIndex = "0";

  const element = document.createElement("div");
  element.textContent = formatTick(tick, tickStep);
  element.className = item.labelClassName;
  element.style.cssText =
    item.labelStyle || item.labelClassName
      ? `${AXIS_LABEL_BASE_STYLE};${item.labelStyle}`
      : `${AXIS_LABEL_BASE_STYLE};${AXIS_LABEL_DEFAULT_STYLE}`;
  element.style.transform =
    axis === "x"
      ? `${anchorToTranslate("top")} translate(0px, 10px)`
      : `${anchorToTranslate("right")} translate(-10px, 0px)`;
  wrapper.appendChild(element);

  return { wrapper, element };
}

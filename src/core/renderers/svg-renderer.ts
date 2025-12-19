import { createStore } from "jotai";
import type { BaseItem, ItemId } from "../item";
import { Point2D } from "../items/point2d";
import type { Scene2D } from "../scene";
import { Renderer } from "./renderer";
import type { Store } from "jotai/vanilla/store";

const SVG_NS = "http://www.w3.org/2000/svg";

type SvgElementData = {
  gElement: SVGGElement;
  element: SVGElement;

  // TODO: In the future, add some kind of "hash" based on the item data,
  // so that we can reuse the same element if the item data hasn't changed
};

export type SvgRendererOptions = {
  containerElem: HTMLElement;
};

export class SvgRenderer extends Renderer {
  containerElem: HTMLElement;
  containerSvgElem: SVGElement;

  // Used to store the SVG elements so that we don't have to recreate them on each render
  // On other renderers like ThreeJS that would be stuff like mesh and material data
  // The render function will run a custom diff algorithm to compare the old and new data, and update the elements accordingly
  svgElements: Map<ItemId, SvgElementData> = new Map();

  // This isn't the best practice. The renderer doesn't need to know about the store,
  // or any of the state management stuff. A better way would be is to have Scene2D
  // generate a snapsoht of the scene (resolving the Atoms into plain values) and pass it to the renderer.
  // Since the engine will be responsible for converting the coorindates into screen space as well, that will also be done there.
  // We also create a dummy store here so that the type is not undefined.
  // It will be overridden by the scene's store when the render function is called.
  store: Store = createStore();

  constructor(options: SvgRendererOptions) {
    super();
    this.containerElem = options.containerElem;

    this.containerSvgElem = document.createElementNS(SVG_NS, "svg");
    this.containerSvgElem.setAttribute("width", "100%");
    this.containerSvgElem.setAttribute("height", "100%");
    this.containerElem.appendChild(this.containerSvgElem);
  }

  // TODO: Instead of getting the whole scene, have the Board call some kind of function
  // that gets a snapshot of only the necessary data (items, camera, viewport data etc.) for rendering.
  render(scene: Scene2D) {
    const { items, store } = scene;
    this.store = store;

    console.log("Rendering items:", items);

    // Keeping a list of the items we have rendered so far, and mark them as "rendered".
    // If an item is not seen at the end of the loop, it means it's been removed.
    // This is basically like React's reconciliation algorithm.
    const itemsNotRendered: Set<ItemId> = new Set(items.keys());
    for (const [id, item] of items.entries()) {
      itemsNotRendered.delete(id);

      // This can be a good optimization in the future. But currently it also prevents
      // The initial render from happening. A workaround could be to mark all items as dirty at the start.
      // But it's not necesary right now.
      // if (!item.isDirty) continue;

      if (!this.svgElements.has(id)) {
        this.addSvgElement(item);
      } else {
        this.updateSvgElement(item);
      }
    }

    for (const id of itemsNotRendered) {
      this.removeSvgElement(items.get(id)!);
    }
  }

  addSvgElement(item: BaseItem) {
    let elementData: SvgElementData;
    if (item instanceof Point2D) {
      elementData = this.createPoint2DSvgElement(item);
    } else {
      throw new Error(`Unsupported item type: ${item.constructor.name}`);
    }
    this.containerSvgElem.appendChild(elementData.gElement);
  }

  updateSvgElement(item: BaseItem) {
    if (item instanceof Point2D) {
      this.updatePoint2DSvgElement(item);
    } else {
      throw new Error(`Unsupported item type: ${item.constructor.name}`);
    }
  }

  removeSvgElement(item: BaseItem) {
    const svgElement = this.svgElements.get(item.id);
    if (svgElement) {
      svgElement.gElement.remove();
      this.svgElements.delete(item.id);
    }
  }

  // Item specific functions

  createPoint2DSvgElement(item: Point2D): SvgElementData {
    const gElement = document.createElementNS(SVG_NS, "g");
    const element = document.createElementNS(SVG_NS, "circle");
    gElement.appendChild(element);
    this.svgElements.set(item.id, { gElement, element });
    this.updatePoint2DSvgElement(item);
    return { gElement, element };
  }

  updatePoint2DSvgElement(item: Point2D) {
    const svgElement = this.svgElements.get(item.id);
    if (!svgElement) return;

    // Coordinates are set on the "g" element
    const coords = this.store.get(item.coords);
    svgElement.gElement.setAttribute(
      "transform",
      `translate(${coords.x} ${coords.y})`
    );

    // Styles are set on the inner element
    svgElement.element.setAttribute("r", item.radius.toString());
    svgElement.element.setAttribute("fill", item.color);
    return svgElement;
  }
}

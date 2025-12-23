import { SvgRenderer, type SvgRendererOptions } from "./renderers/svg-renderer";
import type { Renderer } from "./renderers/renderer";
import { Scene2D } from "./scene";
import type { Scene2DOptions } from "./scene";
import type { Vec2 } from "./common-types/vec2";

// Board is the main class that owns the engine (scene) and renderer.
export class Board2D {
  scene: Scene2D;

  // View will hold everything related to the canvas, rendering, camera, input handling etc.
  // A single scene can have multiple views from different angles
  // view: View;

  // Renderer and event manager will belong to the view in the future
  renderer: Renderer;
  eventManager: EventManager;

  // I think "View" (camera) should also belong to the board.
  // But currently it's not necessary.

  isDirty = true;
  isFrameScheduled = false;

  constructor(
    sceneOptions: Scene2DOptions,
    rendererOptions: SvgRendererOptions
  ) {
    this.scene = new Scene2D(sceneOptions);
    this.renderer = new SvgRenderer(rendererOptions);
    this.eventManager = new EventManager(rendererOptions.containerElem);

    // Wire up the event manager
    this.eventManager.addEventHandler(this.handleEvent);

    // Set up the scene to invalidate the board when it's dirty
    this.scene.invalidateScene = this.scheduleFrame;
  }

  // When the scene is invalidated
  scheduleFrame() {
    this.isDirty = true;
    if (this.isFrameScheduled) return;
    this.isFrameScheduled = true;
    requestAnimationFrame(() => {
      this.isFrameScheduled = false;
      if (!this.isDirty) return;
      this.isDirty = false;
      this.renderer.render(this.scene);
    });
  }

  // This is called by the event manager when an event occurs
  // The board will decide what to do with an event based on the scene state
  // It could call the renderer for a "pick" function to see if the event hit any items
  // Or it could directly pass the event to the scene to handle.
  handleEvent(event: PointerEvent) {
    console.log("Event occurred:", event);
  }
}

// Currently not needed
// type Board2DEvent = {
//   event: PointerEvent;
//   type: "pointerDown" | "pointerMove" | "pointerUp";
//   pointerId: number;
//   screenPos: Vec2;
// };

class EventManager {
  containerElem: HTMLElement;
  eventHandlers: Set<(event: PointerEvent) => void> = new Set();

  constructor(containerElem: HTMLElement) {
    this.containerElem = containerElem;

    // Attach event listeners to the container element
    // In the future, we could have more complicated event management for touch events,
    // like zooming and panning with two fingers etc.
    // This is why the event manager is separate from the board.
    // But currently, we just pass the event back to the board.
    this.containerElem.addEventListener("pointerdown", (e) =>
      this.emitGenericEvent(e)
    );
    this.containerElem.addEventListener("pointermove", (e) =>
      this.emitGenericEvent(e)
    );
    this.containerElem.addEventListener("pointerup", (e) =>
      this.emitGenericEvent(e)
    );
  }

  addEventHandler(callback: (event: PointerEvent) => void) {
    this.eventHandlers.add(callback);
  }

  // In the future, we will have more specific emitters for different types of events
  // And we could even create our own format / type to pass between the event manager and the board.
  emitGenericEvent(event: PointerEvent) {
    for (const handler of this.eventHandlers) {
      handler(event);
    }
  }
}

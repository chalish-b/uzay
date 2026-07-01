import type { ItemId, ItemKind, ItemSnapshot } from "./types/item-registry";
import type { Viewport2D } from "./types/view-context";

// The render backends a View2D can draw with. The SVG backend renders to an
// <svg> element; the three.js backend renders to a WebGL canvas.
export type Renderer2DKind = "threejs" | "svg";

// Every backend declares an object map: for each item kind, the bundle of
// backend-specific objects (meshes, SVG elements, ...) its renderer keeps per
// item. Entries are tagged with the kind so the view can sanity-check lookups.
export type BackendObjectMap = { [K in ItemKind]: { kind: K } };

// `container` is the item's own container (a per-item group/element the view
// owns through the backend), not the root scene. Renderers only ever
// add/remove their objects on it, which lets the view toggle camera-scoped
// visibility on the whole item without touching the item's own `visible`
// field.
export type ViewLayoutContext2D<Container> = {
  viewport: Viewport2D;
  container: Container;
};

export type ItemRenderer2D<
  K extends ItemKind,
  Objs extends BackendObjectMap,
  Container,
> = {
  create(item: ItemSnapshot<K>, container: Container): Objs[K];
  update(item: ItemSnapshot<K>, obj: Objs[K], container: Container): void;
  layout?(
    item: ItemSnapshot<K>,
    obj: Objs[K],
    ctx: ViewLayoutContext2D<Container>
  ): void;
  dispose?(obj: Objs[K], container: Container): void;
};

export type RendererRegistry2D<Objs extends BackendObjectMap, Container> = {
  [K in ItemKind]: ItemRenderer2D<K, Objs, Container>;
};

// A mounted backend: everything the view needs to draw items and route
// pointer input, with no knowledge of what's behind it.
export type BackendSurface2D<Objs extends BackendObjectMap, Container> = {
  // The element pointer/wheel listeners, pointer capture, and the cursor
  // style attach to: the three backend's canvas or the SVG backend's root.
  eventTarget: HTMLElement | SVGSVGElement;

  renderers: RendererRegistry2D<Objs, Container>;

  // `kind` lets backends place the container by item type, e.g. the SVG
  // backend's fixed stacking layers (grid under regions under curves under
  // points), which three.js expresses as z offsets instead.
  createItemContainer(id: ItemId, kind: ItemKind): Container;
  removeItemContainer(id: ItemId, container: Container): void;

  // Camera-scoped visibility for the whole item, composed with (not
  // overwriting) the item's own `visible` field on its inner objects.
  setItemVisible(container: Container, visible: boolean): void;

  // The topmost hittable item under the pointer, or null. `isHittable`
  // filters per candidate (pointerEvents, camera tags); a non-hittable item
  // does not occlude items beneath it.
  hitTest(
    event: PointerEvent,
    isHittable: (id: ItemId) => boolean
  ): ItemId | null;

  resize(widthPx: number, heightPx: number): void;

  // Make the backend's projection match the viewport. Runs every frame
  // before present(); backends should no-op when nothing changed.
  syncCamera(viewport: Viewport2D): void;

  // Draw the frame. Backends whose objects update in place (DOM) can no-op.
  present(): void;

  dispose(): void;
};

export type ViewBackend2D<Objs extends BackendObjectMap, Container> = {
  mount(host: HTMLElement): BackendSurface2D<Objs, Container>;
};

// The erased form the view works with: item kinds and containers lose their
// backend-specific types at this boundary and stay consistent at runtime.
export type AnyBackendSurface2D = BackendSurface2D<BackendObjectMap, unknown>;
export type AnyViewBackend2D = ViewBackend2D<BackendObjectMap, unknown>;

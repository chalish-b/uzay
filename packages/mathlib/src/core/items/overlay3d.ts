import type { ItemTags } from "../common-types/tags";
import { type Vec3, vec3 } from "../common-types/vec3";
import { type Vec2, vec2 } from "../common-types/vec2";
import type { OverlayAnchor } from "../common-types/overlay";
import type { PointerEvents } from "./point3d";
import { BaseItem } from "../item";
import type { AtomLikeOptions, Field } from "../atom-wrapper";
import type { Scene3D } from "../scene3d";

export type Overlay3DFields = {
  tags: ItemTags;
  position: Vec3;
  text: string;
  offset: Vec2;
  anchor: OverlayAnchor;
  visible: boolean;
  className: string;
  style: string;
  pointerEvents: PointerEvents;
};
export type Overlay3DOptions = AtomLikeOptions<Overlay3DFields>;

function mergeDefaults<Opts extends Overlay3DOptions>(options: Opts) {
  return {
    tags: options.tags ?? [],
    position: options.position ?? vec3(0, 0, 0),
    text: options.text ?? "",
    offset: options.offset ?? vec2(0, 0),
    anchor: options.anchor ?? "center",
    visible: options.visible ?? true,
    className: options.className ?? "",
    style: options.style ?? "",
    pointerEvents: options.pointerEvents ?? "none",
  };
}

export class Overlay3D<Opts extends Overlay3DOptions = {}> extends BaseItem<
  Overlay3DFields,
  "overlay3d"
> {
  kind = "overlay3d" as const;

  tags: Field<ItemTags, "tags", Opts>;
  position: Field<Vec3, "position", Opts>;
  text: Field<string, "text", Opts>;
  offset: Field<Vec2, "offset", Opts>;
  anchor: Field<OverlayAnchor, "anchor", Opts>;
  visible: Field<boolean, "visible", Opts>;
  className: Field<string, "className", Opts>;
  style: Field<string, "style", Opts>;
  pointerEvents: Field<PointerEvents, "pointerEvents", Opts>;

  constructor(scene: Scene3D, options: Opts & Overlay3DOptions = {} as any) {
    super();
    const opts = mergeDefaults(options);

    this.tags = scene.atomize(opts.tags) as any;
    this.position = scene.atomize(opts.position) as any;
    this.text = scene.atomize(opts.text) as any;
    this.offset = scene.atomize(opts.offset) as any;
    this.anchor = scene.atomize(opts.anchor) as any;
    this.visible = scene.atomize(opts.visible) as any;
    this.className = scene.atomize(opts.className) as any;
    this.style = scene.atomize(opts.style) as any;
    this.pointerEvents = scene.atomize(opts.pointerEvents) as any;
    this.addAtomFields(
      this.tags,
      this.position,
      this.text,
      this.offset,
      this.anchor,
      this.visible,
      this.className,
      this.style,
      this.pointerEvents
    );
  }

  getItemSnapshot() {
    return {
      id: this.id,
      kind: this.kind,
      isDirty: this.isDirty,
      tags: this.tags.get(),
      position: this.position.get(),
      text: this.text.get(),
      offset: this.offset.get(),
      anchor: this.anchor.get(),
      visible: this.visible.get(),
      className: this.className.get(),
      style: this.style.get(),
      pointerEvents: this.pointerEvents.get(),
    };
  }

  getCursorState() {
    return null;
  }
}

import type { AtomLikeOptions, Field } from "./atom-wrapper";
import { vec3, type Vec3 } from "./common-types/vec3";
import type { Scene3D } from "./scene3d";
import { BaseItem } from "./item";

type CameraProjection = "perspective" | "orthogonal";
type CameraControls = "orbit" | "pan";

export type Camera3DFields = {
  position: Vec3;
  lookAt: Vec3;
  projection: CameraProjection;
  controls: CameraControls;
  fov: number;
  near: number;
  far: number;
}

export type Camera3DOptions = AtomLikeOptions<Camera3DFields>;

function mergeDefaults<Opts extends Camera3DOptions>(options: Opts) {
  return {
    position: options.position ?? vec3(10, 10, 10),
    lookAt: options.lookAt ?? vec3(0, 0, 0),
    projection: options.projection ?? "perspective",
    controls: options.controls ?? "orbit",
    fov: options.controls ?? 90,
    near: options.near ?? 0.1,
    far: options.far ?? 1000,
  };
}

export class Camera3D<Opts extends Camera3DOptions = {}> extends BaseItem<Camera3DFields, "camera3d"> {
  kind = "camera3d" as const;

  position: Field<Vec3, "position", Opts>;
  lookAt: Field<Vec3, "lookAt", Opts>;
  projection: Field<CameraProjection, "projection", Opts>;
  controls: Field<CameraControls, "controls", Opts>;
  fov: Field<number, "fov", Opts>;
  near: Field<number, "near", Opts>;
  far: Field<number, "far", Opts>;

  constructor(scene: Scene3D, options: Opts & Camera3DOptions = {} as any) {
    super();
    const opts = mergeDefaults(options);

    // Atomize all fields add the atom fields
    this.position = scene.atomize(opts.position) as any;
    this.lookAt = scene.atomize(opts.lookAt) as any;
    this.projection = scene.atomize(opts.projection) as any;
    this.controls = scene.atomize(opts.controls) as any;
    this.fov = scene.atomize(opts.fov) as any;
    this.near = scene.atomize(opts.near) as any;
    this.far = scene.atomize(opts.far) as any;
    this.addAtomFields(
      this.position,
      this.lookAt,
      this.projection,
      this.controls,
      this.fov,
      this.near,
      this.far
    );
  }

  getItemSnapshot() {
    return {
      id: this.id,
      kind: this.kind,
      isDirty: this.isDirty,
      position: this.position.get(),
      lookAt: this.lookAt.get(),
      projection: this.projection.get(),
      controls: this.controls.get(),
      fov: this.fov.get(),
      near: this.near.get(),
      far: this.far.get(),
    }
  }
}

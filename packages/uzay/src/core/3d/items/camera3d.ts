import type { AtomLikeOptions } from "../../shared/atom-wrapper";
import { vec3, type Vec3 } from "../../shared/types/vec3";
import {
  field,
  type ItemHandleFromDefinition,
} from "../../shared/item-definition";
import { defineItem3D } from "../types/define-item";

export type CameraProjection = "perspective" | "orthographic";

export type Camera3DFields = {
  position: Vec3;
  lookAt: Vec3;
  projection: CameraProjection;
  enableOrbit: boolean;
  enablePan: boolean;
  enableZoom: boolean;
  fov: number;
  zoom: number;
  near: number;
  far: number;
}

export type Camera3DOptions = AtomLikeOptions<Camera3DFields>;

export const camera3dDefinition = defineItem3D({
  kind: "camera3d",
  fields: {
    position: field<Vec3>(() => vec3(10, 10, 10)),
    lookAt: field<Vec3>(() => vec3(0, 0, 0)),
    projection: field<CameraProjection>("perspective"),
    enableOrbit: field(true),
    enablePan: field(true),
    enableZoom: field(true),
    fov: field(60),
    zoom: field(1),
    near: field(0.1),
    far: field(1000),
  },
});

export type Camera3D<Opts extends Camera3DOptions = {}> =
  ItemHandleFromDefinition<typeof camera3dDefinition, Opts>;

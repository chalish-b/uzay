import { memo, useContext, useEffect, useRef } from "react";
import type { ItemOptions, ItemInstanceOf } from "../core/common-types/item-registry";
import type { Scene3D } from "../core/scene3d";
import { useScene, CameraRegistryContext } from "./context";
import { isBoundAtom, shallowEqual } from "./utils";

const NON_OPTION_KEYS = new Set(["active", "ref"]);

export type Camera3DProps = ItemOptions<"camera3d"> & {
  active?: boolean;
  ref?: React.Ref<ItemInstanceOf<"camera3d">>;
};

function Camera3DComponent(props: Camera3DProps) {
  const scene = useScene();
  const registry = useContext(CameraRegistryContext);
  const itemRef = useRef<ItemInstanceOf<"camera3d"> | null>(null);
  const prevPropsRef = useRef<Record<string, unknown>>({});

  // Mount: create camera, register; Unmount: unregister, remove
  useEffect(() => {
    const options: Record<string, unknown> = {};
    for (const key of Object.keys(props)) {
      if (!NON_OPTION_KEYS.has(key)) {
        options[key] = (props as any)[key];
      }
    }

    const item = (scene as Scene3D).create("camera3d", options as ItemOptions<"camera3d">);
    itemRef.current = item as ItemInstanceOf<"camera3d">;

    scene.invalidateScene();

    // Capture initial props for diffing
    const initialProps: Record<string, unknown> = {};
    for (const key of Object.keys(options)) {
      initialProps[key] = options[key];
    }
    prevPropsRef.current = initialProps;

    // Register with Scene3DView's camera registry
    registry?.registerCamera(item.id, props.active ?? false);

    return () => {
      registry?.unregisterCamera(item.id);
      scene.remove(item as any);
      itemRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, registry]);

  // When `active` prop changes to true, tell the registry to switch
  useEffect(() => {
    const item = itemRef.current;
    if (!item || !props.active) return;
    registry?.activateCamera(item.id);
  }, [props.active, registry]);

  // Sync ref
  useEffect(() => {
    const ref = props.ref;
    if (!ref) return undefined;
    if (typeof ref === "function") {
      ref(itemRef.current);
      return () => { ref(null); };
    }
    (ref as React.RefObject<ItemInstanceOf<"camera3d"> | null>).current = itemRef.current;
    return () => {
      (ref as React.RefObject<ItemInstanceOf<"camera3d"> | null>).current = null;
    };
  });

  // Update plain-value props that changed
  useEffect(() => {
    const item = itemRef.current;
    if (!item) return;

    const prev = prevPropsRef.current;
    const nextProps: Record<string, unknown> = {};

    for (const key of Object.keys(props)) {
      if (NON_OPTION_KEYS.has(key)) continue;
      const value = (props as any)[key];
      nextProps[key] = value;

      if (isBoundAtom(value)) continue;

      if (!shallowEqual(value, prev[key])) {
        const field = (item as any)[key];
        if (field && typeof field.set === "function") {
          field.set(value);
        }
      }
    }

    prevPropsRef.current = nextProps;
  });

  return null;
}

Camera3DComponent.displayName = "Camera3D";
export const Camera3D = memo(Camera3DComponent);

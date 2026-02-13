import { createContext, useContext, useMemo } from "react";
import type { Scene3D } from "../core/scene3d";
import type { ItemId } from "../core/common-types/item-registry";
import type { Atom, PrimitiveAtom, WritableAtom } from "jotai";
import type { BoundAtom } from "../core/atom-wrapper";

// Public context: provides the Scene3D instance to child components
export const SceneContext = createContext<Scene3D | null>(null);

export function useScene(): Scene3D {
  const scene = useContext(SceneContext);
  if (!scene) {
    throw new Error(
      "useScene() must be used inside a <Scene3DView> component."
    );
  }
  return scene;
}

// Convenience hook: creates a BoundAtom tied to the scene's store.
// Same overloads as scene.atom(). The atom is created once and stable across re-renders.
export function useSceneAtom<Value>(
  initialValue: Value
): BoundAtom<PrimitiveAtom<Value>>;
export function useSceneAtom<Value>(
  read: Parameters<Scene3D["atom"]>[0]
): BoundAtom<Atom<Value>>;
export function useSceneAtom<Value, Args extends unknown[], Result>(
  read: Parameters<Scene3D["atom"]>[0],
  write: Parameters<Scene3D["atom"]>[1]
): BoundAtom<WritableAtom<Value, Args, Result>>;
export function useSceneAtom(...args: any[]): any {
  const scene = useScene();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => (scene.atom as any)(...args), [scene]);
}

// Internal context: Camera3D components register/unregister with Scene3DView
export type CameraRegistry = {
  registerCamera: (id: ItemId, active: boolean) => void;
  unregisterCamera: (id: ItemId) => void;
};

export const CameraRegistryContext = createContext<CameraRegistry | null>(null);

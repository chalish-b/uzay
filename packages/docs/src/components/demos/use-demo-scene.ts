"use client";

import { useEffect, useMemo } from "react";
import { useTheme } from "next-themes";
import { Scene2D, Scene3D } from "uzay";
import { demoTokens, type DemoMode, type DemoTokens } from "./theme";

// The library has no theming support by design; theming is the consumer's
// job. This is our docs-side theme system: a per-scene mode atom plus a t()
// helper that turns a semantic token into a derived color atom. Because every
// uzay item property is an atom, flipping the mode restyles the whole canvas
// in place, with no scene recreation and no lost drag state.

function initialMode(): DemoMode {
  if (typeof document === "undefined") return "light";
  return document.documentElement.classList.contains("dark")
    ? "dark"
    : "light";
}

function createTokenHelper(atom: Scene2D["atom"]) {
  const mode = atom(initialMode());

  const token = <K extends keyof DemoTokens>(key: K) =>
    atom((get) => demoTokens[get(mode)][key]);

  // Escape hatch for one-off colors that don't fit the token palette. Prefer
  // tokens; reach for this only when a demo genuinely needs a custom pair.
  const pick = <V,>(values: Record<DemoMode, V>) =>
    atom((get) => values[get(mode)]);

  return { mode, t: Object.assign(token, { pick }) };
}

export type TokenHelper = ReturnType<typeof createTokenHelper>["t"];

function useThemeSync(mode: ReturnType<typeof createTokenHelper>["mode"]) {
  const { resolvedTheme } = useTheme();
  useEffect(() => {
    if (resolvedTheme === "light" || resolvedTheme === "dark") {
      mode.set(resolvedTheme);
    }
  }, [resolvedTheme, mode]);
}

export function useDemoScene2D<T>(
  create: (scene: Scene2D, t: TokenHelper) => T,
): { scene: Scene2D } & T {
  const { scene, mode, result } = useMemo(() => {
    const scene = new Scene2D();
    const { mode, t } = createTokenHelper(scene.atom);
    return { scene, mode, result: create(scene, t) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useThemeSync(mode);
  return { scene, ...result };
}

export function useDemoScene3D<T>(
  create: (scene: Scene3D, t: TokenHelper) => T,
): { scene: Scene3D } & T {
  const { scene, mode, result } = useMemo(() => {
    const scene = new Scene3D();
    const { mode, t } = createTokenHelper(scene.atom);
    return { scene, mode, result: create(scene, t) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useThemeSync(mode);
  return { scene, ...result };
}

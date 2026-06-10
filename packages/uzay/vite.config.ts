import { defineConfig } from "vite";

export default defineConfig({
  // The root tsconfig.json is solution-style (no compilerOptions), so esbuild
  // can't pick up the jsx mode from it and falls back to the classic
  // transform, which emits React.createElement against a global React.
  // Force the automatic runtime (react/jsx-runtime, already in external).
  esbuild: { jsx: "automatic" },
  build: {
    lib: {
      entry: {
        index: "src/index.ts",
        "react/index": "src/react/index.ts",
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: ["three", "react", "react-dom", "react/jsx-runtime", "jotai", "jotai/vanilla", "katex"],
    },
  },
});

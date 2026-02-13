import { defineConfig } from "vite";

export default defineConfig({
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

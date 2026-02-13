import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),
  ],
  resolve: {
    alias: {
      "uzay/react": resolve(__dirname, "../uzay/src/react/index.ts"),
      uzay: resolve(__dirname, "../uzay/src/index.ts"),
    },
  },
});

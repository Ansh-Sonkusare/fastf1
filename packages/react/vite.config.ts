import { resolve } from "node:path";

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "F1React",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["react", "@f1/core"],
    },
  },
});

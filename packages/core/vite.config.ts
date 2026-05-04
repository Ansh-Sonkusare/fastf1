import { resolve } from "node:path";

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "F1Core",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["zod", "quick-lru"],
    },
  },
});

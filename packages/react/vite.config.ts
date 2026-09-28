import { resolve } from "node:path";

import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({ insertTypesEntry: true, exclude: ["**/*.test.ts", "**/*.test.tsx", "src/test/**"] }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "F1React",
      fileName: "index",
      formats: ["es"],
    },
    rollupOptions: {
      external: ["react", "@teakmirror113/f1-core", "effect", "@effect/platform"],
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});

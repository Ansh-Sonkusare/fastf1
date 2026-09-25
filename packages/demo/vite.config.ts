import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const VENDOR_CHUNKS: Record<string, readonly string[]> = {
  react: ["/react/", "/react-dom/", "/scheduler/"],
  effect: ["/effect/", "/@effect/"],
  recharts: ["/recharts/", "/d3-", "/victory-vendor/"],
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          return Object.keys(VENDOR_CHUNKS).find((name) => VENDOR_CHUNKS[name]!.some((p) => id.includes(p)));
        },
      },
    },
  },
});

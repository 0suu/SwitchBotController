import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "", // Empty base path for Electron packaging
  build: {
    outDir: "../../dist_renderer", // Output directory relative to vite.config.ts
    emptyOutDir: true, // Clean the output directory before building
    assetsDir: "assets", // Directory for assets
    rollupOptions: {
      output: {
        format: "cjs" // Use CommonJS format for compatibility
      }
    }
  }
});

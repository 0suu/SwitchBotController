import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const target = process.env.BUILD_TARGET === "web" ? "web" : "electron";
const isWebBuild = target === "web";

export default defineConfig({
  plugins: [react()],
  base: isWebBuild ? "/" : "", // Empty base path for Electron packaging
  build: {
    outDir: isWebBuild ? "../../dist" : "../../dist_renderer", // Output directory relative to vite.config.ts
    emptyOutDir: true, // Clean the output directory before building
    assetsDir: "assets", // Directory for assets
    rollupOptions: isWebBuild
      ? undefined
      : {
          output: {
            format: "cjs" // Use CommonJS format for compatibility
          }
        }
  }
});

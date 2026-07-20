import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = path.resolve(import.meta.dirname, "../..");

export default defineConfig({
  envDir: rootDir,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: "index",
    },
    sourcemap: true,
    rolldownOptions: {
      external: ["react", "react-dom", "ai", "@ai-sdk/react"],
    },
  },
});

import { defineConfig } from "vite";
/// <reference types="vitest" />

export default defineConfig({
  base: "./",
  root: ".",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: "index.html",
      output: {
        entryFileNames: "bundle.js",
        manualChunks: undefined
      }
    }
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.js"],
    coverage: {
      provider: "v8"
    }
  }
});
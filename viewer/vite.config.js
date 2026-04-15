import { defineConfig } from 'vite';
/// <reference types='vitest' />

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'src/main.js',
      output: {
        entryFileNames: 'bundle.js',
        manualChunks: undefined
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8'
    }
  }
});
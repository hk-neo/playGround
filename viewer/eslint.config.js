import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
        document: "readonly",
        window: "readonly",
        HTMLElement: "readonly",
        FileReader: "readonly",
        ArrayBuffer: "readonly",
        DataView: "readonly",
        Uint8Array: "readonly",
        Float32Array: "readonly",
        Blob: "readonly",
        URL: "readonly",
        Image: "readonly",
        HTMLCanvasElement: "readonly",
        CanvasRenderingContext2D: "readonly",
        WebGLRenderingContext: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        ImageData: "readonly",
        ResizeObserver: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        process: "readonly",
        alert: "readonly",
        navigator: "readonly",
        TextDecoder: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
    },
  },
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];
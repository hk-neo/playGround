import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat();

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        ImageData: 'readonly',
        HTMLCanvasElement: 'readonly',
        WebGLRenderingContext: 'readonly',
        WebGL2RenderingContext: 'readonly',
        ArrayBuffer: 'readonly',
        Uint8Array: 'readonly',
        Int16Array: 'readonly',
        Uint16Array: 'readonly',
        Int32Array: 'readonly',
        Uint32Array: 'readonly',
        Float32Array: 'readonly',
        Float64Array: 'readonly',
        DataView: 'readonly',
        TextDecoder: 'readonly',
        Blob: 'readonly',
        URL: 'readonly'
      }
    },
    rules: {
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'NFR-2.2: fetch 사용 금지 - 외부 통신 차단 (HAZ-3.1)' },
        { name: 'XMLHttpRequest', message: 'NFR-2.2: XMLHttpRequest 사용 금지 - 외부 통신 차단 (HAZ-3.1)' },
        { name: 'WebSocket', message: 'NFR-2.2: WebSocket 사용 금지 - 외부 통신 차단 (HAZ-3.1)' }
      ],
      'no-restricted-properties': [
        'error',
        { object: 'navigator', property: 'sendBeacon', message: 'NFR-2.2: sendBeacon 사용 금지 - 외부 통신 차단' }
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['*/presentation/*'],
              message: 'ADR-1: Data/Business/Rendering 계층에서 Presentation 계층 import 금지'
            },
            {
              group: ['*/rendering/*'],
              message: 'ADR-1: Data/Business 계층에서 Rendering 계층 import 금지',
              importNames: ['*']
            }
          ]
        }
      ]
    }
  }
];
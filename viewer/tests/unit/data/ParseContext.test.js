/**
 * @file ParseContext 단위 테스트
 * @description PERF-1: readString 일괄 변환 검증
 */

import { describe, it, expect } from 'vitest';
import { createParseContext } from '../../../src/data/dicomParser/ParseContext.js';
import { TRANSFER_SYNTAX } from '../../../src/data/dicomDictionary.js';

describe('ParseContext', () => {
  function makeContext(uint8Array, syntax) {
    const buf = uint8Array.buffer.slice(
      uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength
    );
    return createParseContext(buf, syntax || TRANSFER_SYNTAX.EXPLICIT_VR_LE, 0);
  }

  it('readString이 올바른 ASCII 문자열을 반환한다', () => {
    const bytes = new Uint8Array([0x44, 0x49, 0x43, 0x4D]); // 'DICM'
    const ctx = makeContext(bytes);
    expect(ctx.readString(4)).toBe('DICM');
  });

  it('readString이 빈 문자열을 반환한다 (length=0)', () => {
    const bytes = new Uint8Array([0x41]);
    const ctx = makeContext(bytes);
    expect(ctx.readString(0)).toBe('');
  });

  it('readUint16이 리틀 엔디안으로 읽는다', () => {
    const bytes = new Uint8Array([0xE0, 0x7F]); // 0x7FE0
    const ctx = makeContext(bytes);
    expect(ctx.readUint16()).toBe(0x7FE0);
  });

  it('readUint32가 리틀 엔디안으로 읽는다', () => {
    const bytes = new Uint8Array([0x01, 0x00, 0x00, 0x00]);
    const ctx = makeContext(bytes);
    expect(ctx.readUint32()).toBe(1);
  });

  it('hasRemaining이 정확하게 동작한다', () => {
    const bytes = new Uint8Array([0x00, 0x00, 0x00, 0x00]);
    const ctx = makeContext(bytes);
    expect(ctx.hasRemaining(4)).toBe(true);
    expect(ctx.hasRemaining(5)).toBe(false);
  });

  it('errors 배열이 초기화되어 있다', () => {
    const bytes = new Uint8Array(4);
    const ctx = makeContext(bytes);
    expect(Array.isArray(ctx.errors)).toBe(true);
    expect(ctx.errors.length).toBe(0);
  });

  it('Implicit VR 리틀 엔디안 모드 설정', () => {
    const bytes = new Uint8Array(8);
    const ctx = createParseContext(bytes.buffer, TRANSFER_SYNTAX.IMPLICIT_VR_LE, 0);
    expect(ctx.isExplicitVR).toBe(false);
    expect(ctx.isLittleEndian).toBe(true);
  });
});
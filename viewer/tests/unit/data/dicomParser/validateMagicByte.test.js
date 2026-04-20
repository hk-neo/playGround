/**
 * @file validateMagicByte 단위 테스트
 * @description DICOM Part 10 매직 바이트 검증 함수에 대한 종합 테스트
 * US-1: TC-1.1 ~ TC-1.4 및 엣지 케이스
 */

import { describe, it, expect } from 'vitest';
import { validateMagicByte } from '../../../../src/data/dicomParser/validateMagicByte.js';
import {
  createMinimalDICOMBuffer,
  createInvalidDICOMBuffer,
  createTooShortBuffer,
  createWrongSignatureBuffer,
} from '../../../helpers/dicomFixtureBuilder.js';

describe('validateMagicByte', () => {
  // TC-1.1: 유효한 DICOM Part 10 파일은 true를 반환한다
  describe('TC-1.1: Valid DICOM Part 10 file', () => {
    it('유효한 DICOM 버퍼를 입력하면 true를 반환한다', () => {
      const buffer = createMinimalDICOMBuffer();
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      expect(buffer.byteLength).toBeGreaterThanOrEqual(132);
      const result = validateMagicByte(buffer);
      expect(result).toBe(true);
    });
  });

  // TC-1.2: 매직 바이트가 없는 파일은 false를 반환한다
  describe('TC-1.2: File without magic byte', () => {
    it('매직 바이트가 없는 버퍼를 입력하면 false를 반환한다', () => {
      const buffer = createInvalidDICOMBuffer();
      expect(buffer).toBeInstanceOf(ArrayBuffer);
      const result = validateMagicByte(buffer);
      expect(result).toBe(false);
    });

    it('매직 바이트 위치가 모두 0x00인 버퍼는 false를 반환한다', () => {
      const buffer = createInvalidDICOMBuffer(256);
      const view = new DataView(buffer);
      // 오프셋 128~131이 모두 0x00인지 확인
      expect(view.getUint8(128)).toBe(0x00);
      expect(view.getUint8(129)).toBe(0x00);
      expect(view.getUint8(130)).toBe(0x00);
      expect(view.getUint8(131)).toBe(0x00);
      expect(validateMagicByte(buffer)).toBe(false);
    });
  });

  // TC-1.3: 빈 파일 또는 132바이트 미만 파일은 false를 반환한다
  describe('TC-1.3: Empty file or under 132 bytes', () => {
    it('기본 크기(64바이트)의 짧은 버퍼는 false를 반환한다', () => {
      const buffer = createTooShortBuffer();
      expect(buffer.byteLength).toBeLessThan(132);
      const result = validateMagicByte(buffer);
      expect(result).toBe(false);
    });

    it('131바이트 버퍼는 false를 반환한다 (경계값 -1)', () => {
      const buffer = createTooShortBuffer(131);
      expect(buffer.byteLength).toBe(131);
      expect(validateMagicByte(buffer)).toBe(false);
    });

    it('0바이트(빈) 버퍼는 false를 반환한다', () => {
      const buffer = createTooShortBuffer(0);
      expect(buffer.byteLength).toBe(0);
      expect(validateMagicByte(buffer)).toBe(false);
    });

    it('1바이트 버퍼는 false를 반환한다', () => {
      const buffer = createTooShortBuffer(1);
      expect(validateMagicByte(buffer)).toBe(false);
    });
  });

  // TC-1.4: 프리앰블은 있으나 시그니처가 다른 경우 false를 반환한다
  describe('TC-1.4: Preamble present but different signature', () => {
    it('잘못된 시그니처(XYZW)가 있는 버퍼는 false를 반환한다', () => {
      const buffer = createWrongSignatureBuffer();
      expect(buffer.byteLength).toBeGreaterThanOrEqual(132);
      const view = new DataView(buffer);
      expect(view.getUint8(128)).toBe(0x58); // X
      expect(view.getUint8(129)).toBe(0x59); // Y
      expect(view.getUint8(130)).toBe(0x5A); // Z
      expect(view.getUint8(131)).toBe(0x57); // W
      expect(validateMagicByte(buffer)).toBe(false);
    });

    it('부분적으로 일치하는 시그니처(DICX)는 false를 반환한다', () => {
      const bytes = new Uint8Array(200);
      bytes[128] = 0x44; // D
      bytes[129] = 0x49; // I
      bytes[130] = 0x43; // C
      bytes[131] = 0x58; // X (M이 아님)
      expect(validateMagicByte(bytes.buffer)).toBe(false);
    });

    it('소문자 dicm 시그니처는 false를 반환한다', () => {
      const bytes = new Uint8Array(200);
      bytes[128] = 0x64; // d
      bytes[129] = 0x69; // i
      bytes[130] = 0x63; // c
      bytes[131] = 0x6d; // m
      expect(validateMagicByte(bytes.buffer)).toBe(false);
    });
  });

  // 엣지 케이스: null 및 undefined 입력
  describe('Edge cases: null and undefined input', () => {
    it('null을 입력하면 false를 반환한다', () => {
      expect(validateMagicByte(null)).toBe(false);
    });

    it('undefined를 입력하면 false를 반환한다', () => {
      expect(validateMagicByte(undefined)).toBe(false);
    });
  });

  // 경계값: 정확히 132바이트, 올바른 매직 바이트
  describe('Boundary: exactly 132 bytes with correct magic', () => {
    it('정확히 132바이트이고 매직 바이트가 올바르면 true를 반환한다', () => {
      const bytes = new Uint8Array(132);
      // 프리앰블은 이미 0으로 초기화됨
      bytes[128] = 0x44; // D
      bytes[129] = 0x49; // I
      bytes[130] = 0x43; // C
      bytes[131] = 0x4D; // M
      const buffer = bytes.buffer;
      expect(buffer.byteLength).toBe(132);
      expect(validateMagicByte(buffer)).toBe(true);
    });
  });

  // 비-ArrayBuffer 타입 입력
  describe('Non-ArrayBuffer inputs', () => {
    it('일반 객체를 입력하면 false를 반환한다', () => {
      expect(validateMagicByte({})).toBe(false);
    });

    it('문자열을 입력하면 false를 반환한다', () => {
      expect(validateMagicByte('DICM')).toBe(false);
    });

    it('숫자를 입력하면 false를 반환한다', () => {
      expect(validateMagicByte(42)).toBe(false);
    });

    it('Uint8Array를 직접 입력하면 false를 반환한다', () => {
      const bytes = new Uint8Array(200);
      bytes[128] = 0x44; // D
      bytes[129] = 0x49; // I
      bytes[130] = 0x43; // C
      bytes[131] = 0x4D; // M
      // Uint8Array는 ArrayBuffer가 아님 (buffer 프로퍼티로 접근해야 함)
      expect(validateMagicByte(bytes)).toBe(false);
    });
  });

  // 순수 함수 검증: 동일 입력에 대해 항상 동일 결과
  describe('Pure function: deterministic output', () => {
    it('동일한 버퍼를 여러 번 검증해도 항상 같은 결과를 반환한다', () => {
      const buffer = createMinimalDICOMBuffer();
      const first = validateMagicByte(buffer);
      const second = validateMagicByte(buffer);
      const third = validateMagicByte(buffer);
      expect(first).toBe(second);
      expect(second).toBe(third);
      expect(first).toBe(true);
    });

    it('유효하지 않은 버퍼도 여러 번 호출 시 일관된 결과를 반환한다', () => {
      const buffer = createInvalidDICOMBuffer();
      expect(validateMagicByte(buffer)).toBe(false);
      expect(validateMagicByte(buffer)).toBe(false);
    });
  });
});

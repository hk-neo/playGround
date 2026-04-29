/**
 * @file ParseContext 팩토리 (FR-1.2, FR-1.3)
 * @module data/dicomParser/ParseContext
 * @description DICOM 파싱 과정의 내부 상태를 관리하는 객체 생성
 * US-1, US-2: 바이트 오더 및 VR 모드 자동 설정
 */

import { TRANSFER_SYNTAX } from '../dicomDictionary.js';

/**
 * @typedef {Object} ParseContext
 * @property {ArrayBuffer} buffer - 원본 ArrayBuffer
 * @property {DataView} dataView - DataView 래퍼 (바이트 오더 인자 전달용)
 * @property {number} offset - 현재 읽기 위치
 * @property {boolean} isLittleEndian - 리틀 엔디안 여부
 * @property {boolean} isExplicitVR - 명시적 VR 여부
 * @property {string} transferSyntaxUID - 전송 구문 UID
 * @property {Array<Object>} errors - 파싱 중 오류/경고 수집 배열
 * @property {function(): number} remaining - 버퍼 끝까지 남은 바이트 수 반환
 * @property {function(): number} readUint16 - 2바이트 부호없는 정수 읽고 offset+2
 * @property {function(): number} readUint32 - 4바이트 부호없는 정수 읽고 offset+4
 * @property {function(): number} readInt16 - 2바이트 부호있는 정수 읽고 offset+2
 * @property {function(number): string} readString - 지정 길이만큼 문자열 읽고 offset 전진
 * @property {function(number): Uint8Array} readBytes - 지정 길이만큼 Uint8Array 읽고 offset 전진
 * @property {function(number): void} advance - offset을 지정량만큼 전진
 * @property {function(number): boolean} hasRemaining - n바이트 이상 남았는지 확인
 */

/**
 * 파싱 컨텍스트를 생성한다.
 * 전송 구문에 따라 바이트 오더와 VR 모드를 자동 설정한다.
 *
 * @param {ArrayBuffer} buffer - 파일 전체 ArrayBuffer
 * @param {string} transferSyntaxUID - 전송 구문 UID
 * @param {number} [startOffset=0] - 시작 오프셋
 * @returns {ParseContext} ParseContext 객체
 * @throws {TypeError} buffer가 null 또는 undefined인 경우 DataView 생성 시 발생
 */
export function createParseContext(buffer, transferSyntaxUID, startOffset = 0) {
  let isLittleEndian = true;
  let isExplicitVR = true;

  if (transferSyntaxUID === TRANSFER_SYNTAX.IMPLICIT_VR_LE) {
    isExplicitVR = false;
    isLittleEndian = true;
  } else if (transferSyntaxUID === TRANSFER_SYNTAX.BIG_ENDIAN) {
    isExplicitVR = true;
    isLittleEndian = false;
  } else {
    // EXPLICIT_VR_LE (기본) - null/undefined/알수없는 UID 모두 기본값
    isExplicitVR = true;
    isLittleEndian = true;
  }

  // TextDecoder 인스턴스 재사용 (성능: 매 호출 시 new 방지)
  const decoder = new TextDecoder('latin1');

  const errors = [];

  // startOffset 검증 (EC-002)
  let offset = startOffset;
  if (typeof startOffset !== "number" || !Number.isFinite(startOffset) || startOffset < 0) {
    errors.push({
      type: "INVALID_START_OFFSET",
      requested: startOffset,
      corrected: 0,
    });
    offset = 0;
  } else if (startOffset > buffer.byteLength) {
    errors.push({
      type: "INVALID_START_OFFSET",
      requested: startOffset,
      corrected: buffer.byteLength,
    });
    offset = buffer.byteLength;
  }

  return {
    buffer,
    dataView: new DataView(buffer),
    offset,
    isLittleEndian,
    isExplicitVR,
    transferSyntaxUID,
    errors,

    /**
     * 버퍼 끝까지 남은 바이트 수 반환 (EC-002: 음수 방지)
     * @returns {number}
     */
    remaining() {
      return Math.max(0, this.buffer.byteLength - this.offset);
    },

    /**
     * 2바이트 부호없는 정수 읽고 offset+2 (NFR-002: 경계 보호)
     * @returns {number}
     */
    readUint16() {
      if (!this.hasRemaining(2)) {
        this.errors.push({
          type: "READ_OVERFLOW",
          offset: this.offset,
          requested: 2,
          available: this.remaining(),
        });
        return 0;
      }
      const val = this.dataView.getUint16(this.offset, this.isLittleEndian);
      this.offset += 2;
      return val;
    },

    /**
     * 4바이트 부호없는 정수 읽고 offset+4 (NFR-002: 경계 보호)
     * @returns {number}
     */
    readUint32() {
      if (!this.hasRemaining(4)) {
        this.errors.push({
          type: "READ_OVERFLOW",
          offset: this.offset,
          requested: 4,
          available: this.remaining(),
        });
        return 0;
      }
      const val = this.dataView.getUint32(this.offset, this.isLittleEndian);
      this.offset += 4;
      return val;
    },

    /**
     * 2바이트 부호있는 정수 읽고 offset+2 (NFR-002: 경계 보호)
     * @returns {number}
     */
    readInt16() {
      if (!this.hasRemaining(2)) {
        this.errors.push({
          type: "READ_OVERFLOW",
          offset: this.offset,
          requested: 2,
          available: this.remaining(),
        });
        return 0;
      }
      const val = this.dataView.getInt16(this.offset, this.isLittleEndian);
      this.offset += 2;
      return val;
    },

    /**
     * Read Int32 at current offset and advance (NFR-002: 경계 보호)
     * @returns {number}
     */
    readInt32() {
      if (!this.hasRemaining(4)) {
        this.errors.push({
          type: "READ_OVERFLOW",
          offset: this.offset,
          requested: 4,
          available: this.remaining(),
        });
        return 0;
      }
      const val = this.dataView.getInt32(this.offset, this.isLittleEndian);
      this.offset += 4;
      return val;
    },

    /**
     * Read Float32 at current offset and advance (NFR-002: 경계 보호)
     * @returns {number}
     */
    readFloat32() {
      if (!this.hasRemaining(4)) {
        this.errors.push({
          type: "READ_OVERFLOW",
          offset: this.offset,
          requested: 4,
          available: this.remaining(),
        });
        return 0;
      }
      const val = this.dataView.getFloat32(this.offset, this.isLittleEndian);
      this.offset += 4;
      return val;
    },

    /**
     * Read Float64 at current offset and advance (NFR-002: 경계 보호)
     * @returns {number}
     */
    readFloat64() {
      if (!this.hasRemaining(8)) {
        this.errors.push({
          type: "READ_OVERFLOW",
          offset: this.offset,
          requested: 8,
          available: this.remaining(),
        });
        return 0;
      }
      const val = this.dataView.getFloat64(this.offset, this.isLittleEndian);
      this.offset += 8;
      return val;
    },

    /**
     * Read string of given length at current offset and advance
     * Uses TextDecoder for safe handling of long strings (HAZ-5.3).
     * @param {number} length
     * @returns {string}
     */
    readString(length) {
      if (length <= 0) return '';
      const bytes = new Uint8Array(this.buffer, this.offset, length);
      this.offset += length;
      // TextDecoder 사용: String.fromCharCode.apply는 긴 배열에서 스택 오버플로우 유발
      return decoder.decode(bytes);
    },

    /**
     * 지정 길이만큼 Uint8Array 읽고 offset 전진 (NFR-002: 경계 보호)
     * @param {number} length
     * @returns {Uint8Array}
     */
    readBytes(length) {
      if (length <= 0) return new Uint8Array(0);
      const bytes = new Uint8Array(this.buffer, this.offset, length);
      this.offset += length;
      return bytes;
    },

    /**
     * Advance offset by given amount.
     * Negative values are rejected to prevent buffer underflow (HAZ-5.3).
     * @param {number} amount
     */
    advance(amount) {
      if (amount < 0) {
        throw new Error('advance() 음수 값 금지: ' + amount);
      }
      this.offset += amount;
    },

    /**
     * n바이트 이상 남았는지 확인
     * @param {number} n
     * @returns {boolean}
     */
    hasRemaining(n) {
      return this.offset + n <= this.buffer.byteLength;
    },
  };
}

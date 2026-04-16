/**
 * @file ParseContext 팩토리 (FR-1.2, FR-1.3)
 * @module data/dicomParser/ParseContext
 * @description DICOM 파싱 과정의 내부 상태를 관리하는 객체 생성
 * US-1, US-2: 바이트 오더 및 VR 모드 자동 설정
 */

import { TRANSFER_SYNTAX } from '../dicomDictionary.js';

/**
 * 파싱 컨텍스트를 생성한다.
 * 전송 구문에 따라 바이트 오더와 VR 모드를 자동 설정한다.
 *
 * @param {ArrayBuffer} buffer - 파일 전체 ArrayBuffer
 * @param {string} transferSyntaxUID - 전송 구문 UID
 * @param {number} [startOffset=0] - 시작 오프셋
 * @returns {Object} ParseContext 객체
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
    // EXPLICIT_VR_LE (기본)
    isExplicitVR = true;
    isLittleEndian = true;
  }

  return {
    buffer,
    dataView: new DataView(buffer),
    offset: startOffset,
    isLittleEndian,
    isExplicitVR,
    transferSyntaxUID,
    errors: [],

    /**
     * remaining bytes from current offset
     * @returns {number}
     */
    remaining() {
      return this.buffer.byteLength - this.offset;
    },

    /**
     * Read Uint16 at current offset and advance
     * @returns {number}
     */
    readUint16() {
      const val = this.dataView.getUint16(this.offset, this.isLittleEndian);
      this.offset += 2;
      return val;
    },

    /**
     * Read Uint32 at current offset and advance
     * @returns {number}
     */
    readUint32() {
      const val = this.dataView.getUint32(this.offset, this.isLittleEndian);
      this.offset += 4;
      return val;
    },

    /**
     * Read Int16 at current offset and advance
     * @returns {number}
     */
    readInt16() {
      const val = this.dataView.getInt16(this.offset, this.isLittleEndian);
      this.offset += 2;
      return val;
    },

    /**
     * Read string of given length at current offset and advance
     * @param {number} length
     * @returns {string}
     */
    readString(length) {
      const bytes = new Uint8Array(this.buffer, this.offset, length);
      this.offset += length;
      return String.fromCharCode.apply(null, bytes);
    },

    /**
     * Read bytes at current offset and advance
     * @param {number} length
     * @returns {Uint8Array}
     */
    readBytes(length) {
      const bytes = new Uint8Array(this.buffer, this.offset, length);
      this.offset += length;
      return bytes;
    },

    /**
     * Advance offset by given amount
     * @param {number} amount
     */
    advance(amount) {
      this.offset += amount;
    },

    /**
     * Check if at least n bytes remain
     * @param {number} n
     * @returns {boolean}
     */
    hasRemaining(n) {
      return this.offset + n <= this.buffer.byteLength;
    },
  };
}

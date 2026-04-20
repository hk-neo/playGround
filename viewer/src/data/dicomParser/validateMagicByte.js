/**
 * @file DICOM 매직 바이트 검증 (FR-1.1, FR-1.2)
 * @module data/dicomParser/validateMagicByte
 * @description DICOM Part 10 파일의 매직 바이트(DICM)를 검증하는 순수 함수
 * US-1: TC-1.1~TC-1.4
 */

import { MAGIC_BYTE_OFFSET, DICOM_MAGIC_BYTE } from './constants.js';

/**
 * DICOM Part 10 파일의 매직 바이트(DICM)를 검증한다.
 * 오프셋 128~131 위치의 4바이트가 'DICM'인지 확인한다.
 *
 * @param {ArrayBuffer} buffer - 파일 전체 ArrayBuffer
 * @returns {boolean} 유효한 DICOM Part 10 파일 여부
 *
 * @example
 * const buffer = await file.arrayBuffer();
 * const isValid = validateMagicByte(buffer); // true 또는 false
 */
export function validateMagicByte(buffer) {
  if (!buffer || !(buffer instanceof ArrayBuffer)) {
    return false;
  }
  if (buffer.byteLength < MAGIC_BYTE_OFFSET + 4) {
    return false;
  }
  const view = new DataView(buffer);
  let magic = '';
  for (let i = MAGIC_BYTE_OFFSET; i < MAGIC_BYTE_OFFSET + 4; i++) {
    magic += String.fromCharCode(view.getUint8(i));
  }
  return magic === DICOM_MAGIC_BYTE;
}

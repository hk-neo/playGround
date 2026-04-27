
/**
 * @file DICOM 매직 바이트 검증 및 범용 매직바이트 검증 (SDS-3.2)
 * @module data/dicomParser/validateMagicByte
 * @description DICOM Part 10 파일의 매직 바이트(DICM) 검증 + 범용 매직바이트 검증
 * US-1: TC-1.1~TC-1.4, SDS-3.2
 */

import { MAGIC_BYTE_OFFSET, DICOM_MAGIC_BYTE } from './constants.js';
import { MAGIC_TABLE, MAGIC_BYTE_ERRORS, GENERIC_MAGIC_MIN_SIZE } from './constants.js';

/**
 * DICOM Part 10 파일의 매직 바이트(DICM)를 검증한다.
 * 오프셋 128~131 위치의 4바이트가 DICM인지 확인한다.
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

/**
 * 범용 매직바이트 검증 함수 (SDS-3.2)
 * 파일 헤더 오프셋 0x00에서 바이트를 읽어 MAGIC_TABLE과 순차 비교한다.
 *
 * @param {ArrayBuffer} buffer - 파일 전체 ArrayBuffer
 * @returns {{ valid: boolean, fileType: string|null, errorCode: string|null, matchedEntry: Object|null }}
 *   - valid: 검증 성공 여부
 *   - fileType: 일치한 파일 타입 (FW/CFG/DLOG) 또는 null
 *   - errorCode: 에러 코드 또는 null
 *   - matchedEntry: 일치한 MAGIC_TABLE 엔트리 또는 null
 *
 * @example
 * const buffer = await file.arrayBuffer();
 * const result = validateGenericMagicByte(buffer);
 * if (result.valid) {
 *   console.log('파일 타입:', result.fileType); // 'FW', 'CFG', 'DLOG'
 * } else {
 *   console.log('에러:', result.errorCode); // 'INVALID_MAGIC_BYTE', ...
 * }
 */
export function validateGenericMagicByte(buffer) {
  // 1. 입력 검증 - null/undefined/잘못된 타입
  if (!buffer || !(buffer instanceof ArrayBuffer)) {
    return {
      valid: false,
      fileType: null,
      errorCode: MAGIC_BYTE_ERRORS.ERROR_FILE_READ_FAILED,
      matchedEntry: null,
    };
  }

  // 2. 최소 파일 크기 검증 (4 Byte)
  if (buffer.byteLength < GENERIC_MAGIC_MIN_SIZE) {
    return {
      valid: false,
      fileType: null,
      errorCode: MAGIC_BYTE_ERRORS.ERROR_FILE_TOO_SMALL,
      matchedEntry: null,
    };
  }

  // 3. 오프셋 0x00에서 최대 4바이트 읽기
  const view = new DataView(buffer);
  const headerLen = 4;
  const header = new Uint8Array(headerLen);
  for (let i = 0; i < headerLen; i++) {
    header[i] = view.getUint8(i);
  }

  // 4. MAGIC_TABLE과 순차 비교
  for (const entry of MAGIC_TABLE) {
    const entryBytes = entry.bytes;
    let match = true;
    for (let j = 0; j < entryBytes.length; j++) {
      if (header[entry.offset + j] !== entryBytes[j]) {
        match = false;
        break;
      }
    }
    if (match) {
      return {
        valid: true,
        fileType: entry.type,
        errorCode: null,
        matchedEntry: entry,
      };
    }
  }

  // 5. 일치하는 시그니처 없음
  return {
    valid: false,
    fileType: null,
    errorCode: MAGIC_BYTE_ERRORS.INVALID_MAGIC_BYTE,
    matchedEntry: null,
  };
}

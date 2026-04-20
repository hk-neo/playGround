/**
 * @file 전송 구문 검증 함수 (FR-1.2, FR-1.5)
 * @module data/dicomParser/validateTransferSyntax
 * @description 전송 구문 UID가 본 시스템에서 지원 가능한지 검증
 * US-2: TC-2.1~TC-2.3, HAZ-5.2 완화
 */

import { SUPPORTED_TRANSFER_SYNTAXES } from '../dicomDictionary.js';

/**
 * 전송 구문 UID가 본 시스템에서 지원 가능한지 검증한다.
 * 지원 전송 구문: Explicit VR Little Endian, Explicit VR Big Endian, Implicit VR Little Endian
 *
 * @param {string} uid - 전송 구문 UID 문자열
 * @returns {boolean} 지원 가능 여부
 *
 * @example
 * validateTransferSyntax('1.2.840.10008.1.2.1'); // true
 * validateTransferSyntax('1.2.840.10008.1.2.4.50'); // false (JPEG)
 */
export function validateTransferSyntax(uid) {
  if (!uid || typeof uid !== 'string') {
    return false;
  }
  return SUPPORTED_TRANSFER_SYNTAXES.has(uid);
}

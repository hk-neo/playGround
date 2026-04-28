/**
 * @file 전송 구문 검증 함수 (FR-1.2)
 * @module data/dicomParser/validateTransferSyntax
 * @description 전송 구문 UID가 본 시스템에서 지원 가능한지 검증하고,
 *              유효한 경우 ParseContext에 VR 모드 및 바이트 오더를 설정한다.
 *              IEC 62304 Class A 준수 - 모든 경로에서 명시적 boolean 반환 보장.
 * 추적: SDS-3.3, FR-1.2.1~FR-1.2.5, HAZ-1.2, RMR-03
 * 테스트: TC-3.3.1 ~ TC-3.3.7, EC-001 ~ EC-002
 */

import { TRANSFER_SYNTAX, SUPPORTED_TRANSFER_SYNTAXES } from '../dicomDictionary.js';
import { ERROR_CODES } from './constants.js';

/**
 * 지원 전송 구문에 따라 ParseContext의 VR 모드와 바이트 오더를 설정한다.
 * @param {Object} parseContext - 파싱 컨텍스트 객체
 * @param {string} transferSyntaxUID - 전송 구문 UID
 */
function configureParseContext(parseContext, transferSyntaxUID) {
  switch (transferSyntaxUID) {
    case TRANSFER_SYNTAX.EXPLICIT_VR_LE:
      parseContext.isExplicitVR = true;
      parseContext.isLittleEndian = true;
      break;
    case TRANSFER_SYNTAX.BIG_ENDIAN:
      parseContext.isExplicitVR = true;
      parseContext.isLittleEndian = false;
      break;
    case TRANSFER_SYNTAX.IMPLICIT_VR_LE:
      parseContext.isExplicitVR = false;
      parseContext.isLittleEndian = true;
      break;
    default:
      break;
  }
}

/**
 * 전송 구문 UID가 본 시스템에서 지원 가능한지 검증한다.
 * 지원 전송 구문: Explicit VR Little Endian, Explicit VR Big Endian, Implicit VR Little Endian
 *
 * IEC 62304 Class A 요구사항:
 * - 모든 실행 경로에서 명시적 boolean 반환 보장
 * - 예외(throw) 발생 없이 안전하게 처리
 *
 * @param {string} transferSyntaxUID - 전송 구문 UID 문자열
 * @param {Object} [parseContext] - 파싱 컨텍스트 객체 (선택)
 * @param {Object} [parseResult] - 파싱 결과 객체 (선택, 에러 기록용)
 * @returns {boolean} 지원 가능 여부
 *
 * @example
 * validateTransferSyntax('1.2.840.10008.1.2.1'); // true
 * validateTransferSyntax('1.2.840.10008.1.2.4.50', ctx, result); // false
 */
export function validateTransferSyntax(transferSyntaxUID, parseContext, parseResult) {
  // [SDS-3.3.1] 입력 null/undefined/빈값/비문자열 방어 (FR-1.2.2, NFR-001)
  if (transferSyntaxUID == null || transferSyntaxUID === '' || typeof transferSyntaxUID !== 'string') {
    _recordError(parseResult, ERROR_CODES.PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX);
    return false;
  }

  // [SDS-3.3.2] 지원 목록에서 UID 검색 (FR-1.2.1)
  const isSupported = SUPPORTED_TRANSFER_SYNTAXES.has(transferSyntaxUID);

  if (isSupported) {
    // [SDS-3.3.3 / FR-1.2.3] ParseContext에 VR 모드 및 바이트 오더 설정
    if (parseContext) {
      configureParseContext(parseContext, transferSyntaxUID);
    }
    return true;
  }

  // 미지원 전송 구문 처리 (FR-1.2.4)
  _recordError(parseResult, ERROR_CODES.PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX);
  return false;
}

/**
 * ParseResult.errors에 에러 코드를 기록한다.
 * @param {Object} parseResult - 파싱 결과 객체
 * @param {string} errorCode - 에러 코드
 */
function _recordError(parseResult, errorCode) {
  if (parseResult && Array.isArray(parseResult.errors)) {
    parseResult.errors.push(errorCode);
  }
}

/**
 * @file DICOM 파싱 오류 처리 함수
 * @module data/dicomParser/handleParseError
 * @description 파싱 오류를 처리하여 사용자 친화적 ErrorResult 반환
 * 추적: FR-1.5, US-5, TC-5.1~TC-5.3, HAZ-5.2
 */

import { ErrorCodes, ERROR_MESSAGES } from './constants.js';

/**
 * 파싱 오류를 처리하여 사용자 친화적 ErrorResult를 반환한다.
 * @param {Error} error - ParseError 또는 일반 Error 객체
 * @returns {{ userMessage: string, debugInfo: string, errorCode: string, severity: string }}
 */
export function handleParseError(error) {
  const errorCode = error.code || ErrorCodes.PARSE_ERR_UNEXPECTED;
  const msgEntry = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES[ErrorCodes.PARSE_ERR_UNEXPECTED];

  // 기본 디버그 정보 (에러 코드 + 메시지만 포함, 내부 구조 노출 금지)
  let debugInfo = errorCode + ': ' + (error.message || String(error));

  // PHI 보호: offset/tag 등 내부 구조는 디버그 모드에서만 추가
  const isDebugMode = (typeof process !== 'undefined'
    && process.env
    && process.env.NODE_ENV === 'development');
  if (isDebugMode && error.context) {
    if (error.context.offset !== undefined) {
      debugInfo += ' at offset ' + error.context.offset;
    }
    if (error.context.tag) {
      debugInfo += ' tag=' + error.context.tag;
    }
  }

  return {
    userMessage: msgEntry.ko,
    debugInfo: debugInfo,
    errorCode: errorCode,
    severity: msgEntry.severity,
  };
}

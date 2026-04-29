/**
 * @file DICOM 파싱 오류 처리 함수
 * @module data/dicomParser/handleParseError
 * @description 파싱 오류를 처리하여 사용자 친화적 ErrorResult 반환
 * 추적: FR-1.5, US-5, TC-5.1~TC-5.3, HAZ-5.2
 */

import { ErrorCodes, ERROR_MESSAGES } from './constants.js';

/**
 * 디버그 모드 여부.
 * 빌드 시점에 Vite가 이 값을 정적으로 대체하여 운영 빌드에서는 항상 false가 됨.
 * 런타임 환경 변수 의존을 제거하여 보안 강화 (SEC-2).
 */
const IS_DEBUG_MODE = import.meta.env?.DEV === true;

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

  // PHI 보호: offset/tag 등 내부 구조는 빌드 시점 결정 디버그 모드에서만 추가
  if (IS_DEBUG_MODE && error.context) {
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

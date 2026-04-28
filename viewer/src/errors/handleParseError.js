/**
 * @file CBVError -> ErrorResult 변환 핸들러
 * @module errors/handleParseError
 * @description CBVError 계열 에러를 ErrorResult 객체로 변환한다.
 * IEC 62304 Class A 준수 - FR-ERR-07
 */

import { ERROR_MESSAGES } from '../data/dicomParser/constants.js';

/**
 * CBVError를 ErrorResult로 변환한다.
 * @param {Error} error - 변환할 에러 (CBVError 계열)
 * @param {string} [severity] - 심각도 오버라이드
 * @returns {{ userMessage: string, debugInfo: string, errorCode: string, severity: string }}
 */
export function handleParseError(error, severity) {
  let userMessage = error.message;
  let debugInfo = '';

  if (error.code && ERROR_MESSAGES[error.code]) {
    const msgDef = ERROR_MESSAGES[error.code];
    userMessage = msgDef.ko || error.message;
    severity = severity || msgDef.severity || 'error';
  } else {
    severity = severity || 'error';
  }

  // debugInfo 구성 (개발 환경에서만 사용)
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development') {
    debugInfo = JSON.stringify({ code: error.code, context: error.context, stack: error.stack });
  }

  return {
    userMessage,
    debugInfo,
    errorCode: error.code,
    severity,
  };
}

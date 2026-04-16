/**
 * @file 파싱 결과 타입 정의 (Factory 함수 + JSDoc)
 * @module types/ParseResult
 */

/**
 * 파싱 오류 결과 항목
 * @typedef {Object} ErrorResult
 * @property {string} userMessage - 사용자용 메시지
 * @property {string} debugInfo - 개발자용 디버그 정보
 * @property {string} errorCode - 에러 코드
 * @property {string} severity - 심각도 (error | warning)
 */

/**
 * 파싱 결과 구조
 * @typedef {Object} ParseResult
 * @property {Object|null} metadata - DICOM 메타데이터 객체
 * @property {ArrayBuffer|null} voxelData - 복셀 데이터
 * @property {ErrorResult[]} errors - 파싱 오류/경고 목록
 * @property {boolean} isValid - 파싱 성공 여부
 */

/**
 * 파싱 결과 객체를 생성한다.
 * @param {Partial<ParseResult>} [overrides={}]
 * @returns {ParseResult}
 */
export function createParseResult(overrides = {}) {
  return {
    metadata: null,
    voxelData: null,
    errors: [],
    isValid: false,
    ...overrides,
  };
}
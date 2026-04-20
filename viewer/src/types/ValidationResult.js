/**
 * @file 검증 결과 타입 정의 (Factory 함수 + JSDoc)
 * @module types/ValidationResult
 */

/**
 * 검증 결과 구조
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - 검증 통과 여부
 * @property {string[]} warnings - 경고 메시지 목록
 * @property {string[]} errors - 오류 메시지 목록
 */

/**
 * 검증 결과 객체를 생성한다.
 * @param {Partial<ValidationResult>} [overrides={}]
 * @returns {ValidationResult}
 */
export function createValidationResult(overrides = {}) {
  return {
    isValid: true,
    warnings: [],
    errors: [],
    ...overrides,
  };
}
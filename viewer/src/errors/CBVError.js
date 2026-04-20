/**
 * @file CBVError - 커스텀 에러 클래스 계층
 * @module errors/CBVError
 * @description SDS-6.1 오류 분류에 따른 에러 클래스 계층
 */

/**
 * CBVError - 기본 에러 클래스
 * @extends Error
 * @property {string} code - 기계적 에러 코드
 * @property {Object} context - 추가 컨텍스트 정보
 */
export class CBVError extends Error {
  /**
   * @param {string} message - 에러 메시지
   * @param {string} code - 기계적 에러 코드
   * @param {Object} [context={}] - 추가 컨텍스트
   */
  constructor(message, code = 'CBV_000', context = {}) {
    super(message);
    this.name = 'CBVError';
    this.code = code;
    this.context = context;
  }
}

/**
 * ParseError - DICOM 파싱 오류 (FR-1.5, HAZ-1.1)
 * @extends CBVError
 */
export class ParseError extends CBVError {
  constructor(message, code = 'PARSE_001', context = {}) {
    super(message, code, context);
    this.name = 'ParseError';
  }
}

/**
 * ValidationError - 데이터 검증 오류 (FR-1.2, FR-4.2)
 * @extends CBVError
 */
export class ValidationError extends CBVError {
  constructor(message, code = 'VALIDATE_001', context = {}) {
    super(message, code, context);
    this.name = 'ValidationError';
  }
}

/**
 * RenderError - 렌더링 오류 (FR-2.5, HAZ-1.3)
 * @extends CBVError
 */
export class RenderError extends CBVError {
  constructor(message, code = 'RENDER_001', context = {}) {
    super(message, code, context);
    this.name = 'RenderError';
  }
}

/**
 * SecurityError - 보안 정책 위반 (FR-5.1, HAZ-3.1)
 * @extends CBVError
 */
export class SecurityError extends CBVError {
  constructor(message, code = 'SECURITY_001', context = {}) {
    super(message, code, context);
    this.name = 'SecurityError';
  }
}

/**
 * MemoryError - 메모리 초과 오류 (FR-1.6, HAZ-5.1)
 * @extends CBVError
 */
export class MemoryError extends CBVError {
  constructor(message, code = 'MEMORY_001', context = {}) {
    super(message, code, context);
    this.name = 'MemoryError';
  }
}
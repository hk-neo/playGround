/**
 * @file CBVError - 커스텀 에러 클래스 계층
 * @module errors/CBVError
 * @description SDS-6.1 오류 분류에 따른 에러 클래스 계층
 * IEC 62304 Class A 준수
 */

/** PHI(보호대상건강정보) 키 목록 - context에서 필터링 대상 */
const PHI_FIELDS = ["patientName", "patientId", "birthDate"];

/**
 * context 객체에서 PHI 필드를 제거한다.
 * @param {Object} ctx - 원본 context
 * @returns {Object} PHI가 제거된 안전한 context
 */
function sanitizeContext(ctx) {
  if (!ctx || typeof ctx !== "object") return {};
  const safe = { ...ctx };
  for (const key of PHI_FIELDS) {
    if (key in safe) {
      delete safe[key];
    }
  }
  return safe;
}

/**
 * CBVError - 모든 커스텀 에러의 기본 클래스
 * @extends Error
 * @property {string} name - 클래스 식별명 (기본값: CBVError)
 * @property {string} code - 기계적 에러 코드 (기본값: CBV_000)
 * @property {Object} context - 추가 컨텍스트 정보 (기본값: {})
 */
export class CBVError extends Error {
  /**
   * @param {string} message - 사용자용 에러 메시지
   * @param {string} [code=CBV_000] - 기계적 에러 코드
   * @param {Object} [context={}] - 추가 컨텍스트
   */
  constructor(message, code = "CBV_000", context = {}) {
    super(message);
    this.name = "CBVError";
    this.code = code;
    this.context = context;
  }
}

/**
 * ParseError - DICOM 파일 파싱 오류 (FR-1.5, HAZ-1.1)
 * @extends CBVError
 * @description 매직 바이트 불일치, 미지원 전송 구문, 필수 태그 누락,
 *              픽셀 데이터 추출 실패, 파일 읽기 실패, 파일 크기 초과,
 *              예상치 못한 파싱 오류
 */
export class ParseError extends CBVError {
  /**
   * @param {string} message - 사용자용 에러 메시지
   * @param {string} [code=PARSE_ERR_UNEXPECTED] - 파싱 에러 코드
   * @param {Object} [context={}] - 추가 컨텍스트
   */
  constructor(message, code = "PARSE_ERR_UNEXPECTED", context = {}) {
    super(message, code, context);
    this.name = "ParseError";
  }
}

/**
 * ValidationError - 데이터 검증 오류 (FR-1.2, FR-4.2)
 * @extends CBVError
 * @description 파일 형식 검증 실패, 데이터 무결성 검증 실패
 */
export class ValidationError extends CBVError {
  /**
   * @param {string} message - 사용자용 에러 메시지
   * @param {string} [code=VALIDATE_001] - 검증 에러 코드
   * @param {Object} [context={}] - 추가 컨텍스트
   */
  constructor(message, code = "VALIDATE_001", context = {}) {
    super(message, code, context);
    this.name = "ValidationError";
  }
}

/**
 * RenderError - 렌더링 오류 (FR-2.5, HAZ-1.3)
 * @extends CBVError
 * @description MPR 뷰포트 렌더링 실패, WL/WW 변환 오류, 캔버스 출력 오류
 */
export class RenderError extends CBVError {
  /**
   * @param {string} message - 사용자용 에러 메시지
   * @param {string} [code=RENDER_001] - 렌더링 에러 코드
   * @param {Object} [context={}] - 추가 컨텍스트
   */
  constructor(message, code = "RENDER_001", context = {}) {
    super(message, code, context);
    this.name = "RenderError";
  }
}

/**
 * SecurityError - 보안 정책 위반 (FR-5.1, HAZ-3.1)
 * @extends CBVError
 * @description PHI 보호 정책 위반, 비인가 데이터 접근 시도
 * @note context에 PHI 필드(patientName, patientId, birthDate) 포함 시 자동 제거
 */
export class SecurityError extends CBVError {
  /**
   * @param {string} message - 사용자용 에러 메시지
   * @param {string} [code=SECURITY_001] - 보안 에러 코드
   * @param {Object} [context={}] - 추가 컨텍스트
   */
  constructor(message, code = "SECURITY_001", context = {}) {
    super(message, code, sanitizeContext(context));
    this.name = "SecurityError";
  }
}

/**
 * MemoryError - 메모리 초과 오류 (FR-1.6, HAZ-5.1)
 * @extends CBVError
 * @description 대용량 파일 로딩 중 메모리 고갈, 볼륨 데이터 구성 중 메모리 부족
 */
export class MemoryError extends CBVError {
  /**
   * @param {string} message - 사용자용 에러 메시지
   * @param {string} [code=MEMORY_001] - 메모리 에러 코드
   * @param {Object} [context={}] - 추가 컨텍스트
   */
  constructor(message, code = "MEMORY_001", context = {}) {
    super(message, code, context);
    this.name = "MemoryError";
  }
}

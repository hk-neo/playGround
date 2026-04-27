/**
 * @file ParseResult 타입 팩토리 - DICOM 파싱 결과 표준화 모듈
 * @module types/ParseResult
 * @description DICOM 파일 파싱 결과를 표준화된 구조로 캡슐화하는 타입 정의 및 팩토리 함수.
 * parseDICOM() 파이프라인의 반환 타입으로 사용되며,
 * 모든 에러 경로에서 동일한 ParseResult 구조를 반환하여
 * 호출측(UiController)이 결과 처리 로직을 단순화한다.
 *
 * 추적성: FR-1.1~FR-1.5, FR-2.3, FR-3.1, FR-5.1 | COMP-1 (DicomParser)
 * IEC 62304 Class A 준수
 */

/**
 * 파싱 오류/경고 항목을 표현하는 타입.
 * UiController(COMP-6)가 사용자용 메시지와 개발자용 디버그 정보를 분리 표시할 수 있도록 설계.
 * IEC 62304 Class A 요구사항에 따라 내부 구조 노출 금지 원칙(FR-4.5) 준수.
 *
 * @typedef {Object} ErrorResult
 * @property {string} userMessage - 사용자에게 표시할 메시지 (한국어, 내부 구조 노출 금지 FR-4.5)
 * @property {string} debugInfo - 개발자용 디버그 정보 (디버그 모드에서만 활용)
 * @property {string} errorCode - PARSE_ERR_* 접두사 에러 코드 (예: PARSE_ERR_INVALID_MAGIC)
 * @property {string} severity - 심각도 등급 ("error" | "warning")
 */

/**
 * DICOM 파싱 결과를 표준화하는 최상위 반환 타입.
 * parseDICOM(file: File) -> ParseResult 인터페이스(COMP-1)의 반환 타입으로 사용.
 * UiController(COMP-6)가 isValid 필드로 정상/오류 분기를 처리하는 계약(Contract) 역할 수행.
 *
 * @typedef {Object} ParseResult
 * @property {Object|null} metadata - DICOM 메타데이터 객체. 환자정보, 영상파라미터 등 포함.
 *   파싱 성공 시에만 할당, 초기 실패 시 null. (FR-2.3)
 * @property {ArrayBuffer|null} voxelData - 3차원 복셀 데이터.
 *   Int16Array/Uint16Array 등 타입 변환 전 원시 ArrayBuffer. 파싱 성공 시에만 할당. (FR-3.1)
 * @property {Array<ErrorResult>} errors - 파싱 오류/경고 목록. 다중 에러 누적 가능.
 *   항상 새 배열 인스턴스 보장 (참조 독립성, CT-2). (FR-1.1~FR-1.5)
 * @property {boolean} isValid - 파싱 전체 성공 여부.
 *   true 조건: severity=error 항목 없음 + metadata!=null + voxelData!=null.
 *   위 조건 중 하나라도 미충족 시 false.
 */

/**
 * 파싱 결과 객체를 생성하는 팩토리 함수.
 * IEC 62304 Class A 단순성 원칙에 따라 new 키워드 없이 순수 객체를 반환하며,
 * spread 연산자를 통해 불변 기본값 + 선택적 덮어쓰기 패턴을 제공한다.
 *
 * 설계 장점:
 * (a) 새로운 프로퍼티 추가 시 기본값만 수정하면 되는 확장성
 * (b) 호출측에서 필요한 필드만 부분 전달하는 편의성
 * (c) 모든 호출 지점에서 동일한 구조 보장하는 일관성
 *
 * CT-2 해결: DEFAULTS를 함수 본문 내에 선언하여 매 호출 시 새 errors 배열 인스턴스 생성.
 *
 * @param {Partial<ParseResult>} [overrides={}] - 덮어쓸 선택적 필드
 * @returns {ParseResult} 파싱 결과 객체
 *
 * @example
 * // 에러 결과 생성
 * createParseResult({
 *   errors: [{ userMessage: "...", debugInfo: "...", errorCode: "PARSE_ERR_INVALID_MAGIC", severity: "error" }],
 *   isValid: false
 * });
 *
 * @example
 * // 성공 결과 생성
 * createParseResult({
 *   metadata: parsedMetadata,
 *   voxelData: extractedVoxelData,
 *   errors: [],
 *   isValid: true
 * });
 */
export function createParseResult(overrides = {}) {
  const DEFAULTS = {
    metadata: null,
    voxelData: null,
    errors: [],
    isValid: false,
  };
  return { ...DEFAULTS, ...overrides };
}
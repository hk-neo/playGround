/**
 * @file DICOM 파서 상수 정의
 * @module data/dicomParser/constants
 * @description SDS-1.1 DICOM 파일 파서에 사용되는 상수 정의
 * IEC 62304 Class A 준수
 * 추적: SAD COMP-1 (DicomParser) | PLAYG-1816
 * 관련 요구사항: FR-1.1, FR-1.2, FR-1.3, FR-1.4, FR-1.5, FR-1.6, FR-2.4, FR-2.5, FR-5.1, FR-5.2, FR-4.5
 */

// ============================================================
// Phase 2.1: DICOM 파일 구조 상수
// ============================================================

/**
 * DICOM 프리앰블 길이 (바이트)
 * @constant {number}
 * @trace FR-1.1, FR-CST-01
 */
export const PREAMBLE_LENGTH = 128;

/**
 * DICOM 매직 바이트 시그니처
 * @constant {string}
 * @trace FR-1.1, FR-CST-02
 */
export const DICOM_MAGIC_BYTE = 'DICM';

/**
 * 매직 바이트 시작 오프셋 (PREAMBLE_LENGTH와 동일)
 * @constant {number}
 * @trace FR-1.1, FR-CST-03
 */
export const MAGIC_BYTE_OFFSET = 128;

/**
 * 최소 DICOM 파일 크기 (프리앰블 128 + 매직 4 = 132바이트)
 * @constant {number}
 * @trace FR-1.6, FR-CST-04
 */
export const DICOM_MIN_FILE_SIZE = 132;

/**
 * 최대 파일 크기 (512MB) - 브라우저 메모리 제약
 * @constant {number}
 * @trace FR-1.4, FR-CST-05, NFR-3
 */
export const MAX_FILE_SIZE = 536_870_912;

/**
 * 최대 태그 순회 수 - 무한 루프 방지
 * @constant {number}
 * @trace FR-2.4, FR-CST-06, HAZ-5.1
 */
export const MAX_TAG_COUNT = 10_000;

/**
 * 최대 시퀀스 중첩 깊이 - 스택 오버플로우 방지
 * @constant {number}
 * @trace FR-2.5, FR-CST-07, HAZ-5.2
 */
export const MAX_SEQUENCE_DEPTH = 10;

/**
 * 파일 메타 정보 그룹 번호
 * @constant {number}
 * @trace FR-2.1, FR-CST-08
 */
export const FILE_META_GROUP = 0x0002;

/**
 * 픽셀 데이터 태그 식별자 (불변 객체)
 * @constant {ReadonlyObject}
 * @trace FR-1.5, FR-CST-09
 */
export const PIXEL_DATA_TAG = Object.freeze({ group: 0x7FE0, element: 0x0010 });

// ============================================================
// Phase 3.1: 에러 코드 사전 (ERROR_CODES)
// ============================================================

/**
 * 범용 매직바이트 검증 테이블 (SDS-3.2)
 * 파일 헤더 오프셋 0x00에서 비교할 시그니처 정의
 * @constant {Array<Object>}
 */
export const MAGIC_TABLE = [
  { bytes: [0x50, 0x4C, 0x59, 0x47], type: 'FW', label: 'FW 바이너리', offset: 0 },
  { bytes: [0x43, 0x46, 0x47], type: 'CFG', label: '설정 파일', offset: 0 },
  { bytes: [0x44, 0x4C, 0x47], type: 'DLOG', label: '데이터 로그', offset: 0 },
];

/**
 * 범용 매직바이트 검증 에러 코드 (SDS-3.2)
 * @constant {Object}
 */
export const MAGIC_BYTE_ERRORS = {
  INVALID_MAGIC_BYTE: 'INVALID_MAGIC_BYTE',
  ERROR_FILE_READ_FAILED: 'ERROR_FILE_READ_FAILED',
  ERROR_FILE_TOO_SMALL: 'ERROR_FILE_TOO_SMALL',
};

/**
 * 범용 매직바이트 검증 최소 파일 크기 (SDS-3.2)
 * @constant {number}
 */
export const GENERIC_MAGIC_MIN_SIZE = 4;

/**
 * DICOM 파싱 에러 코드 (FR-1.5, HAZ-1.1, HAZ-5.2)
 * @constant {Object}
 */
export const ERROR_CODES = {
  CBV_000: 'CBV_000',
  PARSE_ERR_INVALID_MAGIC: 'PARSE_ERR_INVALID_MAGIC',
  PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX: 'PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX',
  PARSE_ERR_MISSING_REQUIRED_TAG: 'PARSE_ERR_MISSING_REQUIRED_TAG',
  PARSE_ERR_PIXEL_DATA_EXTRACTION: 'PARSE_ERR_PIXEL_DATA_EXTRACTION',
  PARSE_ERR_FILE_READ: 'PARSE_ERR_FILE_READ',
  PARSE_ERR_FILE_TOO_LARGE: 'PARSE_ERR_FILE_TOO_LARGE',
  PARSE_ERR_UNEXPECTED: 'PARSE_ERR_UNEXPECTED',
  VALIDATE_001: 'VALIDATE_001',
  RENDER_001: 'RENDER_001',
  SECURITY_001: 'SECURITY_001',
  MEMORY_001: 'MEMORY_001',
};

/**
 * 하위 호환용 ERROR_CODES 별칭
 * @deprecated ERROR_CODES 사용 권장
 * @trace FR-5.1, FR-CST-11
 */
export const ErrorCodes = ERROR_CODES;

/**
 * 하위 호환용 개별 에러 코드 export (metadataParser.js 직접 참조용)
 * @trace FR-1.3, FR-CST-12
 */
export const PARSE_ERR_MISSING_REQUIRED_TAG = ERROR_CODES.PARSE_ERR_MISSING_REQUIRED_TAG;

// ============================================================
// Phase 3.2: 에러 메시지 맵 (ERROR_MESSAGES)
// ============================================================

/**
 * 에러 코드별 다국어 메시지 맵 (ko/en/severity)
 * 모든 메시지는 내부 파일 구조(offset, tag hex, buffer)를 노출하지 않음 (FR-4.5)
 * @constant {ReadonlyObject}
 * @trace FR-5.2, FR-CST-13, FR-4.5, HAZ-3.1
 */
export const ERROR_MESSAGES = Object.freeze({
  [ERROR_CODES.PARSE_ERR_INVALID_MAGIC]: {
    ko: '유효한 DICOM 파일이 아닙니다.',
    en: 'Not a valid DICOM file.',
    severity: 'error',
  },
  [ERROR_CODES.PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX]: {
    ko: '지원하지 않는 전송 구문입니다.',
    en: 'Unsupported transfer syntax.',
    severity: 'error',
  },
  [ERROR_CODES.PARSE_ERR_MISSING_REQUIRED_TAG]: {
    ko: '필수 DICOM 태그가 누락되었습니다.',
    en: 'Missing required DICOM tag.',
    severity: 'error',
  },
  [ERROR_CODES.PARSE_ERR_PIXEL_DATA_EXTRACTION]: {
    ko: '픽셀 데이터 추출에 실패했습니다.',
    en: 'Failed to extract pixel data.',
    severity: 'error',
  },
  [ERROR_CODES.PARSE_ERR_FILE_READ]: {
    ko: '파일 읽기에 실패했습니다.',
    en: 'Failed to read file.',
    severity: 'error',
  },
  [ERROR_CODES.PARSE_ERR_FILE_TOO_LARGE]: {
    ko: '파일 크기가 제한을 초과했습니다.',
    en: 'File size exceeds limit.',
    severity: 'error',
  },
  [ERROR_CODES.PARSE_ERR_UNEXPECTED]: {
    ko: '예기치 않은 오류가 발생했습니다.',
    en: 'Unexpected error occurred.',
    severity: 'error',
  },
  CBV_000: {
    ko: '알 수 없는 오류가 발생했습니다.',
    en: 'An unknown error occurred.',
    severity: 'error',
  },
  VALIDATE_001: {
    ko: '데이터 검증에 실패했습니다.',
    en: 'Data validation failed.',
    severity: 'error',
  },
  RENDER_001: {
    ko: '렌더링에 실패했습니다.',
    en: 'Rendering failed.',
    severity: 'error',
  },
  SECURITY_001: {
    ko: '보안 정책 위반이 감지되었습니다.',
    en: 'Security policy violation detected.',
    severity: 'error',
  },
  MEMORY_001: {
    ko: '메모리가 부족합니다.',
    en: 'Insufficient memory.',
    severity: 'error',
  },
};

/**
 * 필수/선택 메타데이터 태그 사전
 * 키: makeTagKey 출력 형식 = 'GGGGEEEE'
 * 필수 태그(required: true)는 defaultValue 없음 -> 누락 시 즉시 에러 발생
 * 선택 태그(required: false)는 defaultValue 제공 -> 파싱 중단 방지
 * @constant {ReadonlyObject}
 * @trace FR-1.3, FR-2.3, FR-CST-15, FR-CST-16
 */
export const METADATA_TAGS = Object.freeze({
  '00100010': { field: 'patientName', name: 'PatientName', required: false, defaultValue: '' },
  '00100020': { field: 'patientID', name: 'PatientID', required: false, defaultValue: '' },
  '0020000D': { field: 'studyInstanceUID', name: 'StudyInstanceUID', required: false, defaultValue: '' },
  '0020000E': { field: 'seriesInstanceUID', name: 'SeriesInstanceUID', required: false, defaultValue: '' },
  '00280010': { field: 'rows', name: 'Rows', required: true },
  '00280011': { field: 'columns', name: 'Columns', required: true },
  '00280100': { field: 'bitsAllocated', name: 'BitsAllocated', required: true },
  '00280101': { field: 'bitsStored', name: 'BitsStored', required: false, defaultValue: 16 },
  '00280103': { field: 'pixelRepresentation', name: 'PixelRepresentation', required: true },
  '00281050': { field: 'windowCenter', name: 'WindowCenter', required: false, defaultValue: 40 },
  '00281051': { field: 'windowWidth', name: 'WindowWidth', required: false, defaultValue: 400 },
  '00180050': { field: 'sliceThickness', name: 'SliceThickness', required: false, defaultValue: 0 },
  '00280030': { field: 'pixelSpacing', name: 'PixelSpacing', required: false, defaultValue: [1, 1] },
  '00280004': { field: 'photometricInterpretation', name: 'PhotometricInterpretation', required: false, defaultValue: 'MONOCHROME2' },
  '00280002': { field: 'samplesPerPixel', name: 'SamplesPerPixel', required: false, defaultValue: 1 },
});
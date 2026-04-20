/**
 * @file DICOM 파서 상수 정의
 * @module data/dicomParser/constants
 * @description COMP-1.1 DICOM 파일 파서에 사용되는 상수 정의
 * IEC 62304 Class A 준수 - FR-1.1, FR-1.2, FR-1.5
 */

/**
 * DICOM 매직 바이트 오프셋 (프리앰블 길이)
 * @constant {number}
 */
export const PREAMBLE_LENGTH = 128;

/**
 * DICOM 매직 바이트 시그니처
 * @constant {string}
 */
export const DICOM_MAGIC_BYTE = 'DICM';

/**
 * DICOM 매직 바이트 오프셋 (프리앰블 이후)
 * @constant {number}
 */
export const MAGIC_BYTE_OFFSET = 128;

/**
 * 최소 DICOM 파일 크기 (프리앰블 128 + 매직 4 = 132바이트)
 * @constant {number}
 */
export const DICOM_MIN_FILE_SIZE = 132;

/**
 * 최대 파일 크기 (512MB) - 브라우저 메모리 제약
 * @constant {number}
 */
export const MAX_FILE_SIZE = 512 * 1024 * 1024;

/**
 * 최대 태그 수 - 무한 루프 방지 (HAZ-5.2)
 * @constant {number}
 */
export const MAX_TAG_COUNT = 10000;

/**
 * 최대 시퀀스 중첩 깊이 (HAZ-5.2)
 * @constant {number}
 */
export const MAX_SEQUENCE_DEPTH = 10;

/**
 * 파일 메타 정보 그룹 번호
 * @constant {number}
 */
export const FILE_META_GROUP = 0x0002;

/**
 * 픽셀 데이터 태그
 * @constant {Object}
 */
export const PIXEL_DATA_TAG = { group: 0x7FE0, element: 0x0010 };

/**
 * DICOM 파싱 에러 코드 (FR-1.5, HAZ-1.1, HAZ-5.2)
 * @constant {Object}
 */
export const ERROR_CODES = {
  PARSE_ERR_INVALID_MAGIC: 'PARSE_ERR_INVALID_MAGIC',
  PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX: 'PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX',
  PARSE_ERR_MISSING_REQUIRED_TAG: 'PARSE_ERR_MISSING_REQUIRED_TAG',
  PARSE_ERR_PIXEL_DATA_EXTRACTION: 'PARSE_ERR_PIXEL_DATA_EXTRACTION',
  PARSE_ERR_FILE_READ: 'PARSE_ERR_FILE_READ',
  PARSE_ERR_FILE_TOO_LARGE: 'PARSE_ERR_FILE_TOO_LARGE',
  PARSE_ERR_UNEXPECTED: 'PARSE_ERR_UNEXPECTED',
};

/**
 * 하위 호환용 별칭
 * @deprecated ERROR_CODES 사용 권장
 */
export const ErrorCodes = ERROR_CODES;

/**
 * 하위 호환용 개별 에러 코드 export
 */
export const PARSE_ERR_MISSING_REQUIRED_TAG = ERROR_CODES.PARSE_ERR_MISSING_REQUIRED_TAG;

/**
 * 에러 코드별 메시지 맵 (한국어/영어) - FR-1.5
 * @constant {Object}
 */
export const ERROR_MESSAGES = {
  PARSE_ERR_INVALID_MAGIC: {
    ko: '유효한 DICOM 파일이 아닙니다.',
    en: 'Not a valid DICOM file.',
    severity: 'error',
  },
  PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX: {
    ko: '지원하지 않는 전송 구문입니다.',
    en: 'Unsupported transfer syntax.',
    severity: 'error',
  },
  PARSE_ERR_MISSING_REQUIRED_TAG: {
    ko: '필수 DICOM 태그가 누락되었습니다.',
    en: 'Missing required DICOM tag.',
    severity: 'error',
  },
  PARSE_ERR_PIXEL_DATA_EXTRACTION: {
    ko: '픽셀 데이터 추출에 실패했습니다.',
    en: 'Failed to extract pixel data.',
    severity: 'error',
  },
  PARSE_ERR_FILE_READ: {
    ko: '파일 읽기에 실패했습니다.',
    en: 'Failed to read file.',
    severity: 'error',
  },
  PARSE_ERR_FILE_TOO_LARGE: {
    ko: '파일 크기가 제한을 초과했습니다.',
    en: 'File size exceeds limit.',
    severity: 'error',
  },
  PARSE_ERR_UNEXPECTED: {
    ko: '예기치 않은 오류가 발생했습니다.',
    en: 'Unexpected error occurred.',
    severity: 'error',
  },
};

/**
 * 필수/선택 메타데이터 태그 사전 (FR-1.3)
 * 키: makeTagKey 출력 형식 = 'GGGGEEEE'
 * @constant {Object}
 */
export const METADATA_TAGS = {
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
};

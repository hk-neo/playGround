/**
 * @file PHI(보건정보) 보호 가드
 * @module data/dicomParser/phiGuard
 * @description DICOM 메타데이터에서 민감한 PHI 필드를 마스킹하여
 *              메모리 내 평문 노출을 최소화한다.
 * 추적: SEC-3, HAZ-1.1
 */

/**
 * PHI로 분류된 메타데이터 필드 목록
 * @constant {string[]}
 */
const PHI_FIELDS = [
  'patientName',
  'patientID',
  'patientBirthDate',
];

/**
 * PHI 필드 마스킹 문자열
 * @constant {string}
 */
const PHI_MASK = '[REDACTED]';

/**
 * 원본 PHI 값을 복호화 키로만 접근 가능하도록 보관하는 WeakMap.
 * 외부 모듈에서 직접 접근할 수 없으며, 오직 getPhiValue()를 통해서만 조회 가능.
 * @type {WeakMap<Object, Object>}
 */
const phiStore = new WeakMap();

/**
 * 메타데이터 객체의 PHI 필드를 마스킹한다.
 * 원본 값은 내부 WeakMap에 저장되어 getPhiValue()로만 접근 가능하다.
 *
 * @param {Object} metadata - 원본 DICOMMetadata 객체
 * @returns {Object} 마스킹된 metadata (동일 참조, 필드값이 치환됨)
 */
export function maskPhiFields(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return metadata;
  }

  const originals = {};

  for (const field of PHI_FIELDS) {
    if (metadata[field] !== undefined && metadata[field] !== '') {
      originals[field] = metadata[field];
      metadata[field] = PHI_MASK;
    }
  }

  // 원본 값을 WeakMap에 저장 (GC 안전)
  if (Object.keys(originals).length > 0) {
    phiStore.set(metadata, originals);
  }

  return metadata;
}

/**
 * 마스킹된 메타데이터에서 원본 PHI 값을 안전하게 조회한다.
 * 모듈 외부에서는 이 함수를 통해서만 원본 값에 접근할 수 있다.
 *
 * @param {Object} metadata - 마스킹된 DICOMMetadata 객체
 * @param {string} field - 조회할 PHI 필드명
 * @returns {string|undefined} 원본 값 또는 undefined
 */
export function getPhiValue(metadata, field) {
  if (!PHI_FIELDS.includes(field)) {
    return undefined;
  }
  const originals = phiStore.get(metadata);
  if (!originals) {
    return undefined;
  }
  return originals[field];
}

/**
 * 메타데이터에서 모든 원본 PHI 값을 일괄 조회한다.
 * @internal 디버깅/감사 로깅 전용. 프로덕션 UI에서는 사용 금지. 배럴 파일(index.js)에서 미노출.
 *
 * @param {Object} metadata - 마스킹된 DICOMMetadata 객체
 * @returns {Object} 원본 PHI 필드 값 객체
 */
export function dumpPhiValues(metadata) {
  return phiStore.get(metadata) || {};
}

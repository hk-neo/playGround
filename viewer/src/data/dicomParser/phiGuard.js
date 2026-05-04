/**
 * @file PHI(보호대상건강정보) 마스킹 보안 가드 모듈 - SDS-3.12
 * @module data/dicomParser/phiGuard
 * @description DICOM 메타데이터에서 민감한 PHI 필드를 마스킹하여
 *              메모리 내 평문 노출을 최소화한다.
 *              IEC 62304 Class A 안전 등급 준수.
 * 추적: SAD COMP-3 (phiGuard) | FR-4.1, FR-4.5, HAZ-3.1, SEC-3, NFR-4
 */

/**
 * @constant {ReadonlyArray<string>}
 * @description HIPAA Safe Harbor 및 국내 개인정보보호법 기준 최소 식별 정보 3종.
 *              Object.freeze로 불변화하여 런타임 수정 차단 (TC-1).
 */
const PHI_FIELDS = Object.freeze([
  'patientName',
  'patientID',
  'patientBirthDate',
]);

/**
 * @constant {string}
 * @description 마스킹 문자열. 별도 상수로 분리하여 향후 마스킹 정책 변경 시 단일 지점 수정 (TC-3).
 */
const PHI_MASK = '[REDACTED]';

/**
 * @type {WeakMap<Object, Object>}
 * @description 원본 PHI 값을 객체 참조를 키로 하여 안전 보관.
 *              WeakMap 사용으로 metadata 객체가 GC될 때 원본 값도 자동 해제 (TC-2).
 *              모듈 스코프에 캡슐화되어 외부 접근 불가.
 */
const phiStore = new WeakMap();

/**
 * 메타데이터 객체의 PHI 필드를 마스킹한다.
 * 원본 값은 내부 WeakMap에 저장되어 getPhiValue()로만 접근 가능하다.
 *
 * @param {Object|null|undefined} metadata - 원본 DICOMMetadata 객체
 * @returns {Object|null|undefined} 마스킹된 metadata (동일 참조, 필드값이 치환됨). null/undefined 입력 시 동일 값 반환.
 */
export function maskPhiFields(metadata) {
  if (!metadata || typeof metadata !== 'object') {
    return metadata;
  }

  // 기존 원본 값 보존 (멱등성 보장: 중복 호출 시 원본 덮어쓰기 방지)
  const originals = phiStore.get(metadata) ? { ...phiStore.get(metadata) } : {};
  let hasNewOriginals = false;

  for (const field of PHI_FIELDS) {
    if (metadata[field] !== undefined && metadata[field] !== '' && metadata[field] !== PHI_MASK) {
      originals[field] = metadata[field];
      hasNewOriginals = true;
      metadata[field] = PHI_MASK;
    }
  }

  // 새로 마스킹된 필드가 있거나 기존 원본이 있으면 저장
  if (hasNewOriginals || phiStore.has(metadata)) {
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
  if (!metadata || typeof metadata !== 'object') return undefined;
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
  if (!metadata || typeof metadata !== 'object') return {};
  const stored = phiStore.get(metadata);
  return stored ? { ...stored } : {};
}

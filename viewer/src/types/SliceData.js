/**
 * @file 슬라이스 데이터 타입 정의 (Factory 함수 + JSDoc)
 * @module types/SliceData
 */

/**
 * MPR 슬라이스 데이터 구조
 * @typedef {Object} SliceData
 * @property {ImageData|null} imageData - 슬라이스 이미지 데이터 (ImageData 호환 구조)
 * @property {string} plane - 단면 평면 ('Axial'|'Coronal'|'Sagittal')
 * @property {number} sliceIndex - 슬라이스 인덱스
 * @property {number} windowLevel - 윈도우 레벨
 * @property {number} windowWidth - 윈도우 폭
 */

/**
 * 슬라이스 데이터 객체를 생성한다.
 * @param {Partial<SliceData>} [overrides={}] - 기본값을 덮어쓸 속성
 * @returns {SliceData} 슬라이스 데이터 객체
 */
export function createSliceData(overrides = {}) {
  return {
    imageData: null,
    plane: 'Axial',
    sliceIndex: 0,
    windowLevel: 0,
    windowWidth: 0,
    ...overrides,
  };
}

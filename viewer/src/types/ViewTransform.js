/**
 * @file 뷰 변환 상태 타입 정의 (Factory 함수 + JSDoc)
 * @module types/ViewTransform
 */

/**
 * 뷰 변환 상태 구조
 * @typedef {Object} ViewTransform
 * @property {number} zoom - 줌 배율 (기본값 1.0)
 * @property {number} panX - 수평 이동 (픽셀)
 * @property {number} panY - 수직 이동 (픽셀)
 * @property {number} windowLevel - 윈도우 레벨
 * @property {number} windowWidth - 윈도우 폭
 * @property {number} sliceIndex - 현재 슬라이스 인덱스
 */

/**
 * 뷰 변환 객체를 생성한다.
 * @param {Partial<ViewTransform>} [overrides={}]
 * @returns {ViewTransform}
 */
export function createViewTransform(overrides = {}) {
  return {
    zoom: 1.0,
    panX: 0,
    panY: 0,
    windowLevel: 0,
    windowWidth: 0,
    sliceIndex: 0,
    ...overrides,
  };
}
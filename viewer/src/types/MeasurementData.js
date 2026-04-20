/**
 * @file 측정 데이터 타입 정의 (HAZ-2.1 disclaimer 포함)
 * @module types/MeasurementData
 */

/**
 * 거리 측정 결과 데이터 구조
 * @typedef {Object} MeasurementData
 * @property {number[]} startPoint - 측정 시작점 [x, y, z]
 * @property {number[]} endPoint - 측정 끝점 [x, y, z]
 * @property {number} distanceMM - 측정 거리 (mm)
 * @property {boolean} pixelSpacingValid - 픽셀 간격 정보 유효 여부
 * @property {string} disclaimerText - 진단 불가 면책 문구 (HAZ-2.1)
 */

/**
 * 측정 데이터 객체를 생성한다.
 * @param {Partial<MeasurementData>} [overrides={}] - 기본값을 덮어쓸 속성
 * @returns {MeasurementData} 측정 데이터 객체
 */
export function createMeasurementData(overrides = {}) {
  return {
    startPoint: [0, 0, 0],
    endPoint: [0, 0, 0],
    distanceMM: 0,
    pixelSpacingValid: false,
    disclaimerText: '본 측정은 참고용이며 진단 목적으로 사용할 수 없습니다.',
    ...overrides,
  };
}

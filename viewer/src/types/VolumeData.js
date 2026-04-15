/**
 * @file 볼륨 데이터 타입 정의 (Factory 함수 + JSDoc)
 * @module types/VolumeData
 */

/**
 * 3차원 볼륨 데이터 구조
 * @typedef {Object} VolumeData
 * @property {Float32Array} voxelArray - 복셀 데이터 배열
 * @property {number[]} dimensions - 볼륨 차원 [x, y, z] (픽셀 단위)
 * @property {number[]} spacing - 복셀 간격 [x, y, z] (mm 단위)
 * @property {number[]} origin - 볼륨 원점 좌표 [x, y, z] (mm 단위)
 * @property {string} dataType - 복셀 데이터 타입 식별자
 * @property {number[]} minMaxValue - 복셀값 최소/최대 [min, max]
 */

/**
 * 볼륨 데이터 객체를 생성한다.
 * @param {Partial<VolumeData>} [overrides={}] - 기본값을 덮어쓸 속성
 * @returns {VolumeData} 볼륨 데이터 객체
 */
export function createVolumeData(overrides = {}) {
  return {
    voxelArray: new Float32Array(0),
    dimensions: [0, 0, 0],
    spacing: [1, 1, 1],
    origin: [0, 0, 0],
    dataType: 'Float32',
    minMaxValue: [0, 0],
    ...overrides,
  };
}

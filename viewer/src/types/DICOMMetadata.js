/**
 * @file DICOM 메타데이터 타입 정의 (Factory 함수 + JSDoc)
 * @module types/DICOMMetadata
 */

/**
 * DICOM 파일 메타데이터 구조
 * @typedef {Object} DICOMMetadata
 * @property {string} patientName - 환자 이름
 * @property {string} patientID - 환자 ID
 * @property {string} patientBirthDate - 환자 생년월일
 * @property {string} studyDate - 검사 날짜
 * @property {string} studyTime - 검사 시간
 * @property {string} studyDescription - 검사 설명
 * @property {string} modality - 모달리티 (예: CT, CBCT)
 * @property {string} bodyPartExamined - 검사 부위
 * @property {number} sliceThickness - 슬라이스 두께 (mm)
 * @property {number} kvp - 관전압 (kVp)
 * @property {number} xRayTubeCurrent - X선관 전류 (mA)
 * @property {number[]} pixelSpacing - 픽셀 간격 [row, column] (mm)
 * @property {number[]} imageOrientationPatient - 이미지 방향 벡터 [rx,ry,rz,cx,cy,cz]
 * @property {number[]} imagePositionPatient - 이미지 위치 [x,y,z] (mm)
 * @property {number} rows - 이미지 행 수
 * @property {number} columns - 이미지 열 수
 * @property {number} numberOfFrames - 프레임 수
 * @property {number} bitsAllocated - 할당 비트 수
 * @property {number} bitsStored - 저장 비트 수
 * @property {number} highBit - 최상위 비트 위치
 * @property {number} pixelRepresentation - 픽셀 표현 (0=unsigned, 1=signed)
 * @property {number} windowCenter - 윈도우 중심값
 * @property {number} windowWidth - 윈도우 폭
 * @property {string} transferSyntax - 전송 구문 UID
 * @property {string} studyInstanceUID - Study Instance UID
 * @property {string} seriesInstanceUID - Series Instance UID
 * @property {string} sopInstanceUID - SOP Instance UID
 */

/**
 * DICOM 메타데이터 객체를 생성한다.
 * @param {Partial<DICOMMetadata>} [overrides={}] - 기본값을 덮어쓸 속성
 * @returns {DICOMMetadata} DICOM 메타데이터 객체
 */
export function createDICOMMetadata(overrides = {}) {
  return {
    patientName: '',
    patientID: '',
    patientBirthDate: '',
    studyDate: '',
    studyTime: '',
    studyDescription: '',
    modality: '',
    bodyPartExamined: '',
    sliceThickness: 0,
    kvp: 0,
    xRayTubeCurrent: 0,
    pixelSpacing: [0, 0],
    imageOrientationPatient: [1, 0, 0, 0, 1, 0],
    imagePositionPatient: [0, 0, 0],
    rows: 0,
    columns: 0,
    numberOfFrames: 1,
    bitsAllocated: 16,
    bitsStored: 16,
    highBit: 15,
    pixelRepresentation: 0,
    windowCenter: 0,
    windowWidth: 0,
    transferSyntax: '',
    studyInstanceUID: '',
    seriesInstanceUID: '',
    sopInstanceUID: '',
    ...overrides,
  };
}

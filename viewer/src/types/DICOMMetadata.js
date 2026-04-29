/**
 * @file DICOM 메타데이터 타입 정의 (Factory 함수 + JSDoc)
 * @module types/DICOMMetadata
 */

/**
 * DICOM 파일 메타데이터 구조
 * @typedef {Object} DICOMMetadata
 * @property {string} patientName - 환자 이름 (PHI 대상, DICOM Tag: 0010,0010)
 * @property {string} patientID - 환자 ID (PHI 대상, DICOM Tag: 0010,0020)
 * @property {string} patientBirthDate - 환자 생년월일 (PHI 대상, DICOM Tag: 0010,0030)
 * @property {string} studyDate - 검사 날짜 (YYYYMMDD, DICOM Tag: 0008,0020)
 * @property {string} studyTime - 검사 시간 (HHMMSS, DICOM Tag: 0008,0030)
 * @property {string} studyDescription - 검사 설명 (DICOM Tag: 0008,1030)
 * @property {string} modality - 모달리티 (CT, CBCT 등, DICOM Tag: 0008,0060)
 * @property {string} bodyPartExamined - 검사 부위 (DICOM Tag: 0018,0015)
 * @property {number} sliceThickness - 슬라이스 두께 (mm, DICOM Tag: 0018,0050)
 * @property {number} kvp - 관전압 (kVp, DICOM Tag: 0018,0060)
 * @property {number} xRayTubeCurrent - X선관 전류 (mA, DICOM Tag: 0018,1151)
 * @property {number[]} pixelSpacing - 픽셀 간격 [row, column] (mm, DICOM Tag: 0028,0030)
 * @property {number[]} imageOrientationPatient - 이미지 방향 벡터 [rx,ry,rz,cx,cy,cz] (DICOM Tag: 0020,0037)
 * @property {number[]} imagePositionPatient - 이미지 위치 [x,y,z] (mm, DICOM Tag: 0020,0032)
 * @property {number} rows - 이미지 행 수 (필수, DICOM Tag: 0028,0010)
 * @property {number} columns - 이미지 열 수 (필수, DICOM Tag: 0028,0011)
 * @property {number} numberOfFrames - 프레임 수 (DICOM Tag: 0028,0008)
 * @property {number} bitsAllocated - 할당 비트 수 (필수, DICOM Tag: 0028,0100)
 * @property {number} bitsStored - 저장 비트 수 (DICOM Tag: 0028,0101)
 * @property {number} highBit - 최상위 비트 위치 (DICOM Tag: 0028,0102)
 * @property {number} pixelRepresentation - 픽셀 표현 0=unsigned/1=signed (필수, DICOM Tag: 0028,0103)
 * @property {number} windowCenter - 윈도우 중심값 (DICOM Tag: 0028,1050)
 * @property {number} windowWidth - 윈도우 폭 (DICOM Tag: 0028,1051)
 * @property {string} transferSyntax - 전송 구문 UID (DICOM Tag: 0002,0010)
 * @property {string} studyInstanceUID - Study Instance UID (DICOM Tag: 0020,000D)
 * @property {string} seriesInstanceUID - Series Instance UID (DICOM Tag: 0020,000E)
 * @property {string} sopInstanceUID - SOP Instance UID (DICOM Tag: 0008,0018)
 */

/**
 * DICOM 메타데이터 객체를 생성한다.
 * 매 호출 시 새로운 독립 객체를 반환하여 참조 오염을 방지한다.
 * @param {Partial<DICOMMetadata>} [overrides={}] - 기본값을 덮어쓸 속성
 * @returns {DICOMMetadata} 모든 속성이 채워진 DICOM 메타데이터 객체
 */
export function createDICOMMetadata(overrides = {}) {
  const safe = overrides ?? {};
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
    ...safe,
  };
}

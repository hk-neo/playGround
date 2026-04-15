/**
 * @file DICOM 데이터 사전 - CBCT 영상 필수 태그 정보
 * @module data/dicomDictionary
 * @description FR-DP-003: CBCT 영상에 필요한 필수 태그 정보를 포함한 데이터 사전
 *
 * 태그 키 형식: makeTagKey(group, element) 의 출력과 일치해야 함.
 * group.toString(16).toUpperCase().padStart(4, '0') +
 * element.toString(16).toUpperCase().padStart(4, '0')
 */

/**
 * 전송 구문 UID 상수
 */
export const TRANSFER_SYNTAX = {
  EXPLICIT_VR_LE: '1.2.840.10008.1.2.1',
  IMPLICIT_VR_LE: '1.2.840.10008.1.2',
  BIG_ENDIAN: '1.2.840.10008.1.2.2',
};

/**
 * 지원하는 전송 구문 집합 (비압축)
 */
export const SUPPORTED_TRANSFER_SYNTAXES = new Set([
  TRANSFER_SYNTAX.EXPLICIT_VR_LE,
  TRANSFER_SYNTAX.IMPLICIT_VR_LE,
  TRANSFER_SYNTAX.BIG_ENDIAN,
]);

/**
 * VR(Value Representation) 분류
 */
export const VR_CATEGORY = {
  NUMERIC: ['US', 'SS', 'UL', 'SL', 'FL', 'FD'],
  STRING_NUMERIC: ['DS', 'IS'],
  STRING: ['LO', 'SH', 'PN', 'UI', 'CS', 'DA', 'TM', 'DT'],
  BINARY: ['OB', 'OW', 'UN'],
  SEQUENCE: ['SQ'],
};

/**
 * 4바이트 길이 VR 집합 (OB, OW, OF, SQ, UC, UN, UR, UT)
 */
export const EXTENDED_LENGTH_VR = new Set([
  'OB', 'OW', 'OF', 'SQ', 'UC', 'UN', 'UR', 'UT',
]);

/**
 * DICOM 태그 데이터 사전
 * 키: makeTagKey(group, element) 출력 형식 = 'GGGGEEEE' (대문자 16진수)
 * 값: { vr: string, name: string }
 *
 * 주의: 시퀀스 구분 태그(FFFE 그룹)도 makeTagKey 출력과 일치해야 함.
 */
const DICTIONARY = {
  // 파일 메타 정보 (그룹 0002)
  '00020000': { vr: 'UL', name: 'FileMetaInformationGroupLength' },
  '00020001': { vr: 'OB', name: 'FileMetaInformationVersion' },
  '00020002': { vr: 'UI', name: 'MediaStorageSOPClassUID' },
  '00020003': { vr: 'UI', name: 'MediaStorageSOPInstanceUID' },
  '00020010': { vr: 'UI', name: 'TransferSyntaxUID' },
  '00020012': { vr: 'UI', name: 'ImplementationClassUID' },
  '00020013': { vr: 'SH', name: 'ImplementationVersionName' },

  // 환자 정보 (그룹 0010)
  '00100010': { vr: 'PN', name: 'PatientName' },
  '00100020': { vr: 'LO', name: 'PatientID' },
  '00100030': { vr: 'DA', name: 'PatientBirthDate' },

  // 스터디 정보 (그룹 0008)
  '00080016': { vr: 'UI', name: 'SOPClassUID' },
  '00080018': { vr: 'UI', name: 'SOPInstanceUID' },
  '00080020': { vr: 'DA', name: 'StudyDate' },
  '00080030': { vr: 'TM', name: 'StudyTime' },
  '00080050': { vr: 'SH', name: 'AccessionNumber' },
  '00080060': { vr: 'CS', name: 'Modality' },
  '00080080': { vr: 'LO', name: 'InstitutionName' },
  '00081030': { vr: 'LO', name: 'StudyDescription' },
  '00081111': { vr: 'SQ', name: 'ReferencedPerformedProcedureStepSequence' },

  // 스터디/시리즈 UID (그룹 0020)
  '0020000D': { vr: 'UI', name: 'StudyInstanceUID' },
  '0020000E': { vr: 'UI', name: 'SeriesInstanceUID' },

  // 영상 파라미터 (그룹 0018)
  '00180015': { vr: 'CS', name: 'BodyPartExamined' },
  '00180050': { vr: 'DS', name: 'SliceThickness' },
  '00180060': { vr: 'DS', name: 'KVP' },
  '00181151': { vr: 'IS', name: 'XRayTubeCurrent' },

  // 영상 위치/방향 (그룹 0020)
  '00200013': { vr: 'IS', name: 'InstanceNumber' },
  '00200032': { vr: 'DS', name: 'ImagePositionPatient' },
  '00200037': { vr: 'DS', name: 'ImageOrientationPatient' },

  // 영상 표현 (그룹 0028)
  '00280008': { vr: 'IS', name: 'NumberOfFrames' },
  '00280010': { vr: 'US', name: 'Rows' },
  '00280011': { vr: 'US', name: 'Columns' },
  '00280030': { vr: 'DS', name: 'PixelSpacing' },
  '00280100': { vr: 'US', name: 'BitsAllocated' },
  '00280101': { vr: 'US', name: 'BitsStored' },
  '00280102': { vr: 'US', name: 'HighBit' },
  '00280103': { vr: 'US', name: 'PixelRepresentation' },
  '00281050': { vr: 'DS', name: 'WindowCenter' },
  '00281051': { vr: 'DS', name: 'WindowWidth' },
  '00281052': { vr: 'DS', name: 'RescaleIntercept' },
  '00281053': { vr: 'DS', name: 'RescaleSlope' },

  // 픽셀 데이터 (그룹 7FE0)
  '7FE00010': { vr: 'OW', name: 'PixelData' },

  // 시퀀스 구분 태그 (그룹 FFFE)
  // makeTagKey(0xFFFE, 0xE000) = 'FFFEE000'
  'FFFEE000': { vr: 'na', name: 'Item' },
  'FFFEE00D': { vr: 'na', name: 'ItemDelimitationItem' },
  'FFFEE0DD': { vr: 'na', name: 'SequenceDelimitationItem' },
};

/**
 * 태그 키를 생성한다.
 * group과 element는 10진수 또는 16진수 리터럴로 전달 가능.
 * 예: makeTagKey(0x7FE0, 0x0010) === makeTagKey(32736, 16) === '7FE00010'
 *
 * @param {number} group - 그룹 번호 (0~0xFFFF)
 * @param {number} element - 요소 번호 (0~0xFFFF)
 * @returns {string} 'GGGGEEEE' 형식의 대문자 16진수 태그 키
 */
export function makeTagKey(group, element) {
  const g = group.toString(16).toUpperCase().padStart(4, '0');
  const e = element.toString(16).toUpperCase().padStart(4, '0');
  return g + e;
}

/**
 * 데이터 사전에서 태그 정보를 조회한다.
 * @param {string} tagKey - 'GGGGEEEE' 형식의 태그 키
 * @returns {{ vr: string, name: string } | null}
 */
export function lookupTag(tagKey) {
  return DICTIONARY[tagKey] || null;
}

/**
 * 데이터 사전에서 VR을 조회한다. 없으면 UN 반환.
 * 암시적 VR 파싱 시 이 함수를 사용하여 VR을 결정함.
 * @param {string} tagKey - 태그 키
 * @returns {string} VR 문자열 (예: 'US', 'DS', 'UN')
 */
export function lookupVR(tagKey) {
  const entry = DICTIONARY[tagKey];
  return entry ? entry.vr : 'UN';
}


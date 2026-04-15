/**
 * @file Data Layer 배럴 파일
 * @module data
 * @description DICOM 파서 및 데이터 검증 모듈 공개 인터페이스
 * IEC 62304 제5.4.3 준수 - 공개 API 문서화
 */

// 데이터 사전 (FR-DP-003)
export {
  TRANSFER_SYNTAX,
  SUPPORTED_TRANSFER_SYNTAXES,
  VR_CATEGORY,
  EXTENDED_LENGTH_VR,
  makeTagKey,
  lookupTag,
  lookupVR,
} from './dicomDictionary.js';

// DICOMParser (FR-DP-001~006, FR-DP-008) -- 구현 예정
// export { parseDICOM } from './DICOMParser.js';

// DataValidator (FR-DP-007) -- 구현 예정
// export {
//   validateDICOMMetadata,
//   validatePixelSpacing,
//   validateVoxelRange,
//   validateImageOrientation,
//   validateDICOMFile,
// } from './DataValidator.js';

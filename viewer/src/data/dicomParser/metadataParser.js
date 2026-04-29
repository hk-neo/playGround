/**
 * @file DICOM 메타데이터 파서 - SDS-3.9
 * @module data/dicomParser/metadataParser
 * @description DICOM 데이터셋에서 필수/선택 메타데이터 태그를 파싱
 * 추적: FR-1.3, FR-2.2, FR-2.3, FR-2.4, FR-2.6, FR-4.1, HAZ-1.3, HAZ-3.1, HAZ-5.1, HAZ-5.3
 * 안전 등급: IEC 62304 Class A
 */

import { createDICOMMetadata } from '../../types/DICOMMetadata.js';
import { createParseContext } from './ParseContext.js';
import { readTag } from './tagReader.js';
import { parseMetaGroup } from './metaGroupParser.js';
import { maskPhiFields } from './phiGuard.js';
import {
  METADATA_TAGS, MAX_TAG_COUNT, PIXEL_DATA_TAG, DICOM_MIN_FILE_SIZE,
  ERROR_CODES, PARSE_ERR_MISSING_REQUIRED_TAG, PARSE_WARN_OPTIONAL_TAG_MISSING
} from './constants.js';
import { ParseError } from '../../errors/CBVError.js';
import { makeTagKey } from '../dicomDictionary.js';

/**
 * DICOM 데이터셋에서 필수/선택 메타데이터 태그를 파싱한다.
 * 9단계 파싱 절차를 수행하며, 픽셀 데이터 그룹(0x7FE0) 도달 시 순회를 조기 종료한다.
 *
 * @param {ArrayBuffer} buffer - 전체 DICOM 파일 버퍼 (132바이트 이상)
 * @param {Object} [preParsedMeta] - parseMetaGroup() 결과 (중복 파싱 방지)
 * @param {string} preParsedMeta.transferSyntaxUID - 전송 구문 UID
 * @param {number} preParsedMeta.metaEndOffset - 메타 그룹 종료 오프셋
 * @returns {{
 *   metadata: Object,
 *   context: Object,
 *   errors: Array,
 *   transferSyntaxUID: string,
 *   _pixelDataOffset: (number|undefined),
 *   _pixelDataLength: (number|undefined)
 * }}
 * @throws {ParseError} buffer가 null/undefined이거나 132바이트 미만인 경우
 */
export function parseMetadata(buffer, preParsedMeta) {
  // Step 1: 버퍼 크기 검증 (FR-002, EC-001, EC-002)
  if (!buffer || buffer.byteLength < DICOM_MIN_FILE_SIZE) {
    throw new ParseError(
      'DICOM 파일 버퍼가 유효하지 않습니다 (최소 132바이트 필요)',
      ERROR_CODES.PARSE_ERR_UNEXPECTED
    );
  }

  // Step 2: 메타 그룹(0002) 파싱 - preParsedMeta 재사용 분기 (FR-003, FR-004, EC-003)
  let transferSyntaxUID;
  let metaEndOffset;
  if (preParsedMeta && preParsedMeta.transferSyntaxUID) {
    transferSyntaxUID = preParsedMeta.transferSyntaxUID;
    metaEndOffset = preParsedMeta.metaEndOffset;
  } else {
    const metaGroupResult = parseMetaGroup(buffer);
    transferSyntaxUID = metaGroupResult.transferSyntaxUID;
    metaEndOffset = metaGroupResult.metaEndOffset;
  }

  // Step 3: 파싱 컨텍스트 생성 (FR-005)
  const ctx = createParseContext(buffer, transferSyntaxUID, metaEndOffset);

  const collected = {};
  let tagCount = 0;

  // 픽셀 데이터 태그 키 (7FE00010)
  const pixelTagKey = makeTagKey(PIXEL_DATA_TAG.group, PIXEL_DATA_TAG.element);

  // Step 4: while 루프 데이터셋 태그 순회 (FR-006, FR-007)
  // 종료 조건: hasRemaining(4)=false | tagCount >= MAX_TAG_COUNT | group >= PIXEL_DATA_GROUP | readTag 예외
  while (ctx.hasRemaining(4) && tagCount < MAX_TAG_COUNT) {
    let result;
    try {
      result = readTag(ctx);
    } catch (e) {
      // readTag() 예외 발생 시 에러 기록 후 안전하게 break (NFR-005, EC-005)
      if (ctx.errors) {
        ctx.errors.push({
          code: ERROR_CODES.PARSE_ERR_UNEXPECTED,
          message: '태그 읽기 예외: ' + (e.message || String(e)),
          severity: 'warning',
        });
      }
      break;
    }

    if (!result) break;
    tagCount++;

    const [group, element] = result.tag;
    const tagKey = makeTagKey(group, element);

    // 픽셀 데이터 그룹(0x7FE0) 도달 시 조기 종료 (NFR-003, SC-005)
    // PIXEL_DATA_TAG.group(0x7FE0) 이후 태그는 메타데이터가 아니므로 순회 불필요
    if (group >= PIXEL_DATA_TAG.group) {
      if (tagKey === pixelTagKey && result.value && result.value._binaryOffset !== undefined) {
        collected._pixelDataOffset = result.value._binaryOffset;
        collected._pixelDataLength = result.value._binaryLength;
      }
      break;
    }

    // METADATA_TAGS 사전 매칭 시 collected에 저장 (FR-007)
    const tagDef = METADATA_TAGS[tagKey];
    if (tagDef && result.value !== undefined && result.value !== null) {
      collected[tagDef.field] = result.value;
    }
  }

  // Step 5: 필수 태그 누락 검사 (FR-008, FR-1.3, HAZ-1.3, EC-004)
  const errors = [];
  for (const [tagKey, tagDef] of Object.entries(METADATA_TAGS)) {
    if (tagDef.required && collected[tagDef.field] === undefined) {
      errors.push({
        code: PARSE_ERR_MISSING_REQUIRED_TAG,
        tag: tagKey,
        message: tagDef.name + ' 태그 누락',
        severity: 'error'
      });
    } else if (!tagDef.required && collected[tagDef.field] === undefined) {
      // Step 6: 선택 태그 기본값 처리 (FR-009, EC-007, EC-008)
      collected[tagDef.field] = tagDef.defaultValue;
      errors.push({
        code: PARSE_WARN_OPTIONAL_TAG_MISSING,
        tag: tagKey,
        message: tagDef.name + ' 태그 누락, 기본값 사용',
        severity: 'warning'
      });
    }
  }

  // pixelSpacing 정규화 (EC-007)
  if (collected.pixelSpacing === undefined || collected.pixelSpacing === null) {
    collected.pixelSpacing = [1, 1];
  } else if (!Array.isArray(collected.pixelSpacing)) {
    collected.pixelSpacing = [collected.pixelSpacing, collected.pixelSpacing];
  } else if (Array.isArray(collected.pixelSpacing) && collected.pixelSpacing.length === 0) {
    collected.pixelSpacing = [1, 1];
  }

  // Step 7: DICOMMetadata 객체 생성 (FR-010)
  // CQ-4 수정: || 대신 nullish coalescing(??) 사용하여 falsy 값(0) 보호
  const bitsAllocated = collected.bitsAllocated ?? 16;
  const metadata = createDICOMMetadata({
    patientName: collected.patientName ?? '',
    patientID: collected.patientID ?? '',
    studyInstanceUID: collected.studyInstanceUID ?? '',
    seriesInstanceUID: collected.seriesInstanceUID ?? '',
    rows: collected.rows ?? 0,
    columns: collected.columns ?? 0,
    bitsAllocated,
    bitsStored: collected.bitsStored ?? 16,
    highBit: bitsAllocated - 1,
    pixelRepresentation: collected.pixelRepresentation ?? 0,
    windowCenter: collected.windowCenter ?? 40,
    windowWidth: collected.windowWidth ?? 400,
    sliceThickness: collected.sliceThickness ?? 0,
    pixelSpacing: collected.pixelSpacing ?? [1, 1],
    photometricInterpretation: collected.photometricInterpretation ?? 'MONOCHROME2',
    samplesPerPixel: collected.samplesPerPixel ?? 1,
    transferSyntax: transferSyntaxUID ?? '',
  });

  // Step 8: PHI 마스킹 - patientName, patientID, patientBirthDate를 [REDACTED]로 치환 (FR-011, FR-4.1, HAZ-3.1)
  maskPhiFields(metadata);

  // Step 9: 결과 반환 (FR-012)
  // CQ-12 수정: ctx.errors(태그 읽기 예외)를 반환 errors에 병합하여 누락 방지
  const allErrors = [...ctx.errors, ...errors];

  return {
    metadata,
    context: ctx,
    errors: allErrors,
    transferSyntaxUID,
    _pixelDataOffset: collected._pixelDataOffset,
    _pixelDataLength: collected._pixelDataLength,
  };
}

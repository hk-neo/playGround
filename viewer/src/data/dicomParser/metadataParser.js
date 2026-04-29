/**
 * @file DICOM 메타데이터 파서
 * @module data/dicomParser/metadataParser
 * @description DICOM 데이터셋에서 필수/선택 메타데이터 태그를 파싱
 * 추적: FR-1.3, US-3, TC-3.1~TC-3.3, HAZ-1.1
 */

import { createDICOMMetadata } from '../../types/DICOMMetadata.js';
import { createParseContext } from './ParseContext.js';
import { readTag } from './tagReader.js';
import { parseMetaGroup } from './metaGroupParser.js';
import { maskPhiFields } from './phiGuard.js';
import {
  METADATA_TAGS, MAX_TAG_COUNT, PIXEL_DATA_TAG, DICOM_MIN_FILE_SIZE,
  ERROR_CODES, PARSE_ERR_MISSING_REQUIRED_TAG
} from './constants.js';
import { ParseError } from '../../errors/CBVError.js';
import { makeTagKey } from '../dicomDictionary.js';

/**
 * 픽셀 데이터 그룹 번호 (0x7FE0)
 * 이 그룹 이후의 태그는 메타데이터가 아니므로 순회를 조기 종료한다.
 * @constant {number}
 */
const PIXEL_DATA_GROUP = 0x7FE0;

/**
 * DICOM 데이터셋에서 필수/선택 메타데이터 태그를 파싱한다.
 * 픽셀 데이터 그룹(0x7FE0) 도달 시 순회를 조기 종료하여 성능을 최적화한다.
 * @param {ArrayBuffer} buffer - 전체 DICOM 파일 버퍼
 * @param {Object} [preParsedMeta] - 이미 파싱된 메타 그룹 결과 (중복 파싱 방지)
 * @returns {{
 *   metadata: Object,
 *   context: Object,
 *   errors: Array,
 *   transferSyntaxUID: string,
 *   pixelDataOffset: number|undefined,
 *   pixelDataLength: number|undefined
 * }}
 */
export function parseMetadata(buffer, preParsedMeta) {
  if (!buffer || buffer.byteLength < DICOM_MIN_FILE_SIZE) {
    throw new ParseError(
      '버퍼가 너무 작습니다',
      ERROR_CODES.PARSE_ERR_UNEXPECTED
    );
  }

  // 1. 메타 그룹(0002) 파싱 - 외부에서 이미 파싱한 경우 재사용
  const metaGroupResult = preParsedMeta || parseMetaGroup(buffer);
  const transferSyntaxUID = metaGroupResult.transferSyntaxUID;
  const metaEndOffset = metaGroupResult.metaEndOffset;

  // 2. 전송 구문에 따라 파싱 컨텍스트 생성
  const ctx = createParseContext(buffer, transferSyntaxUID, metaEndOffset);

  const collected = {};
  let tagCount = 0;

  // 픽셀 데이터 태그 키
  const pixelTagKey = makeTagKey(PIXEL_DATA_TAG.group, PIXEL_DATA_TAG.element);

  // 3. 데이터셋 순회
  while (ctx.hasRemaining(4) && tagCount < MAX_TAG_COUNT) {
    try {
      const result = readTag(ctx);
      if (!result) break;
      tagCount++;

      const [group, element] = result.tag;
      const tagKey = makeTagKey(group, element);

      // 픽셀 데이터 그룹(0x7FE0) 도달 시 즉시 중단
      // PERF-3: 이 그룹 이후의 태그는 메타데이터가 아니므로 순회 불필요
      if (group >= PIXEL_DATA_GROUP) {
        // 정확한 픽셀 데이터 태그인 경우 바이너리 오프셋 캐시
        if (tagKey === pixelTagKey && result.value && result.value._binaryOffset !== undefined) {
          collected._pixelDataOffset = result.value._binaryOffset;
          collected._pixelDataLength = result.value._binaryLength;
        }
        break;
      }

      // 메타데이터 태그 사전에 있으면 수집
      const tagDef = METADATA_TAGS[tagKey];
      if (tagDef && result.value !== undefined && result.value !== null) {
        collected[tagDef.field] = result.value;
      }
    } catch (e) {
      // 태그 읽기 실패 시 에러 기록 후 안전하게 종료
      if (ctx.errors) {
        ctx.errors.push({
          code: 'PARSE_WARN_TAG_READ_FAILED',
          message: '태그 읽기 실패: ' + (e.message || String(e)),
          severity: 'warning',
        });
      }
      break;
    }
  }

  // 4. 필수 태그 누락 검사
  const errors = [];
  for (const [tagKey, tagDef] of Object.entries(METADATA_TAGS)) {
    if (tagDef.required && collected[tagDef.field] === undefined) {
      if (tagDef.defaultValue !== undefined) {
        collected[tagDef.field] = tagDef.defaultValue;
      } else {
        errors.push({
          code: PARSE_ERR_MISSING_REQUIRED_TAG,
          message: tagDef.name + ' 태그 누락',
          severity: 'error'
        });
      }
    } else if (!tagDef.required && collected[tagDef.field] === undefined) {
      collected[tagDef.field] = tagDef.defaultValue;
      errors.push({
        code: 'PARSE_WARN_OPTIONAL_TAG_MISSING',
        message: tagDef.name + ' 태그 누락, 기본값 사용',
        severity: 'warning'
      });
    }
  }

  // 5. DICOMMetadata 객체 생성
  const metadata = createDICOMMetadata({
    patientName: collected.patientName || '',
    patientID: collected.patientID || '',
    studyInstanceUID: collected.studyInstanceUID || '',
    seriesInstanceUID: collected.seriesInstanceUID || '',
    rows: collected.rows || 0,
    columns: collected.columns || 0,
    bitsAllocated: collected.bitsAllocated || 16,
    bitsStored: collected.bitsStored || 16,
    highBit: (collected.bitsAllocated || 16) - 1,
    pixelRepresentation: collected.pixelRepresentation !== undefined
      ? collected.pixelRepresentation : 0,
    windowCenter: collected.windowCenter !== undefined
      ? collected.windowCenter : 40,
    windowWidth: collected.windowWidth !== undefined
      ? collected.windowWidth : 400,
    sliceThickness: collected.sliceThickness !== undefined
      ? collected.sliceThickness : 0,
    pixelSpacing: collected.pixelSpacing || [1, 1],
    photometricInterpretation: collected.photometricInterpretation || 'MONOCHROME2',
    samplesPerPixel: collected.samplesPerPixel !== undefined
      ? collected.samplesPerPixel : 1,
    transferSyntax: transferSyntaxUID || '',
  });

  // 6. PHI 보호: 민감한 환자 식별 정보를 마스킹
  maskPhiFields(metadata);

  return {
    metadata,
    context: ctx,
    errors,
    transferSyntaxUID,
    _pixelDataOffset: collected._pixelDataOffset,
    _pixelDataLength: collected._pixelDataLength,
  };
}

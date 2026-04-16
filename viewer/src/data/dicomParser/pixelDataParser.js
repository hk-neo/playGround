/**
 * @file DICOM 픽셀 데이터 파서
 * @module data/dicomParser/pixelDataParser
 * @description DICOM 파일에서 픽셀(복셀) 데이터 태그를 탐색하고 추출
 * 추적: FR-1.4, US-4, TC-4.1~TC-4.4, HAZ-1.1
 */

import { ParseError } from '../../errors/CBVError.js';
import { ERROR_CODES, MAX_FILE_SIZE } from './constants.js';
import { makeTagKey } from '../dicomDictionary.js';

/**
 * DICOM 파일에서 픽셀 데이터를 추출한다.
 * @param {ArrayBuffer} buffer - 전체 DICOM 파일 버퍼
 * @param {Object} metadata - 파싱된 DICOMMetadata 객체
 * @param {number} [pixelDataOffset] - metadataParser에서 캐시된 픽셀 데이터 오프셋
 * @param {number} [pixelDataLength] - metadataParser에서 캐시된 픽셀 데이터 길이
 * @returns {{ voxelData: ArrayBuffer, warnings: Array }} 복셀 데이터와 경고 목록
 */
export function parsePixelData(buffer, metadata, pixelDataOffset, pixelDataLength) {
  if (!buffer) {
    throw new ParseError('버퍼가 null입니다', ERROR_CODES.PARSE_ERR_PIXEL_DATA_EXTRACTION);
  }

  if (buffer.byteLength > MAX_FILE_SIZE) {
    throw new ParseError('파일 크기 초과', ERROR_CODES.PARSE_ERR_FILE_TOO_LARGE);
  }

  const view = new DataView(buffer);
  const warnings = [];

  // 1. 명시적 오프셋 전달 또는 버퍼 탐색(폴백)
  let resolvedOffset = -1;
  let resolvedLength = 0;

  if (typeof pixelDataOffset === 'number' && pixelDataOffset >= 0) {
    resolvedOffset = pixelDataOffset;
    resolvedLength = pixelDataLength || 0;
  } else {
    // 버퍼에서 Tag(7FE0,0010) 수동 탐색 (폴백 전용, 성능 최적화는 _pixelDataOffset 캐시 경로 사용)
    const tagStart = findPixelDataTag(view, buffer.byteLength);
    if (tagStart >= 0) {
      // Explicit VR LE: tag(4) + VR(2) + reserved(2) + length(4) = 12바이트 헤더
      // TODO: Big Endian 파일에서는 헤더 크기가 동일하나 length 읽기 바이트오더가 다름
      if (tagStart + 12 <= buffer.byteLength) {
        resolvedLength = view.getUint32(tagStart + 8, true);
        resolvedOffset = tagStart + 12;
      }
    }
  }

  if (resolvedOffset < 0 || resolvedOffset >= buffer.byteLength) {
    throw new ParseError('픽셀 데이터 태그를 찾을 수 없습니다', ERROR_CODES.PARSE_ERR_PIXEL_DATA_EXTRACTION);
  }

  // 2. 예상 길이 계산
  const bytesPerPixel = (metadata.bitsAllocated || 16) / 8;
  const samplesPerPixel = metadata.samplesPerPixel || 1;
  const expectedLength = (metadata.rows || 0) * (metadata.columns || 0) * bytesPerPixel * samplesPerPixel;

  // 3. 실제 길이 결정
  const actualLength = resolvedLength > 0 ? resolvedLength : expectedLength;

  if (expectedLength > 0 && actualLength !== expectedLength) {
    warnings.push({
      code: 'PARSE_WARN_PIXEL_LENGTH_MISMATCH',
      message: '픽셀 데이터 길이 불일치: 예상=' + expectedLength + ', 실제=' + actualLength,
      severity: 'warning'
    });
  }

  // 4. 데이터 추출
  const endOffset = Math.min(resolvedOffset + actualLength, buffer.byteLength);
  const voxelData = buffer.slice(resolvedOffset, endOffset);

  return { voxelData, warnings };
}

/**
 * 버퍼에서 픽셀 데이터 태그(7FE0,0010)를 탐색한다.
 * @param {DataView} view
 * @param {number} bufferLength
 * @returns {number} 태그 시작 오프셋 (없으면 -1)
 */
function findPixelDataTag(view, bufferLength) {
  const targetGroup = 0x7FE0;
  const targetElement = 0x0010;
  // 132바이트 이후부터 탐색
  for (let offset = 132; offset < bufferLength - 4; offset += 2) {
    try {
      const group = view.getUint16(offset, true);
      const element = view.getUint16(offset + 2, true);
      if (group === targetGroup && element === targetElement) {
        return offset;
      }
    } catch (e) {
      break;
    }
  }
  return -1;
}
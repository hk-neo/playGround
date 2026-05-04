/**
 * @file DICOM 픽셀 데이터 파서
 * @module data/dicomParser/pixelDataParser
 * @description DICOM 파일에서 픽셀(복셀) 데이터 태그를 탐색하고 추출
 * 추적: FR-1.4, US-4, TC-4.1~TC-4.4, HAZ-1.1
 */

import { ParseError } from '../../errors/CBVError.js';
import { ERROR_CODES, MAX_FILE_SIZE, PIXEL_DATA_TAG, DICOM_MIN_FILE_SIZE } from './constants.js';

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
      // TODO-BE: Big Endian 파일에서는 length 읽기 바이트오더가 다름 (isLittleEndian=false)
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
 * DICOM 버퍼에서 픽셀 데이터 태그(7FE0,0010)의 오프셋을 선형 탐색한다.
 * 정상 파싱 경로에서 오프셋을 찾지 못한 경우 호출되는 폴백 함수.
 * 테스트 접근용으로 export됨 (프로덕션 코드에서는 parsePixelData()를 통해서만 간접 호출)
 * @param {DataView} view - DICOM 파일의 DataView
 * @param {number} bufferLength - 버퍼 전체 길이(바이트)
 * @returns {number} 태그 시작 오프셋, 미발견 시 -1
 * @trace FR-1.4, FR-2.2, NFR-1, HAZ-5.3, HAZ-1.1
 */
// @private 테스트 접근용 export (프로덕션 코드에서는 직접 호출 금지)
export function findPixelDataTag(view, bufferLength) {
  const DICOM_PREAMBLE_SIZE = DICOM_MIN_FILE_SIZE; // 128(프리앰블) + 4(DICM 매직바이트) = 132
  const targetGroup = PIXEL_DATA_TAG.group;    // 0x7FE0
  const targetElement = PIXEL_DATA_TAG.element; // 0x0010

  // 입력 검증: bufferLength가 프리앰블 크기 이하면 탐색 불가 (FR-009, HAZ-5.3)
  if (bufferLength <= DICOM_PREAMBLE_SIZE) {
    return -1;
  }

  // DICOM 태그는 항상 짝수 오프셋에 정렬되므로 2바이트 간격으로 탐색 (NFR-002)
  // TODO-BE: Big Endian DICOM 파일 지원 시 양방향 검사 로직 추가 필요
  for (let offset = DICOM_PREAMBLE_SIZE; offset + 4 <= bufferLength; offset += 2) {
    try {
      // Little Endian(littleEndian=true)으로 group/element 읽기 (FR-005)
      const group = view.getUint16(offset, true);
      const element = view.getUint16(offset + 2, true);
      if (group === targetGroup && element === targetElement) {
        return offset; // 매치 발견 시 즉시 반환 (FR-006)
      }
    } catch (_e) {
      break; // DataView 읽기 예외 발생 시 루프 탈출 (FR-007, NFR-001)
    }
  }

  return -1; // 태그 미발견 - 호출자가 ParseError 처리 (FR-008, HAZ-1.1)
}
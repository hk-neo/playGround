/**
 * @file 필수 태그 누락 DICOM 버퍼 생성 헬퍼
 * @description 필수 태그(rows/columns/bitsAllocated/pixelRepresentation)를 선택적으로 누락
 */

import { PREAMBLE_LENGTH } from '../../../src/data/dicomParser/constants.js';

/**
 * Explicit VR LE 태그 헤더 작성
 */
function writeExplicitTag(view, offset, group, element, vr, length) {
  view.setUint16(offset, group, true); offset += 2;
  view.setUint16(offset, element, true); offset += 2;
  view.setUint8(offset, vr.charCodeAt(0));
  view.setUint8(offset + 1, vr.charCodeAt(1)); offset += 2;
  view.setUint16(offset, length, true); offset += 2;
  return offset;
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
  return offset + str.length;
}

function writeMetaGroup(view, offset) {
  offset = writeExplicitTag(view, offset, 0x0002, 0x0000, 'UL', 4);
  const groupLengthPos = offset;
  view.setUint32(offset, 0, true); offset += 4;
  const tsUID = '1.2.840.10008.1.2.1';
  const padded = tsUID + '\0'.repeat(Math.max(0, 24 - tsUID.length));
  offset = writeExplicitTag(view, offset, 0x0002, 0x0010, 'UI', padded.length);
  offset = writeString(view, offset, padded);
  view.setUint32(groupLengthPos, offset - (groupLengthPos + 4), true);
  return offset;
}

/**
 * 지정된 필수 태그를 누락한 DICOM 버퍼를 생성한다.
 * @param {Object} omit - 누락할 태그 지정 { rows, columns, bitsAllocated, pixelRepresentation }
 * @returns {ArrayBuffer}
 */
export function createMissingRequiredBuffer(omit = {}) {
  const totalSize = 2048;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;

  // 프리앰블 + 매직바이트
  offset = PREAMBLE_LENGTH;
  offset = writeString(view, offset, 'DICM');

  // 메타 그룹
  offset = writeMetaGroup(view, offset);

  // 조건부 태그 작성 (omit에 없는 것만)
  if (!omit.rows) {
    offset = writeExplicitTag(view, offset, 0x0028, 0x0010, 'US', 2);
    view.setUint16(offset, 512, true); offset += 2;
  }
  if (!omit.columns) {
    offset = writeExplicitTag(view, offset, 0x0028, 0x0011, 'US', 2);
    view.setUint16(offset, 512, true); offset += 2;
  }
  if (!omit.bitsAllocated) {
    offset = writeExplicitTag(view, offset, 0x0028, 0x0100, 'US', 2);
    view.setUint16(offset, 16, true); offset += 2;
  }
  if (!omit.pixelRepresentation) {
    offset = writeExplicitTag(view, offset, 0x0028, 0x0103, 'US', 2);
    view.setUint16(offset, 0, true); offset += 2;
  }

  return buffer.slice(0, Math.max(offset, 256));
}

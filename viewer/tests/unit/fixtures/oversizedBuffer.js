/**
 * @file MAX_TAG_COUNT 초과 버퍼 생성 헬퍼
 * @description 태그가 10000개를 초과하는 DICOM 버퍼 생성
 */

import { PREAMBLE_LENGTH } from '../../../src/data/dicomParser/constants.js';

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
 * 지정된 수의 더미 태그를 포함한 DICOM 버퍼를 생성한다.
 * 각 태그는 그룹 0x0008, element 증가, VR=LO, 값='X' 형식이다.
 * @param {number} tagCount - 생성할 더미 태그 수
 * @returns {ArrayBuffer}
 */
export function createOversizedBuffer(tagCount = 10001) {
  const tagSize = 8 + 1; // Explicit tag header(8) + value 'X'(1)
  const totalSize = 256 + tagCount * tagSize + 64;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;

  // 프리앰블 + 매직바이트
  offset = PREAMBLE_LENGTH;
  offset = writeString(view, offset, 'DICM');

  // 메타 그룹
  offset = writeMetaGroup(view, offset);

  // 필수 태그 1개 포함 (rows) - 검증에 활용
  offset = writeExplicitTag(view, offset, 0x0028, 0x0010, 'US', 2);
  view.setUint16(offset, 256, true); offset += 2;

  // 더미 태그 생성
  for (let i = 0; i < tagCount; i++) {
    offset = writeExplicitTag(view, offset, 0x0008, 0x0001 + (i % 0xFFFE), 'LO', 1);
    view.setUint8(offset, 0x58); offset += 1; // 'X'
  }

  return buffer.slice(0, offset);
}

/**
 * 픽셀 데이터 그룹(0x7FE0) 이후에 더미 태그가 있는 버퍼를 생성한다.
 * 조기 종료 테스트에 활용: 0x7FE0 이후 태그는 순회되지 않아야 함.
 * @param {Object} [options]
 * @param {number} [options.tagsAfterPixelData=10] - 픽셀 데이터 이후 더미 태그 수
 * @returns {ArrayBuffer}
 */
export function createBufferWithPixelDataGroup(options = {}) {
  const tagsAfterPixelData = options.tagsAfterPixelData || 10;
  const totalSize = 4096;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;

  offset = PREAMBLE_LENGTH;
  offset = writeString(view, offset, 'DICM');
  offset = writeMetaGroup(view, offset);

  // 필수 태그
  offset = writeExplicitTag(view, offset, 0x0028, 0x0010, 'US', 2);
  view.setUint16(offset, 256, true); offset += 2;
  offset = writeExplicitTag(view, offset, 0x0028, 0x0011, 'US', 2);
  view.setUint16(offset, 256, true); offset += 2;
  offset = writeExplicitTag(view, offset, 0x0028, 0x0100, 'US', 2);
  view.setUint16(offset, 16, true); offset += 2;
  offset = writeExplicitTag(view, offset, 0x0028, 0x0103, 'US', 2);
  view.setUint16(offset, 0, true); offset += 2;

  // 마커 태그: (0010,0010) PatientName = 'MarkerBeforePixel'
  offset = writeExplicitTag(view, offset, 0x0010, 0x0010, 'PN', 17);
  offset = writeString(view, offset, 'MarkerBeforePixel');

  // 픽셀 데이터 태그 (7FE0,0010) - 확장 VR OW
  view.setUint16(offset, 0x7FE0, true); offset += 2;
  view.setUint16(offset, 0x0010, true); offset += 2;
  view.setUint8(offset, 'O'.charCodeAt(0));
  view.setUint8(offset + 1, 'W'.charCodeAt(0)); offset += 2;
  view.setUint16(offset, 0, true); offset += 2; // reserved
  view.setUint32(offset, 100, true); offset += 4; // length=100

  // 픽셀 데이터 이후 더미 태그 (순회되지 않아야 함)
  for (let i = 0; i < tagsAfterPixelData; i++) {
    offset = writeExplicitTag(view, offset, 0x0008, 0x0100 + i, 'LO', 4);
    offset = writeString(view, offset, 'DUMY');
  }

  return buffer.slice(0, offset);
}

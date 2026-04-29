/**
 * @file 유효한 DICOM 버퍼 생성 헬퍼
 * @description 15개 메타데이터 필드가 모두 포함된 Explicit VR Little Endian DICOM 버퍼 생성
 */

import { PREAMBLE_LENGTH } from '../../../src/data/dicomParser/constants.js';

/**
 * Explicit VR LE 태그 헤더를 작성한다 (group 2 + element 2 + VR 2 + length 2 = 8바이트)
 * @param {DataView} view
 * @param {number} offset
 * @param {number} group
 * @param {number} element
 * @param {string} vr - 2자 VR 문자열
 * @param {number} length - 값 길이
 * @returns {number} 다음 오프셋
 */
function writeExplicitTag(view, offset, group, element, vr, length) {
  view.setUint16(offset, group, true);
  offset += 2;
  view.setUint16(offset, element, true);
  offset += 2;
  // VR 문자열 (2바이트, little-endian 문자)
  view.setUint8(offset, vr.charCodeAt(0));
  view.setUint8(offset + 1, vr.charCodeAt(1));
  offset += 2;
  // Length (2바이트, 일반 VR)
  view.setUint16(offset, length, true);
  offset += 2;
  return offset;
}

/**
 * 확장 VR(OB/OW) 태그 헤더를 작성한다 (group 2 + element 2 + VR 2 + reserved 2 + length 4 = 12바이트)
 */
function writeExtendedTag(view, offset, group, element, vr, length) {
  view.setUint16(offset, group, true);
  offset += 2;
  view.setUint16(offset, element, true);
  offset += 2;
  view.setUint8(offset, vr.charCodeAt(0));
  view.setUint8(offset + 1, vr.charCodeAt(1));
  offset += 2;
  view.setUint16(offset, 0, true); // reserved
  offset += 2;
  view.setUint32(offset, length, true);
  offset += 4;
  return offset;
}

/**
 * 문자열 값을 버퍼에 쓴다 (패딩 포함)
 */
function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
  return offset + str.length;
}

/**
 * DICOM 파일 메타 정보 그룹(0002)을 작성한다
 */
function writeMetaGroup(view, offset) {
  const metaGroupStart = offset;
  // (0002,0000) Group Length - 나중에 채움
  offset = writeExplicitTag(view, offset, 0x0002, 0x0000, 'UL', 4);
  const groupLengthPos = offset;
  view.setUint32(offset, 0, true); // placeholder
  offset += 4;

  // (0002,0010) Transfer Syntax UID = Explicit VR Little Endian
  const tsUID = '1.2.840.10008.1.2.1';
  const paddedTsUID = tsUID + '\0'.repeat(Math.max(0, 24 - tsUID.length));
  offset = writeExplicitTag(view, offset, 0x0002, 0x0010, 'UI', paddedTsUID.length);
  offset = writeString(view, offset, paddedTsUID);

  // Group Length 채우기 (Group Length 값 제외 전체 길이)
  const groupLength = offset - (groupLengthPos + 4);
  view.setUint32(groupLengthPos, groupLength, true);

  return offset;
}

/**
 * 유효한 DICOM 버퍼를 생성한다.
 * 15개 메타데이터 필드가 모두 포함되며, 픽셀 데이터 그룹(7FE0)도 포함한다.
 * @param {Object} [overrides] - 특정 필드값 덮어쓰기
 * @returns {ArrayBuffer}
 */
export function createValidBuffer(overrides = {}) {
  const totalSize = 4096;
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  let offset = 0;

  // 프리앰블 (128바이트) + 매직 바이트 'DICM'
  offset = PREAMBLE_LENGTH;
  offset = writeString(view, offset, 'DICM');

  // 파일 메타 정보 그룹(0002)
  offset = writeMetaGroup(view, offset);

  // --- 데이터셋 태그 ---

  // (0010,0010) PatientName = 'TestPatient'
  const pn = overrides.patientName !== undefined ? overrides.patientName : 'TestPatient';
  offset = writeExplicitTag(view, offset, 0x0010, 0x0010, 'PN', pn.length);
  offset = writeString(view, offset, pn);

  // (0010,0020) PatientID = 'PID001'
  const pid = overrides.patientID !== undefined ? overrides.patientID : 'PID001';
  offset = writeExplicitTag(view, offset, 0x0010, 0x0020, 'LO', pid.length);
  offset = writeString(view, offset, pid);

  // (0020,000D) StudyInstanceUID
  const studyUID = overrides.studyInstanceUID !== undefined ? overrides.studyInstanceUID : '1.2.3.4.5';
  offset = writeExplicitTag(view, offset, 0x0020, 0x000D, 'UI', studyUID.length + 1);
  offset = writeString(view, offset, studyUID + '\0');

  // (0020,000E) SeriesInstanceUID
  const seriesUID = overrides.seriesInstanceUID !== undefined ? overrides.seriesInstanceUID : '1.2.3.4.6';
  offset = writeExplicitTag(view, offset, 0x0020, 0x000E, 'UI', seriesUID.length + 1);
  offset = writeString(view, offset, seriesUID + '\0');

  // (0028,0010) Rows = 512
  const rows = overrides.rows !== undefined ? overrides.rows : 512;
  offset = writeExplicitTag(view, offset, 0x0028, 0x0010, 'US', 2);
  view.setUint16(offset, rows, true);
  offset += 2;

  // (0028,0011) Columns = 512
  const cols = overrides.columns !== undefined ? overrides.columns : 512;
  offset = writeExplicitTag(view, offset, 0x0028, 0x0011, 'US', 2);
  view.setUint16(offset, cols, true);
  offset += 2;

  // (0028,0100) BitsAllocated = 16
  const ba = overrides.bitsAllocated !== undefined ? overrides.bitsAllocated : 16;
  offset = writeExplicitTag(view, offset, 0x0028, 0x0100, 'US', 2);
  view.setUint16(offset, ba, true);
  offset += 2;

  // (0028,0101) BitsStored = 12
  const bs = overrides.bitsStored !== undefined ? overrides.bitsStored : 12;
  offset = writeExplicitTag(view, offset, 0x0028, 0x0101, 'US', 2);
  view.setUint16(offset, bs, true);
  offset += 2;

  // (0028,0103) PixelRepresentation = 0
  const pr = overrides.pixelRepresentation !== undefined ? overrides.pixelRepresentation : 0;
  offset = writeExplicitTag(view, offset, 0x0028, 0x0103, 'US', 2);
  view.setUint16(offset, pr, true);
  offset += 2;

  // (0028,1050) WindowCenter = 40
  const wc = overrides.windowCenter !== undefined ? overrides.windowCenter : '40';
  const wcStr = String(wc);
  offset = writeExplicitTag(view, offset, 0x0028, 0x1050, 'DS', wcStr.length);
  offset = writeString(view, offset, wcStr);

  // (0028,1051) WindowWidth = 400
  const ww = overrides.windowWidth !== undefined ? overrides.windowWidth : '400';
  const wwStr = String(ww);
  offset = writeExplicitTag(view, offset, 0x0028, 0x1051, 'DS', wwStr.length);
  offset = writeString(view, offset, wwStr);

  // (0018,0050) SliceThickness = 0.3
  const st = overrides.sliceThickness !== undefined ? overrides.sliceThickness : '0.3';
  const stStr = String(st);
  offset = writeExplicitTag(view, offset, 0x0018, 0x0050, 'DS', stStr.length);
  offset = writeString(view, offset, stStr);

  // (0028,0030) PixelSpacing = '0.2\\0.3' (DS 다중값)
  const ps = overrides.pixelSpacing !== undefined ? overrides.pixelSpacing : '0.2\\0.3';
  const psStr = String(ps);
  offset = writeExplicitTag(view, offset, 0x0028, 0x0030, 'DS', psStr.length);
  offset = writeString(view, offset, psStr);

  // (0028,0004) PhotometricInterpretation = 'MONOCHROME2'
  const pi = overrides.photometricInterpretation !== undefined ? overrides.photometricInterpretation : 'MONOCHROME2';
  const piPadded = pi + ' '.repeat(Math.max(0, 16 - pi.length));
  offset = writeExplicitTag(view, offset, 0x0028, 0x0004, 'CS', piPadded.length);
  offset = writeString(view, offset, piPadded);

  // (0028,0002) SamplesPerPixel = 1
  const sp = overrides.samplesPerPixel !== undefined ? overrides.samplesPerPixel : 1;
  offset = writeExplicitTag(view, offset, 0x0028, 0x0002, 'US', 2);
  view.setUint16(offset, sp, true);
  offset += 2;

  // 픽셀 데이터 태그 (7FE0,0010) - 확장 VR (OW)
  const pixelDataLen = overrides._pixelDataLength || 262144;
  const pixelDataStart = offset;
  offset = writeExtendedTag(view, offset, 0x7FE0, 0x0010, 'OW', pixelDataLen);

  // _pixelDataOffset 기록
  return buffer.slice(0, Math.max(offset, 256));
}

export { writeExplicitTag, writeExtendedTag, writeString, writeMetaGroup };

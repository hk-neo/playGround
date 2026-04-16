/**
 * @file DICOM 테스트 픽스처 빌더
 * @description 단위 테스트에서 사용할 가상 DICOM 파일 버퍼를 생성하는 빌더 유틸리티
 */

/**
 * DICOM 태그를 Explicit VR Little Endian 형식으로 버퍼에 쓴다.
 * @param {DataView} view
 * @param {number} offset
 * @param {number} group
 * @param {number} element
 * @param {string} vr
 * @param {number|string|number[]|Uint8Array} value
 * @returns {number} 다음 오프셋
 */
export function writeTagExplicitLE(view, offset, group, element, vr, value) {
  const bytes = new Uint8Array(view.buffer);

  // Group (2 bytes LE)
  view.setUint16(offset, group, true);
  offset += 2;
  // Element (2 bytes LE)
  view.setUint16(offset, element, true);
  offset += 2;

  const isExtendedLength = ['OB', 'OW', 'OF', 'SQ', 'UC', 'UN', 'UR', 'UT'].includes(vr);

  if (isExtendedLength) {
    // VR (2 bytes)
    bytes[offset] = vr.charCodeAt(0);
    bytes[offset + 1] = vr.charCodeAt(1);
    offset += 2;
    // Reserved (2 bytes)
    view.setUint16(offset, 0, true);
    offset += 2;
    // Length (4 bytes)
    let data;
    if (value instanceof Uint8Array) {
      data = value;
    } else if (typeof value === 'string') {
      data = new TextEncoder().encode(value);
    } else if (Array.isArray(value)) {
      data = new Uint8Array(value);
    } else {
      data = new Uint8Array(0);
    }
    view.setUint32(offset, data.length, true);
    offset += 4;
    // Value
    bytes.set(data, offset);
    offset += data.length;
  } else {
    // VR (2 bytes)
    bytes[offset] = vr.charCodeAt(0);
    bytes[offset + 1] = vr.charCodeAt(1);
    offset += 2;

    if (vr === 'US') {
      view.setUint16(offset, 2, true);
      offset += 2;
      view.setUint16(offset, value, true);
      offset += 2;
    } else if (vr === 'SS') {
      view.setUint16(offset, 2, true);
      offset += 2;
      view.setInt16(offset, value, true);
      offset += 2;
    } else if (vr === 'UL') {
      view.setUint16(offset, 4, true);
      offset += 2;
      view.setUint32(offset, value, true);
      offset += 4;
    } else if (vr === 'DS' || vr === 'IS') {
      const strVal = String(value);
      const padded = strVal.length % 2 !== 0 ? strVal + ' ' : strVal;
      view.setUint16(offset, padded.length, true);
      offset += 2;
      for (let i = 0; i < padded.length; i++) {
        bytes[offset + i] = padded.charCodeAt(i);
      }
      offset += padded.length;
    } else {
      // String VR (LO, SH, PN, UI, CS, DA, TM, DT)
      const strVal = String(value || '');
      const padded = strVal.length % 2 !== 0 ? strVal + '\0' : strVal;
      view.setUint16(offset, padded.length, true);
      offset += 2;
      for (let i = 0; i < padded.length; i++) {
        bytes[offset + i] = padded.charCodeAt(i);
      }
      offset += padded.length;
    }
  }

  return offset;
}

/**
 * 프리앰블 + 매직 바이트를 버퍼에 쓴다.
 * @param {Uint8Array} bytes
 * @returns {number} 다음 오프셋 (132)
 */
export function writePreambleAndMagic(bytes) {
  // 128바이트 프리앰블 (0으로 채움)
  // bytes는 이미 0으로 초기화됨
  // DICM 매직 바이트
  bytes[128] = 0x44; // D
  bytes[129] = 0x49; // I
  bytes[130] = 0x43; // C
  bytes[131] = 0x4D; // M
  return 132;
}

/**
 * 최소 DICOM 버퍼를 생성한다.
 * @param {Object} [options] 태그 오버라이드
 * @param {number} [options.rows=2]
 * @param {number} [options.columns=2]
 * @param {number} [options.bitsAllocated=16]
 * @param {number} [options.pixelRepresentation=0]
 * @param {string} [options.patientName='TestPatient']
 * @param {string} [options.patientID='T001']
 * @param {string} [options.transferSyntaxUID='1.2.840.10008.1.2.1']
 * @param {boolean} [options.includePixelData=true]
 * @param {Uint8Array} [options.pixelDataOverride]
 * @returns {ArrayBuffer}
 */
export function createMinimalDICOMBuffer(options = {}) {
  const {
    rows = 2,
    columns = 2,
    bitsAllocated = 16,
    pixelRepresentation = 0,
    patientName = 'TestPatient',
    patientID = 'T001',
    transferSyntaxUID = '1.2.840.10008.1.2.1',
    includePixelData = true,
    pixelDataOverride,
  } = options;

  const pixelDataSize = includePixelData ? rows * columns * (bitsAllocated / 8) : 0;
  const bufferSize = 4096 + pixelDataSize; // 충분한 공간 확보
  const bytes = new Uint8Array(bufferSize);
  const view = new DataView(bytes.buffer);

  let offset = writePreambleAndMagic(bytes);

  // File Meta Information Group Length (0002,0000) - 그룹 길이를 나중에 채움
  const groupLengthOffset = offset + 8; // tag(4) + VR(2) + length(2) 이후
  offset = writeTagExplicitLE(view, offset, 0x0002, 0x0000, 'UL', 0); // placeholder

  // Transfer Syntax UID (0002,0010)
  offset = writeTagExplicitLE(view, offset, 0x0002, 0x0010, 'UI', transferSyntaxUID);

  // Media Storage SOP Class UID (0002,0002)
  offset = writeTagExplicitLE(view, offset, 0x0002, 0x0002, 'UI', '1.2.840.10008.5.1.4.1.1.2');

  // Media Storage SOP Instance UID (0002,0003)
  offset = writeTagExplicitLE(view, offset, 0x0002, 0x0003, 'UI', '1.2.3.4.5.6.7.8');

  // 그룹 길이 업데이트
  const groupLength = offset - groupLengthOffset;
  view.setUint32(groupLengthOffset, groupLength, true);

  // 데이터셋 태그 (메타데이터)
  offset = writeTagExplicitLE(view, offset, 0x0010, 0x0010, 'PN', patientName);
  offset = writeTagExplicitLE(view, offset, 0x0010, 0x0020, 'LO', patientID);
  offset = writeTagExplicitLE(view, offset, 0x0020, 0x000D, 'UI', '1.2.3.4.5.6.7.8.9');
  offset = writeTagExplicitLE(view, offset, 0x0020, 0x000E, 'UI', '1.2.3.4.5.6.7.8.9.0');
  offset = writeTagExplicitLE(view, offset, 0x0028, 0x0010, 'US', rows);
  offset = writeTagExplicitLE(view, offset, 0x0028, 0x0011, 'US', columns);
  offset = writeTagExplicitLE(view, offset, 0x0028, 0x0100, 'US', bitsAllocated);
  offset = writeTagExplicitLE(view, offset, 0x0028, 0x0101, 'US', bitsAllocated);
  offset = writeTagExplicitLE(view, offset, 0x0028, 0x0102, 'US', bitsAllocated - 1);
  offset = writeTagExplicitLE(view, offset, 0x0028, 0x0103, 'US', pixelRepresentation);

  // 선택 태그
  offset = writeTagExplicitLE(view, offset, 0x0028, 0x1050, 'DS', 40);
  offset = writeTagExplicitLE(view, offset, 0x0028, 0x1051, 'DS', 400);
  offset = writeTagExplicitLE(view, offset, 0x0018, 0x0050, 'DS', 0.5);
  offset = writeTagExplicitLE(view, offset, 0x0028, 0x0030, 'DS', '0.5\\0.5');
  offset = writeTagExplicitLE(view, offset, 0x0028, 0x0004, 'CS', 'MONOCHROME2');
  offset = writeTagExplicitLE(view, offset, 0x0028, 0x0002, 'US', 1);

  // 픽셀 데이터
  if (includePixelData) {
    const pixelData = pixelDataOverride || new Uint8Array(pixelDataSize);
    offset = writeTagExplicitLE(view, offset, 0x7FE0, 0x0010, 'OW', pixelData);
  }

  return bytes.buffer.slice(0, offset);
}

/**
 * 매직 바이트가 없는 무효 버퍼를 생성한다.
 * @param {number} [size=200]
 * @returns {ArrayBuffer}
 */
export function createInvalidDICOMBuffer(size = 200) {
  const bytes = new Uint8Array(size);
  for (let i = 128; i < 132 && i < size; i++) {
    bytes[i] = 0x00;
  }
  return bytes.buffer;
}

/**
 * 프리앰블은 있으나 시그니처가 다른 버퍼를 생성한다.
 * @returns {ArrayBuffer}
 */
export function createWrongSignatureBuffer() {
  const bytes = new Uint8Array(200);
  bytes[128] = 0x58; // X
  bytes[129] = 0x59; // Y
  bytes[130] = 0x5A; // Z
  bytes[131] = 0x57; // W
  return bytes.buffer;
}

/**
 * 132바이트 미만 버퍼를 생성한다.
 * @param {number} [size=64]
 * @returns {ArrayBuffer}
 */
export function createTooShortBuffer(size = 64) {
  return new Uint8Array(size).buffer;
}

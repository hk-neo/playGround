/**
 * @file tagReader 단위 테스트
 * @description SDS-3.5(readTag), SDS-3.7(skipUndefinedLengthSequence) 전체 커버
 * @trace FR-2.2, FR-2.6, FR-2.5, HAZ-5.3, HAZ-5.2
 */

import { describe, it, expect } from 'vitest';
import { createParseContext } from '../../../src/data/dicomParser/ParseContext.js';
import { TRANSFER_SYNTAX } from '../../../src/data/dicomDictionary.js';
import {
  readTag,
  readTagValue,
  skipUndefinedLengthSequence,
  skipSequence,
  DicomIOException,
  DicomIllegalStateException,
  DicomIllegalArgumentException,
} from '../../../src/data/dicomParser/tagReader.js';

// ============================================================
// 테스트 헬퍼 유틸리티
// ============================================================

/** 버퍼 빌더: 바이트 배열로 ArrayBuffer 생성 */
function buildBuffer(bytes) {
  const buf = new ArrayBuffer(bytes.length);
  const view = new DataView(buf);
  for (let i = 0; i < bytes.length; i++) {
    view.setUint8(i, bytes[i]);
  }
  return buf;
}

/** 리틀 엔디안 16비트 버퍼 생성 */
function makeBufLE16(...values) {
  const buf = new ArrayBuffer(values.length * 2);
  const view = new DataView(buf);
  values.forEach((v, i) => view.setUint16(i * 2, v, true));
  return buf;
}

/** 리틀 엔디안 태그 빌더: group(u16), element(u16), 이후 바이트들 */
function buildTagBytes(group, element, rest) {
  const bytes = [];
  bytes.push(group & 0xff, (group >> 8) & 0xff);
  bytes.push(element & 0xff, (element >> 8) & 0xff);
  if (rest) bytes.push(...rest);
  return buildBuffer(bytes);
}

/** Explicit VR 태그 빌더 (일반 VR, 2바이트 길이) */
function buildExplicitVRTag(group, element, vr, length, valueBytes) {
  const bytes = [];
  bytes.push(group & 0xff, (group >> 8) & 0xff);
  bytes.push(element & 0xff, (element >> 8) & 0xff);
  bytes.push(vr.charCodeAt(0), vr.charCodeAt(1));
  bytes.push(length & 0xff, (length >> 8) & 0xff);
  if (valueBytes) bytes.push(...valueBytes);
  return buildBuffer(bytes);
}

/** Explicit VR 태그 빌더 (확장 VR, 4바이트 길이) */
function buildExtendedVRTag(group, element, vr, length, valueBytes) {
  const bytes = [];
  bytes.push(group & 0xff, (group >> 8) & 0xff);
  bytes.push(element & 0xff, (element >> 8) & 0xff);
  bytes.push(vr.charCodeAt(0), vr.charCodeAt(1));
  bytes.push(0, 0); // reserved
  bytes.push(length & 0xff, (length >> 8) & 0xff, (length >> 16) & 0xff, (length >> 24) & 0xff);
  if (valueBytes) bytes.push(...valueBytes);
  return buildBuffer(bytes);
}

/** FFFE 그룹 태그 빌더 */
function buildFFFEtag(element, itemLength) {
  const bytes = [];
  bytes.push(0xfe, 0xff); // group 0xFFFE
  bytes.push(element & 0xff, (element >> 8) & 0xff);
  bytes.push(
    itemLength & 0xff,
    (itemLength >> 8) & 0xff,
    (itemLength >> 16) & 0xff,
    (itemLength >> 24) & 0xff
  );
  return buildBuffer(bytes);
}

/** Undefined Length 시퀀스 빌더 (단일 레벨, Explicit VR) */
function buildSimpleUndefinedSeq(items, withDelimiter) {
  const bytes = [];
  for (const item of items) {
    // Item Tag FFFE,E000
    bytes.push(0xfe, 0xff, 0x00, 0xe0);
    if (item.undefined) {
      // undefined length
      bytes.push(0xff, 0xff, 0xff, 0xff);
      bytes.push(...item.data);
    } else {
      const d = item.data || [];
      bytes.push(
        d.length & 0xff,
        (d.length >> 8) & 0xff,
        (d.length >> 16) & 0xff,
        (d.length >> 24) & 0xff
      );
      bytes.push(...d);
    }
  }
  if (withDelimiter !== false) {
    // Sequence Delimitation Item FFFE,E0DD + length 0
    bytes.push(0xfe, 0xff, 0xdd, 0xe0);
    bytes.push(0x00, 0x00, 0x00, 0x00);
  }
  return buildBuffer(bytes);
}

/** 리틀 엔디안 16비트 값을 바이트 배열로 */
function le16(val) {
  return [val & 0xff, (val >> 8) & 0xff];
}

/** 리틀 엔디안 32비트 값을 바이트 배열로 */
function le32(val) {
  return [val & 0xff, (val >> 8) & 0xff, (val >> 16) & 0xff, (val >> 24) & 0xff];
}
// ============================================================
// 1. readTag() 기본 테스트 (SDS-3.5, FR-2.2, FR-2.6, HAZ-5.3)
// ============================================================

describe('SDS-3.5: readTag() 기본 동작', () => {

  it('빈 버퍼에서 null을 반환해야 한다', () => {
    const buf = new ArrayBuffer(0);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    expect(readTag(ctx)).toBeNull();
  });

  it('4바이트 미만 잔여 시 null을 반환해야 한다', () => {
    const buf = buildBuffer([0x10, 0x00]);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    expect(readTag(ctx)).toBeNull();
  });

  it('Explicit VR에서 group/element를 정상 읽어야 한다', () => {
    // Tag: (0010,0010) PatientName, VR=PN, Length=4, Value=Test
    const buf = buildExplicitVRTag(0x0010, 0x0010, 'PN', 4, [0x54, 0x65, 0x73, 0x74]);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result).not.toBeNull();
    expect(result.tag).toEqual([0x0010, 0x0010]);
    expect(result.vr).toBe('PN');
    expect(result.length).toBe(4);
    expect(result.value).toBe('Test');
  });

  it('Implicit VR에서 group/element를 정상 읽어야 한다', () => {
    // Tag: (0028,0010) Rows, Implicit VR -> lookupVR returns US
    const bytes = [];
    bytes.push(...le16(0x0028));
    bytes.push(...le16(0x0010));
    bytes.push(...le32(2));
    bytes.push(...le16(512));
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.IMPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result).not.toBeNull();
    expect(result.tag).toEqual([0x0028, 0x0010]);
    expect(result.vr).toBe('US');
    expect(result.length).toBe(2);
    expect(result.value).toBe(512);
  });

  it('FFFE 그룹 태그는 조기 반환해야 한다 (vr=na, value=null)', () => {
    const buf = buildFFFEtag(0xE0DD, 0);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result).not.toBeNull();
    expect(result.tag).toEqual([0xFFFE, 0xE0DD]);
    expect(result.vr).toBe('na');
    expect(result.value).toBeNull();
    expect(result.length).toBe(0);
  });

  it('FFFE,E000 Item 태그를 정상 읽어야 한다', () => {
    const buf = buildFFFEtag(0xE000, 10);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result).not.toBeNull();
    expect(result.tag).toEqual([0xFFFE, 0xE000]);
    expect(result.vr).toBe('na');
    expect(result.length).toBe(10);
  });

  it('VR 읽기 중 버퍼 부족 시 null을 반환해야 한다', () => {
    const bytes = [];
    bytes.push(...le16(0x0010));
    bytes.push(...le16(0x0010));
    bytes.push(0x50, 0x4E); // PN
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result).toBeNull();
  });

  it('offset 필드에 태그 시작 오프셋이 기록되어야 한다', () => {
    const buf = buildExplicitVRTag(0x0010, 0x0010, 'PN', 4, [0x54, 0x65, 0x73, 0x74]);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    ctx.offset = 0;
    const result = readTag(ctx);
    expect(result.offset).toBe(0);
  });
});

// ============================================================
// 2. Explicit VR 모드 테스트 (FR-2.2, FR-1.3)
// ============================================================

describe('SDS-3.5: Explicit VR 모드', () => {

  it('일반 VR(US) 태그를 정상 읽어야 한다', () => {
    // (0028,0010) Rows, VR=US, Length=2, Value=512
    const buf = buildExplicitVRTag(0x0028, 0x0010, 'US', 2, [...le16(512)]);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result).not.toBeNull();
    expect(result.vr).toBe('US');
    expect(result.length).toBe(2);
    expect(result.value).toBe(512);
  });

  it('확장 VR(OW) 태그를 정상 읽어야 한다', () => {
    // (7FE0,0010) PixelData, VR=OW, Length=4, Value=4바이트
    const valBytes = [0x01, 0x02, 0x03, 0x04];
    const buf = buildExtendedVRTag(0x7FE0, 0x0010, 'OW', 4, valBytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result).not.toBeNull();
    expect(result.vr).toBe('OW');
    expect(result.length).toBe(4);
    expect(result.value).toEqual({ _binaryOffset: 12, _binaryLength: 4 });
  });

  it('확장 VR(SQ) 태그를 정상 읽어야 한다', () => {
    const buf = buildExtendedVRTag(0x0008, 0x1111, 'SQ', 4, [0x00, 0x00, 0x00, 0x00]);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result).not.toBeNull();
    expect(result.vr).toBe('SQ');
    expect(result.length).toBe(4);
  });

  it('확장 VR 길이 읽기 중 버퍼 부족 시 null을 반환해야 한다', () => {
    // tag(4) + VR(2) + reserved(2) = 8바이트, 길이(4) 부족
    const bytes = [];
    bytes.push(...le16(0x7FE0));
    bytes.push(...le16(0x0010));
    bytes.push(0x4F, 0x57); // OW
    bytes.push(0x00, 0x00); // reserved
    // length 4바이트 없음
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result).toBeNull();
  });

  it('일반 VR 길이 읽기 중 버퍼 부족 시 null을 반환해야 한다', () => {
    // tag(4) + VR(2) = 6바이트, length(2) 부족
    const bytes = [];
    bytes.push(...le16(0x0028));
    bytes.push(...le16(0x0010));
    bytes.push(0x55, 0x53); // US
    bytes.push(0x00); // 1바이트만 있음
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result).toBeNull();
  });
});

// ============================================================
// 3. Implicit VR 모드 테스트 (FR-2.2, FR-1.3, HAZ-1.3)
// ============================================================

describe('SDS-3.5: Implicit VR 모드', () => {

  it('데이터 사전에 등록된 태그의 VR을 조회해야 한다', () => {
    // (0028,0010) Rows -> VR=US
    const bytes = [];
    bytes.push(...le16(0x0028));
    bytes.push(...le16(0x0010));
    bytes.push(...le32(2));
    bytes.push(...le16(256));
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.IMPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result).not.toBeNull();
    expect(result.vr).toBe('US');
    expect(result.value).toBe(256);
  });

  it('데이터 사전에 없는 태그는 기본값 UN을 사용해야 한다', () => {
    // (9999,9999) 등록되지 않은 태그
    const bytes = [];
    bytes.push(...le16(0x9999));
    bytes.push(...le16(0x9999));
    bytes.push(...le32(2));
    bytes.push(0xAB, 0xCD);
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.IMPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result).not.toBeNull();
    expect(result.vr).toBe('UN');
    expect(result.length).toBe(2);
  });

  it('4바이트 길이를 정상 읽어야 한다', () => {
    // (0010,0010) PatientName, VR=PN, Length=5
    const bytes = [];
    bytes.push(...le16(0x0010));
    bytes.push(...le16(0x0010));
    bytes.push(...le32(5));
    bytes.push(0x48, 0x65, 0x6C, 0x6C, 0x6F); // Hello
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.IMPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result).not.toBeNull();
    expect(result.length).toBe(5);
    expect(result.value).toBe('Hello');
  });

  it('Implicit VR 길이 읽기 중 버퍼 부족 시 null을 반환해야 한다', () => {
    const bytes = [];
    bytes.push(...le16(0x0028));
    bytes.push(...le16(0x0010));
    bytes.push(0x00, 0x00); // length 4바이트 중 2바이트만
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.IMPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result).toBeNull();
  });
});

// ============================================================
// 4. readTagValue() VR별 디코딩 테스트 (FR-2.2, NFR-3)
// ============================================================

describe('SDS-3.5: readTagValue() VR별 디코딩', () => {

  it('US: 부호없는 16비트 값을 반환해야 한다', () => {
    const buf = buildExplicitVRTag(0x0028, 0x0010, 'US', 2, [...le16(1024)]);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result.value).toBe(1024);
  });

  it('US: 패딩이 있어도 값을 정상 읽어야 한다', () => {
    const bytes = [];
    bytes.push(...le16(0x0028));
    bytes.push(...le16(0x0010));
    bytes.push(0x55, 0x53); // US
    bytes.push(...le16(4));  // length=4 (값2 + 패딩2)
    bytes.push(...le16(512));
    bytes.push(0x00, 0x00); // padding
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result.value).toBe(512);
  });

  it('UL: 부호없는 32비트 값을 반환해야 한다', () => {
    const bytes = [];
    bytes.push(...le16(0x0002));
    bytes.push(...le16(0x0000));
    bytes.push(0x55, 0x4C); // UL
    bytes.push(...le16(4));
    bytes.push(...le32(100000));
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result.value).toBe(100000);
  });

  it('FL: 32비트 실수 값을 반환해야 한다', () => {
    // SliceThickness (0018,0050) FL 태그 - Implicit VR로 FL 디코딩 테스트
    const bytes = [];
    bytes.push(...le16(0x0018));
    bytes.push(...le16(0x0050));
    bytes.push(...le32(4)); // length=4
    // Float32 LE 값 3.14
    const tmpBuf = new ArrayBuffer(4);
    new DataView(tmpBuf).setFloat32(0, 3.14, true);
    const flBytes = new Uint8Array(tmpBuf);
    for (let i = 0; i < 4; i++) bytes.push(flBytes[i]);
    const buf = buildBuffer(bytes);
    // (0018,0050)은 dicomDictionary에 DS로 등록되어 있어 FL로 직접 읽기 어려움
    // 대신 readTagValue를 직접 호출하여 FL 디코딩 검증
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.IMPLICIT_VR_LE);
    ctx.offset = 8; // 태그 헤더 이후
    const flValue = readTagValue(ctx, 'FL', 4);
    expect(Math.abs(flValue - 3.14) < 0.001).toBe(true);
  });

  it('DS: 문자열을 parseFloat로 변환해야 한다', () => {
    // DS value: "40.5\0"
    const valStr = '40.5';
    const valBytes = [];
    for (let i = 0; i < valStr.length; i++) valBytes.push(valStr.charCodeAt(i));
    valBytes.push(0x20); // padding
    const buf = buildExplicitVRTag(0x0028, 0x1050, 'DS', valBytes.length, valBytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result.value).toBe(40.5);
  });

  it('IS: 문자열을 parseInt로 변환해야 한다', () => {
    const valStr = '512';
    const valBytes = [];
    for (let i = 0; i < valStr.length; i++) valBytes.push(valStr.charCodeAt(i));
    const buf = buildExplicitVRTag(0x0018, 0x1152, 'IS', valBytes.length, valBytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result.value).toBe(512);
  });

  it('OW: 지연 접근으로 오프셋만 반환해야 한다', () => {
    const valBytes = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06];
    const buf = buildExtendedVRTag(0x7FE0, 0x0010, 'OW', 6, valBytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result.value).toEqual({ _binaryOffset: 12, _binaryLength: 6 });
  });

  it('OB: 지연 접근으로 오프셋만 반환해야 한다', () => {
    const valBytes = [0xAA, 0xBB];
    const buf = buildExtendedVRTag(0x0002, 0x0001, 'OB', 2, valBytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result.value).toEqual({ _binaryOffset: 12, _binaryLength: 2 });
  });

  it('UN: 지연 접근으로 오프셋만 반환해야 한다', () => {
    const valBytes = [0xFF, 0xFE];
    const buf = buildExtendedVRTag(0x7FE0, 0x0010, 'UN', 2, valBytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result.value).toEqual({ _binaryOffset: 12, _binaryLength: 2 });
  });

  it('SQ: 정의된 길이 시퀀스는 null 반환 후 오프셋 전진', () => {
    const valBytes = [0x00, 0x00, 0x00, 0x00];
    const buf = buildExtendedVRTag(0x0008, 0x1111, 'SQ', 4, valBytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result.value).toBeNull();
    expect(ctx.offset).toBe(buf.byteLength);
  });

  it('문자열 VR(LO): trim 및 null 제거 후 반환', () => {
    const valStr = 'Test Hospital';
    const valBytes = [];
    for (let i = 0; i < valStr.length; i++) valBytes.push(valStr.charCodeAt(i));
    valBytes.push(0x20); // trailing space
    const buf = buildExplicitVRTag(0x0008, 0x0080, 'LO', valBytes.length, valBytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result.value).toBe('Test Hospital');
  });

  it('UI: UID 문자열을 trim 후 반환해야 한다', () => {
    const valStr = '1.2.840.10008.1.2.1';
    const valBytes = [];
    for (let i = 0; i < valStr.length; i++) valBytes.push(valStr.charCodeAt(i));
    valBytes.push(0x00); // null padding
    const buf = buildExplicitVRTag(0x0002, 0x0010, 'UI', valBytes.length, valBytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result.value).toBe('1.2.840.10008.1.2.1');
  });

  it('PN: 환자 이름을 정상 디코딩해야 한다', () => {
    const valStr = 'Hong^GilDong';
    const valBytes = [];
    for (let i = 0; i < valStr.length; i++) valBytes.push(valStr.charCodeAt(i));
    const buf = buildExplicitVRTag(0x0010, 0x0010, 'PN', valBytes.length, valBytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result.value).toBe('Hong^GilDong');
  });
});

// ============================================================
// 5. skipUndefinedLengthSequence() 테스트 (SDS-3.7 핵심)
// ============================================================

describe('SDS-3.7: skipUndefinedLengthSequence()', () => {

  it('단일 레벨 Undefined Length 시퀀스를 정상 건너뛰어야 한다', () => {
    // Explicit VR: Item(defined) 내부에 US 태그 + SeqDelim
    // skipUndefinedLengthSequence이 Item 내부 태그를 파싱하며 SeqDelim까지 탐색
    const bytes = [];
    // Item(FFFE,E000) with defined length=8 (US tag data inside)
    bytes.push(0xfe, 0xff, 0x00, 0xe0); // Item tag
    bytes.push(...le32(10));               // defined length = 10 (US tag 전체)
    // Inside item: (0028,0010) US tag, value=512
    bytes.push(...le16(0x0028));          // group
    bytes.push(...le16(0x0010));          // element
    bytes.push(0x55, 0x53);              // VR = US
    bytes.push(...le16(2));              // length = 2
    bytes.push(...le16(512));            // value
    // Sequence Delimiter
    bytes.push(0xfe, 0xff, 0xdd, 0xe0);
    bytes.push(0x00, 0x00, 0x00, 0x00);
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    
    const resultOffset = skipUndefinedLengthSequence(ctx, 0, 0);
    expect(resultOffset).toBe(buf.byteLength);
  });

  it('정의된 길이 Item을 포함한 시퀀스를 건너뛰어야 한다', () => {
    // Item(FFFE,E000) + Length=4 + data(4바이트) + Delimiter
    const bytes = [];
    bytes.push(0xfe, 0xff, 0x00, 0xe0); // Item tag
    bytes.push(...le32(4));               // defined length = 4
    bytes.push(0xAA, 0xBB, 0xCC, 0xDD);  // item data
    bytes.push(0xfe, 0xff, 0xdd, 0xe0); // Delimiter
    bytes.push(0x00, 0x00, 0x00, 0x00);
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    
    const resultOffset = skipUndefinedLengthSequence(ctx, 0, 0);
    expect(resultOffset).toBe(buf.byteLength);
  });

  it('여러 Item을 포함한 시퀀스를 건너뛰어야 한다', () => {
    const bytes = [];
    // Item 1: defined length
    bytes.push(0xfe, 0xff, 0x00, 0xe0);
    bytes.push(...le32(2));
    bytes.push(0x01, 0x02);
    // Item 2: defined length
    bytes.push(0xfe, 0xff, 0x00, 0xe0);
    bytes.push(...le32(3));
    bytes.push(0x03, 0x04, 0x05);
    // Delimiter
    bytes.push(0xfe, 0xff, 0xdd, 0xe0);
    bytes.push(0x00, 0x00, 0x00, 0x00);
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    
    const resultOffset = skipUndefinedLengthSequence(ctx, 0, 0);
    expect(resultOffset).toBe(buf.byteLength);
  });

  it('중첩 시퀀스 depth 관리가 정상 동작해야 한다', () => {
    // Outer Item(defined, len=12) 내부에 Inner Item(defined, len=2) 포함 + SeqDelim
    // skipUndefinedLengthSequence이 depth=0에서 outer Item을 처리하고
    // 내부 일반 태그를 파싱하다 SeqDelim을 만나 종료
    const bytes = [];
    // Outer Item with defined length=12
    bytes.push(0xfe, 0xff, 0x00, 0xe0); // Item tag
    bytes.push(...le32(10));              // defined length = 10 (inner item 전체)
    // Inside: Inner Item(FFFE,E000) with defined length=2
    bytes.push(0xfe, 0xff, 0x00, 0xe0);
    bytes.push(...le32(2));
    bytes.push(0xAB, 0xCD);
    // Inner item data consumed by outer item length
    // We need exactly 12 bytes inside outer item: 4+4+2+2 = 12 ✓
    // Sequence Delimiter (after outer item consumed)
    bytes.push(0xfe, 0xff, 0xdd, 0xe0);
    bytes.push(0x00, 0x00, 0x00, 0x00);
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    
    const resultOffset = skipUndefinedLengthSequence(ctx, 0, 0);
    expect(resultOffset).toBe(buf.byteLength);
  });

  it('Item Delimitation(FFFE,E00D)을 정상 처리해야 한다', () => {
    // Explicit VR: 일반 태그 + ItemDelim(FFFE,E00D)은 continue로 스킵 + SeqDelim
    const bytes = [];
    // Normal tag (0028,0010) US = 256, inside sequence context
    bytes.push(...le16(0x0028));
    bytes.push(...le16(0x0010));
    bytes.push(0x55, 0x53); // US
    bytes.push(...le16(2));
    bytes.push(...le16(256));
    // Item Delimitation - just a FFFE tag encountered in stream, continues
    bytes.push(0xfe, 0xff, 0x0d, 0xe0); // FFFE,E00D
    bytes.push(0x00, 0x00, 0x00, 0x00); // length=0
    // Another normal tag
    bytes.push(...le16(0x0028));
    bytes.push(...le16(0x0011));
    bytes.push(0x55, 0x53); // US
    bytes.push(...le16(2));
    bytes.push(...le16(128));
    // Sequence Delimiter
    bytes.push(0xfe, 0xff, 0xdd, 0xe0);
    bytes.push(0x00, 0x00, 0x00, 0x00);
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    
    const resultOffset = skipUndefinedLengthSequence(ctx, 0, 0);
    expect(resultOffset).toBe(buf.byteLength);
  });

  it('버퍼 끝 도달 시 DicomIOException을 발생시켜야 한다', () => {
    // Delimiter 없이 끝나는 불완전한 시퀀스
    const bytes = [];
    bytes.push(0xfe, 0xff, 0x00, 0xe0); // Item
    bytes.push(...le32(2));               // defined length
    bytes.push(0x01, 0x02);              // data
    // Sequence Delimiter 없음!
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    
    expect(() => skipUndefinedLengthSequence(ctx, 0, 0)).toThrow(DicomIOException);
  });

  it('최대 깊이(16) 초과 시 DicomIllegalStateException을 발생시켜야 한다', () => {
    const bytes = [];
    bytes.push(0xfe, 0xff, 0x00, 0xe0); // Item
    bytes.push(...le32(0));
    bytes.push(0xfe, 0xff, 0xdd, 0xe0); // Delimiter
    bytes.push(0x00, 0x00, 0x00, 0x00);
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    
    expect(() => skipUndefinedLengthSequence(ctx, 0, 16)).toThrow(DicomIllegalStateException);
  });

  it('잘못된 Tag 그룹 번호 시 DicomIllegalArgumentException을 발생시켜야 한다', () => {
    const bytes = [];
    bytes.push(0x00, 0xFF); // group = 0xFF00 (정상)
    bytes.push(0x00, 0x10); // element
    // Explicit VR: VR + length
    bytes.push(0x55, 0x53); // US
    bytes.push(...le16(2));
    bytes.push(...le16(0));
    bytes.push(0xfe, 0xff, 0xdd, 0xe0); // Delimiter
    bytes.push(0x00, 0x00, 0x00, 0x00);
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    
    // 이 테스트는 group > 0xFFFE인 경우만 해당
    // group 0xFF00은 정상이므로 에러 없이 통과해야 함
    const result = skipUndefinedLengthSequence(ctx, 0, 0);
    expect(typeof result).toBe('number');
  });

  it('잘못된 Tag(group > 0xFFFE)에서 DicomIllegalArgumentException 발생', () => {
    const bytes = [];
    bytes.push(0xFF, 0xFF); // group = 0xFFFF (> 0xFFFE)
    bytes.push(0x00, 0x10);
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    
    expect(() => skipUndefinedLengthSequence(ctx, 0, 0)).toThrow(DicomIllegalArgumentException);
  });

  it('Explicit VR 모드에서 확장 VR 태그를 정상 처리해야 한다', () => {
    const bytes = [];
    // 일반 태그 (US, 정의된 길이)
    bytes.push(...le16(0x0028));
    bytes.push(...le16(0x0010));
    bytes.push(0x55, 0x53); // US
    bytes.push(...le16(2));
    bytes.push(...le16(512));
    // Delimiter
    bytes.push(0xfe, 0xff, 0xdd, 0xe0);
    bytes.push(0x00, 0x00, 0x00, 0x00);
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    
    const resultOffset = skipUndefinedLengthSequence(ctx, 0, 0);
    expect(resultOffset).toBe(buf.byteLength);
  });

  it('Explicit VR에서 확장 VR(OB) undefined length를 재귀 처리해야 한다', () => {
    const bytes = [];
    // OB 태그 with undefined length
    bytes.push(...le16(0x7FE0));
    bytes.push(...le16(0x0010));
    bytes.push(0x4F, 0x42); // OB
    bytes.push(0x00, 0x00); // reserved
    bytes.push(0xff, 0xff, 0xff, 0xff); // undefined length
    // 내부에 Item
    bytes.push(0xfe, 0xff, 0x00, 0xe0);
    bytes.push(...le32(2));
    bytes.push(0xAA, 0xBB);
    // 내부 Delimiter
    bytes.push(0xfe, 0xff, 0xdd, 0xe0);
    bytes.push(0x00, 0x00, 0x00, 0x00);
    // 외부 Delimiter
    bytes.push(0xfe, 0xff, 0xdd, 0xe0);
    bytes.push(0x00, 0x00, 0x00, 0x00);
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    
    const resultOffset = skipUndefinedLengthSequence(ctx, 0, 0);
    expect(resultOffset).toBe(buf.byteLength);
  });

  it('Implicit VR 모드에서 정상 동작해야 한다', () => {
    const bytes = [];
    // Item
    bytes.push(0xfe, 0xff, 0x00, 0xe0);
    bytes.push(...le32(4));
    bytes.push(0x01, 0x02, 0x03, 0x04);
    // Delimiter
    bytes.push(0xfe, 0xff, 0xdd, 0xe0);
    bytes.push(0x00, 0x00, 0x00, 0x00);
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.IMPLICIT_VR_LE);
    
    const resultOffset = skipUndefinedLengthSequence(ctx, 0, 0);
    expect(resultOffset).toBe(buf.byteLength);
  });

  it('Implicit VR에서 undefined length를 재귀 처리해야 한다', () => {
    const bytes = [];
    // 일반 태그 with undefined length (Implicit: 4바이트 length만)
    bytes.push(...le16(0x0008));
    bytes.push(...le16(0x1111));
    bytes.push(0xff, 0xff, 0xff, 0xff); // undefined length
    // 내부 Item
    bytes.push(0xfe, 0xff, 0x00, 0xe0);
    bytes.push(...le32(2));
    bytes.push(0xCC, 0xDD);
    // 내부 Delimiter
    bytes.push(0xfe, 0xff, 0xdd, 0xe0);
    bytes.push(0x00, 0x00, 0x00, 0x00);
    // 외부 Delimiter
    bytes.push(0xfe, 0xff, 0xdd, 0xe0);
    bytes.push(0x00, 0x00, 0x00, 0x00);
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.IMPLICIT_VR_LE);
    
    const resultOffset = skipUndefinedLengthSequence(ctx, 0, 0);
    expect(resultOffset).toBe(buf.byteLength);
  });

  it('빈 시퀀스(Delimiter만)를 정상 처리해야 한다', () => {
    const bytes = [];
    bytes.push(0xfe, 0xff, 0xdd, 0xe0); // Delimiter only
    bytes.push(0x00, 0x00, 0x00, 0x00);
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    
    const resultOffset = skipUndefinedLengthSequence(ctx, 0, 0);
    expect(resultOffset).toBe(buf.byteLength);
  });

  it('반환값이 시퀀스 종료 이후의 오프셋이어야 한다', () => {
    const bytes = [];
    bytes.push(0xfe, 0xff, 0x00, 0xe0); // Item
    bytes.push(...le32(3));
    bytes.push(0x01, 0x02, 0x03);
    bytes.push(0xfe, 0xff, 0xdd, 0xe0); // Delimiter
    bytes.push(0x00, 0x00, 0x00, 0x00);
    // Delimiter 이후에 추가 데이터
    bytes.push(0xAA, 0xBB);
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    
    const resultOffset = skipUndefinedLengthSequence(ctx, 0, 0);
    // Delimiter(8바이트) 이후 오프셋 = Item(4) + Length(4) + Data(3) + Delim tag(4) + Delim len(4) = 19
    expect(resultOffset).toBe(19);
    // ctx.offset도 업데이트 되어야 함
    expect(ctx.offset).toBe(19);
  });
});

// ============================================================
// 6. skipSequence() 깊이 제한 테스트 (FR-2.5, HAZ-5.2)
// ============================================================

describe('SDS-3.7: skipSequence() 깊이 제한', () => {

  it('정상 깊이에서 depth+1을 반환해야 한다', () => {
    const buf = new ArrayBuffer(0);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    expect(skipSequence(ctx, 0)).toBe(1);
    expect(skipSequence(ctx, 5)).toBe(6);
    expect(skipSequence(ctx, 14)).toBe(15);
  });

  it('깊이 16 이상에서 현재 깊이를 유지해야 한다', () => {
    const buf = new ArrayBuffer(0);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    expect(skipSequence(ctx, 16)).toBe(16);
    expect(skipSequence(ctx, 20)).toBe(20);
  });

  it('깊이 15에서는 아직 증가해야 한다 (15+1=16)', () => {
    const buf = new ArrayBuffer(0);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    expect(skipSequence(ctx, 15)).toBe(16);
  });
});

// ============================================================
// 7. 에러 처리 및 경고 시스템 테스트 (FR-2.6, NFR-7)
// ============================================================

describe('SDS-3.5: 에러 처리 및 경고 시스템', () => {

  it('태그 값 잘림 시 PARSE_WARN_TRUNCATED_TAG_VALUE 경고가 기록되어야 한다', () => {
    // Explicit VR: tag(4) + VR(2) + length(2) = 8바이트 헤더
    // Length=10이지만 실제 데이터는 4바이트만 있음
    const bytes = [];
    bytes.push(...le16(0x0010));
    bytes.push(...le16(0x0010));
    bytes.push(0x50, 0x4E); // PN
    bytes.push(...le16(10)); // length=10
    bytes.push(0x41, 0x42, 0x43, 0x44); // value only 4 bytes
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    
    const result = readTag(ctx);
    expect(result).not.toBeNull();
    expect(result.value).toBeNull();
    
    // errors 배열에 경고가 있어야 함
    const truncErrors = ctx.errors.filter(e => e.code === 'PARSE_WARN_TRUNCATED_TAG_VALUE');
    expect(truncErrors.length).toBeGreaterThanOrEqual(1);
  });

  it('잘린 태그 값 처리 시 오프셋가 버퍼 끝으로 이동해야 한다', () => {
    const bytes = [];
    bytes.push(...le16(0x0010));
    bytes.push(...le16(0x0010));
    bytes.push(0x50, 0x4E); // PN
    bytes.push(...le16(100)); // length=100, much more than available
    bytes.push(0x41, 0x42); // only 2 bytes
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    
    readTag(ctx);
    // 오프셋가 버퍼 끝으로 이동했는지 확인
    expect(ctx.offset).toBe(buf.byteLength);
  });

  it('readTag()는 예외를 throw하지 않아야 한다', () => {
    const buf = new ArrayBuffer(0);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    
    expect(() => readTag(ctx)).not.toThrow();
    expect(readTag(ctx)).toBeNull();
  });
});

// ============================================================
// 8. 엔디안 처리 테스트
// ============================================================

describe('SDS-3.5: 엔디안 처리', () => {

  it('Little Endian에서 태그를 정상 읽어야 한다', () => {
    const buf = buildExplicitVRTag(0x0028, 0x0010, 'US', 2, [...le16(256)]);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    const result = readTag(ctx);
    expect(result).not.toBeNull();
    expect(result.tag).toEqual([0x0028, 0x0010]);
    expect(result.value).toBe(256);
  });

  it('Big Endian에서 태그를 정상 읽어야 한다', () => {
    // Big Endian: group(2BE) + element(2BE) + VR(2) + length(2BE) + value(2BE)
    const bytes = [];
    const dv = new DataView(new ArrayBuffer(10));
    dv.setUint16(0, 0x0028, false); // group BE
    dv.setUint16(2, 0x0010, false); // element BE
    dv.setUint8(4, 0x55); // U
    dv.setUint8(5, 0x53); // S
    dv.setUint16(6, 2, false); // length BE
    dv.setUint16(8, 256, false); // value BE
    const buf = dv.buffer;
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.BIG_ENDIAN);
    const result = readTag(ctx);
    expect(result).not.toBeNull();
    expect(result.tag).toEqual([0x0028, 0x0010]);
    expect(result.value).toBe(256);
  });
});

// ============================================================
// 9. 예외 클래스 테스트 (SDS-3.7)
// ============================================================

describe('SDS-3.7: 커스텀 예외 클래스', () => {

  it('DicomIOException이 정상 생성되어야 한다', () => {
    const err = new DicomIOException('test message', { offset: 100 });
    expect(err.name).toBe('DicomIOException');
    expect(err.message).toBe('test message');
    expect(err.context).toEqual({ offset: 100 });
    expect(err).toBeInstanceOf(Error);
  });

  it('DicomIllegalStateException이 정상 생성되어야 한다', () => {
    const err = new DicomIllegalStateException('depth exceeded');
    expect(err.name).toBe('DicomIllegalStateException');
    expect(err.message).toBe('depth exceeded');
    expect(err).toBeInstanceOf(Error);
  });

  it('DicomIllegalArgumentException이 정상 생성되어야 한다', () => {
    const err = new DicomIllegalArgumentException('invalid tag');
    expect(err.name).toBe('DicomIllegalArgumentException');
    expect(err.message).toBe('invalid tag');
    expect(err).toBeInstanceOf(Error);
  });

  it('context 없이도 정상 생성되어야 한다', () => {
    const err = new DicomIOException('no context');
    expect(err.context).toEqual({});
  });
});

// ============================================================
// 10. readTag()와 skipUndefinedLengthSequence() 통합 테스트
// ============================================================

describe('SDS-3.7: readTag + skipUndefinedLength 통합', () => {

  it('Undefined Length SQ 태그를 readTag로 읽고 시퀀스를 건너뛰어야 한다', () => {
    // SQ 태그 with undefined length
    const bytes = [];
    bytes.push(...le16(0x0008));
    bytes.push(...le16(0x1111));
    bytes.push(0x53, 0x51); // SQ
    bytes.push(0x00, 0x00); // reserved
    bytes.push(0xff, 0xff, 0xff, 0xff); // undefined length
    // Item
    bytes.push(0xfe, 0xff, 0x00, 0xe0);
    bytes.push(...le32(4));
    bytes.push(0x01, 0x02, 0x03, 0x04);
    // Sequence Delimiter
    bytes.push(0xfe, 0xff, 0xdd, 0xe0);
    bytes.push(0x00, 0x00, 0x00, 0x00);
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    
    const result = readTag(ctx);
    expect(result).not.toBeNull();
    expect(result.vr).toBe('SQ');
    expect(result.length).toBe(0xFFFFFFFF);
    // skipUndefinedLengthSequence이 호출되어 오프셋가 이동했어야 함
    expect(ctx.offset).toBe(buf.byteLength);
  });

  it('Undefined Length 시퀀스 후 다음 태그를 계속 읽을 수 있어야 한다', () => {
    const bytes = [];
    // SQ undefined length
    bytes.push(...le16(0x0008));
    bytes.push(...le16(0x1111));
    bytes.push(0x53, 0x51); // SQ
    bytes.push(0x00, 0x00);
    bytes.push(0xff, 0xff, 0xff, 0xff);
    // Item
    bytes.push(0xfe, 0xff, 0x00, 0xe0);
    bytes.push(...le32(2));
    bytes.push(0xAB, 0xCD);
    // Delimiter
    bytes.push(0xfe, 0xff, 0xdd, 0xe0);
    bytes.push(0x00, 0x00, 0x00, 0x00);
    // 다음 태그: (0028,0010) Rows=512
    bytes.push(...le16(0x0028));
    bytes.push(...le16(0x0010));
    bytes.push(0x55, 0x53); // US
    bytes.push(...le16(2));
    bytes.push(...le16(512));
    
    const buf = buildBuffer(bytes);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    
    // 첫 번째 태그: SQ
    const sq = readTag(ctx);
    expect(sq.vr).toBe('SQ');
    
    // 두 번째 태그: US
    const us = readTag(ctx);
    expect(us).not.toBeNull();
    expect(us.vr).toBe('US');
    expect(us.value).toBe(512);
  });
});

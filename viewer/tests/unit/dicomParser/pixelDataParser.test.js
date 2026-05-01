/**
 * @file findPixelDataTag() 단위 테스트
 * @description DICOM 픽셀 데이터 태그 폴백 탐색 함수의 단위 테스트
 * @trace T007, SC-001 ~ SC-003, EC-001, EC-003, FR-001 ~ FR-009
 * @safety IEC 62304 Class A - 비진단 경로 폴백 테스트
 */

import { describe, it, expect } from 'vitest';
import { findPixelDataTag } from '../../../src/data/dicomParser/pixelDataParser.js';
import {
  createPixelDataTagBuffer,
  createNoTagBuffer,
  createCorruptBuffer,
  createBigEndianTagBuffer,
  createBoundaryBuffer,
} from '../fixtures/pixelDataTagBuffer.js';

// ============================================================
// US1: 픽셀 데이터 태그 선형 탐색 (P1)
// ============================================================

describe('US1: findPixelDataTag() 선형 탐색', () => {

  it('UT-001: 오프셋 1024에 (7FE0,0010)이 있는 버퍼에서 1024 반환 (US1-AS1)', () => {
    const { view, bufferLength } = createPixelDataTagBuffer({
      tagOffset: 1024,
      bufferLength: 2048,
    });
    const result = findPixelDataTag(view, bufferLength);
    expect(result).toBe(1024);
  });

  it('UT-002: 오프셋 132에 (7FE0,0010)이 있는 버퍼에서 132 반환 (US1-AS2, FR-003)', () => {
    const { view, bufferLength } = createPixelDataTagBuffer({
      tagOffset: 132,
      bufferLength: 512,
    });
    const result = findPixelDataTag(view, bufferLength);
    expect(result).toBe(132);
  });

  it('UT-003: (7FE0,0010)이 포함되지 않은 버퍼에서 -1 반환 (US2-AS1)', () => {
    const { view, bufferLength } = createNoTagBuffer(1024);
    const result = findPixelDataTag(view, bufferLength);
    expect(result).toBe(-1);
  });

  it('UT-004: bufferLength=136, 태그 at 132에서 132 반환 (US1-AS3 변형, 최소 크기)', () => {
    const { view, bufferLength } = createPixelDataTagBuffer({
      tagOffset: 132,
      bufferLength: 136,
    });
    const result = findPixelDataTag(view, bufferLength);
    expect(result).toBe(132);
  });

  it('UT-005: bufferLength가 132 이하인 버퍼에서 즉시 -1 반환 (EC-001)', () => {
    // bufferLength = 0
    const buf0 = new ArrayBuffer(0);
    const view0 = new DataView(buf0);
    expect(findPixelDataTag(view0, 0)).toBe(-1);

    // bufferLength = 131
    const buf131 = new ArrayBuffer(131);
    const view131 = new DataView(buf131);
    expect(findPixelDataTag(view131, 131)).toBe(-1);

    // bufferLength = 132
    const buf132 = new ArrayBuffer(132);
    const view132 = new DataView(buf132);
    expect(findPixelDataTag(view132, 132)).toBe(-1);
  });

  it('UT-006: 버퍼 끝(bufferLength-4)에 태그가 위치한 경우 정확한 오프셋 반환 (EC-003)', () => {
    const totalLength = 256;
    const tagOffset = totalLength - 4; // 252
    const { view, bufferLength } = createBoundaryBuffer(tagOffset, totalLength);
    const result = findPixelDataTag(view, bufferLength);
    expect(result).toBe(tagOffset);
  });

  it('UT-007: 손상된 DataView에서 예외 포착 후 -1 반환 (FR-007, NFR-001)', () => {
    const { view, bufferLength } = createCorruptBuffer();
    // corruptBuffer: 실제 132바이트, bufferLength=1024
    // 루프 진입 후 getUint16에서 RangeError 발생 → try-catch 포착 → -1 반환
    const result = findPixelDataTag(view, bufferLength);
    expect(result).toBe(-1);
  });

  it('UT-008: 동일 group(0x7FE0)에 다른 element(0x0020)가 있는 버퍼에서 -1 반환 (EC-004)', () => {
    const buffer = new ArrayBuffer(256);
    const view = new DataView(buffer);
    // offset 132에 (7FE0, 0020) 기록 - group은 맞지만 element가 다름
    view.setUint16(132, 0x7FE0, true);
    view.setUint16(134, 0x0020, true);
    const result = findPixelDataTag(view, 256);
    expect(result).toBe(-1);
  });

  it('UT-009: Big Endian 태그가 포함된 버퍼에서 LE 전용 탐색으로 -1 반환 (EC-005)', () => {
    const { view, bufferLength } = createBigEndianTagBuffer({
      tagOffset: 132,
      bufferLength: 256,
    });
    const result = findPixelDataTag(view, bufferLength);
    expect(result).toBe(-1);
  });

  it('UT-010: 오프셋별로 group만 맞고 element가 다른 위치가 여러 곳 있는 버퍼에서 첫 (7FE0,0010) 매치 반환', () => {
    const buffer = new ArrayBuffer(1024);
    const view = new DataView(buffer);
    // offset 200에 (7FE0, 0020) - group만 맞음
    view.setUint16(200, 0x7FE0, true);
    view.setUint16(202, 0x0020, true);
    // offset 400에 (7FE0, 0030) - group만 맞음
    view.setUint16(400, 0x7FE0, true);
    view.setUint16(402, 0x0030, true);
    // offset 600에 (7FE0, 0010) - 정확히 매치
    view.setUint16(600, 0x7FE0, true);
    view.setUint16(602, 0x0010, true);
    const result = findPixelDataTag(view, 1024);
    expect(result).toBe(600);
  });

  it('UT-011: bufferLength가 음수인 경우 -1 반환 (방어적 프로그래밍)', () => {
    const buf = new ArrayBuffer(256);
    const view = new DataView(buf);
    expect(findPixelDataTag(view, -1)).toBe(-1);
    expect(findPixelDataTag(view, -100)).toBe(-1);
  });

  it('UT-012: bufferLength=135에서 루프 미실행 후 -1 반환', () => {
    // 132 + 4 = 136 > 135 이므로 루프 조건 불만족
    // 135바이트 버퍼에서 offset 134에 setUint16하면 RangeError 발생하므로
    // 태그 기록 없이 빈 버퍼로 테스트
    const buffer = new ArrayBuffer(135);
    const view = new DataView(buffer);
    const result = findPixelDataTag(view, 135);
    expect(result).toBe(-1);
  });

  it('UT-013: bufferLength=137에서 오프셋 132, 134에서만 루프 실행 (2회)', () => {
    const buffer = new ArrayBuffer(137);
    const view = new DataView(buffer);
    // offset 132에 (7FE0, 0010) 기록
    view.setUint16(132, 0x7FE0, true);
    view.setUint16(134, 0x0010, true);
    const result = findPixelDataTag(view, 137);
    expect(result).toBe(132);
  });

  it('UT-014: bufferLength가 정확히 tagOffset+4인 경우 경계 조건에서 정확한 오프셋 반환', () => {
    const tagOffset = 200;
    const totalLength = tagOffset + 4; // 204
    const { view, bufferLength } = createBoundaryBuffer(tagOffset, totalLength);
    const result = findPixelDataTag(view, bufferLength);
    expect(result).toBe(tagOffset);
  });

  it('UT-015: includeTag=false인 버퍼에서 -1 반환', () => {
    const { view, bufferLength } = createPixelDataTagBuffer({
      tagOffset: 132,
      bufferLength: 512,
      includeTag: false,
    });
    const result = findPixelDataTag(view, bufferLength);
    expect(result).toBe(-1);
  });

  it('UT-016: 매우 큰 버퍼(1MB)에서 태그가 끝 근처에 있어도 정상 탐색 완료', () => {
    const largeSize = 1024 * 1024; // 1MB
    const tagOffset = largeSize - 100;
    const { view, bufferLength } = createPixelDataTagBuffer({
      tagOffset,
      bufferLength: largeSize,
    });
    const result = findPixelDataTag(view, bufferLength);
    expect(result).toBe(tagOffset);
  });

  it('UT-017: 짝수 오프셋에만 태그가 있는 버퍼에서 2바이트 간격 탐색 결과가 정확함', () => {
    const buffer = new ArrayBuffer(512);
    const view = new DataView(buffer);
    // offset 200 (짝수)에 태그 배치
    view.setUint16(200, 0x7FE0, true);
    view.setUint16(202, 0x0010, true);
    const result = findPixelDataTag(view, 512);
    expect(result).toBe(200);
  });

  it('UT-018: 홀수 오프셋에 강제 배치한 태그는 발견되지 않고 -1 반환', () => {
    const buffer = new ArrayBuffer(512);
    const view = new DataView(buffer);
    // offset 201 (홀수)에 태그 배치 - 2바이트 간격 탐색으로는 발견 불가
    view.setUint16(201, 0x7FE0, true);
    view.setUint16(203, 0x0010, true);
    const result = findPixelDataTag(view, 512);
    expect(result).toBe(-1);
  });
});
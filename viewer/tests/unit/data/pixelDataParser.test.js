/**
 * @file pixelDataParser 단위 테스트
 * @description ARCH-2, CQ-1: 명시적 오프셋 전달 및 반환 타입 검증
 */

import { describe, it, expect } from 'vitest';
import { parsePixelData } from '../../../src/data/dicomParser/pixelDataParser.js';

describe('parsePixelData', () => {
  it('명시적 오프셋으로 픽셀 데이터를 추출한다', () => {
    const pixelBytes = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const buf = pixelBytes.buffer.slice(
      pixelBytes.byteOffset, pixelBytes.byteOffset + pixelBytes.byteLength
    );
    const metadata = {
      bitsAllocated: 16,
      samplesPerPixel: 1,
      rows: 1,
      columns: 2,
    };
    const result = parsePixelData(buf, metadata, 0, 4);
    expect(result).toHaveProperty('voxelData');
    expect(result).toHaveProperty('warnings');
    expect(result.voxelData.byteLength).toBe(4);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('버퍼가 null이면 에러를 발생시킨다', () => {
    const metadata = { bitsAllocated: 16, samplesPerPixel: 1, rows: 1, columns: 1 };
    expect(() => parsePixelData(null, metadata, 0, 2)).toThrow();
  });

  it('픽셀 데이터 길이 불일치 시 경고를 반환한다', () => {
    const pixelBytes = new Uint8Array(8);
    const buf = pixelBytes.buffer.slice(
      pixelBytes.byteOffset, pixelBytes.byteOffset + pixelBytes.byteLength
    );
    const metadata = {
      bitsAllocated: 16,
      samplesPerPixel: 1,
      rows: 2,
      columns: 2,
    };
    // expectedLength = 2*2*2*1 = 8, actualLength = 4
    const result = parsePixelData(buf, metadata, 0, 4);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0].code).toBe('PARSE_WARN_PIXEL_LENGTH_MISMATCH');
  });

  it('폴백 탐색 시 태그를 찾으면 정상 결과를 반환한다', () => {
    // 버퍼 크기를 충분히 확보 (프리앰블 + 매직 + 태그 + 헤더 + 데이터)
    const pixelBytes = new Uint8Array(160);
    const view = new DataView(pixelBytes.buffer);
    // offset 132에 태그 (7FE0,0010) 삽입
    view.setUint16(132, 0x7FE0, true);
    view.setUint16(134, 0x0010, true);
    // VR OW + reserved + length
    pixelBytes[136] = 0x4F; // O
    pixelBytes[137] = 0x57; // W
    view.setUint32(140, 8, true); // length = 8
    // 144~151: 픽셀 데이터
    const buf = pixelBytes.buffer.slice(
      pixelBytes.byteOffset, pixelBytes.byteOffset + pixelBytes.byteLength
    );
    const metadata = {
      bitsAllocated: 16, samplesPerPixel: 1, rows: 2, columns: 2,
    };
    // 폴백: 명시적 오프셋 미제공 → findPixelDataTag로 태그 탐색
    const result = parsePixelData(buf, metadata);
    expect(result).toHaveProperty('voxelData');
    expect(result.voxelData.byteLength).toBe(8);
  });
});
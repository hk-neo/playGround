/**
 * @file tagReader 단위 테스트
 * @description CQ-3: 길이 초과 시 경고 기록 검증
 */

import { describe, it, expect } from 'vitest';
import { readTag } from '../../../src/data/dicomParser/tagReader.js';
import { createParseContext } from '../../../src/data/dicomParser/ParseContext.js';
import { TRANSFER_SYNTAX } from '../../../src/data/dicomDictionary.js';

describe('readTag', () => {
  it('정상적인 US 태그를 읽는다', () => {
    // Tag (0028,0010) Rows = 512, VR=US
    const bytes = new Uint8Array(12);
    const view = new DataView(bytes.buffer);
    view.setUint16(0, 0x0028, true); // group
    view.setUint16(2, 0x0010, true); // element
    bytes[4] = 0x55; bytes[5] = 0x53; // VR = 'US'
    view.setUint16(6, 2, true); // length = 2
    view.setUint16(8, 512, true); // value = 512
    const ctx = createParseContext(bytes.buffer, TRANSFER_SYNTAX.EXPLICIT_VR_LE, 0);
    const result = readTag(ctx);
    expect(result).not.toBeNull();
    expect(result.tag).toEqual([0x0028, 0x0010]);
    expect(result.value).toBe(512);
  });

  it('데이터가 부족하면 null을 반환한다', () => {
    const bytes = new Uint8Array(2);
    const ctx = createParseContext(bytes.buffer, TRANSFER_SYNTAX.EXPLICIT_VR_LE, 0);
    const result = readTag(ctx);
    expect(result).toBeNull();
  });

  it('길이가 버퍼를 초과하면 ctx.errors에 경고가 추가된다', () => {
    // 태그는 있으나 값 길이가 버퍼를 초과하는 상황
    const bytes = new Uint8Array(10);
    const view = new DataView(bytes.buffer);
    view.setUint16(0, 0x0028, true); // group
    view.setUint16(2, 0x0010, true); // element
    bytes[4] = 0x55; bytes[5] = 0x53; // VR = 'US'
    view.setUint16(6, 100, true); // length = 100 (버퍼 초과)
    const ctx = createParseContext(bytes.buffer, TRANSFER_SYNTAX.EXPLICIT_VR_LE, 0);
    const result = readTag(ctx);
    expect(result).not.toBeNull();
    expect(result.value).toBeNull();
    // ctx.errors에 경고가 추가되었는지 확인
    expect(ctx.errors.length).toBeGreaterThan(0);
    expect(ctx.errors[0].code).toBe('PARSE_WARN_TRUNCATED_TAG_VALUE');
    expect(ctx.errors[0].severity).toBe('warning');
  });
});
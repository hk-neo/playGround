/**
 * @file handleParseError 단위 테스트
 * @description SEC-1: 프로덕션 환경에서 debugInfo 축소 검증
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { handleParseError } from '../../../src/data/dicomParser/handleParseError.js';

describe('handleParseError', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it('에러 코드와 사용자 메시지를 반환한다', () => {
    const err = { message: 'test error', code: 'PARSE_ERR_INVALID_MAGIC' };
    const result = handleParseError(err);
    expect(result.errorCode).toBe('PARSE_ERR_INVALID_MAGIC');
    expect(result.userMessage).toContain('DICOM');
    expect(result.severity).toBe('error');
  });

  it('알 수 없는 에러 코드에 대해 기본 메시지를 반환한다', () => {
    const err = { message: 'unknown', code: undefined };
    const result = handleParseError(err);
    expect(result.errorCode).toBe('PARSE_ERR_UNEXPECTED');
    expect(result.userMessage).toBeTruthy();
  });

  it('error.context 정보가 debugInfo에 포함된다 (개발 모드)', () => {
    process.env.NODE_ENV = 'development';
    const err = {
      message: 'test',
      code: 'PARSE_ERR_PIXEL_DATA_EXTRACTION',
      context: { offset: 12345, tag: [0x7FE0, 0x0010] },
    };
    const result = handleParseError(err);
    expect(result.debugInfo).toContain('12345');
  });

  it('code가 없으면 PARSE_ERR_UNEXPECTED를 사용한다', () => {
    const err = new Error('some error');
    const result = handleParseError(err);
    expect(result.errorCode).toBe('PARSE_ERR_UNEXPECTED');
  });

  it('프로덕션 모드에서는 context 정보가 debugInfo에 포함되지 않는다', () => {
    process.env.NODE_ENV = 'production';
    const err = {
      message: 'test',
      code: 'PARSE_ERR_PIXEL_DATA_EXTRACTION',
      context: { offset: 12345, tag: [0x7FE0, 0x0010] },
    };
    const result = handleParseError(err);
    expect(result.debugInfo).not.toContain('12345');
  });
});

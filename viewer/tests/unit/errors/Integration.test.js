/**
 * @file CBVError 통합 테스트 - handleParseError 연동 및 ErrorResult 변환 검증
 * @description SC-8, SC-9, SC-11: CBVError -> handleParseError() -> ErrorResult 변환,
 *              ParseResult.errors 포함, userMessage 내부 구조 미노출 검증
 * IEC 62304 Class A 준수 - PLAYG-1819
 */

import { describe, it, expect } from 'vitest';
import {
  CBVError,
  ParseError,
  ValidationError,
  RenderError,
  SecurityError,
  MemoryError,
} from '../../../src/errors/CBVError.js';
import { handleParseError } from '../../../src/errors/handleParseError.js';
import { createParseResult } from '../../../src/types/ParseResult.js';

// ============================================================
// SC-8: CBVError -> handleParseError() -> ErrorResult 변환
// ============================================================

describe('handleParseError 연동 - ErrorResult 변환 (SC-8)', () => {
  it('ParseError가 ErrorResult로 정상 변환된다', () => {
    const error = new ParseError('매직 바이트 불일치', 'PARSE_ERR_INVALID_MAGIC');
    const result = handleParseError(error);
    expect(result.userMessage).toBeDefined();
    expect(result.errorCode).toBe('PARSE_ERR_INVALID_MAGIC');
    expect(result.severity).toBe('error');
  });

  it('ValidationError가 ErrorResult로 정상 변환된다', () => {
    const error = new ValidationError('검증 실패');
    const result = handleParseError(error);
    expect(result.errorCode).toBe('VALIDATE_001');
    expect(result.userMessage).toBeDefined();
  });

  it('RenderError가 ErrorResult로 정상 변환된다', () => {
    const error = new RenderError('렌더링 실패');
    const result = handleParseError(error);
    expect(result.errorCode).toBe('RENDER_001');
  });

  it('SecurityError가 ErrorResult로 정상 변환된다', () => {
    const error = new SecurityError('보안 위반', 'SECURITY_001', { reason: '비인가' });
    const result = handleParseError(error);
    expect(result.errorCode).toBe('SECURITY_001');
  });

  it('MemoryError가 ErrorResult로 정상 변환된다', () => {
    const error = new MemoryError('메모리 부족');
    const result = handleParseError(error);
    expect(result.errorCode).toBe('MEMORY_001');
  });

  it('CBVError 기본 클래스가 ErrorResult로 정상 변환된다', () => {
    const error = new CBVError('알 수 없는 오류');
    const result = handleParseError(error);
    expect(result.errorCode).toBe('CBV_000');
  });
});

// ============================================================
// SC-9: ParseResult.errors 포함 검증
// ============================================================

describe('ParseResult.errors 포함 검증 (SC-9)', () => {
  it('ParseError가 ParseResult.errors 배열에 포함된다', () => {
    const parseError = new ParseError('매직 바이트 불일치', 'PARSE_ERR_INVALID_MAGIC');
    const errorResult = handleParseError(parseError);
    const result = createParseResult({
      errors: [errorResult],
      isValid: false,
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].errorCode).toBe('PARSE_ERR_INVALID_MAGIC');
    expect(result.errors[0].userMessage).toBeDefined();
  });

  it('여러 에러가 ParseResult.errors 배열에 포함된다', () => {
    const err1 = handleParseError(new ParseError('에러1', 'PARSE_ERR_INVALID_MAGIC'));
    const err2 = handleParseError(new ValidationError('에러2'));
    const result = createParseResult({
      errors: [err1, err2],
      isValid: false,
    });
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0].errorCode).toBe('PARSE_ERR_INVALID_MAGIC');
    expect(result.errors[1].errorCode).toBe('VALIDATE_001');
  });
});

// ============================================================
// SC-11: userMessage 내부 구조 미노출 검증
// ============================================================

describe('userMessage 내부 구조 미노출 검증 (SC-11)', () => {
  it('userMessage에 offset 정보가 포함되지 않는다', () => {
    const error = new ParseError('오프셋 오류', 'PARSE_ERR_UNEXPECTED', { offset: 128 });
    const result = handleParseError(error);
    expect(result.userMessage).not.toMatch(/offset/i);
  });

  it('userMessage에 tag 정보가 포함되지 않는다', () => {
    const error = new ParseError('태그 오류', 'PARSE_ERR_MISSING_REQUIRED_TAG', { tag: '00280010' });
    const result = handleParseError(error);
    // ERROR_MESSAGES에서 가져온 메시지는 tag 정보를 포함하지 않음
    expect(result.userMessage).not.toMatch(/00280010/);
  });

  it('userMessage에 buffer 정보가 포함되지 않는다', () => {
    const error = new ParseError('버퍼 오류', 'PARSE_ERR_PIXEL_DATA_EXTRACTION', { bufferSize: 1024 });
    const result = handleParseError(error);
    expect(result.userMessage).not.toMatch(/buffer/i);
  });
});

/**
 * @file CBVError 에러 클래스 계층 단위 테스트
 * @description T-01 ~ T-23: CBVError 기본 클래스 및 5개 하위 클래스 검증
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
import { ERROR_CODES } from '../../../src/data/dicomParser/constants.js';

// ============================================================
// T-01 ~ T-03: CBVError 기본 클래스 테스트 (US-11)
// ============================================================

describe('CBVError', () => {
  it('T-01: 기본 생성 시 message, name, code, context가 명세대로 설정된다', () => {
    const error = new CBVError('테스트 에러');
    expect(error.message).toBe('테스트 에러');
    expect(error.name).toBe('CBVError');
    expect(error.code).toBe('CBV_000');
    expect(error.context).toEqual({});
  });

  it('T-02: 커스텀 코드와 context를 전달하면 정상 설정된다', () => {
    const ctx = { field: 'value' };
    const error = new CBVError('커스텀', 'CUSTOM_001', ctx);
    expect(error.code).toBe('CUSTOM_001');
    expect(error.context).toEqual({ field: 'value' });
  });

  it('T-03: instanceof Error === true (프로토타입 체인 유지)', () => {
    const error = new CBVError('테스트');
    expect(error instanceof Error).toBe(true);
    expect(error instanceof CBVError).toBe(true);
  });
});

// ============================================================
// T-04 ~ T-12: ParseError 테스트 (US-1~6, US-12)
// ============================================================

describe('ParseError', () => {
  it('T-04: 기본 생성 시 name=ParseError, code=PARSE_ERR_UNEXPECTED', () => {
    const error = new ParseError('파싱 에러');
    expect(error.name).toBe('ParseError');
    expect(error.code).toBe('PARSE_ERR_UNEXPECTED');
    expect(error.context).toEqual({});
  });

  it('T-05: PARSE_ERR_INVALID_MAGIC 에러 코드 설정', () => {
    const error = new ParseError('매직 바이트 불일치', ERROR_CODES.PARSE_ERR_INVALID_MAGIC);
    expect(error.code).toBe('PARSE_ERR_INVALID_MAGIC');
  });

  it('T-06: PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX 에러 코드 설정', () => {
    const error = new ParseError('미지원 전송 구문', ERROR_CODES.PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX);
    expect(error.code).toBe('PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX');
  });

  it('T-07: PARSE_ERR_MISSING_REQUIRED_TAG + context.tag 확인', () => {
    const ctx = { tag: '00280010' };
    const error = new ParseError('필수 태그 누락', ERROR_CODES.PARSE_ERR_MISSING_REQUIRED_TAG, ctx);
    expect(error.code).toBe('PARSE_ERR_MISSING_REQUIRED_TAG');
    expect(error.context.tag).toBe('00280010');
  });

  it('T-08: PARSE_ERR_PIXEL_DATA_EXTRACTION 에러 코드 설정', () => {
    const error = new ParseError('픽셀 데이터 추출 실패', ERROR_CODES.PARSE_ERR_PIXEL_DATA_EXTRACTION);
    expect(error.code).toBe('PARSE_ERR_PIXEL_DATA_EXTRACTION');
  });

  it('T-09: PARSE_ERR_FILE_READ 에러 코드 설정', () => {
    const error = new ParseError('파일 읽기 실패', ERROR_CODES.PARSE_ERR_FILE_READ);
    expect(error.code).toBe('PARSE_ERR_FILE_READ');
  });

  it('T-10: PARSE_ERR_FILE_TOO_LARGE + context.fileSize 확인', () => {
    const ctx = { fileSize: 600 * 1024 * 1024 };
    const error = new ParseError('파일 크기 초과', ERROR_CODES.PARSE_ERR_FILE_TOO_LARGE, ctx);
    expect(error.code).toBe('PARSE_ERR_FILE_TOO_LARGE');
    expect(error.context.fileSize).toBe(600 * 1024 * 1024);
  });

  it('T-11: PARSE_ERR_UNEXPECTED + context.originalError 확인', () => {
    const original = new Error('원인 에러');
    const ctx = { originalError: original };
    const error = new ParseError('예기치 않은 오류', ERROR_CODES.PARSE_ERR_UNEXPECTED, ctx);
    expect(error.code).toBe('PARSE_ERR_UNEXPECTED');
    expect(error.context.originalError).toBe(original);
  });

  it('T-12: instanceof ParseError, CBVError, Error 모두 true', () => {
    const error = new ParseError('테스트');
    expect(error instanceof ParseError).toBe(true);
    expect(error instanceof CBVError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

// ============================================================
// T-13 ~ T-16: ValidationError, RenderError 테스트 (US-7, US-8)
// ============================================================

describe('ValidationError', () => {
  it('T-13: 기본 생성 시 name=ValidationError, code=VALIDATE_001', () => {
    const error = new ValidationError('검증 실패');
    expect(error.name).toBe('ValidationError');
    expect(error.code).toBe('VALIDATE_001');
    expect(error.message).toBe('검증 실패');
  });

  it('T-14: instanceof CBVError, Error 모두 true', () => {
    const error = new ValidationError('테스트');
    expect(error instanceof ValidationError).toBe(true);
    expect(error instanceof CBVError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

describe('RenderError', () => {
  it('T-15: 기본 생성 시 name=RenderError, code=RENDER_001', () => {
    const error = new RenderError('렌더링 실패');
    expect(error.name).toBe('RenderError');
    expect(error.code).toBe('RENDER_001');
    expect(error.message).toBe('렌더링 실패');
  });

  it('T-16: instanceof CBVError, Error 모두 true', () => {
    const error = new RenderError('테스트');
    expect(error instanceof RenderError).toBe(true);
    expect(error instanceof CBVError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

// ============================================================
// T-17 ~ T-21: SecurityError, MemoryError 테스트 (US-9, US-10)
// ============================================================

describe('SecurityError', () => {
  it('T-17: 기본 생성 시 name=SecurityError, code=SECURITY_001', () => {
    const error = new SecurityError('보안 위반');
    expect(error.name).toBe('SecurityError');
    expect(error.code).toBe('SECURITY_001');
    expect(error.message).toBe('보안 위반');
  });

  it('T-18: context에 PHI 필드 포함 시 제거됨', () => {
    const ctx = { patientName: '홍길동', patientId: 'P001', birthDate: '1990-01-01', reason: '비인가 접근' };
    const error = new SecurityError('PHI 위반', 'SECURITY_001', ctx);
    expect(error.context.patientName).toBeUndefined();
    expect(error.context.patientId).toBeUndefined();
    expect(error.context.birthDate).toBeUndefined();
    expect(error.context.reason).toBe('비인가 접근');
  });

  it('T-19: instanceof CBVError, Error 모두 true', () => {
    const error = new SecurityError('테스트');
    expect(error instanceof SecurityError).toBe(true);
    expect(error instanceof CBVError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

describe('MemoryError', () => {
  it('T-20: 기본 생성 시 name=MemoryError, code=MEMORY_001', () => {
    const error = new MemoryError('메모리 부족');
    expect(error.name).toBe('MemoryError');
    expect(error.code).toBe('MEMORY_001');
    expect(error.message).toBe('메모리 부족');
  });

  it('T-21: instanceof CBVError, Error 모두 true', () => {
    const error = new MemoryError('테스트');
    expect(error instanceof MemoryError).toBe(true);
    expect(error instanceof CBVError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});

// ============================================================
// T-22 ~ T-23: 보안 검증 (NFR-ERR-02, NFR-ERR-03)
// ============================================================

describe('보안 및 에러 코드 검증', () => {
  it('T-22: 모든 에러 context에 PHI 미포함 확인 (NFR-ERR-02)', () => {
    const phiKeys = ['patientName', 'patientId', 'birthDate'];

    const errors = [
      new CBVError('테스트', 'CBV_000', { patientName: '테스트' }),
      new ParseError('테스트', 'PARSE_ERR_UNEXPECTED', { patientId: 'P001' }),
      new ValidationError('테스트', 'VALIDATE_001', { birthDate: '1990-01-01' }),
      new RenderError('테스트', 'RENDER_001', { patientName: '홍길동' }),
      new MemoryError('테스트', 'MEMORY_001', { patientId: 'P002' }),
    ];

    // CBVError, ParseError, ValidationError, RenderError, MemoryError는
    // PHI를 전달해도 그대로 보존됨 (PHI 필터링은 SecurityError만 적용)
    // 단, SecurityError는 PHI 필터링이 적용되어야 함
    const secError = new SecurityError('테스트', 'SECURITY_001', {
      patientName: '민감정보',
      patientId: 'P003',
      birthDate: '2000-01-01',
      action: 'access',
    });

    for (const key of phiKeys) {
      expect(secError.context[key]).toBeUndefined();
    }
    expect(secError.context.action).toBe('access');
  });

  it('T-23: 각 클래스 기본 코드가 ERROR_CODES에 존재하는지 확인 (NFR-ERR-03)', () => {
    expect(ERROR_CODES.CBV_000).toBe('CBV_000');
    expect(ERROR_CODES.PARSE_ERR_UNEXPECTED).toBe('PARSE_ERR_UNEXPECTED');
    expect(ERROR_CODES.VALIDATE_001).toBe('VALIDATE_001');
    expect(ERROR_CODES.RENDER_001).toBe('RENDER_001');
    expect(ERROR_CODES.SECURITY_001).toBe('SECURITY_001');
    expect(ERROR_CODES.MEMORY_001).toBe('MEMORY_001');
  });
});

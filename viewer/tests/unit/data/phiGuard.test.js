/**
 * @file PHI 보호 가드 단위 테스트
 * @description SEC-3: PHI 필드 마스킹 및 안전한 조회 검증
 */

import { describe, it, expect } from 'vitest';
import { maskPhiFields, getPhiValue, dumpPhiValues } from '../../../src/data/dicomParser/phiGuard.js';

describe('phiGuard', () => {
  it('PHI 필드가 마스킹된다', () => {
    const meta = {
      patientName: '홍길동',
      patientID: 'P12345',
      patientBirthDate: '19900101',
      rows: 512,
      columns: 512,
    };
    const result = maskPhiFields(meta);
    expect(result.patientName).toBe('[REDACTED]');
    expect(result.patientID).toBe('[REDACTED]');
    expect(result.patientBirthDate).toBe('[REDACTED]');
    expect(result.rows).toBe(512);
    expect(result.columns).toBe(512);
  });

  it('getPhiValue로 원본 값을 조회할 수 있다', () => {
    const meta = {
      patientName: '홍길동',
      patientID: 'P12345',
    };
    maskPhiFields(meta);
    expect(getPhiValue(meta, 'patientName')).toBe('홍길동');
    expect(getPhiValue(meta, 'patientID')).toBe('P12345');
  });

  it('PHI가 아닌 필드는 getPhiValue에서 undefined를 반환한다', () => {
    const meta = { rows: 512 };
    maskPhiFields(meta);
    expect(getPhiValue(meta, 'rows')).toBeUndefined();
  });

  it('빈 문자열 PHI 필드는 마스킹하지 않는다', () => {
    const meta = { patientName: '', patientID: '' };
    maskPhiFields(meta);
    expect(meta.patientName).toBe('');
    expect(meta.patientID).toBe('');
  });

  it('dumpPhiValues가 모든 원본 값을 반환한다', () => {
    const meta = {
      patientName: '홍길동',
      patientID: 'P12345',
      patientBirthDate: '19900101',
    };
    maskPhiFields(meta);
    const dump = dumpPhiValues(meta);
    expect(dump.patientName).toBe('홍길동');
    expect(dump.patientID).toBe('P12345');
    expect(dump.patientBirthDate).toBe('19900101');
  });

  it('null/undefined 입력에 대해 안전하게 처리한다', () => {
    expect(maskPhiFields(null)).toBeNull();
    expect(maskPhiFields(undefined)).toBeUndefined();
  });
});
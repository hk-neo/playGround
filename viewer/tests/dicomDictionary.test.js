/**
 * @file dicomDictionary 단위 테스트
 * @description US-3.1.1 ~ US-3.1.4 전체 커버
 */

import { describe, it, expect } from 'vitest';
import {
  TRANSFER_SYNTAX,
  SUPPORTED_TRANSFER_SYNTAXES,
  VR_CATEGORY,
  EXTENDED_LENGTH_VR,
  DICTIONARY,
  makeTagKey,
  lookupTag,
  lookupVR,
} from '../src/data/dicomDictionary.js';

// ============================================================
// US-3.1.1: DICOM 태그 키 생성 및 조회
// ============================================================

describe('US-3.1.1: makeTagKey / lookupTag / lookupVR', () => {
  // --- makeTagKey ---
  describe('makeTagKey', () => {
    it('makeTagKey(0x7FE0, 0x0010) 은 "7FE00010" 을 반환해야 한다', () => {
      expect(makeTagKey(0x7FE0, 0x0010)).toBe('7FE00010');
    });

    it('makeTagKey(0x0002, 0x0010) 은 "00020010" 을 반환해야 한다', () => {
      expect(makeTagKey(0x0002, 0x0010)).toBe('00020010');
    });

    it('makeTagKey(0xFFFE, 0xE0DD) 은 "FFFEE0DD" 을 반환해야 한다', () => {
      expect(makeTagKey(0xFFFE, 0xE0DD)).toBe('FFFEE0DD');
    });

    it('makeTagKey(0x0028, 0x0010) 은 "00280010" 을 반환해야 한다', () => {
      expect(makeTagKey(0x0028, 0x0010)).toBe('00280010');
    });

    it('10진수 입력도 올바르게 처리해야 한다', () => {
      expect(makeTagKey(40, 16)).toBe('00280010');
      expect(makeTagKey(32736, 16)).toBe('7FE00010');
    });

    it('항상 대문자 16진수 8자리를 반환해야 한다', () => {
      const key = makeTagKey(0x0008, 0x0060);
      expect(key).toBe('00080060');
      expect(key).toHaveLength(8);
      expect(key).toBe(key.toUpperCase());
    });
  });

  // --- lookupTag ---
  describe('lookupTag', () => {
    it('lookupTag("7FE00010") 은 { vr: "OW", name: "PixelData" } 를 반환해야 한다', () => {
      const result = lookupTag('7FE00010');
      expect(result).not.toBeNull();
      expect(result.vr).toBe('OW');
      expect(result.name).toBe('PixelData');
    });

    it('lookupTag("00280010") 은 Rows 태그 정보를 반환해야 한다', () => {
      const result = lookupTag('00280010');
      expect(result).not.toBeNull();
      expect(result.vr).toBe('US');
      expect(result.name).toBe('Rows');
    });

    it('lookupTag("00020010") 은 TransferSyntaxUID 태그 정보를 반환해야 한다', () => {
      const result = lookupTag('00020010');
      expect(result).not.toBeNull();
      expect(result.vr).toBe('UI');
      expect(result.name).toBe('TransferSyntaxUID');
    });

    it('lookupTag("99999999") 미등록 키 조회 시 null 을 반환해야 한다', () => {
      expect(lookupTag('99999999')).toBeNull();
    });

    it('lookupTag("") 빈 문자열 조회 시 null 을 반환해야 한다', () => {
      expect(lookupTag('')).toBeNull();
    });

    it('시퀀스 구분 태그 FFFEE0DD 를 조회할 수 있어야 한다', () => {
      const result = lookupTag('FFFEE0DD');
      expect(result).not.toBeNull();
      expect(result.name).toBe('SequenceDelimitationItem');
    });
  });

  // --- lookupVR ---
  describe('lookupVR', () => {
    it('lookupVR("7FE00010") 은 "OW" 를 반환해야 한다', () => {
      expect(lookupVR('7FE00010')).toBe('OW');
    });

    it('lookupVR("00280010") 은 "US" 를 반환해야 한다', () => {
      expect(lookupVR('00280010')).toBe('US');
    });

    it('lookupVR("00020010") 은 "UI" 를 반환해야 한다', () => {
      expect(lookupVR('00020010')).toBe('UI');
    });

    it('lookupVR("99999999") 미등록 키 조회 시 "UN" 을 반환해야 한다', () => {
      expect(lookupVR('99999999')).toBe('UN');
    });

    it('lookupVR("") 빈 문자열 조회 시 "UN" 을 반환해야 한다', () => {
      expect(lookupVR('')).toBe('UN');
    });

    it('시퀀스 구분 태그의 VR 은 "na" 여야 한다', () => {
      expect(lookupVR('FFFEE000')).toBe('na');
      expect(lookupVR('FFFEE00D')).toBe('na');
      expect(lookupVR('FFFEE0DD')).toBe('na');
    });
  });
});

// ============================================================
// US-3.1.2: 전송 구문 검증 지원
// ============================================================

describe('US-3.1.2: TRANSFER_SYNTAX / SUPPORTED_TRANSFER_SYNTAXES', () => {
  describe('TRANSFER_SYNTAX', () => {
    it('EXPLICIT_VR_LE 가 올바른 UID 값을 가져야 한다', () => {
      expect(TRANSFER_SYNTAX.EXPLICIT_VR_LE).toBe('1.2.840.10008.1.2.1');
    });

    it('IMPLICIT_VR_LE 가 올바른 UID 값을 가져야 한다', () => {
      expect(TRANSFER_SYNTAX.IMPLICIT_VR_LE).toBe('1.2.840.10008.1.2');
    });

    it('BIG_ENDIAN 이 올바른 UID 값을 가져야 한다', () => {
      expect(TRANSFER_SYNTAX.BIG_ENDIAN).toBe('1.2.840.10008.1.2.2');
    });
  });

  describe('SUPPORTED_TRANSFER_SYNTAXES', () => {
    it('비압축 전송 구문 3종을 모두 포함해야 한다', () => {
      expect(SUPPORTED_TRANSFER_SYNTAXES.has(TRANSFER_SYNTAX.EXPLICIT_VR_LE)).toBe(true);
      expect(SUPPORTED_TRANSFER_SYNTAXES.has(TRANSFER_SYNTAX.IMPLICIT_VR_LE)).toBe(true);
      expect(SUPPORTED_TRANSFER_SYNTAXES.has(TRANSFER_SYNTAX.BIG_ENDIAN)).toBe(true);
    });

    it('JPEG 압축 전송 구문은 포함하지 않아야 한다', () => {
      expect(SUPPORTED_TRANSFER_SYNTAXES.has('1.2.840.10008.1.2.4.50')).toBe(false);
      expect(SUPPORTED_TRANSFER_SYNTAXES.has('1.2.840.10008.1.2.4.51')).toBe(false);
      expect(SUPPORTED_TRANSFER_SYNTAXES.has('1.2.840.10008.1.2.4.57')).toBe(false);
      expect(SUPPORTED_TRANSFER_SYNTAXES.has('1.2.840.10008.1.2.4.70')).toBe(false);
    });

    it('JPEG2000 압축 전송 구문은 포함하지 않아야 한다', () => {
      expect(SUPPORTED_TRANSFER_SYNTAXES.has('1.2.840.10008.1.2.4.90')).toBe(false);
      expect(SUPPORTED_TRANSFER_SYNTAXES.has('1.2.840.10008.1.2.4.91')).toBe(false);
    });

    it('RLE 압축 전송 구문은 포함하지 않아야 한다', () => {
      expect(SUPPORTED_TRANSFER_SYNTAXES.has('1.2.840.10008.1.2.5')).toBe(false);
    });

    it('Set 인스턴스여야 한다', () => {
      expect(SUPPORTED_TRANSFER_SYNTAXES).toBeInstanceOf(Set);
    });

    it('정확히 3개의 항목만 포함해야 한다', () => {
      expect(SUPPORTED_TRANSFER_SYNTAXES.size).toBe(3);
    });
  });
});

// ============================================================
// US-3.1.3: VR 분류 및 확장 길이 VR 식별
// ============================================================

describe('US-3.1.3: VR_CATEGORY / EXTENDED_LENGTH_VR', () => {
  describe('VR_CATEGORY', () => {
    it('NUMERIC 에 FL, FD, SL, SS, UL, US 가 포함되어야 한다', () => {
      expect(VR_CATEGORY.NUMERIC).toEqual(expect.arrayContaining(['FL', 'FD', 'SL', 'SS', 'UL', 'US']));
    });

    it('STRING_NUMERIC 에 DS, IS 가 포함되어야 한다', () => {
      expect(VR_CATEGORY.STRING_NUMERIC).toEqual(expect.arrayContaining(['DS', 'IS']));
    });

    it('STRING 에 LO, PN, SH, UI 가 포함되어야 한다', () => {
      expect(VR_CATEGORY.STRING).toEqual(expect.arrayContaining(['LO', 'PN', 'SH', 'UI']));
    });

    it('STRING 에 CS, DA, TM, DT 도 포함되어야 한다', () => {
      expect(VR_CATEGORY.STRING).toEqual(expect.arrayContaining(['CS', 'DA', 'TM', 'DT']));
    });

    it('BINARY 에 OB, OW, UN 이 포함되어야 한다', () => {
      expect(VR_CATEGORY.BINARY).toEqual(expect.arrayContaining(['OB', 'OW', 'UN']));
    });

    it('SEQUENCE 에 SQ 가 포함되어야 한다', () => {
      expect(VR_CATEGORY.SEQUENCE).toEqual(expect.arrayContaining(['SQ']));
    });
  });

  describe('EXTENDED_LENGTH_VR', () => {
    it('OB, OW, OF, SQ, UC, UN, UR, UT 이 모두 포함되어야 한다', () => {
      for (const vr of ['OB', 'OW', 'OF', 'SQ', 'UC', 'UN', 'UR', 'UT']) {
        expect(EXTENDED_LENGTH_VR.has(vr)).toBe(true);
      }
    });

    it('일반 VR(US, SS, FL 등)은 포함되지 않아야 한다', () => {
      for (const vr of ['US', 'SS', 'FL', 'FD', 'SL', 'UL', 'DS', 'IS', 'LO', 'PN', 'SH', 'UI']) {
        expect(EXTENDED_LENGTH_VR.has(vr)).toBe(false);
      }
    });

    it('Set 인스턴스여야 한다', () => {
      expect(EXTENDED_LENGTH_VR).toBeInstanceOf(Set);
    });

    it('정확히 8개의 항목을 포함해야 한다', () => {
      expect(EXTENDED_LENGTH_VR.size).toBe(8);
    });
  });
});

// ============================================================
// US-3.1.4: 필수 DICOM 태그 사전 완전성
// ============================================================

describe('US-3.1.4: DICTIONARY 완전성', () => {
  it('그룹 0002(파일메타) 필수 태그가 등록되어야 한다', () => {
    const group0002 = ['00020000', '00020001', '00020002', '00020003', '00020010'];
    for (const tag of group0002) {
      expect(DICTIONARY[tag]).toBeDefined();
      expect(DICTIONARY[tag].vr).toBeDefined();
      expect(DICTIONARY[tag].name).toBeDefined();
    }
  });

  it('그룹 0008(스터디) 필수 태그가 등록되어야 한다', () => {
    const tags = ['00080060', '00080016', '00080018'];
    for (const tag of tags) {
      expect(DICTIONARY[tag]).toBeDefined();
    }
  });

  it('그룹 0010(환자) 필수 태그가 등록되어야 한다', () => {
    const tags = ['00100010', '00100020'];
    for (const tag of tags) {
      expect(DICTIONARY[tag]).toBeDefined();
    }
  });

  it('그룹 0018(영상파라미터) 필수 태그가 등록되어야 한다', () => {
    const tags = ['00180050', '00180088'];
    for (const tag of tags) {
      expect(DICTIONARY[tag]).toBeDefined();
    }
  });

  it('그룹 0020(위치/방향) 필수 태그가 등록되어야 한다', () => {
    const tags = ['00200032', '00200037', '0020000D', '0020000E'];
    for (const tag of tags) {
      expect(DICTIONARY[tag]).toBeDefined();
    }
  });

  it('그룹 0028(영상표현) 필수 태그가 등록되어야 한다', () => {
    const tags = ['00280010', '00280011', '00280100', '00280101', '00280102', '00280103'];
    for (const tag of tags) {
      expect(DICTIONARY[tag]).toBeDefined();
    }
  });

  it('그룹 7FE0(픽셀데이터) 태그가 등록되어야 한다', () => {
    expect(DICTIONARY['7FE00010']).toBeDefined();
    expect(DICTIONARY['7FE00010'].vr).toBe('OW');
    expect(DICTIONARY['7FE00010'].name).toBe('PixelData');
  });

  it('그룹 FFFE(시퀀스구분) 태그가 등록되어야 한다', () => {
    const tags = ['FFFE0000', 'FFFEE000', 'FFFEE00D', 'FFFEE0DD'];
    for (const tag of tags) {
      expect(DICTIONARY[tag]).toBeDefined();
      expect(DICTIONARY[tag].vr).toBe('na');
    }
  });

  it('DICTIONARY 키가 makeTagKey 출력과 일치해야 한다', () => {
    const keys = Object.keys(DICTIONARY);
    for (const key of keys) {
      // 키는 8자리 대문자 16진수여야 함
      expect(key).toMatch(/^[0-9A-F]{8}$/);
    }
  });

  it('DICTIONARY 에 약 50개 이상의 필수 태그가 등록되어야 한다', () => {
    const keys = Object.keys(DICTIONARY);
    expect(keys.length).toBeGreaterThanOrEqual(50);
  });

  it('모든 DICTIONARY 항목은 { vr, name } 구조여야 한다', () => {
    const entries = Object.entries(DICTIONARY);
    for (const [key, value] of entries) {
      expect(value).toHaveProperty('vr');
      expect(value).toHaveProperty('name');
      expect(typeof value.vr).toBe('string');
      expect(typeof value.name).toBe('string');
    }
  });
});

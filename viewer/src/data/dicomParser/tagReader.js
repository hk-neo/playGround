/**
 * @file DICOM 태그 읽기 (SDS-3.5, DICOM PS3.5)
 * @module data/dicomParser/tagReader
 * @description ParseContext에서 DICOM 태그를 순차적으로 읽는 핵심 함수
 * 추적: FR-2.2(데이터셋 태그 순차 파싱), FR-1.3(필수 태그 검증),
 *        FR-2.6(버퍼 범위 초과 읽기 방지)
 * Hazard: HAZ-1.3(필수 태그 누락), HAZ-5.3(ArrayBuffer 범위 초과 읽기)
 * 안전 등급: IEC 62304 Class A
 */

import { EXTENDED_LENGTH_VR, makeTagKey, lookupVR } from '../dicomDictionary.js';
import { MAX_SEQUENCE_DEPTH, MAX_TAG_COUNT } from './constants.js';

/**
 * 시퀀스 구분 태그 그룹 번호 (0xFFFE)
 * @constant {number}
 */
const SEQUENCE_DELIMITATION_GROUP = 0xFFFE;

/**
 * Undefined Length 마커
 * @constant {number}
 */
const UNDEFINED_LENGTH = 0xFFFFFFFF;

/**
 * DICOM 태그를 읽는다.
 * Explicit/Implicit VR 모드 모두 지원하며,
 * 시퀀스 구분 태그(FFFE 그룹)와 Undefined Length 시퀀스도 처리한다.
 *
 * @param {Object} ctx - ParseContext 객체
 *   (buffer, dataView, offset, isLittleEndian, isExplicitVR, errors,
 *    hasRemaining, readUint16, readUint32, readString, advance, remaining)
 * @returns {Object|null} TagReadResult { tag, vr, length, value, offset }
 *   또는 null (버퍼 부족 시)
 */
export function readTag(ctx) {
  // 1. 버퍼 잔여 확인: 최소 4바이트(태그 번호 2+2) 필요 (FR-2.6, HAZ-5.3)
  if (!ctx.hasRemaining(4)) {
    return null;
  }

  const startOffset = ctx.offset;

  // 2. 태그 번호 읽기: group(16비트) + element(16비트)
  const group = ctx.readUint16();
  const element = ctx.readUint16();
  const tag = [group, element];

  // 3. 시퀀스 구분 태그 분기 (FFFE 그룹)
  //    VR/값이 없으므로 4바이트 길이만 읽고 조기 반환
  if (group === SEQUENCE_DELIMITATION_GROUP) {
    if (!ctx.hasRemaining(4)) {
      return null;
    }
    const itemLength = ctx.readUint32();
    return {
      tag,
      vr: 'na',
      length: itemLength,
      value: null,
      offset: startOffset,
    };
  }

  let vr = '';
  let length = 0;

  // 4. VR 결정 분기
  if (ctx.isExplicitVR) {
    // Explicit VR: 2바이트 VR 문자열 읽기
    if (!ctx.hasRemaining(2)) {
      return null;
    }
    vr = ctx.readString(2);

    if (EXTENDED_LENGTH_VR.has(vr)) {
      // 확장 VR (OB,OW,OF,SQ,UC,UN,UR,UT): 2바이트 예약 + 4바이트 길이
      ctx.advance(2);
      if (!ctx.hasRemaining(4)) {
        return null;
      }
      length = ctx.readUint32();
    } else {
      // 일반 VR: 2바이트 길이
      if (!ctx.hasRemaining(2)) {
        return null;
      }
      length = ctx.readUint16();
    }
  } else {
    // Implicit VR: makeTagKey()로 태그 키 생성 후 lookupVR() 조회
    const tagKey = makeTagKey(group, element);
    vr = lookupVR(tagKey);
    if (!ctx.hasRemaining(4)) {
      return null;
    }
    length = ctx.readUint32();
  }

  // 5. 길이 처리 분기
  let value = null;

  if (length === UNDEFINED_LENGTH) {
    // Undefined Length: 종료 마커까지 건너뛰기
    skipUndefinedLengthSequence(ctx);
    value = null;
  } else if (length > 0 && ctx.hasRemaining(length)) {
    // 버퍼 충분: VR별 값 디코딩
    value = readTagValue(ctx, vr, length);
  } else if (length > 0) {
    // 버퍼 부족: 태그 값 잘림 경고 기록 (FR-2.6, NFR-7)
    value = null;
    if (ctx.errors) {
      const tagHex = '0x' + group.toString(16).toUpperCase().padStart(4, '0')
        + ',0x' + element.toString(16).toUpperCase().padStart(4, '0');
      ctx.errors.push({
        code: 'PARSE_WARN_TRUNCATED_TAG_VALUE',
        message: '태그 (' + tagHex + ') 값이 버퍼 끝에서 잘림: length='
          + length + ', remaining=' + ctx.remaining(),
        severity: 'warning',
      });
    }
    // 오프셋를 버퍼 끝으로 이동
    ctx.advance(ctx.remaining());
  }

  // 6. 결과 반환
  return {
    tag,
    vr,
    length,
    value,
    offset: startOffset,
  };
}

/**
 * 문자열 정규화 헬퍼: null 바이트 제거 및 공백 트림
 * @param {string} str
 * @returns {string}
 */
function normalizeString(str) {
  return str.trim().replace(/\0/g, '');
}

/**
 * 태그 값을 VR에 맞게 읽는다.
 * DICOM PS3.5 Value Representation별 디코딩 (SDS-3.6)
 *
 * @param {Object} ctx - ParseContext
 * @param {string} vr - Value Representation
 * @param {number} length - 값 길이
 * @returns {string|number|number[]|Object|null}
 */
export function readTagValue(ctx, vr, length) {
  // 빈 값 처리: 모든 VR에 대해 일관되게 null 반환
  if (length === 0) {
    return null;
  }

  // VR null/undefined 방어 (Implicit VR 모드에서 사전 조회 실패 시)
  if (!vr) {
    ctx.advance(length);
    return null;
  }

  switch (vr) {
    // --- 정수 VR (DICOM PS3.5 Table 6.2-1) ---
    case 'US': {
      const val = ctx.readUint16();
      if (length > 2) ctx.advance(length - 2);
      return val;
    }
    case 'SS': {
      const val = ctx.readInt16();
      if (length > 2) ctx.advance(length - 2);
      return val;
    }
    case 'UL': {
      const val = ctx.readUint32();
      if (length > 4) ctx.advance(length - 4);
      return val;
    }
    case 'SL': {
      const val = ctx.readInt32();
      if (length > 4) ctx.advance(length - 4);
      return val;
    }

    // --- 실수 VR ---
    case 'FL': {
      const val = ctx.readFloat32();
      if (length > 4) ctx.advance(length - 4);
      return val;
    }
    case 'FD': {
      const val = ctx.readFloat64();
      if (length > 8) ctx.advance(length - 8);
      return val;
    }

    // --- 문자열 숫자 VR (다중값 지원) ---
    case 'DS': {
      const str = normalizeString(ctx.readString(length));
      const values = str.split('\\');
      if (values.length > 1) {
        return values.map(v => { const n = parseFloat(v); return isNaN(n) ? v : n; });
      }
      const num = parseFloat(str);
      return isNaN(num) ? str : num;
    }
    case 'IS': {
      const str = normalizeString(ctx.readString(length));
      const values = str.split('\\');
      if (values.length > 1) {
        return values.map(v => { const n = parseInt(v, 10); return isNaN(n) ? v : n; });
      }
      const num = parseInt(str, 10);
      return isNaN(num) ? str : num;
    }

    // --- 속성 태그 VR (DICOM PS3.5 AT) ---
    case 'AT': {
      const group = ctx.readUint16();
      const element = ctx.readUint16();
      if (length > 4) ctx.advance(length - 4);
      return makeTagKey(group, element);
    }

    // --- 바이너리 VR (지연 접근) ---
    case 'OW':
    case 'OB':
    case 'UN': {
      // 지연 접근: 복사하지 않고 오프셋만 반환 (NFR-3)
      const startOffset = ctx.offset;
      ctx.advance(length);
      return { _binaryOffset: startOffset, _binaryLength: length };
    }

    // --- 시퀀스 VR ---
    case 'SQ': {
      // 시퀀스: 오프셋만 전진 (중첩은 readTag에서 처리)
      ctx.advance(length);
      return null;
    }

    // --- 문자열 VR (LO, SH, PN, UI, CS, DA, TM, DT, LT, ST, AE, AS 등) ---
    default: {
      const str = normalizeString(ctx.readString(length));
      return str;
    }
  }
}

/**
 * 시퀀스 태그를 건너뛴다 (중첩 깊이 제한 적용).
 * @param {Object} ctx - ParseContext
 * @param {number} depth - 현재 중첩 깊이
 * @returns {number} 새로운 중첩 깊이
 */
export function skipSequence(ctx, depth) {
  if (depth >= MAX_SEQUENCE_DEPTH) {
    return depth;
  }
  return depth + 1;
}

/**
 * Undefined length 시퀀스 최대 스캔 바이트 수 (64MB).
 * 악의적 파일로 인한 무제한 스캔을 방지 (PERF-3, HAZ-5.3).
 */
const MAX_SEQUENCE_SCAN_BYTES = 64 * 1024 * 1024;

/**
 * Undefined length(0xFFFFFFFF) 시퀀스/태그를 종료 마커까지 건너뛴다.
 * FFFE,E0DD(Sequence Delimitation Item)를 만나거나 버퍼 끝에 도달할 때까지
 * 오프셋를 전진시킨다.
 * 최대 64MB까지 스캔하여 무제한 O(n) 스캔을 방지한다 (PERF-3).
 * @param {Object} ctx - ParseContext
 */
function skipUndefinedLengthSequence(ctx) {
  const SEQ_DELIMITATION_ELEMENT = 0xE0DD;
  const DELIMITATION_GROUP = 0xFFFE;
  let depth = 0;
  const scanLimit = ctx.offset + MAX_SEQUENCE_SCAN_BYTES;

  while (ctx.hasRemaining(8) && ctx.offset < scanLimit) {
    const group = ctx.readUint16();
    const element = ctx.readUint16();

    if (group === DELIMITATION_GROUP) {
      // 4바이트 길이 읽기
      const itemLen = ctx.readUint32();

      if (element === SEQ_DELIMITATION_ELEMENT) {
        // Sequence Delimitation Item (FFFE,E0DD)
        if (depth === 0) return;
        depth--;
      } else {
        // Item (FFFE,E000) 또는 Item Delimitation (FFFE,E00D)
        // itemLen이 0xFFFFFFFF면 내부가 또 undefined length
        if (itemLen !== UNDEFINED_LENGTH && itemLen > 0
            && ctx.hasRemaining(itemLen)) {
          ctx.advance(itemLen);
        }
      }
    } else {
      // 일반 태그 - VR + length를 읽고 건너뛰기
      if (ctx.isExplicitVR) {
        if (!ctx.hasRemaining(2)) break;
        const vrStr = ctx.readString(2);
        if (EXTENDED_LENGTH_VR.has(vrStr)) {
          ctx.advance(2); // 예약 바이트
          if (!ctx.hasRemaining(4)) break;
          const len = ctx.readUint32();
          if (len === UNDEFINED_LENGTH && vrStr === 'SQ') {
            // VR이 SQ인 경우에만 중첩 시퀀스 진입 (ARCH-2, CQ-2 수정)
            if (depth < MAX_SEQUENCE_DEPTH) {
              depth++;
            }
          } else if (len > 0 && ctx.hasRemaining(len)) {
            ctx.advance(len);
          }
        } else {
          if (!ctx.hasRemaining(2)) break;
          const len = ctx.readUint16();
          if (len > 0 && ctx.hasRemaining(len)) {
            ctx.advance(len);
          }
        }
      } else {
        // Implicit VR: 4바이트 길이
        if (!ctx.hasRemaining(4)) break;
        const len = ctx.readUint32();
        if (len === UNDEFINED_LENGTH) {
          // Implicit VR에서는 VR을 알 수 없으므로 데이터 사전 조회
          const tagKey = makeTagKey(group, element);
          const resolvedVR = lookupVR(tagKey);
          if (resolvedVR === 'SQ' && depth < MAX_SEQUENCE_DEPTH) {
            depth++;
          }
        } else if (len > 0 && ctx.hasRemaining(len)) {
          ctx.advance(len);
        }
      }
    }
  }
}

/**
 * 시퀀스 중첩 깊이를 관리한다.
 * MAX_SEQUENCE_DEPTH(10) 초과 시 현재 깊이 유지 (FR-2.5, HAZ-5.2).
 *
 * @param {Object} ctx - ParseContext
 * @param {number} depth - 현재 중첩 깊이
 * @returns {number} 새로운 중첩 깊이
 */
export function skipSequence(ctx, depth) {
  if (depth >= MAX_SEQUENCE_DEPTH) {
    return depth;
  }
  return depth + 1;
}
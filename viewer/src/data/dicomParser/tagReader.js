/**
 * @file DICOM 태그 읽기 헬퍼 (FR-1.3, DICOM PS3.5)
 * @module data/dicomParser/tagReader
 * @description ParseContext에서 DICOM 태그를 순차적으로 읽는 헬퍼 함수
 * US-3: 태그/VR/길이/값 정확히 읽기
 */

import { EXTENDED_LENGTH_VR } from '../dicomDictionary.js';
import { makeTagKey, lookupVR } from '../dicomDictionary.js';
import { MAX_TAG_COUNT, MAX_SEQUENCE_DEPTH } from './constants.js';

/**
 * 시퀀스 구분 태그 (그룹 FFFE)
 */
const SEQUENCE_DELIMITATION_GROUP = 0xFFFE;

/**
 * DICOM 태그를 읽는다.
 * Explicit/Implicit VR 모드 모두 지원.
 *
 * @param {Object} ctx - ParseContext 객체
 * @returns {Object|null} TagReadResult { tag, vr, length, value, offset } 또는 null (데이터 끝)
 */
export function readTag(ctx) {
  if (!ctx.hasRemaining(4)) {
    return null;
  }

  const startOffset = ctx.offset;
  const group = ctx.readUint16();
  const element = ctx.readUint16();
  const tag = [group, element];

  // 시퀀스 구분 태그 처리 (FFFE,E000 / FFFE,E00D / FFFE,E0DD)
  if (group === SEQUENCE_DELIMITATION_GROUP) {
    const itemLength = ctx.readUint32();
    return {
      tag,
      vr: 'na',
      length: itemLength,
      value: null,
      offset: ctx.offset,
    };
  }

  let vr = '';
  let length = 0;

  if (ctx.isExplicitVR) {
    // Explicit VR: 2바이트 VR 문자열 읽기
    if (!ctx.hasRemaining(2)) return null;
    vr = ctx.readString(2);

    if (EXTENDED_LENGTH_VR.has(vr)) {
      // Extended length VR: 2 reserved + 4 byte length
      ctx.advance(2); // 예약 바이트 건너뛰기
      if (!ctx.hasRemaining(4)) return null;
      length = ctx.readUint32();
    } else {
      // 일반 VR: 2 byte length
      if (!ctx.hasRemaining(2)) return null;
      length = ctx.readUint16();
    }
  } else {
    // Implicit VR: VR을 데이터 사전에서 조회, 4 byte length
    const tagKey = makeTagKey(group, element);
    vr = lookupVR(tagKey);
    if (!ctx.hasRemaining(4)) return null;
    length = ctx.readUint32();
  }

  // 값 읽기
  let value = null;
  if (length === 0xFFFFFFFF) {
    // Undefined length (시퀀스 등) - 안전을 위해 나머지 버퍼를 스캔하여 종료 태그 탐색
    value = null;
    skipUndefinedLengthSequence(ctx);
  } else if (length > 0 && ctx.hasRemaining(length)) {
    value = readTagValue(ctx, vr, length);
  } else if (length > 0) {
    // 길이가 남은 버퍼를 초과하는 경우 - 데이터 손실 경고 기록
    value = null;
    if (ctx.errors) {
      const tagHex = '0x' + group.toString(16).toUpperCase().padStart(4, '0')
        + ',0x' + element.toString(16).toUpperCase().padStart(4, '0');
      ctx.errors.push({
        code: 'PARSE_WARN_TRUNCATED_TAG_VALUE',
        message: '태그 (' + tagHex + ') 값이 버퍼 끝에서 잘림: length=' + length + ', remaining=' + ctx.remaining(),
        severity: 'warning',
      });
    }
    ctx.advance(ctx.remaining());
  }

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
      // 성능 최적화: 픽셀 데이터 등 대용량 바이너리는 복사하지 않고
      // 오프셋만 전진. 호출부에서 ctx.offset 기반으로 직접 접근 가능.
      const startOffset = ctx.offset;
      ctx.advance(length);
      return { _binaryOffset: startOffset, _binaryLength: length };
    }

    // --- 시퀀스 VR ---
    case 'SQ': {
      // 시퀀스는 건너뛰기 (중첩 깊이 제한)
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
  const seqDelimitationTag = 0xE0DD;
  const delimitationGroup = 0xFFFE;
  let depth = 0;
  const scanLimit = ctx.offset + MAX_SEQUENCE_SCAN_BYTES;

  while (ctx.hasRemaining(8) && ctx.offset < scanLimit) {
    const group = ctx.readUint16();
    const element = ctx.readUint16();

    if (group === delimitationGroup && element === seqDelimitationTag) {
      // Sequence Delimitation Item 발견 - 4바이트 길이(0) 소비
      ctx.advance(4);
      if (depth === 0) return;
      depth--;
    } else if (group === delimitationGroup) {
      // 다른 구분 태그 (Item, Item Delimitation)
      const itemLen = ctx.readUint32();
      if (itemLen > 0 && itemLen !== 0xFFFFFFFF && ctx.hasRemaining(itemLen)) {
        ctx.advance(itemLen);
      }
    } else {
      // 일반 태그 - VR + length를 읽고 건너뛰기
      if (ctx.isExplicitVR && ctx.hasRemaining(2)) {
        const vr = ctx.readString(2);
        if (EXTENDED_LENGTH_VR.has(vr)) {
          ctx.advance(2); // reserved
          if (!ctx.hasRemaining(4)) break;
          const len = ctx.readUint32();
          if (len === 0xFFFFFFFF) {
            depth++; // 중첩 시퀀스 진입
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
        if (len === 0xFFFFFFFF) {
          depth++; // 중첩 시퀀스
        } else if (len > 0 && ctx.hasRemaining(len)) {
          ctx.advance(len);
        }
      }
    }
  }
}

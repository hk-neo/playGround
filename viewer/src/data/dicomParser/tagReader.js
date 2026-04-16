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
 * 태그 값을 VR에 맞게 읽는다.
 * @param {Object} ctx - ParseContext
 * @param {string} vr - Value Representation
 * @param {number} length - 값 길이
 * @returns {string|number|number[]|null}
 */
export function readTagValue(ctx, vr, length) {
  switch (vr) {
    case 'US': {
      const val = ctx.readUint16();
      // 패딩 바이트 건너뛰기
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
      const val = ctx.dataView.getInt32(ctx.offset, ctx.isLittleEndian);
      ctx.advance(4);
      if (length > 4) ctx.advance(length - 4);
      return val;
    }
    case 'FL': {
      const val = ctx.dataView.getFloat32(ctx.offset, ctx.isLittleEndian);
      ctx.advance(4);
      if (length > 4) ctx.advance(length - 4);
      return val;
    }
    case 'FD': {
      const val = ctx.dataView.getFloat64(ctx.offset, ctx.isLittleEndian);
      ctx.advance(8);
      if (length > 8) ctx.advance(length - 8);
      return val;
    }
    case 'DS': {
      const str = ctx.readString(length).trim().replace(/\0/g, '');
      const num = parseFloat(str);
      return isNaN(num) ? str : num;
    }
    case 'IS': {
      const str = ctx.readString(length).trim().replace(/\0/g, '');
      const num = parseInt(str, 10);
      return isNaN(num) ? str : num;
    }
    case 'OW':
    case 'OB':
    case 'UN': {
      const bytes = new Uint8Array(ctx.buffer, ctx.offset, length);
      ctx.advance(length);
      return bytes;
    }
    case 'SQ': {
      // 시퀀스는 건너뛰기 (중첩 깊이 제한)
      ctx.advance(length);
      return null;
    }
    default: {
      // 문자열 VR (LO, SH, PN, UI, CS, DA, TM, DT 등)
      const str = ctx.readString(length);
      return str.trim().replace(/\0/g, '');
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
 * Undefined length(0xFFFFFFFF) 시퀀스/태그를 종료 마커까지 건너뛴다.
 * FFFE,E0DD(Sequence Delimitation Item)를 만나거나 버퍼 끝에 도달할 때까지
 * 오프셋를 전진시킨다.
 * @param {Object} ctx - ParseContext
 */
function skipUndefinedLengthSequence(ctx) {
  const seqDelimitationTag = 0xE0DD;
  const delimitationGroup = 0xFFFE;
  let depth = 0;

  while (ctx.hasRemaining(8)) {
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

/**
 * @file DICOM 태그 읽기 (SDS-3.5 / SDS-3.7, DICOM PS3.5)
 * @module data/dicomParser/tagReader
 * @description ParseContext에서 DICOM 태그를 순차적으로 읽는 핵심 함수
 * 추적: FR-2.2(데이터셋 태그 순차 파싱), FR-1.3(필수 태그 검증),
 *        FR-2.6(버퍼 범위 초과 읽기 방지), FR-2.5(시퀀스 깊이 제한)
 * Hazard: HAZ-1.3(필수 태그 누락), HAZ-5.3(ArrayBuffer 범위 초과 읽기),
 *         HAZ-5.2(시퀀스 무한 중첩)
 * 안전 등급: IEC 62304 Class A
 */

import { EXTENDED_LENGTH_VR, makeTagKey, lookupVR } from '../dicomDictionary.js';
import { MAX_SEQUENCE_DEPTH, MAX_TAG_COUNT } from './constants.js';

// ============================================================
// SDS-3.7: 커스텀 예외 클래스
// ============================================================

/**
 * 스트림 끝 도달 시 발생 (불완전한 시퀀스)
 * SDS-3.7 예외 처리 규격
 */
export class DicomIOException extends Error {
  /**
   * @param {string} message - 에러 메시지
   * @param {Object} [context={}] - 추가 컨텍스트
   */
  constructor(message, context = {}) {
    super(message);
    this.name = 'DicomIOException';
    this.context = context;
  }
}

/**
 * 최대 깊이 초과(>=16) 시 발생 (무한 루프 방지)
 * SDS-3.7 예외 처리 규격
 */
export class DicomIllegalStateException extends Error {
  /**
   * @param {string} message - 에러 메시지
   * @param {Object} [context={}] - 추가 컨텍스트
   */
  constructor(message, context = {}) {
    super(message);
    this.name = 'DicomIllegalStateException';
    this.context = context;
  }
}

/**
 * 잘못된 Tag 형식 시 발생
 * SDS-3.7 예외 처리 규격
 */
export class DicomIllegalArgumentException extends Error {
  /**
   * @param {string} message - 에러 메시지
   * @param {Object} [context={}] - 추가 컨텍스트
   */
  constructor(message, context = {}) {
    super(message);
    this.name = 'DicomIllegalArgumentException';
    this.context = context;
  }
}

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
 * SDS-3.7 최대 재귀 깊이 (16단계)
 * @constant {number}
 * @trace FR-2.5, HAZ-5.2
 */
const MAX_SKIP_DEPTH = 16;

/**
 * skipUndefinedLengthSequence 최대 반복 횟수 (무한 루프 방지)
 * @constant {number}
 * @trace HAZ-5.1, FR-2.4
 */
const MAX_SKIP_ITERATIONS = 10000;

// ============================================================
// readTag() - DICOM 태그 읽기 (SDS-3.5)
// ============================================================

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

  let vr = "";
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
    // Undefined Length: SDS-3.7 skipUndefinedLengthSequence 호출
    // readTag() 내부에서는 예외를 throw하지 않으므로 try-catch로 래핑
    try {
      skipUndefinedLengthSequence(ctx, ctx.offset, 0);
    } catch (e) {
      // DicomIOException(스트림 끝)은 치명적: 오프셋를 버퍼 끝으로 이동
      if (e instanceof DicomIOException) {
        ctx.advance(ctx.remaining());
        if (ctx.errors) {
          ctx.errors.push({
            code: 'PARSE_ERR_UNEXPECTED',
            message: '불완전한 시퀀스: 시퀀스 종료 마커를 찾을 수 없음',
            severity: 'error',
          });
        }
      }
      // DicomIllegalStateException(깊이 초과) 등은 안전하게 무시하고 파싱 계속
    }
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

// ============================================================
// readTagValue() - VR별 값 디코딩 (SDS-3.5)
// ============================================================

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

  // T7: 파싱 실패 시 offset 무결성 보장
  const savedOffset = ctx.offset;
  try {
    switch (vr) {
      // --- 정수 VR (DICOM PS3.5 Table 6.2-1) ---
      // T1: 버퍼 안전성 가드 추가
      case 'US': {
        if (!ctx.hasRemaining(2)) {
          ctx.advance(length);
          return null;
        }
        const val = ctx.readUint16();
        if (length > 2) ctx.advance(length - 2);
        return val;
      }
      case 'SS': {
        if (!ctx.hasRemaining(2)) {
          ctx.advance(length);
          return null;
        }
        const val = ctx.readInt16();
        if (length > 2) ctx.advance(length - 2);
        return val;
      }
      case 'UL': {
        if (!ctx.hasRemaining(4)) {
          ctx.advance(length);
          return null;
        }
        const val = ctx.readUint32();
        if (length > 4) ctx.advance(length - 4);
        return val;
      }
      case 'SL': {
        if (!ctx.hasRemaining(4)) {
          ctx.advance(length);
          return null;
        }
        const val = ctx.readInt32();
        if (length > 4) ctx.advance(length - 4);
        return val;
      }

      // --- 실수 VR ---
      // T2: 버퍼 안전성 가드 추가
      case 'FL': {
        if (!ctx.hasRemaining(4)) {
          ctx.advance(length);
          return null;
        }
        const val = ctx.readFloat32();
        if (length > 4) ctx.advance(length - 4);
        return val;
      }
      case 'FD': {
        if (!ctx.hasRemaining(8)) {
          ctx.advance(length);
          return null;
        }
        const val = ctx.readFloat64();
        if (length > 8) ctx.advance(length - 8);
        return val;
      }

      // --- 문자열 숫자 VR (다중값 지원) ---
      // T4: DS, IS 다중값(백슬래시 구분) 파싱 지원
      case 'DS': {
        const str = ctx.readString(length).trim().replace(/\0/g, '');
        if (str.includes('\\')) {
          const parts = str.split('\\').map(s => parseFloat(s.trim()));
          return parts.some(isNaN) ? str : parts;
        }
        const num = parseFloat(str);
        return isNaN(num) ? str : num;
      }
      case 'IS': {
        const str = ctx.readString(length).trim().replace(/\0/g, '');
        if (str.includes('\\')) {
          const parts = str.split('\\').map(s => parseInt(s.trim(), 10));
          return parts.some(isNaN) ? str : parts;
        }
        const num = parseInt(str, 10);
        return isNaN(num) ? str : num;
      }

      // --- 속성 태그 VR (DICOM PS3.5 AT) ---
      // T5: AT VR (이미 구현되어 있음, 변경 없음)
      case 'AT': {
        const group = ctx.readUint16();
        const element = ctx.readUint16();
        if (length > 4) ctx.advance(length - 4);
        return makeTagKey(group, element);
      }

      // --- 바이너리 VR (지연 접근) ---
      // T6: 바이너리 VR 안전성 보강
      case 'OW':
      case 'OB':
      case 'UN': {
        if (!ctx.hasRemaining(length)) {
          ctx.advance(ctx.remaining());
          return null;
        }
        const startOffset = ctx.offset;
        ctx.advance(length);
        return { _binaryOffset: startOffset, _binaryLength: length };
      }

      // --- 시퀀스 VR ---
      case 'SQ': {
        ctx.advance(length);
        return null;
      }

      // --- 문자열 VR 세분화 (T3) ---
      case 'CS':
      case 'DA':
      case 'LO':
      case 'SH':
      case 'PN':
      case 'UI':
      case 'TM':
      case 'DT':
      case 'LT':
      case 'ST':
      case 'AE':
      case 'AS': {
        const str = ctx.readString(length);
        return str.trim().replace(/\0/g, '');
      }

      // --- 기타 문자열 VR (fallback) ---
      default: {
        const str = ctx.readString(length);
        return str.trim().replace(/\0/g, '');
      }
    }
  } catch (e) {
    // T7: offset 무결성 보장: 파싱 실패해도 정확히 length만큼 전진
    ctx.offset = savedOffset + length;
    return null;
  }
}


// ============================================================
// skipUndefinedLengthSequence() - SDS-3.7 시퀀스 건너뛰기
// ============================================================

/**
 * Undefined Length(0xFFFFFFFF) 시퀀스에서 종료 마커를 탐색하여 건너뛴다.
 * SDS-3.7 명세에 따른 예외 처리:
 *   - 스트림 끝 도달: DicomIOException (불완전한 시퀀스)
 *   - 최대 깊이 초과(>=16): DicomIllegalStateException (무한 루프 방지)
 *   - 잘못된 Tag 형식: DicomIllegalArgumentException
 *
 * 알고리즘 (SDS-3.7):
 *   1. 현재 위치에서 Tag(2byte) + VR/Length(2~6byte) 헤더를 읽는다.
 *   2. 읽은 Tag가 Sequence Delimiter(0xFFFE,0xE0DD)인지 확인한다.
 *      - 맞으면: Length(4byte)를 읽고 현재 오프셋 반환 (시퀀스 종료)
 *      - 아니면: Item Length 필드를 확인
 *        - Length가 undefined(0xFFFFFFFF)이면: 재귀적으로 하위 시퀀스 건너뛰기
 *        - Length가 정의된 값이면: offset += Length 만큼 이동 후 다음 Tag 읽기
 *   3. 위 과정을 Sequence Delimiter를 만날 때까지 반복한다.
 *
 * @param {Object} stream - ParseContext 객체 (입력 데이터 스트림)
 * @param {number} startOffset - 시퀀스 시작 오프셋
 * @param {number} [depth=0] - 현재 재귀 깊이
 * @returns {number} 시퀀스 종료 이후의 오프셋
 * @throws {DicomIOException} 스트림 끝 도달 시 (불완전한 시퀀스)
 * @throws {DicomIllegalStateException} 최대 깊이(16) 초과 시
 * @throws {DicomIllegalArgumentException} 잘못된 Tag 형식 시
 */
export function skipUndefinedLengthSequence(stream, startOffset, depth = 0) {
  // 깊이 제한 검사 (SDS-3.7: 최대 16단계)
  if (depth >= MAX_SKIP_DEPTH) {
    throw new DicomIllegalStateException(
      '시퀀스 최대 깊이 초과: depth=' + depth + ', max=' + MAX_SKIP_DEPTH,
      { depth, startOffset }
    );
  }

  // 스트림 오프셋을 startOffset으로 설정
  stream.offset = startOffset;

  const SEQ_DELIMITATION_ELEMENT = 0xE0DD;
  const DELIMITATION_GROUP = 0xFFFE;
  const ITEM_ELEMENT = 0xE000;
  const ITEM_DELIMITATION_ELEMENT = 0xE00D;

  let iterations = 0;
  while (stream.hasRemaining(4)) {
    // 무한 루프 방지 (HAZ-5.1)
    iterations++;
    if (iterations > MAX_SKIP_ITERATIONS) {
      throw new DicomIllegalStateException(
        '시퀀스 최대 반복 횟수 초과: max=' + MAX_SKIP_ITERATIONS,
        { startOffset, depth, iterations }
      );
    }

    // 1. Tag 읽기 (group 2byte + element 2byte)
    const tagOffset = stream.offset;
    const group = stream.readUint16();
    const element = stream.readUint16();

    // Tag 유효성 검사
    if (group > 0xFFFE) {
      throw new DicomIllegalArgumentException(
        '잘못된 Tag 그룹 번호: 0x' + group.toString(16).toUpperCase(),
        { group, element, offset: tagOffset }
      );
    }

    // 2. Sequence Delimiter(0xFFFE,0xE0DD) 확인
    if (group === DELIMITATION_GROUP && element === SEQ_DELIMITATION_ELEMENT) {
      // Delimiter의 Length(4byte)를 읽고 오프셋 반환 (시퀀스 종료)
      if (!stream.hasRemaining(4)) {
        throw new DicomIOException(
          '스트림 끝 도달: Sequence Delimiter 길이 필드를 읽을 수 없음',
          { offset: stream.offset }
        );
      }
      stream.readUint32(); // delimiter length (항상 0)
      return stream.offset; // 시퀀스 종료 이후 오프셋 반환
    }

    // FFFE 그룹의 다른 태그들 (Item, Item Delimitation)
    if (group === DELIMITATION_GROUP) {
      if (!stream.hasRemaining(4)) {
        throw new DicomIOException(
          '스트림 끝 도달: Item 태그 길이 필드를 읽을 수 없음',
          { offset: stream.offset, element }
        );
      }
      const itemLen = stream.readUint32();

      if (element === ITEM_DELIMITATION_ELEMENT) {
        // Item Delimitation (FFFE,E00D): 길이는 항상 0, 추가 처리 불필요
        continue;
      }

      // Item (FFFE,E000) 또는 기타 FFFE 태그
      if (itemLen === UNDEFINED_LENGTH) {
        // undefined length: 재귀적으로 하위 레벨 탐색
        skipUndefinedLengthSequence(stream, stream.offset, depth + 1);
      } else if (itemLen > 0) {
        // 정의된 길이: 안전 확인 후 offset += Length 이동
        if (stream.hasRemaining(itemLen)) {
          stream.advance(itemLen);
        } else {
          throw new DicomIOException(
            '스트림 끝 도달: Item 데이터를 읽을 수 없음',
            { offset: stream.offset, element, itemLen }
          );
        }
      }
      continue;
    }

    // 3. 일반 태그 처리: VR + Length 읽고 건너뛰기
    if (stream.isExplicitVR) {
      // Explicit VR 모드
      if (!stream.hasRemaining(2)) {
        throw new DicomIOException(
          '스트림 끝 도달: VR 필드를 읽을 수 없음',
          { offset: stream.offset, tag: [group, element] }
        );
      }
      const vrStr = stream.readString(2);

      // VR 문자열 유효성 검사
      if (!/^[A-Z]{2}$/.test(vrStr)) {
        throw new DicomIllegalArgumentException(
          '잘못된 VR 형식: "' + vrStr + '"',
          { vr: vrStr, offset: tagOffset }
        );
      }

      if (EXTENDED_LENGTH_VR.has(vrStr)) {
        // 확장 VR: 2바이트 예약 + 4바이트 길이
        stream.advance(2);
        if (!stream.hasRemaining(4)) {
          throw new DicomIOException(
            '스트림 끝 도달: 확장 VR 길이 필드를 읽을 수 없음',
            { offset: stream.offset, vr: vrStr }
          );
        }
        const len = stream.readUint32();
        if (len === UNDEFINED_LENGTH) {
          // 확장 VR에서 undefined length: 재귀적으로 하위 시퀀스 건너뛰기
          // OB/OW/UN 등도 중첩 시퀀스를 포함할 수 있으므로 VR에 무관하게 처리
          skipUndefinedLengthSequence(stream, stream.offset, depth + 1);
        } else if (len > 0) {
          if (stream.hasRemaining(len)) {
            stream.advance(len);
          } else {
            throw new DicomIOException(
              '스트림 끝 도달: 확장 VR 데이터를 읽을 수 없음',
              { offset: stream.offset, vr: vrStr, dataLength: len }
            );
          }
        }
      } else {
        // 일반 VR: 2바이트 길이
        if (!stream.hasRemaining(2)) {
          throw new DicomIOException(
            '스트림 끝 도달: 일반 VR 길이 필드를 읽을 수 없음',
            { offset: stream.offset, vr: vrStr }
          );
        }
        const len = stream.readUint16();
        if (len > 0) {
          if (stream.hasRemaining(len)) {
            stream.advance(len);
          } else {
            throw new DicomIOException(
              '스트림 끝 도달: 일반 VR 데이터를 읽을 수 없음',
              { offset: stream.offset, vr: vrStr, dataLength: len }
            );
          }
        }
      }
    } else {
      // Implicit VR 모드: 4바이트 길이
      if (!stream.hasRemaining(4)) {
        throw new DicomIOException(
          '스트림 끝 도달: Implicit VR 길이 필드를 읽을 수 없음',
          { offset: stream.offset, tag: [group, element] }
        );
      }
      const len = stream.readUint32();
      if (len === UNDEFINED_LENGTH) {
        // Implicit VR에서 undefined length: 항상 재귀적으로 건너뛰기
        // SQ 여부와 무관하게 undefined length는 중첩 시퀀스로 처리
        skipUndefinedLengthSequence(stream, stream.offset, depth + 1);
      } else if (len > 0) {
        if (stream.hasRemaining(len)) {
          stream.advance(len);
        } else {
          throw new DicomIOException(
            '스트림 끝 도달: Implicit VR 데이터를 읽을 수 없음',
            { offset: stream.offset, tag: [group, element], dataLength: len }
          );
        }
      }
    }
  }

  // 스트림 끝에 도달했지만 Sequence Delimiter를 만나지 못함
  throw new DicomIOException(
    '스트림 끝 도달: 불완전한 시퀀스 (Sequence Delimiter 없음)',
    { startOffset, depth }
  );
}

// ============================================================
// skipSequence() - 깊이 관리 (SDS-3.5 / SDS-3.7)
// ============================================================

/**
 * 시퀀스 중첩 깊이를 관리한다.
 * MAX_SKIP_DEPTH(16) 초과 시 현재 깊이 유지 (FR-2.5, HAZ-5.2).
 * SDS-3.7 제약사항: 재귀 깊이 제한 최대 16단계
 *
 * @param {Object} ctx - ParseContext
 * @param {number} depth - 현재 중첩 깊이
 * @returns {number} 새로운 중첩 깊이
 */
export function skipSequence(ctx, depth) {
  if (depth >= MAX_SKIP_DEPTH) {
    return depth;
  }
  return depth + 1;
}

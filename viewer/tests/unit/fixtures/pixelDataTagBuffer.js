/**
 * @file 픽셀 데이터 태그 탐색 테스트용 DICOM 버퍼 픽스처
 * @description findPixelDataTag() 단위 테스트에 필요한 다양한 DICOM 버퍼를 생성하는 헬퍼 모음
 * @trace T002, EC-001 ~ EC-007
 * @safety IEC 62304 Class A - 비진단 경로 폴백 테스트 지원
 */

import { writeString } from './validBuffer.js';

/**
 * DICOM 프리앰블 길이 (128바이트) + 매직바이트 'DICM' (4바이트)
 * @constant {number}
 */
const DICOM_PREAMBLE_SIZE = 132;

/**
 * 픽셀 데이터 태그 group 식별자
 * @constant {number}
 */
const PIXEL_DATA_GROUP = 0x7FE0;

/**
 * 픽셀 데이터 태그 element 식별자
 * @constant {number}
 */
const PIXEL_DATA_ELEMENT = 0x0010;

/**
 * 프리앰블(128바이트 0x00) + 매직바이트('DICM')를 버퍼에 기록한다.
 * @param {DataView} view - 기록할 DataView
 * @returns {number} 매직바이트 직후 오프셋 (항상 132)
 */
function writePreamble(view) {
  // 프리앰블: 128바이트 0x00 (이미 ArrayBuffer 초기화 시 0으로 설정됨)
  // 매직바이트: offset 128부터 'DICM' 기록
  writeString(view, 128, 'DICM');
  return DICOM_PREAMBLE_SIZE;
}

/**
 * 지정한 오프셋에 픽셀 데이터 태그(7FE0,0010)를 Little Endian으로 기록한다.
 * @param {DataView} view - 기록할 DataView
 * @param {number} offset - 태그 기록 시작 오프셋
 * @returns {number} 태그 기록 직후 오프셋 (offset + 4)
 */
function writePixelDataTag(view, offset) {
  view.setUint16(offset, PIXEL_DATA_GROUP, true);       // group: 0x7FE0 (LE)
  view.setUint16(offset + 2, PIXEL_DATA_ELEMENT, true); // element: 0x0010 (LE)
  return offset + 4;
}

/**
 * 지정한 오프셋에 픽셀 데이터 태그(7FE0,0010)를 Big Endian으로 기록한다.
 * @param {DataView} view - 기록할 DataView
 * @param {number} offset - 태그 기록 시작 오프셋
 * @returns {number} 태그 기록 직후 오프셋 (offset + 4)
 */
function writePixelDataTagBE(view, offset) {
  view.setUint16(offset, PIXEL_DATA_GROUP, false);       // group: 0x7FE0 (BE)
  view.setUint16(offset + 2, PIXEL_DATA_ELEMENT, false); // element: 0x0010 (BE)
  return offset + 4;
}

/**
 * 지정한 오프셋에 픽셀 데이터 태그(7FE0,0010)를 배치한 DICOM 버퍼를 생성한다.
 * 프리앰블(128바이트) + 매직바이트(4바이트 'DICM')가 포함된다.
 * 태그는 Little Endian으로 기록: group(0x7FE0) + element(0x0010).
 *
 * @param {Object} [options={}] - 버퍼 생성 옵션
 * @param {number} [options.tagOffset=132] - 픽셀 데이터 태그를 배치할 오프셋
 * @param {number} [options.bufferLength=1024] - 전체 버퍼 크기(바이트)
 * @param {boolean} [options.includeTag=true] - 픽셀 데이터 태그 포함 여부
 * @returns {{ buffer: ArrayBuffer, view: DataView, bufferLength: number }}
 * @trace UT-001, UT-002, UT-004
 */
export function createPixelDataTagBuffer(options = {}) {
  const tagOffset = options.tagOffset !== undefined ? options.tagOffset : DICOM_PREAMBLE_SIZE;
  const bufferLength = options.bufferLength || 1024;
  const includeTag = options.includeTag !== undefined ? options.includeTag : true;

  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);

  // 프리앰블 + 매직바이트 기록
  writePreamble(view);

  // 픽셀 데이터 태그 기록 (includeTag가 true인 경우)
  if (includeTag) {
    writePixelDataTag(view, tagOffset);
  }

  return { buffer, view, bufferLength };
}

/**
 * 픽셀 데이터 태그가 포함되지 않은 DICOM 버퍼를 생성한다.
 * 프리앰블 + 매직바이트 + 나머지는 0xAA로 채워
 * 우연히 0x7FE0 패턴이 나타나지 않도록 한다.
 *
 * @param {number} [length=1024] - 전체 버퍼 크기(바이트)
 * @returns {{ buffer: ArrayBuffer, view: DataView, bufferLength: number }}
 * @trace UT-003, UT-008
 */
export function createNoTagBuffer(length = 1024) {
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);

  // 프리앰블 + 매직바이트 기록
  writePreamble(view);

  // 나머지 영역을 0xAA로 채워 0x7FE0 패턴 방지
  // 0xAA = 10101010b, 연속 배치 시 0xAAAA 패턴만 생성되어 0x7FE0 불가
  for (let i = DICOM_PREAMBLE_SIZE; i < length; i++) {
    view.setUint8(i, 0xAA);
  }

  return { buffer, view, bufferLength: length };
}

/**
 * DataView 읽기 시 예외를 유발하는 손상 버퍼를 생성한다.
 * 짧은 ArrayBuffer(132바이트)를 생성하면서 bufferLength는 크게 설정하여
 * DataView.getUint16() 호출 시 RangeError를 유도한다.
 *
 * @returns {{ buffer: ArrayBuffer, view: DataView, bufferLength: number }}
 * @trace UT-007
 */
export function createCorruptBuffer() {
  // 실제 ArrayBuffer는 132바이트만 생성
  const actualSize = DICOM_PREAMBLE_SIZE;
  const buffer = new ArrayBuffer(actualSize);
  const view = new DataView(buffer);

  // 프리앰블 + 매직바이트만 기록
  writePreamble(view);

  // bufferLength는 실제 크기보다 크게 설정하여
  // findPixelDataTag()가 루프에 진입하도록 유도
  // getUint16() 호출 시 RangeError 발생
  const fakeBufferLength = 1024;

  return { buffer, view, bufferLength: fakeBufferLength };
}

/**
 * Big Endian으로 픽셀 데이터 태그가 저장된 DICOM 버퍼를 생성한다.
 * 프리앰블 + 매직바이트 + offset 132에 BE로 (7FE0,0010) 기록.
 * LE 전용 탐색에서는 이 태그가 매칭되지 않아야 한다.
 *
 * @param {Object} [options={}] - 버퍼 생성 옵션
 * @param {number} [options.tagOffset=132] - 태그 기록 오프셋
 * @param {number} [options.bufferLength=1024] - 전체 버퍼 크기
 * @returns {{ buffer: ArrayBuffer, view: DataView, bufferLength: number }}
 * @trace UT-009, UT-017
 */
export function createBigEndianTagBuffer(options = {}) {
  const tagOffset = options.tagOffset !== undefined ? options.tagOffset : DICOM_PREAMBLE_SIZE;
  const bufferLength = options.bufferLength || 1024;

  const buffer = new ArrayBuffer(bufferLength);
  const view = new DataView(buffer);

  // 프리앰블 + 매직바이트 기록
  writePreamble(view);

  // Big Endian으로 픽셀 데이터 태그 기록
  writePixelDataTagBE(view, tagOffset);

  return { buffer, view, bufferLength };
}

/**
 * 버퍼 끝에 태그를 배치한 경계 조건 버퍼를 생성한다.
 * 태그가 bufferLength - 4 위치에 정확히 배치되어
 * 루프 상한 조건(offset + 4 <= bufferLength)의 경계값을 테스트한다.
 *
 * @param {number} tagOffset - 태그를 배치할 오프셋 (bufferLength - 4 권장)
 * @param {number} totalLength - 전체 버퍼 크기(바이트)
 * @returns {{ buffer: ArrayBuffer, view: DataView, bufferLength: number }}
 * @trace UT-006, EC-003
 */
export function createBoundaryBuffer(tagOffset, totalLength) {
  const buffer = new ArrayBuffer(totalLength);
  const view = new DataView(buffer);

  // 프리앰블 + 매직바이트 기록
  writePreamble(view);

  // 지정한 오프셋에 Little Endian으로 태그 기록
  writePixelDataTag(view, tagOffset);

  return { buffer, view, bufferLength: totalLength };
}
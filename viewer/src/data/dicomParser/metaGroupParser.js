/**
 * @file 파일 메타 정보 그룹(0002) 파서 (FR-1.2, DICOM PS3.10)
 * @module data/dicomParser/metaGroupParser
 * @description DICOM 파일 메타 정보 그룹을 파싱하여 전송 구문 UID 등 추출
 * US-2, US-3: 메타 그룹은 항상 Explicit VR Little Endian
 */

import { PREAMBLE_LENGTH, FILE_META_GROUP } from './constants.js';
import { TRANSFER_SYNTAX } from '../dicomDictionary.js';
import { createParseContext } from './ParseContext.js';
import { readTag } from './tagReader.js';

/**
 * DICOM 파일 메타 정보 그룹(0002)을 파싱한다.
 * 프리앰블 + 매직 바이트(132바이트) 이후부터 Group 0002 태그를 순차적으로 읽는다.
 * 메타 그룹은 항상 Explicit VR Little Endian으로 인코딩됨 (DICOM PS3.10).
 *
 * @param {ArrayBuffer} buffer - 파일 전체 ArrayBuffer
 * @returns {{ transferSyntaxUID: string, metaEndOffset: number, tags: Object }}
 */
export function parseMetaGroup(buffer) {
  // 메타 그룹은 항상 Explicit VR Little Endian
  const ctx = createParseContext(buffer, TRANSFER_SYNTAX.EXPLICIT_VR_LE, PREAMBLE_LENGTH + 4);

  // File Meta Information Group Length (0002,0000) 읽기 시도
  let metaGroupLength = 0;
  let hasGroupLength = false;

  if (ctx.hasRemaining(8)) {
    const firstTag = readTag(ctx);
    if (firstTag && firstTag.tag[0] === FILE_META_GROUP && firstTag.tag[1] === 0x0000) {
      metaGroupLength = firstTag.value;
      hasGroupLength = true;
    } else {
      // Group Length 태그가 없으면 오프셋을 리셋
      ctx.offset = PREAMBLE_LENGTH + 4;
    }
  }

  const metaEndOffset = hasGroupLength
    ? ctx.offset + metaGroupLength
    : buffer.byteLength;

  const tags = {};
  let tagCount = 0;

  while (ctx.offset < metaEndOffset && ctx.hasRemaining(8) && tagCount < 1000) {
    const result = readTag(ctx);
    if (!result) break;
    tagCount++;

    const [group, element] = result.tag;

    // Group 0002를 벗어나면 종료
    if (group !== FILE_META_GROUP) break;

    // 전송 구문 UID (0002,0010) 추출
    if (group === FILE_META_GROUP && element === 0x0010 && result.value) {
      tags.transferSyntaxUID = String(result.value);
    }
    // 미디어 저장 SOP 클래스 UID (0002,0002)
    if (group === FILE_META_GROUP && element === 0x0002 && result.value) {
      tags.mediaStorageSOPClassUID = String(result.value);
    }
    // 미디어 저장 SOP 인스턴스 UID (0002,0003)
    if (group === FILE_META_GROUP && element === 0x0003 && result.value) {
      tags.mediaStorageSOPInstanceUID = String(result.value);
    }
  }

  return {
    transferSyntaxUID: tags.transferSyntaxUID || TRANSFER_SYNTAX.EXPLICIT_VR_LE,
    metaEndOffset: ctx.offset,
    tags,
  };
}

/**
 * 버퍼에서 전송 구문 UID를 결정한다.
 * @param {ArrayBuffer} buffer - 파일 전체 ArrayBuffer
 * @returns {string} 전송 구문 UID
 */
export function determineTransferSyntax(buffer) {
  const meta = parseMetaGroup(buffer);
  return meta.transferSyntaxUID;
}

/**
 * 버퍼에서 전송 구문 UID를 결정하고 전체 메타 그룹 결과를 반환한다.
 * 중복 파싱 방지를 위해 parseMetadata에 결과를 그대로 전달 가능.
 * @param {ArrayBuffer} buffer - 파일 전체 ArrayBuffer
 * @returns {{ transferSyntaxUID: string, metaEndOffset: number, tags: Object }}
 */
export function determineTransferSyntaxFull(buffer) {
  return parseMetaGroup(buffer);
}

/**
 * @file metaGroupParser 단위 테스트
 * @description DICOM 파일 메타 정보 그룹(0002) 파서 기능 검증
 */

import { describe, it, expect } from 'vitest';
import {
  parseMetaGroup,
  determineTransferSyntax,
  determineTransferSyntaxFull,
} from '../../../../src/data/dicomParser/metaGroupParser.js';
import {
  createMinimalDICOMBuffer,
  createInvalidDICOMBuffer,
  writeTagExplicitLE,
  writePreambleAndMagic,
} from '../../../helpers/dicomFixtureBuilder.js';

const EXPLICIT_VR_LE = '1.2.840.10008.1.2.1';
const IMPLICIT_VR_LE = '1.2.840.10008.1.2';
const DEFAULT_SOP_CLASS_UID = '1.2.840.10008.5.1.4.1.1.2';
const DEFAULT_SOP_INSTANCE_UID = '1.2.3.4.5.6.7.8';

describe('metaGroupParser', () => {
  // ---------------------------------------------------------------
  // 1. parseMetaGroup - 전송 구문 UID 추출
  // ---------------------------------------------------------------
  describe('parseMetaGroup - transferSyntaxUID', () => {
    it('Explicit VR LE 전송 구문 UID를 올바르게 추출한다', () => {
      const buffer = createMinimalDICOMBuffer({
        transferSyntaxUID: EXPLICIT_VR_LE,
      });
      const result = parseMetaGroup(buffer);
      expect(result.transferSyntaxUID).toBe(EXPLICIT_VR_LE);
    });

    it('Implicit VR LE 전송 구문 UID를 올바르게 추출한다', () => {
      const buffer = createMinimalDICOMBuffer({
        transferSyntaxUID: IMPLICIT_VR_LE,
      });
      const result = parseMetaGroup(buffer);
      expect(result.transferSyntaxUID).toBe(IMPLICIT_VR_LE);
    });
  });

  // ---------------------------------------------------------------
  // 2. parseMetaGroup - mediaStorageSOPClassUID / InstanceUID 추출
  // ---------------------------------------------------------------
  describe('parseMetaGroup - mediaStorageSOP UIDs', () => {
    it('mediaStorageSOPClassUID를 추출한다', () => {
      const buffer = createMinimalDICOMBuffer();
      const result = parseMetaGroup(buffer);
      expect(result.tags.mediaStorageSOPClassUID).toBe(DEFAULT_SOP_CLASS_UID);
    });

    it('mediaStorageSOPInstanceUID를 추출한다', () => {
      const buffer = createMinimalDICOMBuffer();
      const result = parseMetaGroup(buffer);
      expect(result.tags.mediaStorageSOPInstanceUID).toBe(DEFAULT_SOP_INSTANCE_UID);
    });
  });

  // ---------------------------------------------------------------
  // 3. parseMetaGroup - 기본 전송 구문 (0002,0010 누락 시)
  // ---------------------------------------------------------------
  describe('parseMetaGroup - default transfer syntax', () => {
    it('(0002,0010) 태그가 없으면 Explicit VR LE를 기본값으로 반환한다', () => {
      // 전송 구문 태그 없이 커스텀 버퍼 생성
      const bytes = new Uint8Array(512);
      const view = new DataView(bytes.buffer);
      let offset = writePreambleAndMagic(bytes);

      // Group Length 없이 Media Storage SOP Class UID만 작성
      offset = writeTagExplicitLE(view, offset, 0x0002, 0x0002, 'UI', DEFAULT_SOP_CLASS_UID);

      const buffer = bytes.buffer.slice(0, offset);
      const result = parseMetaGroup(buffer);

      expect(result.transferSyntaxUID).toBe(EXPLICIT_VR_LE);
    });

    it('태그 결과 객체에 transferSyntaxUID가 포함되지 않는다', () => {
      const bytes = new Uint8Array(512);
      const view = new DataView(bytes.buffer);
      let offset = writePreambleAndMagic(bytes);

      offset = writeTagExplicitLE(view, offset, 0x0002, 0x0002, 'UI', DEFAULT_SOP_CLASS_UID);

      const buffer = bytes.buffer.slice(0, offset);
      const result = parseMetaGroup(buffer);

      expect(result.tags.transferSyntaxUID).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------
  // 4. determineTransferSyntax - UID 문자열 반환
  // ---------------------------------------------------------------
  describe('determineTransferSyntax', () => {
    it('올바른 전송 구문 UID 문자열을 반환한다', () => {
      const buffer = createMinimalDICOMBuffer({
        transferSyntaxUID: EXPLICIT_VR_LE,
      });
      const uid = determineTransferSyntax(buffer);
      expect(uid).toBe(EXPLICIT_VR_LE);
      expect(typeof uid).toBe('string');
    });

    it('Implicit VR LE 전송 구문 UID 문자열을 반환한다', () => {
      const buffer = createMinimalDICOMBuffer({
        transferSyntaxUID: IMPLICIT_VR_LE,
      });
      const uid = determineTransferSyntax(buffer);
      expect(uid).toBe(IMPLICIT_VR_LE);
    });

    it('전송 구문 태그가 없으면 기본 UID를 반환한다', () => {
      const bytes = new Uint8Array(512);
      const view = new DataView(bytes.buffer);
      let offset = writePreambleAndMagic(bytes);

      // (0002,0002)만 작성 - (0002,0010) 없음
      offset = writeTagExplicitLE(view, offset, 0x0002, 0x0002, 'UI', DEFAULT_SOP_CLASS_UID);

      const buffer = bytes.buffer.slice(0, offset);
      const uid = determineTransferSyntax(buffer);
      expect(uid).toBe(EXPLICIT_VR_LE);
    });
  });

  // ---------------------------------------------------------------
  // 5. determineTransferSyntaxFull - 전체 결과 객체
  // ---------------------------------------------------------------
  describe('determineTransferSyntaxFull', () => {
    it('transferSyntaxUID, metaEndOffset, tags를 포함한 결과를 반환한다', () => {
      const buffer = createMinimalDICOMBuffer();
      const result = determineTransferSyntaxFull(buffer);

      expect(result).toHaveProperty('transferSyntaxUID');
      expect(result).toHaveProperty('metaEndOffset');
      expect(result).toHaveProperty('tags');
      expect(typeof result.transferSyntaxUID).toBe('string');
      expect(typeof result.metaEndOffset).toBe('number');
      expect(typeof result.tags).toBe('object');
    });

    it('metaEndOffset은 프리앰블 이후 메타 그룹 끝 지점을 가리킨다', () => {
      const buffer = createMinimalDICOMBuffer();
      const result = determineTransferSyntaxFull(buffer);

      // 프리앰블(128) + 매직(4) = 132 이후여야 함
      expect(result.metaEndOffset).toBeGreaterThan(132);
    });

    it('tags 객체에 추출된 메타 태그들이 포함된다', () => {
      const buffer = createMinimalDICOMBuffer();
      const result = determineTransferSyntaxFull(buffer);

      expect(result.tags.transferSyntaxUID).toBe(EXPLICIT_VR_LE);
      expect(result.tags.mediaStorageSOPClassUID).toBe(DEFAULT_SOP_CLASS_UID);
      expect(result.tags.mediaStorageSOPInstanceUID).toBe(DEFAULT_SOP_INSTANCE_UID);
    });
  });

  // ---------------------------------------------------------------
  // 6. parseMetaGroup - Group Length (0002,0000) 누락 처리
  // ---------------------------------------------------------------
  describe('parseMetaGroup - without group length tag', () => {
    it('(0002,0000) 태그가 없어도 메타 그룹을 파싱한다', () => {
      const bytes = new Uint8Array(512);
      const view = new DataView(bytes.buffer);
      let offset = writePreambleAndMagic(bytes);

      // Group Length 태그 없이 바로 Transfer Syntax UID 작성
      offset = writeTagExplicitLE(view, offset, 0x0002, 0x0010, 'UI', IMPLICIT_VR_LE);
      offset = writeTagExplicitLE(view, offset, 0x0002, 0x0002, 'UI', DEFAULT_SOP_CLASS_UID);
      offset = writeTagExplicitLE(view, offset, 0x0002, 0x0003, 'UI', DEFAULT_SOP_INSTANCE_UID);

      const buffer = bytes.buffer.slice(0, offset);
      const result = parseMetaGroup(buffer);

      expect(result.transferSyntaxUID).toBe(IMPLICIT_VR_LE);
      expect(result.tags.mediaStorageSOPClassUID).toBe(DEFAULT_SOP_CLASS_UID);
      expect(result.tags.mediaStorageSOPInstanceUID).toBe(DEFAULT_SOP_INSTANCE_UID);
    });

    it('(0002,0000) 누락 시 metaEndOffset은 버퍼 끝까지 진행한 오프셋이다', () => {
      const bytes = new Uint8Array(512);
      const view = new DataView(bytes.buffer);
      let offset = writePreambleAndMagic(bytes);

      offset = writeTagExplicitLE(view, offset, 0x0002, 0x0010, 'UI', EXPLICIT_VR_LE);
      offset = writeTagExplicitLE(view, offset, 0x0002, 0x0002, 'UI', DEFAULT_SOP_CLASS_UID);

      const buffer = bytes.buffer.slice(0, offset);
      const result = parseMetaGroup(buffer);

      // Group Length가 없으므로 버퍼 끝까지 읽음 (Group 0002만 있으므로 전부 소비)
      expect(result.metaEndOffset).toBe(offset);
    });
  });
});

/**
 * @file DICOM 파싱 메인 파이프라인
 * @module data/dicomParser/parseDICOM
 * @description DICOM 파일 파싱의 메인 진입점 함수
 * 추적: FR-1.1~FR-1.5, US-1~US-5, HAZ-1.1, HAZ-5.2
 */

import { validateMagicByte } from './validateMagicByte.js';
import { validateTransferSyntax } from './validateTransferSyntax.js';
import { parseMetadata } from './metadataParser.js';
import { parsePixelData } from './pixelDataParser.js';
import { handleParseError } from './handleParseError.js';
import { determineTransferSyntaxFull } from './metaGroupParser.js';
import { ERROR_CODES, MAX_FILE_SIZE } from './constants.js';
import { ParseError } from '../../errors/CBVError.js';
import { createParseResult } from '../../types/ParseResult.js';

/**
 * DICOM 파일 파싱의 메인 진입점 함수.
 * 파일 로드부터 메타데이터/복셀 데이터 추출까지 전체 파이프라인을 실행한다.
 * @param {File} file - 브라우저 File API의 File 객체
 * @returns {Promise<import('../../types/ParseResult.js').ParseResult>} 파싱 결과
 */
export async function parseDICOM(file) {
  const allErrors = [];

  try {
    // 1. 파일 크기 사전 검증 (512MB 초과 시 메모리 로딩 전 차단)
    if (file && file.size > MAX_FILE_SIZE) {
      const err = new ParseError(
        '파일 크기 초과',
        ERROR_CODES.PARSE_ERR_FILE_TOO_LARGE
      );
      return createParseResult({
        errors: [handleParseError(err)],
        isValid: false,
      });
    }

    // 2. 파일 읽기
    const buffer = await readFileAsArrayBuffer(file);

    // 2. 매직 바이트 검증 (FR-1.1, FR-1.2)
    if (!validateMagicByte(buffer)) {
      const err = new ParseError(
        '매직 바이트 불일치',
        ERROR_CODES.PARSE_ERR_INVALID_MAGIC
      );
      return createParseResult({
        errors: [handleParseError(err)],
        isValid: false,
      });
    }

    // 3. 메타 그룹에서 전송 구문 확인 (FR-1.2)
    let transferSyntaxUID;
    let metaGroupResult;
    try {
      metaGroupResult = determineTransferSyntaxFull(buffer);
      transferSyntaxUID = metaGroupResult.transferSyntaxUID;
    } catch (_e) {
      transferSyntaxUID = '';
      metaGroupResult = null;
    }

    // 4. 전송 구문 검증 (FR-1.2)
    if (!validateTransferSyntax(transferSyntaxUID)) {
      const err = new ParseError(
        '미지원 전송 구문',
        ERROR_CODES.PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX
      );
      return createParseResult({
        errors: [handleParseError(err)],
        isValid: false,
      });
    }

    // 5. 메타데이터 파싱 (FR-1.3) - 메타 그룹 결과 전달하여 중복 파싱 방지
    let parseResult;
    try {
      parseResult = parseMetadata(buffer, metaGroupResult);
    } catch (e) {
      const err = e instanceof ParseError
        ? e
        : new ParseError(e.message, ERROR_CODES.PARSE_ERR_MISSING_REQUIRED_TAG);
      return createParseResult({
        errors: [handleParseError(err)],
        isValid: false,
      });
    }

    const { metadata, errors: metaErrors } = parseResult;
    if (metaErrors) {
      for (const me of metaErrors) {
        allErrors.push({
          userMessage: me.message,
          debugInfo: me.code + ': ' + me.message,
          errorCode: me.code,
          severity: me.severity,
        });
      }
    }

    // 필수 에러가 있으면 실패
    const hasFatalError = allErrors.some(e => e.severity === 'error');
    if (hasFatalError) {
      return createParseResult({
        metadata,
        errors: allErrors,
        isValid: false,
      });
    }

    // 6. 복셀 데이터 추출 (FR-1.4)
    let voxelData;
    try {
      const pixelResult = parsePixelData(
        buffer, metadata,
        parseResult._pixelDataOffset, parseResult._pixelDataLength
      );
      voxelData = pixelResult.voxelData;
      if (pixelResult.warnings) {
        for (const w of pixelResult.warnings) {
          allErrors.push({
            userMessage: w.message,
            debugInfo: w.code + ': ' + w.message,
            errorCode: w.code,
            severity: 'warning',
          });
        }
      }
    } catch (e) {
      const err = e instanceof ParseError
        ? e
        : new ParseError(e.message, ERROR_CODES.PARSE_ERR_PIXEL_DATA_EXTRACTION);
      allErrors.push(handleParseError(err));
      return createParseResult({
        metadata,
        errors: allErrors,
        isValid: false,
      });
    }

    // 7. 결과 조립 (FR-1.5)
    return createParseResult({
      metadata,
      voxelData,
      errors: allErrors,
      isValid: true,
    });

  } catch (e) {
    const err = e instanceof ParseError
      ? e
      : new ParseError(e.message || String(e), ERROR_CODES.PARSE_ERR_UNEXPECTED);
    return createParseResult({
      errors: [handleParseError(err)],
      isValid: false,
    });
  }
}

/**
 * FileReader를 통해 파일을 ArrayBuffer로 읽는다.
 * @param {File} file - 브라우저 File 객체
 * @returns {Promise<ArrayBuffer>}
 */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new ParseError('파일이 null입니다', ERROR_CODES.PARSE_ERR_FILE_READ));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(
      new ParseError('파일 읽기 실패', ERROR_CODES.PARSE_ERR_FILE_READ)
    );
    reader.readAsArrayBuffer(file);
  });
}

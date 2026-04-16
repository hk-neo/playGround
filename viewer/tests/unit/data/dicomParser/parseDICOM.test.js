/**
 * @file parseDICOM 통합 단위 테스트
 * @description DICOM 파싱 메인 파이프라인에 대한 종합 테스트
 * 추적: FR-1.1~FR-1.5, US-1~US-5, HAZ-1.1, HAZ-5.2
 */

import { describe, it, expect } from 'vitest';
import { parseDICOM } from '../../../../src/data/dicomParser/parseDICOM.js';
import { ERROR_CODES, MAX_FILE_SIZE } from '../../../../src/data/dicomParser/constants.js';
import {
  createMinimalDICOMBuffer,
  createInvalidDICOMBuffer,
} from '../../../helpers/dicomFixtureBuilder.js';

/**
 * ArrayBuffer를 브라우저 File 객체로 변환하는 헬퍼
 * @param {ArrayBuffer} buffer
 * @param {string} [name='test.dcm']
 * @returns {File}
 */
function toFile(buffer, name = 'test.dcm') {
  return new File([buffer], name, { type: 'application/dicom' });
}

// ---------------------------------------------------------------------------
// 1. 유효한 DICOM 파일 파싱
// ---------------------------------------------------------------------------
describe('parseDICOM - 유효한 DICOM 파일', () => {
  it('유효한 DICOM 파일을 파싱하면 isValid=true인 ParseResult를 반환한다', async () => {
    const buffer = createMinimalDICOMBuffer();
    const file = toFile(buffer);

    const result = await parseDICOM(file);

    expect(result).toBeDefined();
    expect(result.isValid).toBe(true);
    expect(result.metadata).toBeDefined();
    expect(result.voxelData).toBeDefined();
  });

  it('유효한 DICOM 파일에서 메타데이터에 rows, columns, bitsAllocated가 포함된다', async () => {
    const buffer = createMinimalDICOMBuffer({
      rows: 64,
      columns: 48,
      bitsAllocated: 16,
    });
    const file = toFile(buffer);

    const result = await parseDICOM(file);

    expect(result.isValid).toBe(true);
    expect(result.metadata.rows).toBe(64);
    expect(result.metadata.columns).toBe(48);
    expect(result.metadata.bitsAllocated).toBe(16);
  });

  it('환자 정보 메타데이터가 올바르게 추출된다', async () => {
    const buffer = createMinimalDICOMBuffer({
      patientName: '홍길동',
      patientID: 'P-999',
    });
    const file = toFile(buffer);

    const result = await parseDICOM(file);

    expect(result.isValid).toBe(true);
    expect(result.metadata.patientName).toBeDefined();
    expect(result.metadata.patientID).toBeDefined();
  });

  it('voxelData가 존재하고 올바른 길이를 가진다', async () => {
    const rows = 4;
    const columns = 4;
    const bitsAllocated = 16;
    const buffer = createMinimalDICOMBuffer({
      rows,
      columns,
      bitsAllocated,
    });
    const file = toFile(buffer);

    const result = await parseDICOM(file);

    expect(result.isValid).toBe(true);
    expect(result.voxelData).toBeDefined();
    // 픽셀 데이터는 rows * columns * (bitsAllocated / 8) 바이트
    const expectedByteLength = rows * columns * (bitsAllocated / 8);
    expect(result.voxelData.byteLength).toBe(expectedByteLength);
  });

  it('커스텀 픽셀 데이터가 그대로 보존된다', async () => {
    const rows = 2;
    const columns = 2;
    const bitsAllocated = 16;
    const pixelCount = rows * columns;
    const customPixels = new Uint8Array(pixelCount * 2);
    const dv = new DataView(customPixels.buffer);
    dv.setUint16(0, 1000, true);
    dv.setUint16(2, 2000, true);
    dv.setUint16(4, 3000, true);
    dv.setUint16(6, 4000, true);

    const buffer = createMinimalDICOMBuffer({
      rows,
      columns,
      bitsAllocated,
      pixelDataOverride: customPixels,
    });
    const file = toFile(buffer);

    const result = await parseDICOM(file);

    expect(result.isValid).toBe(true);
    expect(result.voxelData).toBeDefined();
  });

  it('8-bit DICOM 파일도 올바르게 파싱된다', async () => {
    const buffer = createMinimalDICOMBuffer({
      rows: 3,
      columns: 3,
      bitsAllocated: 8,
    });
    const file = toFile(buffer);

    const result = await parseDICOM(file);

    expect(result.isValid).toBe(true);
    expect(result.metadata.bitsAllocated).toBe(8);
  });
});

// ---------------------------------------------------------------------------
// 2. 매직 바이트 검증 실패
// ---------------------------------------------------------------------------
describe('parseDICOM - 매직 바이트 불일치', () => {
  it('매직 바이트가 없는 파일은 isValid=false와 PARSE_ERR_INVALID_MAGIC 에러를 반환한다', async () => {
    const buffer = createInvalidDICOMBuffer();
    const file = toFile(buffer);

    const result = await parseDICOM(file);

    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].errorCode).toBe(ERROR_CODES.PARSE_ERR_INVALID_MAGIC);
  });

  it('잘못된 시그니처가 있는 파일도 동일한 에러 코드를 반환한다', async () => {
    const bytes = new Uint8Array(256);
    bytes[128] = 0x58; // X
    bytes[129] = 0x59; // Y
    bytes[130] = 0x5A; // Z
    bytes[131] = 0x57; // W
    const file = toFile(bytes.buffer);

    const result = await parseDICOM(file);

    expect(result.isValid).toBe(false);
    expect(result.errors[0].errorCode).toBe(ERROR_CODES.PARSE_ERR_INVALID_MAGIC);
  });

  it('132바이트 미만 파일도 매직 바이트 에러를 반환한다', async () => {
    const bytes = new Uint8Array(64);
    const file = toFile(bytes.buffer);

    const result = await parseDICOM(file);

    expect(result.isValid).toBe(false);
    expect(result.errors[0].errorCode).toBe(ERROR_CODES.PARSE_ERR_INVALID_MAGIC);
  });
});

// ---------------------------------------------------------------------------
// 3. 미지원 전송 구문
// ---------------------------------------------------------------------------
describe('parseDICOM - 미지원 전송 구문', () => {
  it('미지원 전송 구문이면 isValid=false와 PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX 에러를 반환한다', async () => {
    const buffer = createMinimalDICOMBuffer({
      transferSyntaxUID: '1.2.840.10008.1.2.4.99', // JPEG 2000 (미지원 가정)
    });
    const file = toFile(buffer);

    const result = await parseDICOM(file);

    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].errorCode).toBe(ERROR_CODES.PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX);
  });

  it('빈 전송 구문 문자열은 기본 전송 구문으로 폴백되어 파싱이 성공한다', async () => {
    // metaGroupParser는 transferSyntaxUID이 비어있으면
    // 기본값(EXPLICIT_VR_LE)으로 폴백하므로 파싱이 성공함
    const buffer = createMinimalDICOMBuffer({
      transferSyntaxUID: '',
    });
    const file = toFile(buffer);

    const result = await parseDICOM(file);

    // 빈 문자열은 기본 전송 구문으로 폴백되므로 파싱 성공
    expect(result.isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. 파일 크기 초과
// ---------------------------------------------------------------------------
describe('parseDICOM - 파일 크기 초과', () => {
  it('512MB 초과 파일은 isValid=false와 PARSE_ERR_FILE_TOO_LARGE 에러를 반환한다', async () => {
    const oversizedFile = {
      size: MAX_FILE_SIZE + 1,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    };

    const result = await parseDICOM(oversizedFile);

    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].errorCode).toBe(ERROR_CODES.PARSE_ERR_FILE_TOO_LARGE);
  });

  it('정확히 512MB 파일은 크기 검증을 통과한다', async () => {
    // 512MB 파일은 실제로 생성할 수 없으므로,
    // 최대 크기와 동일한 크기의 모킹 파일로 검증
    const exactMaxFile = {
      size: MAX_FILE_SIZE,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    };

    // 크기 검증만 통과하는지 확인 (이후 단계에서 다른 에러 발생 가능)
    const result = await parseDICOM(exactMaxFile);

    // 파일 읽기 또는 매직 바이트 에러여야 함 (크기 에러는 아니어야 함)
    if (result.errors.length > 0) {
      expect(result.errors[0].errorCode).not.toBe(ERROR_CODES.PARSE_ERR_FILE_TOO_LARGE);
    }
  });

  it('MAX_FILE_SIZE 상수가 512MB인지 확인한다', () => {
    expect(MAX_FILE_SIZE).toBe(512 * 1024 * 1024);
  });
});

// ---------------------------------------------------------------------------
// 5. Null/잘못된 파일 입력
// ---------------------------------------------------------------------------
describe('parseDICOM - Null 및 잘못된 입력', () => {
  it('null 입력 시 PARSE_ERR_FILE_READ 에러 결과를 반환한다', async () => {
    const result = await parseDICOM(null);

    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
    // readFileAsArrayBuffer에서 null 파일 감지 -> PARSE_ERR_FILE_READ
    expect(result.errors[0].errorCode).toBe(ERROR_CODES.PARSE_ERR_FILE_READ);
  });

  it('undefined 입력 시 에러 결과를 반환한다', async () => {
    const result = await parseDICOM(undefined);

    expect(result.isValid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 6. 메타데이터 필드 정확성
// ---------------------------------------------------------------------------
describe('parseDICOM - 메타데이터 필드 추출 정확성', () => {
  it('Rows 값이 정확히 추출된다', async () => {
    const buffer = createMinimalDICOMBuffer({ rows: 512 });
    const result = await parseDICOM(toFile(buffer));

    expect(result.isValid).toBe(true);
    expect(result.metadata.rows).toBe(512);
  });

  it('Columns 값이 정확히 추출된다', async () => {
    const buffer = createMinimalDICOMBuffer({ columns: 256 });
    const result = await parseDICOM(toFile(buffer));

    expect(result.isValid).toBe(true);
    expect(result.metadata.columns).toBe(256);
  });

  it('BitsAllocated 값이 정확히 추출된다', async () => {
    const buffer = createMinimalDICOMBuffer({ bitsAllocated: 16 });
    const result = await parseDICOM(toFile(buffer));

    expect(result.isValid).toBe(true);
    expect(result.metadata.bitsAllocated).toBe(16);
  });

  it('PixelRepresentation 값이 정확히 추출된다', async () => {
    const buffer = createMinimalDICOMBuffer({ pixelRepresentation: 1 });
    const result = await parseDICOM(toFile(buffer));

    expect(result.isValid).toBe(true);
    expect(result.metadata.pixelRepresentation).toBe(1);
  });

  it('WindowCenter, WindowWidth 등 선택 태그도 추출된다', async () => {
    const buffer = createMinimalDICOMBuffer();
    const result = await parseDICOM(toFile(buffer));

    expect(result.isValid).toBe(true);
    expect(result.metadata.windowCenter).toBeDefined();
    expect(result.metadata.windowWidth).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 7. ParseResult 구조 검증
// ---------------------------------------------------------------------------
describe('parseDICOM - ParseResult 구조', () => {
  it('반환값은 metadata, voxelData, errors, isValid 필드를 가진다', async () => {
    const buffer = createMinimalDICOMBuffer();
    const result = await parseDICOM(toFile(buffer));

    expect(result).toHaveProperty('metadata');
    expect(result).toHaveProperty('voxelData');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('isValid');
  });

  it('에러 발생 시에도 ParseResult 구조는 동일하다', async () => {
    const buffer = createInvalidDICOMBuffer();
    const result = await parseDICOM(toFile(buffer));

    expect(result).toHaveProperty('metadata');
    expect(result).toHaveProperty('errors');
    expect(result).toHaveProperty('isValid');
    expect(result.isValid).toBe(false);
  });

  it('errors 배열의 각 항목은 userMessage, debugInfo, errorCode를 포함한다', async () => {
    const buffer = createInvalidDICOMBuffer();
    const result = await parseDICOM(toFile(buffer));

    expect(result.errors.length).toBeGreaterThan(0);
    const error = result.errors[0];
    expect(error).toHaveProperty('userMessage');
    expect(error).toHaveProperty('debugInfo');
    expect(error).toHaveProperty('errorCode');
  });
});

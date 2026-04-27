/**
 * @file DICOM 파서 단위 테스트
 * @description 상수, 매직바이트 검증, 전송구문 검증, 파싱 결과 타입 테스트
 */

import { describe, it, expect } from "vitest";
import {
  PREAMBLE_LENGTH,
  DICOM_MAGIC_BYTE,
  DICOM_MIN_FILE_SIZE,
  MAX_FILE_SIZE,
  ERROR_CODES,
  METADATA_TAGS,
  MAGIC_TABLE,
  MAGIC_BYTE_ERRORS,
  GENERIC_MAGIC_MIN_SIZE,
} from "../src/data/dicomParser/constants.js";
import { validateMagicByte, validateGenericMagicByte } from "../src/data/dicomParser/validateMagicByte.js";
import { validateTransferSyntax } from "../src/data/dicomParser/validateTransferSyntax.js";
import { createParseResult } from "../src/types/ParseResult.js";
import { createDICOMMetadata } from "../src/types/DICOMMetadata.js";

// ============================================================
// 상수 테스트
// ============================================================

describe("DICOM 파서 상수", () => {
  it("PREAMBLE_LENGTH는 128이어야 한다", () => {
    expect(PREAMBLE_LENGTH).toBe(128);
  });

  it("DICOM_MAGIC_BYTE는 DICM이어야 한다", () => {
    expect(DICOM_MAGIC_BYTE).toBe("DICM");
  });

  it("DICOM_MIN_FILE_SIZE는 132이어야 한다", () => {
    expect(DICOM_MIN_FILE_SIZE).toBe(132);
  });

  it("MAX_FILE_SIZE는 512MB이어야 한다", () => {
    expect(MAX_FILE_SIZE).toBe(512 * 1024 * 1024);
  });

  it("ERROR_CODES에 필수 에러 코드가 포함되어야 한다", () => {
    expect(ERROR_CODES.PARSE_ERR_INVALID_MAGIC).toBe("PARSE_ERR_INVALID_MAGIC");
    expect(ERROR_CODES.PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX).toBe("PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX");
    expect(ERROR_CODES.PARSE_ERR_MISSING_REQUIRED_TAG).toBe("PARSE_ERR_MISSING_REQUIRED_TAG");
    expect(ERROR_CODES.PARSE_ERR_PIXEL_DATA_EXTRACTION).toBe("PARSE_ERR_PIXEL_DATA_EXTRACTION");
    expect(ERROR_CODES.PARSE_ERR_FILE_READ).toBe("PARSE_ERR_FILE_READ");
    expect(ERROR_CODES.PARSE_ERR_UNEXPECTED).toBe("PARSE_ERR_UNEXPECTED");
  });

  it("METADATA_TAGS에 필수 태그가 포함되어야 한다", () => {
    expect(METADATA_TAGS["00280010"]).toBeDefined(); // Rows
    expect(METADATA_TAGS["00280011"]).toBeDefined(); // Columns
    expect(METADATA_TAGS["00280100"]).toBeDefined(); // BitsAllocated
    expect(METADATA_TAGS["00280103"]).toBeDefined(); // PixelRepresentation
    expect(METADATA_TAGS["00280010"].required).toBe(true);
    expect(METADATA_TAGS["00280011"].required).toBe(true);
  });
});

// ============================================================
// 매직 바이트 검증 테스트
// ============================================================

describe("validateMagicByte", () => {
  it("올바른 매직 바이트(DICM)가 있으면 true를 반환해야 한다", () => {
    const buffer = new ArrayBuffer(132);
    const view = new Uint8Array(buffer);
    // offset 128에 "DICM" 기록
    view[128] = 68;  // D
    view[129] = 73;  // I
    view[130] = 67;  // C
    view[131] = 77;  // M
    expect(validateMagicByte(buffer)).toBe(true);
  });

  it("매직 바이트가 없으면 false를 반환해야 한다", () => {
    const buffer = new ArrayBuffer(132);
    const view = new Uint8Array(buffer);
    view.fill(0);
    expect(validateMagicByte(buffer)).toBe(false);
  });

  it("너무 짧은 버퍼면 false를 반환해야 한다", () => {
    const buffer = new ArrayBuffer(100);
    expect(validateMagicByte(buffer)).toBe(false);
  });

  it("빈 버퍼면 false를 반환해야 한다", () => {
    const buffer = new ArrayBuffer(0);
    expect(validateMagicByte(buffer)).toBe(false);
  });
});

// ============================================================
// 전송 구문 검증 테스트
// ============================================================

describe("validateTransferSyntax", () => {
  it("Explicit VR Little Endian을 지원해야 한다", () => {
    expect(validateTransferSyntax("1.2.840.10008.1.2.1")).toBe(true);
  });

  it("Implicit VR Little Endian을 지원해야 한다", () => {
    expect(validateTransferSyntax("1.2.840.10008.1.2")).toBe(true);
  });

  it("Explicit VR Big Endian을 지원해야 한다", () => {
    expect(validateTransferSyntax("1.2.840.10008.1.2.2")).toBe(true);
  });

  it("JPEG 압축 전송 구문은 미지원이어야 한다", () => {
    expect(validateTransferSyntax("1.2.840.10008.1.2.4.50")).toBe(false);
  });

  it("빈 문자열은 false를 반환해야 한다", () => {
    expect(validateTransferSyntax("")).toBe(false);
  });

  it("알 수 없는 UID는 false를 반환해야 한다", () => {
    expect(validateTransferSyntax("1.2.3.4.5")).toBe(false);
  });
});

// ============================================================
// ParseResult 팩토리 테스트
// ============================================================

describe("createParseResult", () => {
  it("기본값으로 빈 결과를 생성해야 한다", () => {
    const result = createParseResult();
    expect(result.metadata).toBeNull();
    expect(result.voxelData).toBeNull();
    expect(result.errors).toEqual([]);
    expect(result.isValid).toBe(false);
  });

  it("전달한 값으로 결과를 생성해야 한다", () => {
    const meta = createDICOMMetadata({ patientName: "테스트" });
    const voxel = new ArrayBuffer(10);
    const result = createParseResult({
      metadata: meta,
      voxelData: voxel,
      errors: [],
      isValid: true,
    });
    expect(result.metadata.patientName).toBe("테스트");
    expect(result.voxelData).toBe(voxel);
    expect(result.isValid).toBe(true);
  });

  it("에러를 포함한 결과를 생성할 수 있어야 한다", () => {
    const result = createParseResult({
      errors: [
        { userMessage: "테스트 에러", debugInfo: "DEBUG", errorCode: "TEST_001", severity: "error" },
      ],
      isValid: false,
    });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].severity).toBe("error");
  });
});

// ============================================================
// DICOMMetadata 팩토리 테스트
// ============================================================

describe("createDICOMMetadata", () => {
  it("기본값으로 메타데이터를 생성해야 한다", () => {
    const meta = createDICOMMetadata();
    expect(meta.patientName).toBe("");
    expect(meta.patientID).toBe("");
    expect(meta.rows).toBe(0);
    expect(meta.columns).toBe(0);
    expect(meta.bitsAllocated).toBe(16);
    expect(meta.pixelRepresentation).toBe(0);
    expect(meta.numberOfFrames).toBe(1);
  });

  it("전달한 값으로 메타데이터를 생성해야 한다", () => {
    const meta = createDICOMMetadata({
      patientName: "홍길동",
      rows: 512,
      columns: 512,
      numberOfFrames: 200,
      pixelSpacing: [0.3, 0.3],
    });
    expect(meta.patientName).toBe("홍길동");
    expect(meta.rows).toBe(512);
    expect(meta.columns).toBe(512);
    expect(meta.numberOfFrames).toBe(200);
    expect(meta.pixelSpacing).toEqual([0.3, 0.3]);
  });
});

// ============================================================
// 매직바이트 테이블 상수 테스트 (SDS-3.2)
// ============================================================

describe('MAGIC_TABLE 상수', () => {
  it('FW 바이너리 엔트리가 올바르게 정의되어야 한다', () => {
    const fw = MAGIC_TABLE.find(e => e.type === 'FW');
    expect(fw).toBeDefined();
    expect(fw.bytes).toEqual([0x50, 0x4C, 0x59, 0x47]);
    expect(fw.offset).toBe(0);
    expect(fw.label).toBe('FW 바이너리');
  });

  it('CFG 설정 파일 엔트리가 올바르게 정의되어야 한다', () => {
    const cfg = MAGIC_TABLE.find(e => e.type === 'CFG');
    expect(cfg).toBeDefined();
    expect(cfg.bytes).toEqual([0x43, 0x46, 0x47]);
    expect(cfg.offset).toBe(0);
    expect(cfg.label).toBe('설정 파일');
  });

  it('DLOG 데이터 로그 엔트리가 올바르게 정의되어야 한다', () => {
    const dlog = MAGIC_TABLE.find(e => e.type === 'DLOG');
    expect(dlog).toBeDefined();
    expect(dlog.bytes).toEqual([0x44, 0x4C, 0x47]);
    expect(dlog.offset).toBe(0);
    expect(dlog.label).toBe('데이터 로그');
  });

  it('MAGIC_TABLE에 3개 엔트리가 있어야 한다', () => {
    expect(MAGIC_TABLE).toHaveLength(3);
  });
});

describe('MAGIC_BYTE_ERRORS 상수', () => {
  it('필수 에러 코드가 모두 정의되어야 한다', () => {
    expect(MAGIC_BYTE_ERRORS.INVALID_MAGIC_BYTE).toBe('INVALID_MAGIC_BYTE');
    expect(MAGIC_BYTE_ERRORS.ERROR_FILE_READ_FAILED).toBe('ERROR_FILE_READ_FAILED');
    expect(MAGIC_BYTE_ERRORS.ERROR_FILE_TOO_SMALL).toBe('ERROR_FILE_TOO_SMALL');
  });
});

describe('GENERIC_MAGIC_MIN_SIZE 상수', () => {
  it('최소 파일 크기는 4이어야 한다', () => {
    expect(GENERIC_MAGIC_MIN_SIZE).toBe(4);
  });
});

// ============================================================
// validateGenericMagicByte 테스트 (SDS-3.2)
// ============================================================

describe('validateGenericMagicByte', () => {
  // --- 정상 케이스 ---

  it('FW 바이너리(PLAYG) 매직바이트 시 valid=true, fileType=FW 를 반환해야 한다', () => {
    const buffer = new ArrayBuffer(4);
    const view = new Uint8Array(buffer);
    view[0] = 0x50; // P
    view[1] = 0x4C; // L
    view[2] = 0x59; // Y
    view[3] = 0x47; // G
    const result = validateGenericMagicByte(buffer);
    expect(result.valid).toBe(true);
    expect(result.fileType).toBe('FW');
    expect(result.errorCode).toBeNull();
    expect(result.matchedEntry).not.toBeNull();
    expect(result.matchedEntry.type).toBe('FW');
  });

  it('CFG 설정 파일 매직바이트 시 valid=true, fileType=CFG 를 반환해야 한다', () => {
    const buffer = new ArrayBuffer(4);
    const view = new Uint8Array(buffer);
    view[0] = 0x43; // C
    view[1] = 0x46; // F
    view[2] = 0x47; // G
    view[3] = 0x00; // padding
    const result = validateGenericMagicByte(buffer);
    expect(result.valid).toBe(true);
    expect(result.fileType).toBe('CFG');
    expect(result.errorCode).toBeNull();
    expect(result.matchedEntry.type).toBe('CFG');
  });

  it('DLOG 데이터 로그 매직바이트 시 valid=true, fileType=DLOG 를 반환해야 한다', () => {
    const buffer = new ArrayBuffer(4);
    const view = new Uint8Array(buffer);
    view[0] = 0x44; // D
    view[1] = 0x4C; // L
    view[2] = 0x47; // G
    view[3] = 0x00; // padding
    const result = validateGenericMagicByte(buffer);
    expect(result.valid).toBe(true);
    expect(result.fileType).toBe('DLOG');
    expect(result.errorCode).toBeNull();
    expect(result.matchedEntry.type).toBe('DLOG');
  });

  // --- 비정상 케이스 ---

  it('잘못된 매직바이트 시 valid=false, errorCode=INVALID_MAGIC_BYTE 를 반환해야 한다', () => {
    const buffer = new ArrayBuffer(4);
    const view = new Uint8Array(buffer);
    view[0] = 0xFF;
    view[1] = 0xFF;
    view[2] = 0xFF;
    view[3] = 0xFF;
    const result = validateGenericMagicByte(buffer);
    expect(result.valid).toBe(false);
    expect(result.fileType).toBeNull();
    expect(result.errorCode).toBe('INVALID_MAGIC_BYTE');
    expect(result.matchedEntry).toBeNull();
  });

  it('null 입력 시 valid=false, errorCode=ERROR_FILE_READ_FAILED 를 반환해야 한다', () => {
    const result = validateGenericMagicByte(null);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('ERROR_FILE_READ_FAILED');
  });

  it('undefined 입력 시 valid=false, errorCode=ERROR_FILE_READ_FAILED 를 반환해야 한다', () => {
    const result = validateGenericMagicByte(undefined);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('ERROR_FILE_READ_FAILED');
  });

  // --- 경계값 테스트 ---

  it('빈 ArrayBuffer(0 Byte) 시 valid=false, errorCode=ERROR_FILE_TOO_SMALL 를 반환해야 한다', () => {
    const buffer = new ArrayBuffer(0);
    const result = validateGenericMagicByte(buffer);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('ERROR_FILE_TOO_SMALL');
  });

  it('3Byte 버퍼(최소 크기 미만) 시 valid=false, errorCode=ERROR_FILE_TOO_SMALL 를 반환해야 한다', () => {
    const buffer = new ArrayBuffer(3);
    const result = validateGenericMagicByte(buffer);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('ERROR_FILE_TOO_SMALL');
  });

  it('정확히 4Byte 버퍼에 FW 매직바이트 시 valid=true 를 반환해야 한다', () => {
    const buffer = new ArrayBuffer(4);
    const view = new Uint8Array(buffer);
    view[0] = 0x50;
    view[1] = 0x4C;
    view[2] = 0x59;
    view[3] = 0x47;
    const result = validateGenericMagicByte(buffer);
    expect(result.valid).toBe(true);
    expect(result.fileType).toBe('FW');
  });

  it('5Byte 버퍼에 CFG 매직바이트 시 valid=true 를 반환해야 한다', () => {
    const buffer = new ArrayBuffer(5);
    const view = new Uint8Array(buffer);
    view[0] = 0x43;
    view[1] = 0x46;
    view[2] = 0x47;
    view[3] = 0x00;
    view[4] = 0x00;
    const result = validateGenericMagicByte(buffer);
    expect(result.valid).toBe(true);
    expect(result.fileType).toBe('CFG');
  });

  it('1Byte 버퍼 시 valid=false, errorCode=ERROR_FILE_TOO_SMALL 를 반환해야 한다', () => {
    const buffer = new ArrayBuffer(1);
    const result = validateGenericMagicByte(buffer);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('ERROR_FILE_TOO_SMALL');
  });

  // --- 기존 DICOM 검증 영향 없음 확인 ---

  it('기존 validateMagicByte(DICOM)는 영향을 받지 않아야 한다', () => {
    const buffer = new ArrayBuffer(132);
    const view = new Uint8Array(buffer);
    view[128] = 68;  // D
    view[129] = 73;  // I
    view[130] = 67;  // C
    view[131] = 77;  // M
    expect(validateMagicByte(buffer)).toBe(true);
  });
});

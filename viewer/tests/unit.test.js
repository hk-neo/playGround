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
} from "../src/data/dicomParser/constants.js";
import { validateMagicByte } from "../src/data/dicomParser/validateMagicByte.js";
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
// validateTransferSyntax - SDS-3.3 TC-3.3.1 ~ TC-3.3.7, Edge Cases
// ============================================================

describe("validateTransferSyntax - TC-3.3 정상 전송 구문 검증", () => {
  // TC-3.3.1: Explicit VR Little Endian
  it("TC-3.3.1: Explicit VR Little Endian UID 입력 시 true 반환 및 ParseContext 설정", () => {
    const ctx = {};
    const result = validateTransferSyntax("1.2.840.10008.1.2.1", ctx);
    expect(result).toBe(true);
    expect(ctx.isExplicitVR).toBe(true);
    expect(ctx.isLittleEndian).toBe(true);
  });

  // TC-3.3.2: Explicit VR Big Endian
  it("TC-3.3.2: Explicit VR Big Endian UID 입력 시 true 반환 및 ParseContext 설정", () => {
    const ctx = {};
    const result = validateTransferSyntax("1.2.840.10008.1.2.2", ctx);
    expect(result).toBe(true);
    expect(ctx.isExplicitVR).toBe(true);
    expect(ctx.isLittleEndian).toBe(false);
  });

  // TC-3.3.3: Implicit VR Little Endian
  it("TC-3.3.3: Implicit VR Little Endian UID 입력 시 true 반환 및 ParseContext 설정", () => {
    const ctx = {};
    const result = validateTransferSyntax("1.2.840.10008.1.2", ctx);
    expect(result).toBe(true);
    expect(ctx.isExplicitVR).toBe(false);
    expect(ctx.isLittleEndian).toBe(true);
  });
});

describe("validateTransferSyntax - TC-3.3 미지원 전송 구문 거부", () => {
  // TC-3.3.4: 압축 전송 구문 (JPEG Lossless)
  it("TC-3.3.4: 압축 전송 구문(JPEG Lossless) 입력 시 false 반환 및 에러 기록", () => {
    const parseResult = { errors: [] };
    const result = validateTransferSyntax("1.2.840.10008.1.2.4.70", null, parseResult);
    expect(result).toBe(false);
    expect(parseResult.errors.length).toBeGreaterThanOrEqual(1);
    expect(parseResult.errors[0].errorCode).toBe("PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX");
  });

  // TC-3.3.7: 존재하지 않는 UID
  it("TC-3.3.7: 존재하지 않는 UID 입력 시 false 반환 및 에러 기록", () => {
    const parseResult = { errors: [] };
    const result = validateTransferSyntax("1.2.3.4.5", null, parseResult);
    expect(result).toBe(false);
    expect(parseResult.errors.length).toBeGreaterThanOrEqual(1);
    expect(parseResult.errors[0].errorCode).toBe("PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX");
  });
});

describe("validateTransferSyntax - TC-3.3 null/빈값 입력 방어", () => {
  // TC-3.3.5: null 입력
  it("TC-3.3.5: null 입력 시 false 반환 및 에러 기록", () => {
    const parseResult = { errors: [] };
    const result = validateTransferSyntax(null, null, parseResult);
    expect(result).toBe(false);
    expect(parseResult.errors.length).toBeGreaterThanOrEqual(1);
    expect(parseResult.errors[0].errorCode).toBe("PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX");
  });

  // TC-3.3.6: 빈 문자열 입력
  it("TC-3.3.6: 빈 문자열 입력 시 false 반환 및 에러 기록", () => {
    const parseResult = { errors: [] };
    const result = validateTransferSyntax("", null, parseResult);
    expect(result).toBe(false);
    expect(parseResult.errors.length).toBeGreaterThanOrEqual(1);
    expect(parseResult.errors[0].errorCode).toBe("PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX");
  });

  // Edge Case: undefined 입력
  it("EC-002: undefined 입력 시 false 반환 및 에러 기록", () => {
    const parseResult = { errors: [] };
    const result = validateTransferSyntax(undefined, null, parseResult);
    expect(result).toBe(false);
    expect(parseResult.errors.length).toBeGreaterThanOrEqual(1);
  });

  // Edge Case: 선행/후행 공백 포함 UID
  it("EC-001: 선행/후행 공백 포함 UID는 정확 일치 원칙에 의해 false 반환", () => {
    const result = validateTransferSyntax(" 1.2.840.10008.1.2.1 ");
    expect(result).toBe(false);
  });

  // Edge Case: 비문자열 타입 (숫자)
  it("비문자열 타입(숫자) 입력 시 false 반환", () => {
    const result = validateTransferSyntax(12345);
    expect(result).toBe(false);
  });

  // parseResult 미전달 시 에러 무시 (조용히 false 반환)
  it("parseResult 미전달 시에도 false 반환 보장", () => {
    const result = validateTransferSyntax("bad-uid");
    expect(result).toBe(false);
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

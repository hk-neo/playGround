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

/**
 * 28개 속성 기본값 일괄 검증 헬퍼
 * @param {object} meta - createDICOMMetadata() 반환 객체
 */
function expectDefaultValues(meta) {
  // 문자열 9개 (빈 문자열)
  expect(meta.patientName).toBe("");
  expect(meta.patientID).toBe("");
  expect(meta.patientBirthDate).toBe("");
  expect(meta.studyDate).toBe("");
  expect(meta.studyTime).toBe("");
  expect(meta.studyDescription).toBe("");
  expect(meta.modality).toBe("");
  expect(meta.bodyPartExamined).toBe("");
  expect(meta.transferSyntax).toBe("");
  expect(meta.studyInstanceUID).toBe("");
  expect(meta.seriesInstanceUID).toBe("");
  expect(meta.sopInstanceUID).toBe("");
  // 숫자 기본값 0
  expect(meta.sliceThickness).toBe(0);
  expect(meta.kvp).toBe(0);
  expect(meta.xRayTubeCurrent).toBe(0);
  expect(meta.rows).toBe(0);
  expect(meta.columns).toBe(0);
  expect(meta.windowCenter).toBe(0);
  expect(meta.windowWidth).toBe(0);
  // 특수 숫자 기본값
  expect(meta.numberOfFrames).toBe(1);
  expect(meta.bitsAllocated).toBe(16);
  expect(meta.bitsStored).toBe(16);
  expect(meta.highBit).toBe(15);
  expect(meta.pixelRepresentation).toBe(0);
  // 배열 기본값
  expect(meta.pixelSpacing).toEqual([0, 0]);
  expect(meta.imageOrientationPatient).toEqual([1, 0, 0, 0, 1, 0]);
  expect(meta.imagePositionPatient).toEqual([0, 0, 0]);
}

describe("createDICOMMetadata", () => {
  // TC-1.2.1: 무인자 호출 시 28개 속성 기본값 검증 (FR-001, FR-004, FR-2.3)
  it("TC-1.2.1: 무인자 호출 시 28개 속성이 모두 기본값으로 채워진 객체를 반환한다", () => {
    const meta = createDICOMMetadata();
    expectDefaultValues(meta);
    // null/undefined 가 존재하지 않는지 확인
    const values = Object.values(meta);
    expect(values.every((v) => v !== null && v !== undefined)).toBe(true);
    // 속성 개수가 27개인지 확인
    expect(Object.keys(meta)).toHaveLength(27);
  });

  // TC-1.2.5: 필수 필드 기본값 검증 (FR-006, FR-1.3, HAZ-1.3)
  it("TC-1.2.5: 필수 필드(rows,columns,bitsAllocated,pixelRepresentation) 기본값을 검증한다", () => {
    const meta = createDICOMMetadata();
    // metadataParser.js에서 PARSE_ERR_MISSING_REQUIRED_TAG 에러 발생 판단 기준
    expect(meta.rows).toBe(0);
    expect(meta.columns).toBe(0);
    expect(meta.bitsAllocated).toBe(16);
    expect(meta.pixelRepresentation).toBe(0);
  });

  // TC-1.2.2: overrides 전달 시 지정값 반영 + 나머지 기본값 유지 (FR-002, FR-2.3)
  it("TC-1.2.2: overrides 전달 시 지정값은 반영되고 나머지는 기본값이 유지된다", () => {
    const meta = createDICOMMetadata({ rows: 512, columns: 512, modality: "CT" });
    expect(meta.rows).toBe(512);
    expect(meta.columns).toBe(512);
    expect(meta.modality).toBe("CT");
    // 나머지는 기본값
    expect(meta.patientName).toBe("");
    expect(meta.bitsAllocated).toBe(16);
    expect(meta.pixelRepresentation).toBe(0);
    expect(meta.numberOfFrames).toBe(1);
  });

  // TC-1.2.3: 배열 필드 override 정확성 (FR-002, FR-2.3)
  it("TC-1.2.3: 배열 필드(pixelSpacing 등) override가 정확히 반영된다", () => {
    const meta = createDICOMMetadata({
      pixelSpacing: [0.3, 0.3],
      imageOrientationPatient: [0, 1, 0, 0, 0, 1],
      imagePositionPatient: [10, 20, 30],
    });
    expect(meta.pixelSpacing).toEqual([0.3, 0.3]);
    expect(meta.imageOrientationPatient).toEqual([0, 1, 0, 0, 0, 1]);
    expect(meta.imagePositionPatient).toEqual([10, 20, 30]);
  });

  // TC-1.2.4: 참조 독립성 및 참조 오염 방지 (FR-003, HAZ-5.1)
  it("TC-1.2.4: 연속 호출 시 서로 다른 참조를 반환하여 참조 오염을 방지한다", () => {
    const meta1 = createDICOMMetadata();
    const meta2 = createDICOMMetadata();
    // 서로 다른 참조
    expect(meta1).not.toBe(meta2);
    // 스칼라 속성 변경이 다른 객체에 영향 없음
    meta1.rows = 999;
    expect(meta2.rows).toBe(0);
    // 배열 속성 변경이 다른 객체에 영향 없음
    meta1.pixelSpacing[0] = 99;
    expect(meta2.pixelSpacing[0]).toBe(0);
  });

  // TC-1.2.6: PHI 대상 필드 3개 빈 문자열 기본값 존재 (FR-005, FR-4.1, HAZ-3.1)
  it("TC-1.2.6: PHI 대상 필드 3개가 빈 문자열 기본값으로 존재한다", () => {
    const meta = createDICOMMetadata();
    // phiGuard.js PHI_FIELDS 배열과 일치하는 필드명
    expect(meta.patientName).toBe("");
    expect(meta.patientID).toBe("");
    expect(meta.patientBirthDate).toBe("");
    // PHI 필드에 값을 override로 전달 시에도 정상 반영
    const metaWithPhi = createDICOMMetadata({
      patientName: "테스트환자",
      patientID: "PID-001",
      patientBirthDate: "19900101",
    });
    expect(metaWithPhi.patientName).toBe("테스트환자");
    expect(metaWithPhi.patientID).toBe("PID-001");
    expect(metaWithPhi.patientBirthDate).toBe("19900101");
  });

  // EC-001: null/undefined overrides 처리 (FR-002)
  it("EC-001: null 또는 undefined를 전달해도 에러 없이 기본값 객체를 반환한다", () => {
    const metaNull = createDICOMMetadata(null);
    expectDefaultValues(metaNull);
    const metaUndef = createDICOMMetadata(undefined);
    expectDefaultValues(metaUndef);
  });

  // EC-002: 정의되지 않은 추가 속성 포함 (FR-007)
  it("EC-002: 정의되지 않은 추가 속성도 Object Spread에 의해 포함된다", () => {
    const meta = createDICOMMetadata({
      photometricInterpretation: "MONOCHROME2",
      samplesPerPixel: 1,
    });
    expect(meta.photometricInterpretation).toBe("MONOCHROME2");
    expect(meta.samplesPerPixel).toBe(1);
    // 기본 속성도 유지
    expect(meta.rows).toBe(0);
    expect(meta.bitsAllocated).toBe(16);
  });

  // EC-003: 다른 길이의 배열 전달 시 그대로 반영 (FR-002)
  it("EC-003: 다른 길이의 배열을 전달해도 그대로 반영된다", () => {
    const meta1 = createDICOMMetadata({ pixelSpacing: [0.5] });
    expect(meta1.pixelSpacing).toEqual([0.5]);
    const meta2 = createDICOMMetadata({ pixelSpacing: [0.3, 0.3, 0.3] });
    expect(meta2.pixelSpacing).toEqual([0.3, 0.3, 0.3]);
  });

  // EC-004: 배열 기본값 참조 독립성 (FR-003, HAZ-5.1)
  it("EC-004: 배열 기본값이 매 호출 시 서로 다른 참조로 생성된다", () => {
    const meta1 = createDICOMMetadata();
    const meta2 = createDICOMMetadata();
    // pixelSpacing 배열 참조 독립성
    expect(meta1.pixelSpacing).not.toBe(meta2.pixelSpacing);
    // imageOrientationPatient 배열 참조 독립성
    expect(meta1.imageOrientationPatient).not.toBe(meta2.imageOrientationPatient);
    // imagePositionPatient 배열 참조 독립성
    expect(meta1.imagePositionPatient).not.toBe(meta2.imagePositionPatient);
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


// ============================================================
// ParseContext 단위 테스트
// ============================================================

import { createParseContext } from "../src/data/dicomParser/ParseContext.js";
import { TRANSFER_SYNTAX } from "../src/data/dicomDictionary.js";

describe("createParseContext", () => {
  it("Explicit VR Little Endian 기본 설정이어야 한다", () => {
    const buf = new ArrayBuffer(256);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    expect(ctx.isLittleEndian).toBe(true);
    expect(ctx.isExplicitVR).toBe(true);
    expect(ctx.offset).toBe(0);
  });

  it("Implicit VR Little Endian 설정이어야 한다", () => {
    const buf = new ArrayBuffer(256);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.IMPLICIT_VR_LE);
    expect(ctx.isLittleEndian).toBe(true);
    expect(ctx.isExplicitVR).toBe(false);
  });

  it("Big Endian 설정이어야 한다", () => {
    const buf = new ArrayBuffer(256);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.BIG_ENDIAN);
    expect(ctx.isLittleEndian).toBe(false);
    expect(ctx.isExplicitVR).toBe(true);
  });

  it("시작 오프셋을 설정할 수 있어야 한다", () => {
    const buf = new ArrayBuffer(256);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE, 100);
    expect(ctx.offset).toBe(100);
    expect(ctx.remaining()).toBe(156);
  });

  it("hasRemaining이 올바르게 동작해야 한다", () => {
    const buf = new ArrayBuffer(10);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    expect(ctx.hasRemaining(10)).toBe(true);
    expect(ctx.hasRemaining(11)).toBe(false);
    ctx.advance(5);
    expect(ctx.hasRemaining(5)).toBe(true);
    expect(ctx.hasRemaining(6)).toBe(false);
  });

  it("advance()에 음수를 전달하면 에러를 발생해야 한다", () => {
    const buf = new ArrayBuffer(256);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    expect(() => ctx.advance(-1)).toThrow();
  });

  it("readString으로 문자열을 읽을 수 있어야 한다", () => {
    const buf = new ArrayBuffer(16);
    const view = new Uint8Array(buf);
    // "HELLO" = 72,69,76,76,79
    view[0] = 72; view[1] = 69; view[2] = 76; view[3] = 76; view[4] = 79;
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    expect(ctx.readString(5)).toBe("HELLO");
    expect(ctx.offset).toBe(5);
  });

  it("readString에 0을 전달하면 빈 문자열을 반환해야 한다", () => {
    const buf = new ArrayBuffer(16);
    const ctx = createParseContext(buf, TRANSFER_SYNTAX.EXPLICIT_VR_LE);
    expect(ctx.readString(0)).toBe("");
    expect(ctx.offset).toBe(0);
  });
});

// ============================================================
// readTagValue 단위 테스트
// ============================================================

import { readTagValue } from "../src/data/dicomParser/tagReader.js";

/**
 * 테스트용 ParseContext 생성 헬퍼
 */
function makeTestCtx(buffer, startOffset = 0) {
  return createParseContext(buffer, TRANSFER_SYNTAX.EXPLICIT_VR_LE, startOffset);
}

describe("readTagValue - 정수 VR", () => {
  it("US (Uint16) 값을 올바르게 읽어야 한다", () => {
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    view.setUint16(0, 512, true);
    const ctx = makeTestCtx(buf);
    expect(readTagValue(ctx, "US", 2)).toBe(512);
    expect(ctx.offset).toBe(2);
  });

  it("US 패딩 바이트를 건너뛰어야 한다", () => {
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    view.setUint16(0, 100, true);
    const ctx = makeTestCtx(buf);
    expect(readTagValue(ctx, "US", 4)).toBe(100);
    expect(ctx.offset).toBe(4);
  });

  it("SS (Int16) 값을 올바르게 읽어야 한다", () => {
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    view.setInt16(0, -100, true);
    const ctx = makeTestCtx(buf);
    expect(readTagValue(ctx, "SS", 2)).toBe(-100);
  });

  it("UL (Uint32) 값을 올바르게 읽어야 한다", () => {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setUint32(0, 100000, true);
    const ctx = makeTestCtx(buf);
    expect(readTagValue(ctx, "UL", 4)).toBe(100000);
  });

  it("SL (Int32) 값을 올바르게 읽어야 한다", () => {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setInt32(0, -99999, true);
    const ctx = makeTestCtx(buf);
    expect(readTagValue(ctx, "SL", 4)).toBe(-99999);
  });
});

describe("readTagValue - 실수 VR", () => {
  it("FL (Float32) 값을 올바르게 읽어야 한다", () => {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setFloat32(0, 3.14, true);
    const ctx = makeTestCtx(buf);
    const result = readTagValue(ctx, "FL", 4);
    expect(result).toBeCloseTo(3.14, 5);
  });

  it("FD (Float64) 값을 올바르게 읽어야 한다", () => {
    const buf = new ArrayBuffer(16);
    const view = new DataView(buf);
    view.setFloat64(0, 2.718281828, true);
    const ctx = makeTestCtx(buf);
    const result = readTagValue(ctx, "FD", 8);
    expect(result).toBeCloseTo(2.718281828, 8);
  });
});

describe("readTagValue - 문자열 숫자 VR", () => {
  it("DS 단일 숫자 값을 파싱해야 한다", () => {
    const buf = new ArrayBuffer(8);
    const bytes = new Uint8Array(buf);
    const str = "3.5\0 ";
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    const ctx = makeTestCtx(buf);
    expect(readTagValue(ctx, "DS", 5)).toBe(3.5);
  });

  it("DS 다중값(백슬래시 구분)을 배열로 파싱해야 한다", () => {
    const buf = new ArrayBuffer(16);
    const bytes = new Uint8Array(buf);
    const str = "1.5\\2.5";
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    const ctx = makeTestCtx(buf);
    const result = readTagValue(ctx, "DS", 7);
    expect(result).toEqual([1.5, 2.5]);
  });

  it("IS 정수 값을 파싱해야 한다", () => {
    const buf = new ArrayBuffer(8);
    const bytes = new Uint8Array(buf);
    const str = "42\0 ";
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    const ctx = makeTestCtx(buf);
    expect(readTagValue(ctx, "IS", 5)).toBe(42);
  });

  it("DS 비숫자 값을 문자열로 반환해야 한다", () => {
    const buf = new ArrayBuffer(16);
    const bytes = new Uint8Array(buf);
    const str = "abc";
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    const ctx = makeTestCtx(buf);
    expect(readTagValue(ctx, "DS", 3)).toBe("abc");
  });
});

describe("readTagValue - 속성 태그 VR (AT)", () => {
  it("AT 값을 태그 키 문자열로 반환해야 한다", () => {
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setUint16(0, 0x7FE0, true);
    view.setUint16(2, 0x0010, true);
    const ctx = makeTestCtx(buf);
    expect(readTagValue(ctx, "AT", 4)).toBe("7FE00010");
  });
});

describe("readTagValue - 바이너리 VR", () => {
  it("OW 바이너리 오프셋 정보를 반환해야 한다", () => {
    const buf = new ArrayBuffer(32);
    const ctx = makeTestCtx(buf);
    const result = readTagValue(ctx, "OW", 16);
    expect(result._binaryOffset).toBe(0);
    expect(result._binaryLength).toBe(16);
    expect(ctx.offset).toBe(16);
  });

  it("OB 바이너리 오프셋 정보를 반환해야 한다", () => {
    const buf = new ArrayBuffer(32);
    const ctx = makeTestCtx(buf);
    const result = readTagValue(ctx, "OB", 8);
    expect(result._binaryOffset).toBe(0);
    expect(result._binaryLength).toBe(8);
  });

  it("UN 바이너리 오프셋 정보를 반환해야 한다", () => {
    const buf = new ArrayBuffer(32);
    const ctx = makeTestCtx(buf);
    const result = readTagValue(ctx, "UN", 4);
    expect(result._binaryOffset).toBe(0);
    expect(result._binaryLength).toBe(4);
  });
});

describe("readTagValue - 문자열 VR", () => {
  it("LO 문자열을 trim + null 제거하여 반환해야 한다", () => {
    const buf = new ArrayBuffer(16);
    const bytes = new Uint8Array(buf);
    const str = "HELLO\0 ";
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    const ctx = makeTestCtx(buf);
    expect(readTagValue(ctx, "LO", 7)).toBe("HELLO");
  });

  it("CS (Code String) 값을 올바르게 읽어야 한다", () => {
    const buf = new ArrayBuffer(16);
    const bytes = new Uint8Array(buf);
    const str = "MONOCHROME2 ";
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    const ctx = makeTestCtx(buf);
    expect(readTagValue(ctx, "CS", 12)).toBe("MONOCHROME2");
  });

  it("UI (UID) 값을 null 패딩 제거하여 반환해야 한다", () => {
    const buf = new ArrayBuffer(32);
    const bytes = new Uint8Array(buf);
    const str = "1.2.840.10008.1.2.1\0";
    for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
    const ctx = makeTestCtx(buf);
    expect(readTagValue(ctx, "UI", 21)).toBe("1.2.840.10008.1.2.1");
  });

  it("SQ 시퀀스는 null을 반환해야 한다", () => {
    const buf = new ArrayBuffer(32);
    const ctx = makeTestCtx(buf);
    expect(readTagValue(ctx, "SQ", 10)).toBe(null);
    expect(ctx.offset).toBe(10);
  });
});

describe("readTagValue - 경계 조건", () => {
  it("length가 0이면 null을 반환해야 한다", () => {
    const buf = new ArrayBuffer(16);
    const ctx = makeTestCtx(buf);
    expect(readTagValue(ctx, "US", 0)).toBe(null);
    expect(ctx.offset).toBe(0);
  });

  it("vr이 null이면 null을 반환하고 offset을 전진해야 한다", () => {
    const buf = new ArrayBuffer(16);
    const ctx = makeTestCtx(buf);
    expect(readTagValue(ctx, null, 4)).toBe(null);
    expect(ctx.offset).toBe(4);
  });

  it("vr이 undefined이면 null을 반환하고 offset을 전진해야 한다", () => {
    const buf = new ArrayBuffer(16);
    const ctx = makeTestCtx(buf);
    expect(readTagValue(ctx, undefined, 4)).toBe(null);
    expect(ctx.offset).toBe(4);
  });
});

// ============================================================
// PHI 가드 단위 테스트
// ============================================================

import { maskPhiFields, getPhiValue } from "../src/data/dicomParser/phiGuard.js";
import { createDICOMMetadata } from "../src/types/DICOMMetadata.js";

describe("PHI 가드", () => {
  it("patientName을 [REDACTED]로 마스킹해야 한다", () => {
    const meta = createDICOMMetadata({ patientName: "홍길동" });
    maskPhiFields(meta);
    expect(meta.patientName).toBe("[REDACTED]");
  });

  it("patientID를 [REDACTED]로 마스킹해야 한다", () => {
    const meta = createDICOMMetadata({ patientID: "P001" });
    maskPhiFields(meta);
    expect(meta.patientID).toBe("[REDACTED]");
  });

  it("getPhiValue로 원본 값을 조회할 수 있어야 한다", () => {
    const meta = createDICOMMetadata({ patientName: "홍길동", patientID: "P001" });
    maskPhiFields(meta);
    expect(getPhiValue(meta, "patientName")).toBe("홍길동");
    expect(getPhiValue(meta, "patientID")).toBe("P001");
  });

  it("PHI가 아닌 필드는 getPhiValue가 undefined를 반환해야 한다", () => {
    const meta = createDICOMMetadata({ patientName: "홍길동" });
    maskPhiFields(meta);
    expect(getPhiValue(meta, "rows")).toBeUndefined();
  });

  it("빈 문자열 PHI 필드는 마스킹하지 않아야 한다", () => {
    const meta = createDICOMMetadata({ patientName: "", patientID: "" });
    maskPhiFields(meta);
    expect(meta.patientName).toBe("");
    expect(meta.patientID).toBe("");
  });

  it("null 객체를 전달하면 그대로 반환해야 한다", () => {
    expect(maskPhiFields(null)).toBeNull();
  });
});

// ============================================================
// SDS-3.13 getPhiValue() 단위 테스트 (TC-13.1 ~ TC-13.8)
// 추적: PLAYG-1832 | FR-4.1, SEC-3, NFR-4
// ============================================================

describe("SDS-3.13 getPhiValue() PHI 원본 안전조회", () => {
  let maskedMeta;

  // TC-13.1~13.3 공통 setup: 모든 PHI 필드가 채워진 메타데이터를 마스킹
  beforeEach(() => {
    maskedMeta = createDICOMMetadata({
      patientName: "홍길동",
      patientID: "P001",
      patientBirthDate: "19900101",
    });
    maskPhiFields(maskedMeta);
  });

  // TC-13.1: 인가 필드 patientName 원본 조회 (FR-4.1)
  it("TC-13.1: 원본 patientName을 반환해야 한다", () => {
    expect(getPhiValue(maskedMeta, "patientName")).toBe("홍길동");
  });

  // TC-13.2: 인가 필드 patientID 원본 조회 (FR-4.1)
  it("TC-13.2: 원본 patientID를 반환해야 한다", () => {
    expect(getPhiValue(maskedMeta, "patientID")).toBe("P001");
  });

  // TC-13.3: 인가 필드 patientBirthDate 원본 조회 (FR-4.1)
  it("TC-13.3: 원본 patientBirthDate를 반환해야 한다", () => {
    expect(getPhiValue(maskedMeta, "patientBirthDate")).toBe("19900101");
  });

  // TC-13.4: 비 PHI 필드(rows) 조회 차단 (SEC-3)
  it("TC-13.4: 비인가 필드 'rows'는 undefined를 반환해야 한다", () => {
    expect(getPhiValue(maskedMeta, "rows")).toBeUndefined();
  });

  // TC-13.5: 존재하지 않는 필드 조회 차단 (SEC-3)
  it("TC-13.5: 존재하지 않는 필드 'unknownField'는 undefined를 반환해야 한다", () => {
    expect(getPhiValue(maskedMeta, "unknownField")).toBeUndefined();
  });

  // TC-13.5.1: 빈 문자열 field 파라미터 (EC-002, SEC-3)
  it("TC-13.5.1: 빈 문자열 field는 undefined를 반환해야 한다", () => {
    expect(getPhiValue(maskedMeta, "")).toBeUndefined();
  });

  // TC-13.6: 마스킹되지 않은 일반 객체 (FR-4.1)
  it("TC-13.6: 마스킹되지 않은 객체는 undefined를 반환해야 한다", () => {
    const plainObj = { patientName: "홍길동", patientID: "P001" };
    expect(getPhiValue(plainObj, "patientName")).toBeUndefined();
  });

  // TC-13.7: null 메타데이터 (NFR-4)
  it("TC-13.7: null 메타데이터에 대해 undefined를 반환해야 한다", () => {
    expect(getPhiValue(null, "patientName")).toBeUndefined();
  });

  // TC-13.8: 빈 문자열 원본 (FR-4.1)
  it("TC-13.8: 빈 문자열 원본은 undefined를 반환해야 한다", () => {
    const metaEmpty = createDICOMMetadata({
      patientName: "",
      patientID: "",
      patientBirthDate: "",
    });
    maskPhiFields(metaEmpty);
    expect(getPhiValue(metaEmpty, "patientName")).toBeUndefined();
  });
});

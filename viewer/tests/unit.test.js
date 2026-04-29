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

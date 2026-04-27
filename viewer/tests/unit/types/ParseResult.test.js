/**
 * @file ParseResult 타입 팩토리 단위 테스트
 * @description createParseResult() 팩토리 함수에 대한 포괄적인 단위 테스트.
 * Vitest 프레임워크 사용.
 *
 * 추적성: T009 (단위 테스트), FR-1.1~FR-1.5, FR-2.3, FR-3.1, FR-5.1
 * IEC 62304 Class A 추적성 매트릭스 검증
 */

import { describe, it, expect } from "vitest";
import { createParseResult } from "../../../src/types/ParseResult.js";

describe("createParseResult", () => {

  // ============================================================
  // TC-9.1: 기본값 생성 (인자 없이 호출)
  // 추적: FR-1.1~FR-1.5, FR-2.3, FR-3.1
  // ============================================================
  it("인자 없이 호출 시 기본값 객체를 반환해야 한다", () => {
    const result = createParseResult();
    expect(result.metadata).toBeNull();
    expect(result.voxelData).toBeNull();
    expect(result.errors).toEqual([]);
    expect(result.isValid).toBe(false);
  });

  // ============================================================
  // TC-9.2: 빈 객체 호출
  // ============================================================
  it("빈 객체를 전달하면 기본값과 동일한 결과를 반환해야 한다", () => {
    const result = createParseResult({});
    expect(result.metadata).toBeNull();
    expect(result.voxelData).toBeNull();
    expect(result.errors).toEqual([]);
    expect(result.isValid).toBe(false);
  });

  // ============================================================
  // TC-9.3: 부분 overrides - isValid만 전달
  // ============================================================
  it("isValid만 전달하면 isValid만 변경되고 나머지는 기본값이어야 한다", () => {
    const result = createParseResult({ isValid: true });
    expect(result.isValid).toBe(true);
    expect(result.metadata).toBeNull();
    expect(result.voxelData).toBeNull();
    expect(result.errors).toEqual([]);
  });

  // ============================================================
  // TC-9.4: 부분 overrides - errors만 전달
  // 추적: FR-5.1 (구조화된 에러 코드)
  // ============================================================
  it("errors 배열을 전달하면 해당 배열로 덮어쓰기되어야 한다", () => {
    const errors = [{
      userMessage: "테스트 에러",
      debugInfo: "DEBUG_INFO",
      errorCode: "PARSE_ERR_INVALID_MAGIC",
      severity: "error",
    }];
    const result = createParseResult({ errors });
    expect(result.errors).toBe(errors);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].errorCode).toBe("PARSE_ERR_INVALID_MAGIC");
    expect(result.errors[0].severity).toBe("error");
    expect(result.metadata).toBeNull();
    expect(result.isValid).toBe(false);
  });

  // ============================================================
  // TC-9.5: 전체 overrides (4개 필드 모두)
  // 추적: FR-1.1~FR-1.5, FR-2.3, FR-3.1
  // ============================================================
  it("모든 필드를 전달하면 전달한 값으로 덮어쓰기되어야 한다", () => {
    const metadata = {
      patientName: "테스트환자",
      patientID: "P001",
      rows: 512,
      columns: 512,
      bitsAllocated: 16,
    };
    const voxelData = new ArrayBuffer(100);
    const errors = [{
      userMessage: "경고 발생",
      debugInfo: "WARN_01",
      errorCode: "PARSE_WARN_PARTIAL_METADATA",
      severity: "warning",
    }];

    const result = createParseResult({
      metadata,
      voxelData,
      errors,
      isValid: true,
    });

    expect(result.metadata).toBe(metadata);
    expect(result.metadata.patientName).toBe("테스트환자");
    expect(result.voxelData).toBe(voxelData);
    expect(result.errors).toBe(errors);
    expect(result.errors[0].severity).toBe("warning");
    expect(result.isValid).toBe(true);
  });

  // ============================================================
  // TC-9.6: errors 배열 독립성 (CT-2)
  // 추적: CT-2 (errors 배열 참조 독립성)
  // ============================================================
  it("연속 2회 호출 시 각각 독립적인 errors 배열을 가져야 한다", () => {
    const result1 = createParseResult();
    const result2 = createParseResult();

    // result1의 errors 배열 수정
    result1.errors.push({
      userMessage: "추가 에러",
      debugInfo: "D",
      errorCode: "TEST",
      severity: "error",
    });

    // result2의 errors 배열은 영향을 받지 않아야 함
    expect(result1.errors).toHaveLength(1);
    expect(result2.errors).toHaveLength(0);
    expect(result1.errors).not.toBe(result2.errors);
  });

  // ============================================================
  // TC-9.7: null metadata
  // 추적: FR-2.3 (metadata null 허용)
  // ============================================================
  it("metadata를 명시적으로 null로 설정하면 null이 유지되어야 한다", () => {
    const result = createParseResult({ metadata: null });
    expect(result.metadata).toBeNull();
    expect(result.isValid).toBe(false);
  });

  // ============================================================
  // TC-9.8: ErrorResult 구조 보존
  // 추적: FR-5.1 (구조화된 에러 코드)
  // ============================================================
  it("errors에 ErrorResult 객체를 추가하면 4개 필드가 모두 유지되어야 한다", () => {
    const errorResult = {
      userMessage: "파일이 DICOM 형식이 아닙니다",
      debugInfo: "Offset 132: expected DICM, got XXXX",
      errorCode: "PARSE_ERR_INVALID_MAGIC",
      severity: "error",
    };
    const result = createParseResult({ errors: [errorResult] });

    expect(result.errors[0]).toHaveProperty("userMessage", "파일이 DICOM 형식이 아닙니다");
    expect(result.errors[0]).toHaveProperty("debugInfo", "Offset 132: expected DICM, got XXXX");
    expect(result.errors[0]).toHaveProperty("errorCode", "PARSE_ERR_INVALID_MAGIC");
    expect(result.errors[0]).toHaveProperty("severity", "error");
  });

  // ============================================================
  // TC-9.9: 대량 errors 배열 (100개)
  // ============================================================
  it("100개의 에러 항목이 포함된 errors 배열도 정상 동작해야 한다", () => {
    const errors = Array.from({ length: 100 }, (_, i) => ({
      userMessage: `에러 ${i + 1}`,
      debugInfo: `DEBUG_${i + 1}`,
      errorCode: "PARSE_ERR_UNEXPECTED",
      severity: i % 2 === 0 ? "error" : "warning",
    }));
    const result = createParseResult({ errors, isValid: false });

    expect(result.errors).toHaveLength(100);
    expect(result.errors[0].severity).toBe("error");
    expect(result.errors[1].severity).toBe("warning");
    expect(result.errors[99].userMessage).toBe("에러 100");
  });

  // ============================================================
  // TC-9.10: isValid 불리언 타입 검증
  // ============================================================
  it("isValid는 항상 boolean 타입이어야 한다", () => {
    const defaultResult = createParseResult();
    expect(typeof defaultResult.isValid).toBe("boolean");
    expect(defaultResult.isValid).toBe(false);

    const successResult = createParseResult({ isValid: true });
    expect(typeof successResult.isValid).toBe("boolean");
    expect(successResult.isValid).toBe(true);

    const failResult = createParseResult({ isValid: false });
    expect(typeof failResult.isValid).toBe("boolean");
    expect(failResult.isValid).toBe(false);
  });

  // ============================================================
  // 추가: parseDICOM 7개 호출 지점 시나리오 테스트
  // 추적: FR-1.1~FR-1.4 (초기 검증 에러)
  // ============================================================
  describe("parseDICOM 호출 지점 시나리오", () => {

    it("호출 #1: 파일 크기 초과 에러 결과를 생성할 수 있어야 한다", () => {
      const result = createParseResult({
        errors: [{
          userMessage: "파일 크기가 제한을 초과했습니다.",
          debugInfo: "PARSE_ERR_FILE_TOO_LARGE: file.size=600MB",
          errorCode: "PARSE_ERR_FILE_TOO_LARGE",
          severity: "error",
        }],
        isValid: false,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].errorCode).toBe("PARSE_ERR_FILE_TOO_LARGE");
      expect(result.metadata).toBeNull();
      expect(result.voxelData).toBeNull();
    });

    it("호출 #2: 매직 바이트 불일치 에러 결과를 생성할 수 있어야 한다", () => {
      const result = createParseResult({
        errors: [{
          userMessage: "유효한 DICOM 파일이 아닙니다.",
          debugInfo: "PARSE_ERR_INVALID_MAGIC: Offset 132 expected DICM",
          errorCode: "PARSE_ERR_INVALID_MAGIC",
          severity: "error",
        }],
        isValid: false,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].errorCode).toBe("PARSE_ERR_INVALID_MAGIC");
    });

    it("호출 #3: 전송 구문 미지원 에러 결과를 생성할 수 있어야 한다", () => {
      const result = createParseResult({
        errors: [{
          userMessage: "지원하지 않는 전송 구문입니다.",
          debugInfo: "PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX: UID=1.2.840.10008.1.2.4.50",
          errorCode: "PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX",
          severity: "error",
        }],
        isValid: false,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors[0].errorCode).toBe("PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX");
    });

    it("호출 #5: 부분 메타데이터와 필수 에러를 포함한 결과를 생성할 수 있어야 한다", () => {
      const partialMeta = { rows: 512, columns: 512 };
      const result = createParseResult({
        metadata: partialMeta,
        errors: [{
          userMessage: "필수 DICOM 태그가 누락되었습니다.",
          debugInfo: "PARSE_ERR_MISSING_REQUIRED_TAG: BitsAllocated",
          errorCode: "PARSE_ERR_MISSING_REQUIRED_TAG",
          severity: "error",
        }],
        isValid: false,
      });
      expect(result.isValid).toBe(false);
      expect(result.metadata).toEqual(partialMeta);
      expect(result.voxelData).toBeNull();
    });

    it("호출 #7: 정상 완료 결과를 생성할 수 있어야 한다", () => {
      const metadata = {
        patientName: "테스트",
        rows: 512,
        columns: 512,
        bitsAllocated: 16,
        pixelRepresentation: 0,
        numberOfFrames: 100,
      };
      const voxelData = new ArrayBuffer(512 * 512 * 100 * 2);
      const result = createParseResult({
        metadata,
        voxelData,
        errors: [],
        isValid: true,
      });
      expect(result.isValid).toBe(true);
      expect(result.metadata).toBe(metadata);
      expect(result.voxelData).toBe(voxelData);
      expect(result.errors).toEqual([]);
    });

  });

  // ============================================================
  // 추가: 반환 객체 프로퍼티 키 검증
  // ============================================================
  it("반환 객체는 정확히 4개의 프로퍼티를 가져야 한다", () => {
    const result = createParseResult();
    const keys = Object.keys(result);
    expect(keys).toHaveLength(4);
    expect(keys).toContain("metadata");
    expect(keys).toContain("voxelData");
    expect(keys).toContain("errors");
    expect(keys).toContain("isValid");
  });

});

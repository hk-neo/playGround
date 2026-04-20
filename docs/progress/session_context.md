# Session Context — PLAYG-1385

## 1. 시스템 아키텍처/컨벤션 (유실 절대 금지)

### 1.1 제품 개요
- **제품명**: Simple CBCT Viewer
- **유형**: 웹 브라우저 기반 CBCT 영상 뷰어 (오프라인 동작)
- **IEC 62304 안전 등급**: Class A

### 1.2 핵심 아키텍처 결정 (ADR)

| ADR | 티켓 | 내용 | 영향 |
|-----|-------|------|------|
| ADR-2 | PLAYG-1371 | 외부 DICOM 라이브러리 미사용, 자체 파서 구현 | 모든 파싱 로직을 순수 TypeScript로 직접 구현 |
| ADR-3 | PLAYG-1372 | 메모리 무상태 데이터 처리 | ArrayBuffer 기반 메모리 관리, 명시적 해제 |
| ADR-5 | PLAYG-1374 | 정적 단일 번들 배포 | 트리쉐이킹 가능한 모듈 구조 |

### 1.3 대상 컴포넌트
- **컴포넌트**: DICOMParser (COMP-1.1, SDS-3.1)
- **소속 계층**: Data Layer
- **역할**: 로컬 DICOM 파일 파싱 -> 메타데이터 + 복셀 데이터 추출
- **다운스트림**: DataValidator(COMP-1.2), VolumeBuilder(COMP-2.1)
- **업스트림**: 웹 브라우저 File API, DataView, TextDecoder

### 1.4 프로젝트 디렉토리 구조
```
src/data-layer/dicom-parser/
  index.ts              # 공개 API 엑스포트
  DICOMParser.ts        # 메인 파서 클래스 (~250L)
  constants.ts          # 매직 바이트, 태그 정의, 전송 구문 UID 상수 (~100L)
  types.ts              # ParseResult, DICOMMetadata, ErrorInfo 등 타입 정의 (~120L)
  vr-readers.ts         # VR(Value Representation)별 데이터 읽기 함수 모음 (~400L)
  tag-registry.ts       # DICOM 태그 레지스트리 (태그 번호 -> 이름/VR 매핑) (~300L)
  transfer-syntax.ts    # 전송 구문 검증 및 바이트 오더 결정 로직 (~80L)
  byte-reader.ts        # DataView 래퍼 - 오프셋 관리, 엔디안 읽기 유틸 (~150L)
  errors.ts             # 에러 코드 열거형 및 ErrorMessage 생성 팩토리 (~80L)
tests/unit/data-layer/dicom-parser/
  DICOMParser.test.ts, validateMagicByte.test.ts, validateTransferSyntax.test.ts,
  parseMetadata.test.ts, parsePixelData.test.ts, handleParseError.test.ts,
  byte-reader.test.ts, vr-readers.test.ts, edge-cases.test.ts
tests/fixtures/
  valid-dicom-512x512-16bit.dcm, valid-dicom-256x256-8bit.dcm,
  no-magic-byte.dcm, truncated-file.dcm, unsupported-syntax.dcm,
  invalid-tag-length.dcm, large-tag-value.dcm, duplicate-tags.dcm, no-pixel-data.dcm
```

### 1.5 핵심 타입/인터페이스 정의 (types.ts)
```
ParseResult    : { metadata: DICOMMetadata, voxelData: ArrayBuffer | null, errors: ErrorInfo[] }
DICOMMetadata  : patientName, patientID, studyInstanceUID, seriesInstanceUID, studyDate,
                 modality, rows, columns, bitsAllocated, bitsStored, pixelRepresentation,
                 samplesPerPixel, numberOfFrames
ErrorInfo      : code(ErrorCode), message(string), tag(string|null), severity(error|warning), offset(number|null)
ErrorCode      : INVALID_FORMAT | TRUNCATED_DATA | INVALID_TAG_LENGTH | UNSUPPORTED_SYNTAX | MISSING_REQUIRED_TAG | INVALID_FILE_SIZE
DataElement    : tag(string), vr(string), length(number), value(ArrayBuffer), offset(number)
DICOMDataSet   : elements(Map<string, DataElement>), transferSyntax(string), isExplicitVR(boolean)
VRReader       : (reader: ByteReader, length: number, vr: string) => unknown
```

### 1.6 공개 API (index.ts)
```
export { DICOMParser } from "./DICOMParser"
export type { ParseResult, DICOMMetadata, ErrorInfo, ErrorCode, DataElement, DICOMDataSet } from "./types"
export { DICOMErrorCodes } from "./errors"
```

### 1.7 지원 전송 구문 (Transfer Syntax)

| UID | 이름 | VR 모드 | 엔디안 |
|-----|------|---------|--------|
| 1.2.840.10008.1.2   | Implicit VR Little Endian   | Implicit | Little |
| 1.2.840.10008.1.2.1 | Explicit VR Little Endian   | Explicit | Little |
| 1.2.840.10008.1.2.2 | Explicit VR Big Endian      | Explicit | Big    |

미지원: JPEG 압축 계열(1.2.840.10008.1.2.4.*), RLE Lossless(1.2.840.10008.1.2.5)

### 1.8 핵심 상수 (constants.ts)
```
DICOM_MAGIC_BYTE    = [0x44, 0x49, 0x43, 0x4D]  // "DICM"
DICOM_PREAMBLE_LENGTH = 128
DICOM_MAGIC_OFFSET  = 128
DICOM_MIN_FILE_SIZE = 132
MAX_TAG_LENGTH      = 67_108_864  // 64MB, HAZ-5.2 완화
MAX_SEQUENCE_DEPTH  = 16  // CX-4 복잡도 완화
FILE_META_GROUP     = 0x0002
PIXEL_DATA_TAG      = (0x7FE0, 0x0010)
```

---

## 2. 해결 완료된 주요 이슈 및 기술 스택

### 2.1 작업 완료 내역 (PLAYG-1385)
- **티켓**: PLAYG-1385 — [SDS-3.1] DICOMParser 상세 설계
- **산출물**:
  - `docs/spec-kit/01_spec.md` — Feature Specification (7개 User Story, 10개 FR, 5개 NFR, 7개 Edge Case)
  - `docs/spec-kit/02_plan.md` — 기술 이행 계획서 (9 Phase, 디렉토리 구조, 복잡도 매트릭스)
  - `docs/spec-kit/03_tasks.md` — 태스크 분할 (28개 태스크, 5개 병렬 그룹, 예상 49시간)

### 2.2 User Story 요약
| US | 내용 | 우선순위 |
|----|------|----------|
| US1 | DICOM 파일 파싱 수행 (parseDICOM -> ParseResult) | P1 MVP |
| US2 | 매직 바이트 검증 (validateMagicByte, offset 128 DICM) | P1 MVP |
| US3 | 전송 구문 검증 (validateTransferSyntax) | P1 MVP |
| US4 | 메타데이터 추출 (parseMetadata) | P1 MVP |
| US5 | 픽셀 데이터 파싱 (parsePixelData, Bits Allocated/Stored 반영) | P1 MVP |
| US6 | 파싱 에러 핸들링 (handleParseError, 구조화된 ErrorInfo) | P2 |
| US7 | DataValidator 연동 검증 | P2 |

### 2.3 요구사항 추적 매트릭스
| SRS 요구 | 근거 티켓  | 구현 인터페이스 |
|----------|-----------|-----------------|
| FR-1.1 DICOM 파일 선택         | PLAYG-1293 | parseDICOM() |
| FR-1.2 DICOM 파일 형식 검증    | PLAYG-1293 | validateMagicByte(), validateTransferSyntax() |
| FR-1.3 DICOM 메타데이터 파싱   | PLAYG-1294 | parseMetadata() |
| FR-1.4 복셀 데이터 파싱 및 검증| PLAYG-1294 | parsePixelData() |
| FR-1.5 비표준 파일 오류 처리   | PLAYG-1293 | handleParseError() |
| FR-7.2 DICOM 3.0 준수          | PLAYG-1304 | 전체 인터페이스 |

### 2.4 위험 완화 추적
| 위험 ID | 위험 내용         | 완화 조치                                    | 구현 위치 |
|---------|-------------------|----------------------------------------------|-----------|
| HAZ-1.1 | 프로세스 크래시   | try-catch 전체 래핑, 항상 ParseResult 반환  | parseDICOM() |
| HAZ-5.2 | 악의적 파일 공격  | MAX_TAG_LENGTH(64MB) 제한, 무한 루프 방지 가드 | parseDataElements() |

### 2.5 비기능 요구사항
- NFR-001: 512x512 16-bit 단일 프레임 100ms 이내 파싱
- NFR-002: 파일 크기 2배 초과 메모리 할당 금지, ArrayBuffer.slice() 활용
- NFR-003: 파싱 오류 시에도 항상 ParseResult 반환
- NFR-004: 악의적 파일 안전 처리 (태그 길이 상한, 반복문 가드)
- NFR-005: 전략 패턴 기반 VR 리더, Transfer Syntax 레지스트리로 확장성 확보

### 2.6 구현 Phase 구성 (총 9 Phase, 28 태스크)
| Phase | 내용               | 태스크 수 | 예상 시간 |
|-------|--------------------|----------|-----------|
| 1     | Setup              | 6        | 10h       |
| 2     | Foundational       | 3        | 6h        |
| 3     | US1 (파싱 수행)    | 5        | 8h        |
| 4     | US3 (전송 구문)    | 1        | 2h        |
| 5     | US4 (메타데이터)   | 2        | 4h        |
| 6     | US5 (픽셀 데이터) | 2        | 4h        |
| 7     | US6 (에러 핸들링)  | 2        | 4h        |
| 8     | US7 (DataValidator)| 3        | 5h        |
| 9     | Integration        | 4        | 6h        |

### 2.7 병렬 실행 가능 그룹
| 그룹 | 태스크                  | 조건 |
|------|------------------------|------|
| G1   | T007, T008, T009       | Phase 1 완료 후 병렬 |
| G2   | T010, T011             | T007-T009 완료 후 병렬 |
| G3   | T015, T016, T018       | T014 완료 후 병렬 |
| G4   | T017, T019             | 각각 T016, T018 완료 후 개별 |
| G5   | T020, T021, T022, T024 | Phase 6-7 완료 후 병렬 |

---

## 3. 미완료 / Next Steps

### 3.1 즉시 다음 단계
- [ ] T001~T028 태스크 구현 착수 (Phase 1: Setup 부터 시작)
- [ ] DICOMParser 모듈 디렉토리 구조 생성 (src/data-layer/dicom-parser/)
- [ ] 핵심 타입 정의 (types.ts) 및 상수 (constants.ts) 구현

### 3.2 보류/후속 작업
- DataValidator(COMP-1.2) 인터페이스 정의 — 본 계획 범위 외, 인터페이스만 types.ts에 선언
- 압축 전송 구문(JPEG, RLE) 지원 — 현재 미지원, 향후 확장 가능 구조로 설계됨
- 대용량 파일(>500MB) 스트리밍 파싱 — NFR-002에서 고려사항으로 명시됨

### 3.3 기존 문서 경로
- 전역 문서: docs/artifacts/ (SRS.md, SDS.md, SAD.md, RMR.md 등)
- Spec-Kit: docs/spec-kit/01_spec.md, 02_plan.md, 03_tasks.md
- 진행 상황: docs/progress/session_context.md
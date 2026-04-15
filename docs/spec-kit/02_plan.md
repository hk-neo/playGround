# 기술 이행 계획서: [COMP-1.1] DICOM 파일 파서

**티켓**: PLAYG-1375 | **부모 티켓**: PLAYG-1385 (SDS-3.1)
**상태**: Draft | **작성일**: 2026-04-15
**아키텍처 계층**: Data Layer | **IEC 62304**: Class A

---

## 1. 개요

### 1.1 목적
본 문서는 COMP-1.1 DICOM 파일 파서 컴포넌트의 기술 이행 계획서이다.
01_spec.md에 정의된 6개 공개 인터페이스, 5개 User Scenario, 15개 테스트 케이스를
체계적으로 구현하기 위한 단계별 계획을 수립한다.

### 1.2 범위
- **포함**: DICOM 파일 로드, 매직 바이트 검증, 전송 구문 검증, 메타데이터 파싱,
  복셀 데이터 추출, 오류 처리 전체 파이프라인
- **제외**: 다중 슬라이스/시리즈 처리, 압축 전송 구문(JPEG, RLE), DICOM 네트워크 통신

### 1.3 추적성 매핑

| 구현 항목 | FR 추적 | HAZ 완화 | ADR 참조 |
|-----------|---------|----------|----------|
| 매직 바이트 검증 | FR-1.1, FR-1.2 | HAZ-1.1 | ADR-2 |
| 전송 구문 검증 | FR-1.2 | HAZ-5.2 | ADR-2 |
| 메타데이터 파싱 | FR-1.3 | HAZ-1.1 | ADR-2 |
| 복셀 데이터 추출 | FR-1.4 | HAZ-1.1 | ADR-2 |
| 오류 처리 | FR-1.5 | HAZ-5.2 | ADR-1 |

---

## 2. Constitution Check (설계 원칙 준수 검증)

### 2.1 IEC 62304 Class A 준수 검증

| 항목 | 요구사항 | 본 계획 반영 여부 | 비고 |
|------|----------|------------------|------|
| 제5.1절 개발 계획 | 체계적 Phase 진행 | 반영 | Phase 1~6 단계적 구현 |
| 제5.2절 요구사항 분석 | SRS FR-1.1~1.5 추적 | 반영 | 01_spec.md 매핑 |
| 제5.3절 아키텍처 설계 | Data Layer 컴포넌트 | 반영 | ADR-1 4계층 구조 |
| 제5.4절 상세 설계 | SDS-3.1 인터페이스 | 반영 | 6개 공개 API 구현 |
| 제5.5절 단위 구현 | 코드 + 단위 테스트 | 반영 | Phase 3~5 TDD |
| 제5.7절 검증 테스트 | 커버리지 90% 이상 | 반영 | Phase 6 검증 |
| 제7절 위험 관리 | HAZ-1.1, HAZ-5.2 | 반영 | 각 모듈별 완화 로직 |
| 제9절 문제 해결 | 결함 추적 | 반영 | 에러 코드 체계화 |

### 2.2 ADR-2 (자체 구현) 준수

| 검증 항목 | 기대 결과 | 검증 방법 |
|-----------|-----------|-----------|
| 외부 DICOM 라이브러리 미사용 | package.json runtime deps = 0 | 빌드 점검 |
| 브라우저 내장 API만 사용 | FileReader, ArrayBuffer, DataView, TextDecoder | 코드 리뷰 |
| DICOM PS3.5/PS3.10 표준 준수 | 올바른 태그 파싱 | 단위 테스트 |

### 2.3 SOLID 원칙 적용

- **S (단일 책임)**: DICOMParser는 파일 파싱만 담당. 검증은 DataValidator에 위임
- **O (개방-폐쇄)**: 새로운 전송 구문 추가 시 validateTransferSyntax만 확장
- **L (리스코프 치환)**: ParseError는 CBVError 계약을 그대로 준수
- **I (인터페이스 분리)**: 6개 공개 함수로 최소 인터페이스 제공
- **D (의존성 역전)**: DataValidator 인터페이스에 의존, 구현에 결합되지 않음

---

## 3. 구현 아키텍처

### 3.1 모듈 구조

```text
viewer/src/data/
  index.js           # Data Layer 배럴 파일 (공개 API export)
  DICOMParser.js     # COMP-1.1: DICOM 파일 파서 (본 구현 대상)
  DataValidator.js   # COMP-1.2: 데이터 검증기 (의존 대상)
```

### 3.2 DICOMParser.js 내부 구조

```text
DICOMParser.js
[공개 API]
  parseDICOM(file) -> ParseResult
  validateMagicByte(buffer) -> boolean
  validateTransferSyntax(uid) -> boolean
  parseMetadata(buffer) -> DICOMMetadata
  parsePixelData(buffer, metadata) -> ArrayBuffer
  handleParseError(error) -> ErrorResult
[내부 헬퍼]
  readFileAsArrayBuffer(file) -> ArrayBuffer
  determineTransferSyntax(buffer) -> string
  createParseContext(buffer, uid) -> ParseContext
  readTag(dataView, offset, isLittleEndian) -> TagReadResult
  readTagValue(dataView, offset, vr, length) -> unknown
  skipTag(dataView, offset) -> number
[상수]
  SUPPORTED_TRANSFER_SYNTAXES = { ... }
  DICOM_MAGIC_BYTE_OFFSET = 128
  DICOM_MAGIC_BYTE = 'DICM'
  REQUIRED_TAGS = [ ... ]
  MAX_TAG_COUNT = 10000
  MAX_SEQUENCE_DEPTH = 10
```

### 3.3 의존성 관계

```text
DICOMParser (COMP-1.1)
  참조: types/ParseResult.js (ParseResult 타입)
  참조: types/DICOMMetadata.js (DICOMMetadata 타입)
  참조: errors/CBVError.js (ParseError 클래스)
  참조: DataValidator (COMP-1.2, 검증 위임)
```

### 3.4 파싱 파이프라인 흐름

```text
parseDICOM(file)
  |-> readFileAsArrayBuffer(file)
  |-> validateMagicByte(buffer)
  |     +-- 실패: PARSE_ERR_INVALID_MAGIC 반환
  |-> determineTransferSyntax(buffer)
  |-> validateTransferSyntax(uid)
  |     +-- 실패: PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX 반환
  |-> createParseContext(buffer, uid)
  |-> parseMetadata(buffer, context)
  |     +-- 실패: PARSE_ERR_MISSING_REQUIRED_TAG 반환
  |-> parsePixelData(buffer, metadata)
  |     +-- 실패: PARSE_ERR_PIXEL_DATA_EXTRACTION 반환
  |-> assembleParseResult(metadata, voxelData, errors)
  +-> return ParseResult
```

---

## 4. Phase별 구현 계획

### Phase 1: 기반 타입 및 상수 정의

**목표**: DICOMParser가 의존하는 타입 정의와 상수를 먼저 구현하여
후속 Phase에서 참조할 수 있는 기반을 확보한다.

**근거 문서**: SDS-3.1, 01_spec.md 섹션 4(내부 데이터 구조)

| 작업 ID | 작업명 | 상세 내용 | 산출물 | 추적 |
|---------|--------|-----------|--------|------|
| P1-01 | DICOM 상수 정의 | 매직 바이트 오프셋, 지원 전송 구문 UID 맵, 필수 태그 목록 정의 | DICOMParser.js 내 상수 | FR-1.2 |
| P1-02 | ParseContext 타입 | buffer, dataView, offset, isLittleEndian, isExplicitVR, transferSyntaxUID 포함 | 내부 JSDoc 타입 | FR-1.3 |
| P1-03 | 에러 코드 맵 | 6개 에러 코드(PARSE_ERR_INVALID_MAGIC 등)와 한국어/영어 메시지 매핑 | DICOMParser.js 내 상수 | FR-1.5 |
| P1-04 | 태그 사전 구축 | 필수 메타데이터 태그 12종의 Group/Element, VR, 기본값 매핑 테이블 | DICOMParser.js 내 상수 | FR-1.3 |

**지원 전송 구문 상수 설계:**
```javascript
// Explicit VR Little Endian (기본값)
// '1.2.840.10008.1.2.1'
// Explicit VR Big Endian
// '1.2.840.10008.1.2.2'
// Implicit VR Little Endian
// '1.2.840.10008.1.2'
```

**필수 태그 사전 설계 (일부):**

| Tag | 이름 | VR | 기본값 |
|-----|------|----|--------|
| (0010,0010) | PatientName | PN | 빈 문자열 |
| (0010,0020) | PatientID | LO | 빈 문자열 |
| (0020,000D) | StudyInstanceUID | UI | 빈 문자열 |
| (0020,000E) | SeriesInstanceUID | UI | 빈 문자열 |
| (0028,0010) | Rows | US | 0 (필수) |
| (0028,0011) | Columns | US | 0 (필수) |
| (0028,0100) | BitsAllocated | US | 16 |
| (0028,0103) | PixelRepresentation | US | 0 |
| (7FE0,0010) | PixelData | OW | 없음 (필수) |

**산출물 검증 기준:**
- [ ] SUPPORTED_TRANSFER_SYNTAXES에 3개 UID 포함 확인
- [ ] 필수 태그 사전에 12개 이상 항목 포함 확인
- [ ] 에러 코드 6종 모두 정의 확인
- [ ] 빌드 성공 (구문 오류 없음)

### Phase 2: 파일 검증 기능 구현

**목표**: DICOM Part 10 파일의 매직 바이트 검증과 전송 구문 검증 기능을 구현한다.
이 Phase는 HAZ-1.1(영상 왜곡) 및 HAZ-5.2(비표준 DICOM) 완화의 첫 번째 방어선이다.

**근거 문서**: 01_spec.md US-1, US-2, TC-1.1~1.4, TC-2.1~2.3

| 작업 ID | 작업명 | 상세 내용 | 산출물 | 추적 |
|---------|--------|-----------|--------|------|
| P2-01 | validateMagicByte 구현 | buffer 길이 132바이트 이상 확인, 오프셋 128~131 DICM 시그니처 검증 | DICOMParser.js | FR-1.1, FR-1.2 |
| P2-02 | determineTransferSyntax 구현 | 메타데이터 그룹(0002,0010)에서 전송 구문 UID 추출 | DICOMParser.js | FR-1.2 |
| P2-03 | validateTransferSyntax 구현 | UID가 지원 목록에 포함되어 있는지 확인 | DICOMParser.js | FR-1.2, HAZ-5.2 |
| P2-04 | 검증 함수 단위 테스트 | TC-1.1~1.4, TC-2.1~2.3 테스트 케이스 작성 | DICOMParser.test.js | FR-1.5 |

**validateMagicByte 구현 상세:**
```javascript
export function validateMagicByte(buffer) {
  if (!buffer || buffer.byteLength < 132) return false;
  const view = new DataView(buffer);
  let magic = '';
  for (let i = 128; i < 132; i++) {
    magic += String.fromCharCode(view.getUint8(i));
  }
  return magic === 'DICM';
}
```

**validateTransferSyntax 구현 상세:**
```javascript
export function validateTransferSyntax(uid) {
  if (!uid || typeof uid !== 'string') return false;
  return Object.values(SUPPORTED_TRANSFER_SYNTAXES)
    .includes(uid);
}
```

**테스트 케이스 매핑:**

| 테스트 ID | 테스트 내용 | 기대 결과 | 검증 함수 |
|-----------|------------|-----------|-----------|
| TC-1.1 | 유효한 DICOM Part 10 파일 | true 반환 | validateMagicByte |
| TC-1.2 | 매직 바이트 없는 파일 | false 반환 | validateMagicByte |
| TC-1.3 | 132바이트 미만 파일 | false 반환 | validateMagicByte |
| TC-1.4 | 프리앰블 있으나 시그니처 다름 | false 반환 | validateMagicByte |
| TC-2.1 | Explicit VR Little Endian UID | true 반환 | validateTransferSyntax |
| TC-2.2 | 압축 전송 구문 UID | false 반환 | validateTransferSyntax |
| TC-2.3 | 빈 문자열 입력 | false 반환 | validateTransferSyntax |

**산출물 검증 기준:**
- [ ] TC-1.1~1.4, TC-2.1~2.3 모두 통과
- [ ] validateMagicByte, validateTransferSyntax가 순수 함수임 확인
- [ ] 빌드 성공

### Phase 3: 메타데이터 파싱 구현

**목표**: DICOM 데이터셋에서 필수 메타데이터 태그를 순회하며 파싱하는 기능을 구현한다.
이 Phase는 HAZ-1.1(파싱 오류로 인한 영상 왜곡) 완화의 핵심 단계이다.

**근거 문서**: 01_spec.md US-3, TC-3.1~3.3, 섹션 5.2(태그 읽기 알고리즘)

| 작업 ID | 작업명 | 상세 내용 | 산출물 | 추적 |
|---------|--------|-----------|--------|------|
| P3-01 | createParseContext 구현 | buffer, DataView, 바이트 오더, VR 모드를 포함한 파싱 컨텍스트 생성 | DICOMParser.js | FR-1.3 |
| P3-02 | readTag 구현 | 4바이트 Group/Element 태그 식별, VR 읽기, 길이 읽기, 값 추출 | DICOMParser.js | FR-1.3 |
| P3-03 | parseMetadata 구현 | 태그 순회하며 필수 12개 태그 추출, 누락 시 기본값 대체 | DICOMParser.js | FR-1.3, HAZ-1.1 |
| P3-04 | 메타데이터 파싱 단위 테스트 | TC-3.1~3.3 테스트 케이스 작성 | DICOMParser.test.js | FR-1.3 |

**readTag 알고리즘 의사코드:**
```text
readTag(dataView, offset, context):
  1. Group = dataView.getUint16(offset, context.isLittleEndian)
  2. Element = dataView.getUint16(offset + 2, context.isLittleEndian)
  3. tag = [Group, Element]
  4. IF context.isExplicitVR:
       vr = read 2 bytes as ASCII string
       IF vr in ('OB','OD','OF','OL','OW','SQ','UC','UN','UR','UT'):
         skip 2 reserved bytes
         length = read 4 bytes
       ELSE:
         length = read 2 bytes
     ELSE (Implicit VR):
       vr = lookup in DICOM data dictionary
       length = read 4 bytes
  5. value = readTagValue(dataView, offset, vr, length)
  6. RETURN { tag, vr, length, value, offset: nextOffset }
```

**바이트 오더 처리 전략:**
- Little Endian (1.2.840.10008.1.2.1, 1.2.840.10008.1.2): DataView littleEndian=true
- Big Endian (1.2.840.10008.1.2.2): DataView littleEndian=false
- 메타데이터 그룹(0002,xxxx)은 항상 Explicit VR Little Endian 강제

**오류 복구 전략 (Phase 3 적용):**
- 필수 태그(Rows, Columns, BitsAllocated, PixelData) 누락 시: 파싱 중단 + 에러 반환
- 선택 태그(WindowCenter, SliceThickness 등) 누락 시: 기본값 대체 + 경고 추가
- 알 수 없는 태그: length만큼 오프셋 이동하여 건너뛰기
- 시퀀스 태그(SQ): 중첩 깊이 카운터로 최대 10레벨 제한 후 건너뛰기
- 최대 태그 수 10,000개로 무한 루프 방지

**산출물 검증 기준:**
- [ ] TC-3.1~3.3 모두 통과
- [ ] 유효한 DICOM 파일에서 12개 필수 태그 추출 성공
- [ ] 선택 태그 누락 시 기본값 대체 확인
- [ ] 파싱 중 오류 발생 시 ErrorResult 반환 확인
- [ ] 빌드 성공

### Phase 4: 복셀 데이터 추출 구현

**목표**: 메타데이터를 기반으로 DICOM 파일에서 픽셀(복셀) 데이터를 추출한다.
HAZ-1.1(영상 왜곡) 완화를 위해 데이터 길이 검증을 철저히 수행한다.

**근거 문서**: 01_spec.md US-4, TC-4.1~4.4, 섹션 3.1(parsePixelData 명세)

| 작업 ID | 작업명 | 상세 내용 | 산출물 | 추적 |
|---------|--------|-----------|--------|------|
| P4-01 | parsePixelData 구현 | Tag (7FE0,0010) 탐색, 메타데이터 기반 길이 계산, ArrayBuffer 슬라이스 추출 | DICOMParser.js | FR-1.4, HAZ-1.1 |
| P4-02 | 데이터 타입 검증 | BitsAllocated/PixelRepresentation 기반 3가지 타입 지원 (16bit signed, 16bit unsigned, 8bit unsigned) | DICOMParser.js | FR-1.4 |
| P4-03 | 길이 일치 검증 | 예상 길이(rows*cols*bitsAllocated/8)와 실제 길이 비교, 불일치 시 경고 | DICOMParser.js | HAZ-1.1 |
| P4-04 | 복셀 데이터 단위 테스트 | TC-4.1~4.4 테스트 케이스 작성 | DICOMParser.test.js | FR-1.4 |

**지원 데이터 타입별 처리 로직:**

| BitsAllocated | PixelRepresentation | TypedArray | 바이트 수/픽셀 |
|----------------|---------------------|------------|-----------------|
| 16 | 1 (Signed) | Int16Array | 2 |
| 16 | 0 (Unsigned) | Uint16Array | 2 |
| 8 | 0 (Unsigned) | Uint8Array | 1 |

**parsePixelData 추출 로직 의사코드:**
```text
parsePixelData(buffer, metadata):
  1. 파일 내에서 Tag (7FE0,0010) 위치 탐색
  2. expectedLength = metadata.rows * metadata.columns * (metadata.bitsAllocated / 8)
  3. actualLength = 태그에 명시된 값 길이
  4. IF actualLength != expectedLength:
       경고(warning)를 errors 배열에 추가
  5. pixelOffset = 태그 값의 시작 오프셋
  6. voxelData = buffer.slice(pixelOffset, pixelOffset + actualLength)
  7. RETURN voxelData
```

**산출물 검증 기준:**
- [ ] TC-4.1~4.4 모두 통과
- [ ] 16-bit signed 데이터 올바른 Int16Array 길이 반환
- [ ] 8-bit unsigned 데이터 올바른 Uint8Array 길이 반환
- [ ] 픽셀 데이터 태그 없는 경우 에러 반환
- [ ] 길이 불일치 시 경고 포함 확인

### Phase 5: 오류 처리 및 메인 파이프라인 구현

**목표**: 전체 파싱 파이프라인을 연결하고, 체계적인 오류 처리 메커니즘을 구현한다.
HAZ-5.2(비표준 DICOM 기능 정지) 완화를 위한 graceful error 처리를 포함한다.

**근거 문서**: 01_spec.md US-5, TC-5.1~5.3, 섹션 5.1(파싱 파이프라인)

| 작업 ID | 작업명 | 상세 내용 | 산출물 | 추적 |
|---------|--------|-----------|--------|------|
| P5-01 | handleParseError 구현 | ParseError를 ErrorResult로 변환, 사용자용/개발자용 메시지 분리 | DICOMParser.js | FR-1.5 |
| P5-02 | readFileAsArrayBuffer 구현 | FileReader를 통한 비동기 파일 읽기, PARSE_ERR_FILE_READ 에러 처리 | DICOMParser.js | FR-1.1 |
| P5-03 | parseDICOM 메인 함수 구현 | 전체 파이프라인 오케스트레이션, 각 단계 에러 수집 | DICOMParser.js | FR-1.1~1.5 |
| P5-04 | assembleParseResult 구현 | metadata, voxelData, errors를 ParseResult로 조립, isValid 판단 | DICOMParser.js | FR-1.5 |
| P5-05 | 오류 처리 단위 테스트 | TC-5.1~5.3 테스트 케이스 작성 | DICOMParser.test.js | FR-1.5 |

**에러 코드 체계 및 메시지 매핑:**

| 에러 코드 | 한국어 메시지 | 영어 메시지 | 심각도 |
|-----------|---------------|-------------|--------|
| PARSE_ERR_INVALID_MAGIC | 유효한 DICOM 파일이 아닙니다 | Not a valid DICOM file | error |
| PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX | 지원하지 않는 전송 구문입니다 | Unsupported transfer syntax | error |
| PARSE_ERR_MISSING_REQUIRED_TAG | 필수 DICOM 태그가 누락되었습니다 | Missing required DICOM tag | error |
| PARSE_ERR_PIXEL_DATA_EXTRACTION | 픽셀 데이터 추출에 실패했습니다 | Failed to extract pixel data | error |
| PARSE_ERR_FILE_READ | 파일 읽기에 실패했습니다 | Failed to read file | error |
| PARSE_ERR_UNEXPECTED | 예기치 않은 오류가 발생했습니다 | Unexpected error occurred | error |

**handleParseError 구현 설계:**
```javascript
export function handleParseError(error) {
  const messageMap = ERROR_MESSAGES[error.code] || ERROR_MESSAGES.PARSE_ERR_UNEXPECTED;
  return {
    userMessage: messageMap.ko,
    debugInfo: `${error.code}: ${error.message} at offset ${error.context?.offset ?? 'unknown'}`,
    errorCode: error.code,
    severity: error.code.includes('WARNING') ? 'warning' : 'error'
  };
}
```

**parseDICOM 메인 함수 설계:**
```javascript
export async function parseDICOM(file) {
  const errors = [];
  try {
    const buffer = await readFileAsArrayBuffer(file);
    if (!validateMagicByte(buffer)) {
      return assembleParseResult(null, null, [handleParseError(...)]);
    }
    const uid = determineTransferSyntax(buffer);
    if (!validateTransferSyntax(uid)) {
      return assembleParseResult(null, null, [handleParseError(...)]);
    }
    const metadata = parseMetadata(buffer);
    const voxelData = parsePixelData(buffer, metadata);
    return assembleParseResult(metadata, voxelData, errors);
  } catch (e) {
    return assembleParseResult(null, null, [handleParseError(e)]);
  }
}
```

**산출물 검증 기준:**
- [ ] TC-5.1~5.3 모두 통과
- [ ] 6개 에러 코드에 대해 한국어/영어 메시지 매핑 확인
- [ ] 잘못된 파일 형식 시 사용자 친화적 메시지 출력
- [ ] parseDICOM이 async 함수로 정상 동작
- [ ] 빌드 성공

### Phase 6: 통합 테스트 및 최종 검증

**목표**: 모든 Phase의 산출물을 통합하고, 테스트 커버리지 90% 이상을 달성하며,
IEC 62304 Class A 문서화 요건을 충족한다.

**근거 문서**: 01_spec.md 섹션 9(검증 기준), 섹션 6(IEC 62304 준수 사항)

| 작업 ID | 작업명 | 상세 내용 | 산출물 | 추적 |
|---------|--------|-----------|--------|------|
| P6-01 | 통합 파싱 테스트 | 유효한 DICOM 파일 전체 파싱 파이프라인 E2E 테스트 | DICOMParser.test.js | FR-1.1~1.5 |
| P6-02 | 오류 시나리오 통합 테스트 | 잘못된 파일, 미지원 전송 구문, 손상된 데이터 등 예외 경로 테스트 | DICOMParser.test.js | FR-1.5, HAZ-5.2 |
| P6-03 | 커버리지 측정 및 보완 | vitest --coverage 실행, 미달 영역 테스트 보완 | 커버리지 리포트 | IEC 62304 |
| P6-04 | Data Layer 배럴 업데이트 | DICOMParser 공개 API를 data/index.js에 export | data/index.js | ADR-1 |
| P6-05 | 추적성 매트릭스 최종 확인 | FR-1.1~1.5, HAZ-1.1, HAZ-5.2, ADR-2 완전 추적 확인 | 검증 보고서 | IEC 62304 |

**테스트 매트릭스 (User Scenario -> 테스트 케이스 -> Phase):**

| US | 시나리오 | 테스트 케이스 | 구현 Phase |
|----|----------|---------------|------------|
| US-1 | 매직 바이트 검증 | TC-1.1~1.4 | Phase 2 |
| US-2 | 전송 구문 검증 | TC-2.1~2.3 | Phase 2 |
| US-3 | 메타데이터 파싱 | TC-3.1~3.3 | Phase 3 |
| US-4 | 복셀 데이터 추출 | TC-4.1~4.4 | Phase 4 |
| US-5 | 오류 처리 | TC-5.1~5.3 | Phase 5 |

**테스트 픽스처 계획:**

| 픽스처명 | 설명 | 크기 | 용도 |
|----------|------|------|------|
| valid_dicom_16bit.raw | 유효한 16-bit DICOM Part 10 파일 | 4KB | TC-1.1, TC-3.1, TC-4.1 |
| valid_dicom_8bit.raw | 유효한 8-bit DICOM Part 10 파일 | 2KB | TC-4.2 |
| invalid_no_magic.raw | 매직 바이트 없는 파일 | 200B | TC-1.2 |
| too_short.raw | 132바이트 미만 파일 | 64B | TC-1.3 |
| wrong_signature.raw | 프리앰블 있으나 DICM 아님 | 200B | TC-1.4 |
| compressed_syntax.raw | 압축 전송 구문 포함 파일 | 200B | TC-2.2 |
| missing_tags.raw | 필수 태그 누락 파일 | 200B | TC-3.3, TC-4.3 |

> **주의**: 테스트 픽스처는 실제 DICOM 파일 규격을 따르는 최소 합성 데이터를 사용한다.
> 실제 환자 데이터는 절대 사용하지 않는다 (FR-5.1, HAZ-3.2).

**산출물 검증 기준:**
- [ ] 전체 테스트 스위트 통과 (TC-1.1 ~ TC-5.3)
- [ ] 테스트 커버리지 90% 이상
- [ ] npm run build 성공
- [ ] npm run lint 통과 (0 errors)
- [ ] 추적성 매트릭스 FR-1.1~1.5, HAZ-1.1, HAZ-5.2 전수 연결 확인

---

## 5. 위험 완화 전략 상세

### 5.1 HAZ-1.1: DICOM 파싱 오류로 인한 영상 왜곡

**위험 설명**: 파싱 오류가 발생하더라도 화면에 영상이 표시되어 잘못된 진단으로 이어질 수 있음

**완화 조치 (이행 계획 반영):**

| 완화 단계 | 구현 내용 | Phase | 검증 방법 |
|-----------|-----------|-------|-----------|
| 예방 | 매직 바이트 엄격 검증 | Phase 2 | TC-1.1~1.4 |
| 예방 | 전송 구문 지원 여부 사전 검증 | Phase 2 | TC-2.1~2.3 |
| 예방 | 픽셀 데이터 길이 일치 검증 | Phase 4 | TC-4.4 |
| 탐지 | 파싱 중 발생한 모든 에러/경고를 ParseResult.errors에 누적 | Phase 5 | TC-5.1 |
| 방어 | ParseResult.isValid = false인 경우 상위 계층에서 렌더링 차단 | Phase 5 | 통합 테스트 |

### 5.2 HAZ-5.2: 비표준 DICOM으로 인한 기능 정지

**위험 설명**: 비표준 DICOM 파일이 입력되면 애플리케이션이 응답하지 않거나 충돌할 수 있음

**완화 조치 (이행 계획 반영):**

| 완화 단계 | 구현 내용 | Phase | 검증 방법 |
|-----------|-----------|-------|-----------|
| 예방 | 지원하지 않는 전송 구문은 에러 반환 후 처리 중단 | Phase 2 | TC-2.2 |
| 방어 | 알 수 없는 태그는 건너뛰기 (오프셋 이동만) | Phase 3 | TC-3.2 |
| 방어 | 최대 태그 수 10,000개 제한으로 무한 루프 방지 | Phase 3 | 단위 테스트 |
| 방어 | 시퀀스 중첩 최대 10레벨 제한 | Phase 3 | 단위 테스트 |
| 복구 | 모든 예외는 try-catch로 포착하여 graceful error 처리 | Phase 5 | TC-5.1~5.3 |

---

## 6. Definition of Done (완료 기준)

### 6.1 기능적 완료 기준

- [ ] 6개 공개 인터페이스가 01_spec.md 명세대로 구현됨
  - [ ] parseDICOM(file) -> ParseResult
  - [ ] validateMagicByte(buffer) -> boolean
  - [ ] validateTransferSyntax(uid) -> boolean
  - [ ] parseMetadata(buffer) -> DICOMMetadata
  - [ ] parsePixelData(buffer, metadata) -> ArrayBuffer
  - [ ] handleParseError(error) -> ErrorResult
- [ ] 5개 User Scenario에 대한 단위 테스트 전수 통과
- [ ] 15개 테스트 케이스(TC-1.1 ~ TC-5.3) 전수 통과
- [ ] 테스트 커버리지 90% 이상 달성

### 6.2 품질 기준

- [ ] npm run build 성공 (0 errors, 0 warnings)
- [ ] npm run lint 통과 (0 errors)
- [ ] 외부 런타임 의존성 0개 (package.json 확인)
- [ ] 외부 DICOM 라이브러리 미사용 (ADR-2 준수)

### 6.3 추적성 기준

- [ ] FR-1.1 ~ FR-1.5 모든 기능 요구사항에 대한 구현/테스트 연결 확인
- [ ] HAZ-1.1, HAZ-5.2 완화 조치가 코드에 구현됨
- [ ] ADR-2(자체 구현) 준수: 외부 DICOM 라이브러리 미사용
- [ ] IEC 62304 Class A 문서화 요건 충족

### 6.4 산출물 목록

| 산출물 | 경로 | 설명 |
|--------|------|------|
| DICOMParser.js | viewer/src/data/DICOMParser.js | 메인 구현 파일 |
| DICOMParser.test.js | viewer/tests/unit/data/DICOMParser.test.js | 단위 테스트 파일 |
| data/index.js | viewer/src/data/index.js | Data Layer 배럴 업데이트 |
| 테스트 픽스처 | viewer/tests/fixtures/ | 합성 DICOM 테스트 데이터 |

---

## 7. 참조 문서

| 문서 | 설명 | 관련 티켓 |
|------|------|-----------|
| SAD | 소프트웨어 아키텍처 설계서 | PLAYG-1311 |
| SDS-3.1 | DICOMParser 상세 설계 | PLAYG-1385 |
| 01_spec.md | 컴포넌트 기능 명세서 | PLAYG-1375 |
| ADR-1 | Layered Architecture 4계층 10모듈 | - |
| ADR-2 | DICOM 파서 자체 구현 | - |
| DICOM PS3.5 | Data Structure and Encoding | - |
| DICOM PS3.10 | Media Storage and File Format | - |
| IEC 62304 | 의료기기 소프트웨어 생명주기 프로세스 | - |

---

*본 문서는 PLAYG-1375 티켓의 기술 이행 계획서로, IEC 62304 Class A 준수를 위해 작성되었습니다.*
*최종 업데이트: 2026-04-15*
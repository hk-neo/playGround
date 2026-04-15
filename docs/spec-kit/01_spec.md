# Feature Specification: [COMP-1.1] DICOM 파일 파서

**Feature Branch**: `PLAYG-1375-dicom-file-parser`
**Status**: Draft | **Date**: 2026-04-15
**Ticket**: `PLAYG-1375` | **Type**: Architecture
**Input**: SAD(PLAYG-1311)

---

## 1. 개요

### 1.1 컴포넌트 식별
- **컴포넌트 ID**: COMP-1.1
- **컴포넌트명**: DICOM 파일 파서 (DICOM File Parser)
- **아키텍처 계층**: Data Layer
- **소유 티켓**: PLAYG-1375

### 1.2 목적 및 범위
본 컴포넌트는 Simple CBCT Viewer 애플리케이션에서 DICOM 파일의 로드, 형식 검증,
메타데이터 파싱, 복셀 데이터 추출을 담당하는 핵심 Data Layer 컴포넌트이다.
IEC 62304 Class A 의료기기 소프트웨어 표준을 준수하며, 외부 라이브러리 없이 자체 구현한다.

### 1.3 추적성
- **FR 추적**: FR-1.1 (DICOM 파일 선택), FR-1.2 (형식 검증), FR-1.3 (메타데이터 파싱),
  FR-1.4 (복셀 데이터 파싱), FR-1.5 (오류 처리)
- **관련 ADR**: ADR-1 (Layered Architecture), ADR-2 (자체 구현)
- **위험 완화**: HAZ-1.1 (DICOM 파싱 오류로 인한 영상 왜곡), HAZ-5.2 (비표준 DICOM 기능 정지)
- **의존성**: DataValidator (COMP-1.x 계열)

---

## 2. User Scenarios & Testing

### US-1: DICOM Part 10 파일 로드 및 매직 바이트 검증 (Priority: P1)
- **설명**: 사용자가 DICOM 파일을 선택하면 128바이트 프리앰블을 건너뛰고 DICM 매직 바이트를
  확인하여 유효한 DICOM Part 10 파일인지 검증한다.
- **사전 조건**: 파일이 존재하고 읽기 가능함
- **입력**: `File` 객체 (브라우저 File API)
- **기대 결과**: 매직 바이트 검증 결과(true/false) 및 파일 유효성 상태 반환
- **테스트 케이스**:
  - TC-1.1: 유효한 DICOM Part 10 파일 로드 시 true 반환
  - TC-1.2: 매직 바이트가 없는 파일 로드 시 false 반환
  - TC-1.3: 빈 파일 또는 132바이트 미만 파일 로드 시 false 반환
  - TC-1.4: 프리앰블은 있으나 DICM 시그니처가 다른 경우 false 반환
- **FR 추적**: FR-1.1, FR-1.2

### US-2: 전송 구문(Transfer Syntax) 검증 (Priority: P1)
- **설명**: DICOM 파일의 전송 구문 UID를 읽어 지원 가능한 인코딩인지 확인한다.
- **사전 조건**: 파일이 DICOM Part 10 형식으로 검증됨
- **입력**: 전송 구문 UID 문자열
- **기대 결과**: 지원 가능한 전송 구문 여부 반환
- **지원 전송 구문**:
  - `1.2.840.10008.1.2.1` - Explicit VR Little Endian
  - `1.2.840.10008.1.2.2` - Explicit VR Big Endian
  - `1.2.840.10008.1.2` - Implicit VR Little Endian
- **테스트 케이스**:
  - TC-2.1: Explicit VR Little Endian UID 입력 시 true 반환
  - TC-2.2: 압축 전송 구문 UID 입력 시 false 반환
  - TC-2.3: 빈 문자열 입력 시 false 반환
- **FR 추적**: FR-1.2, FR-1.5

### US-3: 메타데이터 파싱 (Priority: P1)
- **설명**: DICOM 파일에서 환자 정보, 스터디 정보, 영상 파라미터 등 필수 메타데이터를 추출한다.
- **사전 조건**: 전송 구문이 지원 가능한 것으로 확인됨
- **입력**: ArrayBuffer (전체 DICOM 파일 데이터)
- **기대 결과**: DICOMMetadata 객체 반환
- **추출 메타데이터 항목**:
  - 환자 ID (PatientID, Tag: 0010,0020)
  - 환자 이름 (PatientName, Tag: 0010,0010)
  - 스터디 인스턴스 UID (StudyInstanceUID, Tag: 0020,000D)
  - 시리즈 인스턴스 UID (SeriesInstanceUID, Tag: 0020,000E)
  - 행 수 (Rows, Tag: 0028,0010)
  - 열 수 (Columns, Tag: 0028,0011)
  - 비트 할당 (BitsAllocated, Tag: 0028,0100)
  - 픽셀 표현 (PixelRepresentation, Tag: 0028,0103)
  - 윈도우 센터/폭 (WindowCenter/Width, Tag: 0028,1050/1051)
  - 슬라이스 두께 (SliceThickness, Tag: 0018,0050)
  - 복셀 크기 (PixelSpacing, Tag: 0028,0030)
- **테스트 케이스**:
  - TC-3.1: 유효한 DICOM 파일에서 모든 필수 태그 추출 성공
  - TC-3.2: 선택 태그가 누락된 파일에서 기본값으로 대체
  - TC-3.3: 메타데이터 파싱 중 오류 발생 시 ErrorResult 반환
- **FR 추적**: FR-1.3

### US-4: 복셀(픽셀) 데이터 추출 (Priority: P1)
- **설명**: 메타데이터를 기반으로 DICOM 파일에서 복셀 데이터를 추출하여 ArrayBuffer로 반환한다.
- **사전 조건**: 메타데이터 파싱 완료, BitsAllocated 및 PixelRepresentation 확인됨
- **입력**: ArrayBuffer, DICOMMetadata
- **기대 결과**: 복셀 데이터 ArrayBuffer
- **지원 데이터 타입**:
  - 16-bit Signed Integer (BitsAllocated=16, PixelRepresentation=1)
  - 16-bit Unsigned Integer (BitsAllocated=16, PixelRepresentation=0)
  - 8-bit Unsigned Integer (BitsAllocated=8, PixelRepresentation=0)
- **테스트 케이스**:
  - TC-4.1: 16-bit signed 데이터 추출 시 올바른 Int16Array 길이
  - TC-4.2: 8-bit unsigned 데이터 추출 시 올바른 Uint8Array 길이
  - TC-4.3: 픽셀 데이터 태그(7FE0,0010)가 없는 경우 에러 반환
  - TC-4.4: 픽셀 데이터 길이가 예상과 불일치하는 경우 경고 포함 반환
- **FR 추적**: FR-1.4

### US-5: 파싱 오류 처리 및 사용자 피드백 (Priority: P2)
- **설명**: 파일 파싱 과정에서 발생하는 모든 오류를 포착하고 사용자에게 의미 있는
  에러 메시지를 제공한다.
- **사전 조건**: 파싱 파이프라인 실행 중
- **입력**: ParseError 객체 (에러 코드, 메시지, 원인)
- **기대 결과**: ErrorResult 객체 (사용자용 메시지, 개발자용 디버그 정보)
- **에러 코드 체계**:
  - `PARSE_ERR_INVALID_MAGIC`: 매직 바이트 불일치
  - `PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX`: 미지원 전송 구문
  - `PARSE_ERR_MISSING_REQUIRED_TAG`: 필수 태그 누락
  - `PARSE_ERR_PIXEL_DATA_EXTRACTION`: 픽셀 데이터 추출 실패
  - `PARSE_ERR_FILE_READ`: 파일 읽기 실패
  - `PARSE_ERR_FILE_TOO_LARGE`: 파일 크기 초과
  - `PARSE_ERR_UNEXPECTED`: 예기치 않은 오류
- **테스트 케이스**:
  - TC-5.1: 잘못된 파일 형식 시 사용자 친화적 메시지 출력
  - TC-5.2: 네트워크 오류 시 재시도 안내 메시지
  - TC-5.3: 모든 에러 코드에 대해 한국어/영어 메시지 매핑 확인
- **FR 추적**: FR-1.5

---

## 3. 인터페이스 명세

### 3.1 공개 인터페이스 (SDS-3.1 기준)

#### parseDICOM(file: File) -> ParseResult
DICOM 파일 파싱의 메인 진입점 함수. 파일 로드부터 메타데이터/복셀 데이터 추출까지의
전체 파이프라인을 실행한다.
- **매개변수**: `file` - 브라우저 File API의 File 객체
- **반환값**: `ParseResult` 객체
  - `metadata: DICOMMetadata` - 추출된 DICOM 메타데이터
  - `voxelData: ArrayBuffer` - 추출된 복셀 데이터
  - `errors: ErrorResult[]` - 파싱 과정의 에러/경고 목록
- **비동기**: async 함수 (FileReader를 통한 비동기 읽기)
- **예외**: ParseError (치명적 오류 시)

#### validateMagicByte(buffer: ArrayBuffer) -> boolean
DICOM Part 10 파일의 매직 바이트(DICM)를 검증한다.
- **매개변수**: `buffer` - 파일 전체 ArrayBuffer
- **반환값**: `boolean` - 유효한 DICOM Part 10 파일 여부
- **검증 로직**:
  1. buffer 길이가 132바이트 이상인지 확인
  2. 오프셋 128~131 위치의 4바이트가 'DICM'인지 확인
- **부작용**: 없음 (순수 함수)

#### validateTransferSyntax(uid: string) -> boolean
전송 구문 UID가 본 시스템에서 지원 가능한지 검증한다.
- **매개변수**: `uid` - 전송 구문 UID 문자열
- **반환값**: `boolean` - 지원 가능 여부
- **지원 목록**:
  - `1.2.840.10008.1.2.1` (Explicit VR Little Endian)
  - `1.2.840.10008.1.2.2` (Explicit VR Big Endian)
  - `1.2.840.10008.1.2` (Implicit VR Little Endian)
- **부작용**: 없음 (순수 함수)

#### parseMetadata(buffer: ArrayBuffer) -> DICOMMetadata
DICOM 데이터셋에서 필수 메타데이터 태그를 파싱한다.
- **매개변수**: `buffer` - 파일 전체 ArrayBuffer
- **반환값**: `DICOMMetadata` 객체
- **DICOMMetadata 타입 정의**:
  ```typescript
  interface DICOMMetadata {
    patientId: string;
    patientName: string;
    studyInstanceUID: string;
    seriesInstanceUID: string;
    rows: number;
    columns: number;
    bitsAllocated: number;
    pixelRepresentation: number;
    windowCenter: number;
    windowWidth: number;
    sliceThickness: number;
    pixelSpacing: [number, number];
    transferSyntaxUID: string;
    photometricInterpretation: string;
    samplesPerPixel: number;
  }
  ```
- **기본값 정책**: 선택 태그 누락 시 합리적 기본값 사용

#### parsePixelData(buffer: ArrayBuffer, metadata: DICOMMetadata) -> ArrayBuffer
DICOM 파일에서 픽셀(복셀) 데이터를 추출한다.
- **매개변수**:
  - `buffer` - 파일 전체 ArrayBuffer
  - `metadata` - 파싱된 DICOMMetadata 객체
- **반환값**: 복셀 데이터 ArrayBuffer
- **추출 로직**:
  1. Tag (7FE0,0010) 위치 탐색
  2. 메타데이터 기반 데이터 길이 계산 (rows * columns * bitsAllocated / 8)
  3. 해당 오프셋에서 ArrayBuffer 슬라이스 추출

#### handleParseError(error: ParseError) -> ErrorResult
파싱 오류를 처리하여 사용자 친화적 결과를 반환한다.
- **매개변수**: `error` - ParseError 객체
- **반환값**: `ErrorResult` 객체
  - `userMessage: string` - 사용자용 메시지
  - `debugInfo: string` - 개발자용 디버그 정보
  - `errorCode: string` - 에러 코드
  - `severity: 'error' | 'warning'` - 심각도
  - **주의**: debugInfo에는 환자 식별 정보(PHI)를 포함하지 않아야 하며, 최종 사용자에게는 userMessage만 표시 권장

---

## 4. 내부 데이터 구조

### 4.1 ParseResult
```typescript
interface ParseResult {
  metadata: DICOMMetadata;
  voxelData: ArrayBuffer;
  errors: ErrorResult[];
  isValid: boolean;
}
```

### 4.2 ParseError
```typescript
interface ParseError {
  code: string;
  message: string;
  cause?: Error;
  tag?: [number, number];
}
```

### 4.3 ErrorResult
```typescript
interface ErrorResult {
  userMessage: string;
  debugInfo: string;
  errorCode: string;
  severity: 'error' | 'warning';
}
```
### 4.4 내부 헬퍼 타입
```typescript
// DICOM 태그 식별자
type DicomTag = [number, number]; // [Group, Element]

// 태그 읽기 결과
interface TagReadResult {
  tag: DicomTag;
  vr: string; // Value Representation
  length: number;
  value: unknown;
  offset: number;
}

// 파싱 컨텍스트 (파서 내부 상태)
interface ParseContext {
  buffer: ArrayBuffer;
  dataView: DataView;
  offset: number;
  isLittleEndian: boolean;
  isExplicitVR: boolean;
  transferSyntaxUID: string;
}
```

---

## 5. 처리 로직 / 알고리즘

### 5.1 전체 파싱 파이프라인
```
parseDICOM(file)
  |-> readFileAsArrayBuffer(file)
  |-> validateMagicByte(buffer)
  |     |-- 실패: PARSE_ERR_INVALID_MAGIC 반환
  |-> determineTransferSyntax(buffer)
  |-> validateTransferSyntax(uid)
  |     |-- 실패: PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX 반환
  |-> createParseContext(buffer, uid)
  |-> parseMetadata(buffer, context)
  |-> parsePixelData(buffer, metadata)
  |     |-- 실패: PARSE_ERR_PIXEL_DATA_EXTRACTION 반환
  |-> assembleParseResult(metadata, voxelData, errors)
  |-> return ParseResult
```

### 5.2 DICOM 태그 읽기 알고리즘
1. 현재 오프셋에서 4바이트 읽어 Group/Element 태그 식별
2. 전송 구문에 따라 VR(Value Representation) 읽기:
   - Explicit VR: 2바이트 VR 문자열 읽기
   - Implicit VR: VR을 사전에 정의된 맵에서 조회
3. 값 길이 읽기 (2바이트 또는 4바이트)
4. 값 읽기 (길이만큼)
5. 다음 태그로 오프셋 이동

### 5.3 바이트 오더(Byte Order) 처리
- Transfer Syntax UID에 따라 바이트 오더 결정
- Little Endian (기본): DataView의 littleEndian=true 설정
- Big Endian: DataView의 littleEndian=false 설정
- 바이트 오더는 ParseContext에 저장하여 일관성 유지

### 5.4 오류 복구 전략
- **필수 태그 누락**: PARSE_ERR_MISSING_REQUIRED_TAG 에러 발생, 파싱 중단
- **선택 태그 누락**: 기본값으로 대체, 경고(warning) 추가
- **알 수 없는 태그**: 건너뛰기 (길이만큼 오프셋 이동)
- **시퀀스 태그 (SQ)**: 중첩 깊이 제한 (최대 10레벨) 적용 후 건너뛰기

---

## 6. IEC 62304 Class A 준수 사항

### 6.1 소프트웨어 단위 검증 (단위 테스트)
- 모든 공개 인터페이스에 대한 단위 테스트 작성 필수
- Vitest 프레임워크 사용
- 테스트 커버리지 목표: 90% 이상
- 각 테스트 케이스는 추적성 매트릭스와 연결

### 6.2 이상 상태 처리 (Anomaly Handling)
- 모든 파싱 오류는 structured ErrorResult로 처리
- 예외(Exception)는 최상위 parseDICOM에서만 catch
- 내부 함수는 ParseError 객체를 생성하여 상위로 전달
- 오류 로그는 console.error로 출력 (디버그 모드에서만)
- **PHI 보호**: PatientID, PatientName 등 환자 식별 정보는 로깅하지 않으며, 디버그 출력 시 마스킹 처리 필요

### 6.3 변경 이력 관리
- 모든 인터페이스 변경은 문서에 반영
- Breaking Change 시 티켓 업데이트

---

## 7. 의존성 및 연관 관계

### 7.1 내부 의존성
| 컴포넌트 | 방향 | 설명 |
|----------|------|------|
| DataValidator | 단방향 (사용) | 파싱 결과의 유효성 검증 위임 |
| ErrorCodes (공유) | 양방향 (참조) | 공통 에러 코드 정의 |

### 7.2 외부 의존성
- **없음**: ADR-2에 따라 외부 DICOM 라이브러리 사용하지 않음
- 브라우저 내장 API만 사용 (FileReader, ArrayBuffer, DataView, TextDecoder)

### 7.3 아키텍처 매핑
```
Layer 1: Presentation Layer (UI)
    |
Layer 2: Application Layer
    |
Layer 3: Business Logic Layer
    |
Layer 4: Data Layer  <-- [COMP-1.1 DICOM 파일 파서]
    |                     [COMP-1.x DataValidator]
    v
  File System / Browser File API
```

---

## 8. 제약 사항 및 가정

### 8.1 제약 사항
- **단일 슬라이스 처리**: 현재 스펙은 단일 DICOM 파일(단일 슬라이스)만 처리
- **비압축 전송 구문만 지원**: JPEG, JPEG2000, RLE 등 압축 포맷은 지원하지 않음
- **최대 파일 크기**: 512MB (브라우저 메모리 제약)
- **최대 태그 수**: 10,000개 (무한 루프 방지)
- **시퀀스 중첩 깊이**: 최대 10레벨

### 8.2 가정
- 입력 DICOM 파일은 DICOM Part 10 형식을 따름
- 프리앰블은 항상 128바이트
- 메타데이터 그룹(0002,xxxx)은 명시적 VR을 사용
- 픽셀 데이터는 마지막 태그로 존재

### 8.3 위험 완화 매핑
| 위험 ID | 위험 설명 | 완화 조치 |
|---------|-----------|-----------|
| HAZ-1.1 | DICOM 파싱 오류로 영상 왜곡 | 모든 파싱 단계에 대한 검증 로직 포함, 단위 테스트로 검증 |
| HAZ-5.2 | 비표준 DICOM으로 기능 정지 | 지원하지 않는 전송 구문/태그는 graceful error 처리 |

---

## 9. 검증 기준 (Definition of Done)

- [ ] 모든 공개 인터페이스가 명세대로 구현됨
- [ ] 모든 User Scenario에 대한 단위 테스트 통과
- [ ] 테스트 커버리지 90% 이상 달성
- [ ] 유효한 DICOM 파일 파싱 성공
- [ ] 유효하지 않은 파일에 대한 오류 처리 확인
- [ ] IEC 62304 Class A 문서화 요건 충족
- [ ] 코드 리뷰 완료
- [ ] FR-1.1 ~ FR-1.5 추적성 매트릭스 연결 확인

---

## 10. 참조 문서

| 문서 | 설명 |
|------|------|
| SAD (PLAYG-1311) | 소프트웨어 아키텍처 설계서 |
| ADR-1 | Layered Architecture 4계층 10모듈 채택 |
| ADR-2 | 외부 라이브러리 없이 DICOM 파서 자체 구현 |
| DICOM PS3.5 | DICOM Data Structure and Encoding |
| DICOM PS3.10 | DICOM Media Storage and File Format |
| IEC 62304 | 의료기기 소프트웨어 생명주기 프로세스 |

---

*본 문서는 PLAYG-1375 티켓의 Feature Specification으로, IEC 62304 Class A 준수를 위해
작성되었습니다. 최종 업데이트: 2026-04-15*

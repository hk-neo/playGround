# [PLAYG-1816] SDS-1.1 DICOM 파서 상수 모듈(constants.js) 태스크 분할

## 메타 정보

| 항목 | 값 |
|------|------|
| 티켓 | PLAYG-1816 |
| 모듈 ID | SDS-1.1 |
| 파일 경로 | viewer/src/data/dicomParser/constants.js |
| IEC 62304 Class | Class A |
| 추적 | SAD COMP-1 (DicomParser) |

---

## Phase 1: 프로젝트 설정 (Setup)

### Task 1.1: 모듈 파일 생성
- **우선순위**: P0 (선행)
- **상태**: TODO
- **내용**:
  - viewer/src/data/dicomParser/constants.js 파일 생성
  - ES Module 형식으로 export 구조 설정
  - 파일 헤더에 모듈 ID(SDS-1.1)와 IEC 62304 Class A 주석 추가
- **검증**: 파일이 존재하고 import/export 구문이 파싱 에러 없이 동작
- **추적**: -

---

## Phase 2: 핵심 상수 정의 (Core)

### Task 2.1: DICOM 파일 구조 상수
- **우선순위**: P0
- **상태**: TODO
- **내용**:
  - PREAMBLE_LENGTH = 128 (FR-1.1)
  - DICOM_MAGIC_BYTE = "DICM" (FR-1.1)
  - MAGIC_BYTE_OFFSET = 128 (FR-1.1)
  - DICOM_MIN_FILE_SIZE = 132 (FR-1.6)
  - FILE_META_GROUP = 0x0002 (FR-2.1)
- **검증**: 각 상수 값이 DICOM 표준과 일치
- **추적**: FR-1.1, FR-1.6, FR-2.1

### Task 2.2: 안전 제한 상수
- **우선순위**: P0
- **상태**: TODO
- **내용**:
  - MAX_FILE_SIZE = 536870912 (512MB) (FR-1.4)
  - MAX_TAG_COUNT = 10000 (FR-2.4)
  - MAX_SEQUENCE_DEPTH = 10 (FR-2.5)
- **검증**: 값이 변경 불가능(immutable)하도록 export
- **추적**: FR-1.4, FR-2.4, FR-2.5, HAZ-1.4, HAZ-5.1, HAZ-5.2

### Task 2.3: 픽셀 데이터 태그
- **우선순위**: P0
- **상태**: TODO
- **내용**:
  - PIXEL_DATA_TAG = { group: 0x7FE0, element: 0x0010 } (FR-1.5)
- **검증**: group/element 값이 DICOM 태그 사전과 일치
- **추적**: FR-1.5

---

## Phase 3: 메타데이터 및 에러 정의 (Metadata)

### Task 3.1: 에러 코드 사전 (ERROR_CODES)
- **우선순위**: P0
- **상태**: TODO
- **내용**:
  - PARSE_ERR_INVALID_MAGIC = "PARSE_ERR_INVALID_MAGIC"
  - PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX = "PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX"
  - PARSE_ERR_MISSING_REQUIRED_TAG = "PARSE_ERR_MISSING_REQUIRED_TAG"
  - PARSE_ERR_PIXEL_DATA_EXTRACTION = "PARSE_ERR_PIXEL_DATA_EXTRACTION"
  - PARSE_ERR_FILE_READ = "PARSE_ERR_FILE_READ"
  - PARSE_ERR_FILE_TOO_LARGE = "PARSE_ERR_FILE_TOO_LARGE"
  - PARSE_ERR_UNEXPECTED = "PARSE_ERR_UNEXPECTED"
  - Object.freeze() 적용하여 불변 보장
- **검증**: 7종 에러 코드 모두 존재 및 문자열 값 일치
- **추적**: FR-5.1, HAZ-1.1~HAZ-1.4, HAZ-5.2

### Task 3.2: 에러 메시지 맵 (ERROR_MESSAGES)
- **우선순위**: P0
- **상태**: TODO
- **내용**:
  - 각 에러 코드별 ko/en 메시지 및 severity(error) 정의
  - 내부 구조(offset, tag hex, 버퍼 주소) 절대 노출 금지 (FR-4.5)
  - Object.freeze() 적용
- **검증**: 메시지에 내부 디버그 정보 미포함, ko/en 쌍 완비
- **추적**: FR-5.2, FR-4.5, HAZ-3.1

### Task 3.3: 메타데이터 태그 사전 (METADATA_TAGS)
- **우선순위**: P0
- **상태**: TODO
- **내용**:
  - 15개 태그 정의 (키: GGGGGEEE 형식)
  - 필수 태그(required: true): Rows, Columns, BitsAllocated, PixelRepresentation
  - 선택 태그(required: false): 나머지 11개 (기본값 포함)
  - Object.freeze() 적용
- **검증**: 필수 태그 4개 required=true 확인, 선택 태그 기본값 존재
- **추적**: FR-1.3, FR-2.3

### Task 3.4: 하위 호환 별칭
- **우선순위**: P1
- **상태**: TODO
- **내용**:
  - ErrorCodes = ERROR_CODES (@deprecated 별칭)
  - PARSE_ERR_MISSING_REQUIRED_TAG 개별 export
- **검증**: 별칭이 원본과 동일 참조
- **추적**: FR-5.1

---

## Phase 4: 단위 테스트 (Testing)

### Task 4.1: 기본 상수 값 검증 테스트
- **우선순위**: P0
- **상태**: TODO
- **내용**:
  - TC-1.1: PREAMBLE_LENGTH === 128
  - TC-1.2: DICOM_MAGIC_BYTE === "DICM"
  - TC-1.3: DICOM_MIN_FILE_SIZE === 132
  - TC-1.4: MAX_FILE_SIZE === 536870912 (512*1024*1024)
- **검증**: 4개 테스트 모두 통과
- **추적**: FR-1.1, FR-1.4, FR-1.6

### Task 4.2: 에러 코드 및 메시지 검증 테스트
- **우선순위**: P0
- **상태**: TODO
- **내용**:
  - TC-1.5: ERROR_CODES에 7종 에러 코드 존재 및 값 일치
  - TC-1.7: ERROR_MESSAGES에 7종 ko/en 메시지 존재
  - TC-1.8: ERROR_MESSAGES에 내부 구조 정보 미포함
- **검증**: 테스트 통과
- **추적**: FR-5.1, FR-5.2, FR-4.5

### Task 4.3: 메타데이터 태그 검증 테스트
- **우선순위**: P0
- **상태**: TODO
- **내용**:
  - TC-1.6: METADATA_TAGS에 필수 태그 존재 및 required=true
  - TC-1.9: 선택 태그에 기본값 존재
  - TC-1.10: PIXEL_DATA_TAG group/element 일치
- **검증**: 테스트 통과
- **추적**: FR-1.3, FR-1.5, FR-2.3

---

## Phase 5: 검수 및 리뷰 (Review)

### Task 5.1: IEC 62304 Class A 적합성 검토
- **우선순위**: P1
- **상태**: TODO
- **내용**:
  - 상수 모듈이 비즈니스 로직을 포함하지 않는지 확인
  - Object.freeze()로 불변성 보장 확인
  - 에러 메시지 보안(FR-4.5) 준수 확인
- **검증**: 코드 리뷰 승인
- **추적**: IEC 62304 Class A

### Task 5.2: 소비 모듈 연동 검증
- **우선순위**: P1
- **상태**: TODO
- **내용**:
  - parseDICOM.js에서 ERROR_CODES, MAX_FILE_SIZE import 가능
  - validateMagicByte.js에서 MAGIC_BYTE_OFFSET, DICOM_MAGIC_BYTE import 가능
  - metadataParser.js에서 METADATA_TAGS, MAX_TAG_COUNT import 가능
  - handleParseError.js에서 ErrorCodes, ERROR_MESSAGES import 가능
  - tagReader.js에서 MAX_TAG_COUNT, MAX_SEQUENCE_DEPTH import 가능
- **검증**: 기존 소비 모듈의 import 구문 정상 동작
- **추적**: -

---

## 태스크 요약

| Phase | 태스크 수 | P0 | P1 |
|-------|----------|----|----|
| Phase 1: Setup | 1 | 1 | 0 |
| Phase 2: Core | 3 | 3 | 0 |
| Phase 3: Metadata | 4 | 3 | 1 |
| Phase 4: Testing | 3 | 3 | 0 |
| Phase 5: Review | 2 | 0 | 2 |
| **합계** | **13** | **10** | **3** |
# [SDS-1.1] DICOM 파서 상수 모듈(constants.js) 상세 설계 명세서

**프로젝트**: DentiView3D - 웹 기반 CBCT 영상 뷰어  
**버전**: 0.1.0 | **작성일**: 2026-04-26  
**추적 티켓**: PLAYG-1816  
**소프트웨어 안전 등급**: IEC 62304 Class A  
**소스 파일**: viewer/src/data/dicomParser/constants.js  
**관련 요구사항**: FR-1.1, FR-1.2, FR-1.3, FR-1.4, FR-1.5, FR-1.6, FR-2.4, FR-2.5, FR-5.1, FR-5.2, FR-4.5  
**추적**: SAD COMP-1 (DicomParser) | PLAYG-1815 (SDS Document) | IEC 62304 Class A

---

## 1. User Scenarios & Testing

### 1.1 사용자 시나리오

| 시나리오 ID | 사용자 스토리 | 우선순위 | 추적 FR |
|---|---|---|---|
| US-1.1 | DICOM 파일을 열면 파서가 프리앰블 128바이트와 매직 바이트 DICM을 올바르게 인식하여 파일 유효성을 검사할 수 있어야 한다 | P1 | FR-1.1 |
| US-1.2 | 132바이트 미만의 손상된 파일을 열면 파서가 즉시 거부하고 안전한 에러 메시지를 표시해야 한다 | P1 | FR-1.6 |
| US-1.3 | 512MB 초과 파일을 선택하면 메모리 로딩 전에 파일 크기 검증이 수행되어 브라우저 크래시를 방지해야 한다 | P1 | FR-1.4 |
| US-1.4 | 악의적 또는 손상된 DICOM 파일에서 무한 태그 순회나 과도한 시퀀스 중첩이 발생하면 파서가 안전하게 중단되어야 한다 | P1 | FR-2.4, FR-2.5 |
| US-1.5 | 필수 메타데이터 태그(Rows, Columns, BitsAllocated, PixelRepresentation)가 누락된 파일은 파싱이 실패하고 명확한 에러 메시지가 표시되어야 한다 | P1 | FR-1.3 |
| US-1.6 | 선택적 메타데이터 태그가 누락된 파일은 기본값으로 대체되어 파싱이 중단 없이 계속되어야 한다 | P2 | FR-2.3 |
| US-1.7 | 파일 파싱 실패 시 에러 메시지는 내부 구조(offset, tag hex)를 노출하지 않고 사용자 친화적으로 표시되어야 한다 | P1 | FR-4.5, FR-5.2 |
| US-1.8 | 기존 코드에서 ErrorCodes 별칭으로 import하는 하위 호환성이 유지되어야 한다 | P2 | FR-5.1 |
| US-1.9 | 7종 에러 코드가 모두 정의되어 있어 파서 전체에서 일관된 에러 식별이 가능해야 한다 | P1 | FR-5.1 |
| US-1.10 | 픽셀 데이터 태그(7FE0,0010)가 정확히 정의되어 픽셀 데이터 추출 시 올바르게 식별되어야 한다 | P1 | FR-1.5 |
### 1.2 단위 테스트 항목

테스트 파일: viewer/tests/unit.test.js (Vitest 프레임워크)

| 테스트 ID | 테스트명 | 검증 내용 | 우선순위 | 추적 |
|---|---|---|---|---|
| TC-1.1 | PREAMBLE_LENGTH는 128이어야 한다 | expect(PREAMBLE_LENGTH).toBe(128) | P1 | FR-1.1, US-1.1 |
| TC-1.2 | DICOM_MAGIC_BYTE는 DICM이어야 한다 | expect(DICOM_MAGIC_BYTE).toBe("DICM") | P1 | FR-1.1, US-1.1 |
| TC-1.3 | DICOM_MIN_FILE_SIZE는 132이어야 한다 | expect(DICOM_MIN_FILE_SIZE).toBe(132) | P1 | FR-1.6, US-1.2 |
| TC-1.4 | MAX_FILE_SIZE는 512MB이어야 한다 | expect(MAX_FILE_SIZE).toBe(512*1024*1024) | P1 | FR-1.4, US-1.3 |
| TC-1.5 | ERROR_CODES에 필수 7종 에러 코드가 모두 포함되어야 한다 | PARSE_ERR_INVALID_MAGIC, PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX, PARSE_ERR_MISSING_REQUIRED_TAG, PARSE_ERR_PIXEL_DATA_EXTRACTION, PARSE_ERR_FILE_READ, PARSE_ERR_FILE_TOO_LARGE, PARSE_ERR_UNEXPECTED 존재 및 값 일치 확인 | P1 | FR-5.1, US-1.9 |
| TC-1.6 | METADATA_TAGS에 필수 태그가 포함되고 required=true이어야 한다 | Rows(00280010), Columns(00280011), BitsAllocated(00280100), PixelRepresentation(00280103) 존재 및 required=true 확인 | P1 | FR-1.3, US-1.5 |
| TC-1.7 | MAGIC_BYTE_OFFSET은 PREAMBLE_LENGTH와 동일해야 한다 | expect(MAGIC_BYTE_OFFSET).toBe(PREAMBLE_LENGTH) | P1 | FR-1.1, US-1.1 |
| TC-1.8 | MAX_TAG_COUNT는 10000이어야 한다 | expect(MAX_TAG_COUNT).toBe(10000) | P1 | FR-2.4, US-1.4 |
| TC-1.9 | MAX_SEQUENCE_DEPTH는 10이어야 한다 | expect(MAX_SEQUENCE_DEPTH).toBe(10) | P1 | FR-2.5, US-1.4 |
| TC-1.10 | FILE_META_GROUP은 0x0002이어야 한다 | expect(FILE_META_GROUP).toBe(0x0002) | P1 | FR-2.1 |
| TC-1.11 | PIXEL_DATA_TAG의 group과 element가 올바른지 확인 | group=0x7FE0, element=0x0010 | P1 | FR-1.5, US-1.10 |
| TC-1.12 | ErrorCodes는 ERROR_CODES의 별칭이어야 한다 | expect(ErrorCodes).toBe(ERROR_CODES) | P2 | FR-5.1, US-1.8 |
| TC-1.13 | PARSE_ERR_MISSING_REQUIRED_TAG 개별 export 값 확인 | expect(PARSE_ERR_MISSING_REQUIRED_TAG).toBe("PARSE_ERR_MISSING_REQUIRED_TAG") | P1 | FR-1.3 |
| TC-1.14 | ERROR_MESSAGES에 7종 에러 메시지의 ko/en/severity 필드가 모두 존재해야 한다 | 각 에러 코드별로 ko, en, severity 키 존재 확인 | P1 | FR-5.2, US-1.7 |
| TC-1.15 | METADATA_TAGS 선택 태그의 기본값이 올바른지 확인 | bitsStored=16, windowCenter=40, windowWidth=400, sliceThickness=0, pixelSpacing=[1,1], photometricInterpretation="MONOCHROME2", samplesPerPixel=1 | P2 | FR-2.3, US-1.6 |
| TC-1.16 | ERROR_MESSAGES에 내부 구조 정보가 포함되지 않았는지 확인 | 각 메시지 문자열에 offset, tag, hex, buffer, 0x 패턴이 없는지 검증 | P1 | FR-4.5, US-1.7 |
---

## 2. Requirements

### 2.1 모듈 개요

는 DICOM 파서 전체에서 사용하는 **모든 상수**를 중앙 집중식으로 정의하는 모듈이다. 매직 바이트 오프셋, 파일 크기 제한, 에러 코드, 에러 메시지 맵, 필수/선택 메타데이터 태그 사전을 포함한다. IEC 62304 Class A의 **단일 책임 원칙**에 따라 상수 정의만을 담당하며, 비즈니스 로직을 포함하지 않는다.

| 항목 | 설명 |
|---|---|
| 모듈 ID | SDS-1.1 |
| 파일 경로 | viewer/src/data/dicomParser/constants.js |
| 의존 모듈 | 없음 (최하위 모듈) |
| 소비 모듈 | parseDICOM.js, validateMagicByte.js, metadataParser.js, pixelDataParser.js, handleParseError.js, tagReader.js, metaGroupParser.js |
| export 개수 | 13개 (상수 9, 객체 3, 별칭 1) |

### 2.2 기능 요구사항 (FR)

| 요구사항 ID | 명칭 | 상세 설명 | 우선순위 | 추적 |
|---|---|---|---|---|
| FR-CST-01 | 프리앰블 길이 상수 | PREAMBLE_LENGTH는 128이어야 하며, DICOM 파일 프리앰블 바이트 길이를 정의한다 | 필수 | FR-1.1 |
| FR-CST-02 | 매직 바이트 시그니처 | DICOM_MAGIC_BYTE는 DICM 문자열이어야 하며, DICOM 파일 시그니처를 정의한다 | 필수 | FR-1.1 |
| FR-CST-03 | 매직 바이트 오프셋 | MAGIC_BYTE_OFFSET은 128이어야 하며, PREAMBLE_LENGTH와 동일값이다 | 필수 | FR-1.1 |
| FR-CST-04 | 최소 파일 크기 | DICOM_MIN_FILE_SIZE는 132이어야 하며, 프리앰블(128) + 매직바이트(4)의 합이다 | 필수 | FR-1.6 |
| FR-CST-05 | 최대 파일 크기 | MAX_FILE_SIZE는 536870912(512MB)이어야 하며, 브라우저 메모리 과부하를 방지한다 | 필수 | FR-1.4, NFR-3 |
| FR-CST-06 | 최대 태그 순회 수 | MAX_TAG_COUNT는 10000이어야 하며, 무한 태그 순회를 방지한다 | 필수 | FR-2.4 |
| FR-CST-07 | 최대 시퀀스 중첩 깊이 | MAX_SEQUENCE_DEPTH는 10이어야 하며, 스택 오버플로우를 방지한다 | 필수 | FR-2.5 |
| FR-CST-08 | 파일 메타 그룹 번호 | FILE_META_GROUP은 0x0002이어야 하며, 파일 메타 정보 그룹 번호를 정의한다 | 필수 | FR-2.1 |
| FR-CST-09 | 픽셀 데이터 태그 식별자 | PIXEL_DATA_TAG은 {group: 0x7FE0, element: 0x0010}이어야 하며, 픽셀 데이터 태그를 식별한다 | 필수 | FR-1.5 |
| FR-CST-10 | 에러 코드 사전 | ERROR_CODES는 7종 에러 코드 문자열을 포함하는 동결된(frozen) 객체여야 한다 | 필수 | FR-5.1 |
| FR-CST-11 | 에러 코드 별칭 | ErrorCodes는 ERROR_CODES의 @deprecated 별칭이어야 하며 하위 호환성을 유지한다 | 보통 | FR-5.1 |
| FR-CST-12 | 개별 에러 코드 export | PARSE_ERR_MISSING_REQUIRED_TAG는 ERROR_CODES.PARSE_ERR_MISSING_REQUIRED_TAG와 동일한 문자열이어야 한다 | 필수 | FR-1.3 |
| FR-CST-13 | 에러 메시지 맵 | ERROR_MESSAGES는 7종 에러 코드별로 ko, en, severity 필드를 포함하는 객체여야 한다 | 필수 | FR-5.2 |
| FR-CST-14 | 에러 메시지 보안 | ERROR_MESSAGES의 모든 메시지는 내부 파일 구조(offset, tag hex, 버퍼 주소)를 포함하지 않아야 한다 | 필수 | FR-4.5 |
| FR-CST-15 | 메타데이터 태그 사전 | METADATA_TAGS는 15개 필드를 포함하며, 각 필드는 field, name, required, defaultValue 속성을 가져야 한다 | 필수 | FR-2.3 |
| FR-CST-16 | 필수 태그 기본값 제외 | METADATA_TAGS에서 required=true인 태그는 defaultValue를 가지지 않아 누락 시 즉시 에러가 발생하도록 설계되어야 한다 | 필수 | FR-1.3 |

### 2.3 Export 상수 목록

| Export 명 | 유형 | 값 | 추적 FR | 설명 |
|---|---|---|---|---|
| PREAMBLE_LENGTH | number | 128 | FR-1.1 | DICOM 프리앰블 길이 (바이트) |
| DICOM_MAGIC_BYTE | string | DICM | FR-1.1 | DICOM 매직 바이트 시그니처 |
| MAGIC_BYTE_OFFSET | number | 128 | FR-1.1 | 매직 바이트 시작 오프셋 (PREAMBLE_LENGTH와 동일) |
| DICOM_MIN_FILE_SIZE | number | 132 | FR-1.6 | 최소 DICOM 파일 크기 (프리앰블 128 + 매직 4) |
| MAX_FILE_SIZE | number | 536870912 (512MB) | FR-1.4 | 최대 파일 크기 - 브라우저 메모리 제약 |
| MAX_TAG_COUNT | number | 10000 | FR-2.4 | 최대 태그 순회 수 - 무한 루프 방지 (HAZ-5.1) |
| MAX_SEQUENCE_DEPTH | number | 10 | FR-2.5 | 최대 시퀀스 중첩 깊이 (HAZ-5.2) |
| FILE_META_GROUP | number | 0x0002 | FR-2.1 | 파일 메타 정보 그룹 번호 |
| PIXEL_DATA_TAG | Object | {group: 0x7FE0, element: 0x0010} | FR-1.5 | 픽셀 데이터 태그 식별자 |
| ERROR_CODES | Object | 7종 에러 코드 문자열 | FR-5.1 | 파싱 에러 코드 사전 |
| ErrorCodes | Object | ERROR_CODES 별칭 | FR-5.1 | 하위 호환용 별칭 (@deprecated) |
| PARSE_ERR_MISSING_REQUIRED_TAG | string | PARSE_ERR_MISSING_REQUIRED_TAG | FR-1.3 | 개별 에러 코드 export |
| ERROR_MESSAGES | Object | 7종 에러 메시지 (ko/en/severity) | FR-5.2 | 에러 코드별 다국어 메시지 맵 |
### 2.4 데이터 구조 상세

#### 2.4.1 ERROR_CODES 객체

7종 구조화된 에러 코드 (FR-5.1, HAZ-1.1, HAZ-5.2):

| 키 | 값 | 의미 | 추적 |
|---|---|---|---|
| PARSE_ERR_INVALID_MAGIC | PARSE_ERR_INVALID_MAGIC | 매직 바이트 불일치 | FR-1.1, HAZ-1.1 |
| PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX | PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX | 미지원 전송 구문 | FR-1.2, HAZ-1.2 |
| PARSE_ERR_MISSING_REQUIRED_TAG | PARSE_ERR_MISSING_REQUIRED_TAG | 필수 태그 누락 | FR-1.3, HAZ-1.3 |
| PARSE_ERR_PIXEL_DATA_EXTRACTION | PARSE_ERR_PIXEL_DATA_EXTRACTION | 픽셀 데이터 추출 실패 | FR-1.5 |
| PARSE_ERR_FILE_READ | PARSE_ERR_FILE_READ | 파일 읽기 실패 | FR-1.7 |
| PARSE_ERR_FILE_TOO_LARGE | PARSE_ERR_FILE_TOO_LARGE | 파일 크기 초과 | FR-1.4, HAZ-1.4 |
| PARSE_ERR_UNEXPECTED | PARSE_ERR_UNEXPECTED | 예기치 않은 오류 | FR-5.1 |

> **설계 결정**: 에러 코드를 문자열 상수로 정의하여 코드 가독성과 디버깅 편의성을 확보했다. enum 대신 객체 리터럴을 사용한 것은 Class A 단순성 요구와 ES 모듈 호환성을 고려한 것이다.

#### 2.4.2 ERROR_MESSAGES 객체

에러 코드별 한국어/영어 메시지와 심각도 (FR-5.2, FR-4.5):

| 에러 코드 | 한국어 메시지 | 영어 메시지 | 심각도 |
|---|---|---|---|
| PARSE_ERR_INVALID_MAGIC | 유효한 DICOM 파일이 아닙니다. | Not a valid DICOM file. | error |
| PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX | 지원하지 않는 전송 구문입니다. | Unsupported transfer syntax. | error |
| PARSE_ERR_MISSING_REQUIRED_TAG | 필수 DICOM 태그가 누락되었습니다. | Missing required DICOM tag. | error |
| PARSE_ERR_PIXEL_DATA_EXTRACTION | 픽셀 데이터 추출에 실패했습니다. | Failed to extract pixel data. | error |
| PARSE_ERR_FILE_READ | 파일 읽기에 실패했습니다. | Failed to read file. | error |
| PARSE_ERR_FILE_TOO_LARGE | 파일 크기가 제한을 초과했습니다. | File size exceeds limit. | error |
| PARSE_ERR_UNEXPECTED | 예기치 않은 오류가 발생했습니다. | Unexpected error occurred. | error |

> **설계 결정**: 모든 메시지는 내부 구조(offset, tag 등)를 노출하지 않도록 설계되었다 (FR-4.5). 내부 디버그 정보는 development 모드에서만 handleParseError를 통해 별도 제공된다.

#### 2.4.3 METADATA_TAGS 객체

필수/선택 메타데이터 태그 사전 (FR-1.3, FR-2.3). 키는 makeTagKey 출력 형식(GGGGEEEE):

| 태그 키 | 필드명 | 태그명 | 필수 | 기본값 |
|---|---|---|---|---|
| 00100010 | patientName | PatientName | false | (빈 문자열) |
| 00100020 | patientID | PatientID | false | (빈 문자열) |
| 0020000D | studyInstanceUID | StudyInstanceUID | false | (빈 문자열) |
| 0020000E | seriesInstanceUID | SeriesInstanceUID | false | (빈 문자열) |
| 00280010 | rows | Rows | **true** | 없음 |
| 00280011 | columns | Columns | **true** | 없음 |
| 00280100 | bitsAllocated | BitsAllocated | **true** | 없음 |
| 00280101 | bitsStored | BitsStored | false | 16 |
| 00280103 | pixelRepresentation | PixelRepresentation | **true** | 없음 |
| 00281050 | windowCenter | WindowCenter | false | 40 |
| 00281051 | windowWidth | WindowWidth | false | 400 |
| 00180050 | sliceThickness | SliceThickness | false | 0 |
| 00280030 | pixelSpacing | PixelSpacing | false | [1, 1] |
| 00280004 | photometricInterpretation | PhotometricInterpretation | false | MONOCHROME2 |
| 00280002 | samplesPerPixel | SamplesPerPixel | false | 1 |

> **설계 결정**: 필수 태그(required: true)에 기본값을 두지 않아 누락 시 즉시 에러(PARSE_ERR_MISSING_REQUIRED_TAG)가 발생하도록 안전 장치를 적용했다. 선택 태그는 기본값을 제공하여 파싱이 중단되지 않도록 한다.
### 2.5 소비 모듈별 사용 매핑

| 소비 모듈 | 사용 상수 | 용도 |
|---|---|---|
| validateMagicByte.js | MAGIC_BYTE_OFFSET, DICOM_MAGIC_BYTE | 오프셋 128에서 4바이트 DICM 비교 |
| parseDICOM.js | ERROR_CODES, MAX_FILE_SIZE | 파일 크기 사전 검증 및 에러 코드 할당 |
| metadataParser.js | METADATA_TAGS, MAX_TAG_COUNT, PIXEL_DATA_TAG, DICOM_MIN_FILE_SIZE, ERROR_CODES, PARSE_ERR_MISSING_REQUIRED_TAG | 태그 순회 루프 제한, 필수 태그 검증 |
| pixelDataParser.js | ERROR_CODES, MAX_FILE_SIZE | 픽셀 데이터 추출 에러 처리 |
| handleParseError.js | ErrorCodes(별칭), ERROR_MESSAGES | 에러 코드 -> 다국어 메시지 매핑 |
| tagReader.js | MAX_TAG_COUNT, MAX_SEQUENCE_DEPTH | 무한 루프/과도한 중첩 방지 |
| metaGroupParser.js | PREAMBLE_LENGTH, FILE_META_GROUP | 메타 그룹 시작 오프셋 계산 |

---

## 3. Success Criteria

### 3.1 안전성 설계 기준 (IEC 62304 Class A)

#### 3.1.1 방어적 상수 설계

- **MAX_FILE_SIZE (512MB)**: 브라우저 메모리 과부하 방지. FileReader.readAsArrayBuffer 호출 전 file.size와 비교하여 메모리 로딩 자체를 차단 (FR-1.4, HAZ-1.4, NFR-3).
- **MAX_TAG_COUNT (10000)**: 악의적/손상된 DICOM 파일의 무한 태그 순회 방지. 메타데이터 파싱 루프의 상한선 역할 (FR-2.4, HAZ-5.1).
- **MAX_SEQUENCE_DEPTH (10)**: 시퀀스 태그(SQ)의 과도한 중첩으로 인한 스택 오버플로우 방지 (FR-2.5, HAZ-5.2).
- **DICOM_MIN_FILE_SIZE (132)**: 최소 파일 크기 미만 버퍼에 대한 조기 검증으로 DataView 범위 초과 읽기 원천 차단 (FR-1.6, HAZ-1.1).

#### 3.1.2 에러 메시지 보안

ERROR_MESSAGES의 모든 메시지는 사용자 친화적이며, 내부 파일 구조(offset, tag hex, 버퍼 주소)를 절대 포함하지 않는다 (FR-4.5, HAZ-3.1). 내부 디버그 정보는 NODE_ENV=development 환경에서만 handleParseError에 의해 추가된다.

#### 3.1.3 하위 호환성

- ErrorCodes는 ERROR_CODES의 @deprecated 별칭이다. 기존 import 구문 호환성 유지.
- PARSE_ERR_MISSING_REQUIRED_TAG 개별 export는 metadataParser.js의 직접 참조를 지원.

### 3.2 수용 기준

| 기준 ID | 수용 기준 | 검증 방법 | 우선순위 |
|---|---|---|---|
| AC-1.1 | 모든 13개 export가 올바른 값으로 정의되어 있다 | TC-1.1 ~ TC-1.13 단위 테스트 통과 | P1 |
| AC-1.2 | ERROR_MESSAGES의 7종 에러 메시지에 내부 구조 정보가 포함되지 않는다 | TC-1.16 단위 테스트 통과 | P1 |
| AC-1.3 | METADATA_TAGS의 필수 태그 4개가 required=true로 정의되어 있다 | TC-1.6 단위 테스트 통과 | P1 |
| AC-1.4 | METADATA_TAGS의 선택 태그 11개가 올바른 기본값을 가진다 | TC-1.15 단위 테스트 통과 | P2 |
| AC-1.5 | ErrorCodes 별칭이 ERROR_CODES와 동일한 참조를 가리킨다 | TC-1.12 단위 테스트 통과 | P2 |
| AC-1.6 | 모듈에 비즈니스 로직이 포함되지 않고 상수 정의만 존재한다 | 코드 리뷰 | P1 |
| AC-1.7 | 모든 상수가 SRS FR 요구사항과 양방향 추적 가능하다 | 추적성 매트릭스 검증 | P1 |

### 3.3 추적성 매트릭스

| 본 명세 ID | SRS FR | Hazard | 테스트 ID |
|---|---|---|---|
| FR-CST-01 | FR-1.1 | HAZ-1.1 (PLAYG-1496) | TC-1.1 |
| FR-CST-02 | FR-1.1 | HAZ-1.1 (PLAYG-1496) | TC-1.2 |
| FR-CST-03 | FR-1.1 | HAZ-1.1 (PLAYG-1496) | TC-1.7 |
| FR-CST-04 | FR-1.6 | HAZ-1.1 (PLAYG-1496) | TC-1.3 |
| FR-CST-05 | FR-1.4 | HAZ-1.4 (PLAYG-1499) | TC-1.4 |
| FR-CST-06 | FR-2.4 | HAZ-5.1 (PLAYG-1510) | TC-1.8 |
| FR-CST-07 | FR-2.5 | HAZ-5.2 (PLAYG-1511) | TC-1.9 |
| FR-CST-08 | FR-2.1 | HAZ-1.2 (PLAYG-1497) | TC-1.10 |
| FR-CST-09 | FR-1.5 | HAZ-1.5 (PLAYG-1500) | TC-1.11 |
| FR-CST-10 | FR-5.1 | HAZ-1.1 (PLAYG-1496) | TC-1.5 |
| FR-CST-11 | FR-5.1 | - | TC-1.12 |
| FR-CST-12 | FR-1.3 | HAZ-1.3 (PLAYG-1498) | TC-1.13 |
| FR-CST-13 | FR-5.2 | HAZ-1.1 (PLAYG-1496) | TC-1.14 |
| FR-CST-14 | FR-4.5 | HAZ-3.1 (PLAYG-1505) | TC-1.16 |
| FR-CST-15 | FR-2.3 | HAZ-1.3 (PLAYG-1498) | TC-1.6, TC-1.15 |
| FR-CST-16 | FR-1.3 | HAZ-1.3 (PLAYG-1498) | TC-1.6 |

---

## 4. 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|---|---|---|---|
| 0.1.0 | 2026-04-26 | 최초 상세 설계 명세 작성 | AutoDevAgent |
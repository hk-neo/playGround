# Feature Specification: [ADR-2] DICOM 파서 자체 구현

**Feature Branch**: `PLAYG-1371-dicom-parser-impl`
**Status**: Draft | **Date**: 2026-04-14
**Ticket**: `PLAYG-1371` | **Type**: Architecture
**Input**: SAD(PLAYG-1311)

---

## 1. 개요

### 1.1 목적
본 문서는 PLAYG-1371 [ADR-2] DICOM 파서 자체 구현 틹윓의 실행 명세서이다.
SAD(PLAYG-1311)에서 결정한 ADR-2(DICOM 파서 자체 구현) 아키텍처 결정을
실제 코드로 구현하기 위한 작업 범위, 사용자 스토리, 요구사항, 완료 기준을 정의한다.
외부 DICOM 라이브러리(daikon.js, dicomParser 등)에 대한 의존을 제거하고,
CBCT Viewer에 필요한 최소한의 DICOM 파싱 기능을 자체 구현하는 것을 목적으로 한다.

### 1.2 배경
- SAD(PLAYG-1311) 7.3절 ADR-2에서 DICOM 파서 자체 구현을 아키텍처 결정으로 채택
- SDS(PLAYG-1312) SDS-3.1 DICOMParser(COMP-1.1), SDS-3.2 DataValidator(COMP-1.2) 상세 설계 완료
- SRS(PLAYG-1310) FR-5.4 서드파티 라이브러리 보안 감사 요구사항 수용
- HAZ-3.1 외부 통신 차단 요구사항 수용
- PLAYG-1370(ADR-1 기초 공사) 프로젝트 뾼대 및 모듈 스캐레톤 생성 완료
### 1.3 ADR-2 결정 요약

| 항목 | 내용 |
|------|------|
| 문제 상황 | 외부 DICOM 라이브러리 의존 시 보안 감사 부담 및 외부 통신 코드 포함 위험 |
| 대안 검토 | daikon.js, dicomParser(cornerstone), 자체 구현 |
| 최종 선택 | 자체 구현 |
| 근거 | FR-5.4 보안 감사, HAZ-3.1 외부 통신 차단, SBOM 관리 용이 |
| 영향 범위 | DICOMParser(COMP-1.1), DataValidator(COMP-1.2) |

### 1.4 대안 분석

| 대안 | 장점 | 단점 | 평가 |
|------|------|------|------|
| daikon.js | 기능 풍부, 검증됨 | 보안 감사 부담, 외부 통신 위험, 큼들 크기 | 기각 |
| dicomParser | 의료영상 표준 | 외부 의존성, 보안 감사 필요 | 기각 |
| 자체 구현 | 보안 감사 최소화, SBOM 단순 | 개발 공수, 표준 준수 검증 | 채택 |

### 1.5 자체 구현 범위

| 항목 | 포함 | 비고 |
|------|------|------|
| DICOM Part 10 형식 파싱 | 포함 | 프리엠블 + DICM + 메타헤더 + 데이터셋 |
| 명시적 VR LE (1.2.840.10008.1.2.1) | 포함 | 기본 |
| 암시적 VR LE (1.2.840.10008.1.2) | 포함 | 기본 |
| Big Endian (1.2.840.10008.1.2.2) | 포함 | 읽기 전용 |
| JPEG/JPEG2000/RLE 압축 해제 | 제외 | 후속 단계 |

### 1.6 지원 VR (Value Representation)

| VR | 이름 | 설명 |
|----|------|------|
| US | Unsigned Short | 부호 없는 16비트 정수 |
| SS | Signed Short | 부호 있는 16비트 정수 |
| UL | Unsigned Long | 부호 없는 32비트 정수 |
| SL | Signed Long | 부호 있는 32비트 정수 |
| FL | Float Single | 32비트 부동소수점 |
| FD | Float Double | 64비트 북동소수점 |
| DS | Decimal String | 십진수 문자열 |
| IS | Integer String | 정수 문자열 |
| LO | Long String | 김 문자열(최대 64자) |
| SH | Short String | 짧은 문자열(최대 16자) |
| PN | Person Name | 사람 이름 |
| UI | Unique Identifier | UID |
| CS | Code String | 코드 문자열 |
| DA | Date | 날짜 |
| TM | Time | 시간 |
| DT | Date Time | 날짜 시간 |
| SQ | Sequence of Items | 항목 시퀀스 |
| OW | Other Word | 기타 워드 데이터 |
| OB | Other Byte | 기타 바이트 데이터 |
| UN | Unknown | 알 수 없는 VR |

### 1.7 참조 문서

| 문서 | 틹윓 | 설명 |
|------|------|------|
| SAD | PLAYG-1311 | 아키텍처 명세서 (ADR-2 결정) |
| SDS | PLAYG-1312 | 상세 설계 (DICOMParser, DataValidator) |
| SRS | PLAYG-1310 | 요구사항 명세서 |
| 기초 공사 Spec | PLAYG-1370 | ADR-1 기초 공사 명세서 |
| Dev Plan | PLAYG-1231 | 개발 계획서 |
---

## 2. User Scenarios & Testing

### User Story 1 -- DICOM Part 10 파일 파서 코어 구현 (Priority: P1) MVP
- **설명**: DICOM Part 10 파일(프리엠블 128바이트 + DICM 매짝 바이트 + 파일 메타헤더 + 데이터셋)을 파싱하는 코어 엔진을 구현한다.
- **Why this priority**: 모든 DICOM 파싱의 기반, 다른 모든 스토리의 전제 조건
- **Independent Test**: 최소 DICOM Part 10 파일 입력 시 Transfer Syntax UID를 정확히 읽어오는지 단위 테스트 검증
- **Acceptance Scenarios**:
  1. **Given** 유효한 DICOM Part 10 파일, **When** parseDICOM() 호출, **Then** 프리엠블 건너뛰고 DICM 확인 후 메타헤더 파싱
  2. **Given** DICM 매짝 바이트 없는 파일, **When** validateMagicByte() 호출, **Then** false 반환
  3. **Given** 지원하지 않는 전송 구문(JPEG 압축), **When** validateTransferSyntax() 호출, **Then** 오류 반환

### User Story 2 -- 전송 구문 파서 (명시적/암시적 VR) (Priority: P1) MVP
- **설명**: 명시적 VR LE(1.2.840.10008.1.2.1)와 암시적 VR LE(1.2.840.10008.1.2) 데이터 요소 파싱 구현
- **Why this priority**: CBCT 영상 대부분이 비압축 LE 전송 구문 사용
- **Independent Test**: 각 전송 구문 테스트 데이터로 태그/요소, VR, 길이, 값 파싱 검증
- **Acceptance Scenarios**:
  1. **Given** 명시적 VR LE 데이터 요소, **When** parseDataElement() 호출, **Then** 태그, VR, 길이, 값 정확히 파싱
  2. **Given** 암시적 VR LE 데이터 요소, **When** parseDataElement() 호출, **Then** VR 없이 파싱, VR은 데이터 사전 조회
  3. **Given** 알 수 없는 태그, **When** 파싱, **Then** 에러 발생 없이 UN VR로 처리

### User Story 3 -- Big Endian 전송 구문 지원 (읽기 전용) (Priority: P2)
- **설명**: Big Endian(1.2.840.10008.1.2.2) DICOM 파일 읽기 지원
- **Why this priority**: DEPRECATED지만 레거시 파일 호환성 필요
- **Independent Test**: Big Endian 테스트 데이터로 바이트 오더 변환 검증
- **Acceptance Scenarios**:
  1. **Given** Big Endian DICOM 파일, **When** parseDICOM() 호출, **Then** 비그 엔디언 바이트 오더로 모든 요소 파싱
  2. **Given** Big Endian 멀티바이트 값, **When** 읽기, **Then** 올바른 바이트 스와핑 수행

### User Story 4 -- DICOM 메타데이터 추출 (Priority: P1) MVP
- **설명**: CBCT 영상 필수 DICOM 태그를 추출하여 DICOMMetadata 타입 반환
- **Why this priority**: 메타데이터 없이는 렌더링, 측정, 검증 불가
- **Independent Test**: 알려진 태그값 테스트 데이터로 DICOMMetadata 필드 검증
- **Acceptance Scenarios**:
  1. **Given** 환자 정보 태그 포함 파일, **When** parseMetadata() 호출, **Then** patientName, patientID 필드 정확히 채월
  2. **Given** 영상 파라미터 태그 포함 파일, **When** parseMetadata() 호출, **Then** PixelSpacing, SliceThickness 파싱
  3. **Given** 필수 태그 누락 파일, **When** parseMetadata() 호출, **Then** 누락 태그 목록을 errors 배열에 포함

### User Story 5 -- 픽셀 데이터 추출 및 복셀 데이터 변환 (Priority: P1) MVP
- **설명**: DICOM 픽셀 데이터 태그(7FE0,0010)를 추출하여 BitsAllocated에 따른 TypedArray로 변환
- **Why this priority**: 영상 렌더링 핵심 입력 데이터
- **Independent Test**: 알려진 픽셀값 테스트 데이터로 복셀 데이터 추출 검증
- **Acceptance Scenarios**:
  1. **Given** 16비트 BitsAllocated 픽셀 데이터(OW), **When** parsePixelData() 호출, **Then** Int16Array/Uint16Array로 해석
  2. **Given** 8비트 BitsAllocated 픽셀 데이터(OB), **When** parsePixelData() 호출, **Then** Uint8Array로 해석
  3. **Given** 픽셀 데이터 태그 누락, **When** parsePixelData() 호출, **Then** ParseError 발생
### User Story 6 -- DataValidator 검증 로직 구현 (Priority: P1) MVP
- **설명**: DataValidator로 DICOM 헤더 검증, PixelSpacing 검증, 복셀값 범위 검증, 축방향 검증 수행
- **Why this priority**: HAZ-1.1(DICOM 파싱 오류 영상 웄곡) 완화를 위해 데이터 검증 필수
- **Independent Test**: 정상/비정상 메타데이터로 각 검증 메서드 통과/실패 검증
- **Acceptance Scenarios**:
  1. **Given** 유효한 PixelSpacing 값, **When** validatePixelSpacing() 호출, **Then** 검증 성공
  2. **Given** PixelSpacing 누락 또는 0 이하, **When** validatePixelSpacing() 호출, **Then** 검증 실패 및 사유 반환
  3. **Given** 복셀값 범위 이상 데이터, **When** validateVoxelRange() 호출, **Then** 이상치 탐지 결과 반환
  4. **Given** ImageOrientationPatient 누락, **When** validateImageOrientation() 호출, **Then** 경고 및 기본 축 방향 제안

### User Story 7 -- SQ 시퀀스 파싱 지원 (Priority: P2)
- **설명**: SQ VR 파싱으로 중첩 데이터셋 처리
- **Why this priority**: 일부 CBCT 파일에서만 시퀀스 태그 포함되지만 완전한 파싱을 위해 필요
- **Independent Test**: 중첩 시퀀스 테스트 데이터로 계층 구조 파싱 검증
- **Acceptance Scenarios**:
  1. **Given** SQ VR 데이터 요소, **When** 파싱, **Then** Item/ItemDelimiter 처리하여 중첩 데이터셋 파싱
  2. **Given** 중첩 깊이 3 이상 시퀀스, **When** 파싱, **Then** 재귀적 파싱 정상 동작, 무한 루프 방지

### User Story 8 -- 비표준 파일 오류 처리 및 타임아웃 (Priority: P1) MVP
- **설명**: 비표준/손상 DICOM 파일 입력 시 명확한 오류 메시지 밌환 및 타임아웃 메커니즘 적용
- **Why this priority**: HAZ-5.2(비표준 DICOM 기능 정지) 완화 및 사용자 경험 보호
- **Independent Test**: 다양한 손상 파일 입력 시 적절한 오류 분류와 메시지 반환 검증
- **Acceptance Scenarios**:
  1. **Given** 중간에 잘린(truncated) 파일, **When** parseDICOM() 호출, **Then** ParseError 발생 및 명확한 메시지 반환
  2. **Given** 타임아웃 초과 대용량 파일, **When** parseDICOM() 호출, **Then** 타임아웃 오류 발생 및 파싱 중단
  3. **Given** 잘못된 VR 문자열, **When** 파싱, **Then** 복구 시도 후 실패 시 명확한 오류 메시지 반환

### Edge Cases (엓지 케이스)
- **EC-001**: 프리엠블 없이 DICM으로 시작하는 비표준 DICOM 파일
- **EC-002**: 그룹 길이 요소(0000 그룹) 포함 파일
- **EC-003**: 픽셀 데이터 길이와 예상 길이 불일치
- **EC-004**: Private 태그(홀수 그룹 번호) 포함 파일
- **EC-005**: 메타헤더 그룹(0002)과 데이터셋 간 전송 구문 불일치
- **EC-006**: 0바이트 길이 데이터 요소
- **EC-007**: Undefined Length(-1)의 픽셀 데이터 및 시퀀스
- **EC-008**: BOM(Byte Order Mark) 포함 텍스트 VR 값
---

## 3. Requirements

### 3.1 기능 요구사항 (Functional Requirements)

#### FR-DP-001: DICOM Part 10 파일 형식 파싱

DICOM Part 10 파일 형식을 파싱하는 코어 기능을 구현해야 한다.

**세부 요구사항**:
- **FR-DP-001-1**: 프리엠블 128바이트를 읽고 건너뛰어야 한다
- **FR-DP-001-2**: 오프셋 128에서 DICM 매짝 바이트(4바이트)를 확인해야 한다. 누락 시 ParseError 발생 (FR-1.2)
- **FR-DP-001-3**: 파일 메타헤더 그룹(그룹 0002)을 명시적 VR Little Endian으로 파싱
- **FR-DP-001-4**: Transfer Syntax UID(0002,0010)을 추출하여 전송 구문 확인
- **FR-DP-001-5**: 데이터셋을 확인된 전송 구문에 따라 파싱

**관련 SRS**: FR-1.1, FR-1.2, FR-7.2
**관련 Hazard**: HAZ-1.1
**관련 SDS**: SDS-3.1 DICOMParser

#### FR-DP-002: 전송 구문 처리

3가지 비압축 전송 구문에 대한 데이터 요소 파싱을 구현해야 한다.

**세부 요구사항**:
- **FR-DP-002-1**: 명시적 VR Little Endian(1.2.840.10008.1.2.1) -- VR 필드를 직접 파싱
- **FR-DP-002-2**: 암시적 VR Little Endian(1.2.840.10008.1.2) -- 데이터 사전에서 VR 조회
- **FR-DP-002-3**: Big Endian(1.2.840.10008.1.2.2) -- 비그 엔디언 바이트 오더 적용 (읽기 전용)
- **FR-DP-002-4**: 각 전송 구문별 데이터 요소 파싱 로직 구현 (Tag, VR, Length, Value)
- **FR-DP-002-5**: 지원하지 않는 압축 전송 구문 감지 시 명확한 오류 반환

**관련 SRS**: FR-1.2, FR-7.2

#### FR-DP-003: DICOM 데이터 사전 구축

CBCT 영상에 필요한 필수 태그 정보를 포함한 데이터 사전을 구축해야 한다.

**세부 요구사항**:
- **FR-DP-003-1**: CBCT 영상 필수 태그 최소 목록 정의:
  파일 메타: (0002,0000) FileMetaLength, (0002,0001) FileMetaVersion, (0002,0010) TransferSyntax
  환자: (0010,0010) PatientName, (0010,0020) PatientID, (0010,0030) BirthDate
  스터디: (0008,0020) StudyDate, (0008,0030) StudyTime, (0008,1030) StudyDescription
  영상 파라미터: (0018,0050) SliceThickness, (0018,0060) KVP, (0018,1151) XRayTubeCurrent
  플셉셀 간격: (0028,0030) PixelSpacing
  이미지 표현: (0020,0037) ImageOrientationPatient, (0020,0032) ImagePositionPatient
  플셀 데이터: (0028,0010) Rows, (0028,0011) Columns, (0028,0008) NumberOfFrames
  비트 표현: (0028,0100) BitsAllocated, (0028,0101) BitsStored, (0028,0102) HighBit, (0028,0103) PixelRepresentation
  윈도우: (0028,1050) WindowCenter, (0028,1051) WindowWidth
  발명 기준: (0018,0015) BodyPartExamined, (0008,0060) Modality
- **FR-DP-003-2**: 사전에 없는 태그는 UN(Unknown) VR로 처리
- **FR-DP-003-3**: 암시적 VR 파싱 시 데이터 사전을 VR 조회 소스로 사용

**관련 SRS**: FR-1.3
#### FR-DP-004: VR별 값 파싱 구현

20개 VR에 대한 값 파싱을 구현해야 한다.

**세부 요구사항**:
- **FR-DP-004-1**: 숫자 VR(US, SS, UL, SL, FL, FD) -- DataView 메서드로 바이너리 읽기
- **FR-DP-004-2**: 문자열 숫자 VR(DS, IS) -- 문자열 파싱 후 parseFloat/parseInt 변환
- **FR-DP-004-3**: 문자열 VR(LO, SH, PN, UI, CS, DA, TM, DT) -- 패딩 제거 후 문자열 반환
- **FR-DP-004-4**: 바이너리 VR(OB, OW, UN) -- ArrayBuffer 그대로 반환
- **FR-DP-004-5**: SQ VR -- 재귀적 데이터셋 파싱 (Item 태그 FFFE,E000 처리)
- **FR-DP-004-6**: 멀티밸류(multi-value) 처리 -- DS, IS 등 역슬래시 구분자 처리

#### FR-DP-005: 메타데이터 추출 및 DICOMMetadata 생성

파싱된 태그 데이터에서 DICOMMetadata 타입 객체를 생성해야 한다.

**세부 요구사항**:
- **FR-DP-005-1**: DICOMMetadata 타입의 모든 필드를 채워야 한다 (types.js 정의 준수)
- **FR-DP-005-2**: 필수 필드 누락 시 errors 배열에 누락 태그 정보 기록
- **FR-DP-005-3**: PixelSpacing(0028,0030)을 배열 [row, column]로 파싱 (역슬래시 \ 구분자)
- **FR-DP-005-4**: ImageOrientationPatient(0020,0037)을 6요소 배열로 파싱 (DS VR 멀티밸류)
- **FR-DP-005-5**: WindowCenter/WindowWidth(0028,1050/1051) 파싱 (다중 값 지원)

**관련 SRS**: FR-1.3
**관련 SDS**: SDS-3.1 parseMetadata()

#### FR-DP-006: 플셀 데이터 추출

DICOM 플셀 데이터를 추출하여 처리 가능한 형태로 반환해야 한다.

**세부 요구사항**:
- **FR-DP-006-1**: 플셀 데이터 태그(7FE0,0010)을 찾아 ArrayBuffer로 추출
- **FR-DP-006-2**: BitsAllocated(0028,0100)에 따라 8/16/32비트 TypedArray 변환
- **FR-DP-006-3**: PixelRepresentation(0028,0103)에 따라 signed/unsigned 결정
- **FR-DP-006-4**: 플셀 데이터 누락 시 ParseError 발생
- **FR-DP-006-5**: 플셀 데이터 길이와 예상 길이(Rows*Columns*Frames*BytesPerPixel) 비교, 불일치 시 경고 기록

**관련 SRS**: FR-1.4
**관련 Hazard**: HAZ-1.1

#### FR-DP-007: 데이터 검증 (DataValidator)

파싱된 DICOM 데이터의 무결성과 일관성을 검증해야 한다.

**세부 요구사항**:
- **FR-DP-007-1**: 필수 태그 존재 여부 검증 (PatientID, StudyInstanceUID, SeriesInstanceUID, SOPInstanceUID)
- **FR-DP-007-2**: VR(Value Representation) 형식 위반 검출
- **FR-DP-007-3**: 값 범위 검증 (예: Rows > 0, BitsAllocated in {8,16,32})
- **FR-DP-007-4**: 파일 메타헤더 일관성 검증 (FileMetaVersion, TransferSyntaxUID)
- **FR-DP-007-5**: 검증 결과를 ValidationError 배열로 반환 (태그, 메시지, 심각도)

**관련 SRS**: FR-5.4
**관련 Hazard**: HAZ-3.1
**관련 SDS**: SDS-3.2 DataValidator

#### FR-DP-008: 파싱 타임아웃 및 안전 장치

악의적이거나 손상된 파일로 인한 무한 루프나 메모리 고갈을 방지해야 한다.

**세부 요구사항**:
- **FR-DP-008-1**: 최대 파싱 시간 타임아웃 설정 (기본값 30초)
- **FR-DP-008-2**: 최대 데이터 요소 개수 제한 (기본값 10,000개)
- **FR-DP-008-3**: 최대 중첩 깊이 제한 (SQ 시퀀스, 기본값 16레벨)
- **FR-DP-008-4**: 파일 크기 상한 검사 (기본값 2GB)
- **FR-DP-008-5**: 타임아웃/한계 초과 시 명확한 ParseError 반환

**관련 SRS**: NFR-2.1, NFR-2.2
**관련 Hazard**: HAZ-1.1

### 3.2 비기능 요구사항 (Non-Functional Requirements)

#### NFR-DP-001: 보안 -- 외부 의존성 제로

DICOM 파서는 어떠한 외부 라이브러리에도 의존하지 않아야 한다.

**세부 요구사항**:
- **NFR-DP-001-1**: package.json에 DICOM 관련 외부 의존성이 없어야 한다
- **NFR-DP-001-2**: 네트워크 API (fetch, XMLHttpRequest, WebSocket) 호출이 없어야 한다
- **NFR-DP-001-3**: SBOM(Software Bill of Materials)에 DICOM 파서 관련 항목이 자체 구현으로만 표기
- **NFR-DP-001-4**: ESLint 보안 규칙으로 외부 통신 코드 포함 여부 자동 검증

**관련 SRS**: FR-5.4, HAZ-3.1
**ADR 근거**: 보안 감사 부담 최소화, 외부 통신 코드 포함 위험 제거

#### NFR-DP-002: 성능

CBCT 영상 파일을 합리적인 시간 내에 파싱해야 한다.

**세부 요구사항**:
- **NFR-DP-002-1**: 100MB 이하 CBCT 파일 파싱 시 5초 이내 완료
- **NFR-DP-002-2**: 메타데이터만 추출하는 경우 1초 이내 완료
- **NFR-DP-002-3**: ArrayBuffer 기반 처리로 메모리 복사 최소화
- **NFR-DP-002-4**: DataView를 활용한 엔디안 변환 (추가 버퍼 할당 없음)

**관련 SRS**: NFR-1

#### NFR-DP-003: 확장성

향후 압축 전송 구문(JPEG, JPEG2000, RLE) 추가가 용이하도록 설계해야 한다.

**세부 요구사항**:
- **NFR-DP-003-1**: 전송 구문 파서를 Strategy 패턴으로 분리
- **NFR-DP-003-2**: 새로운 VR 추가 시 기존 코드 수정 없이 확장 가능
- **NFR-DP-003-2**: 파서 인터페이스를 통해 구현 교체 가능

**관련 SRS**: NFR-3

### 3.3 제약사항

- **C-01**: JavaScript(ES2022+)만 사용, TypeScript 도입 없음
- **C-02**: 브라우저 환경 전용 (Node.js 미지원)
- **C-03**: Web Workers에서도 실행 가능해야 함 (DOM 의존 없음)
- **C-04**: IEC 62304 Class A 준수
- **C-05**: 압축 전송 구문(JPEG, JPEG2000, RLE)은 후속 티켓에서 다룸
- **C-06**: DICOM 네트워크 프로토콜(DIMSE)은 범위 외

## 4. Success Criteria

### 4.1 기능 검증 기준

| ID | 검증 항목 | 검증 방법 | 관련 FR |
|------|----------|-----------|--------|
| SC-01 | Part 10 파일 128바이트 프리앰블 + DICM 매직 감지 | 단위 테스트 (정상/비정상 파일) | FR-DP-001 |
| SC-02 | 명시적 VR LE 파싱 정확성 | 태그-VR-값 일치 검증 테스트 | FR-DP-002 |
| SC-03 | 암시적 VR LE 파싱 정확성 | 데이터 사전 기반 VR 조회 검증 | FR-DP-002 |
| SC-04 | Big Endian 파싱 정확성 | 엔디안 변환 검증 테스트 | FR-DP-002 |
| SC-05 | 20개 VR 값 파싱 정확성 | VR별 파싱 테스트 (숫자/문자열/바이너리/SQ) | FR-DP-004 |
| SC-06 | DICOMMetadata 객체 생성 완전성 | 필수 필드 전수 검증 테스트 | FR-DP-005 |
| SC-07 | 픽셀 데이터 TypedArray 변환 정확성 | BitsAllocated/PixelRepresentation별 테스트 | FR-DP-006 |
| SC-08 | DataValidator 검증 결과 반환 | 필수 태그 누락/범위 위반/VR 위반 테스트 | FR-DP-007 |
| SC-09 | 타임아웃 및 한계 동작 | 대용량 파일/과도한 태그/깊은 중첩 테스트 | FR-DP-008 |

### 4.2 비기능 검증 기준

| ID | 검증 항목 | 검증 방법 | 관련 NFR |
|------|----------|-----------|---------|
| SC-10 | 외부 의존성 제로 | package.json 점검 + ESLint 검증 | NFR-DP-001 |
| SC-11 | 100MB 파일 5초 이내 파싱 | 성능 벤치마크 테스트 | NFR-DP-002 |
| SC-12 | Strategy 패턴 기반 전송 구문 교체 | 아키텍처 리뷰 | NFR-DP-003 |

### 4.3 추적성 매트릭스 (Traceability)

| SRS ID | ADR-2 Spec ID | SDS 참조 | HAZ 참조 |
|--------|--------------|---------|----------|
| FR-1.1 | FR-DP-001 | SDS-3.1 | HAZ-1.1 |
| FR-1.2 | FR-DP-002 | SDS-3.1 | - |
| FR-1.3 | FR-DP-005 | SDS-3.1 | - |
| FR-1.4 | FR-DP-006 | SDS-3.1 | HAZ-1.1 |
| FR-5.4 | FR-DP-007, NFR-DP-001 | SDS-3.2 | HAZ-3.1 |
| FR-7.2 | FR-DP-002 | SDS-3.1 | - |
| NFR-1 | NFR-DP-002 | - | - |
| NFR-2 | NFR-DP-001, FR-DP-008 | - | HAZ-3.1 |
| NFR-3 | NFR-DP-003 | - | - |

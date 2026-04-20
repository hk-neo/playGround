# Feature Specification: DICOMParser 상세 설계

**Feature Branch**: `PLAYG-1385-dicom-parser-detail-design`
**Status**: Draft | **Date**: 2026-04-20
**Ticket**: `PLAYG-1385` | **Type**: Detailed Design
**Input**: 티켓 설명 (command_args 없음)

---

## User Scenarios & Testing

### User Story 1 — DICOM 파일 파싱 수행 (Priority: P1) 🎯 MVP
- **설명**: 사용자(개발자)가 DICOM 형식의 의료 영상 파일(File 또는 ArrayBuffer)을 입력하면, 메타데이터와 복셀 데이터를 포함한 ParseResult를 반환한다.
- **Why this priority**: DICOM 파일 파싱은 전체 시스템의 핵심 진입점이며, 이 기능이 없으면 다운스트림 컴포넌트(렌더링, 분석 등)가 동작할 수 없다.
- **Independent Test**: 유효한 DICOM 파일을 `parseDICOM()`에 전달하고 ParseResult의 metadata, voxelData, errors 필드를 검증한다.
- **Acceptance Scenarios**:
  1. **Given** 유효한 DICOM 파일이 준비됨, **When** `parseDICOM(file)`를 호출함, **Then** ParseResult.errors가 빈 배열이고 metadata에 환자/스터디 정보가 포함되며 voxelData가 ArrayBuffer 형태로 반환됨
  2. **Given** ArrayBuffer 형태의 DICOM 데이터가 준비됨, **When** `parseDICOM(arrayBuffer)`를 호출함, **Then** File 입력과 동일한 구조의 ParseResult가 반환됨

### User Story 2 — 매직 바이트 검증 (Priority: P1) 🎯 MVP
- **설명**: 파싱 시작 전, offset 128 위치에서 "DICM" 시그니처를 확인하여 파일이 유효한 DICOM 포맷인지 검증한다.
- **Why this priority**: 잘못된 파일 포맷을 조기에 거부하여 불필요한 파싱 비용과 잠재적 오류를 방지해야 한다.
- **Independent Test**: 매직 바이트가 올바른/잘못된 파일에 대해 각각 `validateMagicByte()`를 호출하여 결과를 확인한다.
- **Acceptance Scenarios**:
  1. **Given** offset 128에 "DICM" 시그니처가 있는 파일, **When** `validateMagicByte(data)`를 호출함, **Then** true를 반환함
  2. **Given** "DICM" 시그니처가 없는 파일, **When** `validateMagicByte(data)`를 호출함, **Then** false를 반환하고 적절한 에러 코드를 포함함

### User Story 3 — 전송 구문(Transfer Syntax) 검증 (Priority: P1) 🎯 MVP
- **설명**: DICOM 파일의 전송 구문 UID를 읽고, 현재 구현에서 지원하는 인코딩인지 검증한다.
- **Why this priority**: 지원하지 않는 전송 구문(예: 압축 JPEG, JPEG2000 등)의 파일은 파싱이 불가하므로 사전 검증이 필수적이다.
- **Independent Test**: 지원되는/지원되지 않는 Transfer Syntax UID가 포함된 DICOM 데이터로 `validateTransferSyntax()`를 테스트한다.
- **Acceptance Scenarios**:
  1. **Given** Implicit VR Little Endian(1.2.840.10008.1.2) 전송 구문, **When** `validateTransferSyntax(syntaxUID)`를 호출함, **Then** true를 반환함
  2. **Given** JPEG 압축 전송 구문(1.2.840.10008.1.2.4.x), **When** `validateTransferSyntax(syntaxUID)`를 호출함, **Then** false를 반환하고 지원하지 않는 구문 에러를 기록함

### User Story 4 — 메타데이터 추출 (Priority: P1) 🎯 MVP
- **설명**: DICOM 데이터셋에서 환자 정보, 스터디 정보, 시리즈 정보, 이미지 속성 등 핵심 메타데이터를 추출한다.
- **Why this priority**: 메타데이터는 의료 영상의 식별, 분류, 표시에 필수적이며 다운스트림 기능의 기반이 된다.
- **Independent Test**: 알려진 태그 값을 가진 DICOM 파일을 파싱하고 추출된 메타데이터 값을 기댓값과 비교한다.
- **Acceptance Scenarios**:
  1. **Given** 환자 이름, ID, 스터디 날짜 등의 태그가 포함된 DICOM 파일, **When** `parseMetadata(dataSet)`를 호출함, **Then** 환자 이름, 환자 ID, 스터디 인스턴스 UID, 시리즈 번호 등이 올바르게 추출됨
  2. **Given** 필수 태그가 누락된 DICOM 파일, **When** `parseMetadata(dataSet)`를 호출함, **Then** 누락된 태그에 대한 경고(warning)가 errors 배열에 포함되고, 나머지 가용 태그는 정상 추출됨

### User Story 5 — 픽셀 데이터 파싱 (Priority: P1) 🎯 MVP
- **설명**: DICOM 파일에서 실제 영상 데이터(픽셀/복셀 데이터)를 추출하여 ArrayBuffer 형태로 반환한다. Bits Allocated, Bits Stored, Pixel Representation 등의 속성을 반영한다.
- **Why this priority**: 픽셀 데이터는 영상 렌더링의 직접적인 입력이므로 MVP의 핵심이다.
- **Independent Test**: 알려진 픽셀 값을 가진 테스트 DICOM 파일로 `parsePixelData()`를 호출하고 바이트 길이와 샘플 값을 검증한다.
- **Acceptance Scenarios**:
  1. **Given** 512x512, 16-bit, 단일 프레임 DICOM 파일, **When** `parsePixelData(dataSet)`를 호출함, **Then** 512*512*2 = 524,288 바이트의 ArrayBuffer가 반환됨
  2. **Given** 멀티프레임 DICOM 파일, **When** `parsePixelData(dataSet)`를 호출함, **Then** 모든 프레임의 픽셀 데이터가 순차적으로 포함된 ArrayBuffer가 반환됨

### User Story 6 — 파싱 에러 핸들링 (Priority: P2)
- **설명**: 파싱 과정에서 발생하는 모든 오류(포맷 오류, 누락된 태그, 잘린 데이터 등)를 구조화된 에러 객체로 수집하고 반환한다.
- **Why this priority**: 에러 핸들링은 안정적인 운영에 필수적이나, 정상 파싱 경로가 먼저 확보되어야 의미 있다.
- **Independent Test**: 의도적으로 손상된 DICOM 파일을 파싱하고 errors 배열의 내용을 검증한다.
- **Acceptance Scenarios**:
  1. **Given** 데이터가 중간에 잘린(truncated) 파일, **When** `parseDICOM()`를 호출함, **Then** ParseResult.errors에 TRUNCATED_DATA 에러가 포함되고 부분적으로 파싱된 데이터가 함께 반환됨
  2. **Given** 잘못된 태그 길이가 포함된 파일, **When** `parseDICOM()`를 호출함, **Then** INVALID_TAG_LENGTH 에러가 기록되고 파싱이 가능한 범위까지 계속 진행됨

### User Story 7 — DataValidator 연동 검증 (Priority: P2)
- **설명**: 파싱된 데이터를 DataValidator 컴포넌트를 통해 추가 검증하여 의료 데이터의 무결성을 보장한다.
- **Why this priority**: DataValidator는 외부 의존성이므로 파싱 로직 안정화 후 연동하는 것이 효율적이다.
- **Independent Test**: DataValidator mock을 사용하여 파싱 결과의 검증 경로(정상/비정상)를 테스트한다.
- **Acceptance Scenarios**:
  1. **Given** 파싱이 완료된 ParseResult, **When** DataValidator.validate()를 호출함, **Then** 검증 결과가 통과 또는 구체적인 검증 실패 항목을 반환함
  2. **Given** 범위를 벗어난 픽셀 값이 포함된 ParseResult, **When** DataValidator.validate()를 호출함, **Then** PIXEL_VALUE_OUT_OF_RANGE 검증 실패가 반환됨

### Edge Cases (엣지 케이스)
- **EC-001**: 파일 크기가 132바이트 미만인 경우(매직 바이트 영역조차 없음) → 즉시 INVALID_FILE_SIZE 에러 반환
- **EC-002**: DICOM 프리앰블(128바이트)이 0x00으로 채워지지 않은 경우 → 경고 발생 후 파싱 계속 진행
- **EC-003**: 전송 구문이 누락된 경우 → 기본값 Implicit VR Little Endian으로 간주하고 경고 기록
- **EC-004**: 픽셀 데이터 태그(7FE0,0010)가 존재하지 않는 경우 → metadata만 포함된 ParseResult 반환
- **EC-005**: 비정상적으로 큰 태그 길이 값(예: 4GB)이 지정된 경우 → 메모리 보호를 위해 MAX_TAG_LENGTH 제한 적용
- **EC-006**: VR(Value Representation)이 명시적/암시적 모드에서 혼재된 경우 → 전송 구문에 따라 올바르게 처리
- **EC-007**: 중복 태그가 존재하는 경우 → 마지막 값을 사용하고 경고 기록

---

## Requirements

### Functional Requirements (기능 요구사항)
- **FR-001**: 시스템은 `parseDICOM(input: File | ArrayBuffer): ParseResult` 인터페이스를 제공하여 DICOM 파일 입력을 받아 파싱 결과를 반환해야 함 (추적: FR-1.1)
- **FR-002**: 시스템은 `validateMagicByte(data: ArrayBuffer): boolean`을 통해 offset 128 위치의 "DICM" 시그니처를 검증해야 함 (추적: FR-1.2)
- **FR-003**: 시스템은 `validateTransferSyntax(syntaxUID: string): boolean`을 통해 전송 구문 UID가 지원되는 인코딩인지 검증해야 함. 지원 인코딩: Explicit VR Little Endian, Implicit VR Little Endian, Explicit VR Big Endian (추적: FR-1.3)
- **FR-004**: 시스템은 `parseMetadata(dataSet: DICOMDataSet): Metadata`를 통해 환자, 스터디, 시리즈, 이미지 속성 메타데이터를 추출해야 함 (추적: FR-1.4)
- **FR-005**: 시스템은 `parsePixelData(dataSet: DICOMDataSet): ArrayBuffer | null`을 통해 픽셀/복셀 데이터를 추출해야 함. Bits Allocated, Bits Stored, High Bit, Pixel Representation 속성을 반영해야 함 (추적: FR-1.5)
- **FR-006**: 시스템은 `handleParseError(error: ParseError): ErrorInfo`를 통해 파싱 오류를 구조화된 에러 객체로 변환하여 수집해야 함. 에러 유형: INVALID_FORMAT, TRUNCATED_DATA, INVALID_TAG_LENGTH, UNSUPPORTED_SYNTAX, MISSING_REQUIRED_TAG (추적: FR-7.2)
- **FR-007**: ParseResult는 `{ metadata: Metadata, voxelData: ArrayBuffer | null, errors: ErrorInfo[] }` 구조를 가져야 함
- **FR-008**: 시스템은 외부 DICOM 파싱 라이브러리 없이 자체 구현(ADR-2)해야 함
- **FR-009**: 시스템은 DataValidator 컴포넌트와 연동하여 파싱 결과의 추가 검증을 지원해야 함 (추적: FR-7.2)
- **FR-010**: 시스템은 DICOM 데이터 요소를 순차적으로 읽을 때 태그 그룹 번호(0000,0002 = File Meta Info)를 기준으로 파일 메타 정보와 데이터셋을 분리하여 처리해야 함

### Non-Functional Requirements (비기능 요구사항)
- **NFR-001 (성능)**: 512x512 16-bit 단일 프레임 DICOM 파일 파싱 시 100ms 이내에 완료되어야 함
- **NFR-002 (메모리)**: 파일 크기의 2배를 초과하는 메모리를 할당하지 않아야 함. 대용량 파일(>500MB) 처리 시 스트리밍 방식을 고려해야 함
- **NFR-003 (안정성)**: 파싱 중 오류가 발생해도 프로세스가 중단되지 않아야 하며, 항상 ParseResult를 반환해야 함 (위험 완화: HAZ-1.1)
- **NFR-004 (보안)**: 악의적으로 구성된 DICOM 파일(예: 과도한 태그 길이, 무한 루프 유도 구조)에 대해 안전하게 처리해야 함 (위험 완화: HAZ-5.2)
- **NFR-005 (확장성)**: 새로운 전송 구문이나 VR 타입을 추가할 때 최소한의 코드 변경으로 확장 가능해야 함

### Key Entities (핵심 데이터 모델)

- **ParseResult**: 파싱 최종 결과물 — 핵심 속성: metadata(Metadata), voxelData(ArrayBuffer | null), errors(ErrorInfo[])
- **Metadata**: DICOM 메타데이터 집합 — 핵심 속성: patientName, patientID, studyInstanceUID, seriesInstanceUID, studyDate, modality, rows, columns, bitsAllocated, bitsStored, pixelRepresentation, samplesPerPixel, numberOfFrames
- **ErrorInfo**: 구조화된 에러 정보 — 핵심 속성: code(ErrorCode), message(string), tag(string | null), severity('error' | 'warning'), offset(number | null)
- **DICOMDataSet**: 내부 파싱 중간 데이터 구조 — 핵심 속성: elements(Map<tag, DataElement>), transferSyntax(string), isExplicitVR(boolean)
- **DataElement**: 개별 DICOM 데이터 요소 — 핵심 속성: tag(string), vr(string), length(number), value(ArrayBuffer), offset(number)

---

## Success Criteria

### Measurable Outcomes (측정 가능한 지표)
- **SC-001**: 유효한 DICOM 파일 파싱 성공률 100% (지원되는 전송 구문 한정)
- **SC-002**: 512x512 16-bit DICOM 파일 파싱 시간 100ms 이내
- **SC-003**: 손상된/비정상 DICOM 파일에 대해 프로세스 크래시 0건
- **SC-004**: 지원되지 않는 전송 구문 파일에 대해 명확한 에러 메시지 반환률 100%

### Definition of Done
- [ ] 모든 FR-001 ~ FR-010 요구사항 구현 완료
- [ ] 단위 테스트 커버리지 90% 이상
- [ ] Edge Case 시나리오(EC-001 ~ EC-007) 검증 완료
- [ ] DataValidator 연동 테스트 통과
- [ ] HAZ-1.1(프로세스 안정성) 및 HAZ-5.2(악의적 파일 방어) 위험 완화 확인
- [ ] 코드 리뷰 승인
- [ ] ADR-2(외부 라이브러리 미사용) 원칙 준수 확인

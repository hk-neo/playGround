# Feature Specification: DICOMParser 상세 설계 (SDS-3.1)

**Feature Branch**: `PLAYG-1385-dicom-parser-detail-design`
**Status**: Draft | **Date**: 2026-04-20
**Ticket**: `PLAYG-1385` | **Type**: Detailed Design
**Input**: SRS(PLAYG-1310), SAD(PLAYG-1311), SDS(PLAYG-1312) 섹션 3.1

---

## User Scenarios & Testing

### User Story 1 — DICOM 파일 전체 파싱 (Priority: P1)

- **설명**: 사용자가 로컬 DICOM 파일을 선택하면, 시스템이 메타데이터와 복셀 데이터를 모두 파싱하여 구조화된 결과 객체(ParseResult)를 반환한다. 외부 라이브러리 없이 자체 구현한다(ADR-2, PLAYG-1371).
- **Why this priority**: DICOM 파일 파싱은 모든 후속 기능(렌더링, 측정, 조작)의 전제 조건이다. 파싱이 동작하지 않으면 제품 전체가 동작할 수 없다.
- **Independent Test**: 유효한 DICOM 3.0 파일을 입력으로 제공하고, ParseResult의 metadata, voxelData, errors 필드 값을 검증한다.
- **Acceptance Scenarios**:
  1. **Given** 유효한 DICOM 3.0 CBCT 파일이 주어졌을 때, **When** parseDICOM(file)을 호출하면, **Then** ParseResult.metadata에 환자 정보/스터디 정보/픽셀 간격/슬라이스 두께가 포함되고, voxelData에 ArrayBuffer가 포함되며, errors가 빈 배열이다.
  2. **Given** 복셀 비트 깊이가 16비트인 파일이 주어졌을 때, **When** parseDICOM(file)을 호출하면, **Then** voxelData가 Int16Array 또는 Uint16Array로 올바르게 디코딩된다.
  3. **Given** 단일 슬라이스 DICOM 파일이 주어졌을 때, **When** parseDICOM(file)을 호출하면, **Then** 정상적으로 파싱되며 메타데이터에 NumberOfFrames가 1로 설정된다.

### User Story 2 — DICOM 매직 바이트 및 전송 구문 검증 (Priority: P1)

- **설명**: 파일이 DICOM 3.0 표준에 유효한지 매직 바이트(오프셋 128, 'DICM')와 Transfer Syntax UID를 확인하여 검증한다.
- **Why this priority**: 비표준 파일이 파서에 들어가면 파싱 오류, 메모리 손상, 무한 루프 등의 심각한 문제가 발생할 수 있다(HAZ-1.1).
- **Independent Test**: 매직 바이트가 올바른/올바르지 않은 파일, 지원되는/지원되지 않는 Transfer Syntax를 각각 테스트한다.
- **Acceptance Scenarios**:
  1. **Given** 오프셋 128에 'DICM' 문자열이 있는 파일, **When** validateMagicByte(data)를 호출하면, **Then** true를 반환한다.
  2. **Given** 오프셋 128에 'DICM'이 없는 파일, **When** validateMagicByte(data)를 호출하면, **Then** false를 반환한다.
  3. **Given** 압축 전송 구문(예: JPEG Lossless)이 지정된 메타데이터, **When** validateTransferSyntax(meta)를 호출하면, **Then** false를 반환한다.
  4. **Given** 비압축 전송 구문(Explicit VR Little Endian 등)이 지정된 메타데이터, **When** validateTransferSyntax(meta)를 호출하면, **Then** true를 반환한다.

### User Story 3 — DICOM 메타데이터 파싱 (Priority: P1)

- **설명**: DICOM 헤더에서 환자 정보, 스터디 정보, 픽셀 간격(Pixel Spacing), 슬라이스 두께, Image Orientation Patient 등 필수 메타데이터를 파싱한다.
- **Why this priority**: 메타데이터는 렌더링 축 방향 결정(FR-2.4), 측정 정확도(FR-4.2), 볼륨 구성(FR-1.4)에 필수적이다.
- **Independent Test**: 알려진 태그 값을 가진 DICOM 파일에서 파싱 결과를 예상 값과 비교한다.
- **Acceptance Scenarios**:
  1. **Given** Pixel Spacing(0028,0030)이 '0.3\\0.3'인 파일, **When** parseMetadata(data)를 호출하면, **Then** metadata.pixelSpacing이 [0.3, 0.3]으로 파싱된다.
  2. **Given** Image Orientation Patient(0020,0037)이 포함된 파일, **When** parseMetadata(data)를 호출하면, **Then** metadata.imageOrientationPatient이 6개 부동소수점 배열로 파싱된다.
  3. **Given** 필수 태그가 누락된 파일, **When** parseMetadata(data)를 호출하면, **Then** 해당 태그는 기본값 또는 undefined로 설정되고 경고가 errors에 추가된다.

### User Story 4 — 복셀 픽셀 데이터 파싱 (Priority: P1)

- **설명**: DICOM 픽셀 데이터 태그(7FE0,0010)를 찾아 복셀 데이터를 추출한다. BitsAllocated(8/16/32비트)에 따라 적절한 타입으로 변환한다.
- **Why this priority**: 복셀 데이터는 MPR 렌더링, 3D 볼륨 렌더링의 핵심 입력 데이터이다.
- **Independent Test**: 알려진 픽셀 값을 가진 파일에서 추출된 voxelData의 길이와 샘플 값을 검증한다.
- **Acceptance Scenarios**:
  1. **Given** BitsAllocated=16, Rows=512, Columns=512인 파일, **When** parsePixelData(data, meta)를 호출하면, **Then** voxelData의 바이트 길이가 512*512*2=524288바이트이다.
  2. **Given** BitsAllocated=8인 파일, **When** parsePixelData(data, meta)를 호출하면, **Then** voxelData가 올바르게 1바이트 단위로 읽힌다.
  3. **Given** 픽셀 데이터 태그(7FE0,0010)가 없는 파일, **When** parsePixelData(data, meta)를 호출하면, **Then** errors에 관련 오류 메시지가 추가된다.

### User Story 5 — 파싱 오류 처리 (Priority: P2)

- **설명**: 파싱 오류 발생 시 오류 유형별 메시지를 생성하고, 타임아웃 메커니즘으로 무한 대기를 방지한다.
- **Why this priority**: HAZ-5.2(무한 대기 상태) 완화와 사용자 경험 개선을 위해 필요하다. 단, 기본 파싱 기능이 먼저 완성되어야 한다.
- **Independent Test**: 손상된 파일, 타임아웃 유발 파일 등을 입력하여 오류 처리 동작을 검증한다.
- **Acceptance Scenarios**:
  1. **Given** 헤더는 유효하나 픽셀 데이터가 손상된 파일, **When** parseDICOM(file)을 호출하면, **Then** ParseResult.errors에 구체적인 오류 메시지가 포함되고 isValid가 false이다.
  2. **Given** 파싱에 10초 이상 소요될 수 있는 대용량 파일, **When** parseDICOM(file)을 호출하면, **Then** 설정된 타임아웃(예: 30초) 내에 결과를 반환하거나 타임아웃 오류를 반환한다.
  3. **Given** 바이트 오더를 판별할 수 없는 파일, **When** parseDICOM(file)을 호출하면, **Then** 기본값(Little Endian)을 적용하고 경고를 errors에 추가한다.

### Edge Cases (엣지 케이스)

- **EC-001**: 빈 파일(0바이트) 입력 시 - validateMagicByte에서 false 반환 후 즉시 거부
- **EC-002**: DICM 매직 바이트만 있고 나머지가 손상된 파일 - 부분 파싱 결과와 오류 메시지 반환
- **EC-003**: BitsAllocated가 32인 파일 - Float32 또는 Int32 타입으로 올바르게 처리
- **EC-004**: Photometric Interpretation이 MONOCHROME1/2가 아닌 경우(RGB 등) - 경고 후 처리 계속 또는 거부
- **EC-005**: Pixel Data가 압축되어 있는 경우(압축 Transfer Syntax) - validateTransferSyntax에서 사전 거부
- **EC-006**: 파일 크기가 예상 픽셀 데이터 크기보다 작은 경우 - 불완전 데이터 오류 반환
- **EC-007**: Meta 정보에 바이트 오더 결정 정보가 없는 경우 - Little Endian 기본 적용 후 경고

---

## Requirements

### Functional Requirements (기능 요구사항)
- **FR-001**: parseDICOM(file: File) 메서드는 File 객체를 입력받아 ParseResult{metadata, voxelData, errors, isValid}를 반환해야 함 (FR-1.1, FR-1.3, FR-1.4)
- **FR-002**: validateMagicByte(data: ArrayBuffer)는 오프셋 128바이트 위치에서 'DICM' 문자열을 확인하여 boolean을 반환해야 함 (FR-1.2, HAZ-1.1)
- **FR-003**: validateTransferSyntax(meta: DICOMMetadata)는 Transfer Syntax UID(0002,0010)를 확인하여 비압축 전송 구문만 허용해야 함 (FR-1.2, FR-7.2)
- **FR-004**: parseMetadata(data: ArrayBuffer)는 DICOM 헤더에서 필수 태그를 파싱하여 DICOMMetadata 객체를 반환해야 함. 필수 태그: PatientName, StudyDate, Modality, Rows, Columns, BitsAllocated, PixelSpacing, SliceThickness, ImageOrientationPatient 등 (FR-1.3)
- **FR-005**: parsePixelData(data: ArrayBuffer, meta: DICOMMetadata)는 픽셀 데이터 태그(7FE0,0010)를 찾아 BitsAllocated에 따라 8/16/32비트 데이터를 추출해야 함 (FR-1.4)
- **FR-006**: handleParseError(error: ParseError)는 오류 유형별 메시지를 생성하고 타임아웃 메커니즘을 적용해야 함 (FR-1.5, HAZ-5.2)
- **FR-007**: DICOM 사전(Tags Dictionary)은 자체 내장해야 하며 외부 라이브러리 의존이 없어야 함 (ADR-2)
- **FR-008**: 바이트 오더(Byte Order)는 메타헤더에서 자동 판별하며, 판별 불가 시 Little Endian을 기본값으로 사용함
- **FR-009**: 파싱 과정에서 발생하는 모든 오류는 분류(치명적/경고/정보)되어 errors 배열에 누적됨

### Non-Functional Requirements (비기능 요구사항)
- **NFR-001 (성능)**: 512x512x300 크기 CBCT 파일(약 150MB)의 파싱은 10초 이내에 완료되어야 함
- **NFR-002 (메모리)**: 파싱 과정에서 원본 파일 크기의 2배를 초과하는 메모리를 할당하지 않아야 함
- **NFR-003 (보안)**: 파싱된 메타데이터 및 복셀 데이터는 외부로 전송되지 않고 메모리 상에만 유지됨 (FR-5.2)
- **NFR-004 (호환성)**: DICOM 3.0 표준 준수 파일에 한하여 동작함 (FR-7.2)
- **NFR-005 (안정성)**: 비표준/손상 파일 입력 시 예외를 발생시키지 않고 구조화된 오류 결과를 반환해야 함

### Key Entities (핵심 데이터 모델)
- **DICOMParser**: DICOM 파일 파싱을 담당하는 메인 클래스 - 핵심 속성: buffer, dataView, byteOffset, isLittleEndian
- **ParseResult**: 파싱 결과 객체 - 핵심 속성: metadata(DICOMMetadata), voxelData(ArrayBuffer), errors(ErrorMessage[]), isValid(boolean)
- **DICOMMetadata**: DICOM 메타데이터 구조체 - 핵심 속성: patientName, studyDate, modality, rows, columns, bitsAllocated, pixelSpacing, sliceThickness, imageOrientationPatient, transferSyntaxUID, samplesPerPixel, photometricInterpretation
- **ErrorMessage**: 오류 메시지 객체 - 핵심 속성: code(string), severity(fatal|warning|info), message(string)
- **DicomTag**: DICOM 태그 식별자 - 핵심 속성: group(number), element(number)

---

## Success Criteria

### Measurable Outcomes (측정 가능한 지표)
- **SC-001**: 유효한 DICOM 3.0 파일에 대해 parseDICOM()이 isValid=true와 함께 올바른 metadata 및 voxelData를 반환
- **SC-002**: 비표준/손상 파일에 대해 parseDICOM()이 예외 없이 isValid=false와 구체적인 errors를 반환
- **SC-003**: 150MB CBCT 파일 파싱이 10초 이내 완료
- **SC-004**: validateMagicByte가 오프셋 128의 DICM을 정확히 감지
- **SC-005**: validateTransferSyntax가 압축 전송 구문을 정확히 거부
- **SC-006**: BitsAllocated 8/16/32 각각에 대해 올바른 타입 변환 수행

### Definition of Done
- [ ] 모든 FR-001~FR-009 요구사항 구현 완료
- [ ] 단위 테스트 커버리지 90% 이상
- [ ] Edge Case(EC-001~EC-007) 시나리오 검증 완료
- [ ] DataValidator 연동 검증 완료
- [ ] 코드 리뷰 승인
- [ ] SRS 추적성(FR-1.1~1.5, FR-7.2) 매핑 확인
- [ ] HAZ-1.1, HAZ-5.2 위험 완화 조치 구현 확인
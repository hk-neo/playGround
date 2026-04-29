# 기능 명세서: parseMetadata() - DICOM 데이터셋 전체 메타데이터 파싱

**Feature Branch**: `PLAYG-1828-parse-metadata`
**Status**: Draft | **Date**: 2026-04-29
**Ticket**: `PLAYG-1828` | **Type**: Detailed Design (SDS-3.9)
**Input**: Jira 티켓 PLAYG-1828 상세 설계 요청

---

## User Scenarios & Testing

### User Story 1 - DICOM 파일 메타데이터 추출 (Priority: P1) :dart: MVP
- **설명**: DICOM 파일 버퍼를 입력받아 15개 메타데이터 필드를 자동으로 추출한다. 환자 정보, 영상 정보, 윈도우 설정 등 DICOM 데이터셋의 핵심 속성을 구조화된 DICOMMetadata 객체로 반환한다.
- **Why this priority**: 메타데이터 추출은 DICOM 뷰어의 모든 downstream 기능(렌더링, 프리셋, PHI 보호)의 전제 조건이다.
- **Independent Test**: 유효한 DICOM 버퍼를 parseMetadata()에 전달하여 반환된 metadata 객체의 15개 필드 값을 직접 검증한다.
- **Acceptance Scenarios**:
  1. **Given** 132바이트 이상의 유효한 DICOM 파일 버퍼가 주어지면, **When** parseMetadata(buffer)를 호출하면, **Then** 15개 메타데이터 필드가 포함된 DICOMMetadata 객체를 반환한다.
  2. **Given** preParsedMeta 객체가 제공되면, **When** parseMetadata(buffer, preParsedMeta)를 호출하면, **Then** 메타 그룹 재파싱 없이 데이터셋 태그 순회만 수행한다.
  3. **Given** 필수 태그(rows, columns, bitsAllocated, pixelRepresentation)가 포함된 버퍼이면, **When** 파싱 완료 후, **Then** metadata 객체에 해당 값이 정확히 저장된다.

### User Story 2 - 필수 태그 누락 검증 및 에러 보고 (Priority: P1) :dart: MVP
- **설명**: DICOM 표준에서 필수로 요구하는 태그가 누락된 경우 구조화된 에러를 생성하여 반환한다. 파싱은 중단하지 않고 최대한 진행하며, 누락된 필수 태그마다 PARSE_ERR_MISSING_REQUIRED_TAG 에러를 기록한다.
- **Why this priority**: 필수 태그 누락은 렌더링 실패의 직접적 원인이 되므로 즉각적인 에러 피드백이 필수적이다.
- **Independent Test**: 필수 태그가 의도적으로 누락된 버퍼를 입력하여 errors 배열에 PARSE_ERR_MISSING_REQUIRED_TAG 에러가 포함되는지 확인한다.
- **Acceptance Scenarios**:
  1. **Given** rows(00280010) 태그가 누락된 DICOM 버퍼이면, **When** parseMetadata() 호출 후, **Then** errors 배열에 PARSE_ERR_MISSING_REQUIRED_TAG 에러가 tag 키와 함께 포함된다.
  2. **Given** windowCenter(00281050) 태그가 누락된 DICOM 버퍼이면, **When** parseMetadata() 호출 후, **Then** metadata.windowCenter가 기본값 40으로 설정되고 PARSE_WARN_OPTIONAL_TAG_MISSING 경고가 기록된다.

### User Story 3 - 무한 루프 방지 및 버퍼 안전성 보장 (Priority: P1) :dart: MVP
- **설명**: 악의적이거나 손상된 DICOM 파일로 인한 무한 루프와 버퍼 초과 읽기를 방지한다. MAX_TAG_COUNT 상한 검사, hasRemaining() 버퍼 경계 확인, readTag() 예외 처리를 통해 프로덕션 안정성을 보장한다.
- **Why this priority**: 안전 조치 없이는 브라우저 탭이 멈추거나 메모리 오류가 발생할 수 있다.
- **Independent Test**: 조작된 버퍼(무한 루프 유도, 버퍼 초과)를 입력하여 안전하게 종료되는지 확인한다.
- **Acceptance Scenarios**:
  1. **Given** 태그가 10000개를 초과하는 DICOM 버퍼이면, **When** 파싱 중 tagCount가 MAX_TAG_COUNT에 도달하면, **Then** 순회를 강제 종료하고 그때까지 수집된 메타데이터를 반환한다.
  2. **Given** 버퍼 끝에서 태그 헤더(4바이트)가 불충분한 상황이면, **When** ctx.hasRemaining(4)가 false이면, **Then** while 루프가 자연 종료된다.
  3. **Given** readTag() 내부에서 예외가 발생하면, **When** try-catch 블록이 예외를 캐치하면, **Then** 에러를 컨텍스트에 기록하고 안전하게 break 한다.
### User Story 4 - 픽셀 데이터 그룹 조기 종료 최적화 (Priority: P2)
- **설명**: 태그 순회 중 픽셀 데이터 그룹(0x7FE0)에 도달하면 더 이상 메타데이터가 존재하지 않으므로 순회를 즉시 중단하고 픽셀 데이터 오프셋과 길이를 캐시한다.
- **Why this priority**: 성능 최적화 기능으로 기능적 정확성에는 영향이 없으나 대용량 파일에서 유의미한 성능 향상을 제공한다.
- **Independent Test**: 픽셀 데이터 그룹 앞에 수천 개의 불필요한 태그가 있는 버퍼에서 파싱 시간을 측정하여 조기 종료가 동작하는지 확인한다.
- **Acceptance Scenarios**:
  1. **Given** 그룹 번호가 0x7FE0 이상인 태그에 도달하면, **When** 순회 중 group >= PIXEL_DATA_GROUP 조건이 충족되면, **Then** _pixelDataOffset과 _pixelDataLength를 기록하고 즉시 break 한다.

### User Story 5 - PHI(개인건강정보) 자동 마스킹 (Priority: P1) :dart: MVP
- **설명**: 추출된 메타데이터 중 환자 식별 정보(patientName, patientID, patientBirthDate)를 [REDACTED]로 자동 마스킹한다. 원본 값은 phiGuard 모듈의 WeakMap에 안전하게 저장되어 필요시에만 접근 가능하다.
- **Why this priority**: 의료 소프트웨어에서 PHI 보호는 법적 및 규제적 필수 사항이다.
- **Independent Test**: patientName과 patientID가 포함된 버퍼 파싱 후 metadata 객체에서 해당 필드가 [REDACTED]로 치환되었는지 확인한다.
- **Acceptance Scenarios**:
  1. **Given** patientName과 patientID가 포함된 DICOM 버퍼이면, **When** parseMetadata() 호출 후, **Then** metadata.patientName과 metadata.patientID가 [REDACTED]로 마스킹된다.
  2. **Given** 마스킹된 메타데이터이면, **When** phiGuard 모듈의 WeakMap을 조회하면, **Then** 원본 환자 식별 정보를 안전하게 복원할 수 있다.

### Edge Cases (엣지 케이스)
- **EC-001**: buffer가 null이거나 undefined인 경우 - PARSE_ERR_UNEXPECTED 에러 발생
- **EC-002**: buffer.byteLength가 132바이트 미만인 경우 - 최소 크기 검증 실패로 PARSE_ERR_UNEXPECTED 에러
- **EC-003**: preParsedMeta가 제공되었으나 transferSyntaxUID가 누락된 경우 - parseMetaGroup() 재호출
- **EC-004**: 모든 필수 태그가 누락된 극단적 손상 파일 - 다수의 PARSE_ERR_MISSING_REQUIRED_TAG 에러 반환
- **EC-005**: readTag()가 예외를 발생시키는 손상 태그 - 에러 기록 후 안전한 break
- **EC-006**: tagCount가 정확히 MAX_TAG_COUNT(10000)에 도달한 경우 - 정상 종료 (초과 시에만 강제 종료)
- **EC-007**: pixelSpacing(00280030) 값이 단일 값인 경우 (정상은 2개 값) - 기본값 [1, 1] 적용
- **EC-008**: bitsStored 누락 시 기본값 16 적용 - 렌더링 품질 저하 가능성 경고
---

## Requirements

### Functional Requirements (기능 요구사항)

- **FR-001**: 시스템은 DICOM 파일 버퍼(ArrayBuffer)를 입력받아 메타데이터를 추출하는 parseMetadata(buffer, preParsedMeta) 함수를 제공해야 한다. 함수 시그니처: parseMetadata(buffer: ArrayBuffer, preParsedMeta?: Object) -> { metadata, context, errors, transferSyntaxUID, _pixelDataOffset, _pixelDataLength }
- **FR-002**: 시스템은 버퍼 크기가 DICOM_MIN_FILE_SIZE(132바이트) 미만이거나 null/undefined인 경우 PARSE_ERR_UNEXPECTED 에러를 발생시켜야 한다. (추적: HAZ-5.1)
- **FR-003**: 시스템은 preParsedMeta가 제공된 경우 메타 그룹(0002) 재파싱을 건너뛰고 전달받은 transferSyntaxUID와 metaEndOffset을 재사용해야 한다.
- **FR-004**: 시스템은 preParsedMeta가 없는 경우 parseMetaGroup(buffer)를 호출하여 전송 구문 UID와 메타 종료 오프셋을 획득해야 한다.
- **FR-005**: 시스템은 createParseContext(buffer, transferSyntaxUID, metaEndOffset)로 파싱 컨텍스트를 생성해야 한다. 컨텍스트는 바이트 오더 및 VR 모드를 전송 구문에 따라 자동 설정한다.
- **FR-006**: 시스템은 while 루프로 데이터셋 태그를 순차 순회하며 readTag(ctx)로 각 태그를 읽어야 한다. 순회 조건: ctx.hasRemaining(4) && tagCount < MAX_TAG_COUNT(10000). (추적: FR-2.2)
- **FR-007**: 시스템은 METADATA_TAGS 사전에 정의된 15개 필드의 태그와 매칭되는 경우 수집된 값 객체(collected)에 저장해야 한다. (추적: FR-2.3)

  | 태그 키 | 필드명 | 필수 여부 | 기본값 |
  |---------|--------|-----------|--------|
  | 00100010 | patientName | 선택 | (빈 문자열) |
  | 00100020 | patientID | 선택 | (빈 문자열) |
  | 0020000D | studyInstanceUID | 선택 | (빈 문자열) |
  | 0020000E | seriesInstanceUID | 선택 | (빈 문자열) |
  | 00280010 | rows | 필수 | 없음 (에러) |
  | 00280011 | columns | 필수 | 없음 (에러) |
  | 00280100 | bitsAllocated | 필수 | 없음 (에러) |
  | 00280101 | bitsStored | 선택 | 16 |
  | 00280103 | pixelRepresentation | 필수 | 없음 (에러) |
  | 00281050 | windowCenter | 선택 | 40 |
  | 00281051 | windowWidth | 선택 | 400 |
  | 00180050 | sliceThickness | 선택 | 0 |
  | 00280030 | pixelSpacing | 선택 | [1, 1] |
  | 00280004 | photometricInterpretation | 선택 | MONOCHROME2 |
  | 00280002 | samplesPerPixel | 선택 | 1 |

- **FR-008**: 시스템은 필수 태그(rows, columns, bitsAllocated, pixelRepresentation) 누락 시 PARSE_ERR_MISSING_REQUIRED_TAG 에러를 생성해야 한다. (추적: FR-1.3, HAZ-1.3)
- **FR-009**: 시스템은 선택 태그 누락 시 METADATA_TAGS에 정의된 defaultValue를 적용하고 PARSE_WARN_OPTIONAL_TAG_MISSING 경고를 기록해야 한다.
- **FR-010**: 시스템은 createDICOMMetadata() 팩토리 함수로 25개 필드 메타데이터 객체를 생성해야 한다. 이때 highBit는 bitsAllocated - 1로 자동 계산한다.
- **FR-011**: 시스템은 maskPhiFields(metadata)를 호출하여 patientName, patientID, patientBirthDate를 [REDACTED]로 마스킹해야 한다. 원본은 WeakMap에 안전 저장한다. (추적: FR-4.1, HAZ-3.1)
- **FR-012**: 시스템은 반환값으로 { metadata, context, errors, transferSyntaxUID, _pixelDataOffset, _pixelDataLength } 객체를 반환해야 한다.
### Non-Functional Requirements (비기능 요구사항)

- **NFR-001 (안전성)**: 무한 루프 방지를 위해 MAX_TAG_COUNT(10000) 상한을 초과하면 순회를 강제 종료해야 한다. (추적: FR-2.4, HAZ-5.1)
- **NFR-002 (안전성)**: 모든 버퍼 읽기 전 ctx.hasRemaining()으로 잔여 바이트를 확인하여 버퍼 초과 읽기를 방지해야 한다. (추적: FR-2.6, HAZ-5.3)
- **NFR-003 (성능)**: 픽셀 데이터 그룹(0x7FE0) 도달 시 불필요한 태그 순회를 즉시 중단하여 파싱 성능을 최적화해야 한다.
- **NFR-004 (보안)**: PHI 필드 마스킹은 파싱 결과 반환 전 반드시 수행되어야 하며, 원본 데이터는 WeakMap에만 저장되어 GC 대상이 되도록 해야 한다. (추적: HAZ-3.1)
- **NFR-005 (예외 안전성)**: readTag() 예외 발생 시 에러를 기록하고 안전하게 파싱을 종료해야 한다. 예외가 호출자로 전파되지 않아야 한다.

### Key Entities (핵심 데이터 모델)

- **DICOMMetadata**: createDICOMMetadata() 팩토리로 생성되는 25개 필드 메타데이터 객체. 핵심 속성: patientName, patientID, rows, columns, bitsAllocated, bitsStored, pixelRepresentation, windowCenter, windowWidth, sliceThickness, pixelSpacing, photometricInterpretation, samplesPerPixel, highBit(자동계산) 등
- **ParseContext**: 파싱 세션 상태 관리 객체. 핵심 속성: offset, buffer, dataView, isLittleEndian, isExplicitVR, errors
- **METADATA_TAGS**: 15개 DICOM 태그 정의 사전 (상수). 각 항목 속성: tag키(GGGGEEEE 형식), field(필드명), required(필수 여부), defaultValue(선택 태그 기본값)
- **ParseError**: CBVError.ParseError 커스텀 에러 클래스. PARSE_ERR_UNEXPECTED, PARSE_ERR_MISSING_REQUIRED_TAG 에러 코드 포함

### 연관 모듈 의존성

| 모듈 | 함수/상수 | 역할 | 연관 SDS |
|------|-----------|------|----------|
| metaGroupParser | parseMetaGroup() | 파일 메타 정보 그룹(0002) 파싱, 전송 구문 UID 결정 | SDS-3.8 |
| ParseContext | createParseContext() | 전송 구문 기반 바이트 오더/VR 모드 자동 설정 | SDS-3.4 |
| tagReader | readTag() | 개별 DICOM 태그 읽기 (Explicit/Implicit VR 지원) | SDS-3.5, SDS-3.6 |
| phiGuard | maskPhiFields() | PHI 필드 마스킹 및 WeakMap 원본 저장 | SDS-3.13 |
| DICOMMetadata | createDICOMMetadata() | 25개 필드 메타데이터 객체 팩토리 | SDS-3.10 |
| constants | METADATA_TAGS, MAX_TAG_COUNT, PIXEL_DATA_GROUP, DICOM_MIN_FILE_SIZE | 파싱 상수 정의 | - |
| dicomDictionary | makeTagKey() | group+element 조합의 태그 키 생성 (GGGGEEEE 형식) | - |
| CBVError | ParseError | 파싱 오류 발생 시 throw 커스텀 에러 클래스 | - |
---

## Success Criteria

### Measurable Outcomes (측정 가능한 지표)

- **SC-001**: 유효한 DICOM 버퍼 입력 시 15개 메타데이터 필드가 100% 정확하게 추출된다.
- **SC-002**: 필수 태그 누락 시 PARSE_ERR_MISSING_REQUIRED_TAG 에러가 100% 감지되어 errors 배열에 포함된다.
- **SC-003**: 선택 태그 누락 시 기본값이 정확히 적용되고 PARSE_WARN_OPTIONAL_TAG_MISSING 경고가 기록된다.
- **SC-004**: 10000개 초과 태그 버퍼에서 무한 루프 없이 안전하게 종료된다.
- **SC-005**: 픽셀 데이터 그룹(0x7FE0) 이후 불필요한 태그 순회가 발생하지 않는다.
- **SC-006**: PHI 필드(patientName, patientID, patientBirthDate)가 [REDACTED]로 마스킹되고 원본은 WeakMap에서 복원 가능하다.
- **SC-007**: preParsedMeta 제공 시 메타 그룹 재파싱이 발생하지 않는다 (중복 파싱 방지).

### Definition of Done

- [ ] 모든 FR-001 ~ FR-012 요구사항 구현 완료
- [ ] parseMetadata() 함수가 9단계 파싱 절차를 정확히 수행
- [ ] 단위 테스트 커버리지 90% 이상 (parseMetadata 함수)
- [ ] Edge Case 시나리오(EC-001 ~ EC-008) 검증 완료
- [ ] readTag() 예외 발생 시 안전한 종료 확인
- [ ] MAX_TAG_COUNT 도달 시 강제 종료 확인
- [ ] PHI 마스킹 적용 및 WeakMap 원본 저장 확인
- [ ] 기존 parseMetadata() 통합 테스트 회귀 없음
- [ ] 코드 리뷰 승인
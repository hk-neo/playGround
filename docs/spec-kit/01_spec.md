# Feature Specification: DICOMMetadata 타입 팩토리 (DICOMMetadata.js)

**Feature Branch**: `PLAYG-1817-dicomm-metadata-type-factory`
**Status**: Draft | **Date**: 2026-04-26
**Ticket**: `PLAYG-1817` | **Type**: Detailed Design
**Input**: SDS-1.2 상세 설계 (Jira Description)

---

## User Scenarios & Testing

### User Story 1 — DICOMMetadata 기본 객체 생성 (Priority: P1)
- **설명**: 개발자가 인자 없이 createDICOMMetadata()를 호출하면, DICOM 파일 메타데이터의 28개 속성이 모두 안전한 기본값으로 채워진 객체를 반환받는다.
- **Why this priority**: 메타데이터 파서(metadataParser.js)가 정상 동작하기 위한 필수 전제 조건이며, 모든 후속 기능의 기반이 된다.
- **Independent Test**: createDICOMMetadata() 무인자 호출 후 반환 객체의 28개 속성 값을 기대값과 비교
- **Acceptance Scenarios**:
  1. **Given** createDICOMMetadata() 함수가 정의됨, **When** 인자 없이 호출 시, **Then** 28개 속성이 모두 기본값으로 채워진 객체를 반환함 (문자열: 빈 문자열, 숫자: 0 또는 명세값, 배열: 유효 길이 배열)
  2. **Given** createDICOMMetadata() 호출 결과, **When** 반환 객체의 각 속성을 검사 시, **Then** null/undefined가 존재하지 않음

### User Story 2 — 사용자 지정값으로 메타데이터 객체 생성 (Priority: P1)
- **설명**: 개발자가 overrides 객체를 전달하면, 기본값 위에 사용자 지정값이 덮어쓰기된 DICOMMetadata 객체를 반환받는다.
- **Why this priority**: metadataParser.js가 파싱한 실제 DICOM 태그 값을 메타데이터 객체에 반영하는 핵심 경로이다.
- **Independent Test**: 특정 속성(rows, columns, pixelSpacing 등)을 override로 전달 후 반영 여부 확인
- **Acceptance Scenarios**:
  1. **Given** createDICOMMetadata() 함수가 정의됨, **When** {rows: 512, columns: 512}를 전달 시, **Then** rows=512, columns=512이고 나머지 속성은 기본값인 객체 반환
  2. **Given** createDICOMMetadata() 함수가 정의됨, **When** {pixelSpacing: [0.3, 0.3]}를 전달 시, **Then** pixelSpacing=[0.3, 0.3]이 정확히 반영됨
  3. **Given** createDICOMMetadata()에 추가 필드(예: photometricInterpretation)를 전달 시, **When** Object Spread로 병합되면, **Then** 추가 필드도 객체에 포함됨

### User Story 3 — 참조 독립성 보장 (Priority: P1)
- **설명**: createDICOMMetadata()를 여러 번 호출하면 각각 독립적인 참조를 가진 새 객체를 반환하여 참조 오염을 방지한다.
- **Why this priority**: 공유 참조로 인한 의도치 않은 부작용(HAZ-5.1)을 방지하는 안전성 요구사항이다.
- **Independent Test**: 두 번 호출하여 반환된 객체가 서로 다른 참조인지 확인
- **Acceptance Scenarios**:
  1. **Given** createDICOMMetadata() 함수가 정의됨, **When** 연속으로 두 번 호출 시, **Then** 두 반환 객체는 서로 다른 참조임
  2. **Given** 첫 번째 반환 객체의 속성을 변경함, **When** 두 번째 반환 객체를 검사 시, **Then** 두 번째 객체는 영향을 받지 않음

### User Story 4 — PHI 대상 필드 정의 (Priority: P2)
- **설명**: DICOMMetadata 타입에 PHI(개인건강정보) 대상 필드(patientName, patientID, patientBirthDate)가 명시적으로 정의되어 phiGuard.js에서 마스킹할 수 있다.
- **Why this priority**: 보안 요구사항(FR-4.1)이지만 타입 정의만으로 기능하므로 P2로 지정.
- **Independent Test**: 반환 객체에 PHI 필드 3개가 빈 문자열 기본값으로 존재하는지 확인
- **Acceptance Scenarios**:
  1. **Given** createDICOMMetadata() 무인자 호출, **When** 반환 객체를 검사 시, **Then** patientName, patientID, patientBirthDate 속성이 빈 문자열로 존재함
  2. **Given** phiGuard.js가 DICOMMetadata 객체를 수신함, **When** PHI 필드를 마스킹 시, **Then** 해당 필드값이 [REDACTED]로 치환됨

### User Story 5 — 필수 DICOM 태그 기본값 제공 (Priority: P2)
- **설명**: rows, columns, bitsAllocated, pixelRepresentation 등 필수 태그에 대해 안전한 기본값을 제공하여 필수 태그 누락 시에도 파서가 에러를 발생시킬 수 있는 기반을 마련한다.
- **Why this priority**: 필수 태그 검증(FR-1.3)과 HAZ-1.3 완화를 위한 기반이지만, 실제 검증 로직은 metadataParser.js에 구현된다.
- **Independent Test**: 무인자 호출 시 필수 필드 기본값(rows=0, columns=0, bitsAllocated=16, pixelRepresentation=0) 확인
- **Acceptance Scenarios**:
  1. **Given** createDICOMMetadata() 무인자 호출, **When** 필수 필드를 검사 시, **Then** rows=0, columns=0, bitsAllocated=16, pixelRepresentation=0임

### Edge Cases (엣지 케이스)
- **EC-001**: overrides에 null 또는 undefined를 전달한 경우 -> 빈 객체로 간주하여 기본값만으로 객체 생성
- **EC-002**: overrides에 정의되지 않은 추가 속성(예: photometricInterpretation, samplesPerPixel)을 전달한 경우 -> Object Spread에 의해 추가 필드도 객체에 포함됨
- **EC-003**: overrides의 배열 필드에 길이가 다른 배열을 전달한 경우 -> 전달된 배열 그대로 반영됨 (팩토리에서 길이 검증은 수행하지 않음)
- **EC-004**: 배열 기본값(pixelSpacing, imageOrientationPatient 등)의 참조 독립성 -> 매 호출 시 새 배열 리터럴을 생성하여 참조 오염 방지

---

## Requirements

### Functional Requirements (기능 요구사항)
- **FR-001**: 시스템은 DICOMMetadata typedef를 JSDoc으로 정의해야 하며, 28개 속성(patientName, patientID, patientBirthDate, studyDate, studyTime, studyDescription, modality, bodyPartExamined, sliceThickness, kvp, xRayTubeCurrent, pixelSpacing, imageOrientationPatient, imagePositionPatient, rows, columns, numberOfFrames, bitsAllocated, bitsStored, highBit, pixelRepresentation, windowCenter, windowWidth, transferSyntax, studyInstanceUID, seriesInstanceUID, sopInstanceUID)을 포함해야 함
- **FR-002**: 시스템은 createDICOMMetadata(overrides?) 팩토리 함수를 제공해야 하며, Partial<DICOMMetadata> 타입의 선택적 인자를 받아 DICOMMetadata 객체를 반환해야 함
- **FR-003**: 팩토리 함수는 호출 시마다 새로운 독립 객체를 반환해야 하며, 기본 배열 필드는 매 호출 시 새 배열 리터럴로 생성되어 참조 오염이 발생하지 않아야 함
- **FR-004**: 기본값은 다음 원칙을 따라야 함: 문자열은 빈 문자열, 숫자는 0, 배열은 유효 길이 배열, numberOfFrames는 1, bitsAllocated는 16
- **FR-005**: PHI 대상 필드(patientName, patientID, patientBirthDate)는 빈 문자열 기본값으로 정의되어 phiGuard.js에서 마스킹 대상으로 식별 가능해야 함 (FR-4.1, HAZ-3.1)
- **FR-006**: 필수 태그(rows, columns, bitsAllocated, pixelRepresentation)는 명확한 기본값을 가져야 하며, metadataParser.js에서 PARSE_ERR_MISSING_REQUIRED_TAG 에러 발생의 판단 기준이 되어야 함 (FR-1.3, HAZ-1.3)
- **FR-007**: 팩토리 함수는 DICOMMetadata에 정의되지 않은 추가 속성도 Object Spread에 의해 포함할 수 있어야 함 (metadataParser.js의 photometricInterpretation, samplesPerPixel 등)

### Non-Functional Requirements (비기능 요구사항)
- **NFR-001 (성능)**: 팩토리 함수는 순수 객체 리터럴 생성과 Object Spread만 사용하므로 O(1) 시간 복잡도를 가져야 함. 외부 의존성이 없으므로 로드 시간 오버헤드가 0이어야 함.
- **NFR-002 (보안)**: PHI 필드(patientName, patientID, patientBirthDate)는 기본적으로 빈 문자열이며, 원본 값은 WeakMap(phiStore)에 저장되어 외부 모듈에서 직접 접근 불가해야 함. 원본 조회는 getPhiValue()를 통해서만 가능해야 함.
- **NFR-003 (유지보수성)**: JavaScript 네이티브 타입만 사용하고 별도 클래스를 정의하지 않아야 함. IEC 62304 Class A 기준에 따라 plain object + JSDoc typedef 방식을 사용해야 함.
- **NFR-004 (호환성)**: DICOM PS3.5 VR(Value Representation)에 따른 데이터 타입 매핑과 DICOM PS3.10 파일 메타 정보 그룹(0002) 태그 정의를 준수해야 함.

### Key Entities (핵심 데이터 모델)
- **DICOMMetadata (typedef)**: DICOM 파일에서 추출하는 메타데이터 28개 필드를 정의한 plain object 타입. JavaScript 네이티브 타입(string, number, number[])만 사용.
  - PHI 필드: patientName(string), patientID(string), patientBirthDate(string)
  - 검사 정보: studyDate(string), studyTime(string), studyDescription(string), modality(string), bodyPartExamined(string)
  - 영상 파라미터: sliceThickness(number), kvp(number), xRayTubeCurrent(number)
  - 배열 필드: pixelSpacing(number[]), imageOrientationPatient(number[]), imagePositionPatient(number[])
  - 필수 필드: rows(number), columns(number), bitsAllocated(number), pixelRepresentation(number)
  - 선택 숫자 필드: numberOfFrames(number), bitsStored(number), highBit(number), windowCenter(number), windowWidth(number)
  - 문자열 식별자: transferSyntax(string), studyInstanceUID(string), seriesInstanceUID(string), sopInstanceUID(string)

---

## Success Criteria

### Measurable Outcomes (측정 가능한 지표)
- **SC-001**: TC-1.2.1 - createDICOMMetadata() 무인자 호출 시 28개 속성이 모두 기본값으로 채워진 객체 반환 (추적: FR-2.3)
- **SC-002**: TC-1.2.2 - createDICOMMetadata({rows:512, columns:512}) 호출 시 지정값은 반영, 나머지는 기본값 유지 (추적: FR-2.3)
- **SC-003**: TC-1.2.3 - createDICOMMetadata({pixelSpacing:[0.3,0.3]}) 호출 시 배열 값이 정확히 반영됨 (추적: FR-2.3)
- **SC-004**: TC-1.2.4 - 두 번 연속 호출 시 서로 다른 참조 반환 (참조 오염 없음) (추적: HAZ-5.1)
- **SC-005**: TC-1.2.5 - 필수 필드 기본값 검증: rows=0, columns=0, bitsAllocated=16, pixelRepresentation=0 (추적: FR-1.3)
- **SC-006**: TC-1.2.6 - PHI 대상 필드 3개(patientName, patientID, patientBirthDate)가 빈 문자열 기본값으로 존재 (추적: FR-4.1, HAZ-3.1)

### Definition of Done
- [ ] 모든 FR-001 ~ FR-007 요구사항 구현 완료
- [ ] TC-1.2.1 ~ TC-1.2.6 단위 테스트 통과
- [ ] 단위 테스트 커버리지 100% (함수 1개, 타입 정의 1개)
- [ ] Edge Case 시나리오(EC-001 ~ EC-004) 검증 완료
- [ ] 외부 의존성 0개 확인
- [ ] metadataParser.js 연동 검증 완료
- [ ] PHI 필드 마스킹 연동(phiGuard.js) 검증 완료
- [ ] 코드 리뷰 승인

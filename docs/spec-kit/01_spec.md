# Feature Specification: DentiView3D - validateTransferSyntax() 전송구문검증

**Feature Branch**: PLAYG-1822-validate-transfer-syntax
**Status**: Draft | **Date**: 2026-04-28
**Ticket**: PLAYG-1822 | **Type**: Detailed Design (SDS-3.3)
**Input**: docs/artifacts/SRS.md (FR-1.2), docs/artifacts/SAD.md (COMP-2)

---

## User Scenarios & Testing

### User Story 1 - 정상 전송 구문 검증 (Priority: P1)
- **설명**: DICOM 파일 메타 정보에서 추출한 전송 구문 UID가 시스템에서 지원하는 3종 비압축 인코딩 방식(Explicit VR LE, Explicit VR BE, Implicit VR LE) 중 하나인 경우 검증을 통과하여 true를 반환한다.
- **Why this priority**: DICOM 파일 파싱 파이프라인의 핵심 분기점으로, 전송 구문에 따라 후속 메타데이터 파싱의 VR 모드 및 바이트 오더가 결정되므로 최우선 구현이 필요하다.
- **Independent Test**: SUPPORTED_TRANSFER_SYNTAXES 배열의 각 UID를 직접 전달하여 true 반환 여부를 확인한다.
- **Acceptance Scenarios**:
  1. **Given** transferSyntaxUID이 1.2.840.10008.1.2.1(Explicit VR Little Endian)이고, **When** validateTransferSyntax()를 호출하면, **Then** true를 반환하고 ParseContext에 VR 모드=Explicit, 바이트 오더=Little Endian이 설정된다
  2. **Given** transferSyntaxUID이 1.2.840.10008.1.2.2(Explicit VR Big Endian)이고, **When** validateTransferSyntax()를 호출하면, **Then** true를 반환하고 ParseContext에 VR 모드=Explicit, 바이트 오더=Big Endian이 설정된다
  3. **Given** transferSyntaxUID이 1.2.840.10008.1.2(Implicit VR Little Endian)이고, **When** validateTransferSyntax()를 호출하면, **Then** true를 반환하고 ParseContext에 VR 모드=Implicit, 바이트 오더=Little Endian이 설정된다

### User Story 2 - 미지원 전송 구문 거부 (Priority: P1)
- **설명**: 시스템에서 지원하지 않는 전송 구문 UID(압축 인코딩, 존재하지 않는 UID 등)가 입력되면 PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX 에러를 발생시키고 false를 반환하여 후속 파싱을 중단한다.
- **Why this priority**: 압축 전송 구문이나 잘못된 UID로 파싱을 진행하면 데이터 훼손 및 런타임 오류가 발생할 수 있으므로 안전 차원에서 필수이다.
- **Independent Test**: 지원하지 않는 UID(예: JPEG Lossless 1.2.840.10008.1.2.4.70)를 전달하여 false 반환 및 에러 코드 발생을 확인한다.
- **Acceptance Scenarios**:
  1. **Given** transferSyntaxUID이 압축 전송 구문(예: 1.2.840.10008.1.2.4.70)이고, **When** validateTransferSyntax()를 호출하면, **Then** false를 반환하고 ErrorManager.handleError(PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX)가 호출되며 ParseResult.errors에 에러가 기록된다
  2. **Given** transferSyntaxUID이 임의의 존재하지 않는 UID 문자열이고, **When** validateTransferSyntax()를 호출하면, **Then** false를 반환하고 동일한 에러 처리가 수행된다

### User Story 3 - null/빈값 입력 방어 (Priority: P1)
- **설명**: 전송 구문 UID가 null, undefined, 빈 문자열인 경우 PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX 에러를 발생시키고 false를 반환한다.
- **Why this priority**: 메타 그룹 파싱 단계에서 전송 구문 필드가 누락되거나 비어 있는 비정상 DICOM 파일에 대한 방어 로직으로 안전 등급 Class A 필수 요구사항이다.
- **Independent Test**: null, undefined, 빈 문자열을 각각 전달하여 false 반환 및 에러 처리를 확인한다.
- **Acceptance Scenarios**:
  1. **Given** transferSyntaxUID이 null이고, **When** validateTransferSyntax()를 호출하면, **Then** false를 반환하고 ErrorManager.handleError(PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX)가 호출된다
  2. **Given** transferSyntaxUID이 undefined이고, **When** validateTransferSyntax()를 호출하면, **Then** false를 반환하고 동일한 에러 처리가 수행된다
  3. **Given** transferSyntaxUID이 빈 문자열이고, **When** validateTransferSyntax()를 호출하면, **Then** false를 반환하고 동일한 에러 처리가 수행된다

### Edge Cases (엣지 케이스)
- **EC-001**: 전송 구문 UID 문자열에 선행/후행 공백이 포함된 경우 - 공백이 포함된 채로는 SUPPORTED_TRANSFER_SYNTAXES와 불일치하므로 미지원으로 처리됨
- **EC-002**: 대소문자가 다른 UID 입력 - DICOM UID는 OID 기반으로 대소문자 구분이 없으나, 본 함수는 문자열 정확 일치(exact match)를 사용하므로 사양에 맞는 정확한 UID만 허용됨
- **EC-003**: 숫자 타입의 UID 입력 - 함수 시그니처가 string 타입이므로 타입 스크립트/런타임에서 사전 차단됨

---

## Requirements

### 기능 요구사항 (Functional Requirements)
- **FR-1.2.1**: 시스템은 validateTransferSyntax(transferSyntaxUID: string): boolean 함수를 제공해야 하며, SUPPORTED_TRANSFER_SYNTAXES 상수 배열(3종 UID)을 기준으로 입력 UID의 유효성을 검증해야 한다
- **FR-1.2.2**: 입력값이 null, undefined, 빈 문자열인 경우 PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX 에러를 발생시키고 false를 반환해야 한다
- **FR-1.2.3**: 입력 UID가 SUPPORTED_TRANSFER_SYNTAXES에 포함된 경우 true를 반환하며, ParseContext에 해당 전송 구문의 VR 모드(Explicit/Implicit)와 바이트 오더(Little Endian/Big Endian)를 설정해야 한다
- **FR-1.2.4**: 입력 UID가 SUPPORTED_TRANSFER_SYNTAXES에 포함되지 않은 경우 PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX 에러를 발생시키고 false를 반환하며, ParseResult.errors에 에러 코드를 추가해야 한다
- **FR-1.2.5**: validateTransferSyntax()는 DicomParser.parseDICOM() 내에서 validateMagicByte() 통과 후, parseMetadata() 호출 전에 실행되어야 한다

### 비기능 요구사항 (Non-Functional Requirements)
- **NFR-001 (안전)**: IEC 62304 Class A 요구사항에 따라 모든 실행 경로에서 명시적 반환값(boolean)을 보장해야 하며, 예외 미발생(uncaught exception 없음)을 보장해야 한다
- **NFR-002 (성능)**: SUPPORTED_TRANSFER_SYNTAXES 배열 크기가 3개(고정)이므로 O(n) 선형 검색으로 충분하며, 함수 실행 시간은 1ms 이내여야 한다
- **NFR-003 (추적성)**: 본 함수는 FR-1.2(전송 구문 검증), HAZ-1.2, RMR-03에 추적 가능해야 하며, 단위 테스트 TC-3.3.1~TC-3.3.7로 검증되어야 한다

### 핵심 데이터 모델 (Key Entities)
- **SUPPORTED_TRANSFER_SYNTAXES**: string[] - 시스템 지원 전송 구문 UID 배열. 요소: 1.2.840.10008.1.2.1(Explicit VR LE), 1.2.840.10008.1.2.2(Explicit VR BE), 1.2.840.10008.1.2(Implicit VR LE)
- **ParseContext**: 파싱 컨텍스트 객체 - 핵심 속성: vrMode(Explicit|Implicit), byteOrder(LittleEndian|BigEndian). validateTransferSyntax() 성공 시 설정됨
- **ParseResult**: 파싱 결과 객체 - 핵심 속성: errors(ErrorCode[]). validateTransferSyntax() 실패 시 PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX가 추가됨
- **ErrorManager**: 에러 관리 모듈 (COMP-7) - handleError(errorCode: string) 메서드를 통해 에러 메시지 생성 및 로깅 수행

---

## Success Criteria

### 측정 가능한 지표 (Measurable Outcomes)
- **SC-001**: TC-3.3.1~TC-3.3.3 (정상 UID 3종) 테스트가 모두 true를 반환하고 각각 올바른 VR 모드와 바이트 오더가 ParseContext에 설정됨
- **SC-002**: TC-3.3.4~TC-3.3.7 (압축 UID, null, 빈 문자열, 존재하지 않는 UID) 테스트가 모두 false를 반환하고 ErrorManager.handleError가 호출됨
- **SC-003**: 모든 실행 경로(정상/비정상)에서 예외 발생 없이 boolean 값이 반환됨

### Definition of Done
- [ ] FR-1.2.1~FR-1.2.5 모든 기능 요구사항 구현 완료
- [ ] 단위 테스트 TC-3.3.1~TC-3.3.7 전부 통과
- [ ] Edge Case 시나리오(EC-001~EC-003) 검증 완료
- [ ] IEC 62304 Class A 단위 테스트 증거 문서화 완료
- [ ] 코드 리뷰 승인
- [ ] SRS FR-1.2, SAD COMP-2 추적성 매트릭스 업데이트
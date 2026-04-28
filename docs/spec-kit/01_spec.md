# Feature Specification: createParseContext() 파싱컨텍스트 팩토리

**Feature Branch**: `PLAYG-1823-parse-context-factory`
**Status**: Draft | **Date**: 2026-04-28
**Ticket**: `PLAYG-1823` | **Type**: Detailed Design
**Input**: 티켓 description (PRD/SRS 문서 없음)

---

## User Scenarios & Testing

### User Story 1 — 전송 구문 기반 ParseContext 객체 생성 (Priority: P1) 🎯 MVP
- **설명**: DICOM 파일 파싱을 시작할 때, 전송 구문(Transfer Syntax) UID를 전달하면 바이트 오더와 VR 모드가 자동으로 설정된 ParseContext 객체를 생성한다.
- **Why this priority**: ParseContext는 모든 DICOM 파싱 로직의 기반이 되는 컨텍스트 객체로, 이것 없이는 어떤 파싱 작업도 수행할 수 없다.
- **Independent Test**: 다양한 전송 구문 UID(Explicit VR LE, Implicit VR LE, Big Endian)를 전달하여 반환된 객체의 isExplicitVR, isLittleEndian 속성이 올바른지 단위 테스트로 검증한다.
- **Acceptance Scenarios**:
  1. **Given** 유효한 ArrayBuffer와 `1.2.840.10008.1.2.1`(Explicit VR LE) UID가 주어졌을 때, **When** `createParseContext(buffer, uid)`를 호출하면, **Then** 반환 객체의 isExplicitVR=true, isLittleEndian=true이어야 한다.
  2. **Given** 유효한 ArrayBuffer와 `1.2.840.10008.1.2`(Implicit VR LE) UID가 주어졌을 때, **When** `createParseContext(buffer, uid)`를 호출하면, **Then** 반환 객체의 isExplicitVR=false, isLittleEndian=true이어야 한다.
  3. **Given** 유효한 ArrayBuffer와 `1.2.840.10008.1.2.2`(Big Endian) UID가 주어졌을 때, **When** `createParseContext(buffer, uid)`를 호출하면, **Then** 반환 객체의 isExplicitVR=true, isLittleEndian=false이어야 한다.

### User Story 2 — 버퍼 읽기 유틸리티 메서드 제공 (Priority: P1) 🎯 MVP
- **설명**: ParseContext 객체는 버퍼에서 데이터를 읽기 위한 메서드(readUint16, readUint32, readInt16, readString, readBytes)를 제공하며, 읽기 후 offset이 자동으로 전진한다.
- **Why this priority**: 파서 모듈들이 DICOM 태그의 그룹 번호, 엘리먼트 번호, 길이 등을 읽기 위해 필수적으로 사용하는 핵심 기능이다.
- **Independent Test**:已知 offset 위치의 버퍼에 특정 바이트 값을 쓰고, 각 read 메서드 호출 후 반환값과 offset 증가량을 단위 테스트로 검증한다.
- **Acceptance Scenarios**:
  1. **Given** offset=0이고 버퍼에 Little-Endian으로 `0x0010`이 저장되어 있을 때, **When** `readUint16()`을 호출하면, **Then** 16을 반환하고 offset은 2가 되어야 한다.
  2. **Given** offset=0이고 버퍼에 `ABCD` 문자열이 저장되어 있을 때, **When** `readString(4)`를 호출하면, **Then** `'ABCD'`를 반환하고 offset은 4가 되어야 한다.
  3. **Given** offset=0이고 버퍼에 4바이트가 저장되어 있을 때, **When** `readBytes(4)`를 호출하면, **Then** 길이 4의 Uint8Array를 반환하고 offset은 4가 되어야 한다.

### User Story 3 — offset 제어 및 남은 바이트 확인 (Priority: P2)
- **설명**: ParseContext 객체는 `advance(amount)`, `remaining()`, `hasRemaining(n)` 메서드를 제공하여 파서가 버퍼 탐색 위치를 유연하게 제어할 수 있게 한다.
- **Why this priority**: 파싱 루프에서 시퀀스_delimiter 처리, 길이 기반 스킵 등에 필수적이지만, 기본 read 메서드보다 보조적인 성격이다.
- **Independent Test**: startOffset이 10인 상태에서 advance(5), remaining(), hasRemaining() 호출 결과를 단위 테스트로 검증한다.
- **Acceptance Scenarios**:
  1. **Given** 100바이트 버퍼와 startOffset=10으로 생성된 ParseContext에서, **When** `remaining()`을 호출하면, **Then** 90을 반환해야 한다.
  2. **Given** offset=50인 상태에서, **When** `hasRemaining(60)`을 호출하면, **Then** false를 반환해야 한다.
  3. **Given** offset=10인 상태에서, **When** `advance(20)`을 호출하면, **Then** offset은 30이 되어야 한다.

### User Story 4 — 예외 및 기본값 처리 (Priority: P2)
- **설명**: 전송 구문 UID가 null/undefined인 경우 기본값(EXPLICIT_VR_LE)으로 동작하며, 파싱 중 발생한 오류는 errors 배열에 수집된다.
- **Why this priority**: 견고한 파싱을 위해 필수적이지만, 정상 경로가 먼저 검증되어야 한다.
- **Independent Test**: null/undefined UID를 전달한 경우와 버퍼 경계를 벗어나는 읽기를 시도한 경우의 동작을 단위 테스트로 검증한다.
- **Acceptance Scenarios**:
  1. **Given** transferSyntaxUID가 null일 때, **When** `createParseContext(buffer, null)`을 호출하면, **Then** isExplicitVR=true, isLittleEndian=true(기본값)으로 설정되어야 한다.
  2. **Given** transferSyntaxUID가 undefined일 때, **When** `createParseContext(buffer, undefined)`을 호출하면, **Then** 기본값(EXPLICIT_VR_LE) 설정으로 정상 생성되어야 한다.
  3. **Given** buffer가 null일 때, **When** `createParseContext(null, uid)`을 호출하면, **Then** DataView 생성 시 TypeError가 발생해야 한다.

### Edge Cases (엣지 케이스)
- **EC-001**: 알 수 없는 전송 구문 UID가 전달된 경우 — 기본값(EXPLICIT_VR_LE)으로 동작해야 함
- **EC-002**: startOffset이 버퍼 길이보다 큰 경우 — remaining()이 음수가 아닌 0을 반환해야 함
- **EC-003**: offset이 버퍼 끝을 넘어 readUint16/readUint32 호출 시 — undefined 반환 또는 errors 배열에 오류 기록
- **EC-004**: readBytes/readString에 length=0 전달 시 — 빈 Uint8Array/빈 문자열 반환, offset 변화 없음
- **EC-005**: 빈 ArrayBuffer(길이 0)로 생성 시 — remaining()=0, hasRemaining()=false

---

## Requirements

### Functional Requirements (기능 요구사항)
- **FR-001**: `createParseContext(buffer, transferSyntaxUID, startOffset=0)` 함수를 제공해야 하며, ParseContext 객체를 반환해야 한다.
- **FR-002**: 전송 구문 UID `1.2.840.10008.1.2`(IMPLICIT_VR_LE)에 대해 isExplicitVR=false, isLittleEndian=true으로 설정해야 한다.
- **FR-003**: 전송 구문 UID `1.2.840.10008.1.2.2`(BIG_ENDIAN)에 대해 isExplicitVR=true, isLittleEndian=false으로 설정해야 한다.
- **FR-004**: 전송 구문 UID `1.2.840.10008.1.2.1`(EXPLICIT_VR_LE)에 대해 isExplicitVR=true, isLittleEndian=true으로 설정해야 한다.
- **FR-005**: 반환 객체는 원본 ArrayBuffer를 `buffer` 속성으로 저장해야 한다.
- **FR-006**: 반환 객체는 DataView 래퍼를 `dataView` 속성으로 저장해야 한다.
- **FR-007**: 반환 객체의 `offset` 속성은 startOffset 값으로 초기화되어야 한다 (기본값 0).
- **FR-008**: 반환 객체는 `transferSyntaxUID` 속성으로 전달받은 UID를 저장해야 한다.
- **FR-009**: 반환 객체는 빈 배열 `errors[]`를 포함하여 파싱 중 오류/경고를 수집할 수 있어야 한다.
- **FR-010**: `remaining()` 메서드는 `buffer.byteLength - offset`을 반환해야 한다.
- **FR-011**: `readUint16()` 메서드는 현재 offset에서 2바이트를 읽어 부호 없는 정수로 반환하고 offset을 2 증가시켜야 한다.
- **FR-012**: `readUint32()` 메서드는 현재 offset에서 4바이트를 읽어 부호 없는 정수로 반환하고 offset을 4 증가시켜야 한다.
- **FR-013**: `readInt16()` 메서드는 현재 offset에서 2바이트를 읽어 부호 있는 정수로 반환하고 offset을 2 증가시켜야 한다.
- **FR-014**: `readString(length)` 메서드는 지정된 길이만큼 문자열을 읽고 offset을 length만큼 증가시켜야 한다.
- **FR-015**: `readBytes(length)` 메서드는 지정된 길이만큼 Uint8Array를 읽고 offset을 length만큼 증가시켜야 한다.
- **FR-016**: `advance(amount)` 메서드는 offset을 지정된 양만큼 전진시켜야 한다.
- **FR-017**: `hasRemaining(n)` 메서드는 버퍼에 n바이트 이상 남아 있는지 boolean으로 반환해야 한다.
- **FR-018**: 모든 read 메서드는 DataView의 바이트 오더 인자로 isLittleEndian 값을 전달해야 한다.
- **FR-019**: 전송 구문이 null 또는 undefined인 경우 EXPLICIT_VR_LE 기본값으로 동작해야 한다.
- **FR-020**: 알 수 없는 전송 구문 UID인 경우 EXPLICIT_VR_LE 기본값으로 동작해야 한다.

### Non-Functional Requirements (비기능 요구사항)
- **NFR-001 (성능)**: ParseContext 생성 및 read 메서드 호출은 O(1) 시간 복잡도를 가져야 한다. DataView 래핑으로 인한 추가 메모리 오버헤드는 최소화해야 한다.
- **NFR-002 (안정성)**: 버퍼 경계를 벗어나는 읽기 시 애플리케이션이 중단되지 않아야 하며, errors 배열에 오류를 기록하고 안전한 기본값을 반환해야 한다.
- **NFR-003 (재사용성)**: ParseContext는 순수 데이터 객체로서 외부 상태에 의존하지 않아야 하며, 동일 버퍼에 대해 여러 ParseContext를 독립적으로 생성할 수 있어야 한다.

### Key Entities (핵심 데이터 모델)
- **ParseContext**: DICOM 파싱 세션의 내부 상태를 관리하는 객체 — 핵심 속성: buffer, dataView, offset, isLittleEndian, isExplicitVR, transferSyntaxUID, errors[]
- **TRANSFER_SYNTAX**: 전송 구문 UID를 상수로 정의한 사전 객체 — 키: IMPLICIT_VR_LE, BIG_ENDIAN, EXPLICIT_VR_LE

### Dependencies (의존성)
- `data/dicomDictionary.js` — TRANSFER_SYNTAX 상수 임포트
- 호출처: `metaGroupParser.js`, `metadataParser.js`
- 추적 가능성: FR-1.2, FR-1.3, US-1, US-2

---

## Success Criteria

### Measurable Outcomes (측정 가능한 지표)
- **SC-001**: 세 가지 전송 구문(Explicit VR LE, Implicit VR LE, Big Endian)에 대해 isExplicitVR, isLittleEndian 값이 100% 정확하게 설정된다.
- **SC-002**: 모든 read 메서드(readUint16, readUint32, readInt16, readString, readBytes) 호출 후 offset이 정확히 증가한다.
- **SC-003**: null/undefined/알 수 없는 UID 입력 시 기본값(EXPLICIT_VR_LE)으로 안전하게 폴백한다.
- **SC-004**: startOffset 매개변수가 정상적으로 반영되어 remaining() 계산이 일치한다.

### Definition of Done
- [ ] 모든 FR-001 ~ FR-020 요구사항 구현 완료
- [ ] 단위 테스트 커버리지 90% 이상
- [ ] Edge Case(EC-001 ~ EC-005) 시나리오 검증 완료
- [ ] 코드 리뷰 승인
- [ ] metaGroupParser.js, metadataParser.js와의 연동 테스트 통과
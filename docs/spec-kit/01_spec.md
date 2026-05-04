# 기능 명세서: getPhiValue() PHI 원본 안전조회

**Feature Branch**: `PLAYG-1832-get-phi-value`
**Status**: Draft | **Date**: 2026-05-04
**Ticket**: `PLAYG-1832` | **Type**: Detailed Design (SDS-3.13)
**Input**: Jira 티켓 PLAYG-1832 상세 설계 요청

---

## User Scenarios & Testing

### User Story 1 - 인가된 PHI 필드 원본 값 조회 (Priority: P1) :dart: MVP
- **설명**: maskPhiFields()로 마스킹된 DICOMMetadata 객체에서 인가된 PHI 필드(patientName, patientID, patientBirthDate)의 원본 값을 안전하게 조회한다. 모듈 내부 WeakMap(phiStore)에 저장된 원본 값 중 PHI_FIELDS 상수에 정의된 필드만 선택적으로 반환한다.
- **Why this priority**: PHI 원본 조회는 승인된 사용자에게만 환자 정보를 표시하는 핵심 보안 기능이며, UI 컴포넌트와 리포트 생성 등 모든 PHI 소비 모듈의 필수 전제 조건이다.
- **Independent Test**: maskPhiFields()로 마스킹된 메타데이터 객체에 대해 getPhiValue(metadata, field)를 호출하여 원본 값이 정확히 반환되는지 검증한다.
- **Acceptance Scenarios**:
  1. **Given** maskPhiFields()로 마스킹된 metadata 객체가 주어지면, **When** getPhiValue(metadata, 'patientName')을 호출하면, **Then** phiStore에 저장된 원본 환자 이름 문자열이 반환된다. (TC-13.1)
  2. **Given** maskPhiFields()로 마스킹된 metadata 객체가 주어지면, **When** getPhiValue(metadata, 'patientID')를 호출하면, **Then** phiStore에 저장된 원본 환자 ID 문자열이 반환된다. (TC-13.2)
  3. **Given** maskPhiFields()로 마스킹된 metadata 객체가 주어지면, **When** getPhiValue(metadata, 'patientBirthDate')를 호출하면, **Then** phiStore에 저장된 원본 생년월일 문자열이 반환된다. (TC-13.3)

### User Story 2 - 비인가 필드 접근 차단 (Priority: P1) :dart: MVP
- **설명**: PHI_FIELDS 상수 배열에 등록되지 않은 필드명에 대한 조회 시도를 차단하고 undefined를 반환한다. metadata 객체의 다른 속성(rows, columns 등)은 getPhiValue()로 조회할 수 없으며, 우회 접근 시도 시에도 정보 누출이 발생하지 않는다.
- **Why this priority**: SEC-3(접근 제어) 요구사항의 핵심 구현으로, PHI 범위를 엄격히 제한하지 않으면 민감한 정보 유출(HAZ-3.1)로 이어진다.
- **Independent Test**: PHI_FIELDS에 없는 필드명을 getPhiValue()에 전달하여 undefined가 반환되는지 확인한다.
- **Acceptance Scenarios**:
  1. **Given** 임의의 metadata 객체가 주어지면, **When** getPhiValue(metadata, 'rows')를 호출하면, **Then** undefined가 반환된다. (TC-13.4)
  2. **Given** 임의의 metadata 객체가 주어지면, **When** getPhiValue(metadata, 'unknownField')를 호출하면, **Then** undefined가 반환된다. (TC-13.5)

### User Story 3 - 마스킹 이력 없는 객체 처리 (Priority: P1) :dart: MVP
- **설명**: maskPhiFields()를 거치지 않은 일반 객체나 null/undefined 메타데이터에 대해 getPhiValue()를 호출하면 undefined를 반환한다. 예외를 발생시키지 않고 안전하게 처리한다.
- **Why this priority**: 비정상 입력에 대한 안전한 처리는 NFR-4(안정성)의 핵심이며, 런타임 예외로 인한 애플리케이션 중단을 방지해야 한다.
- **Independent Test**: 마스킹되지 않은 일반 객체와 null을 getPhiValue()에 전달하여 undefined가 반환되고 예외가 발생하지 않음을 확인한다.
- **Acceptance Scenarios**:
  1. **Given** maskPhiFields()를 거치지 않은 일반 JavaScript 객체이면, **When** getPhiValue(plainObj, 'patientName')을 호출하면, **Then** undefined가 반환된다. (TC-13.6)
  2. **Given** metadata가 null이면, **When** getPhiValue(null, 'patientName')을 호출하면, **Then** undefined가 반환되고 예외가 발생하지 않는다. (TC-13.7)
  3. **Given** 원본 값이 빈 문자열이었던 필드이면, **When** getPhiValue(meta_empty, 'patientName')을 호출하면, **Then** undefined가 반환된다. (TC-13.8, 빈값은 마스킹 대상이 아니므로 phiStore에도 없음)

### Edge Cases (엣지 케이스)
- **EC-001**: metadata가 null 또는 undefined인 경우 - phiStore.get(null)은 undefined를 반환하므로 안전하게 undefined가 최종 반환된다
- **EC-002**: field 파라미터가 빈 문자열인 경우 - PHI_FIELDS.includes('')는 false이므로 undefined 반환
- **EC-003**: maskPhiFields()를 거치지 않은 일반 객체 - WeakMap에 해당 키가 없으므로 undefined 반환
- **EC-004**: 원본 값이 빈 문자열이었던 경우 - maskPhiFields()에서 빈 문자열은 마스킹하지 않으므로 phiStore에도 저장되지 않아 undefined 반환
- **EC-005**: metadata 객체가 GC된 후 접근 - WeakMap 특성상 자동 해제되어 접근 불가

---

## Requirements

### Functional Requirements (기능 요구사항)
- **FR-4.1**: getPhiValue(metadata, field)는 maskPhiFields()로 마스킹된 DICOMMetadata 객체에서 원본 PHI 값을 반환해야 함
- **FR-4.1.1**: PHI_FIELDS 상수 배열(patientName, patientID, patientBirthDate)에 포함된 필드명에 대해서만 원본 값을 반환
- **FR-4.1.2**: field 파라미터가 PHI_FIELDS에 없는 경우 즉시 undefined를 반환하여 비인가 접근 차단
- **FR-4.1.3**: phiStore(WeakMap)에서 metadata 객체를 키로 사용하여 원본 값 객체를 획득하고, 해당 field의 값을 반환
- **FR-4.1.4**: phiStore에 metadata 키가 없는 경우(마스킹 이력 없음) undefined를 반환

### Non-Functional Requirements (비기능 요구사항)
- **NFR-4 (안정성)**: null/undefined 메타데이터 입력 시에도 예외를 발생시키지 않고 안전하게 undefined를 반환해야 함
- **SEC-3 (접근 제어)**: PHI_FIELDS에 등록되지 않은 필드는 어떤 방법으로든 원본 값을 조회할 수 없어야 함
- **SEC-3.1**: phiStore는 모듈 스코프의 WeakMap으로 외부에서 직접 접근할 수 없어야 함
- **SEC-3.2**: getPhiValue()가 유일한 정상 원본 조회 경로여야 함
- **MEM-1 (메모리 안전)**: metadata 객체가 GC될 경우 phiStore의 원본 값도 자동 해제되어야 함 (WeakMap 특성)

### Key Entities (핵심 데이터 모델)
- **phiStore (WeakMap)**: maskPhiFields() 실행 시 마스킹 전 원본 PHI 값을 저장하는 모듈 스코프 WeakMap. 키는 DICOMMetadata 객체 참조, 값은 원본 PHI 필드-값 쌍을 가진 일반 객체
- **PHI_FIELDS (string[])**: 인가된 PHI 필드명 목록. ['patientName', 'patientID', 'patientBirthDate']. 이 배열에 없는 필드는 getPhiValue()로 조회 불가
- **DICOMMetadata**: maskPhiFields()로 마스킹된 후 patientName/patientID/patientBirthDate 필드가 '[REDACTED]'로 치환된 메타데이터 객체

### 보안 설계 원칙
- **비인가 필드 접근 차단 (SEC-3)**: PHI_FIELDS에 등록된 필드만 조회 가능하며, metadata 객체의 다른 속성은 getPhiValue()로 조회 불가
- **WeakMap 캡슐화**: phiStore는 모듈 스코프의 WeakMap으로 외부 직접 접근 불가. getPhiValue()가 유일한 정상 원본 조회 경로
- **메모리 안전**: metadata 객체 GC 시 원본도 자동 해제 (WeakMap 특성)
- **호출부 추적성**: getPhiValue() 호출부는 코드 리뷰에서 PHI 접근 지점으로 식별 가능해야 함

### 소비 모듈 연동
| 소비 모듈 | 사용 방식 | 용도 |
|-----------|----------|------|
| UI 컴포넌트 | getPhiValue(metadata, 'patientName') | 환자 정보 표시 화면에서 승인된 사용자에게만 원본 이름 표시 |
| 리포트 생성 | getPhiValue(metadata, 'patientID') | 진단 리포트에 환자 ID 포함 |
| index.js (배럴) | export { getPhiValue } | 외부 모듈에 공개 인터페이스 제공 |

---

## Success Criteria

### Measurable Outcomes (측정 가능한 지표)
- **SC-001**: TC-13.1~TC-13.8 단위 테스트 8개 전체 통과
- **SC-002**: PHI_FIELDS 외 필드 조회 시 100% undefined 반환 (정보 누출 제로)
- **SC-003**: null/undefined 메타데이터 입력 시 예외 발생 없이 안전하게 undefined 반환

### Definition of Done
- [ ] getPhiValue() 함수 구현 완료
- [ ] TC-13.1~TC-13.8 단위 테스트 8개 전체 통과
- [ ] PHI_FIELDS 인가 검증 로직 구현
- [ ] WeakMap phiStore 캡슐화 확인
- [ ] 코드 리뷰 승인
- [ ] 기존 251개 테스트 회귀 통과
# 기능 명세서: phiGuard.js - PHI 마스킹 보안 가드 모듈

**Feature Branch**: `feature/PLAYG-1831-phi-guard`
**Status**: Draft | **Date**: 2026-05-04
**Ticket**: `PLAYG-1831` | **Type**: Detailed Design (SDS-3.12)
**Module ID**: SDS-3.12 | **File**: `viewer/src/data/dicomParser/phiGuard.js`
**Security Class**: IEC 62304 Class A | **Traceability**: SAD COMP-3, FR-4.1, FR-4.5, HAZ-3.1, SEC-3

---

## User Scenarios & Testing

### US-1: PHI 필드 자동 마스킹 (Priority: P1) :dart: MVP

- **설명**: DICOM 메타데이터 객체에서 환자 식별 정보(patientName, patientID, patientBirthDate)를 자동 감지하여 마스킹 문자열 `[REDACTED]`로 치환한다. metadataParser.js의 Step 8에서 파싱 완료 직후 호출되어 외부로 노출되는 메타데이터에 평문 PHI가 포함되지 않도록 보장한다.
- **우선순위 사유**: PHI 마스킹은 HIPAA 및 국내 개인정보보호법 준수의 핵심 요구사항이며, PHI 노출은 즉각적인 법적 리스크를 유발한다.
- **독립 테스트**: 환자 정보가 포함된 DICOM 메타데이터 객체를 `maskPhiFields()`에 전달 후, patientName/patientID/patientBirthDate 필드가 `[REDACTED]`로 치환되었는지 직접 검증.
- **Acceptance Scenarios**:
  1. **Given** patientName='홍길동', patientID='P001', patientBirthDate='19900101'이 포함된 metadata 객체가 주어지면, **When** `maskPhiFields(metadata)`를 호출하면, **Then** 세 필드 모두 `[REDACTED]`로 치환된다. (TC-12.1, TC-12.2)
  2. **Given** metadata가 null이면, **When** `maskPhiFields(null)`을 호출하면, **Then** 예외 없이 null이 그대로 반환된다. (TC-12.6)
  3. **Given** metadata가 undefined이면, **When** `maskPhiFields(undefined)`을 호출하면, **Then** undefined가 그대로 반환된다. (TC-12.6)
  4. **Given** patientName 값이 빈 문자열('')이면, **When** `maskPhiFields(metadata)`를 호출하면, **Then** 해당 필드는 마스킹되지 않고 빈 문자열로 유지된다. (TC-12.5)
  5. **Given** metadata가 문자열/숫자 등 객체가 아니면, **When** `maskPhiFields(42)`를 호출하면, **Then** 입력값이 그대로 반환된다. (TC-12.6)

### US-2: 마스킹된 원본 PHI 값 안전 조회 (Priority: P1) :dart: MVP

- **설명**: 마스킹 처리된 메타데이터 객체에서 권한 있는 모듈이 원본 PHI 값을 안전하게 조회할 수 있다. PHI_FIELDS에 등록된 필드만 조회 가능하며, 비인가 필드 접근은 차단된다.
- **우선순위 사유**: UI에서 환자 정보 표시가 필요한 특정 컴포넌트만 원본 값에 접근할 수 있어야 하며, 임의 필드 조회를 통한 정보 유출을 방지해야 한다.
- **독립 테스트**: 마스킹된 metadata 객체에서 `getPhiValue()`로 원본 값을 조회하고, 비 PHI 필드 조회 시 undefined가 반환되는지 검증.
- **Acceptance Scenarios**:
  1. **Given** `maskPhiFields()`로 마스킹된 metadata 객체가 주어지면, **When** `getPhiValue(metadata, 'patientName')`을 호출하면, **Then** 원본 값 '홍길동'이 반환된다. (TC-12.3)
  2. **Given** 동일한 metadata 객체에서, **When** `getPhiValue(metadata, 'rows')`를 호출하면, **Then** undefined가 반환된다 (비 PHI 필드 차단, SEC-3). (TC-12.4)
  3. **Given** 마스킹되지 않은 metadata 객체이면, **When** `getPhiValue(metadata, 'patientName')`을 호출하면, **Then** undefined가 반환된다 (마스킹 이력 없음).

### US-3: PHI 원본 값 일괄 덤프 (Priority: P2)

- **설명**: 디버깅 및 내부 검증 목적으로 마스킹된 메타데이터의 모든 원본 PHI 값을 일괄 조회한다. `@internal` 태그가 부여되어 배럴 파일(index.js)에서 export되지 않으므로 프로덕션 UI에서는 직접 호출할 수 없다.
- **우선순위 사유**: 개발/테스트 단계에서 PHI 마스킹 동작 검증에 필수적이지만, 프로덕션에서는 노출되지 않아야 하므로 접근 제어가 중요하다.
- **독립 테스트**: `maskPhiFields()` 처리 후 `dumpPhiValues()`를 호출하여 원본 값이 모두 포함된 객체가 반환되는지 확인.
- **Acceptance Scenarios**:
  1. **Given** `maskPhiFields()`로 마스킹된 metadata 객체가 주어지면, **When** `dumpPhiValues(metadata)`를 호출하면, **Then** `{ patientName: '홍길동', patientID: 'P001', patientBirthDate: '19900101' }` 객체가 반환된다.
  2. **Given** 마스킹 이력이 없는 metadata 객체이면, **When** `dumpPhiValues(metadata)`를 호출하면, **Then** 빈 객체 `{}`가 반환된다.

### US-4: 메모리 안전성 및 GC 연동 (Priority: P1) :dart: MVP

- **설명**: WeakMap 기반 phiStore를 사용하여 metadata 객체가 가비지 컬렉션될 때 원본 PHI 값도 자동으로 해제된다. 일반 Map 사용 시 발생할 수 있는 강한 참조로 인한 메모리 누수를 원천 방지한다.
- **우선순위 사유**: DICOM 뷰어는 대용량 파일을 반복적으로 처리하므로, PHI 원본 값의 누적은 메모리 부족을 유발할 수 있다.
- **독립 테스트**: 대량의 metadata 객체를 생성/마스킹 후 참조를 해제하고 GC 수행 시 메모리가 회수되는지 간접적으로 확인.
- **Acceptance Scenarios**:
  1. **Given** `maskPhiFields()`로 마스킹된 metadata 객체의 참조가 해제되면, **When** GC가 수행되면, **Then** phiStore에서 해당 엔트리도 자동 삭제된다.

---

## Requirements

### 기능 요구사항 (Functional Requirements)

| ID | 요구사항 | 관련 US | 상태 |
| --- | --- | --- | --- |
| FR-4.1 | DICOM 메타데이터의 PHI 필드(patientName, patientID, patientBirthDate)를 파싱 완료 직후 `[REDACTED]`로 마스킹해야 한다. 원본 값은 모듈 내부 phiStore에 안전하게 보관되어야 한다. | US-1 | 정의 완료 |
| FR-4.5 | 마스킹된 메타데이터에서 원본 PHI 값을 조회할 때 PHI_FIELDS에 등록된 필드만 조회 가능해야 하며, 비인가 필드 접근은 undefined를 반환해야 한다. | US-2 | 정의 완료 |

### 비기능 요구사항 (Non-Functional Requirements)

| ID | 요구사항 | 관련 US | 상태 |
| --- | --- | --- | --- |
| NFR-4 | 견고성(Robustness): null, undefined, 객체가 아닌 타입의 입력에 대해 예외를 발생시키지 않고 입력값을 그대로 반환해야 한다. | US-1 | 정의 완료 |
| SEC-3 | 보안: PHI_FIELDS 외 필드명으로 getPhiValue()를 호출하면 항상 undefined를 반환하여 비인가 필드 접근을 차단해야 한다. | US-2 | 정의 완료 |

### 안전 요구사항 (Safety Requirements)

| ID | 요구사항 | 관련 US | 상태 |
| --- | --- | --- | --- |
| HAZ-3.1 | 정보 유출 방지: 파싱 완료 후 반환 전 마스킹을 보장하여, 외부로 노출되는 metadata 객체의 PHI는 항상 `[REDACTED]`이어야 한다. | US-1, US-4 | 정의 완료 |

### 기술 제약사항

| 제약 ID | 제약 내용 | 근거 |
| --- | --- | --- |
| TC-1 | PHI_FIELDS는 const 상수로 선언하여 런타임 수정 불가 | HIPAA Safe Harbor 최소 식별 정보 3종 보장 |
| TC-2 | phiStore는 WeakMap으로 모듈 스코프에 캡슐화 (export 불가) | 외부에서 원본 PHI 직접 접근 차단 |
| TC-3 | PHI_MASK 마스킹 문자열은 별도 상수로 관리 | 향후 마스킹 정책 변경 시 단일 지점 수정 |
| TC-4 | dumpPhiValues는 @internal로 프로덕션 미노출 | 프로덕션 환경에서 PHI 일괄 노출 방지 |
| TC-5 | IEC 62304 Class A 안전 등급 준수 | 의료기기 소프트웨어 규제 요구사항 |

---

## Success Criteria

### SC-1: PHI 마스킹 동작 검증

- maskPhiFields(metadata) 호출 후 patientName, patientID, patientBirthDate 필드 값이 `[REDACTED]`로 치환된다.
- 원본 값은 phiStore(WeakMap)에 안전하게 보관된다.
- 빈 문자열('') 및 undefined 값은 마스킹하지 않는다.
- null/undefined 입력 시 예외 없이 동일 값을 반환한다.

### SC-2: 원본 값 안전 조회 검증

- getPhiValue(metadata, field)는 PHI_FIELDS에 등록된 필드만 조회 가능하다.
- 비 PHI 필드 조회 시 undefined를 반환한다 (SEC-3).
- 마스킹 이력이 없는 객체에서도 예외 없이 undefined를 반환한다.

### SC-3: 단위 테스트 통과

| TC ID | 테스트명 | 검증 내용 | 추적 |
| --- | --- | --- | --- |
| TC-12.1 | patientName 마스킹 | `meta.patientName === '[REDACTED]'` | FR-4.1 |
| TC-12.2 | patientID 마스킹 | `meta.patientID === '[REDACTED]'` | FR-4.1 |
| TC-12.3 | getPhiValue 원본 조회 | `getPhiValue(meta, 'patientName') === '홍길동'` | FR-4.5 |
| TC-12.4 | 비 PHI 필드 조회 차단 | `getPhiValue(meta, 'rows') === undefined` | SEC-3 |
| TC-12.5 | 빈 문자열 마스킹 생략 | 빈 값은 마스킹하지 않고 그대로 유지 | FR-4.1 |
| TC-12.6 | null 객체 안전 처리 | `maskPhiFields(null)`이 에러 없이 null 반환 | NFR-4 |

### SC-4: 추적성 매트릭스

| 요구사항 ID | 설명 | 관련 User Story | 관련 테스트 |
| --- | --- | --- | --- |
| FR-4.1 | PHI 마스킹 | US-1 | TC-12.1, TC-12.2 |
| FR-4.5 | PHI 접근 제어 | US-2 | TC-12.3, TC-12.4 |
| HAZ-3.1 | 정보 유출 방지 | US-1, US-4 | TC-12.1 |
| SEC-3 | 비인가 필드 접근 차단 | US-2 | TC-12.4 |
| NFR-4 | 견고성 (null 안전) | US-1 | TC-12.6 |

# 기능 명세서: dumpPhiValues() - PHI 일괄조회 (내부용/디버그)

**Feature Branch**: `PLAYG-1833-dump-phi-values`
**Status**: Draft | **Date**: 2026-05-04
**Ticket**: `PLAYG-1833` | **Type**: Detailed Design (SDS-3.14)
**Safety Class**: IEC 62304 Class A
**Input**: Jira 티켓 PLAYG-1833 상세 설계 요청

---

## User Scenarios & Testing

### User Story 1 - 마스킹된 PHI 원본 값 일괄 조회 (Priority: P1) :dart: MVP
- **설명**: maskPhiFields()에 의해 마스킹된 DICOMMetadata 객체에서 WeakMap(phiStore)에 저장된 모든 원본 PHI 값을 일괄 조회한다. patientName, patientID, patientBirthDate 3개 필드의 원본 값을 키-값 쌍 객체로 반환한다.
- **Why this priority**: dumpPhiValues()는 PHI 보호 메커니즘의 검증 및 디버그 핵심 수단으로, 마스킹 동작의 정확성을 확인하기 위해 필수적이다.
- **Independent Test**: maskPhiFields()로 마스킹된 metadata 객체를 dumpPhiValues()에 전달하여, 반환된 객체의 patientName/patientID/patientBirthDate 값이 원본과 일치하는지 직접 검증한다.
- **Acceptance Scenarios**:
  1. **Given** maskPhiFields()로 마스킹된 DICOMMetadata 객체가 존재하면, **When** dumpPhiValues(metadata)를 호출하면, **Then** phiStore에 저장된 모든 원본 PHI 값(patientName, patientID, patientBirthDate)을 포함한 객체를 반환한다. (추적: FR-4.1)
  2. **Given** 마스킹된 metadata의 원본 patientName이 '홍길동'이면, **When** dumpPhiValues(metadata)를 호출하면, **Then** 반환 객체의 patientName 속성값은 '홍길동'이다.
  3. **Given** 마스킹된 metadata의 원본 patientID가 'P12345'이면, **When** dumpPhiValues(metadata)를 호출하면, **Then** 반환 객체의 patientID 속성값은 'P12345'이다.

### User Story 2 - 마스킹 이력 없는 객체에 대한 안전한 빈 반환 (Priority: P1) :dart: MVP
- **설명**: maskPhiFields()를 거치지 않았거나 phiStore에 등록되지 않은 metadata 객체를 입력하면 예외를 발생시키지 않고 빈 객체 {}를 안전하게 반환한다.
- **Why this priority**: null/undefined 입력 및 미마스킹 객체 처리는 런타임 안정성의 핵심이며, IEC 62304 Class A 요구사항을 충족해야 한다.
- **Independent Test**: maskPhiFields()를 호출하지 않은 순수 metadata 객체 또는 null을 dumpPhiValues()에 전달하여 빈 객체 {}가 반환되는지 확인한다.
- **Acceptance Scenarios**:
  1. **Given** maskPhiFields()를 호출한 적 없는 metadata 객체이면, **When** dumpPhiValues(metadata)를 호출하면, **Then** 빈 객체 {}를 반환한다. (추적: FR-4.1)
  2. **Given** metadata가 null이면, **When** dumpPhiValues(null)을 호출하면, **Then** 예외 없이 빈 객체 {}를 반환한다. (추적: SEC-3)
  3. **Given** metadata가 undefined이면, **When** dumpPhiValues(undefined)를 호출하면, **Then** 예외 없이 빈 객체 {}를 반환한다. (추적: SEC-3)

### User Story 3 - 반환값의 캡슐화 및 데이터 무결성 보장 (Priority: P2)
- **설명**: dumpPhiValues()는 phiStore 내부 참조가 아닌 얕은 복사본을 반환하여, 호출자가 반환 객체를 수정해도 phiStore의 원본 데이터가 변경되지 않도록 캡슐화를 보장한다.
- **Why this priority**: phiStore 내부 데이터 무결성은 PHI 보호 체계의 근간이며, 외부 수정으로부터 보호되어야 한다.
- **Independent Test**: dumpPhiValues() 반환 객체의 속성을 변경한 후, 동일 metadata로 다시 dumpPhiValues()를 호출하여 원본이 보존되었는지 확인한다.
- **Acceptance Scenarios**:
  1. **Given** 마스킹된 metadata에서 dumpPhiValues()로 얻은 객체의 patientName을 '변경값'으로 수정하면, **When** 동일 metadata로 dumpPhiValues()를 재호출하면, **Then** 반환 객체의 patientName은 여전히 원본값('홍길동')이다. (추적: SEC-3)
  2. **Given** 반환된 객체에 새로운 속성을 추가하면, **When** phiStore 내부를 조회하면, **Then** phiStore의 원본 객체에는 해당 속성이 존재하지 않는다.

### User Story 4 - 프로덕션 환경 접근 제한 (Priority: P2)
- **설명**: dumpPhiValues()는 개발/디버그 환경에서만 사용해야 하며, 프로덕션 빌드에서는 트리쉐이킹 또는 환경 변수 가드를 통해 제외되어야 한다. 반환된 PHI 정보의 콘솔 출력 및 외부 전송은 엄격히 금지된다.
- **Why this priority**: PHI 정보 유출은 HAZ-3.1(정보 유출 방지)에 직결되는 심각한 보안 위험이다.
- **Independent Test**: 프로덕션 빌드 산출물에서 dumpPhiValues() 함수가 포함되지 않았는지 번들 분석으로 확인한다.
- **Acceptance Scenarios**:
  1. **Given** 프로덕션 빌드 환경이면, **When** 번들을 분석하면, **Then** dumpPhiValues() 함수가 트리쉐이킹에 의해 제외되어 있다. (추적: SEC-3)
  2. **Given** 개발 환경에서 dumpPhiValues()를 호출하여 반환된 객체를 획득하면, **When** 반환값을 콘솔에 출력하거나 외부로 전송하면, **Then** 정책 위반이다. (추적: HAZ-3.1)

### Edge Cases (엣지 케이스)
- **EC-001**: metadata가 null인 경우 - phiStore.get(null)이 undefined를 반환하므로 빈 객체 {} 반환
- **EC-002**: metadata가 undefined인 경우 - phiStore.get(undefined)이 undefined를 반환하므로 빈 객체 {} 반환
- **EC-003**: maskPhiFields()를 호출하지 않은 순수 객체 - phiStore에 키가 없으므로 빈 객체 {} 반환
- **EC-004**: 이미 GC된 WeakMap 키 객체 - metadata 참조가 해제된 경우 phiStore에서 자동 삭제되어 빈 객체 {} 반환
- **EC-005**: maskPhiFields()가 빈 metadata(모든 PHI 필드가 빈 문자열)를 마스킹한 경우 - 빈 문자열 원본 값이 포함된 객체 반환
- **EC-006**: dumpPhiValues() 반환값을 수정 후 동일 metadata로 재조회 - 원본 값 보존 (얕은 복사 검증)

---

## Requirements

### Functional Requirements (기능 요구사항)

- **FR-001**: 시스템은 maskPhiFields()로 마스킹된 DICOMMetadata 객체에서 모든 원본 PHI 값을 일괄 조회하는 dumpPhiValues(metadata) 함수를 제공해야 한다. 함수 시그니처: `export function dumpPhiValues(metadata) -> Object` (추적: FR-4.1)
- **FR-002**: 시스템은 metadata 파라미터를 WeakMap(phiStore)의 키로 사용하여 저장된 원본 값 객체를 조회해야 한다. (추적: FR-4.1, SEC-3)
- **FR-003**: 시스템은 phiStore에 원본 객체가 존재하면 스프레드 연산자(`{ ...originals }`)를 사용한 얕은 복사본을 반환해야 한다. phiStore 내부 참조를 직접 반환해서는 안 된다. (추적: SEC-3)
- **FR-004**: 시스템은 phiStore에 metadata 키가 없거나 metadata가 null/undefined인 경우 예외를 발생시키지 않고 빈 객체 `{}`를 반환해야 한다. (추적: SEC-3, FR-4.1)
- **FR-005**: 반환 객체는 PHI_FIELDS에 정의된 3개 필드의 원본 값을 포함해야 한다.

  | 필드명 | DICOM Tag | 의미 |
  |--------|-----------|------|
  | patientName | (0010,0010) | 환자 이름 |
  | patientID | (0010,0020) | 환자 ID |
  | patientBirthDate | (0010,0030) | 환자 생년월일 |

- **FR-006**: 함수는 Named export 형태로 제공되어야 하며, 소스 파일은 `viewer/src/data/dicomParser/phiGuard.js`에 위치해야 한다.

### Non-Functional Requirements (비기능 요구사항)

- **NFR-001 (보안/캡슐화)**: 반환 시 phiStore 내부 참조가 아닌 얕은 복사본을 반환하여 데이터 무결성을 보장해야 한다. 현재 PHI_FIELDS는 모두 string 타입이므로 얕은 복사로도 완전한 분리가 보장된다. (추적: SEC-3)
- **NFR-002 (보안/접근 제어)**: 본 함수는 개발/디버그 환경에서만 사용해야 하며, 프로덕션 빌드 시 트리쉐이킹 또는 환경 변수 가드로 제외하는 것을 권장한다. (추적: SEC-3)
- **NFR-003 (보안/정보 유출 방지)**: 반환된 객체에는 민감한 PHI 정보가 포함되어 있으므로, 콘솔 출력이나 외부 전송을 엄격히 금지한다. (추적: HAZ-3.1)
- **NFR-004 (안전성)**: null/undefined/malformed 입력에 대해 예외를 발생시키지 않고 안전하게 빈 객체를 반환해야 한다. (추적: SEC-3, IEC 62304 Class A)

### Key Entities (핵심 데이터 모델)

- **phiStore (WeakMap)**: maskPhiFields()가 마스킹 시 원본 PHI 값을 저장하는 내부 WeakMap. 키는 DICOMMetadata 객체 참조, 값은 원본 PHI 값의 키-값 쌍 객체. GC 시 자동 삭제됨.
- **PHI_FIELDS**: dumpPhiValues() 조회 대상 필드 정의 상수. patientName, patientID, patientBirthDate 3개 필드 포함.
- **반환 객체**: phiStore에 저장된 원본 PHI 값의 얕은 복사본. 구조: `{ patientName: string, patientID: string, patientBirthDate: string }` 또는 빈 객체 `{}`

### 조건별 동작표

| 조건 | 동작 | 반환값 | 추적 |
|------|------|--------|------|
| metadata가 유효하고 마스킹 이력 있음 | phiStore에서 전체 원본 조회 | 원본 PHI 값 객체 (얕은 복사) | FR-4.1 |
| phiStore에 metadata 키 없음 | 마스킹 이력 없음으로 판단 | 빈 객체 `{}` | FR-4.1 |
| metadata가 null/undefined | phiStore.get()이 undefined 반환 | 빈 객체 `{}` | SEC-3 |

### 연관 모듈 의존성

| 모듈 | 관계 | 설명 | 연관 SDS |
|------|------|------|----------|
| phiGuard.js (본 모듈) | 정의 | dumpPhiValues()가 정의된 파일 | SDS-3.14 |
| maskPhiFields() | 선행 조건 | 마스킹 수행 시 phiStore에 원본 저장. dumpPhiValues()는 이후에 호출 | SDS-3.13 |
| getPhiValue() | 형제 함수 | 단일 PHI 필드 조회. dumpPhiValues()는 전체 일괄 조회 | SDS-3.13 |
| phiStore (WeakMap) | 내부 저장소 | maskPhiFields()가 저장, dumpPhiValues()가 읽기 | - |

### 추적성 매핑

| 추적 ID | 출처 | 본 명세 반영 위치 |
|---------|------|-------------------|
| FR-4.1 | SRS - PHI 마스킹 요구사항 | FR-001, FR-002, FR-004, US-1, US-2 |
| SEC-3 | SRS - 접근 제어 요구사항 | FR-003, FR-004, NFR-001, NFR-002, NFR-004 |
| HAZ-3.1 | SRS - 정보 유출 방지 위험 | NFR-003, US-4 |
| SAD COMP-3 | 아키텍처 - phiGuard 컴포넌트 | 전체 (phiGuard.js 모듈 설계) |

---

## Success Criteria

### Measurable Outcomes (측정 가능한 지표)

- **SC-001**: 마스킹된 metadata 객체를 입력하면, phiStore에 저장된 3개 PHI 필드(patientName, patientID, patientBirthDate)의 원본 값이 100% 정확하게 반환된다.
- **SC-002**: 마스킹 이력이 없는 metadata 객체, null, undefined 입력 시 예외 없이 빈 객체 {}가 반환된다.
- **SC-003**: 반환된 객체를 수정해도 phiStore 내부 원본 데이터는 변경되지 않는다 (얕은 복사 무결성).
- **SC-004**: 프로덕션 빌드에서 dumpPhiValues() 함수가 트리쉐이킹에 의해 제외된다.

### Definition of Done

- [ ] dumpPhiValues() 함수가 phiGuard.js에 Named export로 구현 완료
- [ ] FR-001 ~ FR-006 모든 기능 요구사항 구현 및 검증
- [ ] NFR-001 ~ NFR-004 모든 비기능 요구사항 충족
- [ ] 단위 테스트: 마스킹된 객체에서 원본 3개 필드 일괄 조회 성공
- [ ] 단위 테스트: 미마스킹 객체에서 빈 객체 {} 반환
- [ ] 단위 테스트: null/undefined 입력 시 빈 객체 {} 반환
- [ ] 단위 테스트: 반환값 수정 후 원본 무결성 확인
- [ ] Edge Case 시나리오(EC-001 ~ EC-006) 검증 완료
- [ ] IEC 62304 Class A 안전 등급 요구사항 충족 (예외 안전성)
- [ ] 코드 리뷰 승인
# Implementation Plan: dumpPhiValues() - PHI 일괄조회 (내부용/디버그)

**Branch**: `feature/PLAYG-1833-dump-phi-values` | **Date**: 2026-05-04 | **Spec**: `docs/spec-kit/01_spec.md`
**Ticket**: `PLAYG-1833` | **Type**: Detailed Design (SDS-3.14)

---

## Summary

dumpPhiValues()는 maskPhiFields()에 의해 마스킹된 DICOMMetadata 객체에서 WeakMap(phiStore)에 저장된 모든 원본 PHI 값을 일괄 조회하는 내부용/디버그 함수다.
현재 구현은 phiStore.get(metadata) 결과를 직접 반환하거나 빈 객체를 반환하는데, 명세(01_spec.md)의 FR-003은 얕은 복사본({...originals}) 반환을 요구하므로 캡슐화 보강이 필요하다.
또한 프로덕션 빌드에서 트리쉐이킹/환경변수 가드로 함수 제외(NFR-002)와 PHI 데이터 콘솔/네트워크 전송 금지(NFR-003)를 보장하는 빌드 설정이 추가로 필요하다.
IEC 62304 Class A 안전 등급에 따라 null/undefined 입력 시 예외 없이 빈 객체 {}를 반환하는 예외 안전성을 유지한다.

---

## Technical Context

| 항목 | 내용 |
| --- | --- |
| **Language/Version** | JavaScript (ES2020+), Vanilla JS, 외부 프레임워크 없음 |
| **Primary Dependencies** | phiGuard.js 내부 모듈 (phiStore WeakMap, PHI_FIELDS 상수) |
| **Storage** | 인메모리 전용 (WeakMap 기반), 네트워크 통신 없음 |
| **Testing** | Jest 단위 테스트 (100% 분기 커버리지 목표, 함수 로직이 단순하므로) |
| **Target Platform** | 모던 브라우저 (Chrome, Firefox, Edge), 로컬 파일 전용 |
| **Performance Goals** | 단일 WeakMap.get() 호출로 O(1) 시간 복잡도 (NFR-002) |
| **Constraints** | IEC 62304 Class A, 오프라인 전용, CSP connect-src none, 외부 라이브러리 금지, 프로덕션 빌드에서 함수 제외 |

---

## Constitution Check
*GATE: 설계 원칙(Constitution) 준수 여부 확인*

- **SOLID 원칙**: SRP 준수 - dumpPhiValues()는 PHI 일괄 조회라는 단일 책임 수행. 의존성이 phiStore 내부 변수뿐이므로 OCP/DIP 자연 충족. 함수 크기가 3줄 이하로 유지되어 가독성과 검증 가능성 극대화.
- **레이어 분리**: Data Access Layer(COMP-3 phiGuard) 내부에 위치. Business Logic Layer나 Presentation Layer에 의존하지 않음. 배럴 파일(index.js)에서 미노출 원칙으로 모듈 경계 강화.
- **에러 처리 전략**: 예외 throw 없음. null/undefined/미등록 키 입력 시에도 빈 객체 {}를 안전 반환하는 guard clause 패턴 적용. IEC 62304 Class A 예외 안전성(NFR-004) 요구사항 충족.
- **보안 고려사항**: (1) 얕은 복사본 반환으로 phiStore 내부 참조 노출 방지(FR-003, NFR-001). (2) 프로덕션 빌드에서 트리쉐이킹으로 함수 자체 제외(NFR-002). (3) 반환값 콘솔/네트워크 전송 금지 정책 문서화(NFR-003, HAZ-3.1).

---
## Project Structure

### Documentation

```text
docs/
+-- spec-kit/
|   +-- 01_spec.md          # dumpPhiValues() 기능 명세서
|   +-- 02_plan.md          # 본 문서 - 구현 계획
|   +-- 03_tasks.md         # 작업 분해 구조
+-- artifacts/
    +-- SDS.md              # 소프트웨어 상세 설계서 (SDS-3.14)
    +-- SAD.md              # 소프트웨어 아키텍처 명세서 (COMP-3)
    +-- SRS.md              # 소프트웨어 요구사항 명세서
```

### Source Code

```text
viewer/src/data/dicomParser/
+-- phiGuard.js                # [수정] dumpPhiValues() 얕은 복사 반환으로 보강
+-- index.js                   # [변경 없음] dumpPhiValues() 미노출 유지

viewer/tests/unit/
+-- phiGuard.dumpPhiValues.test.js   # [신규] dumpPhiValues() 전용 단위 테스트
+-- phiGuard.test.js                 # [기존] maskPhiFields(), getPhiValue() 테스트

viewer/tests/integration/
+-- dicomParser.test.js              # [기존] 파싱 파이프라인 회귀 테스트
```

---
## Implementation Approach

### Phase 순서 및 접근 방식

#### Phase 1: 기존 코드 분석 및 캡슐화 보강 (Setup)

**목표**: 현재 dumpPhiValues() 구현의 FR-003(얕은 복사 반환) 비준수 사항을 파악하고 수정한다.

**현재 코드 분석**:
```javascript
export function dumpPhiValues(metadata) {
  return phiStore.get(metadata) || {};
}
```

**문제점**:
- `phiStore.get(metadata)`가 truthy인 경우 내부 참조를 직접 반환하여 phiStore 캡슐화 위반
- 반환 객체를 외부에서 수정하면 phiStore 내부 원본이 함께 변경됨 (NFR-001 위반)
- FR-003에서 명시하는 스프레드 연산자(`{ ...originals }`) 미사용

**수정 방안**:
```javascript
export function dumpPhiValues(metadata) {
  const originals = phiStore.get(metadata);
  return originals ? { ...originals } : {};
}
```

- `|| {}` 대신 삼항 연산자 사용: `phiStore.get(metadata)`가 빈 객체 `{}`를 반환할 경우 falsy 평가되어 의도치 않게 `{}`가 반환되는 엣지 케이스 방지
- 스프레드 연산자로 얕은 복사본 생성: PHI_FIELDS가 모두 string 타입이므로 얕은 복사만으로 완전한 분리 보장 (NFR-001)

#### Phase 2: 코어 구현 (Core Implementation)

**Step 1 - 함수 시그니처 및 JSDoc 보강**
- 기존 JSDoc에 `@returns {Object}` 타입 정보 보강: 얕은 복사본임을 명시
- `@internal` 태그 유지하여 API 문서에서 제외 확인
- IEC 62304 추적성 주석 추가 (FR-4.1, SEC-3, HAZ-3.1)

**Step 2 - 함수 본문 수정 (3줄)**
```javascript
export function dumpPhiValues(metadata) {
  const originals = phiStore.get(metadata);
  return originals ? { ...originals } : {};
}
```

| 라인 | 동작 | 추적 |
|------|------|------|
| 1: `const originals = ...` | WeakMap에서 metadata 키로 원본 조회 | FR-001, FR-002 |
| 2: `return originals ? ...` | 원본 존재 시 얕은 복사본, 없으면 빈 객체 | FR-003, FR-004 |

**Step 3 - 배럴 파일(index.js) 미노출 확인**
- `viewer/src/data/dicomParser/index.js`에서 dumpPhiValues가 export되지 않았음을 확인 완료
- 현재 `export { getPhiValue, maskPhiFields } from './phiGuard.js'` 만 노출 중
- 변경 없음: 미노출 원칙 유지

**Step 4 - 프로덕션 빌드 트리쉐이킹 검증 방안**
- dumpPhiValues()는 index.js에서 re-export되지 않으므로, 모듈 외부에서 직접 import하지 않는 한 번들러(Vite/Rollup)가 트리쉐이킹으로 자동 제외
- 트리쉐이킹 검증: 프로덕션 빌드 후 번들 분석으로 dumpPhiValues 포함 여부 확인 (NFR-002)

#### Phase 3: 단위 테스트 (Testing)

**테스트 파일**: `viewer/tests/unit/phiGuard.dumpPhiValues.test.js`

| 테스트 케이스 | 입력 | 기대 결과 | 추적 |
|--------------|------|----------|------|
| TC-001: 마스킹된 객체에서 전체 PHI 일괄 조회 | maskPhiFields(metadata) 후 dumpPhiValues(metadata) | { patientName, patientID, patientBirthDate } 원본 값 반환 | FR-001, FR-005 |
| TC-002: 미마스킹 객체에서 빈 객체 반환 | maskPhiFields() 미호출 객체 | {} 반환 | FR-004, EC-003 |
| TC-003: null 입력 | dumpPhiValues(null) | {} 반환 | FR-004, EC-001 |
| TC-004: undefined 입력 | dumpPhiValues(undefined) | {} 반환 | FR-004, EC-002 |
| TC-005: 반환값 수정 후 원본 무결성 | 반환 객체 수정 후 재조회 | phiStore 원본 불변 | FR-003, NFR-001 |
| TC-006: 빈 PHI 필드 객체 | 모든 PHI 필드가 빈 문자열인 metadata | 마스킹 이력 없으면 {} 반환 | EC-005 |
| TC-007: GC된 WeakMap 키 | 참조 해제 후 조회 | {} 반환 | EC-004 |
| TC-008: 반환 객체에 새 속성 추가 | 반환값에 임의 속성 추가 | phiStore 내부에 영향 없음 | NFR-001 |

**테스트 전략**:
- phiGuard.js 모듈을 통째로 import하여 dumpPhiValues만 선택적으로 테스트
- maskPhiFields()를 테스트 setup에서 호출하여 phiStore에 테스트 데이터 사전 등록
- 각 테스트 케이스는 독립적으로 실행 가능 (US-1 ~ US-3 Independent Test 조건 충족)

#### Phase 4: 통합 및 회귀 (Integration)

- 기존 phiGuard.test.js 테스트 전체 통과 확인 (maskPhiFields, getPhiValue 회귀)
- 기존 dicomParser.test.js 통합 테스트 통과 확인
- parseDICOM() -> maskPhiFields() -> getPhiValue() 호출 체인에 영향 없음 검증
- 프로덕션 빌드 산출물에서 dumpPhiValues() 제외 확인 (번들 분석)

### Key Technical Decisions

- **결정 1: `|| {}` 대신 삼항 연산자(`originals ? ... : {}`) 사용**
  이유: `phiStore.get(metadata)`가 빈 객체 `{}`를 반환할 경우, `|| {}` 평가 시 falsy가 아니므로 빈 객체가 그대로 반환되긴 하지만, 의도가 명확하지 않음. 삼항 연산자는 "원본이 존재하는가?"라는 의도를 명확히 표현하며, FR-003의 스프레드 연산자 사용과 자연스럽게 결합됨.

- **결정 2: 스프레드 연산자(`{ ...originals }`)로 얕은 복사 수행**
  이유: PHI_FIELDS(patientName, patientID, patientBirthDate)는 모두 string 원시 타입이므로 얕은 복사만으로 완전한 깊은 분리가 보장됨. JSON.parse(JSON.stringify()) 등의 깊은 복사는 불필요한 성능 오버헤드. structuredClone()은 브라우저 호환성 부담.

- **결정 3: 프로덕션 빌드에서 환경변수 가드 대신 트리쉐이킹에 의존**
  이유: dumpPhiValues()는 배럴 파일(index.js)에서 re-export되지 않으므로, 모듈 외부에서 직접 import하지 않는 한 번들러가 자동으로 트리쉐이킹 수행. 별도의 `process.env.NODE_ENV` 가드를 추가하면 런타임 오버헤드와 번들 크기만 증가. [NEEDS CLARIFICATION] 트리쉐이킹만으로 프로덕션 제외가 충분한지, 아니면 명시적 환경변수 가드도 필요한지 프로젝트 보안 정책 확인 필요.

- **결정 4: 단위 테스트를 기존 phiGuard.test.js와 별도 파일로 분리**
  이유: dumpPhiValues()는 내부용/디버그 함수로 접근 제한이 다르고, 테스트 케이스가 8개로 독립적인 슈트를 구성하기에 충분함. 기존 테스트 파일과 혼합하면 maskPhiFields/getPhiValue 테스트 가독성 저하 우려.

---

## Complexity Tracking

### C-01: 얕은 복사 vs 내부 참조 직접 반환 (FR-003 준수)
- **복잡도 이유**: 현재 구현은 `phiStore.get(metadata) || {}`로 내부 참조를 직접 반환하여 캡슐화 위반. 스프레드 연산자로 얕은 복사본을 생성하면 매 호출 시 새 객체가 생성되어 메모리 할당이 발생하지만, PHI 데이터 무결성(NFR-001) 관점에서 필수적.
- **정당성**: dumpPhiValues()는 디버그/감사 목적으로만 사용되므로 호출 빈도가 극히 낮음. 메모리 할당 오버헤드는 무시할 수준. 캡슐화 위반으로 인한 PHI 데이터 오염 위험이 성능상 이점보다 훨씬 중요.

### C-02: `|| {}` vs 삼항 연산자 의미론
- **복잡도 이유**: JavaScript에서 `obj || default`는 falsy(0, '', null, undefined, false, NaN) 체크이며, `obj ? obj : default`는 truthy/falsy 체크. phiStore에 빈 객체 `{}`가 저장될 경우 `||`는 여전히 `{}`를 반환하므로 실제 동작 차이는 없음.
- **정당성**: 삼항 연산자 선택은 의도 명확성("원본이 존재하면 복사, 아니면 빈 객체")을 위한 것이며, 기능적 차이가 아닌 가독성/검증성 개선이 목적. 코드 리뷰에서 의도를 오해 없이 전달하기 위해 명시적 형태 채택.

### C-03: 프로덕션 빌드 트리쉐이킹 의존성 (NFR-002)
- **복잡도 이유**: 프로덕션 빌드에서 dumpPhiValues()를 제외하는 메커니즘이 번들러의 트리쉐이킹에만 의존함. 소스 코드 내에 명시적인 `process.env.NODE_ENV` 가드나 Dead Code Elimination 힌트가 없음.
- **정당성**: dumpPhiValues()는 배럴 파일(index.js)에서 re-export되지 않으므로, 번들러 입장에서 사용되지 않는(dead) export로 간주되어 자동 제외됨. 단, 테스트 파일에서 직접 import하는 경우 번들러 설정에 따라 제외되지 않을 수 있으므로 빌드 파이프라인 검증이 필요. [NEEDS CLARIFICATION] 테스트 환경에서의 import가 프로덕션 번들에 영향을 주지 않는지 빌드 설정 확인 필요.

---

## References

- Spec: `docs/spec-kit/01_spec.md`
- 티켓: `PLAYG-1833`
- 아키텍처 문서: `docs/artifacts/SAD.md` (COMP-3 phiGuard)
- 상세 설계서: `docs/artifacts/SDS.md` (SDS-3.14 dumpPhiValues)
- 요구사항 명세서: `docs/artifacts/SRS.md`
- 연관 SDS 항목: SDS-3.13(maskPhiFields, getPhiValue)
- 추적 FR: FR-4.1, SEC-3, HAZ-3.1
- 소스 파일: `viewer/src/data/dicomParser/phiGuard.js`

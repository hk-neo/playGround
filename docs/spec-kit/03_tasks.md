# Tasks: dumpPhiValues() PHI 일괄조회 (내부용/디버그)

**Input**: `docs/spec-kit/01_spec.md`, `docs/spec-kit/02_plan.md`
**Ticket**: `PLAYG-1833` | **Date**: 2026-05-04
**Safety Class**: IEC 62304 Class A

> **형식 안내**
> - `[ID]` : 태스크 번호 (T001, T002, ...)
> - `[P]` : 병렬 실행 가능 여부 표시 (🔀 병렬 가능 / 🔒 순서 필수)
> - `[Story]` : 관련 사용자 스토리 (US1, US2, ...)
> - 각 태스크는 **2시간 이내** 완료 가능한 단위로 분할

---

## Phase 1: Setup (공통 인프라)
<!-- 모든 다음 단계에 필요한 공통 환경 설정 -->

- [ ] **T001** 🔒 기존 phiGuard.js 코드 분석 및 FR-003 위반 사항 확인
  - 파일: `viewer/src/data/dicomParser/phiGuard.js`
  - 작업 내용:
    - 현재 `dumpPhiValues()` 구현(`return phiStore.get(metadata) || {}`)을 분석
    - `phiStore.get(metadata)`가 truthy일 때 내부 참조를 직접 반환하여 캡슐화 위반 확인
    - PHI_FIELDS(3개: patientName, patientID, patientBirthDate) 전부 string 타입임을 확인
    - 얕은 복사(`{...originals}`)로 충분한 분리 보장 가능한지 검증
  - 완료 조건: 현재 코드의 FR-003 비준수 사항(내부 참조 직접 반환)을 이슈로 정리하고, 수정 방안을 코드 주석으로 문서화

- [ ] **T002** 🔒 테스트 환경 구성 및 phiGuard 모듈 import 검증
  - 파일: `viewer/tests/unit/phiGuard.dumpPhiValues.test.js`(신규 생성), `viewer/tests/unit/` 디렉토리
  - 작업 내용:
    - Jest 테스트 파일 `viewer/tests/unit/phiGuard.dumpPhiValues.test.js` 생성
    - phiGuard.js에서 `dumpPhiValues`, `maskPhiFields` named import 가능한지 확인
    - `describe('dumpPhiValues', () => { ... })` 최상위 스위트 골격 작성
    - 기존 테스트 파일(`viewer/tests/unit.test.js` 등)이 정상 통과하는지 사전 확인
  - 완료 조건: 빈 테스트 스위트가 Jest에서 정상 실행됨(PASS 0, FAIL 0), 기존 테스트 전부 PASS

---

## Phase 2: Foundational (선행 필수 항목)
<!-- CRITICAL: 사용자 스토리 구현 전 반드시 완료해야 할 핵심 인프라 -->

- [ ] **T003** 🔒 dumpPhiValues() 얕은 복사 반환으로 캡슐화 보강 (코어 구현)
  - 파일: `viewer/src/data/dicomParser/phiGuard.js`
  - 추적: FR-001, FR-002, FR-003, FR-004, FR-005, NFR-001, NFR-004, TD-01, TD-02
  - 작업 내용:
    - `dumpPhiValues()` 본문을 다음과 같이 수정:
      ```javascript
      export function dumpPhiValues(metadata) {
        const originals = phiStore.get(metadata);
        return originals ? { ...originals } : {};
      }
      ```
    - `|| {}`를 삼항 연산자로 변경: `phiStore.get(metadata)`가 빈 객체 `{}`를 반환할 때의 의미론적 명확성 확보
    - 스프레드 연산자(`{ ...originals }`)로 얕은 복사본 생성: PHI_FIELDS가 전부 string이므로 얕은 복사로 완전한 분리 보장
    - JSDoc `@returns` 태그에 얕은 복사본 반환 명시 추가
    - IEC 62304 추적성 주석 추가 (FR-4.1, SEC-3, HAZ-3.1)
  - 완료 조건:
    - `dumpPhiValues(metadata)` 호출 시 phiStore 내부 참조가 아닌 새 객체 반환
    - null/undefined 입력 시 예외 없이 빈 객체 `{}` 반환
    - 기존 `maskPhiFields()`, `getPhiValue()` 동작에 영향 없음

- [ ] **T004** 🔒 배럴 파일(index.js) 미노출 원칙 확인 및 트리쉐이킹 검증 방안 수립
  - 파일: `viewer/src/data/dicomParser/index.js`
  - 추적: FR-006, NFR-002, TD-03
  - 작업 내용:
    - `index.js`에 `dumpPhiValues`가 re-export되지 않았음을 재확인
    - 현재 `export { getPhiValue, maskPhiFields } from './phiGuard.js'` 만 노출 중임을 검증
    - Vite/Rollup 프로덕션 빌드에서 dumpPhiValues가 트리쉐이킹 대상인지 빌드 설정 확인
    - 필요시 빌드 산출물 분석 스크립트 또는 번들 분석 명령 문서화
  - 완료 조건: index.js에 dumpPhiValues 미노출 확인, 프로덕션 빌드 트리쉐이킹 검증 방법을 주석 또는 문서로 기록

---
## Phase 3: User Story 1 — 마스킹된 PHI 원본 값 일괄 조회 (Priority: P1) 🎯 MVP

- **Goal**: maskPhiFields()로 마스킹된 DICOMMetadata 객체에서 phiStore에 저장된 모든 원본 PHI 값을 일괄 조회하여 반환한다.
- **Independent Test**: maskPhiFields()로 마스킹된 metadata 객체를 dumpPhiValues()에 전달하여, 반환된 객체의 patientName/patientID/patientBirthDate 값이 원본과 일치하는지 직접 검증한다.
- **추적**: FR-001, FR-002, FR-005, US-1

- [ ] **T005** 🔀 [US1] 마스킹된 객체에서 전체 PHI 일괄 조회 테스트 작성 (TC-001)
  - 파일: `viewer/tests/unit/phiGuard.dumpPhiValues.test.js`
  - 추적: FR-001, FR-002, FR-005, TC-001
  - 작업 내용:
    - 테스트 케이스: 마스킹된 객체에서 전체 PHI 일괄 조회
    - `const metadata = { patientName: '홍길동', patientID: 'P12345', patientBirthDate: '19900101' }` 생성
    - `maskPhiFields(metadata)` 호출 후 `dumpPhiValues(metadata)` 실행
    - 반환 객체가 `{ patientName: '홍길동', patientID: 'P12345', patientBirthDate: '19900101' }`임을 검증
    - `expect(result).toEqual({ patientName: '홍길동', patientID: 'P12345', patientBirthDate: '19900101' })`
  - 완료 조건: TC-001 테스트 PASS, 마스킹된 metadata에서 원본 3개 필드 값이 정확히 반환됨

- [ ] **T006** 🔀 [US1] 빈 PHI 필드 객체 엣지 케이스 테스트 작성 (TC-006)
  - 파일: `viewer/tests/unit/phiGuard.dumpPhiValues.test.js`
  - 추적: FR-001, FR-005, TC-006, EC-005
  - 작업 내용:
    - 테스트 케이스: 빈 PHI 필드 객체
    - 모든 PHI 필드가 빈 문자열인 metadata: `{ patientName: '', patientID: '', patientBirthDate: '' }`
    - `maskPhiFields(metadata)` 호출 후 `dumpPhiValues(metadata)` 실행
    - maskPhiFields는 빈 문자열 필드를 phiStore에 저장하지 않으므로, 빈 객체 `{}` 반환 예상
    - `expect(result).toEqual({})` 검증
  - 완료 조건: TC-006 테스트 PASS, 빈 문자열 PHI 필드는 마스킹 이력이 없으므로 빈 객체 반환 확인

- [ ] **T007** 🔒 [US1] 일부 PHI 필드만 있는 객체 테스트 작성
  - 파일: `viewer/tests/unit/phiGuard.dumpPhiValues.test.js`
  - 추적: FR-001, FR-005
  - 작업 내용:
    - 테스트 케이스: 일부 PHI 필드만 존재하는 metadata
    - `const metadata = { patientName: '홍길동', patientID: 'P12345' }` (patientBirthDate 없음)
    - `maskPhiFields(metadata)` 후 `dumpPhiValues(metadata)` 실행
    - 반환 객체가 `{ patientName: '홍길동', patientID: 'P12345' }` (patientBirthDate 키 없음) 임을 검증
  - 완료 조건: 테스트 PASS, 존재하는 PHI 필드만 반환 객체에 포함됨을 확인

---
## Phase 4: User Story 2 — 마스킹 이력 없는 객체에 대한 안전한 빈 반환 (Priority: P1) 🎯 MVP

- **Goal**: maskPhiFields()를 거치지 않았거나 phiStore에 등록되지 않은 metadata, null, undefined 입력 시 예외 없이 빈 객체 {}를 안전하게 반환한다.
- **Independent Test**: maskPhiFields()를 호출하지 않은 순수 metadata 객체 또는 null을 dumpPhiValues()에 전달하여 빈 객체 {}가 반환되는지 확인한다.
- **추적**: FR-004, NFR-004, SEC-3, US-2, IEC 62304 Class A

- [ ] **T008** 🔀 [US2] null/undefined 입력 안전 반환 테스트 작성 (TC-003, TC-004)
  - 파일: `viewer/tests/unit/phiGuard.dumpPhiValues.test.js`
  - 추적: FR-004, NFR-004, SEC-3, TC-003, TC-004, EC-001, EC-002
  - 작업 내용:
    - TC-003: `dumpPhiValues(null)` 호출 → `{}` 반환 검증
    - TC-004: `dumpPhiValues(undefined)` 호출 → `{}` 반환 검증
    - 각 케이스에서 예외가 발생하지 않음을 `expect(() => ...).not.toThrow()`로 검증
    - IEC 62304 Class A 예외 안전성 요구사항 충족 확인
  - 완료 조건: TC-003, TC-004 테스트 PASS, null/undefined 입력 시 예외 없이 빈 객체 반환

- [ ] **T009** 🔀 [US2] 미마스킹 객체 및 GC된 WeakMap 키 테스트 작성 (TC-002, TC-007)
  - 파일: `viewer/tests/unit/phiGuard.dumpPhiValues.test.js`
  - 추적: FR-004, TC-002, TC-007, EC-003, EC-004
  - 작업 내용:
    - TC-002: maskPhiFields() 미호출 객체 → `dumpPhiValues(metadata)` → `{}` 반환 검증
    - TC-007: WeakRef + gc를 활용하여 GC된 키 객체 테스트 (가능한 환경에서만)
      ```javascript
      let metadata = { patientName: 'test' };
      maskPhiFields(metadata);
      const weakRef = new WeakRef(metadata);
      metadata = null; // 참조 해제
      // GC 후 weakRef.deref()가 undefined면 dumpPhiValues도 {} 반환
      ```
    - GC 테스트는 Node.js 환경에서 `--expose-gc` 플래그 필요 시 별도 스킵 처리
  - 완료 조건: TC-002 테스트 PASS, TC-007은 환경 지원 시 PASS (미지원 시 skip)

---
## Phase 5: User Story 3 — 반환값 캡슐화 및 데이터 무결성 보장 (Priority: P2)

- **Goal**: dumpPhiValues() 반환값이 phiStore 내부 참조가 아닌 얕은 복사본임을 보장하여, 호출자가 반환 객체를 수정해도 phiStore 원본이 변경되지 않도록 캡슐화를 검증한다.
- **Independent Test**: dumpPhiValues() 반환 객체의 속성을 변경한 후, 동일 metadata로 다시 dumpPhiValues()를 호출하여 원본이 보존되었는지 확인한다.
- **추적**: FR-003, NFR-001, SEC-3, US-3, TD-01

- [ ] **T010** 🔀 [US3] 반환값 수정 후 원본 무결성 테스트 작성 (TC-005, TC-008)
  - 파일: `viewer/tests/unit/phiGuard.dumpPhiValues.test.js`
  - 추적: FR-003, NFR-001, SEC-3, TC-005, TC-008, EC-006
  - 작업 내용:
    - TC-005: 반환값 수정 후 원본 무결성 검증
      ```javascript
      const metadata = { patientName: '홍길동', patientID: 'P12345', patientBirthDate: '19900101' };
      maskPhiFields(metadata);
      const result1 = dumpPhiValues(metadata);
      result1.patientName = '변경값';  // 반환값 수정
      const result2 = dumpPhiValues(metadata);
      expect(result2.patientName).toBe('홍길동'); // 원본 불변
      ```
    - TC-008: 반환 객체에 새 속성 추가 후 phiStore 내부 영향 없음 검증
      ```javascript
      const result = dumpPhiValues(metadata);
      result.newProp = '추가속성';
      const resultAgain = dumpPhiValues(metadata);
      expect(resultAgain.newProp).toBeUndefined(); // 내부에 영향 없음
      ```
    - EC-006: 반환값 수정 후 동일 metadata로 재조회 시 원본 보존 검증
  - 완료 조건: TC-005, TC-008 테스트 PASS, 반환 객체 수정이 phiStore 내부에 영향 없음 확인

- [ ] **T011** 🔀 [US3] 반환값이 새 객체 참조임을 검증하는 테스트 작성
  - 파일: `viewer/tests/unit/phiGuard.dumpPhiValues.test.js`
  - 추적: FR-003, NFR-001
  - 작업 내용:
    - 동일 metadata로 dumpPhiValues()를 두 번 호출하여 서로 다른 객체 참조임을 검증
      ```javascript
      const result1 = dumpPhiValues(metadata);
      const result2 = dumpPhiValues(metadata);
      expect(result1).not.toBe(result2);  // 참조 다름
      expect(result1).toEqual(result2);   // 값은 동일
      ```
    - 매 호출 시 새 객체가 생성됨(얕은 복사)을 보장
  - 완료 조건: 테스트 PASS, 매 호출 시 새 객체 참조 생성 확인

---
## Phase 6: User Story 4 — 프로덕션 환경 접근 제한 (Priority: P2)

- **Goal**: 프로덕션 빌드에서 dumpPhiValues() 함수가 트리쉐이킹에 의해 제외됨을 검증하고, PHI 정보 콘솔/네트워크 전송 금지 정책을 문서화한다.
- **Independent Test**: 프로덕션 빌드 산출물에서 dumpPhiValues() 함수가 포함되지 않았는지 번들 분석으로 확인한다.
- **추적**: NFR-002, NFR-003, SEC-3, HAZ-3.1, US-4, TD-03, TD-04

- [ ] **T012** 🔀 [US4] 프로덕션 빌드 트리쉐이킹 검증
  - 파일: 빌드 설정 파일(`vite.config.js` 또는 `rollup.config.js`), `viewer/src/data/dicomParser/index.js`
  - 추적: NFR-002, TD-03
  - 작업 내용:
    - 프로덕션 빌드 실행 (`npm run build` 또는 `vite build`)
    - 빌드 산출물 번들에서 `dumpPhiValues` 문자열 검색으로 포함 여부 확인
    - `index.js`에서 re-export되지 않으므로 트리쉐이킹 자동 제외 예상
    - 번들 분석 결과를 스크린샷 또는 로그로 캡처하여 문서화
  - 완료 조건: 프로덕션 빌드 산출물에 dumpPhiValues 함수 코드 미포함 확인

- [ ] **T013** 🔀 [US4] PHI 정보 취급 정책 주석 및 JSDoc 보강
  - 파일: `viewer/src/data/dicomParser/phiGuard.js`
  - 추적: NFR-003, HAZ-3.1, TD-04
  - 작업 내용:
    - dumpPhiValues() JSDoc에 다음 경고 주석 추가:
      ```
      * @warning 반환된 객체에는 민감한 PHI 정보가 포함되어 있습니다.
      *          콘솔 출력(console.log) 및 외부 전송(fetch/XHR)은 엄격히 금지됩니다.
      *          추적: HAZ-3.1, NFR-003
      ```
    - `@internal` 태그 유지 확인 (API 문서에서 자동 제외)
    - 함수 시그니처 위에 프로덕션 사용 금지 주석 강화
  - 완료 조건: JSDoc에 PHI 정보 취급 경고 및 @internal 태그 포함, 코드 리뷰 가능 상태

---
## Phase 7: Integration & Finalization

- [ ] **T-INT-01** 🔒 기존 테스트 스위트 회귀 검증
  - 파일: `viewer/tests/unit.test.js`, `viewer/tests/dicomDictionary.test.js`, 기타 기존 테스트 파일
  - 추적: 전체 FR, NFR, IEC 62304 Class A
  - 작업 내용:
    - `npm test` 또는 `npx jest` 실행하여 기존 전체 테스트 통과 확인
    - 기존 251개 테스트(또는 현재 총 테스트 수) 중 실패 없음 확인
    - 신규 `phiGuard.dumpPhiValues.test.js` 8개 테스트 전부 PASS 확인
    - `parseDICOM() → maskPhiFields() → getPhiValue()` 호출 체인에 영향 없음 검증
    - `maskPhiFields()`, `getPhiValue()` 기존 동작 회귀 없음 확인
  - 완료 조건: 전체 테스트 PASS (기존 + 신규 8개), 회귀 없음

- [ ] **T-INT-02** 🔒 코드 리뷰 및 최종 산출물 검증
  - 파일: `viewer/src/data/dicomParser/phiGuard.js`, `viewer/tests/unit/phiGuard.dumpPhiValues.test.js`
  - 추적: 전체 FR, NFR, DoD
  - 작업 내용:
    - dumpPhiValues() 구현이 01_spec.md의 FR-001 ~ FR-006 모두 충족하는지 체크리스트 검증
    - NFR-001 ~ NFR-004 모두 충족 확인
    - Edge Case EC-001 ~ EC-006 테스트 커버리지 확인
    - IEC 62304 Class A 안전 등급 요구사항 (예외 안전성) 충족 확인
    - Definition of Done 체크리스트 항목별 확인
    - 함수 로직이 3줄 이하로 유지되었는지 검증 (가독성/검증 가능성)
  - 완료 조건: DoD 체크리스트 전체 PASS, 코드 리뷰 승인 가능 상태

- [ ] **T-INT-03** 🔒 git commit 및 원격 브랜치 push
  - 파일: 변경된 전체 파일
  - 작업 내용:
    - `git add viewer/src/data/dicomParser/phiGuard.js`
    - `git add viewer/tests/unit/phiGuard.dumpPhiValues.test.js`
    - `git commit -m 'feat(PHIGUARD): dumpPhiValues() 얕은 복사 반환 보강 - PLAYG-1833'`
    - `git push origin feature/PLAYG-1833-dump-phi-values`
  - 완료 조건: 원격 브랜치 push 완료, CI 파이프라인 통과

---
## Dependencies & Execution Order

```
Phase 1 (Setup):
  T001 (코드 분석) → T002 (테스트 환경 구성)

Phase 2 (Foundational):
  T003 (코어 구현 - 얕은 복사 보강) → T004 (배럴 파일/트리쉐이킹 확인)

Phase 3 (US1 - PHI 일괄 조회):
  T005 (TC-001) 🔀
  T006 (TC-006) 🔀  ── 모두 T003 완료 후 병렬 가능
  T007 (일부 필드) 🔀

Phase 4 (US2 - 안전한 빈 반환):
  T008 (TC-003/004) 🔀  ── T003 완료 후 병렬 가능
  T009 (TC-002/007) 🔀  ── T003 완료 후 병렬 가능

Phase 5 (US3 - 캡슐화 검증):
  T010 (TC-005/008) 🔀  ── T003 완료 후 병렬 가능
  T011 (참조 검증)  🔀  ── T003 완료 후 병렬 가능

Phase 6 (US4 - 프로덕션 제한):
  T012 (트리쉐이킹)  🔀  ── T004 완료 후
  T013 (JSDoc 보강)  🔀  ── T003 완료 후 병렬 가능

Phase 7 (Integration):
  T-INT-01 (회귀 검증) → T-INT-02 (최종 검증) → T-INT-03 (commit/push)
```

## Estimated Effort

| Phase                 | 태스크 수 | 예상 소요 시간 |
| --------------------- | --------- | -------------- |
| Phase 1: Setup        | 2         | 1.5시간        |
| Phase 2: Foundational | 2         | 1.5시간        |
| Phase 3: US1 (P1 MVP) | 3         | 1.5시간        |
| Phase 4: US2 (P1 MVP) | 2         | 1.0시간        |
| Phase 5: US3 (P2)     | 2         | 1.0시간        |
| Phase 6: US4 (P2)     | 2         | 1.5시간        |
| Phase 7: Integration  | 3         | 1.0시간        |
| **합계**              | **16**    | **9.0시간**    |

> **참고**: Phase 3~6의 태스크는 T003(코어 구현) 완료 후 병렬 실행 가능하므로,
> 실제 소요 시간은 순차 실행 기준 9.0시간에서 병렬 시 ~5~6시간으로 단축 가능합니다.
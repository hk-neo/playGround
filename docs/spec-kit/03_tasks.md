# 태스크 목록: getPhiValue() PHI 원본 안전조회

**Input**: `docs/spec-kit/01_spec.md`, `docs/spec-kit/02_plan.md`
**Ticket**: `PLAYG-1832` | **Date**: 2026-05-04

> **형식 안내**
> - `[ID]` : 태스크 번호 (T001, T002, ...)
> - `[P]` : 병렬 실행 가능 여부 표시 (:twisted_rightwards_arrows: 병렬 가능 / :lock: 순서 필수)
> - `[Story]` : 관련 사용자 스토리 (US1, US2, ...)
> - 각 태스크는 **2시간 이내** 완료 가능한 단위로 분할

---

## Phase 1: Setup (공통 인프라)

- [ ] **T001** :lock: phiGuard.js 기존 코드 구조 파악 및 PHI_FIELDS/phiStore 확인
  - 파일: `viewer/src/data/dicomParser/phiGuard.js`
  - 완료 조건: phiStore(WeakMap) 선언부, PHI_FIELDS 상수 배열, maskPhiFields() 함수 시그니처 확인. getPhiValue() 추가 위치 식별.

- [ ] **T002** :lock: index.js 배럴 export 구조 확인
  - 파일: `viewer/src/data/dicomParser/index.js`
  - 완료 조건: 기존 export 목록 확인. getPhiValue 추가 위치 식별.

---

## Phase 2: Foundational (선행 필수 항목)

- [ ] **T003** :lock: getPhiValue() 함수 골격 구현
  - 파일: `viewer/src/data/dicomParser/phiGuard.js`
  - 완료 조건: getPhiValue(metadata, field) 함수 선언 및 PHI_FIELDS.includes(field) 가드, phiStore.get(metadata) 조회, 원본 값 반환 로직 구현.
  - 구현 내용:
    ```javascript
    export function getPhiValue(metadata, field) {
      if (!PHI_FIELDS.includes(field)) return undefined;
      const originals = phiStore.get(metadata);
      return originals ? originals[field] : undefined;
    }
    ```

- [ ] **T004** :lock: index.js 배럴 export에 getPhiValue 추가
  - 파일: `viewer/src/data/dicomParser/index.js`
  - 완료 조건: `export { getPhiValue }` 추가. 외부 모듈에서 import 가능 상태.

---

## Phase 3: User Story 1,2,3 - 인가된 PHI 조회 + 비인가 차단 + 예외 입력 처리 (Priority: P1) :dart: MVP

- **Goal**: maskPhiFields()로 마스킹된 DICOMMetadata에서 인가된 PHI 필드의 원본 값을 안전하게 조회하고, 비인가 필드와 예외 입력에 대해 undefined를 반환한다.
- **Independent Test**: TC-13.1~TC-13.8 단위 테스트 8개 전체 통과

- [ ] **T005** :lock: [US1] TC-13.1, TC-13.2, TC-13.3 인가 필드 원본 조회 테스트 작성
  - 파일: `viewer/tests/unit.test.js`
  - 완료 조건:
    - TC-13.1: getPhiValue(meta, 'patientName') === 원본 환자 이름
    - TC-13.2: getPhiValue(meta, 'patientID') === 원본 환자 ID
    - TC-13.3: getPhiValue(meta, 'patientBirthDate') === 원본 생년월일
    - 3개 테스트 전체 PASS

- [ ] **T006** :lock: [US2] TC-13.4, TC-13.5 비인가 필드 차단 테스트 작성
  - 파일: `viewer/tests/unit.test.js`
  - 완료 조건:
    - TC-13.4: getPhiValue(meta, 'rows') === undefined
    - TC-13.5: getPhiValue(meta, 'unknownField') === undefined
    - 2개 테스트 전체 PASS

- [ ] **T007** :lock: [US3] TC-13.6, TC-13.7, TC-13.8 예외 입력 테스트 작성
  - 파일: `viewer/tests/unit.test.js`
  - 완료 조건:
    - TC-13.6: getPhiValue(plainObj, 'patientName') === undefined (마스킹되지 않은 객체)
    - TC-13.7: getPhiValue(null, 'patientName') === undefined (null 입력)
    - TC-13.8: getPhiValue(meta_empty, 'patientName') === undefined (빈 문자열 원본)
    - 3개 테스트 전체 PASS

---

## Phase 4: Integration & Finalization

- [ ] **T-INT-01** :lock: 전체 테스트 스위트 회귀 검증
  - 완료 조건: 기존 251개 테스트 + 신규 8개 테스트 = 259개 전체 PASS. 빌드 성공.

- [ ] **T-INT-02** :lock: 최종 코드 리뷰 및 commit/push
  - 완료 조건: 원격 브랜치 push 완료. Jira 상태 업데이트.

---

## Dependencies & Execution Order

```
T001 -> T002
  |
  v
T003 -> T004
  |
  v
T005 -> T006 -> T007  (순차 작성 권장, 동일 파일)
  |
  v
T-INT-01 -> T-INT-02
```

## Estimated Effort

| Phase        | 태스크 수 | 예상 소요 시간 |
| ------------ | --------- | -------------- |
| Setup        | 2         | 0.5시간        |
| Foundational | 2         | 1.0시간        |
| User Stories | 3         | 1.5시간        |
| Integration  | 2         | 0.5시간        |
| **합계**     | **9**     | **3.5시간**    |
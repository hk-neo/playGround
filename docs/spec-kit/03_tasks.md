# Tasks: DICOMMetadata 타입 팩토리 (DICOMMetadata.js)

**Input**: `docs/spec-kit/01_spec.md`, `docs/spec-kit/02_plan.md`
**Ticket**: `PLAYG-1817` | **Date**: 2026-04-27

> **형식 안내**
> - `[ID]` : 태스크 번호 (T001, T002, ...)
> - `[P]` : 병렬 실행 가능 여부 표시 (🔀 병렬 가능 / 🔒 순서 필수)
> - `[Story]` : 관련 사용자 스토리 (US1, US2, ...)
> - 각 태스크는 **2시간 이내** 완료 가능한 단위로 분할

---

## Phase 1: Setup (공통 인프라)
<!-- 모든 다음 단계에 필요한 공통 환경 설정 -->

- [x] **T001** 🔒 기존 구현 상태 분석 및 명세 일치성 검증
  - 파일: `viewer/src/types/DICOMMetadata.js`
  - 작업 내용:
    - 기존 DICOMMetadata.js의 28개 속성 JSDoc typedef가 FR-001에 명시된 속성 목록과 정확히 일치하는지 교차 검증
    - 각 속성의 타입 어노테이션(string, number, number[])이 명세와 일치하는지 확인
    - 기존 createDICOMMetadata()의 기본값이 FR-004 규칙(문자열='', 숫자=0, numberOfFrames=1, bitsAllocated=16)을 따르는지 검증
    - `bitsStored=16`, `highBit=15` 기본값이 DICOM PS3.5 권장값과 일치하는지 확인
    - 누락되거나 불일치하는 항목을 발견하면 수정 계획 수립
  - 완료 조건:
    - 28개 속성 이름, 타입, 기본값이 모두 01_spec.md FR-001/FR-004와 일치함을 확인
    - 불일치 항목이 있으면 목록화하여 Phase 2에서 수정 가능하도록 정리

- [x] **T002** 🔒 Vitest 테스트 환경 확인 및 테스트 파일 준비
  - 파일: `viewer/tests/unit.test.js`, `viewer/package.json`
  - 작업 내용:
    - `vitest`가 package.json devDependencies에 포함되어 있는지 확인
    - `npx vitest run` 명령으로 기존 테스트가 모두 통과하는지 사전 검증
    - unit.test.js 내 기존 `createDICOMMetadata` describe 블록(2개 테스트)을 확인
    - TC-1.2.1 ~ TC-1.2.6 및 엣지 케이스 테스트를 추가할 위치 계획
  - 완료 조건:
    - `npx vitest run` 기존 테스트 전체 PASS 확인
    - 신규 테스트 삽입 위치(기존 describe 블록 내) 확정

---

## Phase 2: Foundational (선행 필수 항목)
<!-- CRITICAL: 사용자 스토리 구현 전 반드시 완료해야 할 핵심 인프라 -->

- [x] **T003** 🔒 DICOMMetadata typedef JSDoc 보완 및 검증
  - 파일: `viewer/src/types/DICOMMetadata.js`
  - 작업 내용:
    - T001 분석 결과를 바탕으로 28개 속성 JSDoc @property 선언 보완
    - PHI 필드(patientName, patientID, patientBirthDate)에 주석으로 PHI 대상임을 명시
    - 필수 필드(rows, columns, bitsAllocated, pixelRepresentation)에 주석으로 필수 태그임을 명시
    - `@module types/DICOMMetadata` 선언 유지 확인
    - DICOM PS3.5 VR 기반 타입 매핑 정확성 재확인
  - 완료 조건:
    - 28개 속성 모두 @property 선언 완료, 타입이 명세와 일치
    - PHI 필드 3개에 보안 관련 주석 포함
    - `npm run lint` 통과 (린트 에러 없음)

- [x] **T004** 🔒 createDICOMMetadata 팩토리 함수 방어 코드 추가
  - 파일: `viewer/src/types/DICOMMetadata.js`
  - 작업 내용:
    - EC-001 대응: `overrides = {}` 기본값 파라미터에 추가로 `overrides ?? {}` nullish coalescing 방어 로직 적용
    - 함수 내부에서 `const safe = overrides ?? {}` 후 `{ ...defaults, ...safe }` 패턴 적용
    - 배열 기본값(pixelSpacing, imageOrientationPatient, imagePositionPatient)이 매 호출 시 새 리터럴로 생성되는지 확인 (FR-003, HAZ-5.1)
    - Object Spread 연산자로 overrides 병합 시 추가 필드도 포함되는지 재확인 (FR-007)
  - 완료 조건:
    - `createDICOMMetadata(null)` 및 `createDICOMMetadata(undefined)` 호출 시 에러 없이 기본값 객체 반환
    - 기본 배열 필드가 매 호출 시 새 참조로 생성됨을 코드 리뷰로 확인
    - `npm run lint` 통과

---

## Phase 3: User Story 1 — DICOMMetadata 기본 객체 생성 (Priority: P1) 🎯 MVP

- **Goal**: 인자 없이 createDICOMMetadata()를 호출하면 28개 속성이 모두 안전한 기본값으로 채워진 객체를 반환한다.
- **Independent Test**: 무인자 호출 후 반환 객체의 28개 속성 값을 기대값과 비교
- **추적**: FR-001, FR-004, FR-2.3, TC-1.2.1

- [x] **T005** 🔀 [US1] 28개 속성 기본값 검증 테스트 작성 (TC-1.2.1)
  - 파일: `viewer/tests/unit.test.js`
  - 작업 내용:
    - 기존 `createDICOMMetadata` describe 블록에 TC-1.2.1 테스트 추가
    - 테스트 헬퍼 함수 `expectDefaultValues(meta)` 정의하여 28개 속성 기본값 일괄 검증
    - 기대값: 문자열 9개='', 숫자 기본 10개=0, numberOfFrames=1, bitsAllocated=16, bitsStored=16, highBit=15, pixelRepresentation=0, 배열 3개(pixelSpacing=[0,0], imageOrientationPatient=[1,0,0,0,1,0], imagePositionPatient=[0,0,0])
    - 반환 객체에 null/undefined가 존재하지 않음을 확인
  - 완료 조건:
    - `it('TC-1.2.1: 무인자 호출 시 28개 속성이 모두 기본값으로 채워진 객체를 반환한다', ...)` 테스트 PASS
    - 28개 속성 전부 기본값 검증 완료

- [x] **T006** 🔀 [US1] 필수 필드 기본값 검증 테스트 작성 (TC-1.2.5)
  - 파일: `viewer/tests/unit.test.js`
  - 작업 내용:
    - TC-1.2.5: rows=0, columns=0, bitsAllocated=16, pixelRepresentation=0 검증
    - 이 필드들이 metadataParser.js에서 PARSE_ERR_MISSING_REQUIRED_TAG 에러 발생의 판단 기준이 됨을 주석으로 명시
    - FR-1.3, HAZ-1.3 추적 정보를 테스트 설명에 포함
  - 완료 조건:
    - `it('TC-1.2.5: 필수 필드(rows,columns,bitsAllocated,pixelRepresentation) 기본값을 검증한다', ...)` 테스트 PASS
    - 필수 4개 필드 기본값이 명세와 정확히 일치

- [x] **T007** 🔒 [US1] US1 관련 단위 테스트 통합 실행 및 검증
  - 파일: `viewer/tests/unit.test.js`
  - 완료 조건: TC-1.2.1, TC-1.2.5 테스트 모두 PASS, 기존 테스트 회귀 없음

---

## Phase 4: User Story 2 — 사용자 지정값으로 메타데이터 객체 생성 (Priority: P1)

- **Goal**: overrides 객체를 전달하면 기본값 위에 사용자 지정값이 덮어쓰기된 DICOMMetadata 객체를 반환한다.
- **Independent Test**: 특정 속성을 override로 전달 후 반영 여부 확인
- **추적**: FR-002, FR-2.3, TC-1.2.2, TC-1.2.3

- [x] **T008** 🔀 [US2] overrides 지정값 반영 테스트 작성 (TC-1.2.2)
  - 파일: `viewer/tests/unit.test.js`
  - 작업 내용:
    - TC-1.2.2: `createDICOMMetadata({rows:512, columns:512})` 호출 시 지정값 반영 + 나머지 기본값 유지 검증
    - rows=512, columns=512 확인 + patientName='', bitsAllocated=16 등 나머지 속성 기본값 유지 확인
    - 문자열, 숫자, 배열이 혼합된 overrides 전달 시 모두 정상 반영됨을 검증
  - 완료 조건:
    - `it('TC-1.2.2: overrides 전달 시 지정값은 반영되고 나머지는 기본값이 유지된다', ...)` 테스트 PASS

- [x] **T009** 🔀 [US2] 배열 필드 override 정확성 테스트 작성 (TC-1.2.3)
  - 파일: `viewer/tests/unit.test.js`
  - 작업 내용:
    - TC-1.2.3: `createDICOMMetadata({pixelSpacing:[0.3,0.3]})` 호출 시 배열 값이 정확히 반영됨을 검증
    - `imageOrientationPatient`, `imagePositionPatient` 배열 override도 추가 검증
    - `toEqual` 매처를 사용한 깊은 비교 수행
  - 완료 조건:
    - `it('TC-1.2.3: 배열 필드(pixelSpacing 등) override가 정확히 반영된다', ...)` 테스트 PASS

- [x] **T010** 🔒 [US2] US2 관련 단위 테스트 통합 실행 및 검증
  - 파일: `viewer/tests/unit.test.js`
  - 완료 조건: TC-1.2.2, TC-1.2.3 테스트 모두 PASS, 기존 테스트 회귀 없음

---

## Phase 5: User Story 3 — 참조 독립성 보장 (Priority: P1)

- **Goal**: createDICOMMetadata()를 여러 번 호출하면 각각 독립적인 참조를 가진 새 객체를 반환한다.
- **Independent Test**: 두 번 호출하여 반환된 객체가 서로 다른 참조인지 확인
- **추적**: FR-003, HAZ-5.1, TC-1.2.4

- [x] **T011** 🔀 [US3] 참조 독립성 및 참조 오염 방지 테스트 작성 (TC-1.2.4)
  - 파일: `viewer/tests/unit.test.js`
  - 작업 내용:
    - TC-1.2.4: 연속 두 번 호출 시 반환 객체가 서로 다른 참조(`not.toBe(meta1)`)임을 검증
    - 첫 번째 반환 객체의 스칼라 속성 변경 후 두 번째 객체에 영향이 없는지 확인
    - 첫 번째 반환 객체의 배열 속성(pixelSpacing) 변경 후 두 번째 객체에 영향이 없는지 확인
    - HAZ-5.1(참조 오염) 위험 완화 검증
  - 완료 조건:
    - `it('TC-1.2.4: 연속 호출 시 서로 다른 참조를 반환하여 참조 오염을 방지한다', ...)` 테스트 PASS
    - 스칼라 및 배열 속성 모두 참조 독립성 확인

- [x] **T012** 🔀 [US3] 엣지 케이스 테스트 작성 (EC-001 ~ EC-004)
  - 파일: `viewer/tests/unit.test.js`
  - 작업 내용:
    - EC-001: `createDICOMMetadata(null)` 및 `createDICOMMetadata(undefined)` 호출 시 에러 없이 기본값 객체 반환 검증
    - EC-002: 정의되지 않은 추가 속성(예: `photometricInterpretation`, `samplesPerPixel`) 전달 시 Object Spread에 의해 포함됨을 검증
    - EC-003: 다른 길이의 배열(예: `pixelSpacing: [0.5]`, `pixelSpacing: [0.3, 0.3, 0.3]`) 전달 시 그대로 반영됨을 검증
    - EC-004: 배열 기본값의 참조 독립성 — 동일 배열 필드(pixelSpacing)가 두 호출에서 서로 다른 참조임을 확인
  - 완료 조건:
    - EC-001 ~ EC-004 4개 엣지 케이스 테스트 모두 PASS

- [x] **T013** 🔒 [US3] US3 관련 단위 테스트 통합 실행 및 검증
  - 파일: `viewer/tests/unit.test.js`
  - 완료 조건: TC-1.2.4, EC-001 ~ EC-004 테스트 모두 PASS, 기존 테스트 회귀 없음

---

## Phase 6: User Story 4 — PHI 대상 필드 정의 (Priority: P2)

- **Goal**: DICOMMetadata 타입에 PHI 대상 필드(patientName, patientID, patientBirthDate)가 명시적으로 정의되어 phiGuard.js에서 마스킹할 수 있다.
- **Independent Test**: 반환 객체에 PHI 필드 3개가 빈 문자열 기본값으로 존재하는지 확인
- **추적**: FR-005, FR-4.1, HAZ-3.1, TC-1.2.6

- [x] **T014** 🔀 [US4] PHI 필드 기본값 검증 테스트 작성 (TC-1.2.6)
  - 파일: `viewer/tests/unit.test.js`
  - 작업 내용:
    - TC-1.2.6: 무인자 호출 시 patientName, patientID, patientBirthDate가 빈 문자열로 존재하는지 검증
    - PHI 필드에 임의 값을 override로 전달 시 정상 반영되는지도 확인 (빈 문자열이 아닌 값)
    - phiGuard.js의 PHI_FIELDS 배열과 필드명이 정확히 일치하는지 주석으로 명시
    - FR-4.1, HAZ-3.1 추적 정보를 테스트 설명에 포함
  - 완료 조건:
    - `it('TC-1.2.6: PHI 대상 필드 3개가 빈 문자열 기본값으로 존재한다', ...)` 테스트 PASS
    - PHI 필드 override 시에도 정상 동작 확인

- [x] **T015** 🔒 [US4] US4 관련 단위 테스트 통합 실행 및 검증
  - 파일: `viewer/tests/unit.test.js`
  - 완료 조건: TC-1.2.6 테스트 PASS, 기존 테스트 회귀 없음

---

## Phase 7: User Story 5 — 필수 DICOM 태그 기본값 제공 (Priority: P2)

- **Goal**: 필수 DICOM 태그(rows, columns, bitsAllocated, pixelRepresentation)에 안전한 기본값을 제공하여 파서 에러 판단 기준을 마련한다.
- **Independent Test**: 무인자 호출 시 필수 필드 기본값 검증 (TC-1.2.5와 연동)
- **추적**: FR-006, FR-1.3, HAZ-1.3

- [x] **T016** 🔀 [US5] 필수 태그 기본값이 metadataParser 검증 기준과 일치하는지 확인
  - 파일: `viewer/src/types/DICOMMetadata.js`, `viewer/src/data/dicomParser/constants.js`
  - 작업 내용:
    - constants.js의 METADATA_TAGS에서 required=true로 표시된 태그(rows, columns, bitsAllocated, pixelRepresentation) 확인
    - DICOMMetadata.js의 필수 필드 기본값이 metadataParser.js에서 PARSE_ERR_MISSING_REQUIRED_TAG 에러 발생 판단 기준과 일치하는지 검증
    - 불일치 시 DICOMMetadata.js 기본값을 metadataParser 기준에 맞게 조정
  - 완료 조건:
    - 필수 태그 4개의 기본값이 metadataParser.js 검증 로직과 일치함을 확인
    - TC-1.2.5 테스트가 여전히 PASS

---

## Phase 8: Integration & Finalization

- [x] **T-INT-01** 🔒 통합 테스트 실행 및 전체 검증
  - 파일: `viewer/tests/unit.test.js`
  - 작업 내용:
    - `npx vitest run` 전체 테스트 스위트 실행 (기존 + 신규 TC-1.2.1 ~ TC-1.2.6 + EC-001 ~ EC-004)
    - `npx vitest run --coverage`로 DICOMMetadata.js 커버리지 100% 달성 확인
    - metadataParser.js에서 createDICOMMetadata 호출 경로 정상 동작 재확인 (기존 통합 로직)
    - phiGuard.js maskPhiFields()가 DICOMMetadata 객체의 PHI 필드를 정상 마스킹하는지 확인 (연동 검증)
  - 완료 조건:
    - 전체 테스트 PASS (기존 + 신규)
    - DICOMMetadata.js 함수 커버리지 100%
    - metadataParser.js, phiGuard.js 연동 동작 정상

- [x] **T-INT-02** 🔒 최종 코드 리뷰 및 문서 정리
  - 파일: `viewer/src/types/DICOMMetadata.js`, `viewer/tests/unit.test.js`, `docs/spec-kit/03_tasks.md`
  - 작업 내용:
    - DICOMMetadata.js 최종 코드 리뷰: JSDoc 완전성, PHI 필드 주석, 방어 코드, 외부 의존성 0개 확인
    - unit.test.js 최종 리뷰: TC-1.2.1 ~ TC-1.2.6, EC-001 ~ EC-004 모두 포함 여부 확인
    - Definition of Done 체크리스트 항목별 검증
    - git commit 및 push
  - 완료 조건:
    - Definition of Done 항목 전체 확인 완료
    - 원격 브랜치 push 완료

---

## Dependencies & Execution Order

```
T001 (기존 분석) → T002 (테스트 환경 확인)
       ↓
T003 (typedef 보완) → T004 (팩토리 방어 코드)
       ↓
T005 (TC-1.2.1)  T006 (TC-1.2.5)  ← 🔀 병렬 가능
       ↓
T007 (US1 통합 검증)
       ↓
T008 (TC-1.2.2)  T009 (TC-1.2.3)  ← 🔀 병렬 가능
       ↓
T010 (US2 통합 검증)
       ↓
T011 (TC-1.2.4)  T012 (EC-001~004)  ← 🔀 병렬 가능
       ↓
T013 (US3 통합 검증)
       ↓
T014 (TC-1.2.6)
       ↓
T015 (US4 통합 검증)  T016 (US5 필수태그 검증)  ← 🔀 병렬 가능
       ↓
T-INT-01 (전체 통합 테스트) → T-INT-02 (최종 리뷰 & push)
```

## Estimated Effort

| Phase        | 태스크 수 | 예상 소요 시간 |
| ------------ | --------- | -------------- |
| Phase 1: Setup | 2 | 1.5시간 |
| Phase 2: Foundational | 2 | 2시간 |
| Phase 3: US1 (기본 객체 생성) | 3 | 2시간 |
| Phase 4: US2 (overrides) | 3 | 1.5시간 |
| Phase 5: US3 (참조 독립성) | 3 | 2시간 |
| Phase 6: US4 (PHI 필드) | 2 | 1시간 |
| Phase 7: US5 (필수 태그) | 1 | 1시간 |
| Phase 8: Integration | 2 | 2시간 |
| **합계** | **18** | **13시간** |

## 추적 매트릭스 (태스크 ↔ 요구사항 ↔ 테스트)

| 태스크 | 테스트 케이스 | 요구사항 | 위험요소 | 검증 내용 |
| ------ | ------------- | -------- | -------- | --------- |
| T005 | TC-1.2.1 | FR-001, FR-004, FR-2.3 | - | 무인자 호출 시 28개 속성 기본값 검증 |
| T006 | TC-1.2.5 | FR-006, FR-1.3 | HAZ-1.3 | 필수 필드 기본값 (rows=0, columns=0, bitsAllocated=16, pixelRepresentation=0) |
| T008 | TC-1.2.2 | FR-002, FR-2.3 | - | overrides 전달 시 지정값 반영 + 나머지 기본값 |
| T009 | TC-1.2.3 | FR-002, FR-2.3 | - | 배열 필드 override 정확성 |
| T011 | TC-1.2.4 | FR-003 | HAZ-5.1 | 참조 독립성 및 참조 오염 방지 |
| T012 | EC-001~004 | FR-002, FR-003, FR-007 | HAZ-5.1 | null/undefined 처리, 추가 속성, 배열 길이, 배열 참조 독립성 |
| T014 | TC-1.2.6 | FR-005, FR-4.1 | HAZ-3.1 | PHI 필드 3개 빈 문자열 기본값 존재 |
| T016 | TC-1.2.5 | FR-006, FR-1.3 | HAZ-1.3 | 필수 태그 기본값 ↔ metadataParser 검증 기준 일치 |
| T-INT-01 | TC-1.2.1~1.2.6, EC-001~004 | FR-001~007 | HAZ-1.3, HAZ-3.1, HAZ-5.1 | 전체 통합 테스트 + 커버리지 100% |

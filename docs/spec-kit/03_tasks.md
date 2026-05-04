# Tasks: maskPhiFields() PHI 마스킹 보안 가드 모듈

**Input**: `docs/spec-kit/01_spec.md`, `docs/spec-kit/02_plan.md`
**Ticket**: `PLAYG-1831` | **Date**: 2026-05-04

> **형식 안내**
> - `[ID]` : 태스크 번호 (T001, T002, ...)
> - `[P]` : 병렬 실행 가능 여부 표시 (🔀 병렬 가능 / 🔒 순서 필수)
> - `[Story]` : 관련 사용자 스토리 (US-1, US-2, ...)
> - 각 태스크는 **2시간 이내** 완료 가능한 단위로 분할

---

## Phase 1: Setup (공통 인프라)
<!-- 모든 다음 단계에 필요한 공통 상수·구조 선언 -->

- [x] **T001** 🔒 PHI 상수 및 phiStore WeakMap 선언
  - 파일: `viewer/src/data/dicomParser/phiGuard.js` (신규 생성)
  - 작업 내용:
    - `phiGuard.js` 파일 생성 (모듈 스켈레톤)
    - `PHI_FIELDS` 상수 선언: `const PHI_FIELDS = Object.freeze(['patientName', 'patientID', 'patientBirthDate'])` (TC-1, HIPAA Safe Harbor 최소 식별 정보 3종)
    - `PHI_MASK` 상수 선언: `const PHI_MASK = '[REDACTED]'` (TC-3, 마스킹 정책 단일 관리 지점)
    - `phiStore` WeakMap 선언: `const phiStore = new WeakMap()` (TC-2, 모듈 스코프 캡슐화, export 불가)
    - 각 상수에 JSDoc 주석 작성 (용도, 제약사항 명시)
  - 추적: TC-1, TC-2, TC-3, FR-4.1
  - 완료 조건: `phiGuard.js` 파일이 존재하고, `PHI_FIELDS`가 `Object.freeze`로 불변화된 배열(`['patientName', 'patientID', 'patientBirthDate']`)을 가리킴. `PHI_MASK`가 `'[REDACTED]'` 문자열임. `phiStore`가 `WeakMap` 인스턴스임. `import` 시 에러 없음.

---

## Phase 2: Foundational (선행 필수 핵심 함수)
<!-- CRITICAL: 사용자 스토리 구현 전 반드시 완료해야 할 코어 마스킹 로직 -->

- [x] **T002** 🔒 maskPhiFields(metadata) 코어 구현 — 입력 가드 및 PHI 순회 마스킹
  - 파일: `viewer/src/data/dicomParser/phiGuard.js`
  - 작업 내용:
    - `export function maskPhiFields(metadata)` 함수 구현
    - **Step 1 — null/undefined 가드**: `metadata`가 `null` 또는 `undefined`이면 해당 값을 그대로 반환 (NFR-4, TC-12.6)
    - **Step 2 — 비객체 가드**: `typeof metadata !== 'object'`이면 입력값을 그대로 반환 (NFR-4)
    - **Step 3 — PHI_FIELDS 순회**: `for (const field of PHI_FIELDS)` 루프
    - **Step 4 — 값 존재 확인**: `metadata[field]`가 truthy한 값인지 확인 (빈 문자열 `''`, `undefined`, `null` 제외, TC-12.5)
    - **Step 5 — 원본 보관 (upsert)**:
      ```javascript
      const stored = phiStore.get(metadata) || {};
      stored[field] = metadata[field];
      phiStore.set(metadata, stored);
      ```
    - **Step 6 — 마스킹 적용**: `metadata[field] = PHI_MASK`
    - **Step 7 — 반환**: 마스킹이 적용된 동일 참조 `metadata` 객체 반환 (mutate, 복사본 아님)
    - JSDoc: `@param {Object|null|undefined} metadata`, `@returns {Object|null|undefined}`
  - 추적: FR-4.1, NFR-4, HAZ-3.1, TC-12.1, TC-12.2, TC-12.5, TC-12.6
  - 완료 조건: `maskPhiFields({ patientName: '홍길동', patientID: 'P001', patientBirthDate: '19900101' })` 호출 후 세 필드가 모두 `'[REDACTED]'`로 치환됨. `maskPhiFields(null)` → `null` 반환 (예외 없음). `maskPhiFields(undefined)` → `undefined` 반환. `maskPhiFields(42)` → `42` 반환. 빈 문자열 필드는 마스킹되지 않고 그대로 유지. 반환값이 입력과 동일 참조임.

- [x] **T003** 🔒 getPhiValue(metadata, field) 구현 — 화이트리스트 기반 원본 조회
  - 파일: `viewer/src/data/dicomParser/phiGuard.js`
  - 작업 내용:
    - `export function getPhiValue(metadata, field)` 함수 구현
    - **Step 1 — 입력 검증**: `metadata`가 `null`/`undefined`이면 `undefined` 반환
    - **Step 2 — 화이트리스트 확인**: `PHI_FIELDS.includes(field)`가 `false`이면 `undefined` 반환 (SEC-3, TC-12.4)
    - **Step 3 — phiStore 조회**: `phiStore.get(metadata)`로 저장된 원본 값 맵 조회
    - **Step 4 — 마스킹 이력 확인**: 저장된 맵이 없으면 `undefined` 반환
    - **Step 5 — 필드 값 반환**: `stored[field]` 반환, 없으면 `undefined`
    - JSDoc: `@param {Object} metadata`, `@param {string} field`, `@returns {string|undefined}`
  - 추적: FR-4.5, SEC-3, TC-12.3, TC-12.4
  - 완료 조건: 마스킹된 객체에서 `getPhiValue(meta, 'patientName')` 호출 시 원본 값(예: `'홍길동'`) 반환. `getPhiValue(meta, 'rows')` 호출 시 `undefined` 반환 (비 PHI 필드 차단). 마스킹 이력 없는 객체에서 `getPhiValue(meta, 'patientName')` 호출 시 `undefined` 반환.

- [x] **T004** 🔒 dumpPhiValues(metadata) 구현 — @internal 전체 덤프
  - 파일: `viewer/src/data/dicomParser/phiGuard.js`
  - 작업 내용:
    - `function dumpPhiValues(metadata)` 함수 구현 (export 없음, 모듈 내부 전용)
    - **Step 1 — 입력 검증**: `metadata`가 `null`/`undefined`이면 빈 객체 `{}` 반환
    - **Step 2 — phiStore 조회**: `phiStore.get(metadata)`로 원본 값 맵 조회
    - **Step 3 — 복사 반환**: 저장된 맵이 있으면 `{ ...stored }` 얕은 복사하여 반환
    - **Step 4 — 이력 없음**: 저장된 맵이 없으면 빈 객체 `{}` 반환
    - JSDoc: `@internal`, `@param {Object} metadata`, `@returns {Object}`
  - 추적: TC-4, US-3
  - 완료 조건: 마스킹된 객체에서 `dumpPhiValues(meta)` 호출 시 `{ patientName: '홍길동', patientID: 'P001', patientBirthDate: '19900101' }` 형태의 얕은 복사 객체 반환. 마스킹 이력 없는 객체에서는 빈 객체 `{}` 반환. 반환된 객체를 수정해도 `phiStore` 내부 데이터는 불변임.

---

## Phase 3: User Story 1 — PHI 필드 자동 마스킹 단위 테스트 (Priority: P1) :dart: MVP

- **Goal**: `maskPhiFields()`가 DICOM 메타데이터의 PHI 필드 3종을 정확히 마스킹하고, null/undefined/비객체 입력에 대해 예외 없이 안전하게 처리하는지 검증
- **Independent Test**: 환자 정보가 포함된 메타데이터 객체를 `maskPhiFields()`에 전달 후, patientName/patientID/patientBirthDate 필드가 `[REDACTED]`로 치환되었는지 직접 검증

- [x] **T005** :lock: [US-1] TC-12.1 ~ TC-12.2: PHI 필드 마스킹 검증 테스트 작성
  - 파일: `viewer/tests/unit.test.js`
  - 작업 내용:
    - `describe('phiGuard - PHI 마스킹 보안 가드')` 블록 생성
    - **TC-12.1**: `test('patientName 마스킹')`
      - 입력: `{ patientName: '홍길동', patientID: 'P001', patientBirthDate: '19900101', rows: 512 }`
      - `maskPhiFields(metadata)` 호출
      - 기대: `metadata.patientName === '[REDACTED]'` (FR-4.1, HAZ-3.1)
    - **TC-12.2**: `test('patientID 마스킹')`
      - 동일 입력에서 `metadata.patientID === '[REDACTED]'` 확인 (FR-4.1)
      - `metadata.patientBirthDate === '[REDACTED]'` 도 함께 확인
      - 비 PHI 필드 `metadata.rows === 512` 가 변경되지 않았음을 확인
    - 테스트 파일 내 `import { maskPhiFields, getPhiValue } from '../src/data/dicomParser/phiGuard.js'` 구문 작성
  - 추적: FR-4.1, HAZ-3.1, TC-12.1, TC-12.2
  - 완료 조건: TC-12.1, TC-12.2 테스트 2개 PASS. `patientName`, `patientID`, `patientBirthDate`가 모두 `'[REDACTED]'`로 치환됨. 비 PHI 필드(`rows`)는 변경되지 않음.

- [x] **T006** :lock: [US-1] TC-12.5 ~ TC-12.6: 빈 문자열 및 null 안전성 테스트 작성
  - 파일: `viewer/tests/unit.test.js`
  - 작업 내용:
    - **TC-12.5**: `test('빈 문자열 마스킹 생략')`
      - 입력: `{ patientName: '', patientID: 'P002', patientBirthDate: '19850505' }`
      - `maskPhiFields(metadata)` 호출
      - 기대: `metadata.patientName === ''` 유지 (빈 문자열은 마스킹하지 않음)
      - 기대: `metadata.patientID === '[REDACTED]'`, `metadata.patientBirthDate === '[REDACTED]'`
    - **TC-12.6**: `test('null 객체 안전 처리')`
      - `maskPhiFields(null)` → `null` 반환, 예외 없음 (NFR-4)
      - `maskPhiFields(undefined)` → `undefined` 반환, 예외 없음 (NFR-4)
      - `maskPhiFields(42)` → `42` 반환, 예외 없음 (비객체 입력)
      - `maskPhiFields('string')` → `'string'` 반환
  - 추적: NFR-4, TC-12.5, TC-12.6
  - 완료 조건: TC-12.5, TC-12.6 테스트 2개 PASS. 빈 문자열 필드는 마스킹되지 않음. null/undefined/비객체 입력 시 예외 없이 동일 값 반환.

---

## Phase 4: User Story 2 — 마스킹된 원본 PHI 값 안전 조회 단위 테스트 (Priority: P1) :dart: MVP

- **Goal**: `getPhiValue()`가 PHI_FIELDS에 등록된 필드만 조회 가능하고, 비인가 필드 접근은 `undefined`를 반환하는지 검증
- **Independent Test**: 마스킹된 metadata 객체에서 `getPhiValue()`로 원본 값을 조회하고, 비 PHI 필드 조회 시 `undefined`가 반환되는지 검증

- [x] **T007** :lock: [US-2] TC-12.3 ~ TC-12.4: getPhiValue 화이트리스트 및 차단 테스트 작성
  - 파일: `viewer/tests/unit.test.js`
  - 작업 내용:
    - **TC-12.3**: `test('getPhiValue 원본 조회')`
      - `const meta = { patientName: '홍길동', patientID: 'P001', patientBirthDate: '19900101', rows: 512 }`
      - `maskPhiFields(meta)` 호출 후
      - `getPhiValue(meta, 'patientName')` → `'홍길동'` 반환 (FR-4.5)
      - `getPhiValue(meta, 'patientID')` → `'P001'` 반환
      - `getPhiValue(meta, 'patientBirthDate')` → `'19900101'` 반환
    - **TC-12.4**: `test('비 PHI 필드 조회 차단')`
      - 동일 마스킹된 `meta` 객체에서
      - `getPhiValue(meta, 'rows')` → `undefined` 반환 (SEC-3)
      - `getPhiValue(meta, 'columns')` → `undefined` 반환
      - `getPhiValue(meta, 'unknownField')` → `undefined` 반환
    - 마스킹 이력 없는 객체 테스트:
      - `const freshMeta = { patientName: '이몽룡' }` (마스킹 안함)
      - `getPhiValue(freshMet a, 'patientName')` → `undefined` 반환
  - 추적: FR-4.5, SEC-3, TC-12.3, TC-12.4
  - 완료 조건: TC-12.3, TC-12.4 테스트 2개 PASS. PHI_FIELDS 등록 필드만 원본 값 조회 가능. 비인가 필드는 모두 `undefined` 반환. 마스킹 이력 없는 객체에서도 `undefined` 반환.

---

## Phase 5: User Story 3 — PHI 원본 값 일괄 덤프 테스트 (Priority: P2)

- **Goal**: `dumpPhiValues()`가 마스킹된 메타데이터의 모든 원본 PHI 값을 일괄 반환하고, `@internal`로 프로덕션에 노출되지 않는지 검증
- **Independent Test**: `maskPhiFields()` 처리 후 `dumpPhiValues()`를 호출하여 원본 값이 모두 포함된 객체가 반환되는지 확인

- [x] **T008** :lock: [US-3] dumpPhiValues 동작 검증 테스트 작성
  - 파일: `viewer/tests/unit.test.js`
  - 작업 내용:
    - `dumpPhiValues`는 배럴 export에서 제외되므로 내부 경로로 직접 import
    - `import { dumpPhiValues } from '../src/data/dicomParser/phiGuard.js'` (테스트 전용 접근)
    - **테스트 1**: `test('dumpPhiValues - 마스킹된 객체에서 원본 일괄 반환')`
      - `const meta = { patientName: '홍길동', patientID: 'P001', patientBirthDate: '19900101' }`
      - `maskPhiFields(meta)` 호출 후
      - `dumpPhiValues(meta)` → `{ patientName: '홍길동', patientID: 'P001', patientBirthDate: '19900101' }` 반환
    - **테스트 2**: `test('dumpPhiValues - 마스킹 이력 없으면 빈 객체')`
      - `const freshMeta = { patientName: '이몽룡' }` (마스킹 안함)
      - `dumpPhiValues(freshMeta)` → `{}` 반환
    - **테스트 3**: `test('dumpPhiValues - null 입력 시 빈 객체')`
      - `dumpPhiValues(null)` → `{}` 반환
    - **테스트 4**: `test('dumpPhiValues - 반환값이 phiStore와 독립')`
      - 반환된 객체를 수정해도 동일 metadata에 대한 `getPhiValue()` 결과는 불변
  - 추적: TC-4, US-3
  - 완료 조건: dumpPhiValues 관련 테스트 4개 PASS. 마스킹된 객체에서 원본 3종 일괄 반환. 마스킹 이력 없으면 `{}`. null 입력 시 `{}`. 반환값 수정이 phiStore에 영향 없음.

---

## Phase 6: User Story 4 — 메모리 안전성 및 GC 연동 검증 (Priority: P1) :dart: MVP

- **Goal**: WeakMap 기반 `phiStore`를 사용하여 metadata 객체가 GC될 때 원본 PHI 값도 자동 해제됨을 간접적으로 확인
- **Independent Test**: 대량의 metadata 객체를 생성/마스킹 후 참조를 해제하고 GC 수행 시 메모리가 회수되는지 간접 확인

- [x] **T009** :lock: [US-4] WeakMap GC 연동 및 메모리 안전성 테스트 작성
  - 파일: `viewer/tests/unit.test.js`
  - 작업 내용:
    - **테스트 1**: `test('phiStore가 WeakMap 인스턴스인지 확인')`
      - 모듈 내부 구현이므로 간접 검증: 대량 객체 생성 후 GC 가능 여부 확인
    - **테스트 2**: `test('동일 metadata 객체에 중복 maskPhiFields 호출 시 원본 보존')`
      - `const meta = { patientName: '홍길동', patientID: 'P001', patientBirthDate: '19900101' }`
      - `maskPhiFields(meta)` 첫 번째 호출
      - `meta.patientName = '강감찬'` 수동 변경 후 `maskPhiFields(meta)` 두 번째 호출
      - `getPhiValue(meta, 'patientName')` → 최초 원본 `'홍길동'` 유지 (upsert 로직 검증)
      - 또는 덮어쓰기 동작이 spec에 맞는지 확인
    - **테스트 3**: `test('서로 다른 metadata 객체는 독립적인 phiStore 엔트리 가짐')`
      - 두 개의 다른 metadata 객체를 각각 마스킹
      - 각각의 `getPhiValue()`가 서로 다른 원본 값 반환
  - 추적: US-4, TC-2
  - 완료 조건: WeakMap 관련 테스트 3개 PASS. 중복 호출 시 원본 값 보존/갱신 동작이 spec에 부합. 서로 다른 객체 간 phiStore 독립성 확인.

---

## Phase 7: 배럴 Export 업데이트 및 통합 연동

- [x] **T010** :lock: index.js 배럴 export 업데이트
  - 파일: `viewer/src/data/dicomParser/index.js`
  - 작업 내용:
    - 기존 export 목록에 `maskPhiFields`와 `getPhiValue`를 named export로 추가
    - `dumpPhiValues`는 `@internal`이므로 export에서 제외 (TC-4)
    - `PHI_FIELDS`, `PHI_MASK`, `phiStore`는 모듈 내부 상수/변수이므로 export하지 않음
    - 기존 export 항목이 정상적으로 유지되는지 확인 (회귀 방지)
    - JSDoc 또는 주석으로 공개 API 목록 문서화
  - 추적: TC-4, US-3
  - 완료 조건: `import { maskPhiFields, getPhiValue } from './dicomParser/index.js'` 동작. `import { dumpPhiValues } from './dicomParser/index.js'` 시 `undefined` 또는 에러 (export되지 않음). 기존 export 항목 회귀 없음.

- [x] **T011** :lock: metadataParser.js Step 8에 maskPhiFields() 호출 연동
  - 파일: `viewer/src/data/dicomParser/metadataParser.js`
  - 작업 내용:
    - `import { maskPhiFields } from './phiGuard.js'` import 구문 추가
    - Step 8 위치(반환 객체 생성 직전)에 `metadata = maskPhiFields(metadata)` 호출 삽입
    - `maskPhiFields(metadata)` 반환값을 기존 `metadata` 변수에 재할당
    - null/undefined/비객체 가드는 `maskPhiFields` 내부에서 처리되므로 추가 가드 불필요
    - 기존 Step 1~7 및 Step 9 로직이 변경되지 않았는지 확인
    - 기존 `metadataParser.js` 단위 테스트가 여전히 PASS하는지 확인
  - 추적: FR-4.1, HAZ-3.1, SDS-3.9(Step 8)
  - 완료 조건: `metadataParser.js`의 Step 8에서 `maskPhiFields(metadata)`가 호출됨. 반환된 metadata의 patientName/patientID/patientBirthDate가 `'[REDACTED]'`로 마스킹됨. 기존 metadataParser 테스트 전체 PASS.

---

## Phase 8: Integration & Finalization

- [x] **T012** :lock: 전체 테스트 스위트 실행 및 회귀 검증
  - 파일: `viewer/tests/unit.test.js`
  - 작업 내용:
    - `npx vitest run` 으로 전체 단위 테스트 실행
    - TC-12.1 ~ TC-12.6 및 dumpPhiValues/GC 관련 테스트 전체 PASS 확인
    - 기존 `parseMetadata` 관련 테스트(PLAYG-1828) 회귀 없음 확인
    - 분기 커버리지 100% 목표 달성 확인 (phiGuard.js)
    - `maskPhiFields` → `getPhiValue` → `dumpPhiValues` 호출 체인 통합 시나리오 테스트 작성
  - 추적: SC-1, SC-2, SC-3 전체
  - 완료 조건: TC-12.1 ~ TC-12.6 전체 PASS. 기존 테스트 회귀 없음. phiGuard.js 분기 커버리지 100%.

- [x] **T013** :lock: JSDoc 주석 완비 및 코드 정리
  - 파일: `viewer/src/data/dicomParser/phiGuard.js`
  - 작업 내용:
    - `maskPhiFields`: `@param`, `@returns`, `@throws`(없음 명시), `@example` JSDoc 작성
    - `getPhiValue`: `@param`, `@returns`, 화이트리스트 정책 설명 JSDoc 작성
    - `dumpPhiValues`: `@internal` 태그, `@param`, `@returns` JSDoc 작성
    - `PHI_FIELDS`, `PHI_MASK`: 상수 용도 및 제약사항 JSDoc 작성
    - `phiStore`: WeakMap 사용 사유 주석 작성
    - 모듈 최상단에 파일 용도, IEC 62304 Class A 준수, 보안 등급 주석 작성
    - 디버그용 `console.log` 제거
    - TODO/FIXME 잔여 확인
  - 추적: TC-5 (IEC 62304 Class A)
  - 완료 조건: 모든 공개 함수에 JSDoc 주석 완비. `@internal` 태그 부여 확인. 불필요한 로깅/주석 제거. ESLint 경고 없음.

- [x] **T014** :lock: 문서 업데이트 및 git commit/push
  - 파일: `docs/spec-kit/03_tasks.md`, `docs/artifacts/SDS.md` (필요시)
  - 작업 내용:
    - `03_tasks.md` 체크리스트 항목 완료 표시 업데이트
    - `SDS.md`에 SDS-3.12 phiGuard 구현 상태 업데이트
    - git commit: `feat(PLAYG-1831): phiGuard.js PHI 마스킹 보안 가드 모듈 구현 및 테스트 완료`
    - 원격 브랜치 push: `feature/PLAYG-1831-phi-guard`
  - 추적: PLAYG-1831
  - 완료 조건: 원격 브랜치 push 완료. SDS.md 업데이트 반영.

---

- [ ] **T020** 🔒 문서 업데이트 및 git commit
  - 파일: `docs/spec-kit/03_tasks.md`, `docs/artifacts/SDS.md`
  - 작업 내용:
    - `03_tasks.md`의 체크리스트 항목 완료 표시 업데이트
    - SDS.md에 SDS-3.11 `findPixelDataTag()` 구현 상태 업데이트
    - git commit: `feat(PLAYG-1830): findPixelDataTag() 폴백 탐색 구현 및 테스트 완료`
    - 원격 브랜치 push: `feature/PLAYG-1830-find-pixel-data-tag`
  - 추적: PLAYG-1830
  - 완료 조건:
    - 원격 브랜치 push 완료
    - SDS.md 업데이트 반영
    - 체크리스트 완료 표시 업데이트

---## Dependencies & Execution Order

```
Phase 1 - Setup:         T001 (상수/phiStore 선언)
                              |
Phase 2 - Foundational:  T002 (maskPhiFields) → T003 (getPhiValue) → T004 (dumpPhiValues)
                              |
Phase 3 - US1 테스트:    T005 (TC-12.1~12.2) + T006 (TC-12.5~12.6)  [순차 권장]
Phase 4 - US2 테스트:    T007 (TC-12.3~12.4)                          [T005 후]
Phase 5 - US3 테스트:    T008 (dumpPhiValues)                         [T004 후]
Phase 6 - US4 테스트:    T009 (WeakMap/GC)                            [T003 후]
                              |
Phase 7 - 통합 연동:     T010 (index.js export) + T011 (metadataParser 연동)  [순차]
                              |
Phase 8 - Finalization:  T012 (전체 테스트) → T013 (JSDoc/정리) → T014 (commit/push)
```

**병렬 실행 가능 그룹** (Phase 2 완료 후):
- T005(US1 마스킹 테스트) + T006(US1 안전성 테스트): 같은 describe 블록 내에서 순차 권장하나 독립 작성 가능
- T007(US2 getPhiValue 테스트), T008(US3 dump 테스트), T009(US4 GC 테스트): 서로 독립적이므로 병렬 작성 가능
- T010(index.js)과 T011(metadataParser.js): 서로 다른 파일이므로 병렬 가능하나, T011은 T010 이후 권장

---

## Estimated Effort

| Phase                  | 태스크 수 | 예상 소요 시간 |
| ---------------------- | --------- | -------------- |
| Phase 1: Setup         | 1         | 0.5시간        |
| Phase 2: Foundational  | 3         | 2시간          |
| Phase 3: US1 테스트    | 2         | 1.5시간        |
| Phase 4: US2 테스트    | 1         | 1시간          |
| Phase 5: US3 테스트    | 1         | 1시간          |
| Phase 6: US4 테스트    | 1         | 1시간          |
| Phase 7: 통합 연동     | 2         | 1.5시간        |
| Phase 8: Finalization  | 3         | 1.5시간        |
| **합계**               | **14**    | **10시간**     |

---

## Traceability Matrix

| 태스크 | 관련 FR         | 관련 SEC  | 관련 HAZ  | 관련 NFR  | 관련 TC ID            |
| ------ | --------------- | --------- | --------- | --------- | --------------------- |
| T001   | FR-4.1          | -         | -         | -         | TC-1, TC-2, TC-3      |
| T002   | FR-4.1          | -         | HAZ-3.1   | NFR-4     | TC-12.1, TC-12.2, TC-12.5, TC-12.6 |
| T003   | FR-4.5          | SEC-3     | -         | -         | TC-12.3, TC-12.4      |
| T004   | -               | SEC-3     | -         | -         | TC-4                  |
| T005   | FR-4.1          | -         | HAZ-3.1   | -         | TC-12.1, TC-12.2      |
| T006   | -               | -         | -         | NFR-4     | TC-12.5, TC-12.6      |
| T007   | FR-4.5          | SEC-3     | -         | -         | TC-12.3, TC-12.4      |
| T008   | -               | SEC-3     | -         | -         | TC-4                  |
| T009   | -               | -         | -         | NFR-4     | TC-2                  |
| T010   | -               | SEC-3     | -         | -         | TC-4                  |
| T011   | FR-4.1          | -         | HAZ-3.1   | -         | -                     |
| T012   | FR-4.1, FR-4.5  | SEC-3     | HAZ-3.1   | NFR-4     | TC-12.1 ~ TC-12.6     |
| T013   | -               | -         | -         | -         | TC-5                  |
| T014   | -               | -         | -         | -         | -                     |

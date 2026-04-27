# Tasks: CBVError 에러 클래스 계층 구현

**Input**: `docs/spec-kit/01_spec.md`, `docs/spec-kit/02_plan.md`
**Ticket**: `PLAYG-1819` | **Date**: 2026-04-27

> **형식 안내**
> - `[ID]` : 태스크 번호 (T001, T002, ...)
> - `[P]` : 병렬 실행 가능 여부 표시 (🔀 병렬 가능 / 🔒 순서 필수)
> - `[Story]` : 관련 사용자 스토리 (US1, US2, ...)
> - 각 태스크는 **2시간 이내** 완료 가능한 단위로 분할

---

## Phase 1: Setup (공통 인프라)
<!-- 모든 다음 단계에 필요한 공통 환경 설정 -->

- [x] **T001** 🔒 프로젝트 디렉토리 구조 확인 및 테스트 환경 검증
  - 파일: `viewer/src/errors/`, `viewer/tests/unit/errors/`, `viewer/src/constants/constants.js`
  - 작업 내용:
    1. `viewer/src/errors/` 디렉토리 존재 확인, 없으면 생성
    2. `viewer/tests/unit/errors/` 디렉토리 존재 확인, 없으면 생성
    3. `viewer/src/constants/constants.js` 파일에서 ERROR_CODES 객체에 다음 코드가 정의되어 있는지 확인:
       - `PARSE_ERR_INVALID_MAGIC`, `PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX`, `PARSE_ERR_MISSING_REQUIRED_TAG`
       - `PARSE_ERR_PIXEL_DATA_EXTRACTION`, `PARSE_ERR_FILE_READ`, `PARSE_ERR_FILE_TOO_LARGE`, `PARSE_ERR_UNEXPECTED`
       - `VALIDATE_001`, `RENDER_001`, `SECURITY_001`, `MEMORY_001`
    4. `CBV_000` 코드가 정의되어 있지 않으면 ERROR_CODES에 추가
    5. Jest 테스트 환경이 viewer/ 프로젝트에 설정되어 있는지 확인 (`jest.config.js` 또는 `package.json` jest 섹션)
  - 완료 조건:
    - `viewer/src/errors/` 디렉토리가 존재함
    - `viewer/tests/unit/errors/` 디렉토리가 존재함
    - constants.js의 ERROR_CODES에 CBV_000 포함 12개 에러 코드가 모두 정의되어 있음
    - `npx jest --version` 명령이 정상 실행됨

- [x] **T002** 🔒 CBVError 기본 클래스 구현
  - 파일: `viewer/src/errors/CBVError.js`
  - 관련 명세: FR-ERR-01, US-11
  - 작업 내용:
    1. CBVError 클래스 정의 (Error 상속)
    2. 생성자 시그니처: `constructor(message, code = 'CBV_000', context = {})`
    3. `super(message)` 호출 후 `this.name = 'CBVError'` 설정
    4. `this.code = code`, `this.context = context` 속성 할당
    5. ES6 class extends를 사용하여 프로토타입 체인 자동 구성
    6. 명명된 export로 CBVError 공개
  - 완료 조건:
    - `new CBVError('test')` 생성 시 `error.message === 'test'`
    - `error.name === 'CBVError'`
    - `error.code === 'CBV_000'`
    - `error.context`가 빈 객체 `{}`임
    - `error instanceof Error === true`
    - `error instanceof CBVError === true`
---

## Phase 2: Foundational (선행 필수 항목)
<!-- ⚠️ CRITICAL: 사용자 스토리 구현 전 반드시 완료해야 할 핵심 인프라 -->

- [x] **T003** 🔒 ParseError 하위 클래스 구현
  - 파일: `viewer/src/errors/CBVError.js`
  - 관련 명세: FR-ERR-02, US-1, US-2, US-3, US-4, US-5, US-6, US-12
  - 작업 내용:
    1. CBVError를 상속하는 ParseError 클래스 정의
    2. 생성자 시그니처: `constructor(message, code = 'PARSE_ERR_UNEXPECTED', context = {})`
    3. `super(message, code, context)` 호출 후 `this.name = 'ParseError'` 설정
    4. 명명된 export에 ParseError 추가
    5. constants.js의 ERROR_CODES에서 파싱 에러 코드 7종 import 방식 검토
  - 완료 조건:
    - `new ParseError('test')` 생성 시 `error.name === 'ParseError'`
    - `error.code === 'PARSE_ERR_UNEXPECTED'` (기본값)
    - `error instanceof ParseError === true`
    - `error instanceof CBVError === true`
    - `error instanceof Error === true`
    - 7종 파싱 에러 코드로 생성 시 정상 동작함

- [x] **T004** 🔀 ValidationError, RenderError 하위 클래스 구현
  - 파일: `viewer/src/errors/CBVError.js`
  - 관련 명세: FR-ERR-03, FR-ERR-04, US-7, US-8
  - 작업 내용:
    1. ValidationError 클래스 구현:
       - CBVError 상속, `this.name = 'ValidationError'`
       - 기본 코드: `VALIDATE_001`
       - 생성자: `constructor(message, code = 'VALIDATE_001', context = {})`
    2. RenderError 클래스 구현:
       - CBVError 상속, `this.name = 'RenderError'`
       - 기본 코드: `RENDER_001`
       - 생성자: `constructor(message, code = 'RENDER_001', context = {})`
    3. 명명된 export에 ValidationError, RenderError 추가
  - 완료 조건:
    - `new ValidationError('test')` 생성 시 name/code/instanceof 확인
    - `new RenderError('test')` 생성 시 name/code/instanceof 확인
    - 두 클래스 모두 instanceof CBVError, instanceof Error === true

- [x] **T005** 🔀 SecurityError, MemoryError 하위 클래스 구현
  - 파일: `viewer/src/errors/CBVError.js`
  - 관련 명세: FR-ERR-05, FR-ERR-06, US-9, US-10
  - 작업 내용:
    1. SecurityError 클래스 구현:
       - CBVError 상속, `this.name = 'SecurityError'`
       - 기본 코드: `SECURITY_001`
       - 생성자: `constructor(message, code = 'SECURITY_001', context = {})`
       - context에 PHI 필드(patientName, patientId, birthDate) 포함 여부 검증 로직 추가
    2. MemoryError 클래스 구현:
       - CBVError 상속, `this.name = 'MemoryError'`
       - 기본 코드: `MEMORY_001`
       - 생성자: `constructor(message, code = 'MEMORY_001', context = {})`
    3. 명명된 export에 SecurityError, MemoryError 추가
    4. 모든 export가 단일 `export { ... }` 문으로 정리되어 있는지 확인
  - 완료 조건:
    - `new SecurityError('test')` 생성 시 name='SecurityError', code='SECURITY_001' 확인
    - `new MemoryError('test')` 생성 시 name='MemoryError', code='MEMORY_001' 확인
    - 두 클래스 모두 instanceof CBVError, instanceof Error === true
    - SecurityError에 PHI 필드 전달 시 해당 필드가 제거/차단됨
    - CBVError.js 파일이 100~150줄 내외로 완성됨
    - `export { CBVError, ParseError, ValidationError, RenderError, SecurityError, MemoryError }` 확인
---

## Phase 3: User Story 1-6 — ParseError 및 CBVError 기본 클래스 검증 (Priority: P1) 🎯 MVP

- **Goal**: CBVError 기본 클래스와 ParseError 하위 클래스가 모든 파싱 에러 코드(7종)에 대해 정상 동작하는지 단위 테스트로 검증한다.
- **Independent Test**: `npx jest viewer/tests/unit/errors/CBVError.test.js --testPathPattern='CBVError|ParseError'`

- [x] **T006** 🔒 [US-11, US-12] CBVError 기본 클래스 단위 테스트 작성
  - 파일: `viewer/tests/unit/errors/CBVError.test.js`
  - 관련 명세: FR-ERR-01, US-11, US-12
  - 테스트 항목 (Plan 테스트 ID 매핑):
    | 테스트 ID | 검증 내용 |
    |-----------|-----------|
    | T-01 | CBVError 기본 생성: message, name='CBVError', code='CBV_000', context={} 확인 |
    | T-02 | CBVError 커스텀 코드 전달: code='CUSTOM_001' 설정 확인 |
    | T-03 | CBVError instanceof 체인: error instanceof Error === true |
  - 완료 조건:
    - 3개 테스트 케이스가 모두 PASS
    - describe('CBVError') 그룹 내에 체계적으로 정리됨

- [x] **T007** 🔒 [US-1~US-6, US-12] ParseError 단위 테스트 작성
  - 파일: `viewer/tests/unit/errors/CBVError.test.js`
  - 관련 명세: FR-ERR-02, US-1~US-6, US-12
  - 테스트 항목 (Plan 테스트 ID 매핑):
    | 테스트 ID | 검증 내용 | 관련 US |
    |-----------|-----------|---------|
    | T-04 | ParseError 기본 생성: name='ParseError', code='PARSE_ERR_UNEXPECTED' | US-12 |
    | T-05 | PARSE_ERR_INVALID_MAGIC 에러 코드 설정 | US-1 |
    | T-06 | PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX 에러 코드 설정 | US-2 |
    | T-07 | PARSE_ERR_MISSING_REQUIRED_TAG 에러 코드 + context.tag 확인 | US-3 |
    | T-08 | PARSE_ERR_PIXEL_DATA_EXTRACTION 에러 코드 설정 | US-4 |
    | T-09 | PARSE_ERR_FILE_READ 에러 코드 설정 | US-6 |
    | T-10 | PARSE_ERR_FILE_TOO_LARGE 에러 코드 + context.fileSize 확인 | US-5 |
    | T-11 | PARSE_ERR_UNEXPECTED 에러 코드 + context.originalError 확인 | US-12 |
    | T-12 | ParseError instanceof 체인: ParseError, CBVError, Error 모두 true | 공통 |
  - 완료 조건:
    - 9개 테스트 케이스가 모두 PASS
    - describe('ParseError') 그룹 내에 체계적으로 정리됨
    - 각 에러 코드가 constants.js의 ERROR_CODES에 존재하는지 검증 포함
## Phase 4: User Story 7-10 — ValidationError, RenderError, SecurityError, MemoryError 검증 (Priority: P2)

- **Goal**: 4개 하위 클래스(ValidationError, RenderError, SecurityError, MemoryError)가 명세대로 동작하는지 단위 테스트로 검증한다.
- **Independent Test**: `npx jest viewer/tests/unit/errors/CBVError.test.js --testPathPattern='ValidationError|RenderError|SecurityError|MemoryError'`

- [x] **T008** 🔀 [US-7, US-8] ValidationError, RenderError 단위 테스트 작성
  - 파일: `viewer/tests/unit/errors/CBVError.test.js`
  - 관련 명세: FR-ERR-03, FR-ERR-04, US-7, US-8
  - 테스트 항목:
    | 테스트 ID | 검증 내용 | 관련 US |
    |-----------|-----------|---------|
    | T-13 | ValidationError 생성: name='ValidationError', code='VALIDATE_001' | US-7 |
    | T-14 | ValidationError instanceof: CBVError, Error 모두 true | US-7 |
    | T-15 | RenderError 생성: name='RenderError', code='RENDER_001' | US-8 |
    | T-16 | RenderError instanceof: CBVError, Error 모두 true | US-8 |
  - 완료 조건:
    - 4개 테스트 케이스가 모두 PASS
    - context에 검증/렌더링 관련 메타데이터 전달 시 정상 동작 확인

- [x] **T009** 🔀 [US-9, US-10] SecurityError, MemoryError 단위 테스트 작성
  - 파일: `viewer/tests/unit/errors/CBVError.test.js`
  - 관련 명세: FR-ERR-05, FR-ERR-06, US-9, US-10
  - 테스트 항목:
    | 테스트 ID | 검증 내용 | 관련 US |
    |-----------|-----------|---------|
    | T-17 | SecurityError 생성: name='SecurityError', code='SECURITY_001' | US-9 |
    | T-18 | SecurityError PHI 필터링: context에 PHI 필드 포함 시 제거/차단 확인 | US-9 |
    | T-19 | SecurityError instanceof: CBVError, Error 모두 true | US-9 |
    | T-20 | MemoryError 생성: name='MemoryError', code='MEMORY_001' | US-10 |
    | T-21 | MemoryError instanceof: CBVError, Error 모두 true | US-10 |
  - 완료 조건:
    - 5개 테스트 케이스가 모두 PASS
    - SecurityError에 PHI 필드(patientName, patientId, birthDate) 전달 시 필드 제거됨

- [x] **T010** 🔒 [US-9] 보안 검증 단위 테스트 작성 (PHI 미포함, 에러 코드 일치)
  - 파일: `viewer/tests/unit/errors/CBVError.test.js`
  - 관련 명세: NFR-ERR-02, NFR-ERR-03, US-9
  - 테스트 항목:
    | 테스트 ID | 검증 내용 | 관련 명세 |
    |-----------|-----------|-----------|
    | T-22 | 모든 에러 context에 환자명/ID/생년월일 미포함 확인 | NFR-ERR-02 |
    | T-23 | 각 클래스 기본 코드가 ERROR_CODES에 존재하는지 확인 | NFR-ERR-03 |
  - 작업 내용:
    1. CBVError, ParseError, ValidationError, RenderError, SecurityError, MemoryError 각각에 대해
       context에 PHI 키(patientName, patientId, birthDate)가 포함되지 않았음을 검증하는 테스트 작성
    2. 각 하위 클래스의 기본 에러 코드(CBV_000, PARSE_ERR_UNEXPECTED, VALIDATE_001, RENDER_001, SECURITY_001, MEMORY_001)가
       constants.js의 ERROR_CODES에 정의되어 있는지 검증
  - 완료 조건:
    - 2개 테스트 케이스가 모두 PASS
    - 총 23개 단위 테스트(T-01~T-23) 전체 PASS
    - `npx jest viewer/tests/unit/errors/CBVError.test.js --coverage` 실행 시 CBVError.js 100% 커버리지
---

## Phase 5: Integration & Finalization

- [x] **T-INT-01** 🔒 handleParseError.js 연동 및 ErrorResult 변환 검증
  - 파일: `viewer/src/errors/handleParseError.js`, `viewer/src/parsers/ParseResult.js`
  - 관련 명세: FR-ERR-07, SC-8, SC-9, SC-11
  - 작업 내용:
    1. handleParseError.js에서 CBVError 계열 에러를 ErrorResult로 정상 변환하는지 확인
       - ErrorResult 구조: `{userMessage, debugInfo, errorCode, severity}`
    2. ParseResult.js의 errors 배열에 에러가 정상 포함되는지 확인
    3. ErrorResult.userMessage에 내부 구조 정보(offset, tag, buffer)가 노출되지 않는지 검증
    4. parseDICOM.js 파이프라인에서 ParseError 발생 시 전체 흐름이 명세대로 동작하는지 통합 테스트 수행
  - 완료 조건:
    - CBVError 계열 에러가 handleParseError()를 통해 ErrorResult로 정상 변환됨
    - ParseResult.errors 배열에 에러가 정상 포함됨
    - ErrorResult.userMessage에 offset, tag, buffer 등 내부 식별자 미포함
    - 통합 테스트 전체 PASS

- [x] **T-INT-02** 🔒 정적 분석, 최종 검증 및 문서 정리
  - 파일: `viewer/src/errors/CBVError.js`, `viewer/tests/unit/errors/CBVError.test.js`
  - 관련 명세: SC-13, SC-14, SC-15, SC-16
  - 작업 내용:
    1. ESLint 정적 분석 실행: `npx eslint viewer/src/errors/CBVError.js`
    2. 전체 단위 테스트 재실행: `npx jest viewer/tests/unit/errors/CBVError.test.js --coverage`
    3. 요구사항 추적성 매트릭스 확인:
       - FR-ERR-01~06 이 SRS FR-xx 와 양방향 추적 가능한지 확인
       - 각 에러 클래스가 관련 Hazard(HAZ-xx)와 매핑되어 있는지 확인
    4. IEC 62304 Class A 준수 확인: 코드-테스트-명세 간 추적성 정합성 검토
    5. Git commit 및 push: `git add . && git commit -m 'feat(errors): CBVError 클래스 계층 구현 (PLAYG-1819)'`
  - 완료 조건:
    - ESLint 경고/에러 0건
    - 23개 단위 테스트 전체 PASS
    - CBVError.js 테스트 커버리지 100%
    - 요구사항 추적성 매트릭스 정합성 확인 완료
    - 원격 브랜치 push 완료

---

## Dependencies & Execution Order

```
T001 → T002
         ↓
      T003 → T004, T005 (🔀 별렬 가능)
                ↓
             T006, T007 (🔀 별렬 가능)
                ↓
             T008, T009 (🔀 별렬 가늩)
                ↓
             T010
                ↓
          T-INT-01 → T-INT-02
```

## Estimated Effort

| Phase        | 태스크 수 | 예상 소요 시간 |
| ------------ | --------- | -------------- |
| Phase 1: Setup | 2       | 1.5시간        |
| Phase 2: Foundational | 3 | 3.0시간        |
| Phase 3: ParseError 검증 (P1) | 2 | 2.5시간  |
| Phase 4: 나머지 클래스 검증 (P2) | 3 | 3.0시간 |
| Phase 5: Integration | 2     | 2.5시간        |
| **합계**     | **12**    | **12.5시간**   |

## 요구사항 추적성 매트릭스

| 태스크 | 관련 FR | 관련 HAZ | 관련 US | 테스트 ID |
| ------- | ------- | -------- | ------- | --------- |
| T001 | - | - | - | - |
| T002 | FR-ERR-01 | - | US-11 | T-01, T-02, T-03 |
| T003 | FR-ERR-02 | HAZ-1.1 | US-1~6, US-12 | T-04~T-12 |
| T004 | FR-ERR-03, FR-ERR-04 | HAZ-1.3 | US-7, US-8 | T-13~T-16 |
| T005 | FR-ERR-05, FR-ERR-06 | HAZ-3.1, HAZ-5.1 | US-9, US-10 | T-17~T-21 |
| T006 | FR-ERR-01 | - | US-11, US-12 | T-01~T-03 |
| T007 | FR-ERR-02 | HAZ-1.1 | US-1~6, US-12 | T-04~T-12 |
| T008 | FR-ERR-03, FR-ERR-04 | HAZ-1.3 | US-7, US-8 | T-13~T-16 |
| T009 | FR-ERR-05, FR-ERR-06 | HAZ-3.1, HAZ-5.1 | US-9, US-10 | T-17~T-21 |
| T010 | NFR-ERR-02, NFR-ERR-03 | HAZ-3.1 | US-9 | T-22, T-23 |
| T-INT-01 | FR-ERR-07 | - | 통합 | SC-8, SC-9, SC-11 |
| T-INT-02 | SC-13~SC-16 | - | - | 전체 |
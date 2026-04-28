# Tasks: createParseContext() 파싱컨텍스트 팩토리

**Input**: `docs/spec-kit/01_spec.md`, `docs/spec-kit/02_plan.md`
**Ticket**: `PLAYG-1823` | **Date**: 2026-04-28

> **형식 안내**
> - `[ID]` : 태스크 번호 (T001, T002, ...)
> - `[P]` : 병렬 실행 가능 여부 표시 (🔀 병렬 가능 / 🔒 순서 필수)
> - `[Story]` : 관련 사용자 스토리 (US1, US2, ...)
> - 각 태스크는 **2시간 이내** 완료 가능한 단위로 분할

---

## Phase 1: Setup (공통 인프라)
<!-- 모든 다음 단계에 필요한 공통 환경 설정 -->

- [ ] **T001** 🔒 브랜치 생성 및 개발 환경 확인
  - 파일: `viewer/src/data/dicomParser/ParseContext.js`, `viewer/vite.config.js`
  - 세부 내용:
    - `feature/PLAYG-1823-parse-context-factory` 브랜치 체크아웃
    - 기존 ParseContext.js 코드 분석 결과 확인 (Gap Analysis 완료 상태)
    - Vitest 3.x + jsdom 환경에서 ArrayBuffer/DataView API 동작 확인
    - dicomDictionary.js의 TRANSFER_SYNTAX 상수 구조(`IMPLICIT_VR_LE`, `BIG_ENDIAN`, `EXPLICIT_VR_LE`) 확인
  - 완료 조건: 브랜치 생성 완료, `npm install` 성공, 기존 테스트 전체 PASS

- [ ] **T002** 🔒 단위 테스트 파일 생성 및 테스트 스켈레톤 작성
  - 파일: `viewer/tests/unit/ParseContext.test.js`
  - 세부 내용:
    - `describe('createParseContext', ...)` 최상위 스위트 생성
    - 4개 하위 describe 블록 스켈레톤 생성: Suite A(전송 구문별 설정), Suite B(버퍼 읽기 메서드), Suite C(offset 제어 메서드), Suite D(에러 및 예외 처리)
    - 공통 헬퍼 함수 작성: `createBuffer(size, fillFn)`, `writeUint16LE(buf, offset, val)`, `writeUint32LE(buf, offset, val)` 등
    - `beforeEach`에서 테스트용 100바이트 ArrayBuffer 생성
  - 완료 조건: 테스트 파일 생성, `npx vitest run tests/unit/ParseContext.test.js` 실행 시 0 tests 등록 에러 없이 완료

---

## Phase 2: Foundational (선행 필수 항목)
<!-- CRITICAL: 사용자 스토리 구현 전 반드시 완료해야 할 핵심 인프라 -->

- [ ] **T003** 🔒 startOffset 검증 로직 추가 (EC-002)
  - 파일: `viewer/src/data/dicomParser/ParseContext.js`
  - 관련 요구사항: EC-002, FR-007
  - 세부 내용:
    - `createParseContext()` 함수 내부에서 startOffset 검증 추가
    - startOffset이 음수인 경우 0으로 보정
    - startOffset이 buffer.byteLength를 초과하는 경우 buffer.byteLength로 보정
    - 보정 발생 시 errors 배열에 `{ type: 'INVALID_START_OFFSET', requested: 원래값, corrected: 보정값 }` 객체 추가
    - `remaining()` 메서드에 `Math.max(0, this.buffer.byteLength - this.offset)` 적용하여 음수 반환 방지
  - 완료 조건: startOffset=999(버퍼 초과) 전달 시 remaining()이 0 반환, errors 배열에 경고 기록

- [ ] **T004** 🔒 버퍼 경계 보호 로직 추가 (NFR-002, EC-003)
  - 파일: `viewer/src/data/dicomParser/ParseContext.js`
  - 관련 요구사항: NFR-002, EC-003
  - 세부 내용:
    - 내부 헬퍼 함수 `_checkBounds(ctx, byteCount)` 추가: hasRemaining 체크 후 실패 시 errors 기록
    - `readUint16()`: 경계 초과 시 0 반환, errors에 `{ type: 'READ_OVERFLOW', offset, requested: 2, available }` 기록
    - `readUint32()`: 경계 초과 시 0 반환, 동일한 방식의 errors 기록
    - `readInt16()`: 경계 초과 시 0 반환, 동일한 방식의 errors 기록
    - `readString(length)`: 경계 초과 시 빈 문자열 반환, errors 기록
    - `readBytes(length)`: 경계 초과 시 빈 Uint8Array 반환, errors 기록
    - 모든 read 메서드에서 초과 시 offset 변경 없음 보장
  - 완료 조건: offset=끝에서 readUint16() 호출 시 애플리케이션 중단 없이 0 반환, errors 배열에 오류 기록

- [ ] **T005** 🔒 JSDoc 보완 및 경계 케이스 검증 (EC-004, EC-005)
  - 파일: `viewer/src/data/dicomParser/ParseContext.js`
  - 관련 요구사항: EC-004, EC-005, NFR-001
  - 세부 내용:
    - `@throws` 태그 추가: buffer가 null/undefined인 경우 TypeError 발생 명시
    - `@typedef` 블록 추가: ParseContext 반환 객체의 속성 및 메서드 타입 정보 문서화
    - readBytes(0) 자연 처리 확인: 빈 Uint8Array 반환, offset 변화 없음 검증
    - readString(0) 자연 처리 확인: 빈 문자열 반환, offset 변화 없음 검증
    - 빈 ArrayBuffer(byteLength=0) 처리 확인: 생성 허용, remaining()=0, hasRemaining(1)=false
    - 모든 read 메서드가 O(1) 시간 복잡도 유지 확인 (DataView 직접 접근 방식 확인)
  - 완료 조건: JSDoc에 @throws 태그 포함, readBytes(0)/readString(0)이 에러 없이 동작

---
## Phase 3: User Story 1 — 전송 구문 기반 ParseContext 객체 생성 (Priority: P1) 🎯 MVP

- **Goal**: 전송 구문(Transfer Syntax) UID에 따라 바이트 오더와 VR 모드가 자동 설정된 ParseContext 객체를 생성한다.
- **Independent Test**: 다양한 전송 구문 UID를 전달하여 isExplicitVR, isLittleEndian 속성이 올바른지 단위 테스트로 검증한다.

- [ ] **T006** 🔀 [US1] 전송 구문별 설정 테스트 작성 (FR-002~004, FR-019~020)
  - 파일: `viewer/tests/unit/ParseContext.test.js`
  - 관련 요구사항: FR-002, FR-003, FR-004, FR-019, FR-020
  - 세부 내용:
    - Suite A: `describe('전송 구문별 설정')` 내에 다음 테스트 케이스 작성:
    - Explicit VR LE (`1.2.840.10008.1.2.1`): isExplicitVR=true, isLittleEndian=true 검증
    - Implicit VR LE (`1.2.840.10008.1.2`): isExplicitVR=false, isLittleEndian=true 검증
    - Big Endian (`1.2.840.10008.1.2.2`): isExplicitVR=true, isLittleEndian=false 검증
    - null UID 기본값 폴백: EXPLICIT_VR_LE 기본값 검증
    - undefined UID 기본값 폴백: EXPLICIT_VR_LE 기본값 검증
    - 알 수 없는 UID (`9.9.9.9.9`): EXPLICIT_VR_LE 기본값 검증
    - 반환 객체 속성 검증: buffer, dataView, offset, transferSyntaxUID, errors 필드 존재 확인
  - 완료 조건: Suite A의 7개 테스트 케이스 전체 PASS

- [ ] **T007** 🔀 [US2] 버퍼 읽기 메서드 테스트 작성 (FR-011~015, FR-018)
  - 파일: `viewer/tests/unit/ParseContext.test.js`
  - 관련 요구사항: FR-011, FR-012, FR-013, FR-014, FR-015, FR-018
  - 세부 내용:
    - Suite B: `describe('버퍼 읽기 메서드')` 내에 다음 테스트 케이스 작성:
    - Little-Endian readUint16(): 올바른 값 반환 + offset +2 검증
    - Big-Endian readUint16(): 바이트 오더 반영 값 + offset +2 검증
    - readUint32(): 올바른 값 반환 + offset +4 검증
    - readInt16(음수): 음수 올바른 해석 + offset +2 검증
    - readString(4): 'ABCD' 반환 + offset +4 검증
    - readBytes(4): Uint8Array(4) 반환 + offset +4 검증
    - DataView 바이트 오더 인자 전달 검증 (LE/BE 전환 시 값 변화 확인)
  - 완료 조건: Suite B의 7개 테스트 케이스 전체 PASS

- [ ] **T008** 🔀 [US3] offset 제어 메서드 테스트 작성 (FR-010, FR-016, FR-017)
  - 파일: `viewer/tests/unit/ParseContext.test.js`
  - 관련 요구사항: FR-010, FR-016, FR-017
  - 세부 내용:
    - Suite C: `describe('offset 제어 메서드')` 내에 다음 테스트 케이스 작성:
    - startOffset=10에서 remaining(): buffer.length - 10 반환 검증
    - advance(20) 후 offset 확인: startOffset + 20 검증
    - hasRemaining(잔여량 이상): true 반환 검증
    - hasRemaining(잔여량 초과): false 반환 검증
    - advance 후 remaining() 감소 확인
  - 완료 조건: Suite C의 5개 테스트 케이스 전체 PASS

- [ ] **T009** 🔀 [US4] 에러 및 예외 처리 테스트 작성 (NFR-002, EC-001~005)
  - 파일: `viewer/tests/unit/ParseContext.test.js`
  - 관련 요구사항: NFR-002, EC-001, EC-002, EC-003, EC-004, EC-005
  - 세부 내용:
    - Suite D: `describe('에러 및 예외 처리')` 내에 다음 테스트 케이스 작성:
    - buffer null 시 TypeError 발생 검증
    - 버퍼 초과 readUint16: 0 반환, errors 배열에 READ_OVERFLOW 기록 검증
    - 버퍼 초과 readUint32: 0 반환, errors 배열에 READ_OVERFLOW 기록 검증
    - 버퍼 초과 readString: 빈 문자열 반환, errors 기록 검증
    - 버퍼 초과 readBytes: 빈 Uint8Array 반환, errors 기록 검증
    - 초과 읽기 시 offset 변화 없음 검증
    - 빈 ArrayBuffer(byteLength=0): remaining()=0, hasRemaining(1)=false 검증
    - readBytes(0): 빈 Uint8Array, offset 변화 없음 검증
    - readString(0): 빈 문자열, offset 변화 없음 검증
    - startOffset > buffer 길이: remaining()=0, errors에 INVALID_START_OFFSET 기록 검증
    - startOffset 음수: 0으로 보정, errors 기록 검증
  - 완료 조건: Suite D의 11개 테스트 케이스 전체 PASS

- [ ] **T010** 🔒 전체 단위 테스트 실행 및 커버리지 검증
  - 파일: `viewer/tests/unit/ParseContext.test.js`, `viewer/src/data/dicomParser/ParseContext.js`
  - 세부 내용:
    - `npx vitest run tests/unit/ParseContext.test.js` 전체 실행, 모든 테스트 PASS 확인
    - `npm run test:coverage` 실행 후 ParseContext.js 커버리지 90% 이상 달성 확인
    - 실패하는 테스트 케이스가 있으면 관련 구현 코드(T003~T005) 수정 후 재검증
    - 테스트 간 독립성 확인: 각 테스트가 다른 테스트의 side-effect에 영향받지 않는지 검증
  - 완료 조건: 총 30개 테스트 케이스 전체 PASS, ParseContext.js 커버리지 90% 이상

---

## Phase 4: Integration & Finalization

- [ ] **T011** 🔒 기존 파서 모듈과의 회귀 테스트 (metaGroupParser, metadataParser)
  - 파일: `viewer/src/data/dicomParser/metaGroupParser.js`, `viewer/src/data/dicomParser/metadataParser.js`
  - 관련 요구사항: NFR-003, 전체 FR
  - 세부 내용:
    - metaGroupParser.js에서 createParseContext() 호출 시 보강된 로직(경계 보호, startOffset 검증)이 정상 동작하는지 확인
    - metadataParser.js에서 createParseContext() 호출 시 동일하게 정상 동작하는지 확인
    - 기존 파서 테스트 스위트(존재 시) 전체 실행하여 회귀 없음 확인
    - errors 배열 기록 방식 변경으로 인해 호출처에서 errors 접근 시 문제 없는지 확인
    - 실제 DICOM 파일 샘플(Explicit VR LE, Implicit VR LE)로 end-to-end 파싱 동작 확인
  - 완료 조건: metaGroupParser, metadataParser 기존 동작에 영향 없음, 파싱 결과 동일

- [ ] **T012** 🔒 코드 품질 검사 및 문서 최종 검증
  - 파일: `viewer/src/data/dicomParser/ParseContext.js`, `viewer/tests/unit/ParseContext.test.js`
  - 세부 내용:
    - `npm run lint` 실행: ESLint 에러/경고 0건 확인
    - `npm run format` 실행: Prettier 포맷팅 적용
    - JSDoc 주석이 실제 동작과 일치하는지 최종 리뷰 (@throws, @typedef, @param, @returns)
    - 구현된 코드가 02_plan.md의 Key Technical Decisions 4가지와 일치하는지 확인
    - 복잡도 추적 항목(CT-001~003)이 적절히 처리되었는지 확인
  - 완료 조건: lint 에러 0건, format 통과, JSDoc 정합성 확인

- [ ] **T013** 🔒 git commit 및 push
  - 파일: 변경된 모든 파일
  - 세부 내용:
    - `git add` 후 커밋 메시지 작성: `[PLAYG-1823] createParseContext() 버퍼 경계 보호 및 startOffset 검증 로직 추가`
    - 원격 브랜치 `feature/PLAYG-1823-parse-context-factory`에 push
    - PR 생성 시 변경사항 요약 포함
  - 완료 조건: 원격 브랜치 push 완료

---

## Dependencies & Execution Order

```
T001 → T002
  ↓
T003 → T004 → T005  (🔒 순차: 인프라 보완)
           ↓
  T006, T007, T008, T009  (🔀 병렬: 독립 테스트 스위트)
           ↓
        T010  (🔒 전체 테스트 검증)
           ↓
  T011 → T012 → T013  (🔒 순차: 통합 및 마무리)
```

## Estimated Effort

| Phase        | 태스크 수 | 예상 소요 시간 |
| ------------ | --------- | -------------- |
| Setup        | 2         | 1.5시간        |
| Foundational | 3         | 3.0시간        |
| User Stories | 5         | 4.0시간        |
| Integration  | 3         | 2.0시간        |
| **합계**     | **13**    | **10.5시간**   |

## 요구사항-태스크 추적 매트릭스

| 요구사항  | 태스크        | 설명                               |
| --------- | ------------- | ---------------------------------- |
| FR-002    | T006          | Explicit VR LE 설정 검증           |
| FR-003    | T006          | Big Endian 설정 검증               |
| FR-004    | T006          | Implicit VR LE 설정 검증           |
| FR-005~09 | T006          | 반환 객체 속성 검증                |
| FR-010    | T003, T008    | remaining() 로직 보완 및 테스트    |
| FR-011~13 | T007          | readUint16/32, readInt16 테스트    |
| FR-014~15 | T007          | readString, readBytes 테스트       |
| FR-016    | T008          | advance() 테스트                   |
| FR-017    | T008          | hasRemaining() 테스트              |
| FR-018    | T007          | DataView 바이트 오더 인자 검증     |
| FR-019~20 | T006          | null/undefined/알수없는 UID 폴백   |
| NFR-001   | T005          | O(1) 시간 복잡도 확인              |
| NFR-002   | T004, T009    | 버퍼 경계 보호 및 테스트           |
| NFR-003   | T011          | 독립성 및 회귀 테스트              |
| EC-001    | T006, T009    | 알 수 없는 UID 처리                |
| EC-002    | T003, T009    | startOffset 초과 검증              |
| EC-003    | T004, T009    | offset 초과 읽기 안전 처리         |
| EC-004    | T005, T009    | readBytes(0)/readString(0) 처리     |
| EC-005    | T005, T009    | 빈 ArrayBuffer 처리                |

## Definition of Done 체크리스트

- [ ] 모든 FR-001 ~ FR-020 요구사항 구현 완료 (T003~T005)
- [ ] 단위 테스트 커버리지 90% 이상 (T010)
- [ ] Edge Case(EC-001 ~ EC-005) 시나리오 검증 완료 (T009)
- [ ] 코드 리뷰 승인 (T012)
- [ ] metaGroupParser.js, metadataParser.js와의 연동 테스트 통과 (T011)
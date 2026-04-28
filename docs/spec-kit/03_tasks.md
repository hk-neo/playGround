# Tasks: DentiView3D - validateTransferSyntax() 전송구문검증

**Input**: `docs/spec-kit/01_spec.md`, `docs/spec-kit/02_plan.md`
**Ticket**: `PLAYG-1822` | **Date**: 2026-04-28

> **형식 안내**
> - `[ID]` : 태스크 번호 (T001, T002, ...)
> - `[P]` : 병렬 실행 가능 여부 표시 (🔀 병렬 가능 / 🔒 순서 필수)
> - `[Story]` : 관련 사용자 스토리 (US1, US2, ...)
> - 각 태스크는 **2시간 이내** 완료 가능한 단위로 분할

---

## Phase 1: Setup (공통 인프라)
<!-- 모든 다음 단계에 필요한 공통 환경 설정 -->

- [ ] **T001** 🔒 기존 상수 및 에러 코드 정의 확인
  - 파일: `viewer/src/data/dicomDictionary.js`, `viewer/src/data/dicomParser/constants.js`
  - 세부 내용:
    - `dicomDictionary.js`에서 `TRANSFER_SYNTAX` 상수가 3종 UID를 올바르게 정의하는지 확인
      - `EXPLICIT_VR_LE = '1.2.840.10008.1.2.1'`
      - `IMPLICIT_VR_LE = '1.2.840.10008.1.2'`
      - `BIG_ENDIAN = '1.2.840.10008.1.2.2'`
    - `SUPPORTED_TRANSFER_SYNTAXES` Set이 상기 3종 UID를 포함하는지 확인
    - `constants.js`에서 `ERROR_CODES.PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX` 에러 코드가 정의되어 있는지 확인
    - 누락된 항목이 있으면 즉시 보완
  - 완료 조건:
    - `dicomDictionary.js`에 3종 TRANSFER_SYNTAX 상수 및 SUPPORTED_TRANSFER_SYNTAXES Set이 정의됨
    - `constants.js`에 PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX 에러 코드가 존재함
    - `node -e` 명령으로 각 상수 값을 콘솔 출력하여 값 일치 확인

- [ ] **T002** 🔒 ParseContext 타입 정의 및 handleParseError 유틸리티 확인
  - 파일: `viewer/src/data/dicomParser/parseContext.js`, `viewer/src/data/dicomParser/handleParseError.js`
  - 세부 내용:
    - ParseContext 객체 구조가 `vrMode` (Explicit|Implicit|null) 및 `byteOrder` (LittleEndian|BigEndian|null) 속성을 갖는지 확인
    - `handleParseError(errorCode, parseResult)` 유틸리티 함수가 존재하고 정상 동작하는지 확인
    - 누락 시 최소 구현체를 작성 (객체 팩토리 함수, 에러 로깅 래퍼)
    - 기존 `createParseResult()` 함수와의 호환성 확인
  - 완료 조건:
    - ParseContext 생성 시 `{ vrMode: null, byteOrder: null }` 초기 상태 확인
    - handleParseError 호출 시 ParseResult.errors 배열에 에러 코드가 추가됨
    - 기존 단위 테스트가 모두 PASS 상태 유지

---
## Phase 2: Foundational (선행 필수 항목)
<!-- CRITICAL: 사용자 스토리 구현 전 반드시 완료해야 할 핵심 인프라 -->

- [ ] **T003** 🔒 validateTransferSyntax() 함수 골격 구현
  - 파일: `viewer/src/data/dicomParser/validateTransferSyntax.js`
  - 세부 내용:
    - 함수 시그니처: `export function validateTransferSyntax(transferSyntaxUID, parseContext)`
    - `dicomDictionary.js`에서 `TRANSFER_SYNTAX`, `SUPPORTED_TRANSFER_SYNTAXES` 임포트
    - `constants.js`에서 `ERROR_CODES` 임포트
    - `handleParseError.js`에서 `handleParseError` 임포트
    - 입력 방어 로직 구현: `transferSyntaxUID`이 null, undefined, 빈 문자열인 경우 handleParseError 호출 후 false 반환
    - 본체 로직: `SUPPORTED_TRANSFER_SYNTAXES.has(transferSyntaxUID)` 검사 후 true/false 반환
    - configureParseContext 내부 헬퍼 구현 (아래 T004에서 세부 구현)
  - 추적: FR-1.2.1, FR-1.2.2, NFR-001 (IEC 62304 Class A 안전 등급)
  - 완료 조건:
    - 함수가 존재하고 export 됨
    - null, undefined, 빈 문자열 입력 시 false 반환 (예외 발생 없음)
    - 지원 UID 입력 시 true 반환 (ParseContext 설정은 T004에서 검증)

- [ ] **T004** 🔒 configureParseContext() 헬퍼 함수 구현
  - 파일: `viewer/src/data/dicomParser/validateTransferSyntax.js` (T003 파일 내부)
  - 세부 내용:
    - `configureParseContext(parseContext, transferSyntaxUID)` 내부 함수 구현
    - switch 문으로 3종 UID에 따라 ParseContext 설정:
      - `TRANSFER_SYNTAX.EXPLICIT_VR_LE` -> `vrMode='Explicit'`, `byteOrder='LittleEndian'`
      - `TRANSFER_SYNTAX.BIG_ENDIAN` -> `vrMode='Explicit'`, `byteOrder='BigEndian'`
      - `TRANSFER_SYNTAX.IMPLICIT_VR_LE` -> `vrMode='Implicit'`, `byteOrder='LittleEndian'`
    - validateTransferSyntax() 내부에서 지원 UID 감지 시 configureParseContext() 호출하도록 연결
  - 추적: FR-1.2.3
  - 완료 조건:
    - 각 UID별로 ParseContext의 vrMode, byteOrder가 정확히 설정됨
    - 지원하지 않는 UID가 들어올 경우 ParseContext는 변경되지 않음
    - 함수 전체 순환 복잡도(CC) 7 이하 유지

- [ ] **T005** 🔒 미지원 UID 에러 처리 로직 구현
  - 파일: `viewer/src/data/dicomParser/validateTransferSyntax.js` (T003 파일 내부)
  - 세부 내용:
    - 지원하지 않는 UID 입력 시 `handleParseError(PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX, parseResult)` 호출
    - null/undefined/빈 문자열 입력 시 동일한 에러 처리 경로 사용
    - 모든 에러 경로에서 예외(throw) 없이 false 반환 보장
    - 함수 반환값이 항상 boolean 타입임을 보장 (IEC 62304 Class A)
  - 추적: FR-1.2.2, FR-1.2.4, NFR-001
  - 완료 조건:
    - 미지원 UID, null, undefined, 빈 문자열 입력 시 모두 false 반환
    - 모든 false 경로에서 handleParseError가 호출됨
    - 어떤 입력에 대해서도 예외(throw)가 발생하지 않음

---
## Phase 3: User Story 1 — 정상 전송 구문 검증 (Priority: P1) TARGET MVP

- **Goal**: DICOM 파일 메타 정보에서 추출한 전송 구문 UID가 시스템에서 지원하는 3종 비압축 인코딩 방식 중 하나인 경우 true를 반환하고 ParseContext에 VR 모드 및 바이트 오더를 설정한다.
- **Independent Test**: SUPPORTED_TRANSFER_SYNTAXES Set의 각 UID를 직접 전달하여 true 반환 및 ParseContext 설정 값을 확인한다.
- **추적**: US-1 (Spec 01_spec.md), FR-1.2.1, FR-1.2.3

- [ ] **T006** 🔀 [US1] Explicit VR Little Endian 검증 경로 확인
  - 파일: `viewer/src/data/dicomParser/validateTransferSyntax.js`
  - 세부 내용:
    - 입력: `'1.2.840.10008.1.2.1'` (TRANSFER_SYNTAX.EXPLICIT_VR_LE)
    - 기대 결과: true 반환, `parseContext.vrMode === 'Explicit'`, `parseContext.byteOrder === 'LittleEndian'`
    - 수동 검증: `node -e` 로 함수 직접 호출하여 반환값 및 ParseContext 상태 확인
  - 완료 조건:
    - 함수 호출 결과가 true임을 수동으로 확인
    - ParseContext의 vrMode가 'Explicit', byteOrder가 'LittleEndian'으로 설정됨

- [ ] **T007** 🔀 [US1] Explicit VR Big Endian 및 Implicit VR Little Endian 검증 경로 확인
  - 파일: `viewer/src/data/dicomParser/validateTransferSyntax.js`
  - 세부 내용:
    - 입력 1: `'1.2.840.10008.1.2.2'` (TRANSFER_SYNTAX.BIG_ENDIAN)
      - 기대: true 반환, vrMode='Explicit', byteOrder='BigEndian'
    - 입력 2: `'1.2.840.10008.1.2'` (TRANSFER_SYNTAX.IMPLICIT_VR_LE)
      - 기대: true 반환, vrMode='Implicit', byteOrder='LittleEndian'
    - 수동 검증으로 각 경로 확인
  - 완료 조건:
    - 3종 UID 모두 true 반환 및 올바른 ParseContext 설정 완료
    - 기존 기능에 영향 없음 (기존 테스트 PASS 유지)

- [ ] **T008** 🔒 [US1] US1 단위 테스트 작성 (TC-3.3.1, TC-3.3.2, TC-3.3.3)
  - 파일: `viewer/tests/unit.test.js`
  - 세부 내용:
    - TC-3.3.1: Explicit VR LE (`'1.2.840.10008.1.2.1'`) -> true, vrMode=Explicit, byteOrder=LittleEndian
    - TC-3.3.2: Explicit VR BE (`'1.2.840.10008.1.2.2'`) -> true, vrMode=Explicit, byteOrder=BigEndian
    - TC-3.3.3: Implicit VR LE (`'1.2.840.10008.1.2'`) -> true, vrMode=Implicit, byteOrder=LittleEndian
    - 각 테스트에서 ParseContext mock 객체를 생성하여 검증
    - describe 블록: `'validateTransferSyntax - 정상 전송 구문 검증'`
  - 완료 조건:
    - TC-3.3.1, TC-3.3.2, TC-3.3.3 모두 PASS
    - 테스트 커버리지 대상 함수 내 정상 경로 100% 커버

---
## Phase 4: User Story 2 — 미지원 전송 구문 거부 (Priority: P1)

- **Goal**: 시스템에서 지원하지 않는 전송 구문 UID(압축 인코딩, 존재하지 않는 UID)가 입력되면 PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX 에러를 발생시키고 false를 반환한다.
- **Independent Test**: 지원하지 않는 UID(예: JPEG Lossless 1.2.840.10008.1.2.4.70)와 임의의 존재하지 않는 UID를 전달하여 false 반환 및 에러 코드 발생을 확인한다.
- **추적**: US-2 (Spec 01_spec.md), FR-1.2.4

- [ ] **T009** 🔀 [US2] 미지원 UID 입력 시 false 반환 및 에러 핸들러 호출 검증
  - 파일: `viewer/src/data/dicomParser/validateTransferSyntax.js`
  - 세부 내용:
    - 입력 1: `'1.2.840.10008.1.2.4.70'` (JPEG Lossless 압축 전송 구문)
    - 입력 2: `'1.2.3.4.5'` (임의의 존재하지 않는 UID)
    - 기대 결과: 모두 false 반환, handleParseError(PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX) 호출
    - 수동 검증으로 false 반환 및 에러 핸들러 동작 확인
  - 완료 조건:
    - 미지원 UID 입력 시 false 반환 확인
    - handleParseError가 PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX 코드로 호출됨
    - 예외(throw) 발생 없이 boolean 반환 보장

- [ ] **T010** 🔒 [US2] US2 단위 테스트 작성 (TC-3.3.4, TC-3.3.7)
  - 파일: `viewer/tests/unit.test.js`
  - 세부 내용:
    - TC-3.3.4: 압축 전송 구문 (`'1.2.840.10008.1.2.4.70'`) -> false, 에러 핸들러 호출 확인
    - TC-3.3.7: 존재하지 않는 UID (`'1.2.3.4.5'`) -> false, 에러 핸들러 호출 확인
    - handleParseError 호출 여부는 mock 함수(vi.fn())를 사용하여 검증
    - describe 블록: `'validateTransferSyntax - 미지원 전송 구문 거부'`
  - 완료 조건:
    - TC-3.3.4, TC-3.3.7 모두 PASS
    - mock 에러 핸들러가 각 테스트에서 1회씩 호출됨을 검증

---
## Phase 5: User Story 3 — null/빈값 입력 방어 (Priority: P1)

- **Goal**: 전송 구문 UID가 null, undefined, 빈 문자열인 경우 PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX 에러를 발생시키고 false를 반환하여 안전 등급 Class A 요구사항을 충족한다.
- **Independent Test**: null, undefined, 빈 문자열을 각각 전달하여 false 반환 및 에러 처리를 확인한다.
- **추적**: US-3 (Spec 01_spec.md), FR-1.2.2, NFR-001 (IEC 62304 Class A)

- [ ] **T011** 🔀 [US3] null/undefined/빈값 입력 방어 로직 검증
  - 파일: `viewer/src/data/dicomParser/validateTransferSyntax.js`
  - 세부 내용:
    - 입력 1: `null` -> false 반환, handleParseError 호출
    - 입력 2: `undefined` -> false 반환, handleParseError 호출
    - 입력 3: `''` (빈 문자열) -> false 반환, handleParseError 호출
    - 모든 입력에 대해 예외(throw) 발생 없이 명시적 boolean 반환 보장
    - 수동 검증으로 각 입력별 동작 확인
  - 완료 조건:
    - null, undefined, 빈 문자열 모두 false 반환
    - 각 케이스에서 handleParseError가 호출됨
    - ParseContext가 변경되지 않고 초기 상태 유지

- [ ] **T012** 🔒 [US3] US3 단위 테스트 작성 (TC-3.3.5, TC-3.3.6, Edge Cases)
  - 파일: `viewer/tests/unit.test.js`
  - 세부 내용:
    - TC-3.3.5: null 입력 -> false, 에러 핸들러 호출
    - TC-3.3.6: 빈 문자열 입력 -> false, 에러 핸들러 호출
    - Edge Case EC-001: 선행/후행 공백 포함 UID (`' 1.2.840.10008.1.2.1 '`) -> false (정확 일치 원칙)
    - Edge Case EC-002: undefined 입력 -> false, 에러 핸들러 호출
    - handleParseError 호출 여부는 mock(vi.fn())으로 검증
    - describe 블록: `'validateTransferSyntax - null/빈값 입력 방어'`
  - 완료 조건:
    - TC-3.3.5, TC-3.3.6 및 Edge Case 테스트 모두 PASS
    - 모든 비정상 입력 경로에서 예외 발생 없이 false 반환 검증

---
## Phase 6: Integration & Finalization

- [ ] **T013** 🔒 전체 단위 테스트 실행 및 커버리지 검증
  - 파일: `viewer/tests/unit.test.js`
  - 세부 내용:
    - `cd viewer && npm test` 실행하여 TC-3.3.1 ~ TC-3.3.7 전체 통과 확인
    - `cd viewer && npm run test:coverage` 실행하여 커버리지 100% 확인 (validateTransferSyntax.js)
    - 기존 테스트가 새로운 코드에 의해 깨지지 않았는지 확인
    - ESLint 오류 0건 확인: `cd viewer && npm run lint`
  - 완료 조건:
    - TC-3.3.1 ~ TC-3.3.7 전부 PASS
    - validateTransferSyntax.js 코드 커버리지 100%
    - ESLint 오류 0건
    - 기존 테스트 회귀 없음

- [ ] **T014** 🔒 DicomParser 파이프라인 통합 호출 지점 확인
  - 파일: `viewer/src/data/dicomParser/parseDICOM.js`
  - 세부 내용:
    - `parseDICOM()` 함수 내 호출 순서 확인:
      1. validateMagicByte() 통과 후
      2. parseMetaGroup()으로 transferSyntaxUID 추출 후
      3. **validateTransferSyntax(transferSyntaxUID, parseContext) 호출**
      4. true 시 parseMetadata() 진행, false 시 에러와 함께 조기 반환
    - validateTransferSyntax()가 false를 반환하면 ParseResult에 에러가 포함된 채 즉시 반환되는지 확인
    - 본 태스크는 호출 지점 확인 및 인터페이스 계약 검증이며,
      parseDICOM.js의 실제 수정은 COMP-1(DicomParser) 티켓에서 수행
  - 추적: FR-1.2.5
  - 완료 조건:
    - parseDICOM.js 내 호출 순서가 FR-1.2.5 명세와 일치함
    - validateTransferSyntax false 반환 시 후속 파싱이 중단됨을 확인

- [ ] **T015** 🔒 문서 정리 및 추적성 매트릭스 업데이트
  - 파일: `docs/spec-kit/03_tasks.md`, 관련 산출물
  - 세부 내용:
    - IEC 62304 Class A 단위 테스트 증거 정리 (테스트 결과 스크린샷 또는 로그)
    - SRS FR-1.2, SAD COMP-2 추적성 매트릭스 업데이트
    - Definition of Done 체크리스트 최종 확인:
      - [x] FR-1.2.1~FR-1.2.5 모든 기능 요구사항 구현 완료
      - [x] 단위 테스트 TC-3.3.1~TC-3.3.7 전부 통과
      - [x] Edge Case 시나리오(EC-001~EC-003) 검증 완료
      - [x] 코드 커버리지 100% 달성
      - [x] ESLint 오류 0건
      - [x] IEC 62304 Class A 단위 테스트 증거 문서화 완료
    - git commit 및 push
  - 완료 조건:
    - 추적성 매트릭스에 본 구현 내용이 반영됨
    - DoD 체크리스트 전체 완료 표시
    - 원격 브랜치 push 완료

---
## Dependencies & Execution Order

```
T001 (상수/에러코드 확인) → T002 (ParseContext/handleParseError 확인)
                              ↓
              T003 (함수 골격) → T004 (configureParseContext) → T005 (에러 처리)
                                                            ↓
                +-------------+-------------+-------------+
                |             |             |             |
               T006         T007          T009          T011   (병렬 가능: US별 검증)
                |             |             |             |
                +------+------+             +------+------+
                       |                            |
                      T008                         T010    (US별 단위 테스트)
                                                    |
                                                   T012     (US3 테스트 + Edge Cases)
                                                    |
                                            T013 (전체 테스트/커버리지)
                                                    |
                                            T014 (파이프라인 통합 확인)
                                                    |
                                            T015 (문서 정리/DoD)
```

**병렬 실행 가능 그룹:**
- 그룹 A: T006, T007, T009, T011 (US별 수동 검증, 서로 독립)
- 그룹 B: T008, T010, T012 (US별 단위 테스트, 선행 검증 태스크 완료 후)

---

## Estimated Effort

| Phase                | 태스크 수 | 예상 소요 시간 |
| -------------------- | --------- | -------------- |
| Setup                | 2         | 1.0h           |
| Foundational         | 3         | 1.5h           |
| US1 (정상 검증)      | 3         | 1.5h           |
| US2 (미지원 거부)    | 2         | 0.5h           |
| US3 (null/빈값 방어) | 2         | 0.5h           |
| Integration          | 3         | 1.0h           |
| **합계**             | **15**    | **6.0h**       |

---

## Traceability Matrix (추적성 매트릭스)

| 태스크 | 기능 요구사항       | 사용자 스토리 | 테스트 케이스              |
| ------ | ------------------- | ------------- | -------------------------- |
| T001   | FR-1.2.1            | -             | -                          |
| T002   | FR-1.2.3            | -             | -                          |
| T003   | FR-1.2.1, FR-1.2.2  | -             | -                          |
| T004   | FR-1.2.3            | -             | -                          |
| T005   | FR-1.2.2, FR-1.2.4  | -             | -                          |
| T006   | FR-1.2.1, FR-1.2.3  | US-1          | TC-3.3.1                   |
| T007   | FR-1.2.1, FR-1.2.3  | US-1          | TC-3.3.2, TC-3.3.3         |
| T008   | FR-1.2.3            | US-1          | TC-3.3.1 ~ TC-3.3.3       |
| T009   | FR-1.2.4            | US-2          | TC-3.3.4, TC-3.3.7        |
| T010   | FR-1.2.4            | US-2          | TC-3.3.4, TC-3.3.7        |
| T011   | FR-1.2.2            | US-3          | TC-3.3.5, TC-3.3.6        |
| T012   | FR-1.2.2            | US-3          | TC-3.3.5, TC-3.3.6, EC-001~EC-002 |
| T013   | NFR-001, NFR-003    | 전체          | TC-3.3.1 ~ TC-3.3.7       |
| T014   | FR-1.2.5            | 전체          | -                          |
| T015   | NFR-003             | 전체          | -                          |

---

*문서 종료*
*티켓*: PLAYG-1822 | *SDS 섹션*: SDS-3.3 | *안전 등급*: IEC 62304 Class A

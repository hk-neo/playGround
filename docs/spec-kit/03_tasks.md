# Tasks: findPixelDataTag() - DICOM 픽셀 데이터 태그 폴백 탐색

**Input**: `docs/spec-kit/01_spec.md`, `docs/spec-kit/02_plan.md`
**Ticket**: `PLAYG-1830` | **Date**: 2026-04-30
**Module**: `viewer/src/data/dicomParser/pixelDataParser.js`
**Safety Class**: IEC 62304 Class A (비진단 경로 폴백)

> **형식 안내**
> - `[ID]` : 태스크 번호 (T001, T002, ...)
> - `[P]` : 병렬 실행 가능 여부 표시 (🔀 병렬 가능 / 🔒 순서 필수)
> - `[Story]` : 관련 사용자 스토리 (US1, US2, ...)
> - 각 태스크는 **2시간 이내** 완료 가능한 단위로 분할

---

## Phase 1: Setup (공통 인프라)
<!-- 모든 다음 단계에 필요한 공통 상수·의존성 검증 -->

- [x] **T001** 🔒 PIXEL_DATA_TAG 상수 검증 및 의존 모듈 확인
  - 파일: `viewer/src/data/dicomParser/constants.js`
  - 작업 내용:
    - `PIXEL_DATA_TAG` 상수가 `{ group: 0x7FE0, element: 0x0010 }` 형태로 `Object.freeze` 되어 존재하는지 확인
    - `DICOM_MIN_FILE_SIZE = 132` 상수 존재 및 값 확인
    - `ERROR_CODES.PARSE_ERR_PIXEL_DATA_EXTRACTION` 에러 코드 존재 확인
    - `pixelDataParser.js`에서 `constants.js`의 import 구문이 올바른지 검증
    - `parsePixelData()` 함수의 현재 시그니처가 spec과 일치하는지 확인
    - 기존 `findPixelDataTag()` 골격 구현(현재 하드코딩된 상수값, 루프 조건 `offset < bufferLength - 4`)을 spec 요구사항과 비교하여 차이점 정리
  - 추적: FR-002, FR-001
  - 완료 조건:
    - PIXEL_DATA_TAG.group === 0x7FE0, PIXEL_DATA_TAG.element === 0x0010 확인
    - DICOM_MIN_FILE_SIZE === 132 확인
    - PARSE_ERR_PIXEL_DATA_EXTRACTION 에러 코드 확인
    - 기존 구현 대비 변경점 정리 문서화 (하드코딩 상수 -> PIXEL_DATA_TAG import, 루프 조건 `offset < bufferLength - 4` -> `offset + 4 <= bufferLength`)
    - `npm test` 기존 테스트 통과

- [x] **T002** 🔒 테스트 픽스처 및 헬퍼 유틸리티 생성
  - 파일: `viewer/tests/unit/fixtures/pixelDataTagBuffer.js` (신규)
  - 작업 내용:
    - `createPixelDataTagBuffer(options)`: 지정한 오프셋에 픽셀 데이터 태그(7FE0,0010)를 배치한 DICOM 버퍼 생성 헬퍼
    - 프리앰블(128바이트) + 매직바이트(4바이트 'DICM') 기본 포함
    - 옵션: `tagOffset` (태그 위치, 기본값 132), `bufferLength` (전체 버퍼 크기), `includeTag` (태그 포함 여부, 기본 true)
    - `createNoTagBuffer(length)`: 픽셀 데이터 태그가 포함되지 않은 버퍼 생성 (UT-003, UT-008용)
    - `createCorruptBuffer()`: DataView 읽기 시 예외를 유발하는 손상 버퍼 생성 (UT-007용)
    - `createBigEndianTagBuffer()`: Big Endian으로 태그가 저장된 버퍼 생성 (UT-009용)
    - `createBoundaryBuffer(tagOffset, totalLength)`: 버퍼 끝에 태그를 배치한 경계 조건 버퍼 생성 (UT-006용)
    - 기존 `validBuffer.js`의 `writeString`, `writeExplicitTag` 유틸리지 재사용 검토
  - 추적: EC-001 ~ EC-007
  - 완료 조건:
    - 5종 픽스처 생성 함수가 독립적으로 import 가능
    - 각 함수가 지정된 조건의 ArrayBuffer를 반환
    - `createPixelDataTagBuffer()`로 생성한 버퍼에서 오프셋 132 이후에 (0x7FE0, 0x0010)이 Little Endian으로 기록됨
    - `createNoTagBuffer()`에 0x7FE0 패턴이 포함되지 않음 (또는 포함되더라도 element가 0x0010이 아님)

---

## Phase 2: Foundational (선행 필수 핵심 구현)
<!-- CRITICAL: 사용자 스토리 구현 전 반드시 완료해야 할 함수 스켈레톤 및 입력 검증 -->

- [x] **T003** 🔒 findPixelDataTag() 함수 리팩토링 - 상수 import 및 루프 조건 수정
  - 파일: `viewer/src/data/dicomParser/pixelDataParser.js`
  - 작업 내용:
    - 기존 하드코딩된 `targetGroup = 0x7FE0`, `targetElement = 0x0010`을 `PIXEL_DATA_TAG.group`, `PIXEL_DATA_TAG.element`로 교체
    - `constants.js`에서 `PIXEL_DATA_TAG` import 확인 (기존 import 문에 이미 포함되어 있는지 검토, 누락 시 추가)
    - 루프 조건을 `offset < bufferLength - 4`에서 `offset + 4 <= bufferLength`로 변경 (HAZ-5.3 1차 방어 강화)
    - 프리앰블 스킵 상수 `DICOM_PREAMBLE_SIZE = 132`를 `DICOM_MIN_FILE_SIZE` 상수와 일치하는지 확인
    - 기존 주석 `// Big Endian 파일도 지원하므로 양쪽 바이트 오더로 확인` 제거 (spec에 따르면 LE 전용, BE는 TODO-BE)
  - 추적: FR-002, FR-004, FR-003, HAZ-5.3
  - 완료 조건:
    - `targetGroup`/`targetElement`가 `PIXEL_DATA_TAG` 상수에서 파생됨
    - 루프 조건이 `offset + 4 <= bufferLength`로 변경됨
    - 오프셋 132부터 2바이트 간격으로 탐색 시작 확인
    - 기존 테스트 회귀 없음

- [x] **T004** 🔒 입력 검증 및 조기 반환 로직 추가
  - 파일: `viewer/src/data/dicomParser/pixelDataParser.js`
  - 작업 내용:
    - `bufferLength <= DICOM_PREAMBLE_SIZE` 조건 검사 추가 (FR-009)
    - 조건 충족 시 루프 미실행 후 즉시 -1 반환
    - EC-001 (bufferLength <= 132), EC-002 (bufferLength == 136) 엣지 케이스 방어
    - `DICOM_PREAMBLE_SIZE = 132` 상수를 함수 내부에 정의 (또는 constants.js의 `DICOM_MIN_FILE_SIZE` 재사용)
  - 추적: FR-009, FR-001, HAZ-5.3, EC-001, EC-002
  - 완료 조건:
    - `bufferLength`가 0, 131, 132인 경우 즉시 -1 반환
    - `bufferLength`가 133 이상인 경우 루프 진입
    - 함수 상단에 입력 검증이 위치하여 조기 반환 경로 확보

---## Phase 3: User Story 1 — 픽셀 데이터 태그 선형 탐색 (Priority: P1) :dart: MVP

- **Goal**: DICOM 버퍼 전체를 선형 탐색하여 픽셀 데이터 태그(7FE0,0010)의 시작 위치를 정확히 반환
- **Independent Test**: 픽셀 데이터 태그가 특정 오프셋에 위치한 DICOM 버퍼를 생성하여 findPixelDataTag() 호출 후 반환값이 해당 오프셋과 일치하는지 검증

- [x] **T005** 🔀 [US1] 선형 탐색 루프 핵심 로직 구현 - DataView 읽기 및 태그 매칭
  - 파일: `viewer/src/data/dicomParser/pixelDataParser.js`
  - 작업 내용:
    - `for` 루프: `let offset = DICOM_PREAMBLE_SIZE` 부터 `offset + 4 <= bufferLength` 까지 `offset += 2` 간격 순회 (FR-004)
    - `view.getUint16(offset, true)` 로 group 읽기, `view.getUint16(offset + 2, true)` 로 element 읽기 (FR-005, Little Endian)
    - `group === targetGroup && element === targetElement` 매치 시 `return offset` 즉시 반환 (FR-006)
    - 루프 정상 종료 후 `return -1` 반환 (FR-008)
    - 각 루프 반복을 `try` 블록으로 감싸고 DataView 예외 포착 (FR-007)
    - `catch` 블록에서 `break` 후 루프 탈출, -1 반환
  - 추적: FR-004, FR-005, FR-006, FR-007, FR-008, FR-1.4, FR-2.2, HAZ-5.3
  - 완료 조건:
    - 오프셋 1024에 (7FE0,0010)이 있는 버퍼에서 1024 반환 (US1-AS1)
    - 오프셋 132에 (7FE0,0010)이 있는 버퍼에서 132 반환 (US1-AS2)
    - 버퍼 끝 근처에 태그가 있어도 정확한 오프셋 반환 (US1-AS3)
    - 태그가 없는 버퍼에서 -1 반환
    - 루프가 2바이트 간격으로 순회 (offset += 2)

- [x] **T006** 🔀 [US1] DataView 예외 try-catch 처리 구현 및 검증
  - 파일: `viewer/src/data/dicomParser/pixelDataParser.js`
  - 작업 내용:
    - `try-catch` 블록이 `getUint16` 호출을 정확히 감싸고 있는지 확인
    - `catch` 블록에서 예외를 호출자로 전파하지 않고 `break`로 루프 탈출 확인 (NFR-001)
    - 예외 발생 시 함수가 항상 -1을 반환하는지 검증
    - catch 매개변수를 `_e`로 명명하여 unused 경고 방지 (기존 코드 스타일 유지)
    - 예외 발생 지점 이전의 오프셋은 무효이므로 부분 매칭 결과를 반환하지 않는지 확인
  - 추적: FR-007, NFR-001, HAZ-5.3
  - 완료 조건:
    - 손상된 DataView에서 예외 발생 시 함수가 -1 반환
    - 예외가 함수 외부로 전파되지 않음
    - try-catch가 루프 상한 조건과 함께 이중 방어 구조를 형성

- [ ] **T007** 🔒 [US1] 단위 테스트 작성 - 기본 탐색 시나리오
  - 파일: `viewer/tests/unit/dicomParser/pixelDataParser.test.js` (신규)
  - 작업 내용:
    - **UT-001**: 오프셋 1024에 (7FE0,0010)이 있는 버퍼에서 1024 반환 (US1-AS1)
    - **UT-002**: 오프셋 132에 (7FE0,0010)이 있는 버퍼에서 132 반환 (US1-AS2, FR-003)
    - **UT-003**: (7FE0,0010)이 포함되지 않은 버퍼에서 -1 반환 (US1-AS1 반대)
    - **UT-004**: bufferLength=136, 태그 at 132에서 132 반환 (US1-AS3 변형, 최소 크기)
    - **UT-005**: bufferLength가 132 이하인 버퍼에서 즉시 -1 반환 (EC-001)
    - **UT-006**: 버퍼 끝(bufferLength-4)에 태그가 위치한 경우 정확한 오프셋 반환 (EC-003)
    - 테스트에서 `pixelDataParser.js`의 module-private 함수에 접근하는 방식 결정:
      - 옵션 A: 테스트용 export 추가 (`export { findPixelDataTag }`)
      - 옵션 B: `parsePixelData()`를 통한 간접 테스트
      - 옵션 C: 모듈 내부 접근 테스트 유틸 사용 (Vitest `vi.mock` 등)
    - spec plan에 따라 테스트 전용 내부 접근 패턴 채택
  - 추적: SC-001, SC-002, SC-003, EC-001, EC-003, FR-001~FR-009
  - 완료 조건:
    - 6개 테스트 케이스 전체 PASS
    - 각 테스트가 독립적으로 실행 가능
    - `npm test` 통과

---## Phase 4: User Story 2 — 태그 미발견 시 안전한 실패 처리 (Priority: P1) :dart: MVP

- **Goal**: 버퍼 전체를 탐색했음에도 픽셀 데이터 태그를 발견하지 못한 경우 -1을 반환하여 호출자(parsePixelData)가 ParseError를 발생시킬 수 있도록 한다
- **Independent Test**: 픽셀 데이터 태그가 포함되지 않은 버퍼를 입력하여 -1이 반환되고, 호출자에서 ParseError가 발생하는지 확인

- [ ] **T008** 🔀 [US2] 센티넬 값 반환 및 호출자 연동 검증
  - 파일: `viewer/src/data/dicomParser/pixelDataParser.js`
  - 작업 내용:
    - 루프 정상 종료(모든 오프셋 탐색 완료) 후 `return -1` 반환 경로 확인 (FR-008)
    - 루프 조건 `offset + 4 <= bufferLength`가 false가 되어 자연 종료되는지 검증
    - `parsePixelData()`에서 `findPixelDataTag()`의 -1 반환 시 `ParseError` 발생하는 기존 로직 확인:
      ```javascript
      if (resolvedOffset < 0 || resolvedOffset >= buffer.byteLength) {
        throw new ParseError('픽셀 데이터 태그를 찾을 수 없습니다', ERROR_CODES.PARSE_ERR_PIXEL_DATA_EXTRACTION);
      }
      ```
    - -1이 호출자에게 센티넬 값으로 전달되고, 호출자가 이를 적절히 처리하는지 검증
    - 예외를 직접 throw하지 않고 센티넬 값으로 실패를 알리는 설계 의도 주석 추가
  - 추적: FR-008, FR-001, HAZ-1.1, FR-1.4
  - 완료 조건:
    - 태그가 없는 버퍼에서 -1 반환 확인
    - `parsePixelData()`에서 -1 수신 후 `PARSE_ERR_PIXEL_DATA_EXTRACTION` ParseError throw 확인
    - 예외 메시지가 사용자 친화적으로 내부 구조(offset, tag hex)를 노출하지 않음 (FR-4.5)

- [ ] **T009** 🔒 [US2] 단위 테스트 작성 - 태그 미발견 시나리오
  - 파일: `viewer/tests/unit/dicomParser/pixelDataParser.test.js`
  - 작업 내용:
    - **UT-003 보강**: 픽셀 데이터 태그가 전혀 없는 1024바이트 버퍼에서 -1 반환 (US2-AS1)
    - **UT-010**: `parsePixelData()`에 pixelDataOffset 없이 태그 없는 버퍼 전달 시 ParseError 발생 확인 (US2-AS2)
    - **UT-011**: 루프가 버퍼 끝까지 순회 후 -1 반환 (중간에 매칭되지 않음 확인)
    - **UT-005 보강**: bufferLength=0, 1, 100, 131, 132에서 각각 -1 반환 (EC-001 경계값)
  - 추적: SC-002, EC-001, HAZ-1.1
  - 완료 조건:
    - 4개 테스트 케이스 전체 PASS
    - ParseError 발생 시 에러 코드가 `PARSE_ERR_PIXEL_DATA_EXTRACTION`과 일치

---

## Phase 5: User Story 3 — 버퍼 경계 초과 읽기 방지 (Priority: P1) :dart: MVP

- **Goal**: DataView 읽기 시 버퍼 경계를 초과하여 읽는 것을 이중 방어(루프 상한 + try-catch)로 완전 차단
- **Independent Test**: 최소 크기 버퍼와 경계 조건 버퍼를 입력하여 out-of-bounds 읽기가 발생하지 않고 안전하게 종료되는지 확인

- [ ] **T010** 🔀 [US3] 루프 상한 조건 강화 및 경계 검증
  - 파일: `viewer/src/data/dicomParser/pixelDataParser.js`
  - 작업 내용:
    - 루프 조건 `offset + 4 <= bufferLength`이 정확한지 수학적 검증 (HAZ-5.3 1차 방어)
    - 경계값 테스트: bufferLength=136에서 offset=132일 때 `132 + 4 <= 136` = true (1회 실행)
    - 경계값 테스트: bufferLength=136에서 offset=134일 때 `134 + 4 <= 136` = false (루프 종료)
    - bufferLength=135에서 offset=132일 때 `132 + 4 <= 135` = false (루프 미실행)
    - `getUint16(offset + 2, true)` 호출 시 `offset + 2 + 2 = offset + 4` 바이트가 필요하므로 상한 조건이 정확히 맞는지 확인
    - try-catch가 2차 방어로 동작하는지 확인: 상한 조건을 통과하더라도 DataView 내부 RangeError 포착
  - 추적: FR-004, NFR-001, HAZ-5.3, EC-001, EC-002, EC-003
  - 완료 조건:
    - bufferLength=136에서 오프셋 132에서 1회만 읽기 시도 후 루프 종료
    - bufferLength=135에서 루프 미실행 후 -1 반환
    - DataView 읽기 예외 발생 시 try-catch가 포착하여 -1 반환
    - 어떤 입력에서도 out-of-bounds 읽기가 함수 외부로 예외를 전파하지 않음

- [ ] **T011** 🔒 [US3] 단위 테스트 작성 - 버퍼 경계 안전성 시나리오
  - 파일: `viewer/tests/unit/dicomParser/pixelDataParser.test.js`
  - 작업 내용:
    - **UT-004 보강**: bufferLength=136, 태그 at 132에서 정확히 1회 루프 실행 후 132 반환
    - **UT-012**: bufferLength=135에서 루프 미실행 후 -1 반환
    - **UT-013**: bufferLength=137에서 오프셋 132, 134에서만 루프 실행 (2회)
    - **UT-007**: 손상된 DataView(예: 짧은 ArrayBuffer)에서 예외 포착 후 -1 반환
    - **UT-014**: bufferLength가 음수인 경우 -1 반환 (방어적 프로그래밍)
    - **UT-015**: bufferLength가 정확히 tagOffset+4인 경우 경계 조건에서 정확한 오프셋 반환
  - 추적: SC-003, SC-005, HAZ-5.3, EC-001, EC-002, EC-003
  - 완료 조건:
    - 6개 테스트 케이스 전체 PASS
    - 어떤 테스트에서도 RangeError 또는 TypeError가 throw되지 않음

---## Phase 6: User Story 4 — Little Endian 바이트 오더 매칭 (Priority: P1) :dart: MVP

- **Goal**: DataView.getUint16()을 사용하여 Little Endian 바이트 오더로 DICOM 태그의 group/element를 읽고 사전 정의된 상수와 비교
- **Independent Test**: Big Endian과 Little Endian으로 저장된 태그가 포함된 버퍼에서 Little Endian 태그만 매칭되는지 확인

- [ ] **T012** 🔀 [US4] Little Endian 전용 매칭 로직 검증 및 주석 정리
  - 파일: `viewer/src/data/dicomParser/pixelDataParser.js`
  - 작업 내용:
    - `view.getUint16(offset, true)`의 두 번째 인자 `true`가 Little Endian을 의미하는지 주석 명시
    - 기존 코드의 `// Big Endian 파일도 지원하므로 양쪽 바이트 오더로 확인` 주석이 제거되었는지 확인 (T003에서 처리)
    - Big Endian 파일은 현재 지원하지 않음을 명시하는 `// TODO-BE` 주석 추가
    - `targetGroup`/`targetElement` 비교 로직이 정확히 `===` (엄격 동등) 연산자를 사용하는지 확인
    - group 비교만으로 스킵되지 않고 group && element 모두 비교하는지 확인 (EC-004, EC-005)
  - 추적: FR-005, FR-006, FR-2.2, EC-004, EC-005
  - 완료 조건:
    - Little Endian으로 저장된 (7FE0,0010) 태그를 정확히 매칭하여 오프셋 반환
    - Big Endian으로 저장된 동일 태그를 매칭하지 않고 -1 반환
    - group=0x7FE0, element가 0x0010이 아닌 태그(예: 0x0020)는 매칭되지 않음 (EC-004)
    - 버퍼에 우연히 0x7FE0 패턴이 있어도 다음 2바이트가 0x0010이 아니면 매칭되지 않음 (EC-005)

- [ ] **T013** 🔒 [US4] 단위 테스트 작성 - 바이트 오더 매칭 시나리오
  - 파일: `viewer/tests/unit/dicomParser/pixelDataParser.test.js`
  - 작업 내용:
    - **UT-016**: Little Endian으로 저장된 (7FE0,0010) 태그에서 올바른 오프셋 반환 (US4-AS1)
    - **UT-017**: Big Endian으로 저장된 (7FE0,0010) 태그에서 -1 반환 (US4-AS2)
    - **UT-008**: 동일 group(0x7FE0)에 다른 element(0x0020)가 있는 버퍼에서 -1 반환 (EC-004)
    - **UT-009**: Big Endian 태그가 포함된 버퍼에서 LE 전용 탐색으로 -1 반환 (EC-005 변형)
    - **UT-018**: 오프셋별로 group만 맞고 element가 다른 위치가 여러 곳 있는 버퍼에서 첫 (7FE0,0010) 매치 반환
  - 추적: SC-001, FR-005, FR-006, FR-2.2, EC-004, EC-005
  - 완료 조건:
    - 5개 테스트 케이스 전체 PASS
    - LE/BE 구분 동작 확인

---

## Phase 7: User Story 5 — 2바이트 간격 최적화 탐색 (Priority: P2)

- **Goal**: DICOM 태그 짝수 정렬 특성을 활용하여 2바이트 간격으로 탐색하여 O(n/2) 시간복잡도 유지
- **Independent Test**: 동일한 버퍼에 대해 2바이트 간격 탐색과 1바이트 간격 탐색의 결과가 동일한지 확인

- [ ] **T014** 🔀 [US5] 2바이트 간격 탐색 정확성 검증
  - 파일: `viewer/src/data/dicomParser/pixelDataParser.js`
  - 작업 내용:
    - 루프 증분이 `offset += 2`인지 확인 (FR-004, NFR-002)
    - DICOM 태그가 항상 짝수 오프셋에 정렬된다는 전제 조건 주석 추가
    - 홀수 오프셋에 태그가 위치하는 경우는 표준 위반이므로 탐색 불가함을 명시
    - 2바이트 간격 탐색이 1바이트 간격 탐색과 동일한 결과를 보장하는 이유를 주석으로 설명
    - 성능 측정: 대용량 버퍼(1MB 이상)에서 탐색 시간이 합리적인지 벤치마크 (선택 사항)
  - 추적: FR-004, NFR-002, NFR-1
  - 완료 조건:
    - `offset += 2` 증분 확인
    - 짝수 오프셋에만 태그가 있는 정상 DICOM 버퍼에서 정확한 결과 반환
    - 홀수 오프셋에 강제 배치한 태그는 탐색되지 않음 (정상 동작)

- [ ] **T015** 🔒 [US5] 단위 테스트 작성 - 2바이트 간격 정확성 시나리오
  - 파일: `viewer/tests/unit/dicomParser/pixelDataParser.test.js`
  - 작업 내용:
    - **UT-019**: 짝수 오프셋에만 태그가 있는 버퍼에서 2바이트 간격 탐색 결과가 정확함
    - **UT-020**: 홀수 오프셋에 강제 배치한 태그는 발견되지 않고 -1 반환 (표준 위반 파일)
    - **UT-021**: 여러 짝수 오프셋(134, 200, 500)에 다른 태그가 있고 1000에 (7FE0,0010)이 있는 버퍼에서 1000 반환
    - **UT-022**: 매우 큰 버퍼(1MB)에서 태그가 끝 근처에 있어도 정상 탐색 완료 (성능 검증)
  - 추적: SC-007, NFR-002
  - 완료 조건:
    - 4개 테스트 케이스 전체 PASS
    - 2바이트 간격 결과가 1바이트 간격과 동일함을 검증하는 테스트 포함

---## Phase 8: Integration & Finalization

- [ ] **T016** 🔒 parsePixelData() 통합 테스트 - 폴백 경로 연동
  - 파일: `viewer/tests/unit/dicomParser/pixelDataParser.test.js`
  - 작업 내용:
    - **IT-001**: `parsePixelData()`에 `pixelDataOffset` 없이 유효 버퍼 전달 시 `findPixelDataTag()` 폴백 호출 후 정상 파싱 확인
    - **IT-002**: `parsePixelData()`에 태그 없는 버퍼 전달 시 `ParseError` 발생 확인 (`PARSE_ERR_PIXEL_DATA_EXTRACTION`)
    - **IT-003**: `pixelDataOffset`이 명시적으로 제공된 경우 `findPixelDataTag()`가 호출되지 않고 정상 경로가 사용되는지 확인
    - **IT-004**: 기존 `parsePixelData()` 테스트 케이스(정상 경로)가 `findPixelDataTag()` 추가 후에도 회귀 없이 통과하는지 확인
    - **IT-005**: Explicit VR LE 헤더(tag 4 + VR 2 + reserved 2 + length 4 = 12바이트) 파싱이 폴백 오프셋에서 정확히 동작하는지 확인
    - 통합 테스트는 `parsePixelData()` export 함수를 직접 호출하여 end-to-end 검증
  - 추적: SC-001 ~ SC-007, FR-1.4, HAZ-1.1, HAZ-5.3
  - 완료 조건:
    - 5개 통합 테스트 케이스 전체 PASS
    - 폴백 경로에서 픽셀 데이터 정상 추출 확인
    - 폴백 실패 시 ParseError 발생 확인
    - 기존 정상 경로 회귀 없음

- [ ] **T017** 🔒 엣지 케이스 종합 검증 및 커버리지 달성
  - 파일: `viewer/tests/unit/dicomParser/pixelDataParser.test.js`
  - 작업 내용:
    - EC-001 ~ EC-007 전체 시나리오에 대한 테스트 커버리지 재확인:
      - EC-001: bufferLength <= 132 → 즉시 -1 (UT-005)
      - EC-002: bufferLength == 136 → 1회만 루프 (UT-004)
      - EC-003: 버퍼 끝에 태그 → 정확한 오프셋 (UT-006)
      - EC-004: 동일 group 다른 element → -1 (UT-008)
      - EC-005: 우연한 패턴 매칭 → 스킵 (UT-010)
      - EC-006: view가 null/undefined → try-catch로 -1 (검토 항목)
      - EC-007: 대용량 버퍼 → 정상 탐색 (UT-022)
    - 제어 흐름 경로(P1~P4) 100% 커버리지 확인:
      - P1: bufferLength <= 132 → 즉시 -1
      - P2: 루프 중 매치 발견 → offset 반환
      - P3: 루프 정상 종료 → -1 반환
      - P4: 루프 중 예외 발생 → break 후 -1
    - 함수 커버리지 100%, 분기 커버리지 100% (4/4 경로) 달성 확인
    - Vitest/Jest 커버리지 리포트 확인
  - 추적: SC-001 ~ SC-007, EC-001 ~ EC-007, NFR-001
  - 완료 조건:
    - EC-001 ~ EC-007 모두 대응 테스트 존재 및 PASS
    - 분기 커버리지 100% (4/4 경로) 달성
    - 라인 커버리지 90% 이상

- [ ] **T018** 🔒 JSDoc 주석 작성 및 코드 정리
  - 파일: `viewer/src/data/dicomParser/pixelDataParser.js`
  - 작업 내용:
    - `findPixelDataTag()` 함수에 JSDoc 주석 작성:
      ```javascript
      /**
       * DICOM 버퍼에서 픽셀 데이터 태그(7FE0,0010)의 오프셋을 선형 탐색한다.
       * 정상 파싱 경로에서 오프셋을 찾지 못한 경우 호출되는 폴백 함수.
       * module-private: export되지 않는 내부 함수
       * @param {DataView} view - DICOM 파일의 DataView
       * @param {number} bufferLength - 버퍼 전체 길이(바이트)
       * @returns {number} 태그 시작 오프셋, 미발견 시 -1
       * @trace FR-1.4, FR-2.2, NFR-1, HAZ-5.3, HAZ-1.1
       */
      ```
    - 디버그용 console.log 제거
    - TODO/FIXME 주석 잔여 확인 및 정리
    - `// TODO-BE: Big Endian 지원 필요` 주석 유지 (향후 이관 항목)
    - IEC 62304 Class A 코드 리뷰 체크리스트 기반 자가 검토:
      - 단일 진입/진출점 (진입 1개, 반환 경로 3개: 매치 시 offset, 루프 종료 시 -1, 예외 시 -1)
      - 예외 전파 금지 (try-catch로 모든 예외 흡수)
      - 입력 검증 (bufferLength 조건 검사)
      - 메모리 안전성 (루프 상한 + try-catch 이중 방어)
    - ESLint / Prettier 린트 통과 확인
  - 추적: NFR 전체, IEC 62304 Class A
  - 완료 조건:
    - JSDoc 주석 완비 (파라미터, 반환값, 추적성)
    - 불필요한 로깅/주석 제거
    - ESLint/Prettier 린트 통과
    - 코드 리뷰 체크리스트 5/5 항목 PASS

- [ ] **T019** 🔒 전체 테스트 스위트 회귀 검증 및 최종 확인
  - 파일: `viewer/tests/` 전체
  - 작업 내용:
    - `npm test` 전체 실행 및 통과 확인
    - 기존 단위 테스트(`unit.test.js`, `tagReader.test.js`, `CBVError.test.js` 등) 회귀 없음 확인
    - 기존 통합 테스트(`dicomDictionary.test.js`) 회귀 없음 확인
    - `findPixelDataTag()` 관련 단위 테스트(UT-001 ~ UT-022) 전체 PASS 확인
    - `parsePixelData()` 통합 테스트(IT-001 ~ IT-005) 전체 PASS 확인
    - 최종 커버리지 리포트 확인 (함수 100%, 분기 100%, 라인 >= 90%)
  - 추적: SC-001 ~ SC-007 전체
  - 완료 조건:
    - 전체 테스트 스위트 PASS (기존 + 신규)
    - 회귀 이슈 없음
    - 커버리지 목표 달성

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
Phase 1 - Setup:             T001 -> T002
                                      |
Phase 2 - Foundational:     T003 -> T004
                                      |
Phase 3 - US1 태그탐색:      T005 -> T006 -> T007
                                      |
Phase 4 - US2 미발견실패:    T008 -> T009          -- 병렬 가능
Phase 5 - US3 경계안전:      T010 -> T011          -- 병렬 가능
Phase 6 - US4 LE매칭:       T012 -> T013          -- 병렬 가능
Phase 7 - US5 2바이트간격:   T014 -> T015          -- 병렬 가능
                                      |
Phase 8 - Integration:       T016 -> T017 -> T018 -> T019 -> T020
```

**병렬 실행 가능 그룹** (Phase 3 완료 후):
- T008+T009 (US2), T010+T011 (US3), T012+T013 (US4), T014+T015 (US5) 은 서로 독립적이므로 🔀 병렬 구현 가능
- 단, T009, T011, T013, T015 테스트 태스크는 각 선행 구현 태스크 완료 후 🔒 순차 실행

---

## Estimated Effort

| Phase                      | 태스크 수 | 예상 소요 시간 |
| -------------------------- | --------- | -------------- |
| Phase 1: Setup             | 2         | 2시간          |
| Phase 2: Foundational      | 2         | 2시간          |
| Phase 3: US1 태그 선형 탐색 (P1) | 3    | 4시간          |
| Phase 4: US2 미발견 실패 (P1)     | 2    | 2시간          |
| Phase 5: US3 경계 안전 (P1)       | 2    | 2시간          |
| Phase 6: US4 LE 매칭 (P1)        | 2    | 2시간          |
| Phase 7: US5 2바이트 간격 (P2)    | 2    | 2시간          |
| Phase 8: Integration       | 5         | 4시간          |
| **합계**                    | **20**    | **20시간**     |

---

## Traceability Matrix

| 태스크 | 관련 FR                     | 관련 HAZ              | 관련 EC                         | 관련 SC       |
| ------ | --------------------------- | --------------------- | ------------------------------- | ------------- |
| T001   | FR-001, FR-002              | HAZ-5.3               | -                               | -             |
| T002   | -                           | -                     | EC-001 ~ EC-007                 | -             |
| T003   | FR-002, FR-003, FR-004      | HAZ-5.3               | -                               | -             |
| T004   | FR-001, FR-009              | HAZ-5.3               | EC-001, EC-002                  | SC-003        |
| T005   | FR-004~FR-008, FR-1.4, FR-2.2 | HAZ-5.3            | -                               | SC-001, SC-002 |
| T006   | FR-007, NFR-001             | HAZ-5.3               | -                               | SC-005        |
| T007   | FR-001~FR-009               | HAZ-5.3               | EC-001, EC-003                  | SC-001~SC-003 |
| T008   | FR-008, FR-001              | HAZ-1.1               | -                               | SC-002        |
| T009   | FR-008                      | HAZ-1.1               | EC-001                          | SC-002        |
| T010   | FR-004, NFR-001             | HAZ-5.3               | EC-001, EC-002, EC-003          | SC-003, SC-005 |
| T011   | -                           | HAZ-5.3               | EC-001, EC-002, EC-003          | SC-003, SC-005 |
| T012   | FR-005, FR-006, FR-2.2      | -                     | EC-004, EC-005                  | SC-001        |
| T013   | FR-005, FR-006, FR-2.2      | -                     | EC-004, EC-005                  | SC-001        |
| T014   | FR-004, NFR-002             | -                     | -                               | SC-007        |
| T015   | FR-004, NFR-002             | -                     | -                               | SC-007        |
| T016   | FR-1.4                      | HAZ-1.1, HAZ-5.3      | -                               | SC-001~SC-007 |
| T017   | -                           | HAZ-5.3               | EC-001 ~ EC-007                 | SC-001~SC-007 |
| T018   | NFR 전체                    | -                     | -                               | -             |
| T019   | FR-001~FR-009               | HAZ-1.1, HAZ-5.3      | -                               | SC-001~SC-007 |
| T020   | -                           | -                     | -                               | -             |

---

## 제어 흐름 경로별 테스트 매핑

| 경로 | 조건                    | 결과              | 커버 태스크     |
| ---- | ----------------------- | ----------------- | --------------- |
| P1   | bufferLength <= 132     | 즉시 -1 반환      | T004, T007, T011 |
| P2   | 루프 중 매치 발견       | offset 반환       | T005, T007      |
| P3   | 루프 정상 종료(매치없음) | -1 반환           | T005, T008, T009 |
| P4   | 루프 중 예외 발생       | break 후 -1 반환  | T006, T011      |

---

## Open Items & Notes

| 항목                         | 상태   | 내용                                                                 |
| ---------------------------- | ------ | -------------------------------------------------------------------- |
| TODO-BE                      | 향후   | Big Endian DICOM 파일 지원 시 양방향 검사 로직 추가 필요             |
| TODO-PERF                    | 검토   | 대용량 버퍼(100MB+)에서의 탐색 성능 벤치마크 필요 여부               |
| EC-006 (view null/undefined) | 보류   | 명시적 검증 추가 여부 (현재 try-catch로 간접 방어, [NEEDS CLARIFICATION]) |

---

*본 문서는 PLAYG-1830 티켓의 세밀한 마이크로 태스크 분할로, 01_spec.md 기능 명세서와 02_plan.md 구현 계획서를 기반으로 작성되었다.*
*IEC 62304 Class A 안전 등급에 따른 이중 방어 설계(루프 상한 + try-catch)를 모든 태스크에서 준수한다.*

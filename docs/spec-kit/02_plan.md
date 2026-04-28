# Implementation Plan: createParseContext() 파싱컨텍스트 팩토리

**Branch**: `feature/PLAYG-1823-parse-context-factory` | **Date**: 2026-04-28 | **Spec**: `docs/spec-kit/01_spec.md`
**Ticket**: `PLAYG-1823` | **Type**: Detailed Design

---

## Summary

DICOM 파일 파싱 과정의 내부 상태를 관리하는 ParseContext 객체를 생성하는 팩토리 함수의 구현 계획이다.
전송 구문(Transfer Syntax) UID에 따라 바이트 오더(isLittleEndian)와 VR 모드(isExplicitVR)를 자동 설정하며,
버퍼 읽기 유틸리티 메서드(readUint16, readUint32, readInt16, readString, readBytes)와
오프셋 제어 메서드(remaining, advance, hasRemaining)를 제공한다.
현재 ParseContext.js 파일이 이미 존재하므로, 명세서의 FR/NFR 요구사항 대비 누락 사항을 보완하는 방향으로 구현을 진행한다.
---

## Technical Context

| 항목                     | 내용                        |
| ------------------------ | --------------------------- |
| **Language/Version**     | JavaScript (ES2020+, ESM)   |
| **Primary Dependencies** | DataView API (Web Standard), TRANSFER_SYNTAX 상수 (dicomDictionary.js) |
| **Storage**              | 메모리 내 ArrayBuffer 기반 버퍼 조작 |
| **Testing**              | Vitest 3.x + jsdom + @vitest/coverage-v8 |
| **Target Platform**      | 웹 브라우저 (Vite 5.x 빌드)     |
| **Performance Goals**    | 모든 read 메서드 O(1) 시간 복잡도, DataView 래핑 오버헤드 최소화 |
| **Constraints**          | 순수 JavaScript, 외부 런타임 의존성 없음, ES Module 전용 |
---

## Constitution Check
*GATE: 설계 원칙(Constitution) 준수 여부 확인*

- **SOLID 원칙**: 단일 책임 원칙(SRP) 준수 - ParseContext는 파싱 상태 관리와 버퍼 읽기만 담당. 개방-폐쇄 원칙(OCP) 준수 - 새로운 전송 구문 추가 시 createParseContext 내부 조건문만 확장하면 됨. 의존성 역전 원칙(DIP) 준수 - TRANSFER_SYNTAX 상수를 dicomDictionary 모듈에서 임포트하여 하드코딩 제거.
- **레이어 분리**: 데이터 계층(data/dicomParser) 내의 파싱 인프라 컴포넌트로, 상위 파서(metaGroupParser, metadataParser)에게 컨텍스트를 제공하는 하위 모듈. UI 계층이나 비즈니스 로직에 직접 의존하지 않음.
- **에러 처리 전략**: (1) buffer null 시 TypeError 발생 (DataView 생성자 동작에 위임). (2) 알 수 없는 전송 구문 UID는 기본값(EXPLICIT_VR_LE)으로 안전 폴백. (3) 버퍼 경계 초과 읽기 시 errors 배열에 오류 기록 후 안전한 기본값 반환 (현재 미구현, 보완 필요).
- **보안 고려사항**: DICOM 버퍼는 PHI(환자 식별 정보)를 포함할 수 있으나, ParseContext 자체는 데이터를 읽기만 하고 외부로 전송하지 않음. errors 배열에 민감 정보가 기록되지 않도록 주의 필요.
---

## Project Structure

### Documentation
```text
docs/
  spec-kit/
    01_spec.md              # 기능 명세서 (작성 완료)
    02_plan.md              # 이행 계획서 (현재 문서)
    03_tasks.md             # 작업 분할 (향후 작성)
```

### Source Code
```text
viewer/src/data/dicomParser/
  ParseContext.js              # createParseContext() 팩토리 함수 (수정 대상)
  constants.js                 # 파싱 관련 상수
  dicomDictionary.js           # ../dicomDictionary.js - TRANSFER_SYNTAX 상수 제공
  metaGroupParser.js           # ParseContext 호출처 (메타 그룹 파싱)
  metadataParser.js            # ParseContext 호출처 (메타데이터 파싱)
  tagReader.js                 # 태그 읽기 유틸리티
  validateTransferSyntax.js    # 전송 구문 검증
  index.js                     # 모듈 진입점 (export)

viewer/tests/
  unit/ParseContext.test.js     # ParseContext 전용 단위 테스트 (신규 생성)
```
---

## Implementation Approach

### 현재 구현 상태 분석 (Gap Analysis)

기존 `ParseContext.js` 파일을 명세서(FR-001 ~ FR-020, NFR-001 ~ NFR-003)와 대조한 결과,
대부분의 핵심 기능이 이미 구현되어 있다. 다음 항목들을 보완해야 한다:

| 요구사항    | 상태       | 비고                                                |
| ----------- | ---------- | --------------------------------------------------- |
| FR-001      | 구현 완료  | 함수 시그니처 일치                                   |
| FR-002      | 구현 완료  | IMPLICIT_VR_LE 매핑 정확                             |
| FR-003      | 구현 완료  | BIG_ENDIAN 매핑 정확                                 |
| FR-004      | 구현 완료  | EXPLICIT_VR_LE 기본값 처리 정확                      |
| FR-005~009  | 구현 완료  | buffer, dataView, offset, transferSyntaxUID, errors  |
| FR-010      | 구현 완료  | remaining() 로직 정확                                |
| FR-011~013  | 구현 완료  | readUint16, readUint32, readInt16 정확               |
| FR-014~015  | 구현 완료  | readString, readBytes 정확                           |
| FR-016      | 구현 완료  | advance() 로직 정확                                  |
| FR-017      | 구현 완료  | hasRemaining() 로직 정확                             |
| FR-018      | 구현 완료  | DataView 바이트 오더 인자 전달 정확                  |
| FR-019      | 구현 완료  | null/undefined 시 기본값 폴백 정확                   |
| FR-020      | 구현 완료  | 알 수 없는 UID 시 기본값 폴백 정확                   |
| NFR-002     | 미흡       | 버퍼 경계 초과 읽기 시 에러 수집 및 안전한 기본값 반환 필요 |
| EC-002      | 미흡       | startOffset > buffer.byteLength 시 remaining()가 음수 반환 가능 |
| EC-003      | 미흡       | offset 초과 시 read 메서드가 DataView 예외 발생      |
| EC-004      | 미흡       | readBytes(0)/readString(0) 경계 케이스 미검증        |
| EC-005      | 미흡       | 빈 ArrayBuffer 처리 미검증                           |
### Phase 1: Setup (사전 준비)
1. **브랜치 생성**: `feature/PLAYG-1823-parse-context-factory` 브랜치 체크아웃
2. **테스트 인프라 구축**: `viewer/tests/unit/ParseContext.test.js` 파일 생성
   - Vitest 설정 확인 (기존 vite.config.js의 test 설정 활용)
   - jsdom 환경에서 ArrayBuffer/DataView API 사용 가능 확인
3. **기존 코드 분석 완료**: dicomDictionary.js의 TRANSFER_SYNTAX 상수 구조 파악 완료

### Phase 2: Core Implementation (핵심 구현)

**Task 2-1: 버퍼 경계 보호 로직 추가 (NFR-002, EC-003)**
- `remaining()` 메서드 보완: `Math.max(0, this.buffer.byteLength - this.offset)` 적용 (EC-002 방지)
- `hasRemaining(n)` 호출을 각 read 메서드 선두에 추가하여 버퍼 초과 읽기를 사전 차단
- 초과 시 `errors` 배열에 `{ type: 'READ_OVERFLOW', offset, requested, available }` 객체 추가 후 안전한 기본값 반환:
  - `readUint16()`, `readUint32()` -> 0 반환
  - `readInt16()` -> 0 반환
  - `readString(n)` -> 빈 문자열 반환
  - `readBytes(n)` -> 빈 Uint8Array 반환

**Task 2-2: startOffset 검증 추가 (EC-002)**
- `createParseContext()` 내부에서 `startOffset`이 음수이거나 `buffer.byteLength`를 초과하는 경우 0으로 보정
- 보정 시 `errors` 배열에 `{ type: 'INVALID_START_OFFSET', requested, corrected }` 기록

**Task 2-3: 경계 케이스 처리 (EC-004, EC-005)**
- `readBytes(0)`: 빈 Uint8Array 반환, offset 변화 없음 (기존 코드에서 자연 처리됨, 테스트로 검증)
- `readString(0)`: 빈 문자열 반환, offset 변화 없음 (기존 코드에서 자연 처리됨, 테스트로 검증)
- 빈 ArrayBuffer(byteLength=0): 생성은 허용, remaining()=0, hasRemaining(n>0)=false

**Task 2-4: JSDoc 보완 및 타입 정보 강화**
- `@throws` 태그 추가: buffer가 null/undefined인 경우 TypeError 발생 명시
- 반환 객체의 각 속성 및 메서드에 `@typedef` 문서화
### Phase 3: Testing (테스트 구현)

`viewer/tests/unit/ParseContext.test.js` 파일에 다음 테스트 스위트를 작성한다.

**Suite A: 전송 구문별 설정 (FR-002~004, FR-019~020)**
| 테스트 케이스                          | 입력 UID                    | 기대 결과                                        |
| -------------------------------------- | --------------------------- | ------------------------------------------------- |
| Explicit VR LE 설정                    | 1.2.840.10008.1.2.1         | isExplicitVR=true, isLittleEndian=true            |
| Implicit VR LE 설정                    | 1.2.840.10008.1.2           | isExplicitVR=false, isLittleEndian=true           |
| Big Endian 설정                        | 1.2.840.10008.1.2.2         | isExplicitVR=true, isLittleEndian=false           |
| null UID 기본값 폴백                  | null                        | EXPLICIT_VR_LE 기본값                             |
| undefined UID 기본값 폴백             | undefined                   | EXPLICIT_VR_LE 기본값                             |
| 알 수 없는 UID 기본값 폴백            | '9.9.9.9.9'                 | EXPLICIT_VR_LE 기본값                             |

**Suite B: 버퍼 읽기 메서드 (FR-011~015, FR-018)**
| 테스트 케이스                          | 메서드       | 기대 결과                                        |
| -------------------------------------- | ------------ | ------------------------------------------------- |
| Little-Endian readUint16               | readUint16() | 올바른 값 + offset +2                             |
| Big-Endian readUint16                  | readUint16() | 바이트 오더 반영 값 + offset +2                   |
| readUint32                             | readUint32() | 올바른 값 + offset +4                             |
| readInt16 (음수)                       | readInt16()  | 음수 올바른 해석 + offset +2                      |
| readString(4)                          | readString() | 'ABCD' 반환 + offset +4                           |
| readBytes(4)                           | readBytes()  | Uint8Array(4) 반환 + offset +4                    |

**Suite C: offset 제어 메서드 (FR-010, FR-016, FR-017)**
| 테스트 케이스                          | 메서드          | 기대 결과                                        |
| -------------------------------------- | --------------- | ------------------------------------------------- |
| startOffset=10에서 remaining()         | remaining()     | buffer.length - 10                                |
| advance(20) 후 offset 확인             | advance()       | offset = startOffset + 20                         |
| hasRemaining(잔여량 이상)              | hasRemaining()  | true                                              |
| hasRemaining(잔여량 초과)              | hasRemaining()  | false                                             |

**Suite D: 에러 및 예외 처리 (NFR-002, EC-001~005)**
| 테스트 케이스                          | 입력 조건             | 기대 결과                                        |
| -------------------------------------- | --------------------- | ------------------------------------------------- |
| buffer null 시 TypeError               | buffer=null           | TypeError 발생                                    |
| 버퍼 초과 readUint16                   | offset=끝에서 읽기    | 0 반환, errors에 기록                             |
| 버퍼 초과 readString                   | offset=끝에서 읽기    | 빈 문자열, errors에 기록                          |
| 빈 ArrayBuffer                         | byteLength=0          | remaining()=0, hasRemaining(1)=false              |
| readBytes(0)                           | length=0              | 빈 Uint8Array, offset 변화 없음                   |
| readString(0)                          | length=0              | 빈 문자열, offset 변화 없음                       |
| startOffset > buffer 길이              | startOffset=999       | remaining()=0, offset 보정 또는 errors 기록       |
### Phase 4: Integration (통합 및 검증)

1. **기존 파서와의 회귀 테스트**: 보강된 ParseContext가 `metaGroupParser.js`, `metadataParser.js`에서 정상 동작하는지 확인
2. **테스트 커버리지 검증**: `npm run test:coverage` 실행 후 ParseContext.js 커버리지 90% 이상 달성 확인
3. **코드 품질 검사**: `npm run lint` 및 `npm run format` 실행
4. **문서 업데이트**: JSDoc 주석이 실제 동작과 일치하는지 최종 검토

### Key Technical Decisions

- **결정 1: 반환 객체에 클래스 대신 리터럴 객체 사용** — 이유: 기존 코드가 이미 리터럴 객체 패턴으로 작성되어 있으며, DICOM 파싱 컨텍스트는 생성 후 구조가 변하지 않아 캡슐화가 필요 없음. 메서드가 클로저로 동작하여 this 바인딩 이슈가 없음.

- **결정 2: 버퍼 경계 보호를 예외 발생이 아닌 errors 배열 기록 방식으로 처리** — 이유: NFR-002(안정성) 요구사항에 따라 애플리케이션이 중단되지 않아야 함. DICOM 파일은 손상된 경우가 많아 파싱을 멈추지 않고 최대한 복구하는 전략이 유리함.

- **결정 3: DataView 생성자에 의한 자연스러운 TypeError 위임** — 이유: buffer가 null인 경우 `new DataView(null)`이 자체적으로 TypeError를 발생시키므로, 별도의 null 체크를 추가하지 않고 브라우저 표준 동작에 위임. 이는 불필요한 방어 코드를 줄이고 표준 에러 메시지를 보장함.

- **결정 4: startOffset 검증 로직 추가** — 이유: EC-002 시나리오에서 remaining()이 음수를 반환하는 것을 방지하기 위해, startOffset을 Math.min/Math.max로 보정. 단, startOffset이 유효 범위를 벗어나는 것은 호출자의 버그일 수 있으므로 errors 배열에도 경고를 기록하여 디버깅을 지원함.
---

## Complexity Tracking

- **CT-001: read 메서드 내 버퍼 경계 검증 추가** — 각 read 메서드 선두에 hasRemaining() 체크를 추가하는 것은 메서드당 코드가 4~5줄 증가하므로 약간의 복잡도 증가가 발생한다. 그러나 이는 NFR-002(안정성)를 충족하기 위한 필수적인 방어 로직이며, 헬퍼 함수(`_checkBounds`)를 내부에 두어 중복을 최소화할 수 있다.

- **CT-002: 리터럴 객체 내 클로저 기반 메서드의 this 바인딩** — 현재 구현에서 read 메서드들은 리터럴 객체의 속성으로 정의되어 `this`가 올바르게 바인딩된다. 다만, 메서드를 구조 분해하거나 변수에 할당하여 호출하면 `this`가 undefined가 되는 위험이 있다. 이는 설계적 제약으로 문서화하며, 파서 모듈에서는 반드시 `ctx.readUint16()` 형태로 호출하도록 가이드한다.

- **CT-003: errors 배열의 수집 방식** — errors 배열에 단순 문자열이 아닌 구조화된 객체를 기록하는 방식은 디버깅에 유리하지만, 메모리 사용량이 증가할 수 있다. DICOM 파일은 일반적으로 수십~수백 MB이므로 errors 항목이 수십 개 이하로 유지되는 정상 파싱 시나리오에서는 문제가 되지 않는다.

---

## References
- Spec: `docs/spec-kit/01_spec.md`
- 티켓: `PLAYG-1823`
- 기존 구현: `viewer/src/data/dicomParser/ParseContext.js`
- 의존 모듈: `viewer/src/data/dicomDictionary.js` (TRANSFER_SYNTAX 상수)
- 호출처 모듈: `viewer/src/data/dicomParser/metaGroupParser.js`, `viewer/src/data/dicomParser/metadataParser.js`

# Tasks: ParseResult 타입 팩토리 (ParseResult.js)

**Ticket**: PLAYG-1818 | **Type**: Detailed Design (task)
**Branch**: feature/PLAYG-1818
**Date**: 2026-04-27 | **Spec**: docs/spec-kit/01_spec.md | **Plan**: docs/spec-kit/02_plan.md

---

## 메타데이터

| 항목 | 내용 |
|------|------|
| **총 태스크 수** | 10 |
| **예상 총 공수** | 12시간 (약 1.5일) |
| **병렬 가능 그룹** | Phase 3A / 3B / 3C 동시 진행 가능 |
| **선행 완료 필수** | Phase 1, 2 완료 후 Phase 3+ 착수 |

---

## 추적성 요약

| 요구사항 | 관련 태스크 | 검증 방법 |
|----------|-----------|----------|
| FR-1.1 (매직 바이트 검증) | T006 (호출 #2) | 단위 테스트 |
| FR-1.2 (전송 구문 검증) | T006 (호출 #3) | 단위 테스트 |
| FR-1.3 (필수 태그 검증) | T007 (호출 #4) | 단위 테스트 |
| FR-1.4 (파일 크기 검증) | T006 (호출 #1) | 단위 테스트 |
| FR-1.5 (픽셀 데이터 길이) | T007 (호출 #6~7) | 단위 테스트 |
| FR-2.3 (필수/선택 메타데이터) | T007 (호출 #5, #7) | 통합 테스트 |
| FR-3.1 (복셀 데이터 변환) | T007 (호출 #7) | 통합 테스트 |
| FR-5.1 (구조화된 에러 코드) | T003, T005 | 단위 테스트 |
| COMP-1 (DicomParser 인터페이스) | T006, T007, T008 | 통합 테스트 |

---
## Phase 1: Setup (프로젝트 인프라 준비)

> **목표**: ParseResult.js 개발에 필요한 디렉토리 구조, 테스트 환경, 모듈 스캐폴딩을 구축한다.
> **선행 조건**: 없음 (프로젝트 착수 시점)

### T001 🔀 프로젝트 디렉토리 구조 생성

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T001 |
| **병렬 가능** | 🔀 (독립 수행 가능) |
| **예상 소요** | 15분 |
| **담당** | 개발자 A |

**설명**:
ParseResult.js 모듈 및 단위 테스트 파일을 배치할 디렉토리 구조를 생성한다.
viewer/src/types/ 디렉토리가 존재하지 않으면 생성하고, viewer/tests/unit/types/ 테스트 디렉토리도 함께 생성한다.

**작업 내용**:
- viewer/src/types/ 디렉토리 생성 (없는 경우)
- viewer/tests/unit/types/ 디렉토리 생성 (없는 경우)
- .gitkeep 파일로 빈 디렉토리 추적 보장

**산출물**:
- viewer/src/types/.gitkeep
- viewer/tests/unit/types/.gitkeep

**완료 조건**:
- [ ] viewer/src/types/ 디렉토리 존재
- [ ] viewer/tests/unit/types/ 디렉토리 존재
- [ ] Git 추적 가능 상태

---

### T002 🔀 Vitest 테스트 환경 확인 및 설정

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T002 |
| **병렬 가능** | 🔀 (T001과 동시 수행 가능) |
| **예상 소요** | 30분 |
| **담당** | 개발자 A |

**설명**:
프로젝트에 Vitest가 설치되어 있는지 확인하고, ESM 모듈 테스트가 가능하도록 설정한다.
ParseResult.js는 순수 JavaScript ESM 모듈이므로 별도 빌드 없이 Vitest로 직접 테스트 가능해야 한다.

**작업 내용**:
- package.json에 vitest 의존성 존재 여부 확인
- vitest.config.js (또는 vite.config.js)에 ESM 설정 확인
- 테스트 스크립트가 viewer/tests/ 디렉토리를 스캔하는지 확인
- 필요시 vitest.config.js에 test.include 패턴 추가

**산출물**:
- 확인된/수정된 vitest.config.js (또는 vite.config.js)

**완료 조건**:
- [ ] npm test 명령이 정상 실행됨 (0개 테스트 통과도 OK)
- [ ] ESM import 구문이 테스트 파일에서 동작함
- [ ] viewer/tests/ 경로가 테스트 스캔 대상에 포함됨

---
## Phase 2: Foundational (기반 타입 및 팩토리 구현)

> **목표**: ErrorResult/ParseResult JSDoc 타입 정의와 createParseResult() 팩토리 함수를 구현한다.
> **선행 조건**: Phase 1 완료

### T003 🔒 ErrorResult JSDoc 타입 정의

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T003 |
| **병렬 가능** | 🔒 (T004 선행 필요) |
| **예상 소요** | 1시간 |
| **담당** | 개발자 A |
| **추적성** | FR-5.1 (구조화된 에러 코드) |

**설명**:
ParseResult.js 파일 상단에 ErrorResult JSDoc typedef를 정의한다.
이 타입은 파싱 과정에서 발생하는 에러/경고를 구조화된 객체로 표현하며,
UiController(COMP-6)가 사용자용 메시지와 개발자용 디버그 정보를 분리 표시할 수 있도록 설계한다.
IEC 62304 Class A 요구사항에 따라 내부 구조 노출 금지 원칙을 준수한다.

**작업 내용**:
- ErrorResult typedef 4개 필드 정의:
  - userMessage (string): 사용자에게 표시할 메시지 (FR-4.5 준수, 내부 구조 노출 금지)
  - debugInfo (string): 개발자용 디버그 정보 (디버그 모드에서만 활용)
  - errorCode (string): PARSE_ERR_* 접두사 에러 코드 (예: PARSE_ERR_INVALID_MAGIC)
  - severity (string): 심각도 등급 - error 또는 warning
- 각 필드에 JSDoc @property 주석 작성
- @typedef 태그로 IDE 타입 힌트 활성화

**산출물**:
- viewer/src/types/ParseResult.js (상단 JSDoc 블록)

**완료 조건**:
- [ ] ErrorResult typedef가 4개 필드(userMessage, debugInfo, errorCode, severity)를 모두 포함
- [ ] 각 필드에 타입과 설명이 JSDoc @property로 명시됨
- [ ] IDE에서 @type {ErrorResult} 타입 힌트가 동작함

---

### T004 🔒 ParseResult JSDoc 타입 정의

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T004 |
| **병렬 가능** | 🔒 (T003 직후 수행) |
| **예상 소요** | 1시간 |
| **담당** | 개발자 A |
| **추적성** | FR-1.1~FR-1.5, FR-2.3, FR-3.1, COMP-1 |

**설명**:
ErrorResult 타입 정의 직후, ParseResult typedef를 정의한다.
이 타입은 parseDICOM(file: File) -> ParseResult 인터페이스(COMP-1)의 반환 타입으로 사용되며,
UiController(COMP-6)가 isValid 필드로 정상/오류 분기를 처리하는 계약(Contract) 역할을 수행한다.

**작업 내용**:
- ParseResult typedef 4개 필드 정의:
  - metadata (Object|null): DICOM 메타데이터 객체. 파싱 성공 시에만 할당, 초기 실패 시 null
  - voxelData (ArrayBuffer|null): 복셀 데이터. 파싱 성공 시에만 할당, 초기 실패 시 null
  - errors (Array<ErrorResult>): 파싱 오류/경고 목록. 항상 새 배열 인스턴스 보장
  - isValid (boolean): 파싱 성공 여부. true=전체 파이프라인 통과, false=어느 단계에서든 실패
- 각 필드에 JSDoc @property와 타입 주석 작성
- null 허용 필드(metadata, voxelData)에 명시적 nullable 표기

**산출물**:
- viewer/src/types/ParseResult.js (JSDoc ParseResult typedef 블록)

**완료 조건**:
- [ ] ParseResult typedef가 4개 필드(metadata, voxelData, errors, isValid)를 모두 포함
- [ ] metadata와 voxelData가 nullable(Object|null)로 명시됨
- [ ] errors가 Array<ErrorResult> 타입으로 명시됨
- [ ] isValid가 boolean 타입으로 명시됨

---

### T005 🔒 createParseResult() 팩토리 함수 구현

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T005 |
| **병렬 가능** | 🔒 (T003, T004 완료 후 수행) |
| **예상 소요** | 1.5시간 |
| **담당** | 개발자 A |
| **추적성** | FR-1.1~FR-1.5, FR-2.3, FR-3.1, FR-5.1, COMP-1 |

**설명**:
JSDoc 타입 정의 이후, createParseResult(overrides={}) 팩토리 함수를 구현한다.
IEC 62304 Class A 단순성 원칙에 따라 new 키워드 없이 순수 객체를 반환하며,
spread 연산자를 통해 불변 기본값 + 선택적 덮어쓰기 패턴을 제공한다.
parseDICOM.js의 7개 분기점에서 각기 다른 overrides를 전달하여 일관된 결과 객체를 생성한다.

**작업 내용**:
- export function createParseResult(overrides = {}) 함수 선언
- 기본값 객체 정의: { metadata: null, voxelData: null, errors: [], isValid: false }
  - 주의: errors 빈 배열은 함수 본문 내에서 매번 새로 생성되어야 함 (참조 독립성, CT-2)
- 스프레드 병합 로직: return { ...defaults, ...overrides }
- JSDoc @param {Partial<ParseResult>} overrides - 덮어쓸 선택적 필드
- JSDoc @returns {ParseResult} - 파싱 결과 객체

**산출물**:
- viewer/src/types/ParseResult.js (createParseResult 함수 본문)

**완료 조건**:
- [ ] createParseResult() 인자 없이 호출 시 기본값 객체 반환
- [ ] createParseResult({isValid:true}) 호출 시 isValid만 true로 변경, 나머지 기본값 유지
- [ ] 연속 2회 호출 시 각각 독립적인 errors 배열 참조 보장 (CT-2 해결)
- [ ] export 키워드로 ESM 모듈 export 선언

---
## Phase 3: User Stories (사용자 스토리별 구현 및 연동)

> **목표**: parseDICOM.js의 7개 호출 지점에 createParseResult()를 연동하고,
> UiController에서 isValid 분기 처리가 동작하도록 구현한다.
> **선행 조건**: Phase 2 완료 (createParseResult 함수 사용 가능)

### T006 🔀 parseDICOM.js import 및 호출 지점 #1~#3 연동 (초기 검증 단계)

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T006 |
| **병렬 가능** | 🔀 (T007과 병렬 수행 가능, 서로 다른 호출 지점) |
| **예상 소요** | 2시간 |
| **담당** | 개발자 A |
| **추적성** | FR-1.1, FR-1.2, FR-1.4 |

**설명**:
parseDICOM.js 상단에 createParseResult를 import하고,
파이프라인 초기 검증 단계의 3개 분기점에 createParseResult 호출을 연동한다.
이 단계들은 메타데이터 추출 전에 실패하므로 metadata: null, voxelData: null 상태로 반환된다.

**작업 내용**:
- parseDICOM.js 상단에 import 구문 추가:
  import { createParseResult } from "../types/ParseResult.js"
- **호출 지점 #1 - 파일 크기 초과 (FR-1.4)**:
  - 조건: file.size > 512MB (상수 MAX_FILE_SIZE)
  - 반환: createParseResult({ errors: [{ userMessage: "...", debugInfo: "...", errorCode: "PARSE_ERR_FILE_TOO_LARGE", severity: "error" }] })
  - isValid: false (기본값)
- **호출 지점 #2 - 매직 바이트 불일치 (FR-1.1)**:
  - 조건: validateMagicByte() === false
  - 반환: createParseResult({ errors: [{ ..., errorCode: "PARSE_ERR_INVALID_MAGIC", severity: "error" }] })
  - isValid: false (기본값)
- **호출 지점 #3 - 전송 구문 미지원 (FR-1.2)**:
  - 조건: validateTransferSyntax() === false
  - 반환: createParseResult({ errors: [{ ..., errorCode: "PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX", severity: "error" }] })
  - isValid: false (기본값)
- 각 호출 지점의 ErrorResult에 userMessage(사용자용)와 debugInfo(개발자용) 분리 작성

**산출물**:
- 수정된 viewer/src/data/dicomParser/parseDICOM.js (호출 지점 #1, #2, #3)

**완료 조건**:
- [ ] import { createParseResult } 구문이 parseDICOM.js 상단에 존재
- [ ] 호출 #1: 파일 크기 초과 시 createParseResult({errors:[...]}) 반환
- [ ] 호출 #2: 매직 바이트 불일치 시 createParseResult({errors:[...]}) 반환
- [ ] 호출 #3: 전송 구문 미지원 시 createParseResult({errors:[...]}) 반환
- [ ] 모든 에러의 errorCode가 PARSE_ERR_* 접두사 사용
- [ ] 모든 에러의 severity가 "error"로 설정

---

### T007 🔀 parseDICOM.js 호출 지점 #4~#7 연동 (파싱/추출 단계)

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T007 |
| **병렬 가능** | 🔀 (T006과 병렬 수행 가능, 서로 다른 호출 지점) |
| **예상 소요** | 2시간 |
| **담당** | 개발자 B |
| **추적성** | FR-1.3, FR-1.5, FR-2.3, FR-3.1 |

**설명**:
parseDICOM.js의 메타데이터 파싱 이후 단계 4개 분기점에 createParseResult 호출을 연동한다.
이 단계들은 메타데이터가 이미 추출된 상태이므로 metadata 필드를 포함하여 반환한다.

**작업 내용**:
- **호출 지점 #4 - 메타데이터 파싱 실패 (FR-1.3, FR-2.3)**:
  - 조건: parseMetadata()가 예외를 throw
  - 반환: createParseResult({ errors: [{ ..., errorCode: "PARSE_ERR_MISSING_REQUIRED_TAG", severity: "error" }] })
  - try/catch 블록에서 예외를 ErrorResult로 변환
  - isValid: false (기본값)
- **호출 지점 #5 - 필수 에러 존재 (FR-2.3)**:
  - 조건: errors 배열에 severity==="error"인 항목이 존재
  - 반환: createParseResult({ metadata, errors, isValid: false })
  - metadata는 부분적으로 추출된 상태일 수 있음
- **호출 지점 #6 - 픽셀 데이터 추출 실패 (FR-1.5, FR-3.1)**:
  - 조건: parsePixelData()가 예외를 throw
  - 반환: createParseResult({ metadata, errors: [{ ..., errorCode: "PARSE_ERR_PIXEL_DATA_EXTRACTION", severity: "error" }] })
  - metadata는 유효하지만 voxelData는 null
- **호출 지점 #7 - 정상 완료 (FR-1.1~1.5, FR-2.3, FR-3.1)**:
  - 조건: 전체 파이프라인 통과
  - 반환: createParseResult({ metadata, voxelData, errors, isValid: true })
  - errors에는 warning 항목만 포함 (severity: "warning")
  - 유일하게 isValid: true인 분기

**산출물**:
- 수정된 viewer/src/data/dicomParser/parseDICOM.js (호출 지점 #4, #5, #6, #7)

**완료 조건**:
- [ ] 호출 #4: parseMetadata() 예외 시 createParseResult로 에러 래핑
- [ ] 호출 #5: severity==="error" 항목 존재 시 isValid=false로 반환
- [ ] 호출 #6: parsePixelData() 예외 시 metadata 포함 + voxelData:null 반환
- [ ] 호출 #7: 정상 완료 시 metadata + voxelData + isValid:true 반환
- [ ] 정상 완료 경로에서만 isValid:true 보장

---

### T008 🔒 UiController isValid 분기 처리 연동

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T008 |
| **병렬 가능** | 🔒 (T006, T007 완료 후 수행) |
| **예상 소요** | 1시간 |
| **담당** | 개발자 A |
| **추적성** | COMP-1 (DicomParser 인터페이스), COMP-6 (UiController) |

**설명**:
UiController(COMP-6)가 parseDICOM()의 반환 결과(ParseResult)를 수신하여,
isValid 필드를 기준으로 정상 렌더링 경로와 에러 표시 경로를 분기 처리하도록 구현한다.
SAD에 정의된 parseDICOM(file: File) -> ParseResult 인터페이스 계약을 준수한다.

**작업 내용**:
- UiController.js에서 parseDICOM 호출 결과를 ParseResult 타입으로 수신
- isValid 분기 처리 구현:
  - isValid === true: MprRenderer(COMP-4)에 voxelData 전달, renderSlice() 호출
  - isValid === false: 사용자에게 errors[].userMessage 표시, 에러 로그 기록
- errors 배열 순회 시 severity 기준으로 error/warning 구분 표시
- ErrorResult.userMessage는 사용자 화면에 직접 출력 (FR-4.5 준수)
- ErrorResult.debugInfo는 console.debug로만 출력 (내부 구조 노출 금지)

**산출물**:
- 수정된 viewer/src/ui/UiController.js

**완료 조건**:
- [ ] isValid === true 시 MprRenderer에 parseResult가 전달됨
- [ ] isValid === false 시 사용자에게 errors[].userMessage가 표시됨
- [ ] debugInfo는 console.debug로만 출력되고 사용자 화면에 노출되지 않음
- [ ] severity==="warning" 항목은 경고 스타일로 구분 표시됨

---
## Phase 4: Integration (단위 테스트 및 통합 검증)

> **목표**: ParseResult 팩토리 함수와 parseDICOM 연동에 대한 단위/통합 테스트를 작성하고,
> 정적 분석을 통과하여 IEC 62304 Class A 추적성 매트릭스를 완성한다.
> **선행 조건**: Phase 2, Phase 3 완료

### T009 🔀 ParseResult 단위 테스트 작성

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T009 |
| **병렬 가능** | 🔀 (T008과 병렬 수행 가능) |
| **예상 소요** | 2시간 |
| **담당** | 개발자 A |
| **추적성** | T005 (createParseResult 함수) |

**설명**:
createParseResult() 팩토리 함수에 대한 포괄적인 단위 테스트를 작성한다.
Vitest 프레임워크를 사용하며, 기본값 생성, overrides 병합,
errors 배열 독립성, 엣지 케이스를 모두 검증한다.

**작업 내용**:
- 테스트 파일 생성: viewer/tests/unit/types/ParseResult.test.js
- import { createParseResult } from "../../../src/types/ParseResult.js"
- describe("createParseResult", () => { ... }) 테스트 그룹 구성
- 테스트 케이스:
  1. **기본값 생성**: 인자 없이 호출 시 { metadata: null, voxelData: null, errors: [], isValid: false } 반환
  2. **빈 객체 호출**: createParseResult({}) 도 기본값과 동일한 결과
  3. **부분 overrides - isValid만 전달**: { isValid: true } 전달 시 isValid만 true, 나머지 기본값 유지
  4. **부분 overrides - errors만 전달**: errors 배열 전달 시 해당 배열로 덮어쓰기
  5. **전체 overrides**: 4개 필드 모두 전달 시 전달한 값으로 덮어쓰기
  6. **errors 배열 독립성 (CT-2)**: 두 번 호출 후 한쪽 errors.push() 시 다른 쪽 영향 없음
  7. **null metadata**: { metadata: null } 전달 시 null 유지
  8. **ErrorResult 구조 보존**: errors에 ErrorResult 객체 추가 시 4개 필드 모두 유지
  9. **대량 errors 배열**: errors에 100개 항목 추가 시에도 정상 동작
  10. **isValid 불리언 타입**: 결과의 isValid가 항상 boolean 타입임을 검증

**산출물**:
- viewer/tests/unit/types/ParseResult.test.js

**완료 조건**:
- [ ] 10개 테스트 케이스가 모두 작성됨
- [ ] npm test 실행 시 10/10 테스트 통과
- [ ] errors 배열 독립성 테스트가 통과함 (CT-2 검증)
- [ ] 커버리지 100% (createParseResult 함수 전체 라인 커버)

---

### T010 🔒 정적 분석, 코드 리뷰 및 추적성 매트릭스 완성

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T010 |
| **병렬 가능** | 🔒 (T009 완료 후 수행, 최종 태스크) |
| **예상 소요** | 1시간 |
| **담당** | 개발자 A |
| **추적성** | 전체 (FR-1.1~FR-5.1, COMP-1, COMP-6) |

**설명**:
모든 구현이 완료된 후 ESLint 정적 분석, JSDoc 타입 일관성 검증,
IEC 62304 Class A 추적성 매트릭스를 최종 완성한다.
이 태스크는 본 티켓(PLAYG-1818)의 완료 게이트(Gate) 역할을 수행한다.

**작업 내용**:
- ESLint 실행: ParseResult.js, parseDICOM.js, UiController.js 대상
- ESLint 에러/경고 0건 확인
- JSDoc 타입 일관성 검증:
  - ErrorResult 필드가 parseDICOM.js 호출부에서 올바르게 사용됨
  - ParseResult 반환 타입이 COMP-1 인터페이스 계약과 일치함
- 최종 통합 테스트 실행: npm test 전체 통과 확인
- 추적성 매트릭스 검증:
  - FR-1.1~FR-1.5: parseDICOM.js 각 분기점과 createParseResult 호출 매핑 확인
  - FR-2.3: metadata 필드에 필수/선택 메타데이터가 올바르게 저장됨
  - FR-3.1: voxelData 필드에 복셀 데이터가 올바르게 저장됨
  - FR-5.1: ErrorResult.errorCode가 PARSE_ERR_* 코드 체계 준수
  - COMP-1: parseDICOM() -> ParseResult 인터페이스 계약 준수
- 코드 리뷰 체크리스트 작성

**산출물**:
- ESLint 통과 로그
- 추적성 매트릭스 검증 결과 (본 문서 추적성 요약 테이블 기준)

**완료 조건**:
- [ ] ESLint 에러 0건, 경고 0건
- [ ] npm test 전체 테스트 통과
- [ ] 추적성 매트릭스의 모든 FR/COMP 항목이 구현 태스크와 매핑됨
- [ ] JSDoc 타입 정의가 IDE에서 정상 인식됨
- [ ] 코드 리뷰 체크리스트 작성 완료

---
## 태스크 의존성 그래프

```
Phase 1: Setup
  T001 (디렉토리 생성) ───┐
  T002 (Vitest 설정)  ────┤
                          ├──> Phase 2
Phase 2: Foundational     │
  T003 (ErrorResult 타입) ┤
  T004 (ParseResult 타입) ┤
  T005 (팩토리 함수)   ───┤
                          ├──> Phase 3
Phase 3: User Stories     │
  T006 (호출 #1~#3)   ────┤  🔀 병렬
  T007 (호출 #4~#7)   ────┤  🔀 병렬
  T008 (UiController)  ───┤  🔒 T006+T007 완료 후
                          ├──> Phase 4
Phase 4: Integration      │
  T009 (단위 테스트)   ───┤  🔀 T008과 병렬
  T010 (정적 분석/추적성) ┘  🔒 최종 게이트
```

---

## 병렬 수행 가능 그룹

| 그룹 | 동시 수행 가능 태스크 | 비고 |
|------|---------------------|------|
| 그룹 A | T001 + T002 | Phase 1 내 병렬 |
| 그룹 B | T006 + T007 | Phase 3 내 병렬 (서로 다른 호출 지점) |
| 그룹 C | T009 // T008 | Phase 3~4 병렬 (테스트는 UI 연동과 무관) |

---

## 예상 공수 요약

| Phase | 태스크 | 예상 소요 | 누적 |
|-------|--------|----------|------|
| Phase 1: Setup | T001, T002 | 0.75시간 | 0.75시간 |
| Phase 2: Foundational | T003, T004, T005 | 3.5시간 | 4.25시간 |
| Phase 3: User Stories | T006, T007, T008 | 5시간 | 9.25시간 |
| Phase 4: Integration | T009, T010 | 3시간 | 12.25시간 |
| **합계** | **10개 태스크** | **~12시간** | **약 1.5일** |

---

## 복잡도 추적 항목 (Plan에서 식별된 위험)

| ID | 위험 항목 | 관련 태스크 | 완화 상태 |
|----|----------|-----------|----------|
| CT-1 | overrides 스프레드 병합 타입 안전성 | T005 | JSDoc 타입 힌트로 완화 |
| CT-2 | errors 배열 참조 독립성 | T005, T009 | 팩토리 함수 내 기본값 선언으로 해결 |

---

*문서 끝. 티켓 PLAYG-1818 - ParseResult 타입 팩토리 태스크 분할.*
# Implementation Plan: DentiView3D - ParseResult 타입 팩토리

**Branch**: `feature/PLAYG-1818` | **Date**: 2026-04-27 | **Spec**: `docs/spec-kit/01_spec.md`
**Ticket**: `PLAYG-1818` | **Type**: Detailed Design (task)

---

## Summary

ParseResult.js 모듈은 DICOM 파일 파싱 결과를 표준화된 객체 구조로 반환하는 타입 팩토리 모듈이다.
createParseResult() 팩토리 함수와 ParseResult/ErrorResult JSDoc 타입 정의를 제공하며,
parseDICOM.js 파이프라인의 7개 분기점에서 호출되어 파싱 결과(metadata, voxelData, errors, isValid)를
일관된 구조로 조립한다. UiController(COMP-6)는 isValid 필드를 기준으로 정상/오류 분기를 처리한다.
IEC 62304 Class A 요구사항에 따라 단순성, 추적성, 테스트 용이성을 보장한다.
---

## Technical Context

| 항목                     | 내용                    |
| ------------------------ | ----------------------- |
| **Language/Version**     | JavaScript (ES2020+), ESM 모듈 시스템 |
| **Primary Dependencies** | 없음 (순수 Vanilla JS, 제로 외부 의존성) |
| **Storage**              | 메모리 내 객체 생성 (지속성 저장 없음) |
| **Testing**              | Vitest (단위 테스트), JSDoc @typedef 기반 타입 검증 |
| **Target Platform**      | Chrome 90+ (현대 웹 브라우저) |
| **Performance Goals**    | 객체 생성 < 0.1ms (단순 팩토리), 메모리 오버헤드 최소화 |
| **Constraints**          | IEC 62304 Class A 단순성 요구, 외부 라이브러리 사용 금지, 불변 기본값 제공 |
---

## Constitution Check
*GATE: 설계 원칙(Constitution) 준수 여부 확인*

- **SOLID 원칙**: SRP 준수 - ParseResult.js는 오직 파싱 결과 객체 생성이라는 단일 책임만 수행. OCP 준수 - overrides 확장 포인트로 새로운 필드 추가 시 함수 수정 불필요.
- **레이어 분리**: Business Logic Layer의 타입 정의 모듈로서, DicomParser(COMP-1)가 생성한 결과를 Presentation Layer(UiController, MprRenderer)로 전달하는 계층 간 계약(Contract) 역할 수행.
- **에러 처리 전략**: errors 배열에 ErrorResult[] 타입으로 구조화된 에러를 누적 저장. severity 필드로 error/warning 등급을 구분하여 UiController에서 분기 처리 가능.
- **보안 고려사항**: ParseResult 자체는 PHI 데이터를 직접 다루지 않으나, metadata 객체에 포함된 PHI 필드는 PhiGuard(COMP-5)에서 이미 마스킹 처리된 상태로 전달받음. debugInfo 필드는 내부 구조 노출 금지 원칙(FR-4.5)에 따라 사용자 메시지와 분리 저장.

---

## Project Structure

### Documentation
```text
docs/
├── spec-kit/
│   ├── 01_spec.md          # ParseResult 타입 팩토리 명세서
│   ├── 02_plan.md          # 본 문서 (이행 계획서)
│   └── 03_tasks.md         # 작업 분할 구조 (WBS)
├── artifacts/
│   ├── SRS.md              # 소프트웨어 요구사항 명세서
│   ├── SAD.md              # 소프트웨어 아키텍처 명세서
│   ├── SystemRequirement.md # 시스템 요구사항
│   └── _draft_context.md   # 초안 컨텍스트
└── viewer/                 # 소스코드 루트
```

### Source Code
```text
viewer/src/
├── types/
│   └── ParseResult.js      # ParseResult 타입 팩토리 (본 구현 대상)
├── data/
│   └── dicomParser/
│       ├── parseDICOM.js   # createParseResult() 7회 호출 (COMP-1)
│       ├── validateMagicByte.js
│       ├── validateTransferSyntax.js
│       ├── metaGroupParser.js
│       ├── metadataParser.js
│       ├── pixelDataParser.js
│       ├── handleParseError.js
│       └── constants.js
├── errors/
│   └── CBVError.js         # ParseError 클래스 정의
├── ui/
│   └── UiController.js     # isValid 분기 처리 (COMP-6)
└── security/
    └── PhiGuard.js         # PHI 마스킹 처리 (COMP-5)
```

### Test Code
```text
viewer/tests/
└── unit/
    └── types/
        └── ParseResult.test.js   # createParseResult 단위 테스트
```


---

## Implementation Approach

### Phase 순서 및 접근 방식

1. **Phase 1 - JSDoc 타입 정의 (ErrorResult, ParseResult)**
   - ErrorResult typedef: userMessage, debugInfo, errorCode, severity 4개 필드 정의
   - ParseResult typedef: metadata, voxelData, errors, isValid 4개 필드 정의
   - 모든 필드에 JSDoc @property와 타입 주석 작성
   - 추적성: FR-5.1 (구조화된 에러 코드)과 연계

2. **Phase 2 - createParseResult() 팩토리 함수 구현**
   - 기본값 객체 { metadata: null, voxelData: null, errors: [], isValid: false } 정의
   - overrides 스프레드 병합 로직 구현
   - 방어적 복사: errors 배열은 항상 새 배열 참조 보장
   - 추적성: FR-1.1~FR-1.5, FR-2.3, FR-3.1 검증 결과를 표준 구조로 래핑

3. **Phase 3 - parseDICOM.js 연동 검증**
   - parseDICOM.js 내 7개 createParseResult() 호출 지점 확인:
     - (1) 파일 크기 초과 시: errors + isValid=false
     - (2) 매직 바이트 불일치 시: errors + isValid=false
     - (3) 전송 구문 미지원 시: errors + isValid=false
     - (4) 메타데이터 파싱 실패 시: errors + isValid=false
     - (5) 필수 에러 존재 시: metadata + errors + isValid=false
     - (6) 픽셀 데이터 추출 실패 시: metadata + errors + isValid=false
     - (7) 정상 완료 시: metadata + voxelData + errors + isValid=true
   - UiController(COMP-6)에서 result.isValid 분기 확인

4. **Phase 4 - 단위 테스트 작성**
   - 기본값 생성 테스트 (인자 없이 호출)
   - overrides 병합 테스트 (부분/전체 필드 덮어쓰기)
   - errors 배열 독립성 테스트 (참조 분리 검증)
   - isValid 불리언 타입 검증
   - 엣지 케이스: 빈 객체, null 메타데이터, 대량 errors 배열

5. **Phase 5 - 정적 분석 및 코드 리뷰**
   - ESLint 통과 확인
   - JSDoc 타입 일관성 검증
   - IEC 62304 Class A 추적성 매트릭스 업데이트


### Key Technical Decisions

- **결정 1: 팩토리 함수 패턴 채택 (createClass 대신 createParseResult)**
  - 이유: IEC 62304 Class A 단순성 원칙에 부합. new 키워드 없이 순수 객체 반환으로
    프로토타입 체인 복잡성을 제거하고, 테스트가 직관적이며, 메모리 오버헤드가 최소화됨.
    spread 연산자를 통한 불변 기본값 + 선택적 덮어쓰기 패턴은 파싱 파이프라인의
    다양한 분기점에서 일관된 결과 생성을 보장함.

- **결정 2: errors 배열을 ErrorResult[] 타입으로 구조화**
  - 이유: FR-5.1 (구조화된 에러 코드) 요구사항 충족. 단순 문자열 배열 대신
    userMessage, debugInfo, errorCode, severity를 포함한 구조화된 객체 배열로
    설계하여 UiController에서 사용자용/개발자용 메시지 분리 표시가 가능함.
    severity 필드는 error/warning 등급 구분으로 필수 에러와 경고를 명확히 분리함.

- **결정 3: JSDoc @typedef 기반 타입 정의 (TypeScript 대신)**
  - 이유: 프로젝트가 순수 JavaScript ESM 환경이며, IEC 62304 Class A 요구사항에 따라
    빌드 파이프라인(컴파일 단계) 추가를 최소화해야 함. JSDoc @typedef는 IDE 지원과
    Vitest 테스트에서 타입 힌트를 제공하면서도 별도 컴파일 없이 브라우저에서
    직접 실행 가능함.

- **결정 4: metadata 필드에 null 허용 (옵셔널)**
  - 이유: DICOM 파일 파싱 초기 단계(매직 바이트 불일치, 전송 구문 미지원)에서는
    메타데이터를 추출하기 전에 실패가 발생할 수 있음. 이 경우 metadata: null로
    설정하고 errors에 원인을 기록하여 UiController가 유효하지 않은 결과를
    명확히 식별할 수 있도록 함.


---

## Detailed API Specification

### createParseResult(overrides?)

팩토리 함수 시그니처 및 동작 명세:

```javascript
// 함수 시그니처
export function createParseResult(overrides = {}) {...}

// 기본 반환 객체
{
  metadata: null,       // Object | null - DICOM 메타데이터 (성공 시에만 할당)
  voxelData: null,      // ArrayBuffer | null - 복셀 데이터 (성공 시에만 할당)
  errors: [],           // ErrorResult[] - 파싱 오류/경고 목록
  isValid: false,       // boolean - 파싱 성공 여부
}

// overrides 스프레드 병합 규칙
return { ...defaults, ...overrides };
```

### ErrorResult 타입 구조

```javascript
/** @typedef {Object} ErrorResult */
{
  userMessage: string,   // 사용자에게 표시할 메시지 (FR-4.5 준수)
  debugInfo: string,     // 개발자용 디버그 정보 (내부 구조 노출 금지)
  errorCode: string,     // PARSE_ERR_* 에러 코드 (FR-5.1 준수)
  severity: string,      // 'error' | 'warning' 심각도 등급
}
```

### parseDICOM.js 호출 지점 매핑

| # | 호출 위치 | 조건 | overrides | isValid | 추적 FR |
|---|----------|------|-----------|---------|---------|
| 1 | 파일 크기 초과 | file.size > 512MB | errors:[PARSE_ERR_FILE_TOO_LARGE] | false | FR-1.4 |
| 2 | 매직 바이트 불일치 | !validateMagicByte() | errors:[PARSE_ERR_INVALID_MAGIC] | false | FR-1.1 |
| 3 | 전송 구문 미지원 | !validateTransferSyntax() | errors:[PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX] | false | FR-1.2 |
| 4 | 메타데이터 파싱 실패 | parseMetadata() throw | errors:[PARSE_ERR_MISSING_REQUIRED_TAG] | false | FR-1.3, FR-2.3 |
| 5 | 필수 에러 존재 | severity==='error' | metadata, errors | false | FR-2.3 |
| 6 | 픽셀 데이터 추출 실패 | parsePixelData() throw | metadata, errors | false | FR-1.5, FR-3.1 |
| 7 | 정상 완료 | 전체 파이프라인 통과 | metadata, voxelData, errors, isValid=true | true | FR-1.1~1.5, FR-2.3, FR-3.1 |


---

## Complexity Tracking

- **CT-1: overrides 스프레드 병합의 타입 안전성**
  JavaScript 환경에서 런타임 타입 검증이 없으므로, 잘못된 타입의 overrides가
  전달될 위험이 있음. JSDoc @typedef와 IDE 타입 힌트로 컴파일 타임 경고를 제공하며,
  팩토리 함수 내에서는 타입 검증을 수행하지 않는 대신 호출부(parseDICOM.js)에서
  올바른 타입의 값을 전달하도록 설계. IEC 62304 Class A의 단순성 원칙에 부여함.

- **CT-2: errors 배열 참조 독립성**
  기본값 `errors: []`을 함수 본문 내에 정의하여 매 호출 시 새 배열 인스턴스를
  생성함. 이전 호출의 errors 배열이后续 호출에 영향을 주는 공유 참조 문제를
  원천 차단함. 팩토리 함수 패턴이 이 문제를 자연스럽게 해결함.


---

## Traceability Matrix (추적성 매트릭스)

### 요구사항 -> 구현 매핑

| 요구사항 ID | 요구사항 명칭 | ParseResult.js 매핑 | 검증 방법 |
|------------|-------------|---------------------|----------|
| FR-1.1 | DICOM 매직 바이트 검증 | isValid=false 반환 (호출 #2) | 단위 테스트 |
| FR-1.2 | 전송 구문 검증 | isValid=false 반환 (호출 #3) | 단위 테스트 |
| FR-1.3 | 필수 DICOM 태그 검증 | isValid=false 반환 (호출 #4) | 단위 테스트 |
| FR-1.4 | 파일 크기 사전 검증 | isValid=false 반환 (호출 #1) | 단위 테스트 |
| FR-1.5 | 픽셀 데이터 길이 검증 | errors에 warning 추가 (호출 #6~7) | 단위 테스트 |
| FR-2.3 | 필수/선택 메타데이터 추출 | metadata 필드에 저장 | 통합 테스트 |
| FR-3.1 | 복셀 데이터 타입 변환 | voxelData 필드에 저장 | 통합 테스트 |
| FR-5.1 | 구조화된 에러 코드 | ErrorResult.errorCode 필드 | 단위 테스트 |
| COMP-1 | DicomParser 인터페이스 | parseDICOM()->ParseResult 계약 | 통합 테스트 |

### 컴포넌트 인터페이스 준수

| 인터페이스 | 사양 | ParseResult.js 역할 | 준수 여부 |
|-----------|------|---------------------|----------|
| parseDICOM(file)->ParseResult | SAD COMP-1 | 반환 타입 정의 및 팩토리 제공 | 준수 |
| renderSlice(viewport,data,idx) | SAD COMP-4 | voxelData 전달 구조 보장 | 준수 |
| handleError(code)->UserMessage | SAD COMP-7 | ErrorResult.userMessage 필드 제공 | 준수 |


---

## Test Strategy

### 단위 테스트 (ParseResult.test.js)

| 테스트 케이스 | 설명 | 기대 결과 |
|--------------|------|----------|
| 기본값 생성 | createParseResult() 인자 없이 호출 | {metadata:null, voxelData:null, errors:[], isValid:false} |
| 부분 overrides | {isValid:true} 만 전달 | isValid=true, 나머지 기본값 유지 |
| 전체 overrides | 모든 필드 전달 | 전달한 값으로 덮어쓰기 |
| errors 배열 독립성 | 두 번 호출 후 한쪽 errors 수정 | 다른 쪽 errors 영향 없음 |
| null metadata | {metadata:null} 전달 | metadata 필드 null 유지 |
| 빈 errors | {errors:[]} 전달 | 빈 배열 (기본값과 동일) |
| ErrorResult 구조 | errors에 ErrorResult 객체 추가 | userMessage, debugInfo, errorCode, severity 모두 유지 |

### 통합 테스트 (parseDICOM.test.js 연동)

| 테스트 케이스 | 설명 | 검증 항목 |
|--------------|------|----------|
| 정상 파일 파싱 | 유효한 DICOM 파일 | isValid=true, metadata!=null, voxelData!=null |
| 매직 바이트 오류 | 비-DICOM 파일 | isValid=false, errors[0].errorCode='PARSE_ERR_INVALID_MAGIC' |
| 파일 크기 초과 | 512MB+ 파일 | isValid=false, errors[0].errorCode='PARSE_ERR_FILE_TOO_LARGE' |
| 전송 구문 미지원 | 압축 DICOM | isValid=false, errors[0].errorCode='PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX' |


---

## Risk Assessment

| 위험 요소 | 확률 | 영향도 | 완화 대책 |
|----------|------|-------|----------|
| overrides에 잘못된 타입 전달 | 낮음 | 중간 | JSDoc 타입 힌트 + 코드 리뷰 |
| errors 배열 공유 참조 문제 | 없음 | 높음 | 팩토리 함수 내 기본값 선언으로 자연 해결 |
| 새로운 필드 추가 요구 | 중간 | 낮음 | spread 패턴으로 확장 용이 |
| parseDICOM.js 리팩토링 시 호출부 불일치 | 낮음 | 높음 | 7개 호출 지점 문서화 및 테스트 커버리지 |


---

## References

- Spec: `docs/spec-kit/01_spec.md`
- 티켓: `PLAYG-1818`
- 소스: `viewer/src/types/ParseResult.js`
- 호출부: `viewer/src/data/dicomParser/parseDICOM.js`
- 관련 문서: `docs/artifacts/SRS.md`, `docs/artifacts/SAD.md`
- 표준: IEC 62304:2006+A1:2015, DICOM PS3.5, DICOM PS3.10

# Implementation Plan: CBVError 에러 클래스 계층

**Branch**: `feature/PLAYG-1819` | **Date**: 2026-04-27 | **Spec**: `docs/spec-kit/01_spec.md`
**Ticket**: `PLAYG-1819` | **Type**: Detailed Design (SDS-2.1)

---

## Summary

DentiView3D 웹 기반 CBCT 영상 뷰어의 전체 오류 분류 체계를 제공하는 커스텀 에러 클래스 계층을 구현한다.
CBVError 기본 클래스(Error 상속)와 5개 하위 클래스(ParseError, ValidationError, RenderError, SecurityError, MemoryError)를
정의하여 일관된 에러 처리 인터페이스를 제공한다. IEC 62304 Class A 요구사항에 따라 구조화된 에러 코드와 추적 가능한
에러 정보를 보장하며, PHI 정보 보호 및 내부 구조 노출 방지 등 보안 제약을 준수한다.
모든 에러는 handleParseError.js를 통해 ErrorResult({userMessage, debugInfo, errorCode, severity}) 객체로 변환되어
ParseResult.errors 배열에 포함된다.

---

## Technical Context

| 항목                     | 내용                                                    |
| ------------------------ | ------------------------------------------------------- |
| **Language/Version**     | JavaScript (ES6+), ECMAScript 2020 호환                  |
| **Primary Dependencies** | 없음 (순수 JavaScript, 외부 런타임 의존성 없음)            |
| **Storage**              | 해당 없음 (에러 클래스 계층, 상태 저장 없음)               |
| **Testing**              | Jest (단위 테스트), ESLint (정적 분석)                     |
| **Target Platform**      | 웹 브라우저 (Chrome, Firefox, Edge 최신 2버전)             |
| **Performance Goals**    | 에러 객체 생성 < 1ms, 프로토타입 체인 검증 오버헤드 최소화 |
| **Constraints**          | IEC 62304 Class A 준수, PHI 포함 금지, 내부 구조 노출 금지 |

---

## Constitution Check
*GATE: 설계 원칙(Constitution) 준수 여부 확인*

- **SOLID 원칙**:
  - **단일 책임 원칙(SRP)**: 각 에러 클래스는 단일 오류 범주(파싱/검증/렌더링/보안/메모리)만 담당한다.
  - **개방-폐쇄 원칙(OCP)**: CBVError 기본 클래스를 상속하여 새로운 에러 유형을 확장 가능하며, 기본 클래스 수정이 불필요하다.
  - **리스코프 치환 원칙(LSP)**: 모든 하위 클래스는 CBVError 및 Error의 instanceof 체인을 유지하여 기대 동작을 보장한다.
  - **의존성 역전 원칙(DIP)**: constants.js의 ERROR_CODES를 통해 에러 코드 정의를 추상화하고, 구체적인 코드값에 대한 직접 의존을 최소화한다.
- **레이어 분리**: 에러 클래스 계층은 순수 도메인 모델로서 프레젠테이션 계층(UI)과 데이터 계층(파서) 모두에서 독립적으로 사용 가능하다. ErrorResult 변환은 handleParseError.js가 담당하여 에러 정의와 에러 표현을 분리한다.
- **에러 처리 전략**: 계층적 에러 분류(base -> specific) + 구조화된 에러 코드( PREFIX_XXX ) + ErrorResult 변환 패턴을 채택한다. 모든 에러는 catch 블록에서 타입 기반 분기(instanceof)로 처리 가능하다.
- **보안 고려사항**:
  - context 객체에 PHI(보호대상건강정보: 환자명, 환자ID, 생년월일 등) 포함을 절대 금지한다.
  - ErrorResult.userMessage에는 offset, tag 경로, buffer 주소 등 내부 파싱 구조 정보를 노출하지 않는다.
  - SecurityError는 보안 위반 내용이 사용자 메시지에 노출되지 않도록 별도 검증 로직을 포함한다.
  - debugInfo는 개발 환경에서만 접근 가능하도록 환경 변수 기반 게이트를 적용한다.

---

## Project Structure

### Documentation
```text
docs/
├── spec-kit/
│   ├── 01_spec.md              # 제품 명세서 (CBVError 에러 클래스 계층)
│   ├── 02_plan.md              # 구현 계획서 (본 문서)
│   └── 03_tasks.md             # 태스크 분해 (향후 작성)
└── artifacts/
    ├── SRS.md                  # 소프트웨어 요구사항 명세서
    └── SAD.md                  # 소프트웨어 아키텍처 설계
```

### Source Code
```text
viewer/src/
├── errors/
│   ├── CBVError.js             # CBVError 기본 클래스 + 5개 하위 클래스 (본 구현 대상)
│   └── handleParseError.js     # CBVError -> ErrorResult 변환 핸들러
├── constants/
│   └── constants.js            # ERROR_CODES, ERROR_MESSAGES, SEVERITY_LEVELS 정의
└── parsers/
    ├── ParseResult.js          # 파싱 결과 타입 (errors 배열 포함)
    ├── parseDICOM.js           # DICOM 파싱 파이프라인 (ParseError 발생)
    ├── pixelDataParser.js      # 픽셀 데이터 파서 (ParseError 발생)
    └── metadataParser.js       # 메타데이터 파서 (ParseError 발생)

viewer/tests/
└── unit/
    └── errors/
        └── CBVError.test.js    # CBVError 계층 단위 테스트
```

---

## Implementation Approach

### Phase 순서 및 접근 방식

#### Phase 1: Setup (사전 준비)
- constants.js의 ERROR_CODES 객체에 CBVError 계층에서 사용할 모든 에러 코드가 정의되어 있는지 확인한다.
  이미 정의된 코드: PARSE_ERR_INVALID_MAGIC, PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX, PARSE_ERR_MISSING_REQUIRED_TAG,
  PARSE_ERR_PIXEL_DATA_EXTRACTION, PARSE_ERR_FILE_READ, PARSE_ERR_FILE_TOO_LARGE, PARSE_ERR_UNEXPECTED,
  VALIDATE_001, RENDER_001, SECURITY_001, MEMORY_001
- CBV_000 (기본 에러 코드)이 constants.js에 정의되어 있지 않다면 추가 필요 [NEEDS CLARIFICATION: CBV_000이 constants.js에 이미 정의되어 있는지 확인 필요]
- Jest 테스트 환경이 viewer/ 프로젝트에 설정되어 있는지 확인한다.

#### Phase 2: Core Implementation (핵심 구현)

**Step 2-1: CBVError 기본 클래스 구현**
```javascript
class CBVError extends Error {
  constructor(message, code = 'CBV_000', context = {}) {
    super(message);
    this.name = 'CBVError';
    this.code = code;
    this.context = context;
  }
}
```
- `Object.setPrototypeOf` 또는 `Reflect.setPrototypeOf`를 사용하지 않고 ES6 클래스 상속으로 프로토타입 체인을 자동 설정한다.
- `instanceof CBVError`, `instanceof Error` 모두 `true`를 반환해야 한다.
- `context` 매개변수 기본값을 `{}`로 설정하여 호출부에서 생략 가능하도록 한다.

**Step 2-2: ParseError 하위 클래스 구현**
```javascript
class ParseError extends CBVError {
  constructor(message, code = 'PARSE_ERR_UNEXPECTED', context = {}) {
    super(message, code, context);
    this.name = 'ParseError';
  }
}
```
- 기본 에러 코드를 PARSE_ERR_UNEXPECTED로 설정하여 코드 미지정 시 catch-all 동작을 보장한다.
- 7종 파싱 에러 코드(PARSE_ERR_INVALID_MAGIC 등)는 constants.js에서 import하여 생성자에 전달한다.
- context에 누락된 태그 정보, 파일 크기, 전송 구문 등 파싱 관련 메타데이터를 포함할 수 있으나,
  PHI 정보(환자명, 환자ID, 생년월일)는 절대 포함하지 않는다.

**Step 2-3: ValidationError 하위 클래스 구현**
```javascript
class ValidationError extends CBVError {
  constructor(message, code = 'VALIDATE_001', context = {}) {
    super(message, code, context);
    this.name = 'ValidationError';
  }
}
```

**Step 2-4: RenderError 하위 클래스 구현**
```javascript
class RenderError extends CBVError {
  constructor(message, code = 'RENDER_001', context = {}) {
    super(message, code, context);
    this.name = 'RenderError';
  }
}
```

**Step 2-5: SecurityError 하위 클래스 구현**
```javascript
class SecurityError extends CBVError {
  constructor(message, code = 'SECURITY_001', context = {}) {
    super(message, code, context);
    this.name = 'SecurityError';
  }
}
```
- 생성자 내부에서 context에 PHI 필드가 포함되었는지 검증하고, 포함된 경우 해당 필드를 제거하는 안전장치를 고려한다.

**Step 2-6: MemoryError 하위 클래스 구현**
```javascript
class MemoryError extends CBVError {
  constructor(message, code = 'MEMORY_001', context = {}) {
    super(message, code, context);
    this.name = 'MemoryError';
  }
}
```

**Step 2-7: 모듈 내보내기**
```javascript
export { CBVError, ParseError, ValidationError, RenderError, SecurityError, MemoryError };
```
- 단일 파일(CBVError.js)에 모든 클래스를 정의하고 명명된 export로 일괄 공개한다.
- 파일 크기가 작고(예상 100~150줄) 클래스 간 강한 응집도를 고려할 때 단일 파일이 적절하다.

#### Phase 3: Testing (테스트 구현)

**테스트 파일**: viewer/tests/unit/errors/CBVError.test.js

| 테스트 ID | 테스트 항목 | 검증 내용 |
|-----------|------------|-----------|
| T-01 | CBVError 기본 생성 | message='테스트', name='CBVError', code='CBV_000', context={} 확인 |
| T-02 | CBVError 커스텀 코드 | code='CUSTOM_001' 전달 시 정상 설정 확인 |
| T-03 | CBVError instanceof 체인 | error instanceof Error === true 확인 |
| T-04 | ParseError 기본 생성 | name='ParseError', code='PARSE_ERR_UNEXPECTED' 확인 |
| T-05 | ParseError + PARSE_ERR_INVALID_MAGIC | 에러 코드 정상 설정 확인 |
| T-06 | ParseError + PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX | 에러 코드 정상 설정 확인 |
| T-07 | ParseError + PARSE_ERR_MISSING_REQUIRED_TAG | 에러 코드 + context.tag 확인 |
| T-08 | ParseError + PARSE_ERR_PIXEL_DATA_EXTRACTION | 에러 코드 정상 설정 확인 |
| T-09 | ParseError + PARSE_ERR_FILE_READ | 에러 코드 정상 설정 확인 |
| T-10 | ParseError + PARSE_ERR_FILE_TOO_LARGE | 에러 코드 + context.fileSize 확인 |
| T-11 | ParseError + PARSE_ERR_UNEXPECTED | 에러 코드 + context.originalError 확인 |
| T-12 | ParseError instanceof 체인 | instanceof ParseError, CBVError, Error 모두 true |
| T-13 | ValidationError 생성 | name='ValidationError', code='VALIDATE_001' 확인 |
| T-14 | ValidationError instanceof | instanceof CBVError, Error 모두 true |
| T-15 | RenderError 생성 | name='RenderError', code='RENDER_001' 확인 |
| T-16 | RenderError instanceof | instanceof CBVError, Error 모두 true |
| T-17 | SecurityError 생성 | name='SecurityError', code='SECURITY_001' 확인 |
| T-18 | SecurityError PHI 필터링 | context에 PHI 필드 포함 시 제거/차단 확인 |
| T-19 | SecurityError instanceof | instanceof CBVError, Error 모두 true |
| T-20 | MemoryError 생성 | name='MemoryError', code='MEMORY_001' 확인 |
| T-21 | MemoryError instanceof | instanceof CBVError, Error 모두 true |
| T-22 | context PHI 미포함 검증 | 모든 에러 context에 환자명/ID/생년월일 미포함 확인 |
| T-23 | 에러 코드 constants.js 일치 | 각 클래스 기본 코드가 ERROR_CODES에 존재하는지 확인 |

#### Phase 4: Integration (연동 검증)
- handleParseError.js에서 CBVError 계열 에러를 ErrorResult로 정상 변환하는지 확인한다.
- ParseResult.js의 errors 배열에 에러가 정상 포함되는지 확인한다.
- parseDICOM.js 파이프라인에서 ParseError 발생 시 전체 흐름이 명세대로 동작하는지 통합 테스트를 수행한다.
- ErrorResult.userMessage에 내부 구조 정보(offset, tag, buffer)가 노출되지 않는지 검증한다.

### Key Technical Decisions

- **결정 1: 단일 파일에 모든 에러 클래스를 배치**
  - 이유: 6개 클래스의 총 코드량이 100~150줄 수준으로 작으며, 클래스 간 강한 응집도(동일한 상속 계층, 동일한 생성자 패턴)를 가진다.
  파일 분리 시 import/export 오버헤드만 증가하고 유지보수 이점이 미미하다.
  다만, 향후 에러 클래스가 10개 이상으로 확장되면 파일 분리를 재검토한다.

- **결정 2: ES6 class extends를 사용한 프로토타입 체인 구성**
  - 이유: Babel 트랜스파일 없이도 최신 브라우저에서 ES6 클래스 상속이 완벽하게 동작한다.
  `Object.setPrototypeOf(this, NewType.prototype)` 같은 수동 체인 조작은 가독성이 떨어지고 유지보수가 어렵다.
  ES6 class extends를 사용하면 `instanceof` 검사가 모든 상위 클래스에 대해 자동으로 true를 반환한다.

- **결정 3: 에러 코드를 constants.js에서 중앙 관리**
  - 이유: IEC 62304 Class A 추적성 요구사항에 따라 모든 에러 코드는 단일 소스(constants.js)에서 관리되어야 한다.
  에러 코드의 중복 정의를 방지하고, 코드-메시지 매핑을 일원화한다.

- **결정 4: 생성자 context 기본값으로 빈 객체 {} 사용**
  - 이유: context 없이 생성된 에러도 `error.context.xxx` 접근 시 TypeError가 발생하지 않도록 안전한 기본값을 제공한다.
  null 또는 undefined를 기본값으로 사용하면 하위 소비자(handleParseError.js 등)에서 null 체크가 추가로 필요하다.

- **결정 5: SecurityError에 PHI 필터링 안전장치 미적용 (명세 수준에서만 제약 명시)**
  - 이유: PHI 필터링은 에러 클래스 생성자가 아닌 handleParseError.js의 ErrorResult 변환 단계에서 수행하는 것이 더 적절하다.
  에러 클래스는 원인 정보를 충실하게 보존하고, 표현 계층(ErrorResult)에서 보안 필터링을 적용하는 것이 관심사 분리 원칙에 부합한다.
  단, SecurityError의 context에는 근본적으로 PHI를 포함하지 않도록 호출부에서 주의해야 한다.

---

## Complexity Tracking

- **CT-01: 단일 파일 내 6개 클래스 정의**
  - 복잡도: 낮음
  - 정당성: 총 코드량 100~150줄 예상, 모든 클래스가 동일한 생성자 패턴을 공유하므로 인지 부하가 낮음.
  에러 클래스 확장 시에만 파일 분리를 고려한다.

- **CT-02: constants.js 의존성 방향**
  - 복잡도: 낮음
  - 정당성: CBVError.js는 constants.js의 ERROR_CODES를 읽기 전용으로 참조한다.
  순환 의존성이 발생하지 않도록 constants.js는 CBVError.js를 import하지 않아야 한다.
  [NEEDS CLARIFICATION: constants.js가 현재 CBVError.js를 import하고 있는지 확인 필요 - 순환 의존성 방지]

- **CT-03: handleParseError.js 연동 시점**
  - 복잡도: 보통
  - 정당성: CBVError.js 자체는 handleParseError.js를 직접 호출하지 않는다.
  handleParseError.js가 CBVError를 import하여 ErrorResult로 변환하는 단방향 의존성이다.
  ErrorResult 변환 로직은 본 태스크 범위 외이나, 인터페이스 호환성은 Phase 4에서 검증한다.

- **CT-04: IEC 62304 Class A 추적성 요구사항**
  - 복잡도: 보통
  - 정당성: 각 에러 클래스와 에러 코드를 SRS FR-xx 및 HAZ-xx와 매핑하여 양방향 추적성을 보장해야 한다.
  추적성 매트릭스는 01_spec.md 4.4절에 정의되어 있으며, 단위 테스트에서 각 에러 코드의 존재 여부를 검증한다.

---

## References

- Spec: `docs/spec-kit/01_spec.md`
- 티켓: `PLAYG-1819`
- 관련 문서:
  - `docs/artifacts/SRS.md` (소프트웨어 요구사항 명세서, PLAYG-1460)
  - `docs/artifacts/SAD.md` (소프트웨어 아키텍처 설계, PLAYG-1766)
  - `docs/artifacts/SystemRequirement.md` (시스템 요구사항)
- 구현 대상 파일: `viewer/src/errors/CBVError.js`
- 연동 모듈:
  - `viewer/src/errors/handleParseError.js` (에러 변환 핸들러)
  - `viewer/src/constants/constants.js` (에러 코드 정의)
  - `viewer/src/parsers/ParseResult.js` (파싱 결과 타입)
  - `viewer/src/parsers/parseDICOM.js` (DICOM 파싱 파이프라인)
  - `viewer/src/parsers/pixelDataParser.js` (픽셀 데이터 파서)
  - `viewer/src/parsers/metadataParser.js` (메타데이터 파서)

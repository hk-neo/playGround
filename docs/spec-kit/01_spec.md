# SDS-1.3 ParseResult 타입 팩토리 (ParseResult.js) 명세서

> **티켓**: PLAYG-1818  
> **유형**: Detailed Design (Task)  
> **우선순위**: Medium  
> **버전**: 1.0.0  
> **작성일**: 2026-04-27  
> **추적성**: FR-1.1 ~ FR-1.5, FR-2.3, FR-3.1 | COMP-1 (DicomParser) | SAD 인터페이스 parseDICOM(file:File) → ParseResult

---

## 1. 모듈 개요

### 1.1 모듈 식별

| 항목 | 내용 |
|------|------|
| **파일 경로** | `viewer/src/types/ParseResult.js` |
| **모듈명** | ParseResult 타입 팩토리 |
| **계층** | Business Logic Layer |
| **소속 컴포넌트** | COMP-1 (DicomParser) 핵심 데이터 구조 |
| **IEC 62304 등급** | Class A |

### 1.2 모듈 목적

`ParseResult.js`는 DICOM 파일 파싱 결과를 표준화된 구조로 캡슐화하는 **타입 정의 및 팩토리 함수 모듈**이다. `parseDICOM()` 파이프라인의 반환 타입으로 사용되며, 모든 에러 경로(매직바이트 불일치, 전송구문 미지원, 필수태그 누락, 파일크기 초과, 픽셀데이터 추출 실패, 예외)에서 동일한 `ParseResult` 구조를 반환하여 호출측(UiController)이 결과 처리 로직을 단순화한다.

### 1.3 설계 원칙

- **일관성**: 성공/부분성공/실패 모든 경로에서 동일한 구조 반환
- **불변성**: 팩토리로 생성 후 프로퍼티는 읽기 전용으로 사용
- **확장성**: 새로운 프로퍼티 추가 시 기본값만 수정하면 되는 구조
- **안전성**: IEC 62304 Class A 요구사항에 따른 명확한 에러 추적

---

## 2. 데이터 구조 정의

### 2.1 ParseResult 타입

DICOM 파싱 결과를 표준화하는 최상위 반환 타입이다.

```
@typedef {Object} ParseResult
@property {Object|null} metadata - DICOM 메타데이터 객체
@property {ArrayBuffer|null} voxelData - 3차원 복셀 데이터
@property {ErrorResult[]} errors - 오류/경고 목록
@property {boolean} isValid - 파싱 전체 성공 여부
```

#### 2.1.1 metadata (Object|null)

| 항목 | 설명 |
|------|------|
| **타입** | `Object` 또는 `null` |
| **설명** | DICOM 메타데이터 객체로 환자정보, 영상파라미터 등을 포함 |
| **정상 완료 시** | 환자정보, 스터디 정보, 영상 파라미터(행/열/슬라이스 수, 픽셀 스페이싱, BitsAllocated 등)를 포함한 전체 메타데이터 |
| **중간 에러 발생 시** | 에러 발생 지점까지 파싱된 부분 메타데이터 또는 `null` |
| **관련 요구사항** | FR-2.3 (필수/선택 메타데이터 추출) |

#### 2.1.2 voxelData (ArrayBuffer|null)

| 항목 | 설명 |
|------|------|
| **타입** | `ArrayBuffer` 또는 `null` |
| **설명** | 3차원 복셀 데이터. Int16Array/Uint16Array 등 타입 변환 전 원시 ArrayBuffer |
| **정상 완료 시** | 전체 복셀 데이터가 담긴 ArrayBuffer |
| **픽셀 추출 실패 시** | `null` |
| **관련 요구사항** | FR-3.1 (복셀데이터 타입 변환) |

#### 2.1.3 errors (ErrorResult[])

| 항목 | 설명 |
|------|------|
| **타입** | `ErrorResult[]` (배열) |
| **설명** | 오류/경고 목록. 다중 에러 누적 가능 |
| **기본값** | 빈 배열 `[]` |
| **관련 요구사항** | FR-1.1 ~ FR-1.5 (파일 입력 및 검증) |

#### 2.1.4 isValid (boolean)

| 항목 | 설명 |
|------|------|
| **타입** | `boolean` |
| **설명** | 파싱 전체 성공 여부 |
| **`true` 조건** | (1) `errors`에 `severity='error'`인 항목이 없고, (2) `metadata`가 `null`이 아니며, (3) `voxelData`가 `null`이 아닌 경우 |
| **`false` 조건** | 위 조건 중 하나라도 충족되지 않으면 `false` |

### 2.2 ErrorResult 타입

개별 오류/경고 항목을 표현하는 타입이다.

```
@typedef {Object} ErrorResult
@property {string} userMessage - 사용자용 메시지 (한국어)
@property {string} debugInfo - 개발자용 디버그 정보
@property {string} errorCode - 에러 코드 (PARSE_ERR_* 계열)
@property {string} severity - 심각도 ('error' | 'warning')
```

#### 2.2.1 userMessage (string)

| 항목 | 설명 |
|------|------|
| **타입** | `string` |
| **설명** | 최종 사용자에게 표시되는 메시지. 한국어로 작성 |
| **예시** | "파일이 DICOM 형식이 아닙니다", "파일 크기가 500MB를 초과합니다" |

#### 2.2.2 debugInfo (string)

| 항목 | 설명 |
|------|------|
| **타입** | `string` |
| **설명** | 개발자 디버깅용 상세 정보. 파일 오프셋, 예상값/실제값 등 |
| **예시** | "Offset 132: expected 'DICM', got 'XXXX'" |

#### 2.2.3 errorCode (string)

| 항목 | 설명 |
|------|------|
| **타입** | `string` |
| **설명** | PARSE_ERR_* 계열의 표준화된 에러 코드 |
| **정의된 코드** | 아래 에러 코드 매핑 테이블 참조 |

#### 2.2.4 severity (string)

| 항목 | 설명 |
|------|------|
| **타입** | `'error'` 또는 `'warning'` |
| **설명** | `error`는 isValid를 `false`로 만드는 치명 오류, `warning`은 경고 |

### 2.3 에러 코드 매핑 테이블

| 에러 코드 | 호출 지점 | severity | userMessage | 추적성 |
|-----------|----------|----------|-------------|--------|
| `PARSE_ERR_FILE_TOO_LARGE` | 파일크기초과(1) | error | "파일 크기가 500MB를 초과합니다" | FR-1.4 |
| `PARSE_ERR_INVALID_MAGIC` | 매직바이트불일치(2) | error | "파일이 DICOM 형식이 아닙니다" | FR-1.1 |
| `PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX` | 전송구문미지원(3) | error | "지원하지 않는 전송 구문입니다" | FR-1.2 |
| `PARSE_ERR_METADATA_PARSE_FAILED` | 메타데이터파싱실패(4) | error | "DICOM 메타데이터를 파싱할 수 없습니다" | FR-2.3 |
| `PARSE_ERR_MISSING_REQUIRED_TAG` | 필수에러감지(5) | error | "필수 DICOM 태그가 누락되었습니다" | FR-1.3 |
| `PARSE_ERR_PIXEL_DATA_EXTRACTION_FAILED` | 픽셀데이터추출실패(6) | error | "픽셀 데이터를 추출할 수 없습니다" | FR-3.1 |
| `PARSE_WARN_PARTIAL_METADATA` | 부분파싱경고 | warning | "일부 메타데이터만 파싱되었습니다" | FR-2.3 |

---

## 3. 팩토리 함수 설계

### 3.1 createParseResult(overrides)

```
createParseResult(overrides = {}) -> ParseResult
```

| 항목 | 내용 |
|------|------|
| **함수명** | `createParseResult` |
| **매개변수** | `overrides` (Object, 기본값 `{}`) |
| **반환값** | `ParseResult` 객체 |
| **내보내기** | `export function createParseResult(overrides = {})` |

#### 3.1.1 기본값 정의

```javascript
const DEFAULTS = {
  metadata: null,
  voxelData: null,
  errors: [],
  isValid: false
};
```

#### 3.1.2 병합 로직

```javascript
export function createParseResult(overrides = {}) {
  return { ...DEFAULTS, ...overrides };
}
```

- 스프레드 연산자(`...`)를 사용하여 `DEFAULTS`에 `overrides`를 병합
- `overrides`에 지정되지 않은 프로퍼티는 `DEFAULTS` 값 사용
- **얕은 복사(shallow copy)** 수행 — `errors` 배열은 호출측에서 새로 전달해야 함

#### 3.1.3 설계 장점

1. **확장성**: 새로운 프로퍼티 추가 시 `DEFAULTS`만 수정하면 됨
2. **편의성**: 호출측에서 필요한 필드만 부분 전달 가능
3. **일관성**: 모든 호출 지점에서 동일한 구조 보장

### 3.2 사용 패턴

#### 3.2.1 에러 결과 생성 (parseDICOM.js 호출 지점)

```javascript
// 파일 크기 초과 (호출 1)
return createParseResult({
  errors: [{ userMessage: '...', debugInfo: '...', errorCode: 'PARSE_ERR_FILE_TOO_LARGE', severity: 'error' }],
  isValid: false
});

// 매직 바이트 불일치 (호출 2)
return createParseResult({
  errors: [{ userMessage: '...', debugInfo: '...', errorCode: 'PARSE_ERR_INVALID_MAGIC', severity: 'error' }],
  isValid: false
});
```

#### 3.2.2 성공 결과 생성 (호출 7)

```javascript
return createParseResult({
  metadata: parsedMetadata,
  voxelData: extractedVoxelData,
  errors: [],
  isValid: true
});
```

---

## 4. 소비 컴포넌트 연동

### 4.1 parseDICOM.js — 7개 호출 지점

| # | 호출 지점 | 전달 필드 | 에러 코드 | 추적성 |
|---|----------|----------|-----------|--------|
| 1 | 파일크기초과 | errors, isValid=false | PARSE_ERR_FILE_TOO_LARGE | FR-1.4 |
| 2 | 매직바이트불일치 | errors, isValid=false | PARSE_ERR_INVALID_MAGIC | FR-1.1 |
| 3 | 전송구문미지원 | errors, isValid=false | PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX | FR-1.2 |
| 4 | 메타데이터파싱실패 | errors, metadata=partial|null, isValid=false | PARSE_ERR_METADATA_PARSE_FAILED | FR-2.3 |
| 5 | 필수에러감지 | errors, metadata, isValid=false | PARSE_ERR_MISSING_REQUIRED_TAG | FR-1.3 |
| 6 | 픽셀데이터추출실패 | errors, metadata, voxelData=null, isValid=false | PARSE_ERR_PIXEL_DATA_EXTRACTION_FAILED | FR-3.1 |
| 7 | 최종성공결과조립 | metadata, voxelData, errors=[], isValid=true | — | FR-1.1~FR-3.1 |

### 4.2 UiController — isValid 분기

```
UiController가 parseDICOM(file) 결과를 수신:
  → parseResult.isValid === true
    → MprRenderer.buildVolumeData(parseResult) 호출
    → 3단면(Axial/Coronal/Sagittal) MPR 렌더링
  → parseResult.isValid === false
    → ErrorManager로 parseResult.errors[0].userMessage 표시
    → 사용자가 다른 파일 선택 가능 (NFR-7: 에러 후에도 정상 동작 유지)
```

---

## 5. 추적성 매트릭스

| 기능 요구사항 | 본 모듈 관련 사항 | 검증 방법 |
|--------------|-------------------|----------|
| FR-1.1 (DICOM 형식 검증) | 매직바이트 불일치 시 PARSE_ERR_INVALID_MAGIC 에러 반환 | 단위 테스트 |
| FR-1.2 (전송구문 지원) | 미지원 전송구문 시 PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX 에러 반환 | 단위 테스트 |
| FR-1.3 (필수태그 검증) | 필수태그 누락 시 PARSE_ERR_MISSING_REQUIRED_TAG 에러 반환 | 단위 테스트 |
| FR-1.4 (파일크기 제한) | 크기 초과 시 PARSE_ERR_FILE_TOO_LARGE 에러 반환 | 단위 테스트 |
| FR-1.5 (파일 입출력) | ParseResult 구조를 통해 모든 에러 경로 표준화 | 통합 테스트 |
| FR-2.3 (메타데이터 추출) | metadata 프로퍼티에 파싱된 메타데이터 저장 | 단위 테스트 |
| FR-3.1 (복셀데이터 변환) | voxelData 프로퍼티에 원시 ArrayBuffer 저장 | 단위 테스트 |

| SAD 인터페이스 | 본 모듈 역할 |
|---------------|-------------|
| parseDICOM(file:File) → ParseResult | ParseResult 타입 정의 및 팩토리 제공 |

| 컴포넌트 | 관계 |
|---------|------|
| COMP-1 (DicomParser) | 본 모듈이 COMP-1의 핵심 데이터 구조를 정의 |
| COMP-6 (UiController) | ParseResult.isValid로 성공/실패 분기 |
| COMP-7 (ErrorManager) | ErrorResult.errorCode로 사용자 메시지 변환 |

---

## 6. 제약사항 및 가정

### 6.1 제약사항

- **JSDoc 전용**: TypeScript가 아닌 JSDoc 기반 타입 정의 사용 (IEC 62304 Class A 단순성 요구)
- **얕은 복사**: `createParseResult`는 얕은 복사만 수행. `errors` 배열의 불변성은 호출측에서 보장
- **순수 함수**: 팩토리 함수는 부수 효과가 없는 순수 함수로 설계
- **네트워크 없음**: 오프라인 전용 아키텍처로 외부 의존성 없음

### 6.2 가정

- parseDICOM.js는 본 모듈을 `import`하여 사용
- UiController는 parseDICOM의 반환값이 항상 ParseResult 구조임을 보장받음
- ErrorManager가 모든 PARSE_ERR_* 코드에 대한 사용자 메시지를 사전 정의함
- 브라우저 환경에서만 동작 (Node.js 환경 미지원)

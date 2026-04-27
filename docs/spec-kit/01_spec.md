# 제품 명세서 (Product Specification)

**프로젝트**: DentiView3D - 웹 기반 CBCT 영상 뷰어
**모듈**: CBVError 에러 클래스 계층 (viewer/src/errors/CBVError.js)
**버전**: 0.1.0 | 작성일: 2026-04-27
**추적 티켓**: PLAYG-1819
**소프트웨어 안전 등급**: IEC 62304 Class A

---

## 1. 모듈 개요

### 1.1 목적

DentiView3D 애플리케이션의 전체 오류 분류 체계를 제공하는 커스텀 에러 클래스 계층을 정의한다.
모든 커스텀 에러는 CBVError 기본 클래스를 상속받아 일관된 에러 처리 인터페이스를 제공하며,
IEC 62304 Class A 요구사항에 따라 구조화된 에러 코드와 추적 가능한 에러 정보를 보장한다.

### 1.2 파일 경로

- **메인 파일**: viewer/src/errors/CBVError.js
- **연동 모듈**:
  - viewer/src/errors/handleParseError.js (에러 변환 핸들러)
  - viewer/src/constants/constants.js (에러 코드/메시지 정의)
  - viewer/src/parsers/ParseResult.js (결과 타입)
  - viewer/src/parsers/parseDICOM.js (DICOM 파싱 파이프라인)
  - viewer/src/parsers/pixelDataParser.js (픽셀 데이터 파서)
  - viewer/src/parsers/metadataParser.js (메타데이터 파서)

### 1.3 참조 문서

| 문서 | 티켓 키 | 설명 |
|------|---------|------|
| SRS | PLAYG-1460 | 소프트웨어 요구사항 명세서 |
| SAD | PLAYG-1766 | 소프트웨어 아키텍처 설계 |
| RMR | PLAYG-1459 | 위험 관리 보고서 (17개 Hazard) |
---

## 2. User Scenarios & Testing

### US-1: DICOM 파일 파싱 중 매직 바이트 불일치 에러 발생

- **우선순위**: P1 (필수)
- **관련 요구사항**: FR-1.1
- **사용자 스토리**:
  사용자가 비 DICOM 파일을 로드하려 할 때, parseDICOM.js가 매직 바이트 검증에 실패하여
  ParseError(PARSE_ERR_INVALID_MAGIC)를 발생시킨다. handleParseError()가 이를 ErrorResult로 변환하고,
  사용자에게 유효한 DICOM 파일이 아닙니다. 메시지가 표시된다.
- **테스트 조건**:
  1. new ParseError() 생성 시 error instanceof ParseError === true
  2. error instanceof CBVError === true
  3. error instanceof Error === true (프로토타입 체인 유지)
  4. error.code === PARSE_ERR_INVALID_MAGIC
  5. error.name === ParseError
  6. context에 PHI 정보가 포함되지 않았는지 확인

### US-2: 미지원 전송 구문 파일 로드 시 에러 처리

- **우선순위**: P1 (필수)
- **관련 요구사항**: FR-1.2
- **사용자 스토리**:
  JPEG 압축 DICOM 파일을 로드할 때, 전송 구문 검증이 실패하여
  ParseError(PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX)가 발생한다.
  사용자에게 지원하지 않는 전송 구문입니다. 메시지가 표시된다.
- **테스트 조건**:
  1. new ParseError() 생성 시 에러 코드 PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX 확인
  2. ErrorResult 변환 시 userMessage에 내부 구조(offset, tag 등)가 노출되지 않는지 확인

### US-3: 필수 DICOM 태그 누락 검증 에러

- **우선순위**: P1 (필수)
- **관련 요구사항**: FR-1.3
- **사용자 스토리**:
  DICOM 파일에서 Rows, Columns, BitsAllocated, PixelRepresentation 필수 태그가 누락된 경우
  ParseError(PARSE_ERR_MISSING_REQUIRED_TAG)가 발생하고, 사용자에게 필수 태그 누락 메시지가 표시된다.
- **테스트 조건**:
  1. new ParseError() 생성 시 에러 코드 PARSE_ERR_MISSING_REQUIRED_TAG 확인
  2. context.tag 필드에 누락된 태그 정보가 포함되는지 확인
  3. context.tag에 PHI 정보(환자명 등)가 포함되지 않는지 확인

### US-4: 픽셀 데이터 추출 실패 에러

- **우선순위**: P1 (필수)
- **관련 요구사항**: FR-1.5
- **사용자 스토리**:
  pixelDataParser.js에서 픽셀 데이터 추출에 실패할 때
  ParseError(PARSE_ERR_PIXEL_DATA_EXTRACTION)가 발생한다.
  메타데이터 명시 길이와 실제 길이 불일치 시에도 해당 에러가 발생한다.
- **테스트 조건**:
  1. error.code === PARSE_ERR_PIXEL_DATA_EXTRACTION 확인
  2. ParseResult.errors 배열에 해당 에러가 포함되는지 확인
### US-5: 파일 크기 초과 에러 처리

- **우선순위**: P1 (필수)
- **관련 요구사항**: FR-1.4
- **사용자 스토리**:
  512MB 초과 파일 로드 시 메모리 로딩 전에 파일 크기 검증이 실패하여
  ParseError(PARSE_ERR_FILE_TOO_LARGE)가 발생한다. 브라우저 크래시를 방지한다.
- **테스트 조건**:
  1. error.code === PARSE_ERR_FILE_TOO_LARGE 확인
  2. context.fileSize에 파일 크기 정보가 포함되는지 확인
  3. 에러 발생 후에도 애플리케이션이 정상 동작하는지 확인 (NFR-7)

### US-6: 파일 읽기 실패 에러 처리

- **우선순위**: P1 (필수)
- **관련 요구사항**: FR-5.1
- **사용자 스토리**:
  FileReader가 파일을 읽지 못할 때 ParseError(PARSE_ERR_FILE_READ)가 발생한다.
  사용자에게 파일을 읽을 수 없습니다. 메시지가 표시된다.
- **테스트 조건**:
  1. error.code === PARSE_ERR_FILE_READ 확인
  2. error instanceof ParseError === true
  3. error instanceof CBVError === true

### US-7: 데이터 검증 오류 (ValidationError)

- **우선순위**: P2 (보통)
- **관련 요구사항**: FR-1.2, FR-4.2
- **사용자 스토리**:
  메타데이터 필수 태그 검증 또는 데이터 일관성 검증이 실패할 때
  ValidationError가 발생한다. 데이터 무결성 검증 실패를 사용자에게 안내한다.
- **테스트 조건**:
  1. new ValidationError() 생성 시 error instanceof ValidationError === true
  2. error instanceof CBVError === true
  3. error.name === ValidationError
  4. error.code === VALIDATE_001
  5. context에 검증 실패 상세 정보가 포함되는지 확인

### US-8: 렌더링 오류 (RenderError)

- **우선순위**: P2 (보통)
- **관련 요구사항**: FR-2.5, HAZ-1.3
- **사용자 스토리**:
  MPR 렌더링, WL/WW 변환, 캔버스 출력 중 오류가 발생할 때
  RenderError가 발생한다. 렌더링 실패 시 안전한 대체 동작을 수행한다.
- **테스트 조건**:
  1. new RenderError() 생성 시 error instanceof RenderError === true
  2. error instanceof CBVError === true
  3. error.name === RenderError
  4. error.code === RENDER_001
  5. 렌더링 실패 후에도 애플리케이션이 응답 불능이 되지 않는지 확인
### US-9: 보안 정책 위반 에러 (SecurityError)

- **우선순위**: P2 (보통)
- **관련 요구사항**: FR-5.1, HAZ-3.1
- **사용자 스토리**:
  PHI 보호 정책 위반이나 비인가 데이터 접근 시도가 감지될 때
  SecurityError가 발생한다. 보안 위반 내용이 사용자 메시지에 노출되지 않도록 한다.
- **테스트 조건**:
  1. new SecurityError() 생성 시 error instanceof SecurityError === true
  2. error instanceof CBVError === true
  3. error.code === SECURITY_001
  4. context에 민감 정보(PHI)가 절대 포함되지 않는지 확인
  5. 사용자 메시지에 내부 보안 구조가 노출되지 않는지 확인

### US-10: 메모리 초과 에러 (MemoryError)

- **우선순위**: P2 (보통)
- **관련 요구사항**: FR-1.6, HAZ-5.1
- **사용자 스토리**:
  대용량 DICOM 파일 로딩 또는 볼륨 데이터 구성 중 메모리가 고갈될 때
  MemoryError가 발생한다. 브라우저 크래시를 방지하고 안전하게 에러를 처리한다.
- **테스트 조건**:
  1. new MemoryError() 생성 시 error instanceof MemoryError === true
  2. error instanceof CBVError === true
  3. error.name === MemoryError
  4. error.code === MEMORY_001
  5. 에러 발생 후 메모리가 적절히 해제되는지 확인

### US-11: CBVError 기본 클래스 인스턴스 생성

- **우선순위**: P1 (필수)
- **관련 요구사항**: FR-5.1
- **사용자 스토리**:
  분류되지 않은 예외적 오류 발생 시 CBVError 기본 클래스를 직접 사용하여
  일반적인 커스텀 에러를 생성한다.
- **테스트 조건**:
  1. new CBVError(알 수 없는 오류) 생성 시 기본값 확인
  2. error.name === CBVError
  3. error.code === CBV_000
  4. error.context가 빈 객체 {} 인지 확인
  5. error.message === 알 수 없는 오류

### US-12: 예상치 못한 파싱 에러 (PARSE_ERR_UNEXPECTED)

- **우선순위**: P3 (낮음)
- **관련 요구사항**: FR-5.1
- **사용자 스토리**:
  분류되지 않은 예외적 파싱 오류 발생 시 ParseError(PARSE_ERR_UNEXPECTED)가 발생한다.
  catch-all 에러 코드로 처리하여 애플리케이션이 중단되지 않도록 한다.
- **테스트 조건**:
  1. error.code === PARSE_ERR_UNEXPECTED 확인
  2. error instanceof ParseError === true
  3. 내부 에러 원인이 context.originalError에 보존되는지 확인
---

## 3. Requirements

### 3.1 기능 요구사항

#### FR-ERR-01: CBVError 기본 클래스 정의

- **설명**: 모든 커스텀 에러의 기본이 되는 CBVError 클래스를 정의한다.
- **상속**: Error 클래스를 상속
- **속성**:
  - message (string): Error 상속, 사용자용 에러 메시지
  - name (string): 클래스 식별명 (기본값: CBVError)
  - code (string): 기계적 에러 코드 (기본값: CBV_000)
  - context (Object): 추가 컨텍스트 정보 (기본값: {})
- **생성자**: constructor(message, code, context)
  - message 인수는 필수
  - code 생략 시 CBV_000 사용
  - context 생략 시 빈 객체 {} 사용
- **프로토타입 체인**: Error 프로토타입 체인을 유지하여 instanceof 검사를 지원
- **추적 ID**: -

#### FR-ERR-02: ParseError 클래스 정의

- **설명**: DICOM 파일 파싱 오류를 표현하는 클래스
- **상속**: CBVError
- **기본 코드**: PARSE_001
- **추적 ID**: FR-1.5, HAZ-1.1
- **사용 위치**: parseDICOM.js, pixelDataParser.js, metadataParser.js
- **에러 코드 체계** (constants.js ERROR_CODES와 일치):
  - PARSE_ERR_INVALID_MAGIC: 매직 바이트 불일치 (FR-1.1)
  - PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX: 미지원 전송 구문 (FR-1.2)
  - PARSE_ERR_MISSING_REQUIRED_TAG: 필수 태그 누락 (FR-1.3)
  - PARSE_ERR_PIXEL_DATA_EXTRACTION: 픽셀 데이터 추출 실패 (FR-1.5)
  - PARSE_ERR_FILE_READ: 파일 읽기 실패
  - PARSE_ERR_FILE_TOO_LARGE: 파일 크기 초과 (FR-1.4)
  - PARSE_ERR_UNEXPECTED: 예상치 못한 파싱 오류
- **처리 흐름**: ParseError 발생 -> handleParseError()로 ErrorResult 변환 -> ParseResult.errors에 포함

#### FR-ERR-03: ValidationError 클래스 정의

- **설명**: 데이터 검증 오류를 표현하는 클래스
- **상속**: CBVError
- **기본 코드**: VALIDATE_001
- **추적 ID**: FR-1.2, FR-4.2
- **사용 위치**: 메타데이터 필수 태그 검증, 데이터 일관성 검증
- **발생 조건**:
  - 파일 형식 검증 실패 (FR-1.2)
  - 데이터 무결성 검증 실패 (FR-4.2)

#### FR-ERR-04: RenderError 클래스 정의

- **설명**: 렌더링 오류를 표현하는 클래스
- **상속**: CBVError
- **기본 코드**: RENDER_001
- **추적 ID**: FR-2.5, HAZ-1.3
- **사용 위치**: MPR 렌더링, WL/WW 변환, 캔버스 출력
- **발생 조건**:
  - MPR 뷰포트 렌더링 실패 (FR-2.5)
  - WL/WW 변환 오류
  - Canvas 2D API 출력 오류
#### FR-ERR-05: SecurityError 클래스 정의

- **설명**: 보안 정책 위반을 표현하는 클래스
- **상속**: CBVError
- **기본 코드**: SECURITY_001
- **추적 ID**: FR-5.1, HAZ-3.1
- **사용 위치**: PHI 보호, 데이터 접근 제어
- **발생 조건**:
  - PHI 데이터 비인가 접근 시도 (HAZ-3.1)
  - 보안 정책 위반 (FR-5.1)
- **제약**: context에 민감 정보(PHI) 포함 절대 금지

#### FR-ERR-06: MemoryError 클래스 정의

- **설명**: 메모리 초과 오류를 표현하는 클래스
- **상속**: CBVError
- **기본 코드**: MEMORY_001
- **추적 ID**: FR-1.6, HAZ-5.1
- **사용 위치**: 대용량 DICOM 파일 로딩, 볼륨 데이터 구성
- **발생 조건**:
  - 대용량 파일 로딩 중 메모리 고갈 (FR-1.6)
  - 볼륨 데이터 구성 중 메모리 부족 (HAZ-5.1)

#### FR-ERR-07: ErrorResult 출력 인터페이스

- **설명**: 모든 CBVError 계열 에러는 handleParseError()를 통해 ErrorResult 객체로 변환된다.
- **출력 객체 구조**:
  - userMessage (string): 사용자 친화적 에러 메시지 (내부 구조 노출 금지)
  - debugInfo (string): 디버그용 상세 정보 (개발 환경에서만 사용)
  - errorCode (string): 기계적 에러 코드
  - severity (string): 에러 심각도 수준
- **제약**: userMessage에는 offset, tag, buffer 위치 등 내부 파싱 구조 정보를 포함하지 않는다 (FR-4.5)

### 3.2 비기능 요구사항

#### NFR-ERR-01: 프로토타입 체인 유지

- **설명**: 모든 에러 클래스는 Error 프로토타입 체인을 유지해야 한다.
- **검증 방법**: 하위 클래스 인스턴스에 대해 instanceof CBVError, instanceof Error 모두 true를 반환해야 한다.
- **근거**: 표준 JavaScript 에러 처리 패턴 준수, catch 블록에서 타입 기반 분기 가능

#### NFR-ERR-02: PHI 정보 보호

- **설명**: context 객체에 민감 정보(PHI)를 포함해서는 안 된다.
- **검증 방법**: 모든 에러 클래스의 context 필드에 환자명, 환자ID, 생년월일 등이 포함되지 않았는지 단위 테스트로 검증
- **근거**: HAZ-3.1, FR-4.5

#### NFR-ERR-03: 에러 코드 일관성

- **설명**: 모든 에러 코드는 constants.js의 ERROR_CODES에 정의된 값과 일치해야 한다.
- **검증 방법**: 하위 클래스에서 사용하는 에러 코드가 ERROR_CODES에 존재하는지 확인
- **근거**: FR-5.1, ErrorManager(COMP-7) 연동

#### NFR-ERR-04: 사용자 메시지 안전성

- **설명**: 사용자에게 표시되는 에러 메시지는 내부 구조(오프셋, 태그 경로, 버퍼 주소 등)를 노출하지 않아야 한다.
- **검증 방법**: ErrorResult.userMessage에 내부 식별자가 포함되지 않았는지 정규식으로 검증
- **근거**: FR-4.5, HAZ-3.1
---

## 4. Success Criteria

### 4.1 기능 검증 기준

| ID | 검증 항목 | 검증 방법 | 합격 기준 |
|----|-----------|-----------|-----------|
| SC-1 | CBVError 기본 클래스 생성 | 단위 테스트 | message, name, code, context 속성이 명세대로 설정됨 |
| SC-2 | 프로토타입 체인 | 단위 테스트 | 모든 하위 클래스 인스턴스가 instanceof Error, instanceof CBVError, instanceof (하위클래스) 모두 true |
| SC-3 | ParseError 에러 코드 전체 커버 | 단위 테스트 | 7종 에러 코드 모두 생성 가능 |
| SC-4 | ValidationError 생성 | 단위 테스트 | name=ValidationError, code=VALIDATE_001 확인 |
| SC-5 | RenderError 생성 | 단위 테스트 | name=RenderError, code=RENDER_001 확인 |
| SC-6 | SecurityError 생성 | 단위 테스트 | name=SecurityError, code=SECURITY_001 확인 |
| SC-7 | MemoryError 생성 | 단위 테스트 | name=MemoryError, code=MEMORY_001 확인 |
| SC-8 | ErrorResult 변환 | 통합 테스트 | CBVError -> handleParseError() -> ErrorResult 변환 정상 동작 |
| SC-9 | ParseResult.errors 포함 | 통합 테스트 | 발생한 에러가 ParseResult.errors 배열에 포함됨 |

### 4.2 보안 검증 기준

| ID | 검증 항목 | 검증 방법 | 합격 기준 |
|----|-----------|-----------|-----------|
| SC-10 | context PHI 미포함 | 단위 테스트 | 모든 에러 context에 환자명/ID/생년월일 미포함 |
| SC-11 | userMessage 내부 구조 미노출 | 단위 테스트 | ErrorResult.userMessage에 offset/tag/buffer 정보 미포함 |
| SC-12 | SecurityError 민감 정보 차단 | 단위 테스트 | SecurityError context에 PHI 정보 절대 포함 안 함 |

### 4.3 IEC 62304 Class A 준수 기준

| ID | 검증 항목 | 검증 방법 | 합격 기준 |
|----|-----------|-----------|-----------|
| SC-13 | 요구사항 추적성 | 문서 검토 | 모든 FR-ERR-xx가 SRS FR-xx와 양방향 추적 가능 |
| SC-14 | Hazard 추적성 | 문서 검토 | 모든 에러 클래스가 관련 Hazard(HAZ-xx)와 매핑됨 |
| SC-15 | 단위 테스트 커버리지 | 정적 분석 | CBVError.js에 대한 단위 테스트 100% 커버리지 |
| SC-16 | 정적 분석 통과 | 정적 분석 | ESLint 등 정적 분석 도구에서 경고 없음 |

### 4.4 클래스 계층 구조 요약

| 클래스명 | 부모 | 기본 코드 | 추적 ID | 용도 |
|----------|------|-----------|---------|------|
| CBVError | Error | CBV_000 | - | 모든 커스텀 에러의 기본 클래스 |
| ParseError | CBVError | PARSE_001 | FR-1.5, HAZ-1.1 | DICOM 파일 파싱 오류 |
| ValidationError | CBVError | VALIDATE_001 | FR-1.2, FR-4.2 | 데이터 검증 오류 |
| RenderError | CBVError | RENDER_001 | FR-2.5, HAZ-1.3 | 렌더링 오류 |
| SecurityError | CBVError | SECURITY_001 | FR-5.1, HAZ-3.1 | 보안 정책 위반 |
| MemoryError | CBVError | MEMORY_001 | FR-1.6, HAZ-5.1 | 메모리 초과 오류 |

### 4.5 모듈 연동 인터페이스 요약

| 인터페이스 | 방향 | 연동 모듈 | 설명 |
|------------|------|-----------|------|
| 파싱 예외 입력 | 수신 | parseDICOM.js | DICOM 파싱 파이프라인에서 발생하는 예외 상황 |
| ErrorResult 출력 | 송신 | handleParseError.js | 에러를 ErrorResult 객체로 변환 |
| ERROR_CODES 참조 | 수신 | constants.js | 에러 코드 및 메시지 정의 조회 |
| ParseResult.errors 포함 | 송신 | ParseResult.js | 파싱 결과의 에러 배열에 에러 포함 |
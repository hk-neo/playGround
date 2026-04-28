# 기술 이행 계획서 (Implementation Plan)

**프로젝트**: DentiView3D - validateTransferSyntax() 전송구문검증
**티켓**: PLAYG-1822 | **SDS 섹션**: SDS-3.3
**상태**: Draft | **작성일**: 2026-04-28
**안전 등급**: IEC 62304 Class A
**Feature Branch**: PLAYG-1822-validate-transfer-syntax

---

## 1. 요약 (Summary)

본 문서는 DentiView3D 프로젝트의 ValidationModule(COMP-2)에 속한
`validateTransferSyntax()` 함수의 구현 계획을 정의한다.
이 함수는 DICOM 파일 메타 정보에서 추출한 전송 구문 UID가
시스템에서 지원하는 3종 비압축 인코딩 방식인지 검증하고,
유효한 경우 ParseContext에 VR 모드 및 바이트 오더를 설정한다.
IEC 62304 Class A 안전 등급 요구사항에 따라
모든 실행 경로에서 명시적 boolean 반환과 예외 미발생을 보장해야 한다.

**핵심 구현 범위:**
- `validateTransferSyntax(transferSyntaxUID: string): boolean` 함수 구현
- SUPPORTED_TRANSFER_SYNTAXES 상수 기반 UID 검증 로직
- ParseContext 객체에 VR 모드(Explicit/Implicit) 및 바이트 오더(Little/Big Endian) 설정
- 미지원/null/빈값 입력 시 PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX 에러 처리
- 단위 테스트 TC-3.3.1 ~ TC-3.3.7 작성
---

## 2. 기술적 컨텍스트 (Technical Context)

### 2.1 참조 문서 및 추적성

| 참조 문서 | 티켓 | 관련 섹션 | 본 계획과의 관계 |
|-----------|------|-----------|-----------------|
| SRS | PLAYG-1460 | FR-1.2 | 전송 구문 검증 기능 요구사항의 출처 |
| SAD | PLAYG-1766 | COMP-2, 인터페이스 정의 | ValidationModule 아키텍처 명세 |
| Spec | PLAYG-1822 | 01_spec.md | 기능 명세서 (User Story, Edge Case, DoD) |

### 2.2 상위 컴포넌트 관계

```
DicomParser (COMP-1)
  |
  +-- validateMagicByte()     [선행 단계]
  +-- parseMetaGroup()        [메타 정보 추출]
  +-- validateTransferSyntax() ** <-- 본 구현 대상
  +-- parseMetadata()         [후행 단계]
  +-- parsePixelData()        [후행 단계]
```

- **호출 위치**: DicomParser.parseDICOM() 내에서 validateMagicByte() 통과 후,
  parseMetadata() 호출 전에 실행
- **입력**: parseMetaGroup()에서 추출한 transferSyntaxUID (string)
- **출력**: boolean (true=유효, false=무효)
- **부수 효과**: 유효 시 ParseContext.vrMode, ParseContext.byteOrder 설정;
  무효 시 ErrorManager.handleError() 호출 및 ParseResult.errors에 에러 추가

### 2.3 기존 코드 자산 현황

이미 구현되어 본 작업에서 활용 가능한 자산:

| 파일 경로 | 내용 | 활용 방안 |
|-----------|------|-----------|
| src/data/dicomDictionary.js | TRANSFER_SYNTAX 상수, SUPPORTED_TRANSFER_SYNTAXES Set, lookupVR() | 전송 구문 UID 상수 및 사전 참조 |
| src/data/dicomParser/index.js | validateTransferSyntax re-export 선언 | 배럴 파일 이미 준비됨 |
| src/types/ParseResult.js | createParseResult() | 에러 결과 객체 생성에 활용 |
| src/types/DICOMMetadata.js | createDICOMMetadata() | transferSyntax 필드 포함 |
| src/errors/CBVError.js | ValidationError 클래스 | 검증 에러 발생 시 활용 |

### 2.4 IEC 62304 Class A 요구사항

- 모든 실행 경로에서 명시적 반환값(boolean) 보장
- Uncaught exception 발생 없음 보장
- 단위 테스트로 모든 경로 검증 (TC-3.3.1 ~ TC-3.3.7)
- 입력 검증, 경계 조건 처리, 에러 핸들링 최우선 설계
---

## 3. 컨스티튜션 체크 (Constitution Check)

본 구현이 프로젝트 아키텍처 원칙(SAD [SAD-01])을 준수하는지 검증한다.

| 원칙 | 준수 여부 | 근거 |
|------|-----------|------|
| 단일 책임 원칙 (SRP) | 준수 | validateTransferSyntax()는 전송 구문 UID 검증이라는 단일 책임만 수행. VR 모드/바이트 오더 설정은 검증 성공의 직접적 부수효과로서 동일 책임 범위 내 |
| 관심사 분리 (SoC) | 준수 | 검증 로직은 ValidationModule(COMP-2)에 캡슐화되며, DicomParser(COMP-1)는 호출만 담당. 에러 메시지 생성은 ErrorManager(COMP-7)에 위임 |
| 정보 은폐 (Information Hiding) | 준수 | SUPPORTED_TRANSFER_SYNTAXES 상수는 dicomDictionary.js에 캡슐화되고, 외부에는 boolean 반환값만 노출 |
| 안전 우선 설계 (Safety First) | 준수 | null/undefined/빈값 등 모든 비정상 입력에 대해 false 반환 및 에러 코드 기록. 예외 발생 없이 boolean 보장 |
| 오프라인 전용 (Offline Only) | 준수 | 네트워크 통신 없이 로컬 메모리 상에서만 동작 |

**결론**: 모든 아키텍처 원칙을 준수한다. 추가 검토 항목 없음.
---

## 4. 프로젝트 구조 (Project Structure)

### 4.1 변경 대상 파일 목록

```
viewer/
  src/
    data/
      dicomParser/
        validateTransferSyntax.js    [수정] 핵심 구현 파일
        constants.js                  [참조] ERROR_CODES 상수 활용
        parseDICOM.js                 [참조] 호출 컨텍스트 확인
      dicomDictionary.js              [참조] SUPPORTED_TRANSFER_SYNTAXES, TRANSFER_SYNTAX
    types/
      ParseResult.js                  [참조] 에러 결과 생성
    errors/
      CBVError.js                     [참조] ValidationError 클래스
  tests/
    unit.test.js                      [수정] TC-3.3.1 ~ TC-3.3.7 테스트 추가
```

### 4.2 신규 생성 파일

본 구현에서는 신규 파일 생성이 필요하지 않다.
`validateTransferSyntax.js`는 이미 기존 코드에 re-export 선언이
존재하므로(COMP-2 인터페이스 정의에 따름), 해당 파일의 내용을
구현하는 것으로 충분하다.

### 4.3 디렉토리 구조 원칙

- Business Logic Layer: `src/data/dicomParser/` 에 검증 함수 배치
- 테스트: `tests/unit.test.js` 에 기존 테스트와 통합하여 작성
- 상수 및 타입: 기존 `dicomDictionary.js`, `constants.js` 재사용
---

## 5. 구현 접근법 (Implementation Approach)

### 5.1 구현 순서 (Implementation Order)

#### Phase 1: 상수 및 타입 검증 (준비 단계)

**목표**: validateTransferSyntax()가 의존하는 상수와 타입이 올바르게 정의되어 있는지 확인

| 단계 | 작업 내용 | 산출물 |
|------|-----------|--------|
| 1-1 | `dicomDictionary.js`의 SUPPORTED_TRANSFER_SYNTAXES(Set)에 3종 UID 포함 확인 | 검증 완료 |
| 1-2 | `dicomDictionary.js`의 TRANSFER_SYNTAX 상수가 올바른 UID 값을 가지는지 확인 | 검증 완료 |
| 1-3 | `constants.js`의 ERROR_CODES.PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX 정의 확인 | 검증 완료 |
| 1-4 | ParseContext 타입 정의 필요 여부 확인 (신규 또는 기존 활용) | 타입 정의 |

**현재 상태 분석**:
- `TRANSFER_SYNTAX.EXPLICIT_VR_LE = '1.2.840.10008.1.2.1'` - 이미 정의됨
- `TRANSFER_SYNTAX.IMPLICIT_VR_LE = '1.2.840.10008.1.2'` - 이미 정의됨
- `TRANSFER_SYNTAX.BIG_ENDIAN = '1.2.840.10008.1.2.2'` - 이미 정의됨
- `SUPPORTED_TRANSFER_SYNTAXES` = Set(3종) - 이미 정의됨
- `ERROR_CODES.PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX` - 이미 정의됨

#### Phase 2: validateTransferSyntax() 핵심 구현

**목표**: 전송 구문 검증 함수의 핵심 로직 구현

파일: `viewer/src/data/dicomParser/validateTransferSyntax.js`

**함수 시그니처:**
```javascript
export function validateTransferSyntax(transferSyntaxUID, parseContext)
```

**구현 의사코드 (Pseudocode):**
```
function validateTransferSyntax(transferSyntaxUID, parseContext):
  // 1. null/undefined/빈값 방어 (NFR-001, FR-1.2.2)
  if transferSyntaxUID is null OR undefined OR empty string:
    handleError(PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX)
    return false

  // 2. 지원 전송 구문 Set에서 조회 (FR-1.2.1)
  if SUPPORTED_TRANSFER_SYNTAXES.has(transferSyntaxUID):
    // 3. ParseContext에 VR 모드 및 바이트 오더 설정 (FR-1.2.3)
    configureParseContext(parseContext, transferSyntaxUID)
    return true

  // 4. 미지원 전송 구문 처리 (FR-1.2.4)
  handleError(PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX)
  return false
```

**configureParseContext() 내부 로직:**
```
function configureParseContext(ctx, uid):
  switch(uid):
    case TRANSFER_SYNTAX.EXPLICIT_VR_LE:
      ctx.vrMode = 'Explicit'
      ctx.byteOrder = 'LittleEndian'
    case TRANSFER_SYNTAX.BIG_ENDIAN:
      ctx.vrMode = 'Explicit'
      ctx.byteOrder = 'BigEndian'
    case TRANSFER_SYNTAX.IMPLICIT_VR_LE:
      ctx.vrMode = 'Implicit'
      ctx.byteOrder = 'LittleEndian'
```

**설계 결정 사항:**

| 결정 항목 | 선택 | 근거 |
|-----------|------|------|
| 검색 방식 | Set.has() (O(1)) | NFR-002에서 O(n)으로 충분하나, 기존 구현이 Set이므로 일관성 유지 |
| 에러 처리 방식 | ErrorManager 호출 + false 반환 | 예외 throw가 아닌 boolean 반환으로 NFR-001 준수 |
| ParseContext 전달 | 함수 인자로 명시적 전달 | 의존성 주입 패턴으로 테스트 용이성 확보 |

#### Phase 3: 단위 테스트 구현

**목표**: TC-3.3.1 ~ TC-3.3.7 테스트 케이스 작성

파일: `viewer/tests/unit.test.js` (기존 파일에 describe 블록 추가)

**테스트 케이스 매핑:**

| 테스트 ID | 시나리오 | 입력 | 기대 결과 | User Story |
|-----------|----------|------|-----------|------------|
| TC-3.3.1 | Explicit VR LE 검증 | '1.2.840.10008.1.2.1' | true, vrMode=Explicit, byteOrder=LittleEndian | US-1 (시나리오 1) |
| TC-3.3.2 | Explicit VR BE 검증 | '1.2.840.10008.1.2.2' | true, vrMode=Explicit, byteOrder=BigEndian | US-1 (시나리오 2) |
| TC-3.3.3 | Implicit VR LE 검증 | '1.2.840.10008.1.2' | true, vrMode=Implicit, byteOrder=LittleEndian | US-1 (시나리오 3) |
| TC-3.3.4 | 압축 전송 구문 거부 | '1.2.840.10008.1.2.4.70' | false, 에러 핸들러 호출 | US-2 (시나리오 1) |
| TC-3.3.5 | null 입력 방어 | null | false, 에러 핸들러 호출 | US-3 (시나리오 1) |
| TC-3.3.6 | 빈 문자열 방어 | '' | false, 에러 핸들러 호출 | US-3 (시나리오 3) |
| TC-3.3.7 | 존재하지 않는 UID | '1.2.3.4.5' | false, 에러 핸들러 호출 | US-2 (시나리오 2) |

**Edge Case 추가 검증:**

| 테스트 ID | 엣지 케이스 | 입력 | 기대 결과 |
|-----------|-------------|------|-----------|
| EC-001 | 선행/후행 공백 포함 UID | ' 1.2.840.10008.1.2.1 ' | false (정확 일치) |
| EC-002 | undefined 입력 | undefined | false |

**테스트 구현 패턴:**
```javascript
describe('validateTransferSyntax - TC-3.3.x', () => {
  it('시나리오 설명', () => {
    // Arrange: ParseContext mock 생성
    const parseContext = { vrMode: null, byteOrder: null };
    // Act
    const result = validateTransferSyntax(input, parseContext);
    // Assert
    expect(result).toBe(expectedBoolean);
    // ParseContext 상태 검증 (성공 시)
    if (result) {
      expect(parseContext.vrMode).toBe(expectedVrMode);
      expect(parseContext.byteOrder).toBe(expectedByteOrder);
    }
  });
});
```
#### Phase 4: 통합 및 호출 컨텍스트 연동

**목표**: DicomParser.parseDICOM() 파이프라인에 validateTransferSyntax() 통합

파일: `viewer/src/data/dicomParser/parseDICOM.js`

**호출 순서 (FR-1.2.5 준수):**
```
parseDICOM(file):
  1. readFile(file) -> buffer
  2. validateFileSize(buffer.byteLength) -> boolean
  3. validateMagicByte(buffer) -> boolean
  4. parseMetaGroup(buffer) -> { transferSyntaxUID, ... }
  5. validateTransferSyntax(transferSyntaxUID, parseContext) -> boolean  ** 여기 **
  6. if true: parseMetadata(buffer, parseContext) -> metadata
  7. if true: parsePixelData(buffer, metadata) -> voxelData
  8. return ParseResult
```

**통합 시 주의사항:**
- validateTransferSyntax()가 false를 반환하면 parseMetadata() 호출을 건너뛰고
  에러가 포함된 ParseResult를 즉시 반환해야 함
- parseDICOM.js 수정은 본 계획의 직접 범위는 아니며,
  COMP-1(DicomParser) 구현 티켓에서 수행될 예정
  본 티켓에서는 validateTransferSyntax() 함수 자체의 구현과 단위 테스트에 집중

### 5.2 에러 처리 전략

**에러 코드**: `PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX`

| 발생 조건 | 에러 처리 동작 | 추적 |
|-----------|----------------|------|
| null 입력 | handleError() 호출, false 반환 | FR-1.2.2, US-3 |
| undefined 입력 | handleError() 호출, false 반환 | FR-1.2.2, US-3 |
| 빈 문자열 입력 | handleError() 호출, false 반환 | FR-1.2.2, US-3 |
| 미지원 UID (압축 등) | handleError() 호출, false 반환 | FR-1.2.4, US-2 |

**에러 처리 원칙 (IEC 62304 Class A):**
1. 함수 내부에서 예외(throw)를 발생시키지 않음
2. 모든 경로에서 명시적 boolean 값을 반환
3. 에러 발생 시 ErrorManager를 통해 에러 메시지 생성 및 로깅
4. 호출자(COMP-1)가 ParseResult.errors를 통해 에러 내역을 확인 가능

### 5.3 의존성 관계

```
validateTransferSyntax.js
  |-- imports from dicomDictionary.js
  |     TRANSFER_SYNTAX (상수)
  |     SUPPORTED_TRANSFER_SYNTAXES (Set)
  |-- imports from constants.js
  |     ERROR_CODES.PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX
  |-- imports from handleParseError.js
  |     handleParseError() (에러 처리 유틸리티)
```

**순환 의존성 검토:**
validateTransferSyntax.js -> dicomDictionary.js -> (순환 없음)
validateTransferSyntax.js -> constants.js -> (순환 없음)
validateTransferSyntax.js -> handleParseError.js -> (순환 없음)
순환 의존성 없음 확인 완료.

### 5.4 구현 난이도 평가

| 항목 | 난이도 | 예상 공수 | 근거 |
|------|--------|----------|------|
| 상수/타입 검증 (Phase 1) | 낮음 | 0.5h | 기존 코드 확인만 필요 |
| 핵심 함수 구현 (Phase 2) | 낮음 | 1h | Set.has() 기반 단순 조회 + switch문 |
| 단위 테스트 (Phase 3) | 중간 | 2h | 7개 TC + 2개 EC, ParseContext mock 검증 |
| 통합 연동 (Phase 4) | 낮음 | 0.5h | 호출 위치 삽입만 필요 |
| **총계** | - | **4h** | - |
---

## 6. 복잡도 추적 (Complexity Tracking)

### 6.1 순환 복잡도 (Cyclomatic Complexity)

validateTransferSyntax() 함수의 제어 흐름 분석:

```
진입점
  |
  +-- [null/undefined/empty 체크] --+-- true --> handleError, return false
  |                                 +-- false -->
  +-- [SUPPORTED_TRANSFER_SYNTAXES.has()] --+-- true --> configureParseContext, return true
                                             +-- false --> handleError, return false
```

**순환 복잡도 계산:**
- 의사결정 분기점: 2개 (null 체크, Set.has 체크)
- CC = 1 + 2 = 3
- 기준치 10 이하: **합격**

configureParseContext() 내부 순환 복잡도:
- switch문 분기: 3개 (3종 UID)
- CC = 1 + 3 = 4
- 기준치 10 이하: **합격**

**총합 순환 복잡도: 7 (합격)**

### 6.2 인지 복잡도 (Cognitive Complexity)

| 요소 | 증분 | 설명 |
|------|------|------|
| nullish 체크 (if) | +1 | 단순 조건문 |
| Set.has 체크 (if) | +1 | 단순 조건문 |
| configureParseContext switch | +1 | 단일 switch |
| switch case x3 | +3 (각 +1) | 3개 case |
| **총 인지 복잡도** | **6** | 기준치 15 이하: 합격 |

### 6.3 위험 및 완화 전략

| 위험 항목 | 영향도 | 발생 가능성 | 완화 전략 |
|-----------|--------|-------------|-----------|
| ParseContext 타입 미정의 | 중간 | 낮음 | Phase 1에서 명시적 타입 정의 또는 기존 객체 활용 확인 |
| handleParseError 함수 미구현 | 높음 | 낮음 | 기존 CBVError 계층 활용, 필요 시 최소 래퍼 함수 구현 |
| parseDICOM.js 통합 시점 불일치 | 낮음 | 중간 | COMP-1 티켓과 인터페이스 계약 사전 합의 |

### 6.4 코드 품질 게이트

| 검증 항목 | 기준 | 측정 방법 |
|-----------|------|-----------|
| 단위 테스트 통과율 | 100% (TC-3.3.1~3.3.7) | vitest run |
| 코드 커버리지 | 100% (validateTransferSyntax.js) | vitest --coverage |
| ESLint 오류 | 0건 | npm run lint |
| 순환 복잡도 | 10 이하 | 수동 분석 (본 섹션) |
| 순환 의존성 | 없음 | ESLint import 규칙 |

---

## 7. 검증 계획 (Verification Plan)

### 7.1 단위 테스트 실행 절차

```bash
# 전체 테스트 실행
cd viewer && npm test

# 커버리지 포함 실행
cd viewer && npm run test:coverage

# 특정 테스트만 실행 (선택)
cd viewer && npx vitest run -t 'validateTransferSyntax'
```

### 7.2 수동 검증 체크리스트

- [ ] SUPPORTED_TRANSFER_SYNTAXES에 3종 UID가 정확히 포함되어 있는지 확인
- [ ] null 입력 시 false 반환 및 에러 핸들러 호출 확인
- [ ] undefined 입력 시 false 반환 및 에러 핸들러 호출 확인
- [ ] 빈 문자열 입력 시 false 반환 및 에러 핸들러 호출 확인
- [ ] 지원 UID 3종 각각에 대해 true 반환 및 ParseContext 설정 확인
- [ ] 미지원 UID에 대해 false 반환 및 에러 핸들러 호출 확인
- [ ] 모든 실행 경로에서 예외 발생 없이 boolean 반환 확인

### 7.3 Definition of Done 체크리스트

- [ ] FR-1.2.1 ~ FR-1.2.5 모든 기능 요구사항 구현 완료
- [ ] 단위 테스트 TC-3.3.1 ~ TC-3.3.7 전부 통과
- [ ] Edge Case 시나리오(EC-001 ~ EC-003) 검증 완료
- [ ] 코드 커버리지 100% 달성 (validateTransferSyntax.js)
- [ ] ESLint 오류 0건
- [ ] IEC 62304 Class A 단위 테스트 증거 문서화 완료
- [ ] SRS FR-1.2, SAD COMP-2 추적성 매트릭스 업데이트
- [ ] 코드 리뷰 승인

---

*문서 종료*
*작성자: 기술 전략 수석 엔지니어*
*검토 필요: ParseContext 타입 정의 방식 (Phase 1에서 최종 확정)*
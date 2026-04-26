# Implementation Plan: DICOMMetadata 타입 팩토리 (DICOMMetadata.js)

**Branch**: `feature/PLAYG-1817` | **Date**: 2026-04-26 | **Spec**: `docs/spec-kit/01_spec.md`
**Ticket**: `PLAYG-1817` | **Type**: Detailed Design (SDS-1.2)

---

## Summary

본 계획은 DICOM 파일에서 추출하는 28개 메타데이터 속성을 정의하는 `DICOMMetadata` typedef(JSDoc)와
이를 생성하는 `createDICOMMetadata(overrides?)` 팩토리 함수의 구현을 다룬다.
Factory Pattern + Object Spread 패턴을 적용하여 순수 객체 리터럴 기반으로 타입 안전성을 확보하며,
PHI 보호 대상 필드(patientName, patientID, patientBirthDate)의 기본값을 빈 문자열로 설정하여
phiGuard.js의 마스킹 연동 기반을 제공한다. 외부 의존성 없이 O(1) 성능을 보장한다.

---

## Technical Context

| 항목 | 내용 |
| --- | --- |
| **Language/Version** | JavaScript (ES2020+), ESM (`import`/`export`) |
| **Primary Dependencies** | 없음 (런타임 외부 의존성 0개) |
| **Storage** | 인메모리 plain object (별도 스토리지 없음) |
| **Testing** | Vitest 3.x (`viewer/tests/` 디렉토리) |
| **Target Platform** | 브라우저 (Vite 5.x 번들링) |
| **Performance Goals** | 팩토리 함수 O(1), 로드 시간 오버헤드 0 |
| **Constraints** | IEC 62304 Class A, JSDoc typedef만 사용 (class/TypeScript 금지), DICOM PS3.5/PS3.10 준수 |

---## Constitution Check
*GATE: 설계 원칙(Constitution) 준수 여부 확인*

- **SOLID 원칙**:
  - SRP(단일 책임): DICOMMetadata.js는 타입 정의와 팩토리 생성이라는 단일 책임만 수행. 파싱 로직(metadataParser.js), PHI 마스킹(phiGuard.js)과 명확히 분리됨
  - OCP(개방-폐쇄): `overrides` 객체를 통한 확장이 가능하며, 기본 구조 수정 없이 새 필드 추가 가능 (FR-007)
  - DIP(의존성 역전): metadataParser.js가 DICOMMetadata.js에 의존하며, DICOMMetadata.js는 어떤 모듈에도 의존하지 않음 (의존성 방향: 외부 → 타입 모듈)
- **레이어 분리**:
  - `types/` 레이어: 순수 데이터 타입 정의 (DICOMMetadata.js, ParseResult.js)
  - `data/dicomParser/` 레이어: 파싱 로직 및 PHI 보호
  - 타입 레이어는 데이터 레이어에 의존하지 않으며, 단방향 의존 보장
- **에러 처리 전략**:
  - 팩토리 함수 자체는 예외를 발생시키지 않음. `overrides`가 null/undefined인 경우 빈 객체로 처리 (EC-001)
  - 필수 태그 누락 검증은 metadataParser.js에서 PARSE_ERR_MISSING_REQUIRED_TAG 에러로 처리
  - 배열 길이 검증은 팩토리에서 수행하지 않고 소비자 측에서 담당 (EC-003)
- **보안 고려사항**:
  - PHI 필드(patientName, patientID, patientBirthDate)는 기본값이 빈 문자열이므로, 팩토리 단계에서 PHI 유출 가능성 없음
  - 실제 PHI 마스킹은 phiGuard.js에서 WeakMap 기반으로 수행 (NFR-002)
  - DICOMMetadata.js 자체는 보안 로직을 포함하지 않으나, phiGuard.js 연동을 위한 구조적 기반을 제공함

---## Project Structure

### Documentation
```text
docs/
├── spec-kit/
│   ├── 01_spec.md          # 기능 명세서
│   ├── 02_plan.md          # 구현 계획서 (본 문서)
│   └── 03_tasks.md         # 작업 분해 (향후 생성)
└── artifacts/
    ├── SRS.md              # 소프트웨어 요구사항 명세
    ├── SAD.md              # 소프트웨어 아키텍처 설계
    └── SystemRequirement.md # 시스템 요구사항
```

### Source Code
```text
viewer/src/
├── types/
│   ├── DICOMMetadata.js    # [구현 대상] DICOMMetadata typedef + createDICOMMetadata 팩토리
│   └── ParseResult.js      # ParseResult typedef + createParseResult 팩토리 (기존)
├── data/
│   ├── dicomParser/
│   │   ├── metadataParser.js  # 메타데이터 파서 (createDICOMMetadata 소비자)
│   │   ├── phiGuard.js        # PHI 마스킹 가드 (DICOMMetadata PHI 필드 소비자)
│   │   ├── ParseContext.js    # 파싱 컨텍스트
│   │   ├── constants.js       # 파서 상수 (METADATA_TAGS 등)
│   │   ├── tagReader.js       # 태그 리더
│   │   ├── metaGroupParser.js # 메타 그룹 파서
│   │   ├── index.js           # 배럴 파일
│   │   ├── parseDICOM.js      # 최상위 파서
│   │   ├── pixelDataParser.js # 픽셀 데이터 파서
│   │   ├── handleParseError.js # 에러 핸들러
│   │   ├── validateMagicByte.js # 매직 바이트 검증
│   │   └── validateTransferSyntax.js # 전송 구문 검증
│   ├── dicomDictionary.js     # DICOM 태그 사전
│   └── index.js               # 데이터 레이어 배럴
├── errors/
│   └── CBVError.js            # 커스텀 에러 클래스
├── main.js                    # 애플리케이션 진입점
└── styles/
    └── main.css               # 스타일시트

viewer/tests/
├── setup.js                   # 테스트 설정
└── unit.test.js               # 단위 테스트 (TC-1.2.1 ~ TC-1.2.6 포함)
```

---## Implementation Approach

### Phase 순서 및 접근 방식

#### Phase 1: Setup (준비)
- 기존 `viewer/src/types/DICOMMetadata.js` 파일의 현재 구현 상태 확인 완료
- 기존 코드는 이미 28개 속성 JSDoc typedef와 createDICOMMetadata 팩토리를 포함하고 있음
- 기존 `viewer/tests/unit.test.js`에 기본 팩토리 테스트 2개 존재
- Vitest 테스트 환경 구성 완료 (`viewer/package.json`)

#### Phase 2: Core Implementation (핵심 구현)
- **2-1. DICOMMetadata typedef 보완**
  - 기존 28개 속성 정의를 검증하고 명세(FR-001)와 일치하는지 확인
  - 각 속성의 JSDoc `@property` 타입 어노테이션 정확성 검증 (string, number, number[])
  - `@module types/DICOMMetadata` 모듈 선언 유지
- **2-2. createDICOMMetadata 팩토리 함수 구현/보완**
  - `Partial<DICOMMetadata>` 타입의 선택적 인자 `overrides` 지원 (FR-002)
  - 기본값 규칙 준수: 문자열='', 숫자=0, numberOfFrames=1, bitsAllocated=16 (FR-004)
  - 배열 기본값은 매 호출 시 새 리터럴 생성: `pixelSpacing: [0, 0]`, `imageOrientationPatient: [1, 0, 0, 0, 1, 0]`, `imagePositionPatient: [0, 0, 0]` (FR-003)
  - Object Spread(`...overrides`)로 사용자 지정값 병합 (FR-002, FR-007)
  - null/undefined overrides 시 빈 객체 fallback 처리 (EC-001)
- **2-3. PHI 필드 기본값 보장**
  - `patientName`, `patientID`, `patientBirthDate` 속성 기본값 `''` 확인 (FR-005)
  - phiGuard.js PHI_FIELDS 배열과 정확히 일치하는 필드명 보장

#### Phase 3: Testing (테스트)
- `viewer/tests/unit.test.js`의 기존 `createDICOMMetadata` describe 블록에 TC-1.2.1 ~ TC-1.2.6 테스트 케이스 추가
  - **TC-1.2.1**: 무인자 호출 시 28개 속성 기본값 검증 (SC-001)
  - **TC-1.2.2**: `overrides` 전달 시 지정값 반영 + 나머지 기본값 유지 (SC-002)
  - **TC-1.2.3**: 배열 필드(`pixelSpacing`) override 정확성 검증 (SC-003)
  - **TC-1.2.4**: 연속 호출 시 참조 독립성 및 참조 오염 방지 검증 (SC-004, HAZ-5.1)
  - **TC-1.2.5**: 필수 필드 기본값 검증 (rows=0, columns=0, bitsAllocated=16, pixelRepresentation=0) (SC-005, FR-1.3)
  - **TC-1.2.6**: PHI 필드 3개 빈 문자열 기본값 존재 확인 (SC-006, FR-4.1, HAZ-3.1)
- 엣지 케이스 테스트 추가:
  - **EC-001**: `createDICOMMetadata(null)` 및 `createDICOMMetadata(undefined)` 처리
  - **EC-002**: 정의되지 않은 추가 속성(예: `photometricInterpretation`) 전달 시 포함 여부
  - **EC-003**: 다른 길이의 배열 전달 시 그대로 반영
  - **EC-004**: 배열 기본값의 참조 독립성 (매 호출 시 새 배열인지 확인)

#### Phase 4: Integration (연동 검증)
- metadataParser.js에서 createDICOMMetadata 호출 경로 정상 동작 확인
- phiGuard.js maskPhiFields()가 DICOMMetadata 객체의 PHI 필드를 정상 마스킹하는지 확인
- `vitest run --coverage`로 100% 커버리지 달성 확인

### Key Technical Decisions (주요 기술 결정)

- **결정 1: Plain Object + JSDoc typedef 방식 채택** (class/TypeScript 대신)
  - 이유: IEC 62304 Class A 수준의 단순성 요구. 별도 클래스 계층이나 TypeScript 컴파일 단계 없이
    순수 JavaScript 네이티브 타입만으로 타입 표현. 빌드 파이프라인 단순화 및 런타임 오버헤드 제거 (NFR-003)

- **결정 2: Factory Pattern + Object Spread 패턴**
  - 이유: 생성 시마다 독립적인 새 객체를 보장하며(FR-003), `overrides`를 통한 선언적 커스터마이징이 가능함.
    Object.assign 대신 Spread 연산자 사용으로 가독성 및 불변성 의도 표현 (FR-002, FR-007)

- **결정 3: 배열 기본값을 인라인 리터럴로 생성**
  - 이유: 모듈 스코프에서 공유 배열 상수를 정의하면 모든 호출이 동일 참조를 공유하게 되어
    HAZ-5.1(참조 오염) 위험이 발생. 매 호출 시 새 리터럴(`[0, 0]`)을 생성하여 참조 독립성 보장 (FR-003)

- **결정 4: 팩토리 함수 내부에서 유효성 검증 수행하지 않음**
  - 이유: 팩토리는 순수 데이터 생성에만 집중하고, 필수 태그 검증(FR-1.3)은 metadataParser.js에서,
    배열 길이 검증(EC-003)은 소비자 측에서 수행. 단일 책임 원칙(SRP) 준수

- **결정 5: PHI 보호 로직을 DICOMMetadata.js에 포함하지 않음**
  - 이유: 타입 정의 모듈은 보안 로직과 분리되어야 함. PHI 마스킹은 phiGuard.js에서 담당하며,
    DICOMMetadata.js는 PHI 필드를 빈 문자열 기본값으로 정의하여 마스킹 대상 식별 가능성만 제공 (NFR-002)

---## Complexity Tracking

### 복잡도 항목

- **CT-001: 28개 속성 전체 기본값 검증의 반복성**
  - 상황: TC-1.2.1에서 28개 속성을 개별적으로 기본값 검증해야 함
  - 완화: 테스트 헬퍼 함수 `expectDefaultValues(meta)`를 정의하여 중복 코드 최소화
  - 정당성: IEC 62304 Class A 요구사항으로 전체 속성 검증은 필수이며, 테스트 가독성을 위해 헬퍼 도입

- **CT-002: metadataParser.js에서 DICOMMetadata에 없는 추가 필드 전달**
  - 상황: metadataParser.js가 `photometricInterpretation`, `samplesPerPixel` 등 DICOMMetadata typedef에 정의되지 않은 필드를 overrides로 전달
  - 완화: Object Spread는 추가 속성도 포함하므로 런타임 에러 없이 동작 (FR-007)
  - 정당성: DICOM 표준의 확장성(Private Tag 등)을 수용하기 위해 엄격한 타입 체크보다 유연성 선택
  - [NEEDS CLARIFICATION]: 향후 추가 필드를 DICOMMetadata typedef에 공식 포함할지 여부는 metadataParser 리팩토링 시 결정 필요

- **CT-003: overrides null/undefined 처리**
  - 상황: 함수 시그니처에서 `overrides = {}` 기본값을 지정했으나, 명시적으로 null을 전달하면 Spread 시 에러 발생 가능
  - 완화: 함수 내부에서 `overrides ?? {}` (nullish coalescing)로 방어 코드 추가 예정
  - 정당성: EC-001 엣지 케이스 대응으로 방어적 프로그래밍 적용

### 위험도 평가

| 항목 | 위험도 | 설명 |
| --- | --- | --- |
| 참조 오염 (HAZ-5.1) | 낮음 | 배열 리터럴 인라인 생성으로 이미 완화됨 |
| PHI 유출 (HAZ-3.1) | 낮음 | 기본값 빈 문자열 + phiGuard 마스킹으로 이중 방어 |
| 필수 태그 누락 (HAZ-1.3) | 낮음 | 기본값 제공으로 크래시 방지, metadataParser에서 검증 |
| 추가 필드 전파 | 낮음 | Object Spread로 자연스럽게 처리됨 |

---## References

- Spec: `docs/spec-kit/01_spec.md`
- 티켓: `PLAYG-1817`
- 구현 대상 파일: `viewer/src/types/DICOMMetadata.js`
- 테스트 파일: `viewer/tests/unit.test.js`
- 연동 모듈: `viewer/src/data/dicomParser/metadataParser.js`, `viewer/src/data/dicomParser/phiGuard.js`
- 관련 문서: `docs/artifacts/SRS.md`, `docs/artifacts/SAD.md`

### 추적 매트릭스

| 테스트 케이스 | 요구사항 | 위험요소 | 검증 내용 |
| --- | --- | --- | --- |
| TC-1.2.1 | FR-001, FR-004, FR-2.3 | - | 무인자 호출 시 28개 속성 기본값 검증 |
| TC-1.2.2 | FR-002, FR-2.3 | - | overrides 전달 시 지정값 반영 + 나머지 기본값 |
| TC-1.2.3 | FR-002, FR-2.3 | - | 배열 필드 override 정확성 |
| TC-1.2.4 | FR-003 | HAZ-5.1 | 참조 독립성 및 참조 오염 방지 |
| TC-1.2.5 | FR-006, FR-1.3 | HAZ-1.3 | 필수 필드 기본값 (rows=0, columns=0, bitsAllocated=16, pixelRepresentation=0) |
| TC-1.2.6 | FR-005, FR-4.1 | HAZ-3.1 | PHI 필드 3개 빈 문자열 기본값 존재 |
| EC-001 | FR-002 | - | null/undefined overrides 처리 |
| EC-002 | FR-007 | - | 추가 속성 포함 여부 |
| EC-003 | FR-002 | - | 다른 길이 배열 전달 |
| EC-004 | FR-003 | HAZ-5.1 | 배열 기본값 참조 독립성 |

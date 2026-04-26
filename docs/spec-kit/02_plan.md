# Implementation Plan: DentiView3D - DICOM 파서 상수 모듈(constants.js)

**Branch**: `feature/PLAYG-1816` | **Date**: 2026-04-26 | **Spec**: `docs/spec-kit/01_spec.md`
**Ticket**: `PLAYG-1816` | **Type**: Detailed Design (SDS-1.1)

---

## Summary

DICOM 파서의 최하위 계층 모듈인 `constants.js`의 구현 계획이다. 본 모듈은 파서 전체에서 사용하는
13개 상수(원시 상수 9개, 구조화 객체 3개, 별칭 1개)를 중앙 집중식으로 정의하며, 비즈니스 로직을
포함하지 않는 순수 상수 모듈이다.

핵심 기술적 결정 사항은 다음과 같다:
- 에러 코드를 enum 대신 객체 리터럴 문자열 상수로 정의 (IEC 62304 Class A 단순성 준수)
- 필수 태그에 기본값 없음 → 누락 시 즉시 에러 발생로 안전성 확보
- ERROR_MESSAGES에 내부 구조 정보 노출 금지 (FR-4.5 보안 요구사항)
- ErrorCodes는 ERROR_CODES의 @deprecated 별칭으로 하위 호환성 유지

---## Technical Context

| 항목                     | 내용                                    |
| ------------------------ | --------------------------------------- |
| **Language/Version**     | JavaScript (ES Module, ES2022)          |
| **Primary Dependencies** | 없음 (순수 상수 모듈, 외부 의존성 없음)    |
| **Storage**              | 해당 없음 (상수 모듈은 스토리지 미사용)    |
| **Testing**              | Vitest (단위 테스트)                     |
| **Target Platform**      | 웹 브라우저 (Chrome, Firefox, Edge, Safari) |
| **Performance Goals**    | 모듈 로딩 시간 1ms 이내, 런타임 오버헤드 없음 |
| **Constraints**          | IEC 62304 Class A 안전 등급, DICOM 표준 준수 |

---## Constitution Check
*GATE: 설계 원칙(Constitution) 준수 여부 확인*

- **SOLID 원칙**: 단일 책임 원칙(SRP) 준수 — 상수 정의만 담당하며 비즈니스 로직 미포함.
  개방-폐쇄 원칙(OCP) 준수 — ERROR_CODES, METADATA_TAGS는 객체 리터럴로 확장 가능하나 수정은 동결(frozen)으로 보호.
  의존성 역전 원칙(DIP) 준수 — 최하위 모듈로 의존성 없음.
- **레이어 분리**: Data 계층의 상수 하위 모듈로 위치. 파싱 로직 계층(parseDICOM, metadataParser 등)에
  상수를 제공하는 공급자 역할. 계층 간 의존성은 소비 모듈 → constants 단방향.
- **에러 처리 전략**: 에러 코드를 문자열 상수로 정의하여 일관된 에러 식별 제공.
  ERROR_MESSAGES를 통한 다국어(ko/en) 메시지와 심각도(severity) 매핑.
  에러 메시지에 내부 구조 정보 노출 금지 (FR-4.5 보안 요구사항 준수).
  에러 발생 자체는 하지 않으며, 소비 모듈이 ERROR_CODES 값을 참조하여 에러를 발생시킴.
- **보안 고려사항**: ERROR_MESSAGES의 모든 메시지는 offset, tag hex, 버퍼 주소 등
  내부 파일 구조 정보를 포함하지 않음 (FR-4.5, HAZ-3.1).
  MAX_FILE_SIZE(512MB)로 브라우저 메모리 과부하 방지.
  MAX_TAG_COUNT(10000) 및 MAX_SEQUENCE_DEPTH(10)으로 DoS 공격 방지.

---## Project Structure

### Documentation
```text
docs/
└── spec-kit/
    ├── 01_spec.md          # SDS-1.1 상세 설계 명세서
    ├── 02_plan.md           # 본 문서: 이행 계획
    └── 03_tasks.md          # 작업 분할 (미래 생성)
```

### Source Code
```text
viewer/
├── src/
│   └── data/
│       └── dicomParser/
│           ├── constants.js            # [구현 대상] 파서 상수 모듈 (13개 export)
│           ├── parseDICOM.js           # 소비 모듈: 메인 파서 엔트리 포인트
│           ├── validateMagicByte.js    # 소비 모듈: 매직 바이트 검증
│           ├── metadataParser.js       # 소비 모듈: 메타데이터 파싱
│           ├── pixelDataParser.js      # 소비 모듈: 픽셀 데이터 추출
│           ├── handleParseError.js     # 소비 모듈: 에러 핸들링
│           ├── tagReader.js            # 소비 모듈: 태그 읽기
│           └── metaGroupParser.js      # 소비 모듈: 메타 그룹 파싱
└── tests/
    └── unit/
        └── dicomParser/
            └── constants.test.js       # [작성 대상] 상수 모듈 단위 테스트 (16개 TC)
```

---## Implementation Approach

### Phase 순서 및 접근 방식

#### Phase 1: 원시 상수 정의 (Setup)
**목표**: 의존성 없는 9개 원시 상수 export 구현

| 순서 | 작업 내용 | Export | 추적 |
| ---- | --------- | ------ | ---- |
| 1-1  | 프리앰블 길이 상수 정의 | `PREAMBLE_LENGTH = 128` | FR-1.1, FR-CST-01 |
| 1-2  | 매직 바이트 시그니처 정의 | `DICOM_MAGIC_BYTE = 'DICM'` | FR-1.1, FR-CST-02 |
| 1-3  | 매직 바이트 오프셋 정의 (PREAMBLE_LENGTH 참조) | `MAGIC_BYTE_OFFSET = 128` | FR-1.1, FR-CST-03 |
| 1-4  | 최소 파일 크기 상수 정의 | `DICOM_MIN_FILE_SIZE = 132` | FR-1.6, FR-CST-04 |
| 1-5  | 최대 파일 크기 상수 정의 | `MAX_FILE_SIZE = 536_870_912` | FR-1.4, FR-CST-05 |
| 1-6  | 최대 태그 순회 수 상수 정의 | `MAX_TAG_COUNT = 10_000` | FR-2.4, FR-CST-06 |
| 1-7  | 최대 시퀀스 중첩 깊이 상수 정의 | `MAX_SEQUENCE_DEPTH = 10` | FR-2.5, FR-CST-07 |
| 1-8  | 파일 메타 그룹 번호 상수 정의 | `FILE_META_GROUP = 0x0002` | FR-2.1, FR-CST-08 |
| 1-9  | 픽셀 데이터 태그 식별자 객체 정의 | `PIXEL_DATA_TAG = Object.freeze({group: 0x7FE0, element: 0x0010})` | FR-1.5, FR-CST-09 |

**구현 방식**:
- 모든 상수는 `export const`로 선언
- 숫자 리터럴에 숫자 구분 기호(`_`) 사용으로 가독성 향상
- PIXEL_DATA_TAG는 `Object.freeze()`로 불변성 보장

#### Phase 2: 에러 코드 및 메시지 구조체 정의 (Core Implementation)
**목표**: ERROR_CODES, PARSE_ERR_MISSING_REQUIRED_TAG, ERROR_MESSAGES, ErrorCodes 별칭 구현

| 순서 | 작업 내용 | Export | 추적 |
| ---- | --------- | ------ | ---- |
| 2-1  | ERROR_CODES 객체 정의 (7종 에러 코드 문자열) | `ERROR_CODES = Object.freeze({...})` | FR-5.1, FR-CST-10 |
| 2-2  | PARSE_ERR_MISSING_REQUIRED_TAG 개별 export | `PARSE_ERR_MISSING_REQUIRED_TAG` | FR-1.3, FR-CST-12 |
| 2-3  | ERROR_MESSAGES 다국어 메시지 맵 정의 | `ERROR_MESSAGES = Object.freeze({...})` | FR-5.2, FR-CST-13 |
| 2-4  | ErrorCodes @deprecated 별칭 정의 | `ErrorCodes = ERROR_CODES` | FR-5.1, FR-CST-11 |

**ERROR_CODES 구조**:
```javascript
export const ERROR_CODES = Object.freeze({
  PARSE_ERR_INVALID_MAGIC: 'PARSE_ERR_INVALID_MAGIC',
  PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX: 'PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX',
  PARSE_ERR_MISSING_REQUIRED_TAG: 'PARSE_ERR_MISSING_REQUIRED_TAG',
  PARSE_ERR_PIXEL_DATA_EXTRACTION: 'PARSE_ERR_PIXEL_DATA_EXTRACTION',
  PARSE_ERR_FILE_READ: 'PARSE_ERR_FILE_READ',
  PARSE_ERR_FILE_TOO_LARGE: 'PARSE_ERR_FILE_TOO_LARGE',
  PARSE_ERR_UNEXPECTED: 'PARSE_ERR_UNEXPECTED',
});
```

**ERROR_MESSAGES 구조** (각 항목은 ko, en, severity 필드 포함):
```javascript
export const ERROR_MESSAGES = Object.freeze({
  [ERROR_CODES.PARSE_ERR_INVALID_MAGIC]: {
    ko: '...', en: '...', severity: 'error'
  },
  // ... 7종
});
```

**보안 검증**:
- TC-1.16: 모든 메시지에 offset, tag, hex, buffer, 0x 패턴이 포함되지 않았는지 확인

#### Phase 3: 메타데이터 태그 사전 정의 (Core Implementation)
**목표**: METADATA_TAGS 객체 (15개 태그 정의) 구현

| 순서 | 작업 내용 | 세부 사항 | 추적 |
| ---- | --------- | --------- | ---- |
| 3-1  | 필수 태그 4개 정의 | Rows, Columns, BitsAllocated, PixelRepresentation (required=true, defaultValue 없음) | FR-1.3, FR-CST-16 |
| 3-2  | 선택 태그 11개 정의 | 나머지 태그 (required=false, defaultValue 포함) | FR-2.3, FR-CST-15 |

**METADATA_TAGS 구조** (키는 GGGGEEEE 형식):
```javascript
export const METADATA_TAGS = Object.freeze({
  '00280010': { field: 'rows', name: 'Rows', required: true },
  '00280011': { field: 'columns', name: 'Columns', required: true },
  '00280100': { field: 'bitsAllocated', name: 'BitsAllocated', required: true },
  '00280103': { field: 'pixelRepresentation', name: 'PixelRepresentation', required: true },
  '00280101': { field: 'bitsStored', name: 'BitsStored', required: false, defaultValue: 16 },
  // ... 15개 총합
});
```

**설계 결정 사항**:
- 필수 태그(required=true)는 defaultValue 속성 자체를 가지지 않음 → 누락 시 즉시 에러
- 선택 태그(required=false)는 defaultValue 제공 → 파싱 중단 방지
- Object.freeze()로 런타임 불변성 보장

#### Phase 4: 단위 테스트 작성 (Testing)
**목표**: 16개 테스트 케이스(TC-1.1 ~ TC-1.16) 구현

| 순서 | 테스트 그룹 | 포함 TC | 세부 접근 |
| ---- | ----------- | ------- | --------- |
| 4-1  | 원시 상수 검증 | TC-1.1 ~ TC-1.4, TC-1.7 ~ TC-1.11 | expect(상수).toBe(예상값) 형태 |
| 4-2  | ERROR_CODES 무결성 검증 | TC-1.5 | 7종 키 존재 및 값 일치 확인 |
| 4-3  | METADATA_TAGS 필수 태그 검증 | TC-1.6 | 4개 필수 태그 required=true 확인 |
| 4-4  | 선택 태그 기본값 검증 | TC-1.15 | 11개 선택 태그 defaultValue 일치 확인 |
| 4-5  | 별칭 및 개별 export 검증 | TC-1.12, TC-1.13 | 참조 동일성 및 문자열 일치 |
| 4-6  | ERROR_MESSAGES 보안 검증 | TC-1.14, TC-1.16 | 7종 메시지 구조 완전성 및 내부 구조 미포함 확인 |

**테스트 파일**: `viewer/tests/unit/dicomParser/constants.test.js`

#### Phase 5: 정적 검증 및 리뷰 (Integration)
**목표**: 코드 품질 및 추적성 최종 확인

| 순서 | 검증 항목 | 방법 |
| ---- | --------- | ---- |
| 5-1  | ESLint 통과 | lint 실행 |
| 5-2  | 전체 TC 통과 | vitest run |
| 5-3  | 추적성 매트릭스 검증 | 16개 FR-CST ↔ 16개 TC 양방향 매핑 확인 |
| 5-4  | 코드 리뷰 | 비즈니스 로직 미포함 확인 (AC-1.6) |

---### Key Technical Decisions

- **결정 1: 에러 코드를 문자열 상수로 정의 (enum 대신 객체 리터럴)**
  — 이유: IEC 62304 Class A의 단순성 요구사항을 충족하기 위해 JavaScript enum
  (또는 외부 라이브러리) 대신 순수 객체 리터럴을 사용. 빌드 도구 추가 없이 ES Module
  네이티브로 동작하며, 디버깅 시 에러 코드 문자열이 그대로 노출되어 가독성이 높음.

- **결정 2: Object.freeze()로 모든 구조화 객체를 불변화**
  — 이유: ERROR_CODES, ERROR_MESSAGES, METADATA_TAGS, PIXEL_DATA_TAG는
  런타임에 절대 수정되지 않아야 하는 안전 критical 상수. freeze를 통해 의도치 않은
  수정을 원천 차단하고 IEC 62304 Class A의 결정적(deterministic) 동작 보장.

- **결정 3: 필수 태그에 기본값 없음, 선택 태그에만 기본값 제공**
  — 이유: Rows, Columns, BitsAllocated, PixelRepresentation은 영상 렌더링에
  필수적인 값으로, 기본값으로 대체할 경우 오진단(misdiagnosis) 위험이 있음.
  누락 시 즉시 PARSE_ERR_MISSING_REQUIRED_TAG 에러를 발생시켜 안전성 확보.
  선택 태그는 기본값으로 대체하여 파싱 중단을 방지하고 사용자 경험 개선.

- **결정 4: ErrorCodes를 ERROR_CODES의 @deprecated 별칭으로 유지**
  — 이유: 기존 handleParseError.js 등 소비 모듈에서 ErrorCodes 이름으로
  import하는 코드의 하위 호환성 유지. 점진적 마이그레이션을 가능하게 하여
  급격한 API 변경으로 인한 파괴적 변경 방지.

- **결정 5: ERROR_MESSAGES에 내부 구조 정보 노출 금지**
  — 이유: FR-4.5 보안 요구사항 및 HAZ-3.1 위험 완화. 최종 사용자에게 offset,
  tag hex 값, 버퍼 주소 등 내부 파일 구조 정보가 노출되면 악의적 사용자가
  파일 구조를 역설계할 수 있음. 모든 에러 메시지는 사용자 친화적 설명으로만 구성.

---## Complexity Tracking

본 모듈은 IEC 62304 Class A 안전 등급에 해당하는 순수 상수 모듈로, 복잡도가 낮음.
그러나 다음 사항에 대한 정당성을 기록함:

- **METADATA_TAGS의 15개 태그 정의 볼륨**: 메타데이터 태그 사전이 15개 항목을
  포함하여 코드 줄 수가 증가하나, 각 항목은 단순 키-값 매핑이며 순환 복잡도는 1임.
  15개는 DICOM 표준에 명시된 CBCT 영상에 필요한 최소 메타데이터 세트로,
  태그 누락으로 인한 파싱 실패를 방지하기 위해 전수 정의가 필요함.

- **ERROR_CODES와 PARSE_ERR_MISSING_REQUIRED_TAG의 중복 export**:
  PARSE_ERR_MISSING_REQUIRED_TAG는 ERROR_CODES 객체 내에도 포함되어 있고
  개별 export로도 존재함. metadataParser.js에서 직접 import하여 사용하는 편의성과
  코드 가독성을 위해 도입한 패턴으로, DRY 원칙 위반이 아님
  (동일한 문자열 값을 참조하므로 메모리 중복 없음).

- **ErrorCodes deprecated 별칭**: 기존 코드베이스와의 호환성을 위해 유지.
  향후 마이그레이션 완료 시 제거 예정. JSDoc @deprecated 태그로 경고 표시.

---## References

- Spec: `docs/spec-kit/01_spec.md`
- 티켓: `PLAYG-1816`
- 상위 SDS 티켓: `PLAYG-1815` (SDS Document)
- SAD 컴포넌트: `SAD COMP-1 (DicomParser)`
- 관련 요구사항: FR-1.1, FR-1.2, FR-1.3, FR-1.4, FR-1.5, FR-1.6, FR-2.4, FR-2.5, FR-5.1, FR-5.2, FR-4.5
- 관련 위험 분석: HAZ-1.1, HAZ-1.2, HAZ-1.3, HAZ-1.4, HAZ-1.5, HAZ-3.1, HAZ-5.1, HAZ-5.2
- 안전 표준: IEC 62304 Class A

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
| ---- | ---- | --------- | ------ |
| 0.1.0 | 2026-04-26 | 최초 이행 계획 작성 | AutoDevAgent |
# Session Context — PLAYG-1818

> 최종 갱신: 2026-04-27 13:44 | 명령: !plan (task 경로) | 상태: !plan 완료, !draft 대기

---

## 1. 시스템 아키텍처/컨벤션 (유실 절대 금지)

### 프로젝트 개요
- **프로젝트**: DentiView3D — 웹 기반 CBCT 영상 뷰어
- **티켓**: PLAYG-1818 | 유형: Detailed Design (task) | 우선순위: Medium
- **SDS 항목**: SDS-1.3 ParseResult 타입 팩토리 (ParseResult.js)
- **IEC 62304 등급**: Class A
- **아키텍처**: 3-Tier Layered Architecture (Presentation → Business Logic → Data Access)

### 핵심 모듈 경로 및 역할
```
viewer/src/
├── types/
│   └── ParseResult.js          # 본 구현 대상 — 타입 팩토리 (Business Logic Layer)
├── data/dicomParser/
│   ├── parseDICOM.js           # createParseResult() 7회 호출 (COMP-1)
│   ├── validateMagicByte.js    # 매직바이트 검증
│   ├── validateTransferSyntax.js # 전송구문 검증
│   ├── metaGroupParser.js
│   ├── metadataParser.js       # 메타데이터 파싱
│   ├── pixelDataParser.js      # 픽셀 데이터 추출
│   ├── handleParseError.js
│   └── constants.js            # MAX_FILE_SIZE 등 상수
├── errors/
│   └── CBVError.js             # ParseError 클래스 정의
├── ui/
│   └── UiController.js         # isValid 분기 처리 (COMP-6)
└── security/
    └── PhiGuard.js             # PHI 마스킹 처리 (COMP-5)

viewer/tests/unit/types/
└── ParseResult.test.js         # 단위 테스트 (Vitest)
```

### ParseResult 타입 스키마 (JSDoc @typedef)
```javascript
/** @typedef {Object} ParseResult
 *  @property {Object|null} metadata    - DICOM 메타데이터 (환자정보, 영상파라미터)
 *  @property {ArrayBuffer|null} voxelData - 3차원 복셀 데이터 (원시 ArrayBuffer)
 *  @property {ErrorResult[]} errors    - 오류/경고 목록
 *  @property {boolean} isValid          - 파싱 전체 성공 여부 */

/** @typedef {Object} ErrorResult
 *  @property {string} userMessage  - 사용자용 메시지 (한국어, 내부구조 노출금지 FR-4.5)
 *  @property {string} debugInfo    - 개발자용 디버그 정보
 *  @property {string} errorCode    - PARSE_ERR_* 계열 에러 코드
 *  @property {string} severity     - 'error' | 'warning' */
```

### createParseResult() 팩토리 함수
```javascript
export function createParseResult(overrides = {}) {
  const DEFAULTS = { metadata: null, voxelData: null, errors: [], isValid: false };
  return { ...DEFAULTS, ...overrides };
}
// 설계: IEC 62304 Class A 단순성 — new 없이 순수 객체 반환, spread 병합, 얕은 복사
// CT-2 해결: errors 빈 배열은 함수 본문 내에서 매번 새 인스턴스 생성
```

### 에러 코드 매핑 (PARSE_ERR_*)
| 에러 코드 | 호출지점 | severity | 추적성 |
|-----------|---------|----------|--------|
| PARSE_ERR_FILE_TOO_LARGE | #1 파일크기초과 | error | FR-1.4 |
| PARSE_ERR_INVALID_MAGIC | #2 매직바이트불일치 | error | FR-1.1 |
| PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX | #3 전송구문미지원 | error | FR-1.2 |
| PARSE_ERR_METADATA_PARSE_FAILED | #4 메타데이터파싱실패 | error | FR-1.3, FR-2.3 |
| PARSE_ERR_MISSING_REQUIRED_TAG | #5 필수에러감지 | error | FR-2.3 |
| PARSE_ERR_PIXEL_DATA_EXTRACTION_FAILED | #6 픽셀데이터추출실패 | error | FR-3.1 |
| PARSE_WARN_PARTIAL_METADATA | 부분파싱경고 | warning | FR-2.3 |

### 컴포넌트 인터페이스 계약
- **COMP-1 (DicomParser)**: `parseDICOM(file: File) → ParseResult` — 본 모듈이 반환 타입 정의
- **COMP-6 (UiController)**: `parseResult.isValid` 분기 → true: `MprRenderer.buildVolumeData(parseResult)`, false: `ErrorManager`로 `errors[].userMessage` 표시
- **COMP-7 (ErrorManager)**: `ErrorResult.errorCode`로 사용자 메시지 변환
- **COMP-5 (PhiGuard)**: metadata 내 PHI 필드는 이미 마스킹된 상태로 전달받음
- **COMP-4 (MprRenderer)**: `renderSlice(viewport, data, idx)` — voxelData 전달 구조 보장

### 기술 스택 및 제약
- **언어**: JavaScript (ES2020+), ESM 모듈 시스템 (TypeScript 아님)
- **타입 시스템**: JSDoc @typedef (빌드 파이프라인 추가 최소화, IEC 62304 Class A)
- **테스트**: Vitest (단위 테스트)
- **의존성**: 순수 Vanilla JS, 제로 외부 의존성
- **타겟**: Chrome 90+ (브라우저 전용, Node.js 미지원)
- **오프라인 전용**: 네트워크 없음, 외부 의존성 없음
- **성능 목표**: 객체 생성 < 0.1ms

### 추적성 매트릭스 (FR → 구현)
| 요구사항 | ParseResult.js 매핑 | 검증 |
|----------|---------------------|------|
| FR-1.1 (매직바이트 검증) | isValid=false, 호출 #2 | 단위 |
| FR-1.2 (전송구문 검증) | isValid=false, 호출 #3 | 단위 |
| FR-1.3 (필수태그 검증) | isValid=false, 호출 #4 | 단위 |
| FR-1.4 (파일크기 제한) | isValid=false, 호출 #1 | 단위 |
| FR-1.5 (픽셀 데이터 길이) | errors warning, 호출 #6~7 | 단위 |
| FR-2.3 (메타데이터 추출) | metadata 필드 | 통합 |
| FR-3.1 (복셀데이터 변환) | voxelData 필드 | 통합 |
| FR-5.1 (구조화된 에러 코드) | ErrorResult.errorCode | 단위 |

---

## 2. 해결 완료된 주요 이슈 및 기술 스택

### 설계 결정 사항 (ADR)
1. **팩토리 함수 패턴 채택**: `createClass`/`new` 대신 `createParseResult()` 순수 객체 반환. IEC 62304 Class A 단순성 — 프로토타입 체인 복잡성 제거, 테스트 직관성, 메모리 오버헤드 최소화.
2. **errors 배열 ErrorResult[] 구조화**: 단순 문자열 배열 대신 userMessage/debugInfo/errorCode/severity 포함 객체 배열. 사용자용/개발자용 메시지 분리 표시 가능.
3. **JSDoc @typedef 기반 타입 정의**: TypeScript 대신 JSDoc — 빌드 파이프라인 컴파일 단계 추가 최소화, IDE 타입 힌트 + 브라우저 직접 실행.
4. **metadata 필드 null 허용**: DICOM 파싱 초기 단계 실패 시 메타데이터 추출 전이므로 null 설정, errors에 원인 기록.

### 복잡도 추적 (해결)
- **CT-1** (overrides 스프레드 병합 타입 안전성): JSDoc 타입 힌트 + 코드 리뷰로 완화. 팩토리 내 타입 검증 생략, 호출부(parseDICOM.js)에서 올바른 타입 전달 설계.
- **CT-2** (errors 배열 참조 독립성): DEFAULTS를 함수 본문 내에 선언하여 매 호출 시 새 배열 인스턴스 생성. 공유 참조 문제 원천 차단.

### 생성 산출물
| 파일 | 설명 | 크기 |
|------|------|------|
| docs/spec-kit/01_spec.md | ParseResult 타입 팩토리 명세서 (287줄) | ~8.2KB |
| docs/spec-kit/02_plan.md | 기술 계획서 (5 Phase, 4 ADR, 복잡도 추적) | ~10.2KB |
| docs/spec-kit/03_tasks.md | 10개 태스크 분할 (T001~T010, ~12시간) | ~14.5KB |

---

## 3. 미완료 / Next Steps

### 현재 상태
- **!plan 완료** — spec-kit 3종(01_spec, 02_plan, 03_tasks) 생성 완료
- **!draft 대기** — 실제 소스코드 구현 단계로 전환 필요

### Next Steps (우선순위 순)
1. **!draft 실행**: Phase 1 (T001~T002) 디렉토리 생성 및 Vitest 설정
2. **Phase 2 구현**: T003 ErrorResult typedef → T004 ParseResult typedef → T005 createParseResult() 팩토리
3. **Phase 3 연동**: T006 호출 #1~#3 (초기검증) + T007 호출 #4~#7 (파싱/추출) 병렬 가능 → T008 UiController 분기
4. **Phase 4 검증**: T009 단위 테스트 (10개 케이스) → T010 정적 분석/추적성 매트릭스 완성
5. **IEC 62304 Class A 추적성 매트릭스 업데이트**: 전체 FR/COMP 매핑 최종 검증

### 리스크/주의사항
- parseDICOM.js 리팩토링 시 7개 호출 지점 불일치 리스크 → 테스트 커버리지로 완화
- isValid=true 조건 엄격성: severity=error 없음 + metadata!=null + voxelData!=null 모두 충족 시만 true
- debugInfo 필드: 내부 구조 노출 금지 원칙(FR-4.5) 준수 — console.debug만, 사용자 화면 미노출

### 병렬 수행 가능 그룹 (참고)
- 그룹 A: T001 + T002 (Phase 1 병렬)
- 그룹 B: T006 + T007 (Phase 3 호출 지점 병렬)
- 그룹 C: T009 // T008 (Phase 3~4 병렬, 테스트는 UI 연동과 무관)
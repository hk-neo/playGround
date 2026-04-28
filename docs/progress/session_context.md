# Session Context — PLAYG-1823

## 1. 시스템 아키텍처/컨벤션 (유실 절대 금지)

### 프로젝트 기본 정보
- **언어/런타임**: JavaScript (ES2020+, ESM 모듈)
- **빌드**: Vite 5.x
- **테스트**: Vitest 3.x + jsdom + @vitest/coverage-v8
- **타겟 플랫폼**: 웹 브라우저
- **코딩 컨벤션**: 순수 JS, 외부 런타임 의존성 없음, ES Module 전용

### DICOM 파서 모듈 구조
```
viewer/src/data/dicomParser/
  ParseContext.js           # createParseContext() 팩토리 함수 (본 티켓 수정 대상)
  constants.js              # 파싱 관련 상수
  dicomDictionary.js        # TRANSFER_SYNTAX 상수 제공 (IMPLICIT_VR_LE, BIG_ENDIAN, EXPLICIT_VR_LE)
  metaGroupParser.js        # ParseContext 호출처 (메타 그룹 파싱)
  metadataParser.js         # ParseContext 호출처 (메타데이터 파싱)
  tagReader.js              # 태그 읽기 유틸리티
  validateTransferSyntax.js # 전송 구문 검증
  index.js                  # 모듈 진입점 (export)

viewer/tests/unit/
  ParseContext.test.js      # ParseContext 전용 단위 테스트 (신규 생성 예정)
```

### ParseContext 객체 스펙 (핵심 데이터 모델)
- **함수 시그니처**: `createParseContext(buffer, transferSyntaxUID, startOffset=0)`
- **반환 객체 속성**:
  - `buffer`: 원본 ArrayBuffer
  - `dataView`: DataView 래퍼 (바이트 오더 제어용)
  - `offset`: startOffset으로 초기화 (기본값 0)
  - `isLittleEndian`: 전송 구문에 따라 자동 설정
  - `isExplicitVR`: 전송 구문에 따라 자동 설정
  - `transferSyntaxUID`: 전달받은 UID
  - `errors[]`: 파싱 중 오류/경고 수집 배열

### 전송 구문(Transfer Syntax) UID 매핑
| UID                      | 상수명           | isExplicitVR | isLittleEndian |
|--------------------------|------------------|-------------|----------------|
| 1.2.840.10008.1.2.1      | EXPLICIT_VR_LE   | true        | true           |
| 1.2.840.10008.1.2        | IMPLICIT_VR_LE   | false       | true           |
| 1.2.840.10008.1.2.2      | BIG_ENDIAN       | true        | false          |
| null/undefined/알수없음  | (기본값 폴백)     | true        | true           |

### 버퍼 읽기 유틸리티 메서드 (8개)
| 메서드                | 동작                                              |
|-----------------------|---------------------------------------------------|
| readUint16()          | 2바이트 부호없는 정수 읽기, offset += 2            |
| readUint32()          | 4바이트 부호없는 정수 읽기, offset += 4            |
| readInt16()           | 2바이트 부호있는 정수 읽기, offset += 2            |
| readString(length)    | 지정 길이 문자열 읽기, offset += length            |
| readBytes(length)     | 지정 길이 Uint8Array 읽기, offset += length        |
| advance(amount)       | offset을 지정량만큼 전진                           |
| hasRemaining(n)       | 버퍼에 n바이트 이상 남았는지 boolean 반환          |
| remaining()           | buffer.byteLength - offset 반환                    |

### 설계 결정 사항 (ADR)
1. **리터럴 객체 패턴**: 클래스 대신 리터럴 객체 반환. 기존 코드 일관성 유지, 클로저 기반 메서드로 this 바인딩 이슈 없음. 단, 구조 분해 시 this가 undefined가 되므로 반드시 `ctx.readUint16()` 형태로 호출 필요.
2. **errors 배열 기반 에러 수집**: 버퍼 경계 초과 시 예외 발생이 아닌 errors 배열에 구조화된 객체 기록 후 안전한 기본값 반환. DICOM 파일 손상이 잦아 파싱을 멈추지 않는 전략 채택.
3. **DataView 생성자에 TypeError 위임**: buffer가 null인 경우 `new DataView(null)`이 자체 TypeError 발생 → 별도 null 체크 불필요.
4. **startOffset 검증 로직**: 음수/버퍼 초과 시 Math.min/Math.max로 보정 + errors 배열에 경고 기록.

### 버퍼 경계 보호 설계 (NFR-002)
- 각 read 메서드 선두에 `hasRemaining()` 체크 추가 예정
- 초과 시 errors에 `{ type: 'READ_OVERFLOW', offset, requested, available }` 기록
- 초과 시 안전 기본값: readUint16/32/readInt16 → 0, readString → 빈 문자열, readBytes → 빈 Uint8Array
- `remaining()`은 `Math.max(0, buffer.byteLength - offset)` 적용하여 음수 반환 방지
- startOffset 보정: 음수→0, 초과→buffer.byteLength, 보정 시 `{ type: 'INVALID_START_OFFSET', requested, corrected }` 기록

---

## 2. 해결 완료된 주요 이슈 및 기술 스택

### PLAYG-1823: createParseContext() 파싱컨텍스트 팩토리 상세설계
- **이슈 유형**: Detailed Design (task 카테고리)
- **수행 내용**: !plan 작업으로 Spec-Kit 3종 명세서 작성 완료

#### Gap Analysis 결과
- FR-001 ~ FR-020: 기존 ParseContext.js에 **이미 구현 완료** 상태
- 보완 필요 항목 (4건):
  - NFR-002: 버퍼 경계 초과 읽기 시 에러 수집 및 안전한 기본값 반환 (미구현)
  - EC-002: startOffset > buffer.byteLength 시 remaining() 음수 반환 방지 (미구현)
  - EC-003: offset 초과 시 read 메서드가 DataView 예외 발생 → 방어 로직 필요
  - EC-004/EC-005: readBytes(0)/readString(0)/빈 ArrayBuffer 경계 케이스 미검증

### 산출물 파일
| 파일                        | 내용                                        | 크기       |
|-----------------------------|---------------------------------------------|------------|
| docs/spec-kit/01_spec.md    | 기능 명세서 (FR-001~020, NFR-001~003, EC-001~005, US-1~4) | 7,163 chars |
| docs/spec-kit/02_plan.md    | 기술 구현 계획서 (4-Phase, Gap Analysis, Key Decisions)   | 11,581 chars |
| docs/spec-kit/03_tasks.md   | 태스크 분할 (T001~T013, 4-Phase, 10.5시간 예상)           | 10,371 chars |
| docs/summary.md             | 작업 요약                                   | -          |

---

## 3. 미완료 / Next Steps

### 구현 태스크 (T001 ~ T013) 전체 미실행
!plan 단계까지만 완료되었으며, 실제 코드 수정은 아직 시작하지 않음.

#### Phase 1: Setup
- [ ] T001: 브랜치 `feature/PLAYG-1823-parse-context-factory` 생성 및 개발 환경 확인
- [ ] T002: `viewer/tests/unit/ParseContext.test.js` 테스트 스켈레톤 작성 (Suite A~D)

#### Phase 2: Foundational (핵심 인프라 보완)
- [ ] T003: startOffset 검증 로직 추가 — 음수→0 보정, 초과→byteLength 보정, errors 기록
- [ ] T004: 버퍼 경계 보호 로직 추가 — `_checkBounds(ctx, byteCount)` 헬퍼, 각 read 메서드에 hasRemaining 선두 체크
- [ ] T005: JSDoc 보완 (@throws, @typedef), EC-004/005 검증

#### Phase 3: User Stories (테스트 구현)
- [ ] T006: Suite A — 전송 구문별 설정 테스트 (FR-002~004, FR-019~020), 7개 케이스
- [ ] T007: Suite B — 버퍼 읽기 메서드 테스트 (FR-011~015, FR-018), 7개 케이스
- [ ] T008: Suite C — offset 제어 메서드 테스트 (FR-010, FR-016, FR-017), 5개 케이스
- [ ] T009: Suite D — 에러 및 예외 처리 테스트 (NFR-002, EC-001~005), 11개 케이스
- [ ] T010: 전체 단위 테스트 실행 및 커버리지 90% 이상 검증

#### Phase 4: Integration
- [ ] T011: metaGroupParser.js, metadataParser.js 회귀 테스트
- [ ] T012: lint/format/JSDoc 정합성 최종 검증
- [ ] T013: git commit 및 push

### 의존성 그래프
```
T001 -> T002
  |
T003 -> T004 -> T005  (순차: 인프라 보완)
           |
  T006, T007, T008, T009  (병렬 가능: 독립 테스트 스위트)
           |
        T010  (순차: 전체 테스트 검증)
           |
  T011 -> T012 -> T013  (순차: 통합 및 마무리)
```

### 주의 사항
- ParseContext 메서드는 클로저 기반 리터럴 객체이므로 구조 분해 할당 금지: 반드시 `ctx.readUint16()` 형태로 호출
- errors 배열에 민감 정보(PHI)가 기록되지 않도록 주의
- 기존 파서(metaGroupParser, metadataParser)와의 회귀 없음 확인 필수
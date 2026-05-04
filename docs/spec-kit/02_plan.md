# Implementation Plan: phiGuard.js - PHI 마스킹 보안 가드 모듈

**Branch**: `feature/PLAYG-1831-phi-guard` | **Date**: 2026-05-04 | **Spec**: `docs/spec-kit/01_spec.md`
**Ticket**: `PLAYG-1831` | **Type**: Detailed Design (SDS-3.12)

---

## Summary

DICOM 메타데이터 객체에서 환자 식별 정보(PHI)를 자동 감지하여 `[REDACTED]` 마스킹 문자열로 치환하는
`phiGuard.js` 보안 모듈의 구현 계획이다.
이 모듈은 `maskPhiFields()`, `getPhiValue()`, `dumpPhiValues()` 세 개의 함수를 제공하며,
WeakMap 기반 `phiStore`를 통해 원본 PHI 값을 모듈 스코프에 안전하게 캡슐화한다.
`metadataParser.js`의 Step 8에서 파싱 완료 직후 `maskPhiFields(metadata)`가 호출되어
외부로 노출되는 메타데이터에 평문 PHI가 포함되지 않도록 보장한다.
IEC 62304 Class A 안전 등급과 HIPAA Safe Harbor 원칙을 준수하는 최하위 무의존 보안 모듈로 설계된다.

---

## Technical Context

| 항목 | 내용 |
| --- | --- |
| **Language/Version** | JavaScript (ES2020+), Vanilla JS, 외부 프레임워크 없음 |
| **Primary Dependencies** | 없음 (최하위 독립 보안 모듈) |
| **Storage** | WeakMap 기반 인메모리 저장 (GC 연동, 영속화 없음) |
| **Testing** | Vitest 단위 테스트 (6개 TC, 100% 분기 커버리지 목표) |
| **Target Platform** | 모던 브라우저 (Chrome, Firefox, Edge), 로컬 파일 전용 |
| **Performance Goals** | O(1) WeakMap 조회, PHI_FIELDS 순회 O(3) 고정 |
| **Constraints** | IEC 62304 Class A, HIPAA Safe Harbor, 외부 라이브러리 금지 |

### 추적성 매핑

| 추적 ID | 요구사항 | 구현 단계
|---------|----------|-----------| FR-1.4 | 픽셀 데이터 태그 오프셋 반환 | STEP 1~7
| FR-2.2 | Little Endian 바이트 오더 읽기 | STEP 4, 5
| NFR-1 | 버퍼 경계 안전성 | STEP 3, 6

### 제약사항

- 폴백 경로에서만 실행: 정상 파싱 시 호출되지 않음
- Little Endian 전용: Big Endian DICOM은 TODO-BE로 이관
- DataView 읽기에만 의존: 추가 메모리 할당 없음
- 단일 스레드: 비동기 처리 불필요
---

## Constitution Check
*GATE: 설계 원칙(Constitution) 준수 여부 확인*

- **SOLID 원칙**: SRP 준수 - phiGuard.js는 PHI 마스킹 및 원본 값 보관의 단일 책임 수행. 의존 모듈이 없어 DIP 역전 없이 순수 함수 형태로 구현. OCP는 PHI_FIELDS 상수 확장으로 새 필드 추가 시 기존 코드 수정 없이 대응 가능.
- **레이어 분리**: Data Access Layer 최하위에 위치. metadataParser.js(Business Logic Layer)와 index.js(배럴 export)만이 이 모듈을 소비. 상위 레이어로만 의존 방향이 흐르는 단방향 구조 준수.
- **에러 처리 전략**: 예외 throw 없이 null/undefined 입력 시 동일 값 그대로 반환(NFR-4 견고성). 비 PHI 필드 조회 시 undefined 반환으로 명시적 거부. 모든 경로에서 예외 발생 없이 안전 종료 보장.
- **보안 고려사항**: phiStore를 WeakMap으로 모듈 스코프에 캡슐화하여 외부에서 직접 접근 불가(TC-2). PHI_FIELDS 외 필드 조회 차단으로 정보 유출 방지(SEC-3). dumpPhiValues()는 @internal로 프로덕션 미노출(TC-4). 원본 값은 WeakMap 참조로 metadata 객체 GC 시 자동 해제.

---

## Project Structure

### Documentation
```text
docs/
├── spec-kit/
│   ├── 01_spec.md          # phiGuard.js 기능 명세서
│   ├── 02_plan.md          # 본 문서 - 구현 계획
│   └── 03_tasks.md         # 작업 분해 구조
└── artifacts/
    ├── SDS.md              # 소프트웨어 상세 설계서
    ├── SAD.md              # 소프트웨어 아키텍처 명세서
    └── SRS.md              # 소프트웨어 요구사항 명세서
```
---

## Implementation Approach

### STEP 1: 함수 시그니처 정의 및 입력 검증

### Source Code
```text
viewer/src/data/dicomParser/
├── phiGuard.js             # [신규] PHI 마스킹 보안 가드 모듈
│                           #   - maskPhiFields(metadata)
│                           #   - getPhiValue(metadata, field)
│                           #   - dumpPhiValues(metadata) (@internal)
│                           #   - PHI_FIELDS 상수
│                           #   - PHI_MASK 상수
│                           #   - phiStore WeakMap (모듈 스코프)
├── metadataParser.js       # [소비] Step 8에서 maskPhiFields(metadata) 호출
├── index.js                # [수정] maskPhiFields, getPhiValue export 추가
├── tagReader.js            # [기존] 의존 관계 없음
├── parseContext.js         # [기존] 의존 관계 없음
└── dicomMetadata.js        # [기존] 의존 관계 없음

viewer/tests/
└── unit.test.js            # [수정] TC-12.1 ~ TC-12.6 테스트 케이스 추가
                            #   describe('phiGuard - PHI 마스킹 보안 가드') 블록
```

---

## Implementation Approach

### STEP 2: 탐색 상수 정의

#### Phase 1: 상수 및 내부 구조 정의 (Setup)

- `PHI_FIELDS` 배열 상수를 `['patientName', 'patientID', 'patientBirthDate']`로 선언 (const + Object.freeze로 불변 보장)
- `PHI_MASK` 상수를 `'[REDACTED]'` 문자열로 선언
- `phiStore`를 `new WeakMap()`으로 모듈 스코프에 선언 (export 불가)
- JSDoc `@internal` 태그로 `dumpPhiValues`를 내부 전용으로 문서화

#### Phase 2: maskPhiFields() 코어 구현 (Core Implementation)

**함수 시그니처:** `maskPhiFields(metadata) => metadata | null | undefined`

**알고리즘:**
1. **입력 검증**: metadata가 null 또는 undefined이면 해당 값을 그대로 반환 (예외 없음, NFR-4)
2. **타입 검증**: metadata가 객체가 아니면(문자열, 숫자 등) 입력값을 그대로 반환
3. **PHI_FIELDS 순회**: for...of로 PHI_FIELDS 배열을 순회
4. **값 존재 확인**: metadata[field]가 truthy한 값(빈 문자열, undefined, null 제외)인지 확인
5. **원본 보관**: 기존 원본 값을 phiStore에 저장. 이미 저장된 객체면 덮어쓰지 않고 해당 필드만 갱신
6. **마스킹 적용**: metadata[field]를 PHI_MASK('[REDACTED]')로 치환
7. **빈 값 처리**: 빈 문자열(''), undefined, null 값은 마스킹하지 않고 원본 그대로 유지 (TC-12.5)
8. **반환**: 마스킹이 적용된 metadata 객체 반환 (동일 참조, 복사본 아님)

**phiStore 내부 구조:**
```javascript
// phiStore 키-값 구조:
// Key: metadata 객체 참조 (WeakMap 키)
// Value: { patientName: 원본값, patientID: 원본값, patientBirthDate: 원본값 }
```

#### Phase 3: getPhiValue() 구현

**함수 시그니처:** `getPhiValue(metadata, field) => string | undefined`

**알고리즘:**
1. **입력 검증**: metadata가 null/undefined이면 undefined 반환
2. **필드 화이트리스트 확인**: field가 PHI_FIELDS에 포함되지 않으면 undefined 반환 (SEC-3, TC-12.4)
3. **phiStore 조회**: phiStore.get(metadata)로 저장된 원본 값 맵 조회
4. **마스킹 이력 확인**: 저장된 맵이 없으면(마스킹 이력 없음) undefined 반환
5. **필드 값 반환**: 저장된 맵에서 field에 해당하는 원본 값 반환, 없으면 undefined

#### Phase 4: dumpPhiValues() 구현 (@internal)

**함수 시그니처:** `dumpPhiValues(metadata) => Object`

**알고리즘:**
1. **입력 검증**: metadata가 null/undefined이면 빈 객체 {} 반환
2. **phiStore 조회**: phiStore.get(metadata)로 원본 값 맵 조회
3. **복사 반환**: 저장된 맵이 있으면 펼침 연산자(...)로 얕은 복사하여 반환
4. **이력 없음**: 저장된 맵이 없으면 빈 객체 {} 반환

#### Phase 5: 단위 테스트 작성 (Testing)

**테스트 파일:** `viewer/tests/unit.test.js` 내 `describe('phiGuard')` 블록 추가

| TC ID | 테스트명 | 입력 | 기대 결과 | 관련 요구사항 |
| ----- | ------- | ---- | -------- | ------------ |
| TC-12.1 | patientName 마스킹 | { patientName: '홍길동', ... } | patientName === '[REDACTED]' | FR-4.1, HAZ-3.1 |
| TC-12.2 | patientID 마스킹 | { patientID: 'P001', ... } | patientID === '[REDACTED]' | FR-4.1 |
| TC-12.3 | getPhiValue 원본 조회 | 마스킹된 객체, 'patientName' | '홍길동' 반환 | FR-4.5 |
| TC-12.4 | 비 PHI 필드 조회 차단 | 마스킹된 객체, 'rows' | undefined 반환 | SEC-3 |
| TC-12.5 | 빈 문자열 마스킹 생략 | { patientName: '', ... } | patientName === '' 유지 | NFR-4 |
| TC-12.6 | null 객체 안전 처리 | null | null 반환, 예외 없음 | NFR-4 |

#### Phase 6: 배럴 export 및 통합 (Integration)

- `index.js`에 `maskPhiFields`와 `getPhiValue`만 named export로 추가
- `dumpPhiValues`는 @internal이므로 export하지 않음 (테스트에서만 내부 경로로 직접 import)
- `metadataParser.js`의 Step 8에서 `import { maskPhiFields } from './phiGuard.js'` 후 호출 확인
- 기존 통합 테스트 회귀 없음 확인

**구현 내용**:
```javascript
        } catch (e) {
            break;  // 예외 발생 시 루프 탈출
        }
    }
```

- **결정 1: WeakMap을 phiStore 자료구조로 채택** — 이유: DICOM 뷰어는 대용량 파일을 반복 처리하므로 일반 Map 사용 시 metadata 객체에 대한 강한 참조가 메모리 누수를 유발한다. WeakMap은 키 객체가 GC될 때 엔트리가 자동 삭제되어 메모리 안전성을 보장한다 (US-4, NFR-4).

- **결정 2: PHI_FIELDS를 const + Object.freeze로 불변화** — 이유: 런타임에 PHI 필드 목록이 변경되면 마스킹 누락 또는 과마스킹이 발생할 수 있다. HIPAA Safe Harbor 최소 식별 정보 3종을 보장하기 위해 불변 배열로 선언한다 (TC-1).

- **결정 3: 빈 문자열 및 falsy 값 마스킹 제외** — 이유: 실제 PHI 값이 없는 필드(빈 문자열, undefined, null)를 마스킹하면 오히려 정보가 존재한다는 오해를 줄 수 있다. 의미 있는 값만 마스킹하여 마스킹 자체의 신뢰성을 높인다 (TC-12.5).

- **결정 4: dumpPhiValues()를 @internal로 분류하고 배럴 export에서 제외** — 이유: 프로덕션 UI에서 모든 원본 PHI 값을 일괄 조회하는 기능은 정보 유출 위험이 있다. 개발/테스트 환경에서만 내부 경로로 접근 가능하도록 제한한다 (TC-4, SEC-3).

- **결정 5: maskPhiFields()가 입력 객체를 직접 수정(mutate)하고 동일 참조 반환** — 이유: 복사본을 생성하면 대용량 DICOM 메타데이터에서 메모리 오버헤드가 발생한다. metadataParser.js 파이프라인 내부에서만 호출되므로 호출자가 동일 객체가 수정됨을 보장받는다. Immutable 패턴보다 성능이 우선되는 내부 파이프라인 컨텍스트이다.

- **결정 6: 예외 throw 전략 대신 null/undefined 그대로 반환** — 이유: metadataParser.js의 9단계 파이프라인에서 PHI 마스킹(Step 8) 단계가 예외를 throw하면 파싱 전체가 실패한다. 견고성(NFR-4)을 위해 null/undefined 입력은 예외 없이 그대로 반환하는 방어적 프로그래밍을 적용한다.

---

## Complexity Tracking

### C-01: WeakMap 키-값 구조 설계
- **복잡도 이유**: phiStore의 값이 단순 스칼라가 아닌 `{ patientName, patientID, patientBirthDate }` 형태의 객체이다. 동일 metadata 객체에 maskPhiFields()가 중복 호출될 경우 기존 저장 값을 보존하면서 새 필드만 갱신해야 한다.
- **정당성**: 중복 호출 시 원본 값 누실을 방지하기 위해 `const stored = phiStore.get(metadata) || {}; stored[field] = original; phiStore.set(metadata, stored)` 패턴으로 upsert 동작 보장.
- **해결 방안**: maskPhiFields() 내부에서 기존 저장 값이 있으면 펼침 연산자로 병합.

### C-02: PHI_FIELDS 화이트리스트 기반 접근 제어
- **복잡도 이유**: getPhiValue()가 임의 필드명을 동적으로 받으므로, 런타임에 PHI_FIELDS 포함 여부를 확인해야 한다. PHI_FIELDS.includes(field) 검사가 O(n)이지만 n=3으로 상수 시간과 동등.
- **정당성**: 화이트리스트 방식이 블랙리스트보다 보안적으로 안전. 새로운 PHI 필드 추가 시 PHI_FIELDS만 수정하면 되므로 OCP 준수.

### C-03: dumpPhiValues()의 얕은 복사 반환
- **복잡도 이유**: phiStore.get(metadata)의 원본 객체를 그대로 반환하면 호출자가 원본을 수정할 수 있어 phiStore 무결성이 훼손된다.
- **정당성**: 펼침 연산자 `{ ...stored }`로 얕은 복사하여 반환. 값이 모두 문자열이므로 깊은 복사는 불필요.

### C-04: maskPhiFields()의 mutate vs immutable 트레이드오프
- **복잡도 이유**: 입력 객체를 직접 수정하는 방식은 함수형 순수성 원칙에 위배된다. 그러나 DICOM 파싱 파이프라인의 성능 요구사항과 내부 호출 컨텍스트를 고려하여 mutate 방식 채택.
- **정당성**: metadataParser.js 내부 파이프라인에서만 호출되며, 호출 시점(Step 8)에서는 이후 단계가 반환뿐이므로 부작용이 통제된다. 복사본 생성에 따른 GC 부하를 회피.

---

## References

- Spec: `docs/spec-kit/01_spec.md`
- 티켓: `PLAYG-1831`
- 아키텍처 문서: `docs/artifacts/SAD.md` (COMP-3 phiGuard)
- 상세 설계서: `docs/artifacts/SDS.md` (SDS-3.12 phiGuard)
- 요구사항 명세서: `docs/artifacts/SRS.md`
- 위험 관리 보고서: `docs/artifacts/RMR.md` (HAZ-3.1)
- 연관 SDS 항목: SDS-3.9 metadataParser (Step 8 호출자)
- 추적 FR: FR-4.1, FR-4.5
- 추적 HAZ: HAZ-3.1
- 추적 SEC: SEC-3
- 추적 NFR: NFR-4
- 추적 SAD COMP: COMP-3 (phiGuard)
- 표준: IEC 62304 Class A, HIPAA Safe Harbor

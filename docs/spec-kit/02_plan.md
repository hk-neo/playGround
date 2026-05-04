# 구현 계획서: getPhiValue() PHI 원본 안전조회

**Branch**: `feature/PLAYG-1832` | **Date**: 2026-05-04 | **Spec**: `docs/spec-kit/01_spec.md`
**Ticket**: `PLAYG-1832` | **Type**: Detailed Design (SDS-3.13)

---

## Summary
getPhiValue() 함수는 maskPhiFields()에 의해 마스킹된 DICOMMetadata 객체에서 원본 PHI(보호대상건강정보) 값을 안전하게 조회하는 함수이다. 모듈 내부 WeakMap(phiStore)에 저장된 원본 값 중 PHI_FIELDS 상수 배열에 정의된 인가 필드(patientName, patientID, patientBirthDate)만 선택적으로 반환하며, 비인가 필드에 대해서는 undefined를 반환하여 SEC-3 접근 제어 요구사항을 충족한다.

---

## Technical Context

| 항목                     | 내용                    |
| ------------------------ | ----------------------- |
| **Language/Version**     | JavaScript (ES2020+)   |
| **Primary Dependencies** | phiGuard.js 모듈 내부 WeakMap, PHI_FIELDS 상수 |
| **Storage**              | WeakMap(phiStore) - 모듈 스코프 캡슐화 |
| **Testing**              | Vitest 단위 테스트 프레임워크 |
| **Target Platform**      | 웹 브라우저 (DICOM Viewer) |
| **Performance Goals**    | O(1) 조회 - WeakMap.get + 객체 속성 접근 |
| **Constraints**          | IEC 62304 Class A, PHI 접근 제어 의무 |

---

## Constitution Check
*GATE: 설계 원칙(Constitution) 준수 여부 확인*

- **SOLID 원칙**: 단일 책임 원칙(SRP) 준수 - getPhiValue()는 PHI 원본 값 조회라는 단일 기능만 수행. 개방-폐쇄 원칙(OCP) 준수 - PHI_FIELDS 배열 확장으로 새 필드 추가 가능하며 함수 수정 불필요
- **레이어 분리**: phiGuard.js 모듈이 PHI 보호 레이어를 담당하며, maskPhiFields()/getPhiValue() 쌍으로 캡슐화 제공. 비즈니스 로직(UI/리포트)은 getPhiValue() 인터페이스를 통해서만 PHI에 접근
- **에러 처리 전략**: 예외 발생 없이 undefined 반환 방식 채택. null/undefined 입력, 비인가 필드, 마스킹 이력 없음 등 모든 예외 상황에서 안전하게 undefined를 반환하여 호출부에서 null-check로 처리 가능
- **보안 고려사항**: WeakMap 캡슐화로 외부 직접 접근 불가. PHI_FIELDS 허용 목록(allowlist) 방식으로 명시적으로 인가된 필드만 조회 가능. 호출부 추적성 확보로 코드 리뷰에서 PHI 접근 지점 식별 가능

---

## Project Structure

### Documentation
```text
docs/
+-- spec-kit/
|   +-- 01_spec.md
|   +-- 02_plan.md
|   +-- 03_tasks.md
```

### Source Code
```text
viewer/src/data/dicomParser/
+-- phiGuard.js              # getPhiValue() 구현 대상
+-- index.js                 # 배럴 export (getPhiValue re-export)

viewer/tests/
+-- unit.test.js             # TC-13.1 ~ TC-13.8 단위 테스트
```

---

## Implementation Approach

### Phase 순서 및 접근 방식
1. **Setup**: phiGuard.js 기존 코드 구조 파악 - phiStore(WeakMap), PHI_FIELDS 상수, maskPhiFields() 함수 확인
2. **Core Implementation**: getPhiValue(metadata, field) 함수 구현 - PHI_FIELDS 인가 검사 -> phiStore.get(metadata) -> 원본 값 반환
3. **Testing**: TC-13.1~TC-13.8 단위 테스트 작성 및 통과 확인
4. **Integration**: index.js 배럴 export에 getPhiValue 추가, 기존 251개 테스트 회귀 검증

### Key Technical Decisions
- **결정 1**: WeakMap을 PHI 저장소로 사용 - 이유: metadata 객체가 GC될 때 원본 값도 자동 해제되어 메모리 누수 방지. 모듈 스코프에서만 접근 가능하여 캡슐화 보장
- **결정 2**: PHI_FIELDS 허용 목록(allowlist) 방식 채택 - 이유: denylist 방식보다 보안성이 높으며, 새로운 PHI 필드 추가 시 상수만 수정하면 됨
- **결정 3**: 예외 대신 undefined 반환 - 이유: getPhiValue()는 조회 함수이므로 try-catch 오버헤드 없이 null-check로 안전하게 처리 가능. 호출부에서 옵셔널 체이닝과 자연스럽게 연동
- **결정 4**: 별도의 로깅/감사 기능은 포함하지 않음 - 이유: IEC 62304 Class A 수준에서는 단위 테스트로 충분히 검증 가능. 향후 Class B/C 승급 시 감사 로그 추가 가능

### 함수 시그니처 및 구현 의사코드
```javascript
export function getPhiValue(metadata, field) {
  // 1. PHI 필드 인가 검사 (SEC-3)
  if (!PHI_FIELDS.includes(field)) return undefined;
  // 2. WeakMap에서 원본 값 객체 조회
  const originals = phiStore.get(metadata);
  // 3. 원본 값 반환 (없으면 undefined)
  return originals ? originals[field] : undefined;
}
```

### 내부 동작 알고리즘 (4단계)
1. **PHI 필드 인가 검사**: 입력 field가 PHI_FIELDS 상수 배열에 포함되는지 확인
2. **비인가 필드 차단**: PHI_FIELDS에 없는 필드명이면 즉시 undefined 반환 (SEC-3)
3. **phiStore 조회**: WeakMap phiStore에서 metadata 객체를 키로 사용하여 원본 값 객체 획득
4. **원본 반환**: 원본 객체에서 field에 해당하는 값 반환. 없으면 undefined

### 조건별 동작표
| 조건 | 동작 | 반환값 | 추적 |
|------|------|--------|------|
| field가 PHI_FIELDS에 포함 | phiStore에서 원본 조회 | 원본 문자열 또는 undefined | FR-4.1 |
| field가 PHI_FIELDS에 없음 | 즉시 차단 | undefined | SEC-3 |
| phiStore에 metadata 키 없음 | 마스킹 이력 없음 | undefined | FR-4.1 |
| metadata가 null/undefined | phiStore.get(null) = undefined | undefined | NFR-4 |
| 원본 값이 존재 | 정상 반환 | 원본 문자열 | FR-4.1 |

---

## Complexity Tracking
- getPhiValue()는 매우 단순한 함수(4줄)로 복잡도가 낮음. cyclomatic complexity = 3 (if + ternary + return)
- PHI_FIELDS.includes() 호출의 O(n) 비용은 n=3으로 무시 가능한 수준
- WeakMap.get()은 O(1)로 성능 우수

---

## References
- Spec: `docs/spec-kit/01_spec.md`
- 티켓: `PLAYG-1832`
- 상위 추적: SAD COMP-3 (phiGuard)
- 관련 요구사항: FR-4.1(PHI 마스킹), SEC-3(접근 제어), HAZ-3.1(정보 유출 방지)
- 표준: IEC 62304 Class A
# Implementation Plan: COMP-1.2 DataValidator

| 항목 | 내용 |
|------|------|
| 티켓 | PLAYG-1376 |
| 컴포넌트 | COMP-1.2 DataValidator (데이터 검증기) |
| Branch | feature/PLAYG-1376 |
| Type | Architecture |
| Date | 2026-04-16 |
| Spec | docs/spec-kit/01_spec.md |

---

## 1. Summary

본 문서는 COMP-1.2 DataValidator 컴포넌트의 구현 계획을 정의한다.
DataValidator는 DICOM 메타데이터의 유효성을 검증하고, 복셀 데이터의 범위를 확인하여
렌더링 파이프라인에 안전한 데이터를 제공하는 무상태 검증 모듈이다.
IEC 62304 Class A 규정을 준수하며, 외부 의존성 없이 순수 TypeScript로 구현한다.

---

## 2. Technical Context

| 항목 | 내용 |
|------|------|
| Language/Version | TypeScript 5.x (Strict mode) |
| Primary Dependencies | 없음 (독립 모듈, 외부 라이브러리 사용 안함) |
| Storage | 없음 (무상태 검증 모듈) |
| Testing | Vitest |
| Target Platform | 웹 브라우저 (Chrome, Edge, Firefox) |
| Performance Goals | 512x512 영상 전체 검증 50ms 이내 |
| Constraints | IEC 62304 Class A 준수, ADR-2 자체 구현 |

### 2.1 성능 목표 상세

- 512x512 DICOM 영상(약 512KB 복셀 데이터) 전체 검증을 50ms 이내에 완료
- TypedArray 직접 접근으로 메모리 복사 오버헤드 제거
- 검증 함수 호출당 0.1ms 이하 응답 시간 (메타데이터 검증 기준)

### 2.2 제약 사항

- IEC 62304 Class A: 소프트웨어 검증 문서화 요건 충족
- ADR-2: 외부 검증 라이브러리 대신 자체 구현 결정
- 순수 함수만 사용하여 부작용(side effect) 없음 보장
- 예외 발생 없이 항상 ValidationResult 객체 반환

---

## 3. Constitution Check

### 3.1 SOLID 원칙 준수

| 원칙 | 적용 내용 |
|------|-----------|
| SRP (단일 책임) | DataValidator는 데이터 검증만 담당하며, 데이터 로딩/변환/렌더링 책임은 갖지 않음 |
| OCP (개방-폐쇄) | 새로운 검증 로직은 private 메서드 추가로 확장 가능하며, 기존 validate 메서드 시그니처 변경 없음 |
| LSP (리스코프 치환) | 해당 없음 (상속 구조 미사용) |
| ISP (인터페이스 분리) | DICOMMetadata 인터페이스는 검증에 필요한 필드만 정의 |
| DIP (의존성 역전) | DataValidator는 구체적 구현이 아닌 DICOMMetadata 인터페이스에만 의존 |

### 3.2 레이어 분리

```
┌─────────────────────────────────┐
│  Rendering Layer                │  ← 검증 결과를 소비
├─────────────────────────────────┤
│  Business Layer                 │  ← 검증 결과 기반 의사결정
├─────────────────────────────────┤
│  Data Layer                     │  ← DataValidator 위치
│  (DataValidator, DICOMParser)   │
└─────────────────────────────────┘
```

- DataValidator는 Data Layer에 위치
- Business/Rendering 계층에는 ValidationResult만 제공
- 상위 계층이 검증 내부 구현에 의존하지 않음

### 3.3 에러 처리 전략

- 예외(exception) 발생 없이 항상 ValidationResult 반환
- 검증 실패는 errors 배열에 메시지로 누적
- 경고 수준은 warnings 배열에 메시지로 누적
- 널/언디파인드 입력은 빈 ValidationResult로 처리 (방어적 프로그래밍)

### 3.4 보안 고려 사항

- 외부 의존성 없음: 공급망 공격(surface) 제로
- 순수 함수: 부작용 없음, 입력에 대한 출력만 보장
- 네트워크/파일 시스템 접근 없음

---

## 4. Project Structure

### 4.1 소스 코드 구조

```
src/
├── data/
│   ├── DataValidator.ts               # DataValidator 클래스 구현
│   └── __tests__/
│       ├── DataValidator.test.ts      # 전체 단위 테스트
│       ├── validateHeader.test.ts     # 헤더 검증 테스트
│       ├── validatePixelSpacing.test.ts  # Pixel Spacing 검증 테스트
│       ├── validateVoxelRange.test.ts    # 복셀 범위 검증 테스트
│       └── validateImageOrientation.test.ts  # Image Orientation 검증 테스트
└── types/
    └── dicom.ts                       # DICOMMetadata, ValidationResult 타입 정의
```

### 4.2 파일별 책임

| 파일 | 책임 | 라인 추정 |
|------|------|-----------|
| src/types/dicom.ts | DICOMMetadata, ValidationResult 인터페이스 정의 | ~40줄 |
| src/data/DataValidator.ts | DataValidator 클래스 전체 구현 | ~250줄 |
| src/data/__tests__/DataValidator.test.ts | 통합 검증 테스트 | ~60줄 |
| src/data/__tests__/validateHeader.test.ts | 헤더 검증 테스트 (10개) | ~100줄 |
| src/data/__tests__/validatePixelSpacing.test.ts | Pixel Spacing 테스트 (5개) | ~60줄 |
| src/data/__tests__/validateVoxelRange.test.ts | 복셀 범위 테스트 (6개) | ~80줄 |
| src/data/__tests__/validateImageOrientation.test.ts | Orientation 테스트 (5개) | ~60줄 |

### 4.3 빌드/설정 파일

| 파일 | 용도 |
|------|------|
| tsconfig.json | TypeScript Strict mode 설정 |
| vitest.config.ts | Vitest 테스트 러너 설정 |
| package.json | 프로젝트 메타데이터 (의존성 없음) |

---

## 5. Implementation Approach

### Phase 1: 기반 설정 (Setup) - 타입 정의, 프로젝트 구조

**목표**: 검증에 필요한 타입과 프로젝트 뼈대를 구축한다.

| 작업 | 세부 내용 | 산출물 |
|------|-----------|--------|
| ValidationResult 인터페이스 정의 | valid(boolean), errors(string[]), warnings(string[]) 필드 | src/types/dicom.ts |
| DICOMMetadata 타입 정의 | COMP-1.1 DICOMParser와 공유하는 메타데이터 타입 | src/types/dicom.ts |
| DataValidator 클래스 스켈레톤 | validate(), private 헬퍼 메서드 시그니처 정의 | src/data/DataValidator.ts |
| 프로젝트 설정 | tsconfig.json(strict), vitest.config.ts, package.json | 프로젝트 루트 |

**완료 기준**:
- TypeScript 컴파일 에러 없음
- 빈 DataValidator 클래스 인스턴스 생성 가능
- 타입 정의가 COMP-1.1과 호환됨

### Phase 2: 핵심 구현 (Core) - Private 헬퍼 함수

**목표**: 모든 검증 메서드가 공통으로 사용하는 유틸리티 함수를 구현한다.

| 작업 | 세부 내용 | 산출물 |
|------|-----------|--------|
| isValidNumber(value) 구현 | NaN, Infinity, null, undefined 걸러내기 | DataValidator private 메서드 |
| checkRange(value, min, max) 구현 | 값이 [min, max] 구간 내에 있는지 확인 | DataValidator private 메서드 |
| 단위 테스트 작성 | 각 헬퍼 함수에 대한 경계값 테스트 | __tests__/DataValidator.test.ts |

**완료 기준**:
- isValidNumber: NaN, Infinity, null, undefined, 음수 입력에 대해 올바른 boolean 반환
- checkRange: 경계값(min, max 포함/미포함)에 대해 올바른 결과 반환
- 헬퍼 함수 테스트 커버리지 100%

### Phase 3: 헤더 검증 (P1)

**목표**: DICOM 메타데이터 필수/선택 필드를 검증한다.

| 작업 | 세부 내용 | 산출물 |
|------|-----------|--------|
| validateHeader(meta) 구현 | 필수 필드 존재 여부 및 타입 검증 | DataValidator 메서드 |
| 필수 필드 검증 | StudyInstanceUID, SeriesInstanceUID, rows, columns, bitsAllocated, pixelRepresentation | validateHeader 로직 |
| 선택 필드 경고 | patientId 누락 시 warnings 추가 | validateHeader 로직 |

**테스트 케이스 (10개)**:

| 번호 | 테스트 설명 | 기대 결과 |
|------|-------------|-----------|
| 1 | 모든 필수 필드가 유효한 경우 | valid=true, errors=0 |
| 2 | StudyInstanceUID 누락 | valid=false, errors에 메시지 포함 |
| 3 | SeriesInstanceUID 누락 | valid=false, errors에 메시지 포함 |
| 4 | rows가 0인 경우 | valid=false, errors에 메시지 포함 |
| 5 | columns가 음수인 경우 | valid=false, errors에 메시지 포함 |
| 6 | bitsAllocated가 지원하지 않는 값인 경우 | valid=false, errors에 메시지 포함 |
| 7 | pixelRepresentation이 0/1이 아닌 경우 | valid=false, errors에 메시지 포함 |
| 8 | patientId 누락 | valid=true, warnings에 메시지 포함 |
| 9 | null 입력 | valid=true, errors=0 (방어적 처리) |
| 10 | 빈 객체 입력 | valid=false, 필수 필드 누락 errors |

### Phase 4: Pixel Spacing 검증 (P1)

**목표**: Pixel Spacing 메타데이터의 유효성을 검증한다.

| 작업 | 세부 내용 | 산출물 |
|------|-----------|--------|
| validatePixelSpacing(meta) 구현 | 누락/비정상 값 탐지, 측정 비활성화 권고 | DataValidator 메서드 |
| 누락 탐지 | pixelSpacing 필드가 없거나 빈 배열인 경우 | validatePixelSpacing 로직 |
| 비정상 값 탐지 | 0, 음수, NaN, Infinity 값 확인 | validatePixelSpacing 로직 |

**테스트 케이스 (5개)**:

| 번호 | 테스트 설명 | 기대 결과 |
|------|-------------|-----------|
| 1 | 정상 Pixel Spacing 값 | valid=true, errors=0 |
| 2 | pixelSpacing 누락 | valid=true, warnings에 측정 비활성화 권고 |
| 3 | pixelSpacing 값이 0인 경우 | valid=false, errors에 비정상 값 메시지 |
| 4 | pixelSpacing 값이 음수인 경우 | valid=false, errors에 비정상 값 메시지 |
| 5 | pixelSpacing 요소가 2개가 아닌 경우 | valid=false, errors에 형식 오류 메시지 |

### Phase 5: 복셀 값 범위 검증 (P1)

**목표**: 복셀 데이터가 BitsAllocated/PixelRepresentation 기반 예상 범위 내에 있는지 확인한다.

| 작업 | 세부 내용 | 산출물 |
|------|-----------|--------|
| validateVoxelRange(voxels, meta) 구현 | TypedArray 기반 범위 검증 | DataValidator 메서드 |
| 범위 산출 | BitsAllocated(8/16) + PixelRepresentation(0:unsigned, 1:signed) → min/max 계산 | validateVoxelRange 로직 |
| 이상치 탐지 | 범위 외 복셀이 5% 초과 시 errors, 1~5% 시 warnings | validateVoxelRange 로직 |
| 통계 정보 | 범위 외 복셀 수, 비율을 warnings에 포함 | validateVoxelRange 로직 |

**테스트 케이스 (6개)**:

| 번호 | 테스트 설명 | 기대 결과 |
|------|-------------|-----------|
| 1 | 모든 복셀이 정상 범위 내 | valid=true, errors=0 |
| 2 | 범위 외 복셀이 1% 미만 | valid=true, warnings에 통계 포함 |
| 3 | 범위 외 복셀이 3% (1~5%) | valid=true, warnings에 이상치 경고 |
| 4 | 범위 외 복셀이 10% (5% 초과) | valid=false, errors에 이상치 오류 |
| 5 | 빈 TypedArray 입력 | valid=true, errors=0 (빈 데이터는 정상) |
| 6 | null voxels 입력 | valid=true, errors=0 (방어적 처리) |

### Phase 6: Image Orientation 검증 (P2)

**목표**: DICOM Image Orientation (Patient) 필드의 수학적 유효성을 검증한다.

| 작업 | 세부 내용 | 산출물 |
|------|-----------|--------|
| validateImageOrientation(meta) 구현 | 단위 벡터 및 직교성 검증 | DataValidator 메서드 |
| 단위 벡터 검증 | 각 행/열 방향 벡터의 크기가 1.0인지 확인 (허용 오차 0.01) | validateImageOrientation 로직 |
| 직교성 검증 | 두 방향 벡터의 내적이 0인지 확인 (허용 오차 0.01) | validateImageOrientation 로직 |

**테스트 케이스 (5개)**:

| 번호 | 테스트 설명 | 기대 결과 |
|------|-------------|-----------|
| 1 | 정상 단위 벡터 + 직교 | valid=true, errors=0 |
| 2 | 단위 벡터가 아닌 경우 (크기 0.5) | valid=false, errors에 단위 벡터 오류 |
| 3 | 직교하지 않는 경우 (내적 0.5) | valid=false, errors에 직교성 오류 |
| 4 | imageOrientation 누락 | valid=true, warnings에 권고 메시지 |
| 5 | imageOrientation 요소가 6개가 아닌 경우 | valid=false, errors에 형식 오류 |

### Phase 7: 통합 및 문서화

**목표**: 전체 검증 파이프라인을 통합하고 문서화를 완료한다.

| 작업 | 세부 내용 | 산출물 |
|------|-----------|--------|
| validate(meta, voxels) 통합 메서드 | 모든 개별 검증을 순차 호출하여 결과 병합 | DataValidator 메서드 |
| 통합 파이프라인 테스트 | validate() 호출 시 전체 검증 흐름 확인 | __tests__/DataValidator.test.ts |

**Edge Cases 테스트 (5개)**:

| 번호 | 테스트 설명 | 기대 결과 |
|------|-------------|-----------|
| 1 | undefined 입력 | valid=true, 빈 ValidationResult 반환 |
| 2 | 메타데이터만 있고 복셀 없음 | 헤더 검증만 수행, 복셀 검증 스킵 |
| 3 | 복셀만 있고 메타데이터 없음 | valid=true, 빈 결과 (방어적 처리) |
| 4 | 매우 큰 복셀 데이터 (512x512) | 50ms 이내 완료, valid 결과 정상 |
| 5 | 모든 필드가 경계값인 메타데이터 | valid=true, errors=0 |

**커버리지 목표**: 90% 이상 달성

**IEC 62304 Class A 문서화**:
- 소프트웨어 단위 검증 결과 기록
- 테스트 케이스와 요구사항 추적표 작성
- 변경 관리를 위한 임계치 상수 문서화

---

## 6. Key Technical Decisions

### 6.1 TypedArray 기반 복셀 접근

| 항목 | 내용 |
|------|------|
| 결정 | 복셀 데이터를 DataView 대신 TypedArray(Int16Array, Uint16Array)로 직접 접근 |
| 이유 | 타입 안전성이 높고, 바이트 단위 접근 오버헤드 없이 성능이 우수함 |
| 대안 | DataView를 사용한 바이트 단위 접근 |
| 기각 사유 | 성능 저하, 타입 안전성 부족, endian 처리 복잡성 |

### 6.2 순수 함수 설계

| 항목 | 내용 |
|------|------|
| 결정 | DataValidator의 모든 검증 메서드는 순수 함수로 구현 |
| 이유 | 상태 관리 복잡성 제거, 테스트 용이성, IEC 62304 추적성 확보 |
| 대안 | 클래스 내부 상태를 유지하는 방식 |
| 기각 사유 | 동시성 문제, 테스트 격리 어려움, 디버깅 복잡성 증가 |

### 6.3 임계치 상수 분리

| 항목 | 내용 |
|------|------|
| 결정 | 검증 임계치(이상치 비율 5%, 부동소수점 오차 0.01 등)를 상수로 분리 |
| 이유 | IEC 62304 변경 관리 요건 충족, 위험 평가 재수행 시 임계치 조정 용이 |
| 대안 | 매직 넘버로 메서드 내에 하드코딩 |
| 기각 사유 | 변경 이력 추적 불가, 위험 평가와의 연관성 부족 |

### 6.4 검증 결과 통합 (Intermediate Aggregation)

| 항목 | 내용 |
|------|------|
| 결정 | 각 개별 검증 결과를 통합하여 단일 ValidationResult로 반환 |
| 이유 | DICOMParser가 한 번에 전체 검증 결과를 받을 수 있어 호출부 단순화 |
| 대안 | 각 검증 메서드가 독립적으로 결과를 반환 |
| 기각 사유 | 호출부에서 결과 병합 로직 필요, 검증 순서 관리 부담 증가 |

---

## 7. Complexity Tracking

### 7.1 복셀 데이터 순회 성능

**리스크**: 500MB 이상의 대용량 복셀 데이터에서 TypedArray 순회 시 메모리 복사 없이 직접 접근이 필요하다.

| 항목 | 내용 |
|------|------|
| 문제 | 대용량 복셀 데이터(512x512 이상) 순회 시 성능 저하 가능 |
| 영향 | 50ms 성능 목표 미달 위험 |
| 완화책 | TypedArray 직접 접근으로 메모리 복사 제거, 순차 접근 패턴 유지 |
| 검증 방법 | 512x512 영상 기준 성능 벤치마크 테스트 작성 |
| 상태 | Phase 7에서 성능 테스트로 확인 예정 |

### 7.2 직교성 검증 수학

**리스크**: 부동소수점 연산의 정밀도 한계로 인해 직교성 검증이 잘못된 결과를 반환할 수 있다.

| 항목 | 내용 |
|------|------|
| 문제 | IEEE 754 부동소수점 오차로 인해 이론적으로 직교인 벡터의 내적이 0이 아닐 수 있음 |
| 영향 | 정상 데이터에 대해 false negative 발생 가능 |
| 완화책 | 허용 오차(epsilon)를 0.01로 설정하여 부동소수점 오차 흡수 |
| 검증 방법 | 다양한 정밀도의 입력 벡터에 대한 단위 테스트 |
| 상태 | Phase 6에서 허용 오차 검증 예정 |

---

## 8. Phase별 일정 및 의존성

```
Phase 1 (기반 설정)
    │
    ▼
Phase 2 (핵심 헬퍼)
    │
    ├──► Phase 3 (헤더 검증, P1)
    ├──► Phase 4 (Pixel Spacing 검증, P1)
    ├──► Phase 5 (복셀 범위 검증, P1)
    └──► Phase 6 (Orientation 검증, P2)
         │
         ▼
    Phase 7 (통합 및 문서화)
```

**참고**: Phase 3~6은 Phase 2 완료 후 병렬 진행 가능하며, Phase 6(P2)은 Phase 3~5(P1) 이후에 수행한다.

---

## 9. References

| 문서 | 경로/식별자 |
|------|-------------|
| Spec | docs/spec-kit/01_spec.md |
| 티켓 | PLAYG-1376 |
| SAD | docs/artifacts/SAD.md (SDS-3.2) |
| SRS | docs/artifacts/SRS.md |

---

*본 문서는 2026-04-16에 작성되었으며, PLAYG-1376 티켓과 연동된다.*

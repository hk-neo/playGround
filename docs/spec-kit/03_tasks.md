# Tasks: [COMP-1.2] DataValidator (데이터 검증기)

**Input**: `docs/spec-kit/01_spec.md`, `docs/spec-kit/02_plan.md`
**Ticket**: PLAYG-1376 | **Date**: 2026-04-16
**Parent**: PLAYG-1385 ([SDS-3.2] DataValidator 상세 설계)

> **형식 안내**
> - `[ID]` : 태스크 번호 (T001 ~ T016)
> - `[P]` : 병렬 실행 가능 여부 표시 (🔀 병렬 가능 / 🔒 순서 필수)
> - `[Story]` : 관련 사용자 스토리 (US-1 ~ US-4)
> - 각 태스크는 **2시간 이내** 완료 가능한 단위로 분할
> - IEC 62304 Class A 추적성 유지 (FR/NFR/HAZ 매핑)
> - ADR-2 자체 구현 원칙 준수 (외부 DICOM 라이브러리 사용 불가)

---## Phase 1: Setup (공통 인프라)

- [ ] **T001** 🔒 프로젝트 디렉토리 구조 생성
  - 파일: `src/data/`, `src/data/__tests__/`, `src/types/`
  - 설명: DataValidator 컴포넌트 개발에 필요한 디렉토리 구조를 생성한다. src/data/는 DataValidator 클래스 구현체 위치, src/data/__tests__/는 단위 테스트 파일 위치, src/types/는 DICOM 타입 인터페이스 정의 위치이다. 각 빈 디렉토리에 .gitkeep 파일을 배치하여 Git 추적을 보장한다.
  - 예상 공수: 0.5시간
  - 의존성: 없음
  - 담당 Story: US-1 ~ US-4 (공통 인프라)
  - 완료 조건:
    - src/data/, src/data/__tests__/, src/types/ 디렉토리 생성 완료
    - 각 디렉토리에 .gitkeep 파일 배치됨
  - 추적: SDS-3.2, ADR-2

- [ ] **T002** 🔒 타입 인터페이스 정의
  - 파일: `src/types/dicom.ts`
  - 설명: DataValidator가 사용할 타입 인터페이스를 정의한다. (1) ValidationResult: { isValid: boolean, errors: string[], warnings: string[] } 형태로 검증 결과를 표현. (2) DICOMMetadata: StudyInstanceUID, SeriesInstanceUID, rows, columns, bitsAllocated, pixelRepresentation, patientId(선택), pixelSpacing(선택), imageOrientationPatient(선택) 등 DICOM 메타데이터 필드를 포함. COMP-1.1 DICOM 파일 파서의 ParseResult와 호환되도록 설계.
  - 예상 공수: 1.0시간
  - 의존성: T001
  - 담당 Story: US-1 ~ US-4
  - 완료 조건:
    - ValidationResult, DICOMMetadata 인터페이스가 COMP-1.1과 호환되게 정의됨
    - TypeScript 컴파일 에러 없음
  - 추적: FR-2.1, SDS-3.2, COMP-1.1

- [ ] **T003** 🔒 DataValidator 클래스 스켈레톤 및 빌드 설정
  - 파일: `src/data/DataValidator.ts`, `tsconfig.json`, `vitest.config.ts`, `package.json`
  - 설명: DataValidator 클래스의 스켈레톤을 생성하고 TypeScript 빌드 및 테스트 환경을 설정한다. (1) DataValidator 클래스에 validate(), validateHeader(), validatePixelSpacing(), validateVoxelRange(), validateImageOrientation() 5개 공개 메서드를 빈 시그니처로 정의. (2) private 헬퍼 메서드 스텁: isValidNumber(), checkRange(). (3) tsconfig.json: strict 모드, ES2022 타겟, vitest 타입 포함. (4) vitest.config.ts: coverage 리포터 설정. (5) package.json: 의존성 및 스크립트 정의.
  - 예상 공수: 1.5시간
  - 의존성: T001, T002
  - 담당 Story: US-1 ~ US-4
  - 완료 조건:
    - 빈 메서드 시그니처 포함된 클래스 컴파일 성공
    - vitest 실행 가능 (0 tests passed 상태)
    - `npm run build` 에러 없음
  - 추적: SDS-3.2, ADR-2, FR-2.1
---

## Phase 2: Foundational (핵심 인프라)

- [ ] **T004** 🔒 private 헬퍼 함수 구현 (isValidNumber, checkRange)
  - 파일: `src/data/DataValidator.ts`
  - 설명: DataValidator 내부에서 사용할 private 헬퍼 함수 2개를 구현한다. (1) `isValidNumber(value): boolean` - 입력값이 유효한 유한수인지 검사. NaN, Infinity, -Infinity, null, undefined, 문자열, 객체에 대해 false를 반환. Number.isFinite()를 기반으로 엄격한 타입 가드 적용. (2) `checkRange(value, min, max): boolean` - 값이 [min, max] 폐구간 내에 있는지 검사. isValidNumber를 선행 호출하여 유효하지 않은 값은 false 반환. 경계값(min, max)을 포함하여 정확히 동작.
  - 예상 공수: 1.0시간
  - 의존성: T003
  - 담당 Story: US-1 ~ US-4 (공통 유틸)
  - 완료 조건:
    - isValidNumber가 NaN/Infinity/null/undefined/문자열에 대해 false 반환
    - isValidNumber가 유효한 숫자(0, 음수, 양수, 소수)에 대해 true 반환
    - checkRange가 경계값 포함하여 정확히 동작 (min, max 값 포함)
    - checkRange가 유효하지 않은 입력에 대해 false 반환
  - 추적: FR-2.1, FR-2.2, SDS-3.2

- [ ] **T005** 🔒 헬퍼 함수 단위 테스트
  - 파일: `src/data/__tests__/DataValidator.test.ts`
  - 설명: T004에서 구현한 헬퍼 함수에 대한 포괄적 단위 테스트를 작성한다. isValidNumber 테스트 8개: (1) 정수 true, (2) 소수 true, (3) 0 true, (4) 음수 true, (5) NaN false, (6) Infinity false, (7) null false, (8) undefined false. checkRange 테스트 6개: (1) 범위 내 값 true, (2) 하한 경계값 true, (3) 상한 경계값 true, (4) 범위 외 하한 false, (5) 범위 외 상한 false, (6) 유효하지 않은 입력 false. Vitest 프레임워크 사용.
  - 예상 공수: 1.0시간
  - 의존성: T004
  - 담당 Story: US-1 ~ US-4
  - 완료 조건:
    - isValidNumber 8개 테스트 모두 PASS
    - checkRange 6개 테스트 모두 PASS
    - 헬퍼 함수 코드 커버리지 100%
  - 추적: IEC 62304 Class A, FR-2.1, FR-2.2
---

## Phase 3: User Story 1 — 헤더 검증 (P1) 🎯 MVP

**Goal**: DICOM 메타데이터 필수 필드 존재 여부 및 값 범위 검증
**Independent Test**: 임의 DICOMMetadata 객체로 validateHeader() 단위 테스트

- [ ] **T006** 🔀 [US-1] validateHeader 구현
  - 파일: `src/data/DataValidator.ts`
  - 설명: DICOM 메타데이터 헤더의 필수 필드 존재 여부 및 값 범위를 검증하는 `validateHeader(metadata: DICOMMetadata): ValidationResult` 메서드를 구현한다. 필수 필드 6개: StudyInstanceUID, SeriesInstanceUID, rows, columns, bitsAllocated, pixelRepresentation. 필수 필드 누락 시 errors 배열에 필드명과 함께 추가하고 isValid=false 설정. 값 범위 검증: rows/cols는 1 이상, bitsAllocated는 8/16/32 중 하나, pixelRepresentation은 0 또는 1. 선택 필드 patientId 누락 시 warnings에 추가 (에러 아님). UID 형식 검증: 점으로 구분된 숫자 문자열 형식 확인.
  - 예상 공수: 2.0시간
  - 의존성: T004, T005
  - 담당 Story: US-1
  - 완료 조건:
    - 필수 필드 6개 누락 시 isValid=false, errors에 누락 필드명 포함
    - rows/columns가 0 또는 음수일 때 errors 추가
    - bitsAllocated가 8/16/32 외의 값일 때 errors 추가
    - pixelRepresentation이 0/1 외의 값일 때 errors 추가
    - 선택 필드(patientId) 누락 시 warnings 추가, isValid는 true 유지
    - UID 형식 불일치 시 errors 추가
  - 추적: FR-2.1, US-1, TC-1.1~TC-1.5, SDS-3.2

- [ ] **T007** 🔒 [US-1] validateHeader 단위 테스트 (10개)
  - 파일: `src/data/__tests__/validateHeader.test.ts`
  - 설명: validateHeader 메서드에 대한 포괄적 단위 테스트를 작성한다. TC-1.1: 모든 필수 필드가 유효한 정상 메타데이터에서 isValid=true. TC-1.2: StudyInstanceUID 누락 시 isValid=false. TC-1.3: rows가 0일 때 isValid=false. TC-1.4: bitsAllocated가 24일 때 isValid=false. TC-1.5: pixelRepresentation이 2일 때 isValid=false. Edge Cases (5개): (1) SeriesInstanceUID 누락, (2) columns 음수, (3) patientId 누락 시 warnings만 발생, (4) 빈 UID 문자열, (5) 모든 필수 필드 누락. 총 10개 테스트 케이스.
  - 예상 공수: 1.5시간
  - 의존성: T006
  - 담당 Story: US-1
  - 완료 조건:
    - TC-1.1 ~ TC-1.5 모두 PASS
    - Edge Cases 5개 모두 PASS
    - validateHeader 코드 커버리지 90% 이상
  - 추적: IEC 62304 Class A, FR-2.1, US-1, TC-1.1~TC-1.5
---

## Phase 4: User Story 2 — Pixel Spacing 검증 (P1)

**Goal**: Pixel Spacing(0028,0030) 값 존재 여부 및 유효성 검증
**Independent Test**: pixelSpacing 값이 정상/누락/0/음수/NaN인 메타데이터로 단위 테스트

- [ ] **T008** 🔀 [US-2] validatePixelSpacing 구현
  - 파일: `src/data/DataValidator.ts`
  - 설명: DICOM 메타데이터의 Pixel Spacing(0028,0030) 태그 값을 검증하는 `validatePixelSpacing(metadata: DICOMMetadata): ValidationResult` 메서드를 구현한다. 검증 로직: (1) pixelSpacing 필드 누락 시 warnings 추가 (치과 CBCT에서 누락은 흔하므로 warning 레벨). (2) pixelSpacing이 배열이 아닌 경우 errors 추가. (3) 배열 요소 수가 2가 아닌 경우 errors 추가 (row spacing, col spacing). (4) 요소 값이 0인 경우 errors 추가 (0으로 나누기 방지). (5) 요소 값이 음수인 경우 errors 추가. (6) 요소 값이 NaN/Infinity인 경우 errors 추가. isValidNumber 헬퍼를 재사용.
  - 예상 공수: 1.0시간
  - 의존성: T004, T005
  - 담당 Story: US-2
  - 완료 조건:
    - pixelSpacing 누락 시 warnings 추가 (isValid는 true)
    - pixelSpacing이 배열이 아니거나 요소 수가 2가 아닐 때 errors 추가
    - 값이 0/음수/NaN/Infinity일 때 errors 추가
    - 정상 pixelSpacing 값에서 isValid=true, errors/warnings 없음
  - 추적: FR-2.2, US-2, TC-2.1~TC-2.5, SDS-3.2

- [ ] **T009** 🔒 [US-2] validatePixelSpacing 단위 테스트 (5개)
  - 파일: `src/data/__tests__/validatePixelSpacing.test.ts`
  - 설명: validatePixelSpacing 메서드에 대한 단위 테스트를 작성한다. TC-2.1: 정상 pixelSpacing [0.3, 0.3]에서 isValid=true. TC-2.2: pixelSpacing 누락 시 warnings 발생, isValid=true. TC-2.3: pixelSpacing이 [0, 0.3]일 때 errors 발생 (0 값). TC-2.4: pixelSpacing이 [-0.1, 0.3]일 때 errors 발생 (음수). TC-2.5: pixelSpacing이 [NaN, 0.3]일 때 errors 발생 (NaN). 총 5개 테스트 케이스.
  - 예상 공수: 1.0시간
  - 의존성: T008
  - 담당 Story: US-2
  - 완료 조건:
    - TC-2.1 ~ TC-2.5 모두 PASS
    - validatePixelSpacing 코드 커버리지 90% 이상
  - 추적: IEC 62304 Class A, FR-2.2, US-2, TC-2.1~TC-2.5
---

## Phase 5: User Story 3 — 복셀 범위 검증 (P1)

**Goal**: 복셀 데이터가 BitsAllocated/PixelRepresentation 기반 예상 범위 내인지 검증
**Independent Test**: 8-bit/16-bit, signed/unsigned 조합으로 범위 내/외 복셀 테스트

- [ ] **T010** 🔀 [US-3] validateVoxelRange 구현
  - 파일: `src/data/DataValidator.ts`
  - 설명: 복셀 데이터가 BitsAllocated/PixelRepresentation 기반의 예상 범위 내에 있는지 검증하는 `validateVoxelRange(voxelData: TypedArray, metadata: DICOMMetadata): ValidationResult` 메서드를 구현한다. (1) metadata에서 BitsAllocated, PixelRepresentation을 읽어 예상 min/max 범위 계산: 8-bit unsigned(0~255), 16-bit unsigned(0~65535), 16-bit signed(-32768~32767). (2) TypedArray를 순회하며 각 복셀 값이 예상 범위 내인지 확인. (3) 범위 외 복셀 비율이 전체의 5% 초과 시 isValid=false. (4) 범위 외 복셀 비율이 5% 이하이면 warnings에 통계 정보(min, max, outOfRangeCount, outOfRangeRatio) 포함. (5) TypedArray가 비어있으면 errors 추가.
  - 예상 공수: 2.0시간
  - 의존성: T004, T005
  - 담당 Story: US-3
  - 완료 조건:
    - 8-bit unsigned 복셀이 0~255 범위에서 isValid=true
    - 16-bit signed 복셀이 -32768~32767 범위에서 isValid=true
    - 범위 외 복셀 5% 초과 시 isValid=false
    - 범위 외 복셀 5% 이하 시 warnings에 통계 정보 포함
    - 빈 TypedArray 입력 시 errors 발생
  - 추적: FR-2.3, US-3, TC-3.1~TC-3.6, SDS-3.2, HAZ-2.1

- [ ] **T011** 🔒 [US-3] validateVoxelRange 단위 테스트 (6개)
  - 파일: `src/data/__tests__/validateVoxelRange.test.ts`
  - 설명: validateVoxelRange 메서드에 대한 단위 테스트를 작성한다. TC-3.1: 8-bit unsigned 정상 범위 복셀에서 isValid=true. TC-3.2: 16-bit signed 정상 범위 복셀에서 isValid=true. TC-3.3: 16-bit unsigned에서 범위 외 값 5% 초과 시 isValid=false. TC-3.4: 범위 외 값 5% 이하 시 warnings 포함, isValid=true. TC-3.5: 빈 TypedArray 입력 시 errors 발생. TC-3.6: metadata의 bitsAllocated/pixelRepresentation 누락 시 errors 발생. 총 6개 테스트 케이스. TypedArray 생성 헬퍼 포함.
  - 예상 공수: 1.5시간
  - 의존성: T010
  - 담당 Story: US-3
  - 완료 조건:
    - TC-3.1 ~ TC-3.6 모두 PASS
    - validateVoxelRange 코드 커버리지 90% 이상
  - 추적: IEC 62304 Class A, FR-2.3, US-3, TC-3.1~TC-3.6, HAZ-2.1
---

## Phase 6: User Story 4 — Image Orientation 검증 (P2)

**Goal**: Image Orientation Patient(0020,0037) 단위 벡터 및 직교성 검증
**Independent Test**: 정상/누락/비직교/비단위벡터 입력으로 단위 테스트

- [ ] **T012** 🔀 [US-4] validateImageOrientation 구현
  - 파일: `src/data/DataValidator.ts`
  - 설명: DICOM 메타데이터의 Image Orientation Patient(0020,0037) 태그 값을 검증하는 `validateImageOrientation(metadata: DICOMMetadata): ValidationResult` 메서드를 구현한다. 검증 로직: (1) imageOrientationPatient 필드 누락 시 warnings 추가 (P2 우선순위이므로 warning 레벨). (2) 값이 6요소 배열이 아닌 경우 errors 추가. (3) 배열을 두 개의 3D 벡터(rowCosines, colCosines)로 분리. (4) 각 벡터의 크기(magnitude)가 1.0인지 확인 (오차 허용치 0.01). (5) 두 벡터의 내적(dot product)이 0인지 확인하여 직교성 검증 (오차 허용치 0.01). (6) 비단위 벡터 또는 비직교 벡터 발견 시 errors에 원인 포함.
  - 예상 공수: 1.5시간
  - 의존성: T004, T005 (Phase 3~5 이후 실행 권장)
  - 담당 Story: US-4
  - 완료 조건:
    - 6요소 배열 검증, 요소 수 불일치 시 errors 추가
    - 단위 벡터 확인 (오차 0.01 이내)
    - 직교성 확인 (내적 < 0.01)
    - imageOrientationPatient 누락 시 warnings 추가
    - 비직교/비단위벡터 시 적절한 errors 메시지 포함
  - 추적: FR-2.4, US-4, TC-4.1~TC-4.5, SDS-3.2

- [ ] **T013** 🔒 [US-4] validateImageOrientation 단위 테스트 (5개)
  - 파일: `src/data/__tests__/validateImageOrientation.test.ts`
  - 설명: validateImageOrientation 메서드에 대한 단위 테스트를 작성한다. TC-4.1: 정상 단위 직교 벡터 [1,0,0,0,1,0]에서 isValid=true. TC-4.2: imageOrientationPatient 누락 시 warnings 발생. TC-4.3: 비직교 벡터 [1,0,0,1,1,0]에서 errors 발생 (내적 != 0). TC-4.4: 비단위 벡터 [2,0,0,0,1,0]에서 errors 발생 (magnitude != 1). TC-4.5: 요소 수 불일치 [1,0,0]에서 errors 발생. 총 5개 테스트 케이스.
  - 예상 공수: 1.0시간
  - 의존성: T012
  - 담당 Story: US-4
  - 완료 조건:
    - TC-4.1 ~ TC-4.5 모두 PASS
    - validateImageOrientation 코드 커버리지 90% 이상
  - 추적: IEC 62304 Class A, FR-2.4, US-4, TC-4.1~TC-4.5
---

## Phase 7: Integration & Finalization

- [ ] **T014** 🔒 통합 validate() 메서드 구현
  - 파일: `src/data/DataValidator.ts`
  - 설명: 개별 검증 메서드(validateHeader, validatePixelSpacing, validateVoxelRange, validateImageOrientation)의 결과를 단일 ValidationResult로 병합하는 통합 `validate(metadata: DICOMMetadata, voxelData?: TypedArray): ValidationResult` 메서드를 구현한다. (1) validateHeader 항상 실행. (2) validatePixelSpacing 항상 실행. (3) validateVoxelRange는 voxelData가 제공된 경우에만 실행. (4) validateImageOrientation 항상 실행. (5) 모든 결과의 errors를 병합. (6) 모든 결과의 warnings를 병합. (7) 어느 하나라도 isValid=false이면 최종 isValid=false. (8) 검증 실패 시 어느 검증 단계에서 실패했는지 식별 가능하도록 에러 메시지에 접두어 추가.
  - 예상 공수: 1.5시간
  - 의존성: T006, T008, T010, T012 (모든 개별 검증 메서드)
  - 담당 Story: US-1 ~ US-4
  - 완료 조건:
    - header + pixelSpacing + voxelRange + orientation 검증 결과가 단일 ValidationResult로 병합됨
    - voxelData 미제공 시 voxelRange 검증 건너뛰기
    - 어느 하나라도 isValid=false이면 최종 isValid=false
    - 각 검증 단계의 에러 메시지에 접두어 포함
  - 추적: FR-2.1~FR-2.4, SDS-3.2, US-1~US-4

- [ ] **T015** 🔒 Edge Cases 통합 테스트 (5개) + 성능 벤치마크
  - 파일: `src/data/__tests__/DataValidator.test.ts`
  - 설명: 통합 validate() 메서드에 대한 Edge Cases 테스트와 성능 벤치마크를 작성한다. EC-1: 모든 필드 누락 메타데이터에서 다수 errors 정상 수집. EC-2: 정상 메타데이터 + 정상 복셀 데이터에서 isValid=true. EC-3: 정상 메타데이터 + 범위 외 복셀 10%에서 isValid=false. EC-4: null/undefined 메타데이터 입력 시 TypeError 방지. EC-5: 빈 객체 {} 메타데이터에서 모든 필수 필드 누락 errors. 성능 벤치마크: 512x512 Int16Array 복셀 데이터(약 0.5MB)에 대해 validate() 실행 시간이 50ms 이내인지 확인.
  - 예상 공수: 1.5시간
  - 의존성: T014
  - 담당 Story: US-1 ~ US-4
  - 완료 조건:
    - EC-1 ~ EC-5 모두 PASS
    - 512x512 영상 validate() 50ms 이내 완료 확인
    - 통합 validate() 코드 커버리지 90% 이상
  - 추적: IEC 62304 Class A, FR-2.1~FR-2.4, NFR-P1 (성능)

- [ ] **T016** 🔒 코드 리뷰 및 IEC 62304 문서화 완료
  - 파일: `docs/artifacts/traceability_COMP-1.2.md`
  - 설명: DataValidator 컴포넌트의 최종 코드 리뷰 및 IEC 62304 Class A 문서화를 완료한다. (1) 전체 코드 리뷰: 코딩 컨벤션 준수, JSDoc 완성도, 에러 메시지 일관성 확인. (2) 테스트 커버리지 90% 이상 달성 확인. (3) 추적성 매트릭스 작성: FR-2.1~FR-2.4 -> US-1~US-4 -> TC-1.1~TC-4.5 -> Task T001~T016 양방향 매핑. (4) HAZ 매핑: HAZ-2.1(복셀 데이터 왜곡) -> 완화 태스크 매핑. (5) 변경 이력 작성. (6) ADR-2 자체 구현 원칙 준수 확인.
  - 예상 공수: 1.5시간
  - 의존성: T015
  - 담당 Story: US-1 ~ US-4 (문서화)
  - 완료 조건:
    - 전체 코드 커버리지 90% 이상
    - 추적성 매트릭스 작성 완료
    - JSDoc이 SDS-3.2 인터페이스 명세와 일치
    - HAZ-2.1 완화 조치가 태스크에 매핑됨
  - 추적: IEC 62304 Class A, FR-2.1~FR-2.4, HAZ-2.1, ADR-2
---

## 의존성 그래프 (Dependency Graph)

```
T001 (디렉토리 구조)
  |
  +--> T002 (타입 인터페이스)
  |      |
  |      +--> T003 (클래스 스켈레톤 + 빌드 설정)
  |             |
  |             +--> T004 (헬퍼 함수 구현)
  |                    |
  |                    +--> T005 (헬퍼 함수 테스트)
  |                    |
  |                    +--> T006 (validateHeader 구현)     🔀 병렬 가능
  |                    |      |
  |                    |      +--> T007 (헤더 테스트)
  |                    |
  |                    +--> T008 (validatePixelSpacing)    🔀 병렬 가능
  |                    |      |
  |                    |      +--> T009 (PixelSpacing 테스트)
  |                    |
  |                    +--> T010 (validateVoxelRange)      🔀 병렬 가능
  |                           |
  |                           +--> T011 (복셀범위 테스트)
  |
  |              T012 (validateImageOrientation)  <-- Phase 3~5 이후
  |                    |
  |                    +--> T013 (Orientation 테스트)
  |
  +--> T014 (통합 validate)  <-- T006, T008, T010, T012
         |
         +--> T015 (통합 테스트 + 벤치마크)
                |
                +--> T016 (문서화)
```

---

## 요약 통계

| 항목 | 값 |
|------|------|
| 총 태스크 수 | 16개 |
| Phase 1 (Setup) | 3개 (T001 ~ T003) |
| Phase 2 (Foundational) | 2개 (T004 ~ T005) |
| Phase 3 (US-1 헤더 검증) | 2개 (T006 ~ T007) |
| Phase 4 (US-2 PixelSpacing) | 2개 (T008 ~ T009) |
| Phase 5 (US-3 복셀 범위) | 2개 (T010 ~ T011) |
| Phase 6 (US-4 Orientation) | 2개 (T012 ~ T013) |
| Phase 7 (Integration) | 3개 (T014 ~ T016) |
| 총 예상 공수 | 20시간 |
| 구현 태스크 | 8개 |
| 테스트 태스크 | 6개 |
| 인프라/문서 태스크 | 2개 |
---

## 예상 공수 상세

| Phase | 태스크 | 예상 소요 시간 |
|-------|--------|---------------|
| Phase 1: Setup | T001, T002, T003 | 3.0시간 |
| Phase 2: Foundational | T004, T005 | 2.0시간 |
| Phase 3: US-1 헤더 | T006, T007 | 3.5시간 |
| Phase 4: US-2 PixelSpacing | T008, T009 | 2.0시간 |
| Phase 5: US-3 복셀범위 | T010, T011 | 3.5시간 |
| Phase 6: US-4 Orientation | T012, T013 | 2.5시간 |
| Phase 7: Integration | T014, T015, T016 | 4.5시간 |
| **합계** | **16개** | **21.0시간** |

---

## IEC 62304 Class A 추적성 요약

| FR | User Story | 테스트 케이스 | 담당 태스크 |
|----|-----------|--------------|------------|
| FR-2.1 (헤더 검증) | US-1 | TC-1.1~TC-1.5 | T006, T007 |
| FR-2.2 (Pixel Spacing 검증) | US-2 | TC-2.1~TC-2.5 | T008, T009 |
| FR-2.3 (복셀 범위 검증) | US-3 | TC-3.1~TC-3.6 | T010, T011 |
| FR-2.4 (Image Orientation 검증) | US-4 | TC-4.1~TC-4.5 | T012, T013 |

| HAZ | 위험 설명 | 완화 태스크 |
|-----|-----------|-----------|
| HAZ-2.1 | 복셀 데이터 범위 외 값으로 영상 왜곡 | T010, T011, T014 (범위 검증 + 통합 방어) |
| HAZ-5.2 | 비표준 메타데이터로 기능 정지 | T006, T008, T012 (graceful fallback, warning 레벨 처리) |

---

*본 문서는 PLAYG-1376 ([COMP-1.2] DataValidator 데이터 검증기) 티켓의 태스크 분해 문서입니다.*
*IEC 62304 Class A 준수를 위해 작성되었으며, 최종 업데이트: 2026-04-16*
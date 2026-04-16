# Feature Specification: [COMP-1.2] 데이터 검증기 (DataValidator)

**Feature Branch**: `PLAYG-1376-data-validator`
**Status**: Draft | **Date**: 2026-04-16
**Ticket**: `PLAYG-1376` | **Type**: Architecture
**Parent**: `PLAYG-1386` | **Input**: SAD(PLAYG-1311), SDS-3.2

---

## 1. 개요

### 1.1 컴포넌트 식별
- **컴포넌트 ID**: COMP-1.2
- **컴포넌트명**: 데이터 검증기 (DataValidator)
- **아키텍처 계층**: Data Layer
- **소유 티켓**: PLAYG-1376

### 1.2 목적 및 범위
본 컴포넌트는 Simple CBCT Viewer 애플리케이션에서 DICOM 메타데이터의 유효성 검증,
Pixel Spacing 확인, 복셀 값 범위 검증, Image Orientation Patient 검증을 담당하는
핵심 Data Layer 컴포넌트이다.
DICOM 파일 파서(COMP-1.1)가 추출한 데이터의 무결성을 보장하며,
IEC 62304 Class A 의료기기 소프트웨어 표준을 준수한다.

### 1.3 추적성
- **FR 추적**: FR-1.2 (DICOM 파일 형식 검증), FR-1.4 (복셀 데이터 파싱 및 검증),
  FR-2.4 (MPR 메타데이터 검증), FR-4.2 (Pixel Spacing 검증)
- **관련 ADR**: ADR-2 (자체 구현)
- **위험 완화**: HAZ-1.1 (DICOM 파싱 오류로 인한 영상 왜곡, 초기위험: 높음),
  HAZ-2.1 (PixelSpacing 누락으로 인한 측정 부정확, 초기위험: 높음)
- **의존성**: 없음 (독립 모듈)

---

## 2. User Scenarios & Testing
### US-1: DICOM 메타데이터 헤더 유효성 검증 (Priority: P1)

- **설명**: DICOM 파일 파서가 추출한 메타데이터의 헤더 필수 항목이 올바른지 검증한다.
  환자 ID, 스터디 UID, 시리즈 UID, 영상 차원 정보 등 필수 태그의 존재 여부와
  데이터 타입 적합성을 확인한다.
- **Why this priority**: 메타데이터 검증은 모든 후속 검증의 전제조건이다.
  헤더 정보가 부정확하면 복셀 데이터 해석 자체가 무효화되므로 최우선으로 검증해야 한다.
- **사전 조건**: DICOM 파일 파서(COMP-1.1)가 메타데이터를 성공적으로 추출함
- **입력**: `DICOMMetadata` 객체
- **기대 결과**: `ValidationResult` 객체 (isValid, warnings, errors)
- **Independent Test**: 임의의 DICOMMetadata 객체를 생성하여 필수 필드 누락/오류 시
  isValid=false 및 적절한 errors 메시지 반환을 확인
- **Acceptance Scenarios**:
  - Given: DICOMMetadata에 필수 필드가 모두 포함됨, When: validateHeader 호출,
    Then: isValid=true, warnings=[], errors=[]
  - Given: DICOMMetadata에서 StudyInstanceUID가 누락됨,
    When: validateHeader 호출, Then: isValid=false, errors에 해당 필드 누락 메시지 포함
  - Given: rows 또는 columns가 0 이하의 값임,
    When: validateHeader 호출, Then: isValid=false, errors에 유효 범위 오류 메시지 포함
  - Given: bitsAllocated가 지원하지 않는 값(예: 32)임,
    When: validateHeader 호출,
    Then: isValid=false, errors에 미지원 비트 할당 오류 메시지 포함
- **테스트 케이스**:
  - TC-1.1: 모든 필수 필드가 유효한 메타데이터 입력 시 isValid=true 반환
  - TC-1.2: patientId 누락 시 경고(warning) 포함, isValid=true 유지
  - TC-1.3: rows=0 인 경우 isValid=false 및 에러 메시지 반환
  - TC-1.4: seriesInstanceUID가 빈 문자열인 경우 isValid=false 반환
  - TC-1.5: bitsAllocated가 8, 16이 아닌 경우 isValid=false 반환
- **FR 추적**: FR-1.2

### US-2: Pixel Spacing 메타데이터 검증 (Priority: P1)

- **설명**: DICOM 메타데이터의 Pixel Spacing(0028,0030) 값이 존재하고 유효한 양수인지
  확인한다. Pixel Spacing은 영상 내 측정 기능의 정확도에 직접적인 영향을 미치므로
  반드시 검증해야 한다.
- **Why this priority**: Pixel Spacing 누락은 HAZ-2.1(측정 부정확) 위험과 직결된다.
  측정 기능의 안전성 확보를 위해 최우선 검증이 필요하다.
- **사전 조건**: 메타데이터 헤더 검증(US-1)이 완료됨
- **입력**: `DICOMMetadata` 객체
- **기대 결과**: `ValidationResult` 객체
- **Independent Test**: pixelSpacing이 [0, 0], [null, null], 누락 등 다양한 경계 조건에서
  적절한 경고/에러 반환을 확인
- **Acceptance Scenarios**:
  - Given: pixelSpacing이 [0.3, 0.3]과 같은 유효한 양수 쌍임,
    When: validatePixelSpacing 호출,
    Then: isValid=true, warnings=[], errors=[]
  - Given: pixelSpacing이 누락됨(undefined),
    When: validatePixelSpacing 호출,
    Then: isValid=false, errors에 Pixel Spacing 누락 메시지 포함
  - Given: pixelSpacing이 [-0.3, 0.3]과 같이 음수 포함임,
    When: validatePixelSpacing 호출,
    Then: isValid=false, errors에 유효하지 않은 값 메시지 포함
  - Given: pixelSpacing이 [NaN, 0.3]과 같이 비정상 값 포함임,
    When: validatePixelSpacing 호출,
    Then: isValid=false, errors에 비정상 값 감지 메시지 포함
- **테스트 케이스**:
  - TC-2.1: 유효한 pixelSpacing [0.25, 0.25] 입력 시 isValid=true
  - TC-2.2: pixelSpacing 누락 시 isValid=false, 측정 비활성화 권고 메시지
  - TC-2.3: pixelSpacing 값이 0인 경우 isValid=false
  - TC-2.4: pixelSpacing이 NaN/Infinity인 경우 isValid=false
  - TC-2.5: pixelSpacing 배열 길이가 2가 아닌 경우 isValid=false
- **FR 추적**: FR-4.2
### US-3: 복셀 값 범위 검증 (Priority: P1)

- **설명**: 추출된 복셀 데이터의 값이 DICOM 메타데이터에 명시된 비트 깊이 및 픽셀 표현에
  부합하는지 검증한다. BitsAllocated, PixelRepresentation을 기반으로 허용 범위를 산출하고,
  이상치(outlier)를 탐지하여 데이터 무결성을 보장한다.
- **Why this priority**: 복셀 값의 범위 이탈은 영상 왜곡(HAZ-1.1)의 직접적 원인이 된다.
  잘못된 복셀 값은 잘못된 진단으로 이어질 수 있으므로 의료기기 안전에 필수적이다.
- **사전 조건**: 복셀 데이터가 ArrayBuffer로 추출됨, 메타데이터 파싱 완료
- **입력**: `voxels: ArrayBuffer`, `meta: DICOMMetadata`
- **기대 결과**: `ValidationResult` 객체
- **Independent Test**: 의도적으로 범위를 벗어난 복셀 값을 포함하는 ArrayBuffer를 생성하여
  이상치 탐지 및 isValid=false 반환을 확인
- **Acceptance Scenarios**:
  - Given: 16-bit signed 복셀 데이터가 -32768~32767 범위 내에 있음,
    When: validateVoxelRange 호출,
    Then: isValid=true, warnings=[], errors=[]
  - Given: 복셀 데이터에 NaN 값이 포함됨,
    When: validateVoxelRange 호출,
    Then: isValid=false, errors에 NaN 값 감지 메시지 포함
  - Given: 복셀 데이터에 허용 범위를 벗어나는 값이 5% 이상 포함됨,
    When: validateVoxelRange 호출,
    Then: isValid=false, errors에 이상치 비율 초과 메시지 포함
  - Given: 복셀 데이터 배열 길이가 rows*columns와 불일치함,
    When: validateVoxelRange 호출,
    Then: isValid=false, errors에 데이터 길이 불일치 메시지 포함
- **테스트 케이스**:
  - TC-3.1: 유효한 16-bit unsigned 복셀 데이터 입력 시 isValid=true
  - TC-3.2: 유효한 8-bit unsigned 복셀 데이터 입력 시 isValid=true
  - TC-3.3: 복셀 데이터에 Infinity/NaN 포함 시 isValid=false
  - TC-3.4: 전체 복셀의 10%가 범위 밖일 때 isValid=false 및 이상치 비율 경고
  - TC-3.5: 복셀 배열 길이가 예상과 불일치할 때 isValid=false
  - TC-3.6: 빈 ArrayBuffer 입력 시 isValid=false
- **FR 추적**: FR-1.4

### US-4: Image Orientation Patient 검증 (Priority: P2)

- **설명**: DICOM 태그 Image Orientation Patient(0020,0037) 값의 존재 여부와
  수학적 유효성(단위 벡터, 직교성)을 검증한다. MPR(다중평면재구성) 렌더링의
  정확도에 직접적인 영향을 미치는 메타데이터이다.
- **Why this priority**: Image Orientation은 MPR 기능에 필요하나, 단일 축 영상(기본 뷰)에서는
  필수가 아니다. 누락 시 경고만 발생시키고 기본 축 방향을 적용할 수 있어 P2로 분류한다.
- **사전 조건**: 메타데이터 헤더 검증(US-1)이 완료됨
- **입력**: `DICOMMetadata` 객체
- **기대 결과**: `ValidationResult` 객체
- **Independent Test**: 유효/무효한 방향 벡터를 생성하여 직교성 검증 및 경고 발생을 확인
- **Acceptance Scenarios**:
  - Given: imageOrientationPatient가 [1,0,0,0,1,0]과 같은 유효한 6요소 배열임,
    When: validateImageOrientation 호출,
    Then: isValid=true, warnings=[], errors=[]
  - Given: imageOrientationPatient가 누락됨,
    When: validateImageOrientation 호출,
    Then: isValid=true, warnings에 기본 축 방향 적용 안내 메시지 포함
  - Given: imageOrientationPatient 벡터의 직교성 편차가 허용 임계치 초과임,
    When: validateImageOrientation 호출,
    Then: isValid=false, errors에 직교성 위반 메시지 포함
  - Given: imageOrientationPatient가 6요소가 아닌 배열임,
    When: validateImageOrientation 호출,
    Then: isValid=false, errors에 형식 오류 메시지 포함
- **테스트 케이스**:
  - TC-4.1: 유효한 정규 직교 벡터 입력 시 isValid=true
  - TC-4.2: imageOrientationPatient 누락 시 isValid=true, 경고 포함
  - TC-4.3: 직교성 위반(내적이 0이 아님) 시 isValid=false
  - TC-4.4: 벡터 길이가 6이 아닌 경우 isValid=false
  - TC-4.5: NaN/Infinity가 포함된 벡터 시 isValid=false
- **FR 추적**: FR-2.4

### Edge Cases: 경계 조건 및 예외 상황

- **EC-1**: 메타데이터 객체가 null/undefined인 경우 모든 검증 함수는
  isValid=false, errors=['메타데이터가 존재하지 않습니다']를 반환
- **EC-2**: Pixel Spacing이 [Number.MAX_VALUE, 0.3]처럼 극단적 값인 경우
  isValid=false 반환
- **EC-3**: 복셀 데이터 ArrayBuffer가 byteLength=0인 경우 isValid=false 반환
- **EC-4**: Image Orientation 벡터 요소가 모두 0인 경우 isValid=false 반환
- **EC-5**: bitsAllocated=8이지만 복셀 데이터가 16-bit로 해석되는 경우
  데이터 길이 불일치 에러 반환

---
## 3. Requirements

### 3.1 기능 요구사항

| ID | 요구사항 | FR 추적 | 우선순위 |
|----|----------|---------|----------|
| REQ-1 | validateHeader(meta)를 통해 DICOM 메타데이터 필수 필드의 존재 여부와 |
| | 데이터 타입 적합성을 검증한다. 필수 필드: StudyInstanceUID, SeriesInstanceUID, |
| | rows, columns, bitsAllocated, pixelRepresentation. | FR-1.2 | P1 |
| REQ-2 | validatePixelSpacing(meta)를 통해 Pixel Spacing(0028,0030) 값이 |
| | 존재하고 유효한 양수 쌍인지 확인한다. 비정상 시 측정 기능 비활성화를 권고한다. |
| | | FR-4.2 | P1 |
| REQ-3 | validateVoxelRange(voxels, meta)를 통해 복셀 값이 메타데이터에 명시된 |
| | 비트 깊이 및 픽셀 표현에 부합하는지 검증하고 이상치를 탐지한다. | FR-1.4 | P1 |
| REQ-4 | validateImageOrientation(meta)를 통해 Image Orientation Patient(0020,0037) |
| | 값의 존재 여부와 수학적 유효성(단위 벡터, 직교성)을 검증한다. | FR-2.4 | P2 |
| REQ-5 | checkRange(value, min, max) private 함수를 통해 값이 지정된 범위 내에 |
| | 있는지 확인한다. | - | P1 |
| REQ-6 | isValidNumber(value) private 함수를 통해 값이 유효한 숫자 |
| | (NaN/Infinity 아님)인지 확인한다. | - | P1 |

### 3.2 비기능 요구사항

| ID | 요구사항 | 기준 |
|----|----------|------|
| NFR-1 | 성능: 512x512 영상(약 0.5MB)의 전체 검증 완료 시간 | 50ms 이내 |
| NFR-2 | 신뢰성: 모든 검증 함수는 예외를 발생시키지 않고 항상 ValidationResult 반환 | 100% |
| NFR-3 | 순수성: 모든 공개 검증 함수는 부작용이 없는 순수 함수 | - |
| NFR-4 | 재사용성: 각 검증 함수는 독립적으로 호출 가능 | - |
| NFR-5 | 추적성: 모든 에러/경고 메시지에 관련 FR ID 및 DICOM 태그 정보 포함 | - |

### 3.3 핵심 데이터 모델

#### ValidationResult
모든 검증 함수의 공통 반환 타입이다.
```typescript
interface ValidationResult {
  isValid: boolean;    // 전체 검증 통과 여부
  warnings: string[];  // 경고 메시지 목록 (기능은 가능하나 주의 필요)
  errors: string[];    // 에러 메시지 목록 (검증 실패 원인)
}
```

#### PixelSpacingResult
```typescript
interface PixelSpacingResult extends ValidationResult {
  isMeasurementSafe: boolean;  // 측정 기능 활성화 가능 여부
  pixelSpacing: [number, number] | null;  // 검증된 Pixel Spacing 값
}
```

---
## 4. 인터페이스 명세

### 4.1 공개 인터페이스 (SDS-3.2 기준)

#### validateHeader(meta: DICOMMetadata) -> ValidationResult
DICOM 메타데이터의 헤더 필수 항목 유효성을 검증한다.
- **매개변수**: `meta` - DICOMMetadata 객체
- **반환값**: `ValidationResult` 객체
  - `isValid: boolean` - 전체 검증 통과 여부
  - `warnings: string[]` - 경고 메시지 목록
  - `errors: string[]` - 에러 메시지 목록
- **검증 항목**:
  1. StudyInstanceUID 존재 및 비빈문자열 여부
  2. SeriesInstanceUID 존재 및 비빈문자열 여부
  3. rows > 0 (양수 확인)
  4. columns > 0 (양수 확인)
  5. bitsAllocated가 지원 값(8, 16) 중 하나인지 확인
  6. pixelRepresentation이 0 또는 1인지 확인
  7. patientId 존재 여부 (누락 시 경고만 발생)
- **부작용**: 없음 (순수 함수)

#### validatePixelSpacing(meta: DICOMMetadata) -> ValidationResult
Pixel Spacing 메타데이터의 존재 여부와 유효성을 검증한다.
- **매개변수**: `meta` - DICOMMetadata 객체
- **반환값**: `ValidationResult` 객체
- **검증 항목**:
  1. pixelSpacing 필드 존재 여부
  2. 배열 길이가 2인지 확인
  3. 두 요소 모두 유효한 양수인지 확인
  4. 값이 NaN/Infinity가 아닌지 확인
  5. 값이 합리적 범위(0 < value < 100mm) 내인지 확인
- **비정상 시 동작**: pixelSpacing이 비정상인 경우 측정 기능 비활성화 권고
- **부작용**: 없음 (순수 함수)

#### validateVoxelRange(voxels: ArrayBuffer, meta: DICOMMetadata) -> ValidationResult
복셀 데이터 값이 허용 범위 내에 있는지 검증한다.
- **매개변수**:
  - `voxels` - 복셀 데이터 ArrayBuffer
  - `meta` - DICOMMetadata 객체
- **반환값**: `ValidationResult` 객체
- **허용 범위 산출**:
  - BitsAllocated=16, PixelRepresentation=1 (Signed): -32768 ~ 32767
  - BitsAllocated=16, PixelRepresentation=0 (Unsigned): 0 ~ 65535
  - BitsAllocated=8, PixelRepresentation=0 (Unsigned): 0 ~ 255
- **이상치 탐지 기준**: 범위 외 값이 전체의 5% 초과 시 isValid=false
- **부작용**: 없음 (순수 함수)

#### validateImageOrientation(meta: DICOMMetadata) -> ValidationResult
Image Orientation Patient 메타데이터의 수학적 유효성을 검증한다.
- **매개변수**: `meta` - DICOMMetadata 객체
- **반환값**: `ValidationResult` 객체
- **검증 항목**:
  1. imageOrientationPatient 필드 존재 여부 (누락 시 경고만 발생, isValid=true)
  2. 배열 길이가 6인지 확인
  3. 두 방향 벡터(rowCosines, colCosines)의 직교성 확인 (내적 = 0)
  4. 각 벡터의 단위 벡터 여부 확인 (크기 = 1, 허용 오차 0.01)
  5. NaN/Infinity 값 포함 여부 확인
- **직교성 허용 오차**: 내적 절대값 < 0.01
- **부작용**: 없음 (순수 함수)

### 4.2 private 인터페이스

#### checkRange(value: number, min: number, max: number) -> boolean
값이 지정된 최소/최대 범위 내에 있는지 확인한다.
- **매개변수**:
  - `value` - 검증할 숫자 값
  - `min` - 허용 최솟값 (포함)
  - `max` - 허용 최댓값 (포함)
- **반환값**: `boolean` - min <= value <= max 여부
- **비고**: value가 NaN/Infinity인 경우 항상 false 반환

#### isValidNumber(value: number) -> boolean
값이 유효한 유한 숫자인지 확인한다.
- **매개변수**: `value` - 검증할 값
- **반환값**: `boolean` - value가 NaN도 아니고 Infinity도 아닌 유한 숫자인지 여부
- **비고**: Number.isFinite()와 동일한 의미이나 명시적 검증 목적으로 캡슐화

---

## 5. 처리 로직 / 알고리즘

### 5.1 전체 검증 파이프라인
```
validateAll(meta, voxels)
  |-> validateHeader(meta)
  |     |-- 실패: 이후 검증 중단, 에러 결과 즉시 반환
  |-> validatePixelSpacing(meta)
  |     |-- 경고: 측정 기능 비활성화 플래그 설정
  |-> validateVoxelRange(voxels, meta)
  |     |-- 실패: 복셀 데이터 무결성 경고
  |-> validateImageOrientation(meta)
  |     |-- 경고: 기본 축 방향 적용
  |-> aggregateResults(headerResult, spacingResult, voxelResult, orientationResult)
  |-> return aggregated ValidationResult
```

### 5.2 헤더 검증 알고리즘 (validateHeader)
1. meta 객체가 null/undefined인지 확인 -> 에러 반환
2. 필수 필드 순회 검증:
   - StudyInstanceUID: 비빈문자열 여부
   - SeriesInstanceUID: 비빈문자열 여부
   - rows: checkRange(rows, 1, 65535)
   - columns: checkRange(columns, 1, 65535)
   - bitsAllocated: [8, 16] 중 하나인지 확인
   - pixelRepresentation: [0, 1] 중 하나인지 확인
3. 선택 필드 검증 (누락 시 경고만):
   - patientId: 존재 여부
   - windowCenter/windowWidth: 유효 숫자 여부
4. errors가 비어있으면 isValid=true, 아니면 isValid=false

### 5.3 복셀 범위 검증 알고리즘 (validateVoxelRange)
1. voxels.byteLength === 0 확인 -> 에러 반환
2. meta에서 bitsAllocated, pixelRepresentation 읽어 허용 범위 산출
3. DataView를 생성하여 복셀 값을 순회:
   - 16-bit signed: Int16Array로 읽기
   - 16-bit unsigned: Uint16Array로 읽기
   - 8-bit unsigned: Uint8Array로 읽기
4. 각 값에 대해 isValidNumber() 확인
5. 범위 외 값(out-of-range) 카운트
6. 이상치 비율 = outOfRange / totalVoxels
7. 이상치 비율 > 0.05(5%) 이면 isValid=false
8. 결과에 이상치 통계 정보 포함

### 5.4 Image Orientation 검증 알고리즘
1. meta.imageOrientationPatient 존재 확인:
   - 누락: warnings 추가, isValid=true 반환
2. 배열 길이 === 6 확인
3. 6개 요소에 대해 isValidNumber() 확인
4. rowCosines = [v[0], v[1], v[2]], colCosines = [v[3], v[4], v[5]] 분리
5. 각 벡터 크기 계산: |v| = sqrt(v[0]^2 + v[1]^2 + v[2]^2)
   - |v|가 1.0 +/- 0.01 범위 밖이면 에러
6. 직교성 확인: dotProduct = v[0]*v[3] + v[1]*v[4] + v[2]*v[5]
   - |dotProduct| > 0.01 이면 에러 (직교성 위반)
7. 결과 집합 반환

---

## 6. IEC 62304 Class A 준수 사항

### 6.1 소프트웨어 단위 검증 (단위 테스트)
- 모든 공개 인터페이스(validateHeader, validatePixelSpacing, validateVoxelRange,
  validateImageOrientation)에 대한 단위 테스트 작성 필수
- private 함수(checkRange, isValidNumber)에 대한 단위 테스트 작성 필수
- Vitest 프레임워크 사용
- 테스트 커버리지 목표: 90% 이상
- 각 테스트 케이스는 추적성 매트릭스와 연결

### 6.2 이상 상태 처리 (Anomaly Handling)
- 모든 검증 함수는 예외를 발생시키지 않고 항상 ValidationResult 반환
- 입력이 null/undefined인 경우에도 안전하게 처리 (isValid=false, errors 포함)
- 내부 계산 오류(예: 잘못된 타입)는 caught error로 처리하여 errors에 포함
- 오류 로그는 console.error로 출력 (디버그 모드에서만)

### 6.3 변경 이력 관리
- 모든 인터페이스 변경은 문서에 반영
- Breaking Change 시 티켓 업데이트
- 검증 기준(임계값 등) 변경 시 위험 평가 재수행

---

## 7. 의존성 및 연관 관계

### 7.1 내부 의존성
| 컴포넌트 | 방향 | 설명 |
|----------|------|------|
| DICOM 파일 파서 (COMP-1.1) | 단방향 (입력) | 파싱 결과를 검증 입력으로 수신 |
| MPR 렌더러 (COMP-2.x) | 단방향 (출력) | 검증 결과를 렌더링 결정에 활용 |
| 측정 모듈 (COMP-4.x) | 단방향 (출력) | Pixel Spacing 검증 결과로 측정 활성화/비활성화 |

### 7.2 외부 의존성
- **없음**: ADR-2에 따라 외부 라이브러리 사용하지 않음
- 브라우저 내장 API만 사용 (ArrayBuffer, DataView, Math)

### 7.3 아키텍처 매핑
```
Layer 1: Presentation Layer (UI)
    |
Layer 2: Application Layer
    |
Layer 3: Business Logic Layer
    |
Layer 4: Data Layer  <-- [COMP-1.1 DICOM 파일 파서]
    |                     [COMP-1.2 데이터 검증기] <-- 본 컴포넌트
    v
  File System / Browser File API
```

---

## 8. 제약 사항 및 가정

### 8.1 제약 사항
- **검증 대상**: COMP-1.1(DICOM 파일 파서)이 추출한 DICOMMetadata 및 ArrayBuffer에 한정
- **지원 비트 깊이**: 8-bit, 16-bit (32-bit 이상은 지원하지 않음)
- **Pixel Spacing 검증 범위**: 0 < value < 100mm (CBCT 영상의 합리적 범위)
- **이상치 허용 비율**: 전체 복셀의 5% 이하
- **직교성 허용 오차**: 내적 절대값 0.01 이하

### 8.2 가정
- 입력 DICOMMetadata는 COMP-1.1이 성공적으로 파싱한 결과임
- 복셀 데이터 ArrayBuffer는 COMP-1.1이 올바르게 추출한 데이터임
- Pixel Spacing 값은 mm 단위임
- Image Orientation Patient는 6요소 배열(rowCosines + colCosines)임

### 8.3 위험 완화 매핑
| 위험 ID | 위험 설명 | 완화 조치 |
|---------|-----------|-----------|
| HAZ-1.1 | DICOM 파싱 오류로 영상 왜곡 | 복셀 값 범위 검증 및 이상치 탐지로 왜곡 데이터 사전 차단 |
| HAZ-2.1 | PixelSpacing 누락으로 측정 부정확 | Pixel Spacing 검증으로 누락/비정상 값 탐지, 측정 비활성화 권고 |

---

## 9. Success Criteria

### 9.1 측정 가능한 지표

| 지표 | 목표값 | 측정 방법 |
|------|--------|-----------|
| 단위 테스트 통과율 | 100% | Vitest 실행 결과 |
| 코드 커버리지 | 90% 이상 | Vitest coverage 리포트 |
| 검증 함수 실행 시간 (512x512) | 50ms 이내 | performance.now() 측정 |
| 에러 미검출률 (False Negative) | 0% | 비정상 입력에 대한 에러 반환 확인 |
| 예외 발생률 | 0% | 모든 경계 조건에서 예외 없이 ValidationResult 반환 |

### 9.2 Definition of Done

- [ ] validateHeader가 모든 필수 필드에 대해 올바르게 검증함
- [ ] validatePixelSpacing이 누락/비정상 값에 대해 올바르게 검증함
- [ ] validateVoxelRange가 범위 외 복셀 및 이상치를 올바르게 탐지함
- [ ] validateImageOrientation이 직교성 위반을 올바르게 감지함
- [ ] checkRange 및 isValidNumber private 함수가 명세대로 동작함
- [ ] 모든 User Scenario(US-1 ~ US-4)에 대한 단위 테스트 통과
- [ ] Edge Cases(EC-1 ~ EC-5)에 대한 단위 테스트 통과
- [ ] 테스트 커버리지 90% 이상 달성
- [ ] 어떤 입력에도 예외가 발생하지 않음 확인 (순수 함수 보장)
- [ ] IEC 62304 Class A 문서화 요건 충족
- [ ] 코드 리뷰 완료
- [ ] FR-1.2, FR-1.4, FR-2.4, FR-4.2 추적성 매트릭스 연결 확인

---

## 10. 참조 문서

| 문서 | 설명 |
|------|------|
| SAD (PLAYG-1311) | 소프트웨어 아키텍처 설계서 |
| SDS-3.2 | 데이터 검증기 인터페이스 정의 |
| ADR-2 | 외부 라이브러리 없이 자체 구현 |
| SRS | FR-1.2, FR-1.4, FR-2.4, FR-4.2 요구사항 정의 |
| RMR | HAZ-1.1, HAZ-2.1 위험 분석 |
| DICOM PS3.3 | DICOM Information Object Definitions |
| IEC 62304 | 의료기기 소프트웨어 생명주기 프로세스 |

---

*본 문서는 PLAYG-1376 티켓의 Feature Specification으로, IEC 62304 Class A 준수를 위해
작성되었습니다. 최종 업데이트: 2026-04-16*

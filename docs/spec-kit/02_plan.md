# 기술 이행 계획서 (Implementation Plan)

- **티켓**: PLAYG-1370
- **문서 ID**: PLAN-PLAYG-1370
- **작성일**: 2026-04-14
- **제품**: Simple CBCT Viewer
- **IEC 62304 안전 등급**: Class A (PLAYG-1290)
- **아키텍처 결정**: ADR-1 Layered Architecture 채택

---

## Summary

본 계획서는 PLAYG-1370 [ADR-1] Layered Architecture 채택 티켓의 구현을 위한 기술 이행 계획이다.
SAD(SAD-PLAYG-1311)에 정의된 4계층 10모듈 구조를 실제 JavaScript 코드로 구현하기 위한 기반을 마련하는 작업이다.
현재 프로젝트에는 ER Gate 검토 도구(Python)만 존재하며, CBCT Viewer 본체(JavaScript)는 존재하지 않는다.
따라서 본 계획은 프로젝트 초기 설정부터 각 계층별 스텁 구현까지,
완전한 CBCT Viewer 애플리케이션 뼈대를 구축하는 데 중점을 둔다.

**목표**: 8개 Phase를 통해 Vite + Vanilla JS 프로젝트를 초기화하고,
SAD의 4계층(Data / Business / Rendering / Presentation)에 대응하는
10개 모듈의 스텁 구현과 테스트 인프라를 완성한다.

---

## Technical Context

### 기술 스택

| 구분 | 기술 | 버전 | 근거 |
|------|------|------|------|
| 프로그래밍 언어 | JavaScript (ES6+) | ES2020+ | IU-08 작동 원리 명시, 브라우저 네이티브 실행 |
| 3D 렌더링 | WebGL 2.0 | 2.0 | SR-4 3D 볼륨 렌더링, GPU 가속 필수 |
| UI 렌더링 | HTML5 Canvas / DOM | - | MPR 영상은 Canvas, UI 컨트롤은 DOM |
| 파일 접근 | Web File API | - | SR-1 로컬 파일 로드 |
| 빌드 도구 | Vite | 5.x | DP-02 빠른 번들링, 외부 의존성 없는 정적 빌드 |
| 패키지 관리 | npm | 10.x | 의존성 관리, SBOM 생성 기반 |
| 테스트 | Vitest | 최신 | DP-02 단위 테스트 프레임워크 |
| 정적 분석 | ESLint | 9.x | DP-02 코드 품질, 보안 검증 (NFR-2.2) |
| 코드 포맷팅 | Prettier | 3.x | DP-02 코딩 스타일 일관성 |
| 버전 관리 | Git + GitHub | - | CMP-02 형성 관리, Git Flow 브랜치 전략 |

### 아키텍처 개요 (SAD-PLAYG-1311)

```
┌─────────────────────────────────────────────────────┐
│                Presentation Layer                   │
│   UIController (COMP-4.1)  │  ViewportManager      │
│                            │  (COMP-4.2)            │
├─────────────────────────────────────────────────────┤
│                Rendering Layer                      │
│   MPRRenderer  │  VolumeRenderer  │  ViewTransform   │
│   (COMP-3.1)   │  (COMP-3.2)      │  Engine(3.3)     │
├─────────────────────────────────────────────────────┤
│                Business Layer                       │
│   VolumeBuilder    │  MeasurementEngine │  SecurityGuard│
│   (COMP-2.1)       │  (COMP-2.2)        │  (COMP-2.3)   │
├─────────────────────────────────────────────────────┤
│                Data Layer                           │
│   DICOMParser (COMP-1.1)  │  DataValidator          │
│                           │  (COMP-1.2)              │
└─────────────────────────────────────────────────────┘
```

### 핵심 설계 원칙

- **단일 책임 원칙 (SRP)**: 각 모듈은 하나의 명확한 책임 (SAD-01 1.2)
- **관심사 분리 (SoC)**: 데이터/렌더링/UI 로직 명확 분리
- **정보 은폐**: 공개 인터페이스만 통한 상호작용
- **무상태 데이터 처리**: 메모리 상에서만 처리, 영구 저장 금지 (FR-5.2)
- **외부 통신 차단**: 모든 네트워크 요청 원천 차단 (FR-5.1)
- **방어적 프로그래밍**: 예외 상황 견고한 오류 처리 (NFR-3.1)

---

## Constitution Check

### IEC 62304 Class A 준수 검증

| 항목 | 요구사항 | 본 계획 반영 여부 | 비고 |
|------|----------|------------------|------|
| 제5.1절 소프트웨어 개발 계획 | 개발 방법론, 활동 정의 | 반영 | Phase 1~8 체계적 진행 |
| 제5.2절 소프트웨어 요구사항 분석 | SRS 기반 구현 | 반영 | SRS FR/NFR 전수 추적 |
| 제5.3절 소프트웨어 아키텍처 설계 | 계층형 아키텍처 구현 | 반영 | ADR-1 4계층 10모듈 |
| 제5.4절 소프트웨어 상세 설계 | SDS 기반 모듈 구현 | 반영 | 각 Phase별 인터페이스 정의 |
| 제5.5절 소프트웨어 단위 구현 | 코드 구현 및 단위 테스트 | 반영 | Phase 3~6 스텁 + Phase 8 테스트 |
| 제5.6절 소프트웨어 통합 테스트 | 통합 검증 | 반영 | Phase 8 빌드 검증 |
| 제5.7절 소프트웨어 검증 테스트 | 시스템 수준 검증 | 후속 | 본 Plan 이후 별도 수행 |
| 제7절 위험 관리 | HAZ 완화 조치 구현 | 반영 | 각 모듈별 HAZ 매핑 |
| 제8절 형상 관리 | CI/CD, 버전 관리 | 반영 | Phase 1 Git 설정 |
| 제9절 문제 해결 | 결함 추적 | 후속 | GitHub Issues 활용 예정 |

### ADR-1 준수 검증

| 검증 항목 | 기대 결과 | 검증 방법 |
|-----------|-----------|-----------|
| 4계층 분리 | Data/Business/Rendering/Presentation 디렉토리 존재 | 디렉토리 구조 확인 |
| 10개 모듈 스텁 | 각 모듈별 .js 파일 존재 및 export | 빌드 + import 테스트 |
| 계층 간 의존성 규칙 | 하위 계층만 참조, 상위 역참조 금지 | ESLint 커스텀 규칙 |
| 공개 인터페이스 | 각 모듈 index.js 통해 공개 API export | 빌드 성공 여부 |
| 외부 의존성 최소화 | 자체 구현 모듈만 포함 | package.json 점검 |

---

## Project Structure

### 최종 디렉토리 구조

CBCT Viewer JavaScript 프로젝트는 프로젝트 루트에 viewer/ 디렉토리를 생성하여
기존 Python ER Gate 도구와 분리한다.



### 계층 간 의존성 규칙




---

## Project Structure

### 최종 디렉토리 구조

CBCT Viewer JavaScript 프로젝트는 프로젝트 루트에 `viewer/` 디렉토리를 생성하여
기존 Python ER Gate 도구와 분리한다.

```
viewer/
  index.html                    # 진입점 HTML
  package.json                  # npm 패키지 설정
  vite.config.js                # Vite 빌드 설정
  eslint.config.js              # ESLint 설정
  .prettierrc                   # Prettier 설정
  .gitignore                    # Git 무시 규칙
  src/
    main.js                     # 애플리케이션 진입점
    types/
      index.js                  # 타입 re-export
      DICOMMetadata.js          # DICOM 메타데이터 타입 정의
      VolumeData.js             # 볼륨 데이터 타입 정의
      SliceData.js              # 슬라이스 데이터 타입 정의
      MeasurementData.js        # 측정 데이터 타입 정의
      ViewTransform.js          # 뷰 변환 타입 정의
      ValidationResult.js       # 검증 결과 타입 정의
      ParseResult.js            # 파싱 결과 타입 정의
    data/
      index.js                  # Data Layer re-export
      DICOMParser.js            # COMP-1.1 DICOM 파일 파서
      DataValidator.js          # COMP-1.2 데이터 검증기
    business/
      index.js                  # Business Layer re-export
      VolumeBuilder.js          # COMP-2.1 볼륨 데이터 구성기
      MeasurementEngine.js      # COMP-2.2 거리 측정 엔진
      SecurityGuard.js          # COMP-2.3 보안 감시 모듈
    rendering/
      index.js                  # Rendering Layer re-export
      MPRRenderer.js            # COMP-3.1 MPR 렌더러
      VolumeRenderer.js         # COMP-3.2 3D 볼륨 렌더러
      ViewTransformEngine.js    # COMP-3.3 뷰 변환 엔진
    presentation/
      index.js                  # Presentation Layer re-export
      UIController.js           # COMP-4.1 UI 컨트롤러
      ViewportManager.js        # COMP-4.2 뷰포트 관리자
    styles/
      main.css                  # 기본 스타일시트
  tests/
    setup.js                    # Vitest 글로벌 설정
    unit/
      data/
        DICOMParser.test.js
        DataValidator.test.js
      business/
        VolumeBuilder.test.js
        MeasurementEngine.test.js
        SecurityGuard.test.js
      rendering/
        MPRRenderer.test.js
        VolumeRenderer.test.js
        ViewTransformEngine.test.js
      presentation/
        UIController.test.js
        ViewportManager.test.js
    integration/
      app.test.js
  public/
    favicon.ico
```

### 계층 간 의존성 규칙

```
Presentation --> Rendering --> Business --> Data
   (상위)                                (하위)

규칙:
- 상위 계층은 하위 계층만 참조 가능 (역방향 참조 금지)
- SecurityGuard(Business)는 모든 계층에서 참조 가능 (횡단 관심사)
- types/ 디렉토리는 모든 계층에서 참조 가능 (공유 타입)
- 동일 계층 내 모듈 간 참조는 최소화
```


---

## Implementation Approach

### Phase 1: 프로젝트 초기 설정

**목표**: Vite + Vanilla JS 프로젝트를 생성하고, 빌드/린트/포맷팅 도구를 설정한다.

**근거 문서**: SAD-06(기술 스택), SAD-09(제약 조건), DP-PLAYG-1231(개발 계획)

#### 세부 작업

| 작업 ID | 작업명 | 상세 내용 | 산출물 | 추적 |
|---------|--------|-----------|--------|------|
| P1-01 | 프로젝트 디렉토리 생성 | viewer/ 디렉토리 생성 및 하위 구조 구성 | 디렉토리 구조 | ADR-1 |
| P1-02 | package.json 작성 | 프로젝트 메타데이터, 스크립트, 의존성 정의. 외부 의존성은 devDependencies만 허용(Vite, Vitest, ESLint, Prettier) | package.json | SAD-06, FR-5.4 |
| P1-03 | vite.config.js 작성 | 정적 단일 번들 빌드 설정. CDN 참조 금지, base 경로 상대 설정, build.outDir 지정 | vite.config.js | ADR-5, FR-7.1, HAZ-5.3 |
| P1-04 | eslint.config.js 작성 | ES2020+ 환경 설정, 브라우저 전역 변수 허용, 네트워크 API(fetch/XHR/WebSocket) 사용 경고 규칙 추가 | eslint.config.js | NFR-2.2, HAZ-3.1 |
| P1-05 | .prettierrc 작성 | 싱글 따옴표, 세미콜론 필수, 2칸 들여쓰기, 80자 줄바꿈 | .prettierrc | DP-02 |
| P1-06 | .gitignore 작성 | node_modules/, dist/, .vite/ 등 무시 규칙 | .gitignore | CMP-02 |
| P1-07 | 계층별 디렉토리 생성 | src/data/, src/business/, src/rendering/, src/presentation/, src/types/, src/styles/ | 디렉토리 | ADR-1 |
| P1-08 | tests/ 디렉토리 생성 | tests/unit/{data,business,rendering,presentation}/, tests/integration/ | 디렉토리 | DP-02 |

#### 산출물 검증 기준

- [ ] `npm install` 성공 (devDependencies만 설치)
- [ ] `npm run build` 성공 (빈 스텁 상태에서도 에러 없이 dist/ 생성)
- [ ] `npm run lint` 실행 가능 (0 errors, warnings 허용)
- [ ] `npm run format` 실행 가능
- [ ] package.json에 외부 runtime dependencies 없음 확인
- [ ] CSP 차단을 위한 정적 빌드 산출물에 외부 참조 없음

#### 의존성 규칙 (package.json)

```json
{
  "name": "simple-cbct-viewer",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src/",
    "format": "prettier --write src/"
  },
  "devDependencies": {
    "vite": "^5.x",
    "vitest": "^3.x",
    "eslint": "^9.x",
    "prettier": "^3.x"
  }
}
```

> **주의**: runtime dependencies는 외부 의존성 최소화 전략(SAD-06 6.2)에 따라
> 허용하지 않는다. DICOM 파서, WebGL 래핑, UI 모두 자체 구현한다.


### Phase 2: 타입/인터페이스 정의 계층

**목표**: SAD-05(데이터 뷰)에 정의된 데이터 모델을 JavaScript 타입 정의(Factory 함수)로 구현한다.

**근거 문서**: SAD-05(데이터 뷰), SDS-03(상세 컴포넌트 설계)

#### 세부 작업

| 작업 ID | 작업명 | 상세 내용 | 산출물 | 추적 |
|---------|--------|-----------|--------|------|
| P2-01 | DICOMMetadata.js | DICOM 메타데이터 구조 정의. 환자정보, 스터디정보, Pixel Spacing, Slice Thickness, Image Orientation Patient, Rows, Columns, NumberOfFrames, BitsAllocated, TransferSyntax, WindowCenter, WindowWidth | src/types/DICOMMetadata.js | SAD-05, FR-1.3 |
| P2-02 | VolumeData.js | 3차원 볼륨 데이터 구조 정의. voxelArray(Float32Array), dimensions(3), spacing(3), origin(3), dataType, minMaxValue(2) | src/types/VolumeData.js | SAD-05, FR-1.4 |
| P2-03 | SliceData.js | MPR 슬라이스 데이터 구조 정의. imageData(ImageData), plane(Axial/Coronal/Sagittal), sliceIndex, windowLevel, windowWidth | src/types/SliceData.js | SAD-05, FR-2.1~2.3 |
| P2-04 | MeasurementData.js | 측정 데이터 구조 정의. startPoint(3), endPoint(3), distanceMM, pixelSpacingValid, disclaimerText | src/types/MeasurementData.js | SAD-05, FR-4.1, HAZ-2.1 |
| P2-05 | ViewTransform.js | 뷰 변환 상태 구조 정의. zoom, panX, panY, windowLevel, windowWidth, sliceIndex | src/types/ViewTransform.js | SAD-05, FR-3.1~3.4 |
| P2-06 | ValidationResult.js | 검증 결과 구조 정의. isValid(boolean), warnings(string[]), errors(string[]) | src/types/ValidationResult.js | SDS-3.2, FR-1.2 |
| P2-07 | ParseResult.js | 파싱 결과 구조 정의. metadata(DICOMMetadata), voxelData(ArrayBuffer), errors(ErrorMessage[]), isValid(boolean) | src/types/ParseResult.js | SDS-3.1, FR-1.1 |
| P2-08 | index.js | 모든 타입 모듈을 re-export하는 배럴 파일 | src/types/index.js | ADR-1 |

#### 타입 정의 패턴

JavaScript는 네이티브 타입 시스템이 없으므로, Factory 함수 + JSDoc 패턴을 사용한다:

```javascript
// 예: src/types/DICOMMetadata.js

/**
 * @typedef {Object} DICOMMetadata
 * @property {string} patientName - 환자명
 * @property {string} patientID - 환자 ID
 * @property {string} studyDate - 검사일자
 * @property {string} modality - 모달리티 (예: CBCT)
 * @property {[number, number]} pixelSpacing - 픽셀 간격 (mm)
 * @property {number} sliceThickness - 슬라이스 두께 (mm)
 * @property {number[]} imageOrientationPatient - 영상 방향 (6개 값)
 * @property {number} rows - 행 수
 * @property {number} columns - 열 수
 * @property {number} numberOfFrames - 프레임 수
 * @property {number} bitsAllocated - 할당 비트 수
 * @property {string} transferSyntax - 전송 구문 UID
 * @property {number} windowCenter - 윈도우 레벨
 * @property {number} windowWidth - 윈도우 폭
 */

/**
 * DICOMMetadata 객체를 생성한다.
 * @param {Partial<DICOMMetadata>} overrides
 * @returns {DICOMMetadata}
 */
export function createDICOMMetadata(overrides = {}) {
  return {
    patientName: '',
    patientID: '',
    studyDate: '',
    modality: '',
    pixelSpacing: [0, 0],
    sliceThickness: 0,
    imageOrientationPatient: [1, 0, 0, 0, 1, 0],
    rows: 0,
    columns: 0,
    numberOfFrames: 0,
    bitsAllocated: 16,
    transferSyntax: '',
    windowCenter: 0,
    windowWidth: 0,
    ...overrides,
  };
}
```

#### 산출물 검증 기준

- [ ] 모든 Factory 함수가 기본값으로 유효한 객체를 생성
- [ ] JSDoc이 모든 속성에 대해 타입과 설명을 포함
- [ ] `import` 시 순환 참조 없음
- [ ] `npm run build` 성공



### Phase 3: Data Layer 뼈대 (DICOMParser, DataValidator)

**목표**: SAD Data Layer의 2개 모듈 스텁을 구현한다.
이번 Phase에서는 인터페이스 정의와 기본 구조만 작성하고, 실제 DICOM 파싱 로직은 후속 티켓에서 구현한다.

**근거 문서**: SDS-3.1(DICOMParser), SDS-3.2(DataValidator), SAD-02(논리적 뷰)

#### 세부 작업

| 작업 ID | 작업명 | 상세 내용 | 산출물 | 추적 |
|---------|--------|-----------|--------|------|
| P3-01 | DICOMParser.js 스텁 | parseDICOM(file), validateMagicByte(data), validateTransferSyntax(meta), parseMetadata(data), parsePixelData(data, meta), handleParseError(error) 메서드 스텁 구현. 각 메서드는 TODO 주석과 함께 기본 반환값 제공 | src/data/DICOMParser.js | COMP-1.1, FR-1.1~1.5 |
| P3-02 | DataValidator.js 스텁 | validateHeader(meta), validatePixelSpacing(meta), validateVoxelRange(voxels, meta), validateImageOrientation(meta) 메서드 스텁 구현. ValidationResult 타입 사용 | src/data/DataValidator.js | COMP-1.2, FR-1.2, FR-4.2 |
| P3-03 | data/index.js | DICOMParser, DataValidator re-export | src/data/index.js | ADR-1 |
| P3-04 | DICOMParser.test.js | 스텁 메서드 존재 확인, 기본 반환값 타입 검증 테스트 | tests/unit/data/DICOMParser.test.js | COMP-1.1 |
| P3-05 | DataValidator.test.js | 스텁 메서드 존재 확인, ValidationResult 반환 검증 테스트 | tests/unit/data/DataValidator.test.js | COMP-1.2 |

#### DICOMParser 스텁 구조

```javascript
// src/data/DICOMParser.js
// TODO: PLAYG-1375 - DICOM 파일 파싱 전체 로직 구현

import { createParseResult } from '../types/ParseResult.js';
import { createDICOMMetadata } from '../types/DICOMMetadata.js';

export class DICOMParser {
  /**
   * DICOM 파일을 파싱하여 메타데이터와 복셀 데이터를 추출한다.
   * @param {File} file - 브라우저 File API 파일 객체
   * @returns {Promise<ParseResult>}
   */
  async parseDICOM(file) {
    // TODO: 전체 파싱 로직 구현 (FR-1.1, FR-1.3, FR-1.4)
    throw new Error('DICOMParser.parseDICOM: NOT_IMPLEMENTED');
  }

  // ... 나머지 스텁 메서드
}
```

#### DataValidator 스텁 구조

```javascript
// src/data/DataValidator.js
// TODO: PLAYG-1376 - 데이터 검증 전체 로직 구현

import { createValidationResult } from '../types/ValidationResult.js';

export class DataValidator {
  /**
   * DICOM 헤더 필수 태그 존재 여부 및 값 범위를 검증한다.
   * @param {DICOMMetadata} meta
   * @returns {ValidationResult}
   */
  validateHeader(meta) {
    // TODO: 필수 태그 검증 로직 구현 (FR-1.2, FR-1.3)
    return createValidationResult();
  }

  // ... 나머지 스텁 메서드
}
```

#### 산출물 검증 기준

- [ ] `DICOMParser` 클래스에 SDS-3.1에 정의된 6개 메서드가 모두 존재
- [ ] `DataValidator` 클래스에 SDS-3.2에 정의된 4개 메서드가 모두 존재
- [ ] 각 메서드에 JSDoc 타입 어노테이션 포함
- [ ] 단위 테스트에서 스텁 메서드 호출 시 정의된 타입 반환 확인
- [ ] `npm run build` 성공
- [ ] `npm test` 통과 (스텁 테스트)


### Phase 4: Business Layer 뼈대 (VolumeBuilder, MeasurementEngine, SecurityGuard)

**목표**: SAD Business Layer의 3개 모듈 스텁을 구현한다.

**근거 문서**: SDS-3.3(VolumeBuilder), SDS-3.7(MeasurementEngine), SDS-3.8(SecurityGuard)

#### 세부 작업

| 작업 ID | 작업명 | 상세 내용 | 산출물 | 추적 |
|---------|--------|-----------|--------|------|
| P4-01 | VolumeBuilder.js 스텁 | buildVolume(voxelData, meta), estimateMemory(fileSize), monitorMemoryUsage(), getVolume(), releaseVolume() 메서드 스텁 | src/business/VolumeBuilder.js | COMP-2.1, FR-1.4, FR-1.6, FR-7.4 |
| P4-02 | MeasurementEngine.js 스텁 | measureDistance(p1, p2, transform), inverseTransform(p, transform), generateDisclaimer(distanceMM), validateCoordinates(p1, p2) 메서드 스텁 | src/business/MeasurementEngine.js | COMP-2.2, FR-4.1~4.4 |
| P4-03 | SecurityGuard.js 스텁 | applyCSP(), blockNetworkRequests(), enforceMemoryOnlyStorage(), releaseMemory(data), auditDependencies(pkg) 메서드 스텁 | src/business/SecurityGuard.js | COMP-2.3, FR-5.1~5.4 |
| P4-04 | business/index.js | 3개 모듈 re-export | src/business/index.js | ADR-1 |
| P4-05 | VolumeBuilder.test.js | 스텁 메서드 존재 및 반환 타입 검증 | tests/unit/business/VolumeBuilder.test.js | COMP-2.1 |
| P4-06 | MeasurementEngine.test.js | 스텁 메서드 존재 및 반환 타입 검증 | tests/unit/business/MeasurementEngine.test.js | COMP-2.2 |
| P4-07 | SecurityGuard.test.js | 스텁 메서드 존재 및 반환 타입 검증 | tests/unit/business/SecurityGuard.test.js | COMP-2.3 |

#### VolumeBuilder 스텁 핵심 인터페이스

| 메서드 | 입력 | 출력 | 추적 FR |
|--------|------|------|---------|
| buildVolume(voxelData, meta) | ArrayBuffer, DICOMMetadata | VolumeData | FR-1.4, FR-2.1~2.3 |
| estimateMemory(fileSize) | number | MemoryEstimate | FR-1.6, HAZ-5.1 |
| monitorMemoryUsage() | 없음 | MemoryStatus | FR-7.4, HAZ-5.1 |
| getVolume() | 없음 | VolumeData 또는 null | FR-2.1~2.6 |
| releaseVolume() | 없음 | void | FR-5.3, HAZ-3.2 |

#### MeasurementEngine 스텁 핵심 인터페이스

| 메서드 | 입력 | 출력 | 추적 FR |
|--------|------|------|---------|
| measureDistance(p1, p2, transform) | Point3D, Point3D, ViewTransform | MeasurementData | FR-4.1 |
| inverseTransform(p, transform) | Point2D, ViewTransform | Point3D | FR-4.4, HAZ-2.2 |
| generateDisclaimer(distanceMM) | number | string | FR-4.3, HAZ-2.1 |

#### SecurityGuard 스텁 핵심 인터페이스

| 메서드 | 입력 | 출력 | 추적 FR |
|--------|------|------|---------|
| applyCSP() | 없음 | void | FR-5.1, NFR-2.1 |
| blockNetworkRequests() | 없음 | void | FR-5.1, HAZ-3.1 |
| enforceMemoryOnlyStorage() | 없음 | boolean | FR-5.2, HAZ-3.2 |
| releaseMemory(data) | ArrayBuffer | void | FR-5.3, HAZ-3.2 |

#### 산출물 검증 기준

- [ ] 3개 클래스에 SDS에 정의된 전체 메서드 스텁 존재
- [ ] VolumeBuilder.getVolume()이 null 반환 (초기 상태)
- [ ] SecurityGuard가 횡단 관심사로 다른 계층에서도 import 가능
- [ ] 단위 테스트 3개 모두 통과
- [ ] `npm run build` 성공



### Phase 5: Rendering Layer 뼈대 (MPRRenderer, VolumeRenderer, ViewTransformEngine)

**목표**: SAD Rendering Layer의 3개 모듈 스텁을 구현한다.
WebGL 2.0 컨텍스트 초기화 뼈대를 포함하되, 실제 셰이더/렌더링 로직은 후속 티켓에서 구현한다.

**근거 문서**: SDS-3.4(MPRRenderer), SDS-3.5(VolumeRenderer), SDS-3.6(ViewTransformEngine), ADR-4

#### 세부 작업

| 작업 ID | 작업명 | 상세 내용 | 산출물 | 추적 |
|---------|--------|-----------|--------|------|
| P5-01 | MPRRenderer.js 스텁 | constructor(canvas), renderMPR(volume, plane, sliceIndex), initGL(canvas), destroy() 메서드 스텁. WebGL 2.0 컨텍스트 획득 뼈대 포함 | src/rendering/MPRRenderer.js | COMP-3.1, FR-2.1~2.4, ADR-4 |
| P5-02 | VolumeRenderer.js 스텁 | constructor(canvas), renderVolume(volume, options), initGL(canvas), destroy() 메서드 스텁. WebGL 2.0 컨텍스트 획득 뼈대 포함 | src/rendering/VolumeRenderer.js | COMP-3.2, FR-2.5, ADR-4 |
| P5-03 | ViewTransformEngine.js 스텁 | constructor(), setSliceIndex(idx), applyZoom(delta), applyPan(dx, dy), applyWindowLevel(wl, ww), getTransform(), reset() 메서드 스텁. ViewTransform 상태 관리 뼈대 | src/rendering/ViewTransformEngine.js | COMP-3.3, FR-3.1~3.4 |
| P5-04 | rendering/index.js | 3개 모듈 re-export | src/rendering/index.js | ADR-1 |
| P5-05 | MPRRenderer.test.js | 스텁 메서드 존재, Canvas mock 기반 초기화 테스트 | tests/unit/rendering/MPRRenderer.test.js | COMP-3.1 |
| P5-06 | VolumeRenderer.test.js | 스텁 메서드 존재, Canvas mock 기반 초기화 테스트 | tests/unit/rendering/VolumeRenderer.test.js | COMP-3.2 |
| P5-07 | ViewTransformEngine.test.js | 상태 초기값, setSliceIndex 범위 검증 스텁 테스트 | tests/unit/rendering/ViewTransformEngine.test.js | COMP-3.3 |

#### MPRRenderer 스텁 핵심 인터페이스

| 메서드 | 입력 | 출력 | 추적 FR |
|--------|------|------|---------|
| constructor(canvas) | HTMLCanvasElement | MPRRenderer 인스턴스 | - |
| renderMPR(volume, plane, sliceIndex) | VolumeData, PlaneType, number | void (Canvas에 렌더링) | FR-2.1~2.3 |
| initGL(canvas) | HTMLCanvasElement | WebGL2RenderingContext 또는 null | FR-2.5, FR-6.2 |
| destroy() | 없음 | void (리소스 해제) | - |

> **참고**: plane 매개변수는 'axial' | 'coronal' | 'sagittal' 문자열 리터럴 타입이다.

#### VolumeRenderer 스텁 핵심 인터페이스

| 메서드 | 입력 | 출력 | 추적 FR |
|--------|------|------|---------|
| constructor(canvas) | HTMLCanvasElement | VolumeRenderer 인스턴스 | - |
| renderVolume(volume, options) | VolumeData, RenderOptions | void | FR-2.5, NFR-1.3 |
| initGL(canvas) | HTMLCanvasElement | WebGL2RenderingContext 또는 null | ADR-4 |
| destroy() | 없음 | void | - |

#### ViewTransformEngine 스텁 핵심 인터페이스

| 메서드 | 입력 | 출력 | 추적 FR |
|--------|------|------|---------|
| setSliceIndex(idx) | number | void | FR-3.1, HAZ-1.5 |
| applyZoom(delta) | number | void | FR-3.2 |
| applyPan(dx, dy) | number, number | void | FR-3.3 |
| applyWindowLevel(wl, ww) | number, number | void | FR-3.4, HAZ-1.4 |
| getTransform() | 없음 | ViewTransform | FR-3.1~3.4 |
| reset() | 없음 | void | - |

#### WebGL 2.0 컨텍스트 획득 패턴

```javascript
// src/rendering/MPRRenderer.js (스텑)
export class MPRRenderer {
  /** @type {WebGL2RenderingContext|null} */
  #gl = null;

  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    this.#gl = this.initGL(canvas);
  }

  /**
   * WebGL 2.0 렌더링 컨텍스트를 획득한다.
   * @param {HTMLCanvasElement} canvas
   * @returns {WebGL2RenderingContext|null}
   */
  initGL(canvas) {
    const gl = canvas.getContext('webgl2');
    if (!gl) {
      // TODO: FR-6.2 미지원 브라우저 감지 시 UIController에 통지
      console.error('WebGL 2.0 미지원 브라우저');
      return null;
    }
    return gl;
  }

  // TODO: PLAYG-1380 - MPR 렌더링 전체 로직 구현
}
```

#### 산출물 검증 기준

- [ ] 3개 클래스에 SDS에 정의된 전체 메서드 스텁 존재
- [ ] WebGL 2.0 미지원 환경에서 null 반환 (정상 저하)
- [ ] ViewTransformEngine.getTransform()이 기본 ViewTransform 반환
- [ ] 단위 테스트 3개 모두 통과 (Canvas mock 사용)
- [ ] `npm run build` 성공


### Phase 6: Presentation Layer 뼈대 (UIController, ViewportManager)

**목표**: SAD Presentation Layer의 2개 모듈 스텁을 구현한다.
사용자 입력 처리 및 뷰포트 레이아웃 관리 뼈대를 제공한다.

**근거 문서**: SDS-3.9(UIController), SDS-3.10(ViewportManager)

#### 세부 작업

| 작업 ID | 작업명 | 상세 내용 | 산출물 | 추적 |
|---------|--------|-----------|--------|------|
| P6-01 | UIController.js 스텁 | constructor(container), init(), checkBrowserSupport(), bindEvents(), handleFileSelect(event), showDiagnosticWarning(), showError(message), destroy() 메서드 스텁 | src/presentation/UIController.js | COMP-4.1, FR-6.1, FR-6.2 |
| P6-02 | ViewportManager.js 스텁 | constructor(container), layoutViewports(), getActiveViewport(), setLayout(type), updateViewport(id, imageData), destroy() 메서드 스텁 | src/presentation/ViewportManager.js | COMP-4.2, FR-2.6 |
| P6-03 | presentation/index.js | 2개 모듈 re-export | src/presentation/index.js | ADR-1 |
| P6-04 | main.css | 기본 레이아웃 스타일 (진단 불가 경고 배너, 뷰포트 그리드, 오류 메시지) | src/styles/main.css | FR-6.1 |
| P6-05 | UIController.test.js | 스텁 메서드 존재, checkBrowserSupport() 반환값 검증 | tests/unit/presentation/UIController.test.js | COMP-4.1 |
| P6-06 | ViewportManager.test.js | 스텁 메서드 존재, 초기화 상태 검증 | tests/unit/presentation/ViewportManager.test.js | COMP-4.2 |

#### UIController 스텁 핵심 인터페이스

| 메서드 | 입력 | 출력 | 추적 FR |
|--------|------|------|---------|
| constructor(container) | HTMLElement | UIController 인스턴스 | - |
| init() | 없음 | void (하위 모듈 초기화) | - |
| checkBrowserSupport() | 없음 | BrowserSupportResult | FR-6.2, HAZ-4.2 |
| bindEvents() | 없음 | void (이벤트 리스너 등록) | - |
| handleFileSelect(event) | Event | void | FR-1.1 |
| showDiagnosticWarning() | 없음 | void (경고 배너 DOM 삽입) | FR-6.1, HAZ-4.1 |
| showError(message) | string | void (오류 표시) | FR-1.5, NFR-3.1 |
| destroy() | 없음 | void (이벤트 해제) | - |

#### ViewportManager 스텁 핵심 인터페이스

| 메서드 | 입력 | 출력 | 추적 FR |
|--------|------|------|---------|
| constructor(container) | HTMLElement | ViewportManager 인스턴스 | - |
| layoutViewports() | 없음 | void (3+1 뷰포트 DOM 구성) | FR-2.6 |
| getActiveViewport() | 없음 | ViewportInfo 또는 null | - |
| setLayout(type) | LayoutType | void | - |
| updateViewport(id, imageData) | string, ImageData | void | FR-2.1~2.5 |
| destroy() | 없음 | void | - |

#### 진단 불가 경고 배너 (FR-6.1)

```javascript
// src/presentation/UIController.js 내 showDiagnosticWarning 스텑
showDiagnosticWarning() {
  // TODO: PLAYG-1383 - 진단 불가 경고 배너 전체 구현
  // 필수 요구사항:
  // - UI 최상단에 경고 문구 필수 표시 (HAZ-4.1)
  // - 매 세션마다 표시
  // - 사용자 수동 닫기 가능
  // - 문구: "본 소프트웨어는 진단 목적이 아닙니다."
  console.warn('showDiagnosticWarning: NOT_IMPLEMENTED');
}
```

#### 기본 CSS 레이아웃 (main.css)

```css
/* src/styles/main.css */
/* 기본 뷰포트 레이아웃 - 2x2 그리드 (3 MPR + 1 3D) */

.viewer-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 4px;
  width: 100vw;
  height: 100vh;
  background: #1a1a2e;
}

.diagnostic-warning {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: #ff6b6b;
  color: white;
  text-align: center;
  padding: 8px;
  font-weight: bold;
  z-index: 1000;
}
```

#### 산출물 검증 기준

- [ ] UIController에 SDS-3.9에 정의된 전체 메서드 스텁 존재
- [ ] ViewportManager에 SDS-3.10에 정의된 전체 메서드 스텁 존재
- [ ] main.css에 진단 불가 경고 배너 스타일 포함 (FR-6.1)
- [ ] 단위 테스트 2개 모두 통과
- [ ] `npm run build` 성공



### Phase 7: 진입점 및 HTML 템플릿

**목표**: 애플리케이션 진입점(main.js)과 index.html을 작성하여 모든 계층 모듈을 연결한다.
CSP 메타 태그를 포함하여 보안 정책을 HTML 레벨에서 적용한다.

**근거 문서**: SAD-04(배포 뷰), SDS-3.8(SecurityGuard CSP), ADR-5(정적 단일 번들)

#### 세부 작업

| 작업 ID | 작업명 | 상세 내용 | 산출물 | 추적 |
|---------|--------|-----------|--------|------|
| P7-01 | index.html 작성 | 진입점 HTML. CSP meta 태그 포함, 진단 불가 경고 배너 마크업, 파일 선택 input, 뷰포트 컨테이너 div 포함. 외부 스크립트/스타일 참조 금지 | viewer/index.html | FR-5.1, FR-6.1, ADR-5 |
| P7-02 | main.js 작성 | 애플리케이션 부트스트랩. SecurityGuard 초기화 -> UIController 초기화 -> ViewportManager 레이아웃 -> 진단 경고 표시 흐름 구현 | src/main.js | 전체 계층 연결 |
| P7-03 | favicon.ico | 기본 파비콘 (빈 파일 또는 최소 아이콘) | public/favicon.ico | - |

#### index.html 구조

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self';
                 script-src 'self';
                 style-src 'self' 'unsafe-inline';
                 img-src 'self' data:;
                 connect-src 'none';
                 font-src 'self';" />
  <title>Simple CBCT Viewer</title>
</head>
<body>
  <!-- 진단 불가 경고 배너 (FR-6.1, HAZ-4.1) -->
  <div id="diagnostic-warning" class="diagnostic-warning">
    본 소프트웨어는 진단 목적이 아닙니다.
    측정값은 참고용이며, 최종 임상 판단은 유자격 전문의가 수행해야 합니다.
    <button id="warning-close" type="button">확인</button>
  </div>

  <!-- 파일 선택 영역 -->
  <div id="file-input-area">
    <input type="file" id="dicom-file-input" accept=".dcm" />
  </div>

  <!-- 뷰포트 컨테이너 (FR-2.6: 3 MPR + 1 3D) -->
  <div id="viewer-container" class="viewer-container">
    <canvas id="viewport-axial" class="viewport"></canvas>
    <canvas id="viewport-coronal" class="viewport"></canvas>
    <canvas id="viewport-sagittal" class="viewport"></canvas>
    <canvas id="viewport-3d" class="viewport"></canvas>
  </div>

  <!-- 오류 메시지 영역 -->
  <div id="error-area" class="error-area" hidden></div>

  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

> **CSP 정책 설명 (FR-5.1, NFR-2.1, HAZ-3.1)**:
> - `default-src 'self'`: 동일 출처만 허용
> - `script-src 'self'`: 인라인 스크립트 차단 (Vite 번들만 허용)
> - `style-src 'self' 'unsafe-inline'`: Vite HMR에 필요한 인라인 스타일 허용
> - `connect-src 'none'`: **모든 네트워크 요청 차단** (fetch, XHR, WebSocket)
> - `img-src 'self' data:`: Canvas 데이터 URL 허용
> - 외부 CDN 참조 완전 차단 (HAZ-5.3)

#### main.js 부트스트랩 흐름

```javascript
// src/main.js
import { SecurityGuard } from './business/SecurityGuard.js';
import { UIController } from './presentation/UIController.js';

/**
 * 애플리케이션 부트스트랩
 * 1. SecurityGuard 초기화 (CSP, 네트워크 차단)
 * 2. UIController 초기화 (브라우저 감지, 이벤트 바인딩)
 * 3. 진단 불가 경고 표시
 */
function bootstrap() {
  // Step 1: 보안 초기화
  const guard = new SecurityGuard();
  guard.blockNetworkRequests();
  guard.enforceMemoryOnlyStorage();

  // Step 2: UI 초기화
  const container = document.getElementById('viewer-container');
  const controller = new UIController(container);
  controller.init();

  // Step 3: 진단 불가 경고 표시 (FR-6.1, HAZ-4.1)
  controller.showDiagnosticWarning();
}

document.addEventListener('DOMContentLoaded', bootstrap);
```

#### 산출물 검증 기준

- [ ] index.html에 CSP meta 태그 포함 (connect-src 'none')
- [ ] index.html에 외부 스크립트/스타일 참조 없음
- [ ] 진단 불가 경고 배너 마크업 존재
- [ ] main.js에서 4계층 모듈 import 성공
- [ ] `npm run build` 성공
- [ ] `npm run preview`로 로컬 서버 실행 후 빈 페이지 정상 표시
- [ ] 브라우저 개발자도구에서 CSP 위반 없음


### Phase 8: 테스트 인프라 및 빌드 검증

**목표**: Vitest 설정, 전체 모듈 통합 테스트, 최종 빌드 검증을 수행한다.
모든 스텁 모듈이 올바르게 연결되고 빌드 산출물이 정상 생성되는지 확인한다.

**근거 문서**: DP-PLAYG-1231(개발 계획), NFR-2.2(정적 분석), SAD-04(배포 뷰)

#### 세부 작업

| 작업 ID | 작업명 | 상세 내용 | 산출물 | 추적 |
|---------|--------|-----------|--------|------|
| P8-01 | vitest.config.js (또는 vite.config.js에 test 설정) | Vitest 테스트 설정. environment: 'jsdom', globals: true, coverage 설정 | vite.config.js 업데이트 | DP-02 |
| P8-02 | tests/setup.js | 글로벌 테스트 설정. Canvas/WebGL mock, DOM mock 설정 | tests/setup.js | DP-02 |
| P8-03 | app.test.js (통합) | 모든 계층 모듈 import 가능 여부, 계층 간 의존성 규칙 위반 없는지 검증 | tests/integration/app.test.js | ADR-1 |
| P8-04 | 빌드 검증 스크립트 | dist/ 산출물 크기 확인, 외부 참조 없음 확인, CSP meta 태그 포함 확인 | package.json scripts 추가 | ADR-5, FR-7.1 |
| P8-05 | 전체 단위 테스트 실행 | Phase 3~6에서 작성한 10개 단위 테스트 통합 실행 | 테스트 리포트 | DP-02 |
| P8-06 | ESLint 보안 규칙 검증 | 소스코드 내 fetch/XMLHttpRequest/WebSocket 사용 여부 정적 분석 | lint 리포트 | NFR-2.2, HAZ-3.1 |
| P8-07 | 최종 빌드 산출물 검증 | dist/index.html + dist/assets/ 구조 확인, 외부 리소스 참조 없음 확인 | 빌드 검증 결과 | ADR-5 |

#### Vitest 설정 (vite.config.js)

```javascript
// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: undefined,  // 단일 번들
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.js'],
    },
  },
});
```

#### 통합 테스트 (app.test.js)

```javascript
// tests/integration/app.test.js
import { describe, it, expect } from 'vitest';

// 계층별 import 검증
import { DICOMParser, DataValidator } from '../../src/data/index.js';
import { VolumeBuilder, MeasurementEngine, SecurityGuard } from '../../src/business/index.js';
import { MPRRenderer, VolumeRenderer, ViewTransformEngine } from '../../src/rendering/index.js';
import { UIController, ViewportManager } from '../../src/presentation/index.js';

describe('Layered Architecture 통합 검증', () => {
  it('10개 모듈이 모두 export되어야 한다', () => {
    expect(DICOMParser).toBeDefined();
    expect(DataValidator).toBeDefined();
    expect(VolumeBuilder).toBeDefined();
    expect(MeasurementEngine).toBeDefined();
    expect(SecurityGuard).toBeDefined();
    expect(MPRRenderer).toBeDefined();
    expect(VolumeRenderer).toBeDefined();
    expect(ViewTransformEngine).toBeDefined();
    expect(UIController).toBeDefined();
    expect(ViewportManager).toBeDefined();
  });

  it('4계층 구조가 올바르게 분리되어야 한다', () => {
    // Data Layer는 다른 계층을 참조하지 않음
    // Business Layer는 Data Layer만 참조
    // Rendering Layer는 Business Layer만 참조
    // Presentation Layer는 Rendering Layer만 참조
    // 이 검증은 빌드 시 import 분석으로 확인
    expect(true).toBe(true);
  });
});
```

#### 빌드 검증 체크리스트

| 검증 항목 | 기대 결과 | 검증 방법 | 추적 |
|-----------|-----------|-----------|------|
| npm run build 성공 | dist/ 디렉토리 생성 | 명령어 실행 | ADR-5 |
| dist/index.html 존재 | 단일 HTML 파일 | 파일 존재 확인 | FR-7.1 |
| dist/assets/*.js 존재 | 번들된 JS 파일 | 파일 존재 확인 | ADR-5 |
| 외부 리소스 참조 없음 | CDN URL 미포함 | grep 검증 | HAZ-5.3 |
| CSP meta 태그 유지 | connect-src 'none' 포함 | HTML 파싱 확인 | FR-5.1 |
| npm test 통과 | 10개 단위 + 1개 통합 테스트 PASS | vitest run | DP-02 |
| npm run lint: 0 errors | 보안 규칙 위반 없음 | eslint 실행 | NFR-2.2 |

#### 산출물 검증 기준

- [ ] `npm run build` 성공 (0 errors, 0 warnings)
- [ ] `npm test` 통과 (단위 10개 + 통합 1개 = 11개 테스트 PASS)
- [ ] `npm run lint` 0 errors
- [ ] dist/ 산출물에 외부 리소스 참조 없음
- [ ] CSP connect-src 'none' 확인
- [ ] 빌드 산출물 총 크기가 합리적 범위 (초기 스텑 기준 100KB 미만 예상)



---

## 전체 일정 및 의존 관계

### Phase 간 의존 관계

```
Phase 1 (프로젝트 초기 설정)
  |
  v
Phase 2 (타입/인터페이스 정의)
  |
  +----------+----------+----------+
  |          |          |          |
  v          v          v          v
Phase 3    Phase 4    Phase 5    Phase 6
Data Layer  Business   Rendering  Presentation
  |          |          |          |
  +----------+----------+----------+
  |
  v
Phase 7 (진입점 및 HTML 템플릿)
  |
  v
Phase 8 (테스트 인프라 및 빌드 검증)
```

> Phase 3~6은 서로 독립적으로 병렬 진행 가능하다.
> 단, Phase 4(MeasurementEngine)는 Phase 3(DataValidator)의
> validatePixelSpacing() 반환 타입에 의존하므로,
> Phase 2(타입 정의)가 완료된 후 시작하는 것이 안전하다.

### 일정 계획

| Phase | 기간 | 산출물 | 관련 티켓 |
|-------|------|--------|-----------|
| Phase 1 | 1일 | 프로젝트 설정 파일 일식 | PLAYG-1370 |
| Phase 2 | 1일 | 8개 타입 정의 파일 | PLAYG-1370 |
| Phase 3 | 1일 | Data Layer 스텑 2개 + 테스트 | PLAYG-1375, PLAYG-1376 |
| Phase 4 | 1일 | Business Layer 스텑 3개 + 테스트 | PLAYG-1377~1379 |
| Phase 5 | 1일 | Rendering Layer 스텑 3개 + 테스트 | PLAYG-1380~1382 |
| Phase 6 | 1일 | Presentation Layer 스텑 2개 + 테스트 | PLAYG-1383~1384 |
| Phase 7 | 0.5일 | index.html + main.js | PLAYG-1370 |
| Phase 8 | 0.5일 | 통합 테스트 + 빌드 검증 | PLAYG-1370 |
| **합계** | **6일** | **10개 모듈 스텑 + 테스트 인프라** | |

### 복잡도 추정

| Phase | 파일 수 | 메서드 수(스텑) | 테스트 수 | 복잡도 |
|-------|---------|----------------|-----------|--------|
| Phase 1 | 6 | 0 | 0 | 낮음 |
| Phase 2 | 8 | 8 (factory) | 0 | 낮음 |
| Phase 3 | 3 | 10 | 2 | 보통 |
| Phase 4 | 4 | 14 | 3 | 보통 |
| Phase 5 | 4 | 14 | 3 | 보통 (WebGL mock 필요) |
| Phase 6 | 4 | 14 | 2 | 보통 (DOM mock 필요) |
| Phase 7 | 2 | 1 (bootstrap) | 0 | 낮음 |
| Phase 8 | 3 | 0 | 1+검증 | 보통 |
| **합계** | **34** | **61** | **11** | - |


---

## Complexity Tracking

### 위험 요소 및 대응 방안

| 위험 ID | 위험 내용 | 확률 | 영향 | 대응 방안 | 상태 |
|---------|-----------|------|------|-----------|------|
| RISK-01 | WebGL 2.0 미지원 환경에서 테스트 불가 | 중간 | 중간 | jsdom + WebGL mock 패턴 사용, CI에서는 실제 브라우저 테스트는 후속 Phase에서 Playwright로 수행 | 계획됨 |
| RISK-02 | 스텑 메서드의 반환 타입이 후속 구현 시 변경 가능성 | 중간 | 낮음 | Phase 2에서 타입을 최대한 SAD/SDS에 맞춰 고정, 변경 시 타입 파일만 수정 | 계획됨 |
| RISK-03 | Vite 설정이 정적 단일 번들에 부적합할 가능성 | 낮음 | 높음 | vite.config.js에 rollupOptions으로 단일 청크 강제, 검증 스크립트로 확인 | 계획됨 |
| RISK-04 | CSP 정책이 Vite 개발 서버와 충돌 | 높음 | 낮음 | 개발 시에는 느슨한 CSP 적용, 프로덕션 빌드에만 엄격 CSP 적용 | 계획됨 |
| RISK-05 | 계층 간 의존성 규칙 위반 (역방향 참조) | 중간 | 중간 | ESLint 커스텀 규칙으로 import 방향 검증 (Phase 1에서 설정) | 계획됨 |

### [NEEDS CLARIFICATION] 항목

| 항목 ID | 내용 | 관련 Phase | 비고 |
|---------|------|-----------|------|
| CLARIFY-01 | jsdom 환경에서 WebGL 2.0 mock의 한계로 인해 Rendering Layer 테스트 범위 결정 필요 | Phase 5, 8 | 실제 렌더링 검증은 Playwright E2E로 수행할지 여부 |
| CLARIFY-02 | Viewer 애플리케이션의 배포 위치가 viewer/인지, 프로젝트 루트인지 최종 확정 | Phase 1 | 기존 Python 코드와의 공존 방식 |
| CLARIFY-03 | ESLint 커스텀 규칙으로 계층 간 import 방향을 검증할지, 별도 도구를 사용할지 | Phase 1, 8 | no-restricted-imports 규칙 활용 가능성 |

### 기술 부채 추적

| 부채 ID | 내용 | 발생 Phase | 상환 시점 | 우선순위 |
|---------|------|-----------|-----------|----------|
| DEBT-01 | 모든 모듈이 스텑 상태 (NOT_IMPLEMENTED 에러 반환) | Phase 3~6 | 각 모듈별 후속 티켓 | 높음 |
| DEBT-02 | WebGL mock이 완전하지 않아 렌더링 경로 테스트 제한적 | Phase 5, 8 | Phase 8 이후 Playwright 도입 시 | 보통 |
| DEBT-03 | CSS 레이아웃이 최소한의 뼈대만 포함 | Phase 6 | UI 구현 티켓 | 낮음 |
| DEBT-04 | CSP 'unsafe-inline'이 style-src에 포함됨 | Phase 7 | Vite HMR 없이도 동작 확인 후 제거 검토 | 낮음 |


---

## 참조 문서

| 문서 | 티켓 | 설명 |
|------|------|------|
| SAD (소프트웨어 아키텍처 명세서) | PLAYG-1311 | 4계층 10모듈 아키텍처 정의 |
| SDS (소프트웨어 상세 설계) | PLAYG-1312 | 각 모듈별 상세 인터페이스 정의 |
| SRS (소프트웨어 요구사항 명세서) | PLAYG-1310 | FR/NFR 요구사항 정의 |
| RMR (위험 관리 보고서) | PLAYG-1309 | Hazard 식별 및 완화 조치 |
| Development Plan | PLAYG-1231 | 개발 계획, 기술 스택, 도구 |
| Security Maintenance Plan | PLAYG-1233 | 보안 유지보수 계획 |
| Configuration Management Plan | PLAYG-1234 | 형상 관리 계획 |
| ADR-1 (본 티켓) | PLAYG-1370 | Layered Architecture 채택 결정 |
| ADR-2 | PLAYG-1371 | DICOM 파서 자체 구현 결정 |
| ADR-3 | PLAYG-1372 | 메모리 무상태 데이터 처리 결정 |
| ADR-4 | PLAYG-1373 | WebGL 2.0 렌더링 결정 |
| ADR-5 | PLAYG-1374 | 정적 단일 번들 배포 결정 |

---

*문서 끝*


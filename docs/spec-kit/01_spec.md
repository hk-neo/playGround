# Simple CBCT Viewer - 기초 공사 명규서

- **티켓**: PLAYG-1370
- **문서 ID**: SPEC-PLAYG-1370
- **작성일**: 2026-04-14
- **제품**: Simple CBCT Viewer
- **IEC 62304 안전 등급**: Class A
- **부모 티켓**: PLAYG-1386
- **이슈 유형**: Architecture

---

## 1. 개요

### 1.1 목적

본 문서는 PLAYG-1370 [ADR-1] Layered Architecture 채택 티켓의 실행 명규서이다.
SAD(PLAYG-1311)에서 결정한 4계층 10모듈 Layered Architecture를 실제 프로젝트 코드로 구현하기 위한
기초 공사 작업을 정의한다. 이 작업은 CBCT Viewer 본체 구현에 앞서 프로젝트 뾼대,
공통 인프라, 모듈 인터페이스 타입 정의, 에러 처리 체계를 확립하는 것을 목적으로 한다.

### 1.2 배경

- SAD(PLAYG-1311)에서 ADR-1로 Layered Architecture를 채택
- SDS(PLAYG-1312)에서 10개 컨포넌트(COMP-1.1 ~ COMP-4.2)의 상세 설계가 완료됨
- 현재 소스 코드는 ER Gate 검토 도구(Python)만 존재하며 CBCT Viewer(JS) 본체 코드가 없음
- 따라서 본격적인 모듈 구현 전 프로젝트 기초 설정이 선행되어야 함

### 1.3 범위

| 항목 | 범위 | 비고 |
|------|------|------|
| 프로젝트 디렉토리 구조 | 포함 | src/ 하위 4계층 분리 |
| 모듈 파일 생성 | 포함 | 10개 모듈 .js 스캘레톤 |
| 빌드 설정 (Vite) | 포함 | vite.config.js |
| 테스트 설정 (Vitest) | 포함 | vitest.config.js |
| 린트/포맷팅 (ESLint, Prettier) | 포함 | eslint.config.js, .prettierrc |
| 공통 타입 정의 (JSDoc) | 포함 | types.js |
| 에러 클래스 계층 | 포함 | errors.js |
| 진입점 (index.html, main.js) | 포함 | 최소 동작 확인 |
| 비즈니스 로직 구현 | 제외 | 후속 티켓 |
| 렌더링 로직 구현 | 제외 | 후속 티켓 |
| DICOM 파싱 구현 | 제외 | 후속 티켓 |

### 1.4 참조 문서

| 문서 | 티켓 | 설명 |
|------|------|------|
| SAD | PLAYG-1311 | 소프트웨어 아키텍처 명규서 |
| SDS | PLAYG-1312 | 소프트웨어 상세 설계 명규서 |
| SRS | PLAYG-1310 | 소프트웨어 요구사항 명규서 |
| Development Plan | PLAYG-1231 | 개발 계획서 |
| Classification | PLAYG-1290 | Class A 안전 등급 분류 |

---

## 2. User Scenarios & Testing

### 2.1 사용자 스토리

#### US-001: 프로젝트 디렉토리 구조 생성
- **역할**: 개발자
- **우선순위**: P1
- **스토리**: 개발자로서, 4계층 10모듈에 맞는 디렉토리 구조가 존재해야 한다.
  그렇지 않으면 각 모듈을 독립적으로 개발하고 테스트할 수 없다.
- **수용 조건**:
  - src/ 하위에 data/, business/, rendering/, presentation/ 디렉토리가 존재한다
  - 각 디렉토리에 해당 모듈 .js 파일이 존재한다
  - 각 모듈 파일은 SAD에 정의된 공개 인터페이스를 JSDoc으로 선언한다 (구현은 stub)
  - 테스트 디렉토리 구조가 소스 디렉토리를 미러링한다

#### US-002: 빌드 파이프라인 설정
- **역할**: 개발자
- **우선순위**: P1
- **스토리**: 개발자로서, npm run dev/build 명령으로 즉시 개발과 빌드를 실행할 수 있어야 한다.
  그렇지 않으면 개발을 시작할 수 없다.
- **수용 조건**:
  - npm run dev 실행 시 개발 서버가 정상 기동한다
  - npm run build 실행 시 정적 산출물이 dist/에 생성된다
  - 빌드 산출물에 외부 리소스 참조(CDN 등)가 없다 (ADR-5 준수)
  - 빌드 산출물은 단일 HTML + 번들 JS/CSS로 구성된다

#### US-003: 테스트 인프라 구축
- **역할**: 개발자
- **우선순위**: P1
- **스토리**: 개발자로서, npm run test로 Vitest가 실행되어야 한다.
  그렇지 않으면 각 모듈의 단위 테스트를 즉시 작성할 수 없다.
- **수용 조건**:
  - npm run test 실행 시 Vitest가 정상 기동한다
  - 각 모듈에 대해 최소 1개의 스모크 테스트가 존재한다
  - 커버리지 리포트를 생성할 수 있다

#### US-004: 코드 품질 도구 설정
- **역할**: 개발자
- **우선순위**: P2
- **스토리**: 개발자로서, ESLint 및 Prettier가 설정되어 야 한다.
  그렇지 않으면 코드 스타일 일관성과 정적 분석 기반 보안 검증을 수행할 수 없다.
- **수용 조건**:
  - npm run lint 실행 시 ESLint 검사가 수행된다
  - npm run format 실행 시 Prettier 포맷팅이 적용된다
  - ESLint 규칙에 네트워크 API(fetch, XMLHttpRequest, WebSocket) 사용 감지 규칙이 포함된다
  - (NFR-2.2 정적 분석 보안 검증)

#### US-005: 공통 데이터 모델 및 에러 체계 정의
- **역할**: 개발자
- **우선순위**: P1
- **스토리**: 개발자로서, 공통 데이터 타입과 에러 클래스가 정의되어 야 한다.
  그렇지 않으면 모듈 간 인터페이스 계약을 명확히 하고 일관된 에러 처리를 할 수 없다.
- **수용 조건**:
  - DICOMMetadata, VolumeData, SliceData, MeasurementData, ViewTransform 타입이 JSDoc으로 정의된다
  - 커스텀 에러 클래스 계층(CBVError > ParseError/ValidationError/RenderError/SecurityError)이 정의된다
  - 의존성 방향 규칙(상위 계층 > 하위 계층만 허용)이 문서화된다

#### US-006: 애플리케이션 진입점 구성
- **역할**: 개발자
- **우선순위**: P1
- **스토리**: 개발자로서, index.html과 main.js가 연결되어 전체 파이프라인이 동작하는지 확인할 수 있어야 한다.
  그렇지 않으면 전체 파이프라인(빌드-실행-테스트)이 연결되었띌을 확인할 수 없다.
- **수용 조건**:
  - index.html에 진단 불가 경고 문구 영역이 포함된다 (FR-6.1)
  - main.js에서 4계층 모듈을 import하여 초기화 순서를 보여준다
  - SecurityGuard에 의해 CSP 정책이 적용된다 (FR-5.1)

### 2.2 테스트 시나리오

| 시나리오 ID | 사용자 스토리 | 테스트 내용 | 우선순위 |
|-------------|---------------|-------------|----------|
| TS-001 | US-001 | 디렉토리 구조 검증: src/data/ business/ rendering/ presentation/ 존재 확인 | P1 |
| TS-002 | US-001 | 10개 모듈 .js 파일 존재 및 JSDoc 인터페이스 export 확인 | P1 |
| TS-003 | US-002 | npm run dev 실행 시 개발 서버 기동 확인 | P1 |
| TS-004 | US-002 | npm run build 실행 시 dist/ 산출물 생성 및 외부 참조 부재 확인 | P1 |
| TS-005 | US-003 | npm run test 실행 시 Vitest 기동 및 스모크 테스트 통과 | P1 |
| TS-006 | US-003 | 각 모듈 스모크 테스트 존재 및 독립 실행 확인 | P1 |
| TS-007 | US-004 | npm run lint 실행 시 ESLint 검사 수행 | P2 |
| TS-008 | US-004 | 네트워크 API 사용 시 ESLint 경고 발생 확인 | P2 |
| TS-009 | US-005 | types.js export 타입 JSDoc 구조 검증 | P1 |
| TS-010 | US-005 | 에러 클래스 계층 구조 검증 | P1 |
| TS-011 | US-006 | index.html 로드 시 진단 경고 영역 표시 확인 | P1 |
| TS-012 | US-006 | main.js에서 4계층 모듈 import 및 초기화 순서 실행 확인 | P1 |

---

## 3. Requirements

### 3.1 기능 요구사항

#### FR-INFRA-001: 디렉토리 구조 설계

SAD의 4계층 10모듈 구조를 반영한 디렉토리 레이아웃을 생성해야 한다.

**목표 디렉토리 구조:**
```
src/
  main.js                    # 애플리케이션 진입점
  types.js                   # 공통 데이터 모델 타입 정의 (JSDoc)
  errors.js                  # 커스텀 에러 클래스 계층
  data/                      # Data Layer
    DICOMParser.js           # COMP-1.1 (SDS-3.1)
    DataValidator.js         # COMP-1.2 (SDS-3.2)
    index.js                 # 계층 공개 인터페이스
  business/                  # Business Layer
    VolumeBuilder.js         # COMP-2.1 (SDS-3.3)
    MeasurementEngine.js     # COMP-2.2 (SDS-3.7)
    SecurityGuard.js         # COMP-2.3 (SDS-3.8)
    index.js                 # 계층 공개 인터페이스
  rendering/                 # Rendering Layer
    MPRRenderer.js           # COMP-3.1 (SDS-3.4)
    VolumeRenderer.js        # COMP-3.2 (SDS-3.5)
    ViewTransformEngine.js   # COMP-3.3 (SDS-3.6)
    index.js                 # 계층 공개 인터페이스
  presentation/              # Presentation Layer
    UIController.js          # COMP-4.1 (SDS-3.9)
    ViewportManager.js       # COMP-4.2 (SDS-3.10)
    index.js                 # 계층 공개 인터페이스
tests/
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
    types.test.js
    errors.test.js
  e2e/
    smoke.test.js
```

#### FR-INFRA-002: 모듈 스캘레톤 파일 생성

각 모듈 .js 파일은 다음 구조를 가져야 한다:
- 파일 상단에 JSDoc으로 SAD/SDS에 정의된 공개 인터페이스 선언
- 클래스 선언 및 export default (구현은 stub/throw NotImplementedError)
- 각 메서드는 지정된 파라미터와 반환 타입을 JSDoc에 명시

**모듈별 인터페이스 매핑:**

| 모듈 | 파일 | 공개 메서드 | 관련 SRS |
|------|------|-------------|----------|
| DICOMParser | DICOMParser.js | parseDICOM(file: File) | FR-1.1 ~ FR-1.5 |
| DataValidator | DataValidator.js | validateHeader(metadata), validatePixelSpacing(meta), validateVoxelRange(data), validateImageOrientation(meta) | FR-1.2, FR-1.4, FR-2.4, FR-4.2 |
| VolumeBuilder | VolumeBuilder.js | buildVolume(voxelData, metadata), estimateMemory(fileSize), monitorMemoryUsage() | FR-1.4, FR-1.6, FR-7.4 |
| MeasurementEngine | MeasurementEngine.js | measureDistance(p1, p2, transform), generateDisclaimer(), inverseTransform(coords, transform) | FR-4.1 ~ FR-4.4 |
| SecurityGuard | SecurityGuard.js | blockNetworkRequests(), applyCSP(), enforceMemoryOnlyStorage(), releaseMemory(), auditDependencies() | FR-5.1 ~ FR-5.4 |
| MPRRenderer | MPRRenderer.js | renderMPR(volume, plane, sliceIndex) | FR-2.1 ~ FR-2.4, FR-2.6 |
| VolumeRenderer | VolumeRenderer.js | renderVolume(volume, options) | FR-2.5 |
| ViewTransformEngine | ViewTransformEngine.js | applyTransform(type, params) | FR-3.1 ~ FR-3.4 |
| UIController | UIController.js | checkBrowserSupport(), initUI(), showDiagnosticWarning() | FR-6.1, FR-6.2 |
| ViewportManager | ViewportManager.js | layoutViewports() | FR-2.6 |

#### FR-INFRA-003: 빌드 설정 (Vite 5.x)

Vite 기반 빌드 설정을 구성해야 한다.
- **설정 파일**: vite.config.js
- **필수 구성 항목**:
  - 입력: src/main.js
  - 출력: dist/ 디렉토리
  - 번들 형식: ES Module (ESM)
  - 외부 의존성: 프로덕션 의존성 0개 (ADR-2 자체 구현 원칙)
  - CSP 호환: inline script 최소화
  - 소스맵: 개발 빌드에만 포함
- **package.json 스크립트**:
  - npm run dev: 개발 서버 기동
  - npm run build: 프로덕션 빌드
  - npm run preview: 빌드 산출물 미리보기

#### FR-INFRA-004: 테스트 설정 (Vitest)

Vitest 기반 테스트 설정을 구성해야 한다.
- **설정 파일**: vitest.config.js
- **필수 구성 항목**:
  - 테스트 환경: jsdom (DOM API 테스트용)
  - 테스트 파일 패턴: tests/**/*.test.js
  - 커버리지: v8 provider
- **스모크 테스트**: 각 모듈에 대해 최소 1개 (import 가능 여부 확인)
- **package.json 스크립트**:
  - npm run test: 테스트 실행
  - npm run test:coverage: 커버리지 리포트

#### FR-INFRA-005: 린트 및 포맷팅 설정

ESLint 9.x 및 Prettier 3.x 기반 코드 품질 도구를 설정해야 한다.
- **ESLint 설정 파일**: eslint.config.js (Flat Config 형식)
- **필수 ESLint 규칙**:
  - ES2020+ 문법 검사
  - 네트워크 API 사용 금지 감지 규칙 (no-restricted-globals 또는 칌스텀 규칙)
  - 대상: fetch, XMLHttpRequest, WebSocket, navigator.sendBeacon
  - (NFR-2.2 정적 분석 보안 검증 준수)
- **Prettier 설정 파일**: .prettierrc
  - 인덴트: 2칸
  - 디지트: 배제
  - 디원파일 남기기
- **package.json 스크립트**:
  - npm run lint: ESLint 검사
  - npm run format: Prettier 포맷팅

#### FR-INFRA-006: 공통 데이터 모델 타입 정의 (JSDoc)

SAD 5.2의 데이터 모델을 JSDoc 타입 주석으로 정의해야 한다.
- **파일**: src/types.js
- **정의할 타입**:

| 타입 이름 | 필드 | 설명 | 관련 컨포넌트 |
|------------|-------|------|----------------|
| @typedef {Object} DICOMMetadata | patientName, patientID, studyDate, modality, pixelSpacing, sliceThickness, imageOrientationPatient, rows, columns, numberOfFrames, bitsAllocated, transferSyntax, windowCenter, windowWidth | DICOM 파일 메타 데이터 | DICOMParser, DataValidator |
| @typedef {Object} VolumeData | voxelArray (ArrayBuffer), dimensions [x,y,z], spacing [x,y,z], origin [x,y,z], dataType, minMaxValue [min,max] | 3차원 볼륨 데이터 | VolumeBuilder |
| @typedef {Object} SliceData | imageData (ImageData), plane (Axial|Coronal|Sagittal), sliceIndex, windowLevel, windowWidth | MPR 단면 영상 데이터 | MPRRenderer |
| @typedef {Object} MeasurementData | startPoint [x,y,z], endPoint [x,y,z], distanceMM, pixelSpacingValid, disclaimerText | 거리 측정 결과 | MeasurementEngine |
| @typedef {Object} ViewTransform | zoom, panX, panY, windowLevel, windowWidth, sliceIndex | 뷰 변환 상태 | ViewTransformEngine |

#### FR-INFRA-007: 커스텀 에러 클래스 계층 정의

모듈 간 일관된 에러 처리를 위한 커스텀 에러 클래스 계층을 정의해야 한다.
- **파일**: src/errors.js
- **클래스 계층 구조**:
  - CBVError (Error 확장) - 기본 클래스
    - ParseError - DICOM 파싱 오류 (FR-1.5, HAZ-1.1)
    - ValidationError - 데이터 검증 오류 (FR-1.2, FR-4.2)
    - RenderError - 렌더링 오류 (FR-2.5, HAZ-1.3)
    - SecurityError - 보안 정책 위반 (FR-5.1, HAZ-3.1)
    - MemoryError - 메모리 초과 (FR-1.6, HAZ-5.1)
- **각 에러 클래스에 포함될 정보**:
  - message: 사람이 읽기 쉽다는 오류 메시지
  - code: 기계적으로 처리 가능한 에러 코드
  - context: 추가 정보 (파일명, 메타 데이터 등)

#### FR-INFRA-008: 의존성 방향 규칙

Layered Architecture의 핵심 규칙인 의존성 방향을 정의하고 문서화해야 한다.
- **허용 방향**: Presentation -> Rendering -> Business -> Data
  - Presentation Layer는 Rendering Layer와 Business Layer(VerticalSlice)를 참조할 수 있다
  - Rendering Layer는 Business Layer를 참조할 수 있다
  - Business Layer는 Data Layer를 참조할 수 있다
- **금지 방향**:
  - 하위 계층이 상위 계층을 직접 import할 수 없다
  - Data Layer는 Business, Rendering, Presentation Layer를 import할 수 없다
  - 동일 계층 내 모듈 간 참조는 최소화한다
- **예외**: SecurityGuard는 모든 계층에서 참조 가능하다 (Cross-Cutting Concern)
- **검증 방법**: ESLint no-restricted-imports 규칙로 검증

#### FR-INFRA-009: 애플리케이션 진입점 구성

index.html 및 main.js 진입점을 구성해야 한다.

**index.html 필수 요소**:
- DOCTYPE html5 선언
- meta charset utf-8
- CSP 메타 태그 (SecurityGuard 동적 설정과 볼행)
- 진단 불가 경고 문구 영역 (id="diagnostic-warning") (FR-6.1)
- 뷰포트 컨테이너 영역 (MPR 3단면 + 3D)
- 스크립트 로드: src/main.js (type=")모듈")

**main.js 초기화 순서**:
1. SecurityGuard.applyCSP() - 보안 정책 적용
2. SecurityGuard.blockNetworkRequests() - 외부 통신 차단
3. UIController.checkBrowserSupport() - 브라우저 호환성 검사
4. UIController.showDiagnosticWarning() - 진단 불가 경고 표시
5. ViewportManager.layoutViewports() - 뷰포트 레이아웃
6. 이벤트 리스너 등록 (DICOM 파일 선택 등)

### 3.2 비기능 요구사항

#### NFR-INFRA-001: IEC 62304 Class A 준수 사항

| 요구 항목 | 상세 설명 | 관련 규격 |
|------------|------------|----------------|
| 소스 코드 수명 관리 | Git 버전 관리로 모든 상세 설계 변경 추적 | IEC 62304 제8.1.2 |
| 모듈 단위 테스트 | 각 모듈에 대해 독립적인 단위 테스트 가능 | IEC 62304 제5.5.3 |
| 정적 분석 | ESLint로 코드 품질 및 보안 검증 | IEC 62304 제5.5.5 |
| 구성 관리 | package.json과 lock 파일로 의존성 고정 | IEC 62304 제8.1.4 |
| 문서화 | JSDoc 주석으로 공개 API 문서화 | IEC 62304 제5.4.3 |

#### NFR-INFRA-002: 기술 스택 요구사항

| 구분 | 기술 | 버전 | 요구 사온 |
|--------|--------|--------|------------|
| 프로그래밍 언어 | JavaScript | ES2020+ | IU-08, SR-10 |
| 3D 렌더링 | WebGL | 2.0 | SR-4, ADR-4 |
| 빌드 도구 | Vite | 5.x | DP-02 |
| 테스트 | Vitest | 최신 | DP-02 |
| 정적 분석 | ESLint | 9.x | DP-02, NFR-2.2 |
| 포맷팅 | Prettier | 3.x | DP-02 |
| 패키지 관리 | npm | 10.x | DP-02 |
| 버전 관리 | Git + GitHub | - | CMP-02 |

#### NFR-INFRA-003: 보안 요구사항

| 요구 항목 | 상세 설명 | 관련 SRS |
|------------|------------|---------|
| 외부 통신 차단 | ESLint 규칙로 fetch, XMLHttpRequest, WebSocket 사용 감지 | FR-5.1, NFR-2.2 |
| CSP 정책 | 빌드 산출물에 CSP 헤더 포함 | NFR-2.1 |
| 의존성 최소화 | 프로덕션 의존성 0개 | FR-5.4, ADR-2 |
| 데이터 불변성 | 데이터 타입은 불변객체(Object.freeze) 구조 | FR-5.2 |

---

## 4. Success Criteria

### 4.1 필수 달성 조건 (P1 - 모두 충족 필요)

| 기준 ID | 달성 조건 | 검증 방법 | 관련 US |
|----------|------------|------------|---------|
| SC-01 | src/ 하위 4개 계층 디렉토리가 존재한다 | 디렉토리 존재 확인 | US-001 |
| SC-02 | 10개 모듈 .js 파일이 JSDoc 인터페이스를 export한다 | 파일 존재 및 JSDoc 가능 확인 | US-001 |
| SC-03 | npm run dev 개발 서버가 정상 기동한다 | 명령 실행 및 브라우저 접근 | US-002 |
| SC-04 | npm run build 가 dist/ 산출물을 생성하고 외부 참조가 없다 | 빌드 실행 및 HTML 내 외부 URL 검색 | US-002 |
| SC-05 | npm run test가 모든 스모크 테스트를 통과한다 | 명령 실행 및 결과 확인 | US-003 |
| SC-06 | types.js에 5개 데이터 타입(DICOMMetadata, VolumeData, SliceData, MeasurementData, ViewTransform)이 정의되어 있다 | JSDoc 구조 검증 | US-005 |
| SC-07 | errors.js에 CBVError 계층(5개 하위 클래스)이 정의되어 있다 | 클래스 구조 검증 | US-005 |
| SC-08 | index.html에 진단 불가 경고 영역(id=")이 포함되어 있다 | HTML 구조 검증 | US-006 |
| SC-09 | main.js가 4계층 모듈을 import하고 초기화 순서를 실행한다 | 코드 검증 및 실행 확인 | US-006 |

### 4.2 권장 달성 조건 (P2 - 권장 필요)

| 기준 ID | 달성 조건 | 검증 방법 | 관련 US |
|----------|------------|------------|---------|
| SC-10 | npm run lint가 ESLint 검사를 수행한다 | 명령 실행 | US-004 |
| SC-11 | 네트워크 API 사용 시 ESLint가 경고를 발생시킨다 | 의도적 용타 비표준 API 사용 후 검증 | US-004 |
| SC-12 | 커버리지 리포트가 생성된다 | npm run test:coverage 실행 | US-003 |
| SC-13 | 각 계층 index.js가 계층 내 모듈을 통합 export한다 | import 구조 검증 | US-001 |

### 4.3 비계

- 모든 P1 기준 달성 시 기초 공사 완료
- P2 기준 중 1개 이상 미달성 시 개선 권고 필요
- P1 기준 중 1개 이상 미달성 시 기초 공사 불합격

---

## 5. 추사성 매트릭스

### 5.1 요구사항 -> 사용자 스토리 매핑

| 요구사항 | 관련 US | 관련 테스트 |
|------------|---------|-------------|
| FR-INFRA-001 | US-001 | TS-001, TS-002 |
| FR-INFRA-002 | US-001 | TS-002 |
| FR-INFRA-003 | US-002 | TS-003, TS-004 |
| FR-INFRA-004 | US-003 | TS-005, TS-006 |
| FR-INFRA-005 | US-004 | TS-007, TS-008 |
| FR-INFRA-006 | US-005 | TS-009 |
| FR-INFRA-007 | US-005 | TS-010 |
| FR-INFRA-008 | US-005 | - (문서가 검증) |
| FR-INFRA-009 | US-006 | TS-011, TS-012 |
| NFR-INFRA-001 | - | 전이 |
| NFR-INFRA-002 | US-002, US-003, US-004 | 전이 |
| NFR-INFRA-003 | US-004, US-006 | TS-008, TS-011 |

### 5.2 SRS -> 기초 공사 요구사항 매핑

| SRS 요구사항 | 기초 공사 연관 요구사항 |
|--------------|--------------------|
| FR-1.1 ~ FR-1.5 | FR-INFRA-002 (DICOMParser 인터페이스 정의) |
| FR-1.2, FR-1.4 | FR-INFRA-002 (DataValidator 인터페이스 정의) |
| FR-1.6, FR-7.4 | FR-INFRA-002 (VolumeBuilder.estimateMemory) |
| FR-2.1 ~ FR-2.6 | FR-INFRA-002 (MPRRenderer, VolumeRenderer 인터페이스 정의) |
| FR-3.1 ~ FR-3.4 | FR-INFRA-002 (ViewTransformEngine 인터페이스 정의) |
| FR-4.1 ~ FR-4.4 | FR-INFRA-002 (MeasurementEngine 인터페이스 정의) |
| FR-5.1 ~ FR-5.4 | FR-INFRA-002 (SecurityGuard), FR-INFRA-009 (CSP 적용) |
| FR-6.1 | FR-INFRA-009 (진단 경고 영역) |
| FR-6.2 | FR-INFRA-009 (브라우저 감지) |
| FR-7.1 | FR-INFRA-003 (외부 참조 없는 빌드) |
| NFR-2.1 | FR-INFRA-009 (CSP 메타 태그) |
| NFR-2.2 | FR-INFRA-005 (네트워크 API 감지 규칙) |

---

## 6. 결론

본 명규서는 PLAYG-1370 [ADR-1] Layered Architecture 채택 티켓의 실행 계획을 정의한다.
기초 공사는 후속 모듈 구현 티켓들의 기반이 되며, 다음 작업들을 선행해야 한다:

1. 프로젝트 디렉토리 구조 및 모듈 스캘레톤 생성
2. Vite, Vitest, ESLint, Prettier 설정
3. 공통 데이터 타입 및 에러 클래스 구현
4. 진입점(index.html, main.js) 구성
5. 모든 테스트 시나리오 통과 확인

기초 공사 완료 후, 각 모듈의 실제 구현은 별도 티켓으로 진행된다.

---

*문서 끝*
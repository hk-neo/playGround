# Tasks: Simple CBCT Viewer - ADR-1 Layered Architecture 기초 공사

**Input**: `docs/spec-kit/01_spec.md`, `docs/spec-kit/02_plan.md`
**Ticket**: PLAYG-1370 | **Date**: 2026-04-14

> **형식 안내**
> - `[ID]` : 태스크 번호 (T001, T002, ...)
> - `[P]` : 병렬 실행 가능 여부 표시 (🔀 병렬 가능 / 🔒 순서 필수)
> - `[Story]` : 관련 사용자 스토리 (US1, US2, ...)
> - 각 태스크는 **2시간 이내** 완료 가능한 단위로 분할
> - IEC 62304 Class A 추적성 유지 (FR/NFR/HAZ 매핑)

---

## Phase 1: Setup (공통 인프라)
<!-- 프로젝트 초기 설정: Vite + Vanilla JS 프로젝트 생성, 빌드/린트/포맷팅 도구 설정 -->

- [ ] **T001** 🔒 프로젝트 디렉토리 구조 생성
  - 파일: `viewer/`, `viewer/src/`, `viewer/src/types/`, `viewer/src/data/`, `viewer/src/business/`, `viewer/src/rendering/`, `viewer/src/presentation/`, `viewer/src/styles/`, `viewer/public/`, `viewer/tests/unit/data/`, `viewer/tests/unit/business/`, `viewer/tests/unit/rendering/`, `viewer/tests/unit/presentation/`, `viewer/tests/integration/`
  - 설명: SAD(PLAYG-1311)에 정의된 4계층 아키텍처에 맞는 디렉토리 구조를 생성한다. Data/Business/Rendering/Presentation 계층별 디렉토리와 테스트 디렉토리를 포함한다.
  - 완료 조건: 14개 디렉토리가 모두 존재하고, `.gitkeep` 파일로 빈 디렉토리가 보존됨
  - 추적: ADR-1, SAD-01

- [ ] **T002** 🔒 package.json 작성 및 npm 초기화
  - 파일: `viewer/package.json`
  - 설명: 프로젝트 메타데이터, 스크립트(dev/build/preview/test/lint/format), devDependencies(vite ^5.x, vitest ^3.x, eslint ^9.x, prettier ^3.x)를 정의한다. runtime dependencies는 외부 의존성 최소화 전략(SAD-06 6.2)에 따라 허용하지 않는다.
  - 완료 조건: `npm install` 성공, devDependencies만 설치됨, `npm run` 스크립트 6개 확인
  - 추적: SAD-06, FR-5.4, DP-02

- [ ] **T003** 🔒 Vite 빌드 설정 작성
  - 파일: `viewer/vite.config.js`
  - 설명: 정적 단일 번들 빌드 설정을 구성한다. base 경로 상대 설정(`./`), build.outDir `dist/`, rollupOptions에서 manualChunks undefined로 단일 번들 강제, Vitest 테스트 설정(globals, jsdom 환경, setupFiles)을 포함한다.
  - 완료 조건: `npm run build` 실행 시 `dist/` 디렉토리 생성 (빈 스텁 상태에서도 에러 없이)
  - 추적: ADR-5, FR-7.1, HAZ-5.3, DP-02

- [ ] **T004** 🔒 ESLint 설정 작성 (보안 규칙 포함)
  - 파일: `viewer/eslint.config.js`
  - 설명: ES2020+ 환경, 브라우저 전역 변수 허용 설정. 네트워크 API(fetch/XMLHttpRequest/WebSocket) 사용 시 경고 규칙 추가하여 FR-5.1(외부 통신 차단)을 정적 분석으로 검증한다. 계층 간 import 방향 검증 규칙(no-restricted-imports)을 포함한다.
  - 완료 조건: `npm run lint` 실행 가능 (0 errors, warnings 허용)
  - 추적: NFR-2.2, HAZ-3.1, FR-5.1

- [ ] **T005** 🔒 Prettier 및 .gitignore 설정
  - 파일: `viewer/.prettierrc`, `viewer/.gitignore`
  - 설명: Prettier는 싱글 따옴표, 세미콜론 필수, 2칸 들여쓰기, 80자 줄바꿈을 설정. .gitignore에는 node_modules/, dist/, .vite/ 등을 포함.
  - 완료 조건: `npm run format` 실행 가능, .gitignore에 필수 항목 5개 이상 포함
  - 추적: DP-02, CMP-02

- [ ] **T006** 🔒 계층별 빈 index.js 배럴 파일 생성
  - 파일: `viewer/src/types/index.js`, `viewer/src/data/index.js`, `viewer/src/business/index.js`, `viewer/src/rendering/index.js`, `viewer/src/presentation/index.js`
  - 설명: 5개 계층/영역의 진입점 역할을 할 빈 export 파일을 생성한다. 향후 각 Phase에서 모듈 export를 추가할 뼈대를 제공한다.
  - 완료 조건: 5개 index.js 파일 존재, `npm run build` 시 에러 없음
  - 추적: ADR-1

---

## Phase 2: Foundational (타입/인터페이스 정의 계층)
<!-- CRITICAL: 모든 계층 모듈 구현 전 반드시 완료해야 할 공유 타입 인프라 -->

- [ ] **T007** 🔒 DICOM 메타데이터 타입 정의
  - 파일: `viewer/src/types/DICOMMetadata.js`
  - 설명: DICOM 메타데이터 구조를 Factory 함수 + JSDoc 패턴으로 정의. patientName, patientID, studyDate, modality, pixelSpacing, sliceThickness, imageOrientationPatient, rows, columns, numberOfFrames, bitsAllocated, transferSyntax, windowCenter, windowWidth 속성을 포함. 모든 속성에 기본값을 제공하는 `createDICOMMetadata(overrides)` 함수를 export.
  - 완료 조건: Factory 함수 호출 시 유효한 기본 객체 생성, JSDoc 타입 어노테이션 포함, `npm run build` 성공
  - 추적: SAD-05, FR-1.3

- [ ] **T008** 🔒 볼륨 데이터 타입 정의
  - 파일: `viewer/src/types/VolumeData.js`
  - 설명: 3차원 볼륨 데이터 구조 정의. voxelArray(Float32Array), dimensions(3), spacing(3), origin(3), dataType, minMaxValue(2) 속성을 포함하는 `createVolumeData(overrides)` Factory 함수.
  - 완료 조건: Factory 함수 호출 시 Float32Array 기본값 포함 객체 생성, JSDoc 포함
  - 추적: SAD-05, FR-1.4

- [ ] **T009** 🔒 슬라이스 데이터 타입 정의
  - 파일: `viewer/src/types/SliceData.js`
  - 설명: MPR 슬라이스 데이터 구조 정의. imageData(ImageData), plane(Axial/Coronal/Sagittal), sliceIndex, windowLevel, windowWidth 속성. `createSliceData(overrides)` Factory 함수.
  - 완료 조건: Factory 함수 호출 시 유효한 기본 객체 생성, plane 기본값 'axial'
  - 추적: SAD-05, FR-2.1~2.3

- [ ] **T010** 🔒 측정 데이터 및 검증 결과 타입 정의
  - 파일: `viewer/src/types/MeasurementData.js`, `viewer/src/types/ValidationResult.js`
  - 설명: MeasurementData(startPoint, endPoint, distanceMM, pixelSpacingValid, disclaimerText)와 ValidationResult(isValid, warnings[], errors[]) 구조를 각각 Factory 함수로 정의. 측정 데이터에는 HAZ-2.1 관련 disclaimer 기본값 포함.
  - 완료 조건: 2개 Factory 함수 각각 유효한 기본 객체 생성, disclaimerText 기본값에 진단 불가 문구 포함
  - 추적: SAD-05, FR-4.1, FR-1.2, HAZ-2.1

- [ ] **T011** 🔒 뷰 변환 및 파싱 결과 타입 정의
  - 파일: `viewer/src/types/ViewTransform.js`, `viewer/src/types/ParseResult.js`
  - 설명: ViewTransform(zoom, panX, panY, windowLevel, windowWidth, sliceIndex)과 ParseResult(metadata, voxelData, errors[], isValid) 구조를 Factory 함수로 정의.
  - 완료 조건: 2개 Factory 함수 각각 유효한 기본 객체 생성, ParseResult.isValid 기본값 false
  - 추적: SAD-05, FR-3.1~3.4, FR-1.1

- [ ] **T012** 🔒 types/index.js 배럴 파일 완성
  - 파일: `viewer/src/types/index.js`
  - 설명: 7개 타입 모듈(DICOMMetadata, VolumeData, SliceData, MeasurementData, ValidationResult, ViewTransform, ParseResult)을 모두 re-export.
  - 완료 조건: `import { createDICOMMetadata, createVolumeData, createSliceData, createMeasurementData, createValidationResult, createViewTransform, createParseResult } from './types/index.js'` 성공, 순환 참조 없음
  - 추적: ADR-1

---## Phase 3: User Story 1 — Data Layer 스텁 구현 (Priority: P1)

- **Goal**: DICOM 파일 파싱 및 데이터 검증 모듈의 스텁 인터페이스를 구현하여 하위 데이터 계층의 기반을 마련한다.
- **Independent Test**: DICOMParser/DataValidator 클래스 인스턴스 생성, 스텁 메서드 호출 시 정의된 타입 반환
- **IEC 62304 추적**: 제5.5절(단위 구현), COMP-1.1, COMP-1.2

- [ ] **T013** 🔀 [US1] DICOMParser 클래스 스텁 구현
  - 파일: `viewer/src/data/DICOMParser.js`
  - 설명: DICOM 파일 파서 클래스 스텁을 구현한다. `parseDICOM(file)`, `validateMagicByte(data)`, `validateTransferSyntax(meta)`, `parseMetadata(data)`, `parsePixelData(data, meta)`, `handleParseError(error)` 6개 메서드를 포함. 각 메서드는 TODO 주석과 함께 기본 반환값(ParseResult/DICOMMetadata) 제공. ParseResult 타입 임포트.
  - 완료 조건: 6개 메서드 존재, JSDoc 타입 어노테이션 포함, `npm run build` 성공
  - 추적: COMP-1.1, FR-1.1~1.5, SDS-3.1

- [ ] **T014** 🔀 [US1] DataValidator 클래스 스텁 구현
  - 파일: `viewer/src/data/DataValidator.js`
  - 설명: 데이터 검증기 클래스 스텁을 구현한다. `validateHeader(meta)`, `validatePixelSpacing(meta)`, `validateVoxelRange(voxels, meta)`, `validateImageOrientation(meta)` 4개 메서드를 포함. ValidationResult 타입을 반환. TODO 주석으로 실제 검증 로직은 후속 티켓(PLAYG-1376)에서 구현 예정 표시.
  - 완료 조건: 4개 메서드 존재, ValidationResult 타입 반환, `npm run build` 성공
  - 추적: COMP-1.2, FR-1.2, FR-4.2, SDS-3.2

- [ ] **T015** 🔒 [US1] data/index.js 배럴 파일 업데이트
  - 파일: `viewer/src/data/index.js`
  - 설명: DICOMParser와 DataValidator를 re-export 하도록 업데이트.
  - 완료 조건: `import { DICOMParser, DataValidator } from './data/index.js'` 성공
  - 추적: ADR-1

- [ ] **T016** 🔀 [US1] DICOMParser 단위 테스트 작성
  - 파일: `viewer/tests/unit/data/DICOMParser.test.js`
  - 설명: DICOMParser 스텁 메서드 존재 확인, 기본 반환값 타입 검증(ParseResult 구조), 6개 메서드가 모두 호출 가능한지 테스트.
  - 완료 조건: `vitest run tests/unit/data/DICOMParser.test.js` PASS
  - 추적: COMP-1.1, 제5.5절

- [ ] **T017** 🔀 [US1] DataValidator 단위 테스트 작성
  - 파일: `viewer/tests/unit/data/DataValidator.test.js`
  - 설명: DataValidator 스텁 메서드 존재 확인, ValidationResult 반환 구조 검증(isValid, warnings, errors 필드 존재), 4개 메서드 호출 가능 테스트.
  - 완료 조건: `vitest run tests/unit/data/DataValidator.test.js` PASS
  - 추적: COMP-1.2, 제5.5절

---

## Phase 4: User Story 2 — Business Layer 스텁 구현 (Priority: P1)

- **Goal**: 볼륨 구성, 측정 엔진, 보안 감시 모듈의 스텁 인터페이스를 구현하여 비즈니스 로직 계층의 기반을 마련한다.
- **Independent Test**: VolumeBuilder/MeasurementEngine/SecurityGuard 클래스 인스턴스 생성 및 스텁 메서드 호출
- **IEC 62304 추적**: 제5.5절(단위 구현), COMP-2.1, COMP-2.2, COMP-2.3

- [ ] **T018** 🔀 [US2] VolumeBuilder 클래스 스텁 구현
  - 파일: `viewer/src/business/VolumeBuilder.js`
  - 설명: 볼륨 데이터 구성기 스텁. `buildVolume(voxelData, meta)`, `estimateMemory(fileSize)`, `monitorMemoryUsage()`, `getVolume()`, `releaseVolume()` 5개 메서드. getVolume()은 초기 상태에서 null 반환. VolumeData 타입 임포트.
  - 완료 조건: 5개 메서드 존재, getVolume()이 null 반환, `npm run build` 성공
  - 추적: COMP-2.1, FR-1.4, FR-1.6, FR-7.4, SDS-3.3

- [ ] **T019** 🔀 [US2] MeasurementEngine 클래스 스텁 구현
  - 파일: `viewer/src/business/MeasurementEngine.js`
  - 설명: 거리 측정 엔진 스텁. `measureDistance(p1, p2, transform)`, `inverseTransform(p, transform)`, `generateDisclaimer(distanceMM)`, `validateCoordinates(p1, p2)` 4개 메서드. generateDisclaimer은 HAZ-2.1 기본 disclaimer 문구 반환. MeasurementData 타입 임포트.
  - 완료 조건: 4개 메서드 존재, generateDisclaimer이 비어있지 않은 disclaimer 문자열 반환
  - 추적: COMP-2.2, FR-4.1~4.4, HAZ-2.1, SDS-3.7

- [ ] **T020** 🔀 [US2] SecurityGuard 클래스 스텁 구현
  - 파일: `viewer/src/business/SecurityGuard.js`
  - 설명: 보안 감시 모듈 스텁. `applyCSP()`, `blockNetworkRequests()`, `enforceMemoryOnlyStorage()`, `releaseMemory(data)`, `auditDependencies(pkg)` 5개 메서드. 횡단 관심사(cross-cutting)로 모든 계층에서 참조 가능.
  - 완료 조건: 5개 메서드 존재, `npm run build` 성공, 다른 계층에서 import 가능
  - 추적: COMP-2.3, FR-5.1~5.4, HAZ-3.1, HAZ-3.2, SDS-3.8

- [ ] **T021** 🔒 [US2] business/index.js 배럴 파일 업데이트
  - 파일: `viewer/src/business/index.js`
  - 설명: VolumeBuilder, MeasurementEngine, SecurityGuard를 re-export.
  - 완료 조건: 3개 클래스 import 성공
  - 추적: ADR-1

- [ ] **T022** 🔀 [US2] Business Layer 단위 테스트 3종 작성
  - 파일: `viewer/tests/unit/business/VolumeBuilder.test.js`, `viewer/tests/unit/business/MeasurementEngine.test.js`, `viewer/tests/unit/business/SecurityGuard.test.js`
  - 설명: 각 클래스의 스텁 메서드 존재 확인, 반환 타입 검증. VolumeBuilder는 getVolume() null 반환 확인, MeasurementEngine은 generateDisclaimer() 비어있지 않은 문자열 반환 확인, SecurityGuard는 5개 메서드 모두 호출 가능 확인.
  - 완료 조건: 3개 테스트 파일 모두 `vitest run` PASS
  - 추적: COMP-2.1~2.3, 제5.5절

---## Phase 5: User Story 3 — Rendering Layer 스텁 구현 (Priority: P1)

- **Goal**: MPR 렌더러, 볼륨 렌더러, 뷰 변환 엔진의 스텁 인터페이스를 구현하여 렌더링 계층의 기반을 마련한다.
- **Independent Test**: MPRRenderer/VolumeRenderer/ViewTransformEngine 클래스 인스턴스 생성 (Canvas mock 사용)
- **IEC 62304 추적**: 제5.5절(단위 구현), COMP-3.1, COMP-3.2, COMP-3.3

- [ ] **T023** 🔀 [US3] MPRRenderer 클래스 스텁 구현
  - 파일: `viewer/src/rendering/MPRRenderer.js`
  - 설명: MPR 슬라이스 렌더러 스텁. constructor(canvas)에서 WebGL 2.0 컨텍스트 획득(`canvas.getContext('webgl2')`), `renderMPR(volume, plane, sliceIndex)`, `initGL(canvas)`, `destroy()` 메서드. WebGL 2.0 미지원 시 null 반환(정상 저하). private `#gl` 필드로 컨텍스트 관리. SliceData, VolumeData 타입 임포트.
  - 완료 조건: 4개 메서드 존재, WebGL 미지원 환경에서 `initGL()`이 null 반환, `npm run build` 성공
  - 추적: COMP-3.1, FR-2.1~2.4, ADR-4, SDS-3.4

- [ ] **T024** 🔀 [US3] VolumeRenderer 클래스 스텁 구현
  - 파일: `viewer/src/rendering/VolumeRenderer.js`
  - 설명: 3D 볼륨 렌더러 스텁. constructor(canvas)에서 WebGL 2.0 컨텍스트 획득, `renderVolume(volume, options)`, `initGL(canvas)`, `destroy()` 메서드. MPRRenderer와 동일한 WebGL 2.0 컨텍스트 획득 패턴 적용. VolumeData 타입 임포트.
  - 완료 조건: 4개 메서드 존재, `initGL()`이 WebGL2RenderingContext 또는 null 반환
  - 추적: COMP-3.2, FR-2.5, ADR-4, SDS-3.5

- [ ] **T025** 🔀 [US3] ViewTransformEngine 클래스 스텁 구현
  - 파일: `viewer/src/rendering/ViewTransformEngine.js`
  - 설명: 뷰 변환 상태 관리 스텁. `setSliceIndex(idx)`, `applyZoom(delta)`, `applyPan(dx, dy)`, `applyWindowLevel(wl, ww)`, `getTransform()`, `reset()` 6개 메서드. 내부에 ViewTransform 상태를 유지하며, `getTransform()`은 현재 변환 상태를 반환, `reset()`은 초기 상태로 복원. ViewTransform 타입 임포트.
  - 완료 조건: 6개 메서드 존재, `getTransform()`이 기본 ViewTransform 반환, `reset()` 후 초기 상태 복원
  - 추적: COMP-3.3, FR-3.1~3.4, HAZ-1.4, HAZ-1.5, SDS-3.6

- [ ] **T026** 🔒 [US3] rendering/index.js 배럴 파일 업데이트
  - 파일: `viewer/src/rendering/index.js`
  - 설명: MPRRenderer, VolumeRenderer, ViewTransformEngine을 re-export.
  - 완료 조건: 3개 클래스 import 성공
  - 추적: ADR-1

- [ ] **T027** 🔀 [US3] Rendering Layer 단위 테스트 3종 작성
  - 파일: `viewer/tests/unit/rendering/MPRRenderer.test.js`, `viewer/tests/unit/rendering/VolumeRenderer.test.js`, `viewer/tests/unit/rendering/ViewTransformEngine.test.js`
  - 설명: Canvas/WebGL mock 환경에서 각 클래스 인스턴스 생성 테스트. MPRRenderer/VolumeRenderer는 initGL() 동작 검증, ViewTransformEngine은 상태 초기값 및 setSliceIndex 범위 검증 스텁 테스트.
  - 완료 조건: 3개 테스트 파일 모두 `vitest run` PASS
  - 추적: COMP-3.1~3.3, 제5.5절

---

## Phase 6: User Story 4 — Presentation Layer 스텁 구현 (Priority: P1)

- **Goal**: UI 컨트롤러와 뷰포트 관리자의 스텁 인터페이스를 구현하여 프레젠테이션 계층의 기반을 마련한다.
- **Independent Test**: UIController/ViewportManager 클래스 인스턴스 생성 (DOM mock 사용)
- **IEC 62304 추적**: 제5.5절(단위 구현), COMP-4.1, COMP-4.2

- [ ] **T028** 🔀 [US4] UIController 클래스 스텁 구현
  - 파일: `viewer/src/presentation/UIController.js`
  - 설명: UI 컨트롤러 스텁. `constructor(container)`, `init()`, `checkBrowserSupport()`, `bindEvents()`, `handleFileSelect(event)`, `showDiagnosticWarning()`, `showError(message)`, `destroy()` 8개 메서드. checkBrowserSupport()는 BrowserSupportResult 객체 반환(WebGL2 지원 여부). showDiagnosticWarning()은 TODO 주석으로 필수 요구사항(세션마다 표시, 수동 닫기 가능, '본 소프트웨어는 진단 목적이 아닙니다' 문구) 명시.
  - 완료 조건: 8개 메서드 존재, `checkBrowserSupport()`가 {webgl2: boolean, supported: boolean} 구조 반환
  - 추적: COMP-4.1, FR-6.1, FR-6.2, HAZ-4.1, HAZ-4.2, SDS-3.9

- [ ] **T029** 🔀 [US4] ViewportManager 클래스 스텁 구현
  - 파일: `viewer/src/presentation/ViewportManager.js`
  - 설명: 뷰포트 관리자 스텁. `constructor(container)`, `layoutViewports()`, `getActiveViewport()`, `setLayout(type)`, `updateViewport(id, imageData)`, `destroy()` 6개 메서드. layoutViewports()는 3 MPR + 1 3D 뷰포트 DOM 구성 뼈대. getActiveViewport()는 초기 상태에서 null 반환.
  - 완료 조건: 6개 메서드 존재, `getActiveViewport()`가 null 반환
  - 추적: COMP-4.2, FR-2.6, SDS-3.10

- [ ] **T030** 🔀 [US4] 기본 CSS 스타일시트 작성
  - 파일: `viewer/src/styles/main.css`
  - 설명: 기본 뷰포트 레이아웃(2x2 그리드: `.viewer-container`), 진단 불가 경고 배너 스타일(`.diagnostic-warning`: 빨간색 배경, 최상단 고정), 오류 메시지 영역 스타일, Canvas 뷰포트 기본 스타일 포함.
  - 완료 조건: 3개 이상 주요 스타일 클래스 정의, 진단 불가 경고 배너 스타일 포함(FR-6.1)
  - 추적: FR-6.1, HAZ-4.1

- [ ] **T031** 🔒 [US4] presentation/index.js 배럴 파일 업데이트
  - 파일: `viewer/src/presentation/index.js`
  - 설명: UIController, ViewportManager를 re-export.
  - 완료 조건: 2개 클래스 import 성공
  - 추적: ADR-1

- [ ] **T032** 🔀 [US4] Presentation Layer 단위 테스트 2종 작성
  - 파일: `viewer/tests/unit/presentation/UIController.test.js`, `viewer/tests/unit/presentation/ViewportManager.test.js`
  - 설명: DOM mock 환경에서 각 클래스 인스턴스 생성 테스트. UIController는 checkBrowserSupport() 반환값 검증, ViewportManager는 getActiveViewport() null 반환 및 초기화 상태 검증.
  - 완료 조건: 2개 테스트 파일 모두 `vitest run` PASS
  - 추적: COMP-4.1~4.2, 제5.5절

---## Phase 7: Integration — 진입점, HTML 템플릿 및 빌드 검증

- **Goal**: 모든 계층 모듈을 연결하는 애플리케이션 진입점과 HTML 템플릿을 작성하고, 테스트 인프라를 구축하여 최종 빌드를 검증한다.
- **Independent Test**: `npm run build` 성공, `npm test` 11개 테스트 PASS, `npm run lint` 0 errors
- **IEC 62304 추적**: 제5.6절(통합 테스트), 제5.3절(아키텍처 검증)

- [ ] **T033** 🔒 index.html 작성 (CSP + 진단 경고 포함)
  - 파일: `viewer/index.html`
  - 설명: 애플리케이션 진입점 HTML. CSP meta 태그 포함(default-src 'self', script-src 'self', style-src 'self' 'unsafe-inline', img-src 'self' data:, **connect-src 'none'**), 진단 불가 경고 배너 마크업(#diagnostic-warning), 파일 선택 input(#dicom-file-input, accept=.dcm), 4개 Canvas 뷰포트(#viewport-axial, #viewport-coronal, #viewport-sagittal, #viewport-3d), 오류 메시지 영역(#error-area). 외부 스크립트/스타일 참조 절대 금지.
  - 완료 조건: CSP meta 태그에 connect-src 'none' 포함, 외부 리소스 참조 없음, 진단 불가 경고 배너 마크업 존재, 4개 canvas 요소 존재
  - 추적: FR-5.1, FR-6.1, FR-7.1, HAZ-3.1, HAZ-4.1, HAZ-5.3, ADR-5

- [ ] **T034** 🔒 main.js 애플리케이션 부트스트랩 작성
  - 파일: `viewer/src/main.js`
  - 설명: 애플리케이션 부트스트랩 로직. SecurityGuard 초기화(blockNetworkRequests, enforceMemoryOnlyStorage) -> UIController 초기화(init) -> 진단 경고 표시(showDiagnosticWarning) 흐름. DOMContentLoaded 이벤트에서 실행. 4계층 모듈 import로 계층 간 연결 검증.
  - 완료 조건: `npm run build` 성공, main.js에서 4계층 모듈 import 성공
  - 추적: ADR-1, 전체 계층 연결

- [ ] **T035** 🔒 테스트 인프라 설정 (Vitest setup + 통합 테스트)
  - 파일: `viewer/tests/setup.js`, `viewer/tests/integration/app.test.js`
  - 설명: (1) tests/setup.js: 글로벌 테스트 설정, Canvas/WebGL mock, DOM mock 환경 구성. (2) app.test.js: 10개 모듈 import 가능 여부 검증, 4계층 구조 분리 확인(DICOMParser, DataValidator, VolumeBuilder, MeasurementEngine, SecurityGuard, MPRRenderer, VolumeRenderer, ViewTransformEngine, UIController, ViewportManager가 모두 defined인지 확인).
  - 완료 조건: 통합 테스트에서 10개 모듈 export 검증 PASS
  - 추적: ADR-1, DP-02, 제5.6절

- [ ] **T036** 🔒 최종 빌드 검증 및 보안 정적 분석
  - 파일: `viewer/package.json` (scripts 업데이트)
  - 설명: (1) 전체 단위 테스트 10개 + 통합 테스트 1개 실행 (`npm test`). (2) ESLint 보안 규칙 검증 (`npm run lint`): fetch/XMLHttpRequest/WebSocket 사용 여부 정적 분석. (3) `npm run build` 성공 후 dist/ 산출물 검증: dist/index.html 존재, dist/assets/*.js 존재, 외부 CDN URL 미포함, CSP meta 태그 connect-src 'none' 유지. (4) 빌드 산출물 크기 확인 (초기 스텁 기준 100KB 미만 예상).
  - 완료 조건: `npm test` 11개 테스트 PASS, `npm run lint` 0 errors, `npm run build` 성공, dist/에 외부 리소스 참조 없음
  - 추적: ADR-5, FR-7.1, NFR-2.2, HAZ-3.1, HAZ-5.3, 제5.6절

---

## Dependencies & Execution Order

```
T001 → T002 → T003 → T004 → T005 → T006
                                        ↓
                               T007 → T008 → T009 → T010 → T011 → T012
                                                                      ↓
                         T013 (🔀)  T018 (🔀)  T023 (🔀)  T028 (🔀)
                         T014 (🔀)  T019 (🔀)  T024 (🔀)  T029 (🔀)
                         T015 (🔒)  T021 (🔒)  T026 (🔒)  T031 (🔒)
                         T016 (🔀)  T022 (🔀)  T027 (🔀)  T030 (🔀)
                         T017 (🔀)              T032 (🔀)
                                        ↓
                    T033 (🔒) → T034 (🔒) → T035 (🔒) → T036 (🔒)
```

### 병렬 실행 가능 그룹

| 그룹 | 병렬 가능 태스크 | 조건
|------|------------------|------|
| A | T013, T014 (Data Layer) | Phase 2(T012) 완료 후
| B | T018, T019, T020 (Business Layer) | Phase 2(T012) 완료 후
| C | T023, T024, T025 (Rendering Layer) | Phase 2(T012) 완료 후
| D | T028, T029 (Presentation Layer) | Phase 2(T012) 완료 후
| E | T016, T017, T022, T027, T032 (테스트) | 해당 계층 스텁 완료 후
| F | T033~T036 (통합) | Phase 3~6 전체 완료 후

> **참고**: Phase 3~6은 서로 독립적으로 병렬 진행 가능. 단 배럴 파일 업데이트(T015, T021, T026, T031)는 해당 계층 스텁 완료 후 순차 실행.

---

## Estimated Effort

| Phase        | 태스크 수 | 예상 소요 시간 |
| ------------ | --------- | -------------- |
| Phase 1: Setup | 6 | 4시간 |
| Phase 2: Foundational | 6 | 4시간 |
| Phase 3: Data Layer | 5 | 3시간 |
| Phase 4: Business Layer | 5 | 3시간 |
| Phase 5: Rendering Layer | 5 | 3시간 |
| Phase 6: Presentation Layer | 5 | 3시간 |
| Phase 7: Integration | 4 | 3시간 |
| **합계**     | **36**    | **23시간 (약 3일)** |

---

## 추적성 매트릭스

### SRS FR/NFR → 태스크 매핑

| 요구사항 | 관련 태스크 | 비고 |
|----------|-------------|------|
| FR-1.1 (DICOM 로드) | T013, T016 | DICOMParser.parseDICOM 스텁 |
| FR-1.2 (데이터 검증) | T010, T014, T017 | DataValidator + ValidationResult |
| FR-1.3 (메타데이터 표시) | T007, T013 | DICOMMetadata + parseMetadata |
| FR-1.4 (3D 볼륨 구성) | T008, T018 | VolumeData + VolumeBuilder |
| FR-1.5 (오류 처리) | T013, T028 | handleParseError + showError |
| FR-1.6 (메모리 추정) | T018 | VolumeBuilder.estimateMemory |
| FR-2.1~2.3 (MPR) | T009, T023 | SliceData + MPRRenderer |
| FR-2.5 (3D 볼륨 렌더링) | T024 | VolumeRenderer |
| FR-2.6 (멀티 뷰포트) | T029, T030 | ViewportManager + CSS |
| FR-3.1~3.4 (뷰 변환) | T011, T025 | ViewTransform + ViewTransformEngine |
| FR-4.1~4.4 (측정) | T010, T019 | MeasurementData + MeasurementEngine |
| FR-5.1 (외부 통신 차단) | T004, T020, T033 | ESLint + SecurityGuard + CSP |
| FR-5.2 (무상태 처리) | T020 | SecurityGuard.enforceMemoryOnlyStorage |
| FR-5.3 (메모리 해제) | T018, T020 | releaseVolume + releaseMemory |
| FR-5.4 (외부 의존성 최소화) | T002 | runtime deps 없음 |
| FR-6.1 (진단 불가 경고) | T028, T030, T033 | UIController + CSS + HTML |
| FR-6.2 (브라우저 호환성) | T023, T024, T028 | WebGL2 감지 + checkBrowserSupport |
| FR-7.1 (정적 빌드) | T003, T033, T036 | Vite + HTML + 빌드 검증 |
| FR-7.4 (메모리 모니터링) | T018 | VolumeBuilder.monitorMemoryUsage |
| NFR-2.1 (보안) | T004, T020, T033 | ESLint + CSP + SecurityGuard |
| NFR-2.2 (정적 분석) | T004, T036 | ESLint 설정 + 린트 검증 |
| NFR-3.1 (방어적 프로그래밍) | T013, T028 | handleParseError + showError |

### SAD Component → 태스크 매핑

| 컴포넌트 | 모듈 파일 | 태스크 | 테스트 태스크 |
|----------|-----------|--------|-------------|
| COMP-1.1 DICOMParser | src/data/DICOMParser.js | T013 | T016 |
| COMP-1.2 DataValidator | src/data/DataValidator.js | T014 | T017 |
| COMP-2.1 VolumeBuilder | src/business/VolumeBuilder.js | T018 | T022 |
| COMP-2.2 MeasurementEngine | src/business/MeasurementEngine.js | T019 | T022 |
| COMP-2.3 SecurityGuard | src/business/SecurityGuard.js | T020 | T022 |
| COMP-3.1 MPRRenderer | src/rendering/MPRRenderer.js | T023 | T027 |
| COMP-3.2 VolumeRenderer | src/rendering/VolumeRenderer.js | T024 | T027 |
| COMP-3.3 ViewTransformEngine | src/rendering/ViewTransformEngine.js | T025 | T027 |
| COMP-4.1 UIController | src/presentation/UIController.js | T028 | T032 |
| COMP-4.2 ViewportManager | src/presentation/ViewportManager.js | T029 | T032 |

### RMR Hazard → 태스크 매핑

| Hazard | 완화 태스크 | 비고 |
|--------|-------------|------|
| HAZ-1.4 (윈도우 레벨 오류) | T025 | ViewTransformEngine.applyWindowLevel |
| HAZ-1.5 (슬라이스 인덱스 오류) | T025 | ViewTransformEngine.setSliceIndex |
| HAZ-2.1 (측정 정확도) | T010, T019 | disclaimer + generateDisclaimer |
| HAZ-3.1 (네트워크 노출) | T004, T020, T033 | ESLint + SecurityGuard + CSP |
| HAZ-3.2 (데이터 유출) | T018, T020 | releaseVolume + releaseMemory |
| HAZ-4.1 (오용 방지 경고) | T028, T030, T033 | UIController + CSS + HTML |
| HAZ-4.2 (브라우저 호환성) | T023, T024, T028 | WebGL2 감지 |
| HAZ-5.1 (메모리 부족) | T018 | VolumeBuilder.estimateMemory |
| HAZ-5.3 (외부 리소스 로드) | T003, T033, T036 | Vite 단일 번들 + CSP + 검증 |

---

*문서 끝*
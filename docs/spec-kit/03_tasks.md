# Tasks: Simple CBCT Viewer - ADR-1 Layered Architecture 기초 공사

**Input**: `docs/spec-kit/01_spec.md`, `docs/spec-kit/02_plan.md`
**Ticket**: PLAYG-1370 | **Date**: 2026-04-14

> **형식 안내**
> - `[ID]` : 태스크 번호 (T001, T002, ...)
> - `[P]` : 병렬 실행 가능 여부 표시 (🔀 병렬 가능 / 🔒 순서 필수)
> - `[Story]` : 관련 사용자 스토리 (US-001, US-002, ...)
> - 각 태스크는 **2시간 이내** 완료 가능한 단위로 분할
> - IEC 62304 Class A 추적성 유지 (FR/NFR/HAZ 매핑)

---

## Phase 1: Setup (공통 인프라)
<!-- 프로젝트 초기 설정: viewer/ 디렉토리 생성, Vite 빌드, ESLint 보안 규칙, Prettier 포맷팅, 계층별 디렉토리 구조 확립 -->

- [ ] **T001** 🔒 프로젝트 디렉토리 구조 생성
  - 파일: `viewer/`, `viewer/src/`, `viewer/src/types/`, `viewer/src/data/`, `viewer/src/business/`, `viewer/src/rendering/`, `viewer/src/presentation/`, `viewer/src/styles/`, `viewer/src/errors/`, `viewer/public/`, `viewer/tests/unit/data/`, `viewer/tests/unit/business/`, `viewer/tests/unit/rendering/`, `viewer/tests/unit/presentation/`, `viewer/tests/integration/`
  - 설명: SAD(PLAYG-1311)에 정의된 4계층 아키텍처에 맞는 디렉토리 구조를 생성한다. Data/Business/Rendering/Presentation 계층별 디렉토리와 공유 types/, errors/ 디렉토리, 테스트 디렉토리를 포함한다. 각 빈 디렉토리에 `.gitkeep` 파일을 생성하여 Git 추적을 보장한다.
  - 완료 조건: 15개 디렉토리가 모두 존재하고 `.gitkeep` 파일로 빈 디렉토리가 보존됨
  - 추적: ADR-1, SAD-01, US-001

- [ ] **T002** 🔒 package.json 작성 및 npm 초기화
  - 파일: `viewer/package.json`
  - 설명: 프로젝트 메타데이터(name: simple-cbct-viewer, version: 0.1.0, type: module), 스크립트(dev/build/preview/test/test:watch/test:coverage/lint/format), devDependencies(vite ^5.x, vitest ^3.x, eslint ^9.x, prettier ^3.x)를 정의한다. **runtime dependencies는 외부 의존성 최소화 전략(SAD-06 6.2)에 따라 0개로 유지**한다.
  - 완료 조건: `npm install` 성공, devDependencies만 설치됨, `npm run` 스크립트 8개 확인, dependencies 섹션에 항목 없음
  - 추적: SAD-06, FR-5.4, DP-02, US-002

- [ ] **T003** 🔒 Vite 빌드 + Vitest 테스트 통합 설정 작성
  - 파일: `viewer/vite.config.js`
  - 설명: 정적 단일 번들 빌드 설정을 구성한다. (1) **빌드 설정**: base 경로 상대 설정(`./`), build.outDir `dist/`, rollupOptions에서 input `src/main.js`, 단일 청크 강제. (2) **Vitest 통합 설정**: test.globals true, test.environment `jsdom`, test.setupFiles `["./tests/setup.js"]`, test.coverage provider `v8`. 빌드 산출물에 외부 리소스 참조(CDN)가 없도록 설정.
  - 완료 조건: `npm run build` 실행 시 `dist/` 디렉토리 생성 (빈 스텁 상태에서도 에러 없이), Vitest 설정이 `npm run test`로 로드됨
  - 추적: ADR-5, FR-7.1, HAZ-5.3, DP-02, US-002, US-003

- [ ] **T004** 🔒 ESLint 9.x Flat Config 작성 (보안 + 계층 규칙)
  - 파일: `viewer/eslint.config.js`
  - 설명: ES2020+ 환경, 브라우저 전역 변수 허용 설정. **네트워크 API 감지 규칙** 추가: fetch/XMLHttpRequest/WebSocket/navigator.sendBeacon 사용 시 error 발생(NFR-2.2, FR-5.1). **계층 간 import 방향 검증 규칙**(no-restricted-imports): Data 계층은 Business/Rendering/Presentation import 금지, Business 계층은 Rendering/Presentation import 금지, Rendering 계층은 Presentation import 금지. 예외: types/, errors/, SecurityGuard는 모든 계층에서 참조 가능.
  - 완료 조건: `npm run lint` 실행 가능 (0 errors, warnings 허용), 네트워크 API 사용 시 에러 발생 확인
  - 추적: NFR-2.2, HAZ-3.1, FR-5.1, ADR-1, US-004

- [ ] **T005** 🔒 Prettier 및 .gitignore 설정
  - 파일: `viewer/.prettierrc`, `viewer/.gitignore`
  - 설명: Prettier는 싱글 따옴표, 세미콜론 필수, 2칸 들여쓰기, 80자 줄바꿈 설정. .gitignore에는 node_modules/, dist/, .vite/, coverage/, *.log 등을 포함.
  - 완료 조건: `npm run format` 실행 가능, .gitignore에 필수 항목 5개 이상 포함
  - 추적: DP-02, CMP-02, US-004

- [ ] **T006** 🔒 계층별 빈 index.js 배럴 파일 + errors/index.js 생성
  - 파일: `viewer/src/types/index.js`, `viewer/src/data/index.js`, `viewer/src/business/index.js`, `viewer/src/rendering/index.js`, `viewer/src/presentation/index.js`, `viewer/src/errors/index.js`
  - 설명: 6개 계층/영역의 진입점 역할을 할 빈 export 파일을 생성한다. 향후 각 Phase에서 모듈 export를 추가할 뼈대를 제공한다. IEC 62304 제5.4.3에 따른 공개 API 문서화 기반을 확보한다.
  - 완료 조건: 6개 index.js 파일 존재, `npm run build` 시 에러 없음
  - 추적: ADR-1, IEC 62304 제5.4.3, US-001

---## Phase 2: Foundational (타입/인터페이스 정의 + 에러 클래스 계층)
<!-- CRITICAL: 모든 계층 모듈 구현 전 반드시 완료해야 할 공유 타입 인프라 -->

- [ ] **T007** 🔒 DICOM 메타데이터 타입 정의 (Factory 함수 + JSDoc)
  - 파일: `viewer/src/types/DICOMMetadata.js`
  - 설명: DICOM 메타데이터 구조를 Factory 함수 + JSDoc 패턴으로 정의. patientName, patientID, studyDate, modality, pixelSpacing([number, number]), sliceThickness(number), imageOrientationPatient(number[6]), rows, columns, numberOfFrames, bitsAllocated, transferSyntax, windowCenter, windowWidth 속성 포함. `createDICOMMetadata(overrides)` 함수를 export하여 기본값과 함께 객체 생성. IEC 62304 제5.4.3 준수하여 모든 속성에 JSDoc 타입과 설명 포함.
  - 완료 조건: Factory 함수 호출 시 유효한 기본 객체 생성, JSDoc 타입 어노테이션 14개 속성 모두 포함, `npm run build` 성공
  - 추적: SAD-05, FR-1.3, SDS-3.1, US-005

- [ ] **T008** 🔒 볼륨 데이터 타입 정의 (Factory 함수 + JSDoc)
  - 파일: `viewer/src/types/VolumeData.js`
  - 설명: 3차원 볼륨 데이터 구조 정의. voxelArray(Float32Array 기본), dimensions([x,y,z]), spacing([x,y,z]), origin([x,y,z]), dataType(string), minMaxValue([min,max]) 속성을 포함하는 `createVolumeData(overrides)` Factory 함수. Float32Array 기본값은 빈 배열로 초기화.
  - 완료 조건: Factory 함수 호출 시 Float32Array 기본값 포함 객체 생성, JSDoc 포함, 순환 참조 없음
  - 추적: SAD-05, FR-1.4, SDS-3.3, US-005

- [ ] **T009** 🔒 슬라이스 데이터 타입 정의 (Factory 함수 + JSDoc)
  - 파일: `viewer/src/types/SliceData.js`
  - 설명: MPR 슬라이스 데이터 구조 정의. imageData(ImageData 호환 구조), plane(`Axial|Coronal|Sagittal`, 기본값 `Axial`), sliceIndex(number, 기본값 0), windowLevel(number), windowWidth(number) 속성. `createSliceData(overrides)` Factory 함수. jsdom 환경에서 ImageData 미지원을 고려하여 fallback 구조 제공.
  - 완료 조건: Factory 함수 호출 시 유효한 기본 객체 생성, plane 기본값 `Axial` 확인
  - 추적: SAD-05, FR-2.1~2.3, SDS-3.4, US-005

- [ ] **T010** 🔒 측정 데이터 타입 정의 (HAZ-2.1 disclaimer 포함)
  - 파일: `viewer/src/types/MeasurementData.js`
  - 설명: 거리 측정 결과 타입 정의. startPoint([x,y,z]), endPoint([x,y,z]), distanceMM(number), pixelSpacingValid(boolean), disclaimerText(string) 속성. `createMeasurementData(overrides)` Factory 함수. **HAZ-2.1(측정 정확도) 완화**: disclaimerText 기본값에 진단 불가 문구(`본 측정은 참고용이며 진단 목적으로 사용할 수 없습니다.`) 포함.
  - 완료 조건: Factory 함수 호출 시 disclaimerText에 진단 불가 기본 문구 포함, pixelSpacingValid 기본값 false
  - 추적: SAD-05, FR-4.1, HAZ-2.1, SDS-3.7, US-005

- [ ] **T011** 🔒 뷰 변환 + 검증 결과 + 파싱 결과 타입 정의
  - 파일: `viewer/src/types/ViewTransform.js`, `viewer/src/types/ValidationResult.js`, `viewer/src/types/ParseResult.js`
  - 설명: (1) ViewTransform: zoom(기본값 1.0), panX, panY, windowLevel, windowWidth, sliceIndex(기본값 0) 속성. (2) ValidationResult: isValid(boolean), warnings(string[]), errors(string[]) 속성. (3) ParseResult: metadata(DICOMMetadata|null), voxelData(ArrayBuffer|null), errors(ErrorMessage[]), isValid(boolean, 기본값 false) 속성. 각각 Factory 함수로 정의.
  - 완료 조건: 3개 Factory 함수 각각 유효한 기본 객체 생성, ParseResult.isValid 기본값 false, ValidationResult 기본값 {isValid: true, warnings: [], errors: []}
  - 추적: SAD-05, FR-3.1~3.4, FR-1.1, FR-1.2, SDS-3.2, US-005

- [ ] **T012** 🔒 types/index.js 배럴 파일 완성
  - 파일: `viewer/src/types/index.js`
  - 설명: 7개 타입 모듈(DICOMMetadata, VolumeData, SliceData, MeasurementData, ValidationResult, ViewTransform, ParseResult)의 Factory 함수를 모두 re-export. 순환 참조 방지를 위해 types 모듈 간 상호 import를 최소화한다.
  - 완료 조건: `import { createDICOMMetadata, createVolumeData, createSliceData, createMeasurementData, createValidationResult, createViewTransform, createParseResult } from "./types/index.js"` 성공, 순환 참조 없음
  - 추적: ADR-1, US-005

- [ ] **T013** 🔒 CBVError 커스텀 에러 클래스 계층 정의
  - 파일: `viewer/src/errors/CBVError.js`
  - 설명: SDS-6.1 오류 분류에 따른 에러 클래스 계층을 구현한다. (1) **CBVError**(extends Error): 기본 클래스. message, code(string), context(Object) 속성 포함. (2) **ParseError**(extends CBVError): DICOM 파싱 오류 (FR-1.5, HAZ-1.1). (3) **ValidationError**(extends CBVError): 데이터 검증 오류 (FR-1.2, FR-4.2). (4) **RenderError**(extends CBVError): 렌더링 오류 (FR-2.5, HAZ-1.3). (5) **SecurityError**(extends CBVError): 보안 정책 위반 (FR-5.1, HAZ-3.1). (6) **MemoryError**(extends CBVError): 메모리 초과 (FR-1.6, HAZ-5.1). 각 하위 클래스는 기본 code값을 제공한다.
  - 완료 조건: CBVError + 5개 하위 클래스 모두 정의, instanceof 체인 동작(CBVError > ParseError), 에러 code 속성 존재
  - 추적: SDS-6.1, FR-1.5, FR-5.1, HAZ-1.1, HAZ-1.3, HAZ-3.1, HAZ-5.1, US-005

- [ ] **T014** 🔒 errors/index.js 배럴 파일 완성
  - 파일: `viewer/src/errors/index.js`
  - 설명: CBVError 및 5개 하위 에러 클래스(ParseError, ValidationError, RenderError, SecurityError, MemoryError)를 re-export.
  - 완료 조건: `import { CBVError, ParseError, ValidationError, RenderError, SecurityError, MemoryError } from "./errors/index.js"` 성공
  - 추적: ADR-1, SDS-6.1, US-005

---
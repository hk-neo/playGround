
---

## Constitution Check
*GATE: 설계 원칙(Constitution) 준수 여부 확인*

### IEC 62304 Class A 준수 검증

| 항목 | 요구사항 | 본 계획 반영 여부 | 비고 |
|------|----------|------------------|------|
| 제5.1절 소프트웨어 개발 계획 | 개발 방법론, 활동 정의 | 반영 | Phase 1~8 체계적 진행 |
| 제5.2절 소프트웨어 요구사항 분석 | SRS 기반 구현 | 반영 | SRS FR/NFR 전수 추적 (01_spec.md 매핑) |
| 제5.3절 소프트웨어 아키텍처 설계 | 계층형 아키텍처 구현 | 반영 | ADR-1 4계층 10모듈 |
| 제5.4절 소프트웨어 상세 설계 | SDS 기반 모듈 구현 | 반영 | 각 Phase별 인터페이스 정의 |
| 제5.5절 소프트웨어 단위 구현 | 코드 구현 및 단위 테스트 | 반영 | Phase 3~6 스텁 + Phase 8 테스트 |
| 제5.6절 소프트웨어 통합 테스트 | 통합 검증 | 반영 | Phase 8 빌드/통합 검증 |
| 제5.7절 소프트웨어 검증 테스트 | 시스템 수준 검증 | 후속 | 본 Plan 이후 별도 수행 |
| 제7절 위험 관리 | HAZ 완화 조치 구현 | 반영 | 각 모듈별 HAZ 매핑 |
| 제8절 형상 관리 | CI/CD, 버전 관리 | 반영 | Phase 1 Git 설정, package-lock.json |
| 제9절 문제 해결 | 결함 추적 | 후속 | GitHub Issues 활용 예정 |

### ADR-1 준수 검증

| 검증 항목 | 기대 결과 | 검증 방법 |
|-----------|-----------|-----------|
| 4계층 분리 | Data/Business/Rendering/Presentation 디렉토리 존재 | 디렉토리 구조 확인 |
| 10개 모듈 스텁 | 각 모듈별 .js 파일 존재 및 export | 빌드 + import 테스트 |
| 계층 간 의존성 규칙 | 하위 계층만 참조, 상위 역참조 금지 | ESLint no-restricted-imports 규칙 |
| 공개 인터페이스 | 각 모듈 index.js 통해 공개 API export | 빌드 성공 여부 |
| 외부 의존성 최소화 | 프로덕션 의존성 0개 | package.json 점검 |

### SOLID 원칙 준수

- **S (단일 책임)**: 각 모듈은 단일 책임. DICOMParser=파싱, MPRRenderer=렌더링, SecurityGuard=보안
- **O (개방-폐쇄)**: Factory 함수 패턴으로 타입 확장 가능, 인터페이스 변경 없이 구현 교체 가능
- **L (리스코프 치환)**: 에러 클래스 계층에서 하위 타입은 상위 타입 대체 가능 (CBVError 계약 준수)
- **I (인터페이스 분리)**: 각 계층 index.js에서 필요한 모듈만 export
- **D (의존성 역전)**: 상위 계층은 하위 계층의 구현이 아닌 인터페이스에 의존. SecurityGuard는 추상 보안 인터페이스 제공

### 레이어 분리

```
허용 방향: Presentation → Rendering → Business → Data (단방향)
금지 방향: Data → Business/Rendering/Presentation (역방향 참조 금지)
예외: SecurityGuard(Business)는 Cross-Cutting Concern으로 모든 계층 참조 가능
공유: types/ 디렉토리는 모든 계층에서 참조 가능 (순환 참조 없는 공통 타입)
검증: ESLint no-restricted-imports 규칙으로 빌드 시점에 자동 검증
```

### 에러 처리 전략

SDS-6.1 오류 분류에 따른 계층적 에러 처리 체계를 적용한다:

```
CBVError (extends Error)
├── code: string          # 기계적 에러 코드 (예: 'PARSE_001')
├── context: Object       # 추가 컨텍스트 (파일명, 메타데이터 등)
├── ParseError            # DICOM 파싱 오류 (FR-1.5, HAZ-1.1)
├── ValidationError       # 데이터 검증 오류 (FR-1.2, FR-4.2)
├── RenderError           # 렌더링 오류 (FR-2.5, HAZ-1.3)
├── SecurityError         # 보안 정책 위반 (FR-5.1, HAZ-3.1)
└── MemoryError           # 메모리 초과 (FR-1.6, HAZ-5.1)
```

### 보안 고려사항

- **CSP 정책**: index.html에 meta 태그로 Content-Security-Policy 적용. connect-src 'none'으로 모든 네트워크 차단
- **정적 분석 보안**: ESLint 커스텀 규칙으로 fetch/XMLHttpRequest/WebSocket 사용 감지 (NFR-2.2)
- **의존성 최소화**: 프로덕션 외부 의존성 0개로 공격 표면 최소화 (ADR-2)
- **데이터 불변성**: Factory 함수로 생성한 타입 객체에 Object.freeze 적용 검토 (FR-5.2)
- **메모리 데이터 해제**: 세션 종료 시 ArrayBuffer 명시적 해제 (FR-5.3, HAZ-3.2)
---

## Project Structure

### Documentation
```text
docs/
├── spec-kit/
│   ├── 01_spec.md          # 실행 명규서 (9FR + 3NFR, 6US + 12TS)
│   ├── 02_plan.md          # 본 파일: 기술 이행 계획서
│   └── 03_tasks.md         # 태스크 분해 (T001~T036)
├── artifacts/
│   ├── SAD.md              # 소프트웨어 아키텍처 명세서 (PLAYG-1311)
│   ├── SDS.md              # 소프트웨어 상세 설계 명세서 (PLAYG-1312)
│   ├── SRS.md              # 소프트웨어 요구사항 명세서 (PLAYG-1310)
│   ├── RMR.md              # 위험 관리 보고서 (PLAYG-1309)
│   ├── Development_Plan.md # 개발 계획서 (PLAYG-1231)
│   ├── Classification.md   # Class A 안전 등급 분류 (PLAYG-1290)
│   ├── Security_Maintenance_Plan.md  # 보안 유지보수 계획
│   └── Configuration_Management_Plan.md # 형상 관리 계획
└── progress/
    └── session_context.md  # 세션 작업 컨텍스트
```

### Source Code
```text
viewer/
├── index.html                    # 진입점 HTML (CSP 메타 태그, 진단 경고 배너)
├── package.json                  # npm 패키지 설정 (runtime deps = 0)
├── package-lock.json             # 의존성 고정 (IEC 62304 제8.1.4)
├── vite.config.js                # Vite 빌드 + Vitest 테스트 통합 설정
├── eslint.config.js              # ESLint 9.x Flat Config (보안 규칙 포함)
├── .prettierrc                   # Prettier 코드 포맷팅 설정
├── .gitignore                    # Git 무시 규칙
├── src/
│   ├── main.js                   # 애플리케이션 진입점 (부트스트랩)
│   ├── types/                    # 공통 데이터 모델 타입 (모든 계층 공유)
│   │   ├── index.js              # 타입 re-export 배럴 파일
│   │   ├── DICOMMetadata.js      # DICOM 메타데이터 타입 정의
│   │   ├── VolumeData.js         # 3차원 볼륨 데이터 타입 정의
│   │   ├── SliceData.js          # MPR 슬라이스 데이터 타입 정의
│   │   ├── MeasurementData.js    # 거리 측정 결과 타입 정의
│   │   ├── ViewTransform.js      # 뷰 변환 상태 타입 정의
│   │   ├── ValidationResult.js   # 검증 결과 타입 정의
│   │   └── ParseResult.js        # 파싱 결과 타입 정의
│   ├── errors/                   # 커스텀 에러 클래스 계층
│   │   ├── index.js              # 에러 re-export 배럴 파일
│   │   └── CBVError.js           # CBVError + 5개 하위 클래스
│   ├── data/                     # Data Layer
│   │   ├── index.js              # 계층 공개 인터페이스
│   │   ├── DICOMParser.js        # COMP-1.1: DICOM 파일 파서 (SDS-3.1)
│   │   └── DataValidator.js      # COMP-1.2: 데이터 검증기 (SDS-3.2)
│   ├── business/                 # Business Layer
│   │   ├── index.js              # 계층 공개 인터페이스
│   │   ├── VolumeBuilder.js      # COMP-2.1: 볼륨 구성기 (SDS-3.3)
│   │   ├── MeasurementEngine.js  # COMP-2.2: 거리 측정 엔진 (SDS-3.7)
│   │   └── SecurityGuard.js      # COMP-2.3: 보안 감시 모듈 (SDS-3.8)
│   ├── rendering/                # Rendering Layer
│   │   ├── index.js              # 계층 공개 인터페이스
│   │   ├── MPRRenderer.js        # COMP-3.1: MPR 렌더러 (SDS-3.4)
│   │   ├── VolumeRenderer.js     # COMP-3.2: 3D 볼륨 렌더러 (SDS-3.5)
│   │   └── ViewTransformEngine.js # COMP-3.3: 뷰 변환 엔진 (SDS-3.6)
│   ├── presentation/             # Presentation Layer
│   │   ├── index.js              # 계층 공개 인터페이스
│   │   ├── UIController.js       # COMP-4.1: UI 컨트롤러 (SDS-3.9)
│   │   └── ViewportManager.js    # COMP-4.2: 뷰포트 관리자 (SDS-3.10)
│   └── styles/
│       └── main.css              # 기본 스타일시트 (진단 경고 배너 포함)
├── tests/
│   ├── setup.js                  # Vitest 글로벌 설정 (Canvas/WebGL mock)
│   ├── unit/
│   │   ├── types.test.js         # 타입 Factory 함수 테스트
│   │   ├── errors.test.js        # 에러 클래스 계층 테스트
│   │   ├── data/
│   │   │   ├── DICOMParser.test.js
│   │   │   └── DataValidator.test.js
│   │   ├── business/
│   │   │   ├── VolumeBuilder.test.js
│   │   │   ├── MeasurementEngine.test.js
│   │   │   └── SecurityGuard.test.js
│   │   ├── rendering/
│   │   │   ├── MPRRenderer.test.js
│   │   │   ├── VolumeRenderer.test.js
│   │   │   └── ViewTransformEngine.test.js
│   │   └── presentation/
│   │       ├── UIController.test.js
│   │       └── ViewportManager.test.js
│   └── integration/
│       └── app.test.js           # 전체 모듈 통합 검증
└── public/
    └── favicon.ico               # 기본 파비콘
```

### 계층 간 의존성 규칙 (프로젝트 구조 내 검증)

```
Presentation Layer (src/presentation/)
    ↓ import 허용
Rendering Layer (src/rendering/)
    ↓ import 허용
Business Layer (src/business/)
    ↓ import 허용
Data Layer (src/data/)

공유 계층 (모든 계층에서 참조 가능):
  - src/types/       (순수 데이터 타입 정의, 로직 없음)
  - src/errors/      (에러 클래스 계층)
  - SecurityGuard    (Cross-Cutting Concern, src/business/에 위치)

검증 도구: ESLint no-restricted-imports 규칙 (Phase 1에서 설정)
```
---

## Implementation Approach

### Phase 순서 및 접근 방식

**기본 구조 구축** 관점에서 8개 Phase를 순차적으로 진행한다.
Phase 3~6은 서로 독립적이므로 병렬 진행이 가능하나, Phase 2(타입 정의) 선행이 권장된다.

```
Phase 1: 프로젝트 초기 설정 (빌드/린트/포맷팅/디렉토리)
    ↓
Phase 2: 타입/인터페이스 정의 + 에러 클래스 계층
    ↓
    ├─→ Phase 3: Data Layer 스텁 (2개 모듈)
    ├─→ Phase 4: Business Layer 스텁 (3개 모듈)
    ├─→ Phase 5: Rendering Layer 스텁 (3개 모듈)
    └─→ Phase 6: Presentation Layer 스텁 (2개 모듈)
           ↓
Phase 7: 진입점 및 HTML 템플릿 (전체 계층 연결)
    ↓
Phase 8: 테스트 인프라 및 빌드 최종 검증
```

1. **Setup (Phase 1)**: viewer/ 프로젝트 디렉토리 생성, Vite 빌드 설정, ESLint 보안 규칙, Prettier 포맷팅, 계층별 디렉토리 구조 확립
2. **Core Types (Phase 2)**: SAD-05 데이터 모델을 JSDoc Factory 함수로 구현, SDS-6.1 에러 클래스 계층(CBVError) 정의. 모든 후속 Phase의 기반이 되는 공통 타입 확립
3. **Layer Stubs (Phase 3~6)**: SDS에 정의된 10개 컴포넌트의 인터페이스를 JSDoc으로 선언하고 stub 메서드 구현. 각 Phase에서 해당 계층의 단위 테스트 스캘레톤도 함께 작성
4. **Integration (Phase 7~8)**: main.js 부트스트랩 흐름으로 4계층 연결, index.html에 CSP/진단경고 포함, 전체 빌드/린트/테스트 통과 확인

### Key Technical Decisions

- **결정 1: Vanilla JS + JSDoc (TypeScript 미사용)** — 이유: IEC 62304 Class A 수준에서 빌드 파이프라인 단순성이 중요하며, 런타임 의존성이 0개인 조건(SAD-06 6.2)을 엄격히 준수하기 위함. JSDoc + ESLint로 타입 안정성 확보
- **결정 2: Factory 함수 패턴으로 타입 정의** — 이유: JavaScript에 네이티브 타입 시스템이 없으므로, createDICOMMetadata() 등 Factory 함수로 기본값과 구조를 강제. IDE 자동완성과 ESLint 정적 분석 지원
- **결정 3: viewer/ 서브디렉토리에 프로젝트 배치** — 이유: 기존 ER Gate 검토 도구(Python)와 동일 레포지토리 공존. 관심사 분리 및 독립적 빌드/배포 보장
- **결정 4: ESLint Flat Config (9.x) + 보안 커스텀 규칙** — 이유: no-restricted-imports로 계층 간 의존성 규칙을 빌드 시점에 자동 검증. no-restricted-globals로 네트워크 API 사용 감지 (NFR-2.2)
- **결정 5: CSP connect-src 'none' 적용** — 이유: FR-5.1 외부 통신 차단을 HTML 레벨에서 시행. 빌드 산출물에 인라인 스크립트 없이 Vite 번들만 로드 (ADR-5)
- **결정 6: Vitest + jsdom 환경** — 이유: DOM API 테스트를 위한 최소 환경. WebGL mock으로 Rendering Layer 기본 테스트 수행. 실제 브라우저 테스트는 후속 Playwright E2E로 처리
### Phase 1: 프로젝트 초기 설정

**목표**: viewer/ 프로젝트 디렉토리를 생성하고, 빌드(Vite)/린트(ESLint)/포맷팅(Prettier) 도구를 설정한다.

**근거 문서**: SAD-06(기술 스택), SAD-09(제약 조건), DP-PLAYG-1231(개발 계획)

| 작업 ID | 작업명 | 상세 내용 | 산출물 | 추적 |
|---------|--------|-----------|--------|------|
| P1-01 | 프로젝트 디렉토리 생성 | viewer/ 디렉토리 생성 및 하위 구조 구성 | 디렉토리 구조 | ADR-1 |
| P1-02 | package.json 작성 | 프로젝트 메타데이터, 스크립트, devDependencies 정의. runtime dependencies = 0 | package.json | SAD-06, FR-5.4 |
| P1-03 | vite.config.js 작성 | 정적 단일 번들 빌드 설정. CDN 참조 금지, base: './', rollupOptions 단일 청크 | vite.config.js | ADR-5, FR-7.1 |
| P1-04 | eslint.config.js 작성 | ES2020+ 환경, no-restricted-imports(계층 규칙), 네트워크 API 감지 규칙 | eslint.config.js | NFR-2.2, HAZ-3.1 |
| P1-05 | .prettierrc 작성 | 싱글 따옴표, 세미콜론 필수, 2칸 들여쓰기, 80자 줄바꿈 | .prettierrc | DP-02 |
| P1-06 | .gitignore 작성 | node_modules/, dist/, .vite/ 등 무시 규칙 | .gitignore | CMP-02 |
| P1-07 | 계층별 디렉토리 생성 | src/data/, src/business/, src/rendering/, src/presentation/, src/types/, src/errors/, src/styles/ | 디렉토리 | ADR-1 |
| P1-08 | tests/ 디렉토리 생성 | tests/unit/{data,business,rendering,presentation}/, tests/integration/ | 디렉토리 | DP-02 |

**의존성 규칙 (package.json):**
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
    "test:coverage": "vitest run --coverage",
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
> **주의**: runtime dependencies는 외부 의존성 최소화 전략(SAD-06 6.2)에 따라 허용하지 않는다.

**산출물 검증 기준:**
- [ ] `npm install` 성공 (devDependencies만 설치)
- [ ] `npm run build` 성공 (빈 스텁 상태에서도 dist/ 생성)
- [ ] `npm run lint` 실행 가능 (0 errors)
- [ ] `npm run format` 실행 가능
- [ ] package.json에 runtime dependencies 없음 확인

### Phase 2: 타입/인터페이스 정의 + 에러 클래스 계층

**목표**: SAD-05(데이터 뷰) 데이터 모델을 JSDoc Factory 함수로 구현하고, SDS-6.1 오류 분류에 따른 에러 클래스 계층을 정의한다.

**근거 문서**: SAD-05(데이터 뷰), SDS-3.1~3.10(컴포넌트 인터페이스), 01_spec.md FR-INFRA-006, FR-INFRA-007

| 작업 ID | 작업명 | 상세 내용 | 산출물 | 추적 |
|---------|--------|-----------|--------|------|
| P2-01 | DICOMMetadata.js | 환자정보, 스터디정보, PixelSpacing, SliceThickness, ImageOrientation, BitsAllocated 등 | src/types/DICOMMetadata.js | SAD-05, FR-1.3 |
| P2-02 | VolumeData.js | voxelArray(Float32Array), dimensions(3), spacing(3), origin(3), dataType, minMaxValue(2) | src/types/VolumeData.js | SAD-05, FR-1.4 |
| P2-03 | SliceData.js | imageData(ImageData), plane(Axial/Coronal/Sagittal), sliceIndex, windowLevel, windowWidth | src/types/SliceData.js | SAD-05, FR-2.1~2.3 |
| P2-04 | MeasurementData.js | startPoint(3), endPoint(3), distanceMM, pixelSpacingValid, disclaimerText | src/types/MeasurementData.js | SAD-05, FR-4.1, HAZ-2.1 |
| P2-05 | ViewTransform.js | zoom, panX, panY, windowLevel, windowWidth, sliceIndex | src/types/ViewTransform.js | SAD-05, FR-3.1~3.4 |
| P2-06 | ValidationResult.js | isValid(boolean), warnings(string[]), errors(string[]) | src/types/ValidationResult.js | SDS-3.2, FR-1.2 |
| P2-07 | ParseResult.js | metadata(DICOMMetadata), voxelData(ArrayBuffer), errors(ErrorMessage[]), isValid(boolean) | src/types/ParseResult.js | SDS-3.1, FR-1.1 |
| P2-08 | types/index.js | 모든 타입 모듈 re-export 배럴 파일 | src/types/index.js | ADR-1 |
| P2-09 | CBVError.js | 기본 에러 클래스 + 5개 하위 클래스 (ParseError, ValidationError, RenderError, SecurityError, MemoryError) | src/errors/CBVError.js | SDS-6.1, FR-1.5 |
| P2-10 | errors/index.js | 에러 클래스 re-export 배럴 파일 | src/errors/index.js | ADR-1 |

**타입 정의 패턴 (JSDoc Factory 함수):**
```javascript
// src/types/DICOMMetadata.js - 예시
/**
 * @typedef {Object} DICOMMetadata
 * @property {string} patientName - 환자명
 * @property {string} patientID - 환자 ID
 * @property {string} studyDate - 검사일자
 * @property {string} modality - 모달리티
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
    // ... 기본값 생략
    ...overrides,
  };
}
```

**에러 클래스 계층 구조:**
```javascript
// src/errors/CBVError.js - 기본 구조
export class CBVError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'CBVError';
    this.code = code;       // 기계적 에러 코드
    this.context = context; // 추가 컨텍스트
  }
}

export class ParseError extends CBVError { /* ... */ }
export class ValidationError extends CBVError { /* ... */ }
export class RenderError extends CBVError { /* ... */ }
export class SecurityError extends CBVError { /* ... */ }
export class MemoryError extends CBVError { /* ... */ }
```

**산출물 검증 기준:**
- [ ] 모든 Factory 함수가 기본값으로 유효한 객체를 생성
- [ ] JSDoc이 모든 속성에 대해 타입과 설명을 포함
- [ ] import 시 순환 참조 없음
- [ ] CBVError 계층 5개 하위 클래스 모두 정의
- [ ] `npm run build` 성공
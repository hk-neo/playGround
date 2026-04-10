*소프트웨어 아키텍처 명세서 (Software Architecture Description)*

*제품*: Simple CBCT Viewer
*문서 ID*: SAD-PLAYG-1311
*작성일*: 2026-04-10
*대상 티켓*: PLAYG-1311
*IEC 62304 안전 등급*: Class A (PLAYG-1290 Classification)

---

*[SAD-01] 아키텍처 개요 및 설계 원칙*

*1.1 시스템 전체 아키텍처 개요*

Simple CBCT Viewer는 웹 브라우저에서 동작하는 독립형 치과용 CBCT 영상 뷰어로, 모든 데이터 처리를 클라이언트 로컬 환경에서 수행하는 단일 페이지 애플리케이션(SPA) 구조를 채택한다. 본 시스템은 Layered Architecture 패턴을 기반으로 하여 데이터 파싱 계층, 비즈니스 로직 계층, 렌더링 계층, 프레젠테이션 계층으로 분리되며, IEC 62304 Class A 요구사항과 오프라인 동작 제약조건을 충족하도록 설계되었다.

*1.2 핵심 설계 원칙*

- *단일 책임 원칙 (SRP)*: 각 모듈은 하나의 명확한 책임을 가진다 (예: DICOMParser는 파일 파싱만, Renderer는 영상 렌더링만 담당)
- *관심사 분리 (SoC)*: 데이터 처리 로직, 렌더링 로직, 사용자 인터랙션 로직을 명확히 분리한다
- *정보 은폐 (Information Hiding)*: 모듈 내부 구현은 숨기고 공개 인터페이스를 통해서만 상호작용한다
- *무상태 데이터 처리*: 환자 데이터를 영구 저장소에 저장하지 않고 메모리 상에서만 처리한다 (FR-5.2, HAZ-3.2)
- *외부 통신 차단*: 모든 외부 네트워크 요청을 원천 차단하여 PHI 보호를 보장한다 (FR-5.1, HAZ-3.1)
- *방어적 프로그래밍*: 비표준 입력, 메모리 부족 등 예외 상황에 대해 견고한 오류 처리를 수행한다 (NFR-3.1)

*1.3 아키텍처 스타일 및 선택 근거*

||항목||내용||
|아키텍처 스타일|Layered Architecture (계층형 아키텍처)|
|선택 근거|1) 웹 브라우저 단일 실행 환경으로 분산 처리 불필요 2) Class A 모듈 분리 요구사항에 적합 3) 관심사 분리를 통한 테스트 용이성 확보 4) 오프라인 독립 동작 제약에 부합 (IU-07, SR-9)|
|대안 검토|Microservices(서버 불필요로 기각), Event-Driven(단일 프로세스로 과설계), Pipe-Filter(실시간 상호작용에 부적합)|

*1.4 참조 문서*

||문서||티켓 키||설명||
|Intended Use|PLAYG-1237|제품의 의도된 사용 목적, 환경, 사용자 정의|
|System Requirement Specification|PLAYG-1229|시스템 요구사항 정의 (SR-1 ~ SR-14)|
|Classification|PLAYG-1290|소프트웨어 안전 등급 분석 (Class A)|
|Software Development Plan|PLAYG-1231|소프트웨어 개발 계획서 (DP-PLAYG-1231)|
|Risk Management Plan|PLAYG-1232|위험 관리 계획서 (RMP-PLAYG-1232)|
|Risk Management Report|PLAYG-1309|위험 관리 보고서 (RMR)|
|Security Maintenance Plan|PLAYG-1233|사이버 보안 유지보수 계획서 (SMP-PLAYG-1233)|
|Configuration Management Plan|PLAYG-1234|형상 관리 계획서 (CMP-PLAYG-1234)|
|Software Requirements Specification|PLAYG-1310|소프트웨어 요구사항 명세서 (SRS)|

---

*[SAD-02] 논리적 뷰 (Logical View)*

*2.1 시스템 컴포넌트 구성*

본 시스템은 다음과 같이 4개 계층(Layer)과 10개 모듈(Component)로 구성된다.

||계층||모듈||역할||
|Data Layer|DICOMParser|DICOM 파일 로드, 형식 검증, 메타데이터 파싱, 복셀 데이터 추출|
|Data Layer|DataValidator|DICOM 메타데이터 유효성 검증, Pixel Spacing 확인, 복셀 값 범위 검증|
|Business Layer|VolumeBuilder|3차원 볼륨 데이터 구성, 메모리 추정 및 관리|
|Business Layer|MeasurementEngine|거리 측정 계산, 좌표 변환, 측정 안내 문구 생성|
|Business Layer|SecurityGuard|외부 네트워크 요청 차단, CSP 정책 관리, 데이터 잔존 방지|
|Rendering Layer|MPRRenderer|Axial/Coronal/Sagittal MPR 단면 재구성 및 렌더링|
|Rendering Layer|VolumeRenderer|WebGL 기반 3D 볼륨 렌더링|
|Rendering Layer|ViewTransformEngine|슬라이스 탐색, 확대/축소, 이동, WL/WW 변환 처리|
|Presentation Layer|UIController|사용자 입력 처리, 뷰포트 관리, 경고 배너, 브라우저 감지|
|Presentation Layer|ViewportManager|MPR 3단면/3D 뷰포트 동시 디스플레이 관리|

*2.2 논리적 아키텍처 다이어그램*

```
@startuml
skinparam componentStyle rectangle
skinparam backgroundColor white
skinparam shadowing false

package "Presentation Layer" as PL {
  [UIController] as UIC
  [ViewportManager] as VM
}

package "Rendering Layer" as RL {
  [MPRRenderer] as MPRR
  [VolumeRenderer] as VR
  [ViewTransformEngine] as VTE
}

package "Business Layer" as BL {
  [VolumeBuilder] as VB
  [MeasurementEngine] as ME
  [SecurityGuard] as SG
}

package "Data Layer" as DL {
  [DICOMParser] as DP
  [DataValidator] as DV
}

UIC --> VM : 뷰포트 제어
UIC --> VTE : 사용자 입력 전달
VM --> MPRR : MPR 렌더링 요청
VM --> VR : 3D 렌더링 요청
VTE --> MPRR : 변환 적용
MPRR --> VB : 볼륨 데이터 조회
VR --> VB : 볼륨 데이터 조회
ME --> VB : 복셀 좌표 조회
ME --> DV : Pixel Spacing 검증
VB --> DP : 파싱된 DICOM 데이터
VB --> DV : 메타데이터 검증
DP --> DV : 메타데이터 전달

note right of SG : 모든 계층에서 참조 가능
note right of DL : 외부 파일 시스템과 연동

@enduml
```

*2.3 컴포넌트 간 인터페이스 정의*

||인터페이스||제공 모듈||소비 모듈||설명||
|parseDICOM(file: File)|DICOMParser|VolumeBuilder|DICOM 파일을 파싱하여 메타데이터와 복셀 데이터를 반환|
|validateHeader(metadata: DICOMMeta)|DataValidator|DICOMParser|DICOM 헤더 유효성 검증 결과 반환|
|validatePixelSpacing(meta: DICOMMeta)|DataValidator|MeasurementEngine|Pixel Spacing 존재 여부 및 유효성 반환|
|buildVolume(voxelData, metadata)|VolumeBuilder|MPRRenderer, VolumeRenderer|3D 볼륨 데이터 구성 및 반환|
|estimateMemory(fileSize: number)|VolumeBuilder|UIController|예상 메모리 사용량 추정 및 경고 임계치 반환|
|renderMPR(volume, plane, sliceIndex)|MPRRenderer|ViewportManager|지정 단면의 MPR 영상을 Canvas에 렌더링|
|renderVolume(volume, options)|VolumeRenderer|ViewportManager|3D 볼륨 렌더링을 WebGL Canvas에 수행|
|applyTransform(type, params)|ViewTransformEngine|UIController|슬라이스/줌/팬/WL/WW 변환을 적용|
|measureDistance(p1, p2, transform)|MeasurementEngine|UIController|두 점 간 거리를 mm 단위로 계산|
|checkBrowserSupport()|UIController|ViewportManager|브라우저 호환성 검사 결과 반환|

---*[SAD-03] 프로세스 뷰 (Process View)*

*3.1 주요 실행 흐름*

본 시스템은 단일 웹 브라우저 탭에서 실행되는 단일 프로세스 아키텍처이다. 메인 스레드에서 사용자 인터랙션과 UI 렌더링을 처리하고, 대용량 DICOM 파일 파싱은 비동기 처리를 통해 메인 스레드 블로킹을 방지한다.

*3.2 시나리오 1: CBCT 영상 로드 및 열람 프로세스*

```
@startuml
skinparam backgroundColor white
skinparam shadowing false

actor User
participant "UIController" as UI
participant "DICOMParser" as DP
participant "DataValidator" as DV
participant "VolumeBuilder" as VB
participant "MPRRenderer" as MR
participant "VolumeRenderer" as VR
participant "ViewportManager" as VM

User -> UI: DICOM 파일 선택
UI -> VB: estimateMemory(fileSize)
VB -> UI: 메모리 추정 결과
alt 메모리 한계 초과 예상
  UI -> User: 경고 표시 및 로딩 중단 옵션
end
UI -> DP: parseDICOM(file)
DP -> DP: 매직 바이트 및 전송 구문 확인
DP -> DV: validateHeader(metadata)
DV -> DP: 검증 결과
alt 파일 무효
  DP -> UI: 오류 메시지 반환
  UI -> User: 오류 안내 표시
else 파일 유효
  DP -> DP: 메타데이터 및 복셀 데이터 파싱
  DP -> DV: 복셀 값 범위 검증
  DV -> DP: 검증 결과
  DP -> VB: 파싱된 데이터 전달
  VB -> VB: 3D 볼륨 데이터 구성
  VB -> MR: 볼륨 데이터 제공
  VB -> VR: 볼륨 데이터 제공
  MR -> VM: MPR 3단면 렌더링
  VR -> VM: 3D 볼륨 렌더링
  VM -> User: 영상 디스플레이
end
@enduml
```

*3.3 시나리오 2: 거리 측정 프로세스*

```
@startuml
skinparam backgroundColor white
skinparam shadowing false

actor User
participant "UIController" as UI
participant "DataValidator" as DV
participant "MeasurementEngine" as ME
participant "ViewportManager" as VM

User -> UI: 측정 모드 활성화
UI -> DV: validatePixelSpacing(metadata)
DV -> UI: 검증 결과
alt Pixel Spacing 누락/무효
  UI -> User: 측정 불가 및 사유 고지
else Pixel Spacing 유효
  UI -> User: 측정 모드 활성화 표시
  User -> UI: 첫 번째 점 지정
  User -> UI: 두 번째 점 지정
  UI -> ME: measureDistance(p1, p2, currentTransform)
  ME -> ME: 줌/팬 역변환 수행
  ME -> ME: mm 단위 거리 계산
  ME -> UI: 측정 결과 + 안내 문구
  UI -> VM: 측정 결과 오버레이
  VM -> User: 결과 및 참고용 안내 표시
end
@enduml
```

*3.4 동시성 모델*

- *메인 스레드*: UI 렌더링, 사용자 입력 처리, Canvas 업데이트
- *비동기 작업*: DICOM 파일 파싱 (Promise/async-await 기반), 볼륨 데이터 구성
- *WebGL 렌더링*: requestAnimationFrame 기반 렌더링 루프
- *예외 처리*: 모든 비동기 작업에 try-catch 적용, 사용자에게 명확한 오류 메시지 전달 (FR-1.5, NFR-3.1)

---

*[SAD-04] 배포 뷰 (Deployment View)*

*4.1 배포 아키텍처*

Simple CBCT Viewer는 서버 인프라가 불필요한 정적 웹 애플리케이션이다. 빌드된 정적 파일(HTML, CSS, JavaScript)이 사용자 로컬 파일 시스템에 배치되어 브라우저에서 직접 실행된다.

*4.2 배포 다이어그램*

```
@startuml
skinparam backgroundColor white
skinparam shadowing false

node "사용자 로컬 환경" as Local {
  node "웹 브라우저" as Browser {
    artifact "index.html" as HTML
    artifact "app.js (번들)" as JS
    artifact "app.css" as CSS
    component "UIController" as UIC
    component "DICOMParser" as DP
    component "Renderer" as R
    component "SecurityGuard" as SG
  }
  node "로컬 파일 시스템" as FS {
    artifact "DICOM 파일 (.dcm)" as DICOM
    artifact "빌드 산출물 (정적 파일)" as Build
  }
  node "GPU" as GPU {
    [WebGL 2.0] as WebGL
  }
}

Build --> Browser : 로드
DICOM --> Browser : File API
Browser --> GPU : 렌더링 명령

note right of Local : 네트워크 연결 불필요 (SR-9, FR-7.1)
note bottom of SG : 외부 통신 원천 차단 (FR-5.1)

@enduml
```

*4.3 하드웨어/소프트웨어 매핑*

||소프트웨어 컴포넌트||실행 환경||비고||
|전체 애플리케이션|웹 브라우저 (Chrome, Edge, Firefox)|정적 HTML/CSS/JS 번들|
|MPRRenderer, VolumeRenderer|WebGL 2.0 (GPU)|GPU 가속 렌더링|
|DICOMParser|브라우저 메인 스레드 (비동기)|File API 기반|
|SecurityGuard|브라우저 CSP 엔진|CSP 헤더 적용|

*4.4 네트워크 토폴로지*

- 외부 네트워크 연결 없음 (오프라인 동작, FR-7.1)
- 모든 데이터는 로컬 파일 시스템에서 브라우저로 로드
- CSP 정책으로 외부 통신 원천 차단 (FR-5.1, NFR-2.1)

---*[SAD-05] 데이터 뷰 (Data View)*

*5.1 데이터 아키텍처 개요*

본 시스템은 환자 데이터를 영구 저장하지 않으며, 모든 데이터는 브라우저 메모리 상에서만 존재한다 (FR-5.2). 세션 종료 시 모든 데이터는 명시적으로 해제된다 (FR-5.3). 데이터베이스나 로컬 스토리지를 사용하지 않는다.

*5.2 주요 데이터 모델*

```
@startuml
skinparam backgroundColor white
skinparam shadowing false

class DICOMMetadata {
  patientName: string
  patientID: string
  studyDate: string
  modality: string
  pixelSpacing: [number, number]
  sliceThickness: number
  imageOrientationPatient: number[6]
  rows: number
  columns: number
  numberOfFrames: number
  bitsAllocated: number
  transferSyntax: string
  windowCenter: number
  windowWidth: number
}

class VolumeData {
  voxelArray: ArrayBuffer
  dimensions: [number, number, number]
  spacing: [number, number, number]
  origin: [number, number, number]
  dataType: string
  minMaxValue: [number, number]
}

class SliceData {
  imageData: ImageData
  plane: Axial | Coronal | Sagittal
  sliceIndex: number
  windowLevel: number
  windowWidth: number
}

class MeasurementData {
  startPoint: [number, number, number]
  endPoint: [number, number, number]
  distanceMM: number
  pixelSpacingValid: boolean
  disclaimerText: string
}

class ViewTransform {
  zoom: number
  panX: number
  panY: number
  windowLevel: number
  windowWidth: number
  sliceIndex: number
}

DICOMMetadata "1" -- "1" VolumeData : 파싱되어 구성
VolumeData "1" -- "*" SliceData : 단면 추출
VolumeData "1" -- "*" MeasurementData : 측정 기준
ViewTransform "1" -- "1" SliceData : 변환 적용

@enduml
```

*5.3 데이터 흐름*

1. *입력 단계*: 사용자가 File API로 DICOM 파일 선택 -> DICOMParser가 ArrayBuffer로 읽기
2. *파싱 단계*: ArrayBuffer -> DICOMMetadata + 복셀 ArrayBuffer 추출
3. *구성 단계*: 복셀 ArrayBuffer + 메타데이터 -> VolumeData 객체 생성
4. *렌더링 단계*: VolumeData + ViewTransform -> SliceData (MPR) / 3D 렌더링
5. *측정 단계*: VolumeData + 사용자 좌표 -> MeasurementData
6. *해제 단계*: 세션 종료 시 모든 ArrayBuffer 및 객체 참조 해제 -> GC

*5.4 데이터 생명주기*

||단계||저장 위치||지속 시간||비고||
|파일 로딩|브라우저 메모리 (ArrayBuffer)|세션 중만|File API로 읽은 원시 데이터|
|볼륨 데이터|브라우저 메모리 (VolumeData)|세션 중만|3D 볼륨 구성 데이터|
|렌더링 결과|Canvas 픽셀 버퍼|현재 프레임만|requestAnimationFrame 갱신|
|측정 결과|메모리 (MeasurementData)|세션 중만|화면 표시용 임시 데이터|
|세션 종료 후|없음|해제됨|캐시/스토리지 저장 금지 (FR-5.2)|

---

*[SAD-06] 기술 스택 및 구성 요소*

*6.1 기술 스택*

||구분||기술||버전||선택 근거||
|프로그래밍 언어|JavaScript (ES6+)|ES2020+|IU-08 작동 원리 명시, 브라우저 네이티브 실행|
|3D 렌더링|WebGL 2.0|2.0|SR-4 3D 볼륨 렌더링, GPU 가속 필수|
|UI 렌더링|HTML5 Canvas / DOM|-|MPR 영상은 Canvas, UI 컨트롤은 DOM|
|파일 접근|Web File API|-|SR-1 로컬 파일 로드, 브라우저 표준|
|빌드 도구|Vite|5.x|DP-02 빌드 도구, 빠른 번들링, 외부 의존성 없는 정적 빌드|
|패키지 관리|npm|10.x|의존성 관리, SBOM 생성 기반|
|테스트|Vitest + Playwright|최신|DP-02 테스트 프레임워크, 단위/E2E 테스트|
|정적 분석|ESLint|9.x|DP-02 코드 품질, 보안 검증 (NFR-2.2)|
|코드 포맷팅|Prettier|3.x|DP-02 코딩 스타일 일관성|
|버전 관리|Git + GitHub|-|CMP-02 형상 관리, Git Flow 브랜치 전략|

*6.2 외부 의존성 최소화 전략*

- DICOM 파서: 자체 구현 (외부 라이브러리 최소화, 보안 감사 용이성, FR-5.4)
- WebGL 래핑: 자체 구현 (제어권 확보, NFR-1.3 성능 목표)
- UI 프레임워크: 최소한의 Vanilla JS 또는 경량 라이브러리 (번들 크기 최소화, FR-7.1 오프라인 동작)
- 모든 의존성은 로컬 번들에 포함하여 빌드 (CDN 참조 금지, HAZ-5.3)

*6.3 버전 및 호환성*

- ECMAScript 2020+ 기준 (Chrome 80+, Edge 80+, Firefox 74+)
- WebGL 2.0 지원 브라우저 필수 (FR-6.2)
- 빌드 산출물은 단일 HTML + 번들 JS/CSS (외부 리소스 참조 없음)

---*[SAD-07] 아키텍처 결정 근거 (ADR) 요약*

*7.1 ADR 목록*

||ADR ID||결정 사항||관련 컴포넌트||관련 요구사항||
|ADR-1|Layered Architecture 채택|전체 시스템|DP-03 아키텍처 원칙, Class A 요구사항|
|ADR-2|DICOM 파서 자체 구현|DICOMParser, DataValidator|FR-5.4, HAZ-3.1, NFR-2.2|
|ADR-3|메모리 기반 무상태 데이터 처리|VolumeBuilder, SecurityGuard|FR-5.2, FR-5.3, HAZ-3.2|
|ADR-4|WebGL 2.0 기반 렌더링|MPRRenderer, VolumeRenderer|FR-2.5, SR-4, NFR-1.3|
|ADR-5|정적 단일 번들 배포|전체 시스템|FR-7.1, HAZ-5.3, NFR-3.2|

*7.2 ADR-1: Layered Architecture 채택*

- *문제 상황*: Class A 안전 등급 소프트웨어의 모듈 분리 및 관심사 분리 필요
- *대안 검토*: (1) Layered (2) Microservices (3) Event-Driven (4) Pipe-Filter
- *최종 선택*: Layered Architecture
- *근거*: 단일 브라우저 실행 환경으로 분산 불필요, DP-03 모듈식 구조 원칙 부합, 계층별 독립 테스트 가능

*7.3 ADR-2: DICOM 파서 자체 구현*

- *문제 상황*: 외부 DICOM 파서 라이브러리 의존 시 보안 감사 부담 및 외부 통신 코드 포함 위험
- *대안 검토*: (1) daikon.js (2) dicomParser (cornerstone) (3) 자체 구현
- *최종 선택*: 자체 구현
- *근거*: FR-5.4 보안 감사 요구사항, HAZ-3.1 외부 통신 차단, 의존성 최소화 전략 (SMP-02 SBOM 관리 용이)

*7.4 ADR-3: 메모리 기반 무상태 데이터 처리*

- *문제 상황*: 환자 데이터의 영구 저장으로 인한 PHI 유출 위험
- *대안 검토*: (1) IndexedDB 활용 (2) localStorage 활용 (3) 메모리 전용 처리
- *최종 선택*: 메모리 전용 처리
- *근거*: FR-5.2 캐시/스토리지 저장 금지, HAZ-3.2 데이터 잔존 방지, NFR-2.4 데이터 잔존 검증

*7.5 ADR-4: WebGL 2.0 기반 렌더링*

- *문제 상황*: 대용량 CBCT 볼륨 데이터의 실시간 렌더링 성능 확보
- *대안 검토*: (1) Canvas 2D (2) WebGL 1.0 (3) WebGL 2.0 (4) WebGPU
- *최종 선택*: WebGL 2.0
- *근거*: NFR-1.3 최소 15FPS, 3D 텍스처 지원, 브라우저 호환성(FR-6.2), WebGPU는 아직 브라우저 지원 제한적

*7.6 ADR-5: 정적 단일 번들 배포*

- *문제 상황*: 오프라인 환경에서 모든 기능 동작 보장
- *대안 검토*: (1) CDN 기반 로딩 (2) PWA + Service Worker (3) 정적 단일 번들
- *최종 선택*: 정적 단일 번들
- *근거*: FR-7.1 오프라인 전체 기능 동작, HAZ-5.3 외부 리소스 참조 제거, 단순성(Class A 요구)

---

*[SAD-08] 품질 속성 (Quality Attributes)*

*8.1 보안 (Security)*

||품질 속성||설계 수단||관련 요구사항||
|인증/권한|로컬 전용 애플리케이션으로 인증 불필요|FR-7.1|
|데이터 보호|CSP 헤더로 외부 통신 차단, 메모리 전용 데이터 처리|FR-5.1, FR-5.2, NFR-2.1|
|외부 통신 차단|SecurityGuard 모듈에서 모든 네트워크 API 차단|FR-5.1, HAZ-3.1|
|감사|빌드 파이프라인에 정적 분석으로 네트워크 API 사용 검증|NFR-2.2|
|의존성 관리|SBOM 기반 정기 취약점 스캔 (SMP-PLAYG-1233)|FR-5.4, NFR-2.3|

*8.2 성능 (Performance)*

||품질 속성||목표||설계 수단||관련 요구사항||
|영상 로딩|30초 이내 (200~500MB)|비동기 파싱, 메모리 사전 추정|NFR-1.1|
|MPR 렌더링|200ms 이내|Canvas 직접 렌더링, 사전 계산|NFR-1.2|
|3D 렌더링|최소 15 FPS|WebGL 2.0 GPU 가속, LOD 적용|NFR-1.3|
|측정 응답|100ms 이내|인메모리 계산, 캐시 없는 즉시 계산|NFR-1.4|

*8.3 가용성 (Availability)*

- 오프라인 동작으로 서버 장애 개념 없음 (FR-7.1)
- 예외 상황 시 사용자에게 명확한 오류 메시지 표시 후 기능 유지 (NFR-3.1)
- 대용량 파일 처리 시 점진적 로딩 또는 해상도 축소 옵션 제공 (FR-7.4)

*8.4 유지보수성 (Maintainability)*

- 4계층 분리로 계층별 독립 수정 가능
- 각 모듈은 공개 인터페이스를 통해서만 연결되어 교체 가능
- JSDoc 주석으로 API 문서화 (DP-03)
- 단위 테스트 독립 실행 가능 (Vitest)

*8.5 안전성 (Safety)*

- Class A 안전 등급에 따른 설계 수단 적용 (PLAYG-1290)
- DICOM 입력 검증: 매직 바이트, 전송 구문, 복셀 값 범위 (HAZ-1.1)
- 측정 안전: Pixel Spacing 검증, 측정 결과 참고용 안내 (HAZ-2.1)
- 정보 전달: 진단 불가 경고 문구 필수 표시 (HAZ-4.1)
- 데이터 보호: 외부 통신 차단, 메모리 전용 처리 (HAZ-3.1, HAZ-3.2)

---

*[SAD-09] 제약 조건 (Constraints)*

*9.1 규제 제약*

||규격||적용 내용||
|IEC 62304:2006+AMD1:2015|Class A 소프트웨어 수명 주기 프로세스 준수|
|ISO 14971:2019|위험 관리 - 위험 분석, 평가, 통제, 잔여 위험 평가|
|FDA 21 CFR Part 11|전자 기록/전자 서관 관련 (본 제품은 데이터 저장 없으므로 제한적 적용)|

*9.2 하드웨어 제약*

||항목||제약 내용||
|대상 플랫폼|웹 브라우저 (Chrome, Edge, Firefox 최신 버전)|
|메모리|RAM 8GB 이상 권장, 브라우저 탭 메모리 한계 내 동작|
|GPU|WebGL 2.0 지원 그래픽 카드 필요|
|디스플레이|최소 1280x720 해상도|
|입력 장치|마우스, 키보드|

*9.3 소프트웨어 제약*

||항목||제약 내용||
|운영체제|브라우저 지원 OS (Windows, macOS, Linux)|
|네트워크|인터넷 연결 불필요, 외부 통신 금지|
|데이터 저장|브라우저 캐시, localStorage, sessionStorage 사용 금지|
|외부 의존성|CDN 참조 금지, 모든 리소스 로컬 번들 포함|

*9.4 조직/프로세스 제약*

||항목||제약 내용||
|개발 방법론|V-Model 기반 + Agile 보완 (DP-01)|
|형상 관리|Git Flow 브랜치 전략 (CMP-03)|
|코드 리뷰|최소 1인 이상 PR 승인 필수 (DP-05)|
|문서화|JSDoc 주석 필수, 공개 API 문서화 (DP-03)|

---

*문서 끝*
*소프트웨어 아키텍처 명세서 (SAD)*

*프로젝트: DentiView3D - 웹 기반 CBCT 영상 뷰어*
*버전: 0.1.0 | 작성일: 2026-04-23*
*추적 티켓: PLAYG-1766*
*소프트웨어 안전 등급: IEC 62304 Class A*

---

*[SAD-01] 아키텍처 개요 및 설계 원칙*

*아키텍처 개요*

DentiView3D는 로컬 DICOM 파일을 브라우저에서 파싱하고 3단면 MPR 영상을 렌더링하는 독립 실행형 웹 애플리케이션이다. 본 아키텍처는 IEC 62304 Class A 요구사항을 충족하기 위해 계층형(Layered) 아키텍처 스타일을 채택하여, 관심사 분리와 모듈 경계를 명확히 한다.

*핵심 설계 원칙*

- *단일 책임 원칙 (SRP)*: 각 모듈은 하나의 명확한 책임만 수행한다. DICOM 파싱, 검증, 렌더링, 보안 기능이 각각 독립 모듈로 분리된다.
- *관심사 분리 (Separation of Concerns)*: UI 계층, 비즈니스 로직 계층, 데이터 접근 계층이 명확히 구분된다.
- *정보 은폐 (Information Hiding)*: PHI 데이터와 내부 파싱 구조가 외부에 노출되지 않도록 모듈 인터페이스를 통한 접근만 허용한다.
- *안전 우선 설계 (Safety First)*: Class A 요구사항에 따라 모든 입력 검증, 경계 조건 처리, 에러 핸들링이 최우선으로 설계된다.
- *오프라인 전용 (Offline Only)*: 네트워크 통신이 전혀 없는 순수 클라이언트 아키텍처이다. CSP connect-src none으로 외부 통신을 원천 차단한다.

*아키텍처 스타일 및 선택 근거*

- *선택 스타일*: Layered Architecture (3-Tier)
  - Presentation Layer: UI 렌더링, 사용자 이벤트 처리
  - Business Logic Layer: DICOM 파싱, 검증, 볼륨 데이터 구성
  - Data Access Layer: File API를 통한 로컬 파일 읽기, ArrayBuffer/DataView 처리
- *선택 근거*:
  - Class A 소프트웨어의 단순성 요구사항에 부합 (IEC 62304 제4.3항)
  - 모듈 간 의존성이 단방향(상향)으로 제한되어 추적성과 테스트 용이성 확보
  - 단일 프로세스 브라우저 환경에서 과도한 분산 아키텍처(Microservices 등)는 불필요
  - SRS에 정의된 FR/NFR의 명확한 계층 분류 가능

*참조 문서*

|| 문서 || 티켓 키 || 설명 ||
|| SRS || PLAYG-1460 || 소프트웨어 요구사항 명세서 ||
|| RMR || PLAYG-1459 || 위험 관리 보고서 (17개 Hazard) ||
|| EA Gate || PLAYG-1458 || 엔지니어링 활동 게이트 ||
|| SAD || PLAYG-1766 || 본 문서 ||

---

*[SAD-02] 논리적 뷰 (Logical View)*

*시스템 컴포넌트 구성*

DentiView3D는 5개의 핵심 컴포넌트로 구성된다:

|| 컴포넌트 || ID || 계층 || 책임 ||
|| DicomParser || COMP-1 || Business Logic || DICOM 파일 전체 파싱 오케스트레이션 ||
|| ValidationModule || COMP-2 || Business Logic || 파일 형식 및 데이터 무결성 검증 ||
|| MetadataParser || COMP-3 || Business Logic || DICOM 메타데이터 추출 및 구조화 ||
|| MprRenderer || COMP-4 || Presentation || 3단면 MPR 영상 렌더링 및 상호작용 ||
|| PhiGuard || COMP-5 || Business Logic || PHI 데이터 보호 및 접근 제어 ||
|| UiController || COMP-6 || Presentation || UI 이벤트 처리 및 상태 관리 ||
|| ErrorManager || COMP-7 || Presentation || 에러 코드 관리 및 사용자 메시지 생성 ||

*논리 아키텍처 다이어그램*

{code}
@startuml SAD_LogicalView
skinparam componentStyle rectangle
skinparam backgroundColor white

package "Presentation Layer" as PL {
  [UiController
(COMP-6)] as UI
  [MprRenderer
(COMP-4)] as MPR
  [ErrorManager
(COMP-7)] as ERR
}

package "Business Logic Layer" as BLL {
  [DicomParser
(COMP-1)] as PARSER
  [ValidationModule
(COMP-2)] as VALID
  [MetadataParser
(COMP-3)] as META
  [PhiGuard
(COMP-5)] as PHI
}

package "Data Access Layer" as DAL {
  [FileAPI
(Browser)] as FILE
  [ArrayBuffer
(DataView)] as BUF
}

UI --> PARSER : parseDICOM(file)
UI --> MPR : render(viewport, slice)
UI --> ERR : handleError(code)

PARSER --> VALID : validateMagicByte()
validateTransferSyntax()
validateFileSize()
PARSER --> META : parseMetaGroup()
parseMetadata()
parsePixelData()
META --> PHI : maskPhiFields()
getPhiValue()

PARSER ..> BUF : ArrayBuffer read
FILE ..> BUF : File.readAsArrayBuffer()

MPR <-- PARSER : ParseResult

note right of BLL
  IEC 62304 Class A
  단위 테스트 100% coverage
  정적 분석 적용
end note

@enduml
{code}

*컴포넌트 간 인터페이스 정의*

|| 인터페이스 || 제공 컴포넌트 || 소비 컴포넌트 || 설명 ||
|| parseDICOM(file: File) -> ParseResult || DicomParser || UiController || DICOM 파일 전체 파싱 결과 반환 ||
|| validateMagicByte(buf) -> boolean || ValidationModule || DicomParser || DICOM 매직 바이트 검증 ||
|| validateTransferSyntax(uid) -> boolean || ValidationModule || DicomParser || 전송 구문 지원 여부 확인 ||
|| validateFileSize(size) -> boolean || ValidationModule || DicomParser || 파일 크기 제한 검증 ||
|| parseMetaGroup(buf) -> MetaGroup || MetadataParser || DicomParser || 파일 메타 정보 그룹 파싱 ||
|| parseMetadata(ctx) -> DICOMMetadata || MetadataParser || DicomParser || 전체 데이터셋 태그 파싱 ||
|| parsePixelData(buf, meta) -> ArrayBuffer || MetadataParser || DicomParser || 픽셀 데이터 추출 ||
|| maskPhiFields(metadata) -> Metadata || PhiGuard || MetadataParser || PHI 필드 마스킹 처리 ||
|| renderSlice(viewport, data, idx) -> void || MprRenderer || UiController || 단일 슬라이스 렌더링 ||
|| handleError(code) -> UserMessage || ErrorManager || UiController || 에러 코드 -> 사용자 메시지 변환 ||

---

*[SAD-03] 프로세스 뷰 (Process View)*

*동시성 모델*

DentiView3D는 단일 스레드 브라우저 환경에서 동작한다. File API의 비동기 읽기(FileReader.readAsArrayBuffer)만이 비동기 처리 대상이며, 파싱과 렌더링은 모두 메인 스레드에서 순차적으로 수행된다. Web Worker는 Class A의 단순성 요구사항과 브라우저 메모리 제약을 고려하여 사용하지 않는다.

*프로세스 흐름 1: 정상 파일 로드 및 렌더링*

{code}
@startuml SAD_ProcessView_NormalLoad
actor 사용자
participant "UiController
(COMP-6)" as UI
participant "DicomParser
(COMP-1)" as PARSER
participant "ValidationModule
(COMP-2)" as VALID
participant "MetadataParser
(COMP-3)" as META
participant "PhiGuard
(COMP-5)" as PHI
participant "MprRenderer
(COMP-4)" as MPR

사용자 -> UI: DICOM 파일 선택 (File input)
UI -> PARSER: parseDICOM(file)
PARSER -> VALID: validateFileSize(file.size)
VALID --> PARSER: true/false

alt 파일 크기 유효
  PARSER -> VALID: validateMagicByte(buffer)
  VALID --> PARSER: true/false
  opt 매직 바이트 유효
    PARSER -> META: parseMetaGroup(buffer)
    META --> PARSER: MetaGroup (전송구문UID 등)
    PARSER -> VALID: validateTransferSyntax(uid)
    VALID --> PARSER: true/false
    opt 전송 구문 지원
      PARSER -> META: parseMetadata(ctx)
      META -> PHI: maskPhiFields(rawMeta)
      PHI --> META: 마스킹된 메타데이터
      META --> PARSER: DICOMMetadata
      PARSER -> META: parsePixelData(buffer, meta)
      META --> PARSER: 복셀 데이터 (ArrayBuffer)
      PARSER --> UI: ParseResult (isValid=true)
      UI -> MPR: buildVolumeData(parseResult)
      UI -> MPR: renderAllViewports()
      MPR --> 사용자: Axial/Coronal/Sagittal 표시
    end
  end
end

@enduml
{code}

*프로세스 흐름 2: 비정상 파일 에러 처리*

{code}
@startuml SAD_ProcessView_ErrorHandling
actor 사용자
participant "UiController
(COMP-6)" as UI
participant "DicomParser
(COMP-1)" as PARSER
participant "ValidationModule
(COMP-2)" as VALID
participant "ErrorManager
(COMP-7)" as ERR

사용자 -> UI: 파일 선택
UI -> PARSER: parseDICOM(file)

alt 파일 크기 초과 (FR-1.4)
  PARSER -> VALID: validateFileSize(size)
  VALID --> PARSER: false
  PARSER -> ERR: PARSE_ERR_FILE_TOO_LARGE
  ERR --> PARSER: 사용자 메시지
  PARSER --> UI: ParseResult (errors)
  UI --> 사용자: 에러 메시지 표시
else 매직 바이트 불일치 (FR-1.1)
  PARSER -> VALID: validateMagicByte(buffer)
  VALID --> PARSER: false
  PARSER -> ERR: PARSE_ERR_INVALID_MAGIC
  ERR --> PARSER: 사용자 메시지
  PARSER --> UI: ParseResult (errors)
  UI --> 사용자: 에러 메시지 표시
else 미지원 전송 구문 (FR-1.2)
  PARSER -> VALID: validateTransferSyntax(uid)
  VALID --> PARSER: false
  PARSER -> ERR: PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX
  ERR --> PARSER: 사용자 메시지
  PARSER --> UI: ParseResult (errors)
  UI --> 사용자: 에러 메시지 표시
else 필수 태그 누락 (FR-1.3)
  PARSER -> ERR: PARSE_ERR_MISSING_REQUIRED_TAG
  ERR --> PARSER: 사용자 메시지
  PARSER --> UI: ParseResult (errors)
  UI --> 사용자: 에러 메시지 표시
end

note over UI: 에러 후에도 애플리케이션 정상 동작 유지 (NFR-7)
사용자 -> UI: 다른 파일 선택 가능

@enduml
{code}
---

*[SAD-04] 배포 뷰 (Deployment View)*

*물리적 배포 구성*

DentiView3D는 순수 클라이언트 사이드 웹 애플리케이션으로, 별도의 서버 인프라가 필요 없다.
정적 파일(HTML, CSS, JavaScript)이 웹 서버 또는 로컬 파일 시스템에서 직접 로드되어 브라우저에서 실행된다.

*배포 아키텍처 다이어그램*

{code}
@startuml SAD_DeploymentView
skinparam backgroundColor white
skinparam nodeStyle rectangle

node "사용자 워크스테이션" as WS {
  node "웹 브라우저" as WB {
    artifact "DentiView3D" as DV {
      component [UiController]
      component [MprRenderer]
      component [DicomParser]
      component [ValidationModule]
      component [MetadataParser]
      component [PhiGuard]
      component [ErrorManager]
    }
    database "브라우저 메모리" as MEM {
      [ArrayBuffer]
      [WeakMap]
    }
  }
  folder "로컬 파일 시스템" as FS {
    artifact "DICOM 파일" as DF
  }
}

node "배포 서버 (정적 호스팅)" as SERVER {
  folder "정적 파일" as STATIC {
    artifact "index.html" as HTML
    artifact "app.js" as JS
    artifact "styles.css" as CSS
  }
}

DV ..> MEM : 런타임 데이터 저장
WB ..> DF : File.readAsArrayBuffer()
SERVER -right-> WS : 최초 로드 (HTTP/로컬)

note bottom of DV
  모든 데이터는 브라우저 메모리에만 존재
  네트워크 통신 전무 (CSP connect-src none)
  세션 종료 시 데이터 자동 소멸
end note

@enduml
{code}

*배포 특징*

- *정적 배포*: 빌드된 정적 파일(HTML/CSS/JS)만으로 구성, 서버 사이드 런타임 불필요
- *오프라인 동작*: 최초 로드 이후 인터넷 연결 없이 완전 동작 (NFR-4.2)
- *데이터 로컬리티*: 모든 환자 데이터는 사용자 워크스테이션의 브라우저 메모리에만 존재 (NFR-2.2)
- *네트워크 격리*: CSP(Content Security Policy) connect-src none 설정으로 외부 통신 원천 차단
- *지원 브라우저*: Chrome 90+, Edge 90+, Firefox 90+, Safari 15+ (NFR-4.1)

---

*[SAD-05] 데이터 뷰 (Data View)*

*데이터 아키텍처 개요*

DentiView3D는 영구 저장소가 없는 메모리 기반 데이터 아키텍처를 채택한다.
모든 데이터는 런타임에 브라우저 메모리에만 존재하며, 세션 종료 시 자동 해제된다.
데이터 흐름은 파일 입력 -> 파싱 -> 메모리 구조체 구성 -> 렌더링의 단방향 파이프라인이다.

*주요 데이터 모델 클래스 다이어그램*

{code}
@startuml SAD_DataView
skinparam backgroundColor white
skinparam classAttributeIconSize 0

class FileInput {
  +name: string
  +size: number
  +type: string
}

class ParseResult {
  +isValid: boolean
  +metadata: DICOMMetadata
  +pixelData: ArrayBuffer
  +errors: ParseError[]
  +warnings: ParseWarning[]
}

class DICOMMetadata {
  +rows: number
  +columns: number
  +bitsAllocated: number
  +pixelRepresentation: number
  +transferSyntaxUID: string
  +patientInfo: MaskedPatientInfo
  +imageInfo: ImageInfo
  +sliceInfo: SliceInfo
}

class MaskedPatientInfo {
  +patientName: string [REDACTED]
  +patientID: string [REDACTED]
  +patientBirthDate: string [REDACTED]
  +studyDate: string
  +modality: string
}

class ImageInfo {
  +rows: number
  +columns: number
  +bitsAllocated: number
  +bitsStored: number
  +highBit: number
  +pixelRepresentation: number
  +samplesPerPixel: number
  +photometric: string
}

class SliceInfo {
  +numberOfFrames: number
  +sliceThickness: number
  +pixelSpacing: [number, number, number]
  +imagePositionPatient: [number, number, number]
}

class VolumeData {
  +voxelArray: TypedArray
  +width: number
  +height: number
  +depth: number
  +dataType: string
  +windowLevel: number
  +windowWidth: number
}

class PhiStore {
  -store: WeakMap
  +setPhiValue(key, value): void
  +getPhiValue(key): string | undefined
  +hasPhi(key): boolean
}

class ParseError {
  +code: string
  +message: string
  +userMessage: string
}

class ParseWarning {
  +code: string
  +message: string
  +userMessage: string
}

FileInput --> ParseResult : parseDICOM()
ParseResult *-- DICOMMetadata
ParseResult *-- ParseError
ParseResult *-- ParseWarning
DICOMMetadata *-- MaskedPatientInfo
DICOMMetadata *-- ImageInfo
DICOMMetadata *-- SliceInfo
DICOMMetadata --> PhiStore : PHI 원본 참조
ParseResult --> VolumeData : 변환

note right of PhiStore
  WeakMap 기반 저장
  가비지 컬렉션 대상
  모듈 외부 접근 불가
  (NFR-2.1, NFR-2.3)
end note

note bottom of VolumeData
  TypedArray 종류:
  Uint8Array (8-bit)
  Int16Array/Uint16Array (16-bit)
  Float32Array (기타)
  (FR-2.1)
end note

@enduml
{code}

*데이터 생명주기*

- *로드 단계*: File API -> ArrayBuffer -> DICOM 태그 파싱 -> DICOMMetadata + pixelData 구성
- *변환 단계*: pixelData -> TypedArray (FR-2.1) -> VolumeData 구조체
- *렌더링 단계*: VolumeData + WL/WW 파라미터 -> 정규화/클램핑 -> ImageData -> Canvas
- *해제 단계*: 세션 종료 또는 새 파일 로드 시 기존 ArrayBuffer/TypedArray 자동 GC, WeakMap의 PhiStore도 GC 대상

*데이터 보호 메커니즘*

- PHI 원본 데이터는 WeakMap(PhiStore)에 저장되어 모듈 외부에서 직접 접근 불가 (FR-3.2)
- 사용자에게 표시되는 환자 정보는 모두 [REDACTED] 마스킹 적용 (FR-3.1)
- 네트워크 전송이 없으므로 데이터 유출 경로 원천 차단 (NFR-2.2)
- 세션 종료 시 GC에 의해 메모리 자동 해제, 잔류 데이터 없음 (NFR-2.3)

---

*[SAD-06] 기술 스택 및 구성 요소*

*프로그래밍 언어 및 런타임*

|| 항목 || 기술 || 버전 || 선택 근거 ||
| 언어 | JavaScript (ES2020+) | ES2020 | Class A 단순성 요구, 빌드 파이프라인 최소화, 브라우저 네이티브 지원 |
| 런타임 | 웹 브라우저 | Chrome 90+ 등 | 별도 런타임 설치 불필요, 크로스 플랫폼 지원 |
| 모듈 시스템 | ES Modules | native | 브라우저 네이티브 import/export, 번들러 불필요 |

*프레임워크 및 라이브러리*

|| 항목 || 기술 || 버전 || 선택 근거 ||
| UI 프레임워크 | Vanilla JS (프레임워크 없음) | - | Class A 단순성, 외부 의존성 최소화, 검증 범위 축소 |
| 렌더링 | Canvas 2D API | native | MPR 영상 렌더링에 적합, ImageData 직접 조작 가능 |
| 파일 입출력 | File API / FileReader | native | 브라우저 표준 로컬 파일 읽기, 비동기 지원 |
| 바이너리 처리 | ArrayBuffer / DataView / TypedArray | native | DICOM 바이너리 파싱에 필수, 엔디안 처리 지원 |

*미들웨어 및 인프라*

|| 항목 || 기술 || 설명 ||
| 웹 서버 | 정적 파일 서버 | 개발/배포용 (nginx, GitHub Pages 등). 런타임에 서버 불필요 |
| 빌드 도구 | 없음 (네이티브 ES Modules) | 번들링/트랜스파일 없이 브라우저 직접 실행 |
| 데이터베이스 | 없음 | 영구 저장소 불필요, 모든 데이터 메모리에만 존재 |

*보안 기술 요소*

|| 항목 || 기술 || 선택 근거 ||
| CSP | Content-Security-Policy: connect-src none | 외부 네트워크 통신 원천 차단 (NFR-2.2) |
| PHI 보호 | WeakMap + 모듈 스코프 | 외부 접근 불가한 PHI 저장소 (FR-3.2, NFR-2.1) |
| 데이터 잔류 방지 | GC 의존 (WeakMap + 세션 종료) | 브라우저 세션 종료 시 자동 해제 (NFR-2.3) |

*기술 선택의 Class A 적합성*

- IEC 62304 Class A는 소프트웨어의 단순성을 요구하므로, 외부 프레임워크/라이브러리 최소화가 핵심 기준
- Vanilla JS + Canvas 2D API 조합은 검증 가능한 코드 범위를 최소화하고, 빌드 파이프라인 복잡도를 제거
- ES Modules 네이티브 사용으로 번들러(Webpack, Vite 등) 도입 불필요
- 네이티브 API만 사용하므로 서드파티 라이브러리의 보안 취약점 영향 없음

---

*[SAD-07] 아키텍처 결정 근거 (ADR) 요약*

본 섹션은 SAD에서 수행한 주요 아키텍처 결정사항을 요약한다.
각 결정의 상세 내용은 독립적인 ADR 티켓으로 분해되어 관리된다.

*ADR 목록 및 요약*

|| ADR ID || 결정 사항 || 요약 || 관련 컴포넌트 || 관련 FR/NFR ||
| ADR-1 | Layered Architecture 채택 | 3-계층(Presentation, Business Logic, Data Access) 아키텍처로 관심사 분리. Class A 단순성 요구에 부합 | 전체 시스템 | FR 전체, NFR-4.1 |
| ADR-2 | 오프라인 전용 아키텍처 | 네트워크 통신 전무, CSP connect-src none으로 외부 통신 차단. 서버 인프라 불필요 | PhiGuard, 전체 시스템 | NFR-2.2, NFR-4.2 |
| ADR-3 | Vanilla JS + Canvas 2D | 외부 프레임워크 없이 네이티브 API만 사용. Class A 검증 범위 최소화 | MprRenderer, UiController | NFR-4.1 |
| ADR-4 | 메모리 내 데이터 처리 | 영구 저장소 없이 브라우저 메모리에만 데이터 보관. 세션 종료 시 자동 해제 | DicomParser, PhiGuard | NFR-2.3, NFR-1.3 |
| ADR-5 | WeakMap 기반 PHI 보호 | 모듈 스코프 + WeakMap으로 PHI 원본 접근 제어. GC 친화적 설계 | PhiGuard | FR-3.1, FR-3.2, NFR-2.1 |
| ADR-6 | 단일 스레드 처리 모델 | Web Worker 없이 메인 스레드에서 순차 처리. Class A 단순성 확보 | 전체 시스템 | NFR-4.1 |

*ADR 추적성 매트릭스*

|| ADR ID || 구현 컴포넌트 || FR/NFR 티켓 키 ||
| ADR-1 | COMP-1~7 전체 | PLAYG-1641~1681 (FR/NFR 전체) |
| ADR-2 | COMP-5 (PhiGuard) | PLAYG-1674, PLAYG-1680 |
| ADR-3 | COMP-4, COMP-6 | PLAYG-1679 |
| ADR-4 | COMP-1, COMP-5 | PLAYG-1672, PLAYG-1675 |
| ADR-5 | COMP-5 (PhiGuard) | PLAYG-1656, PLAYG-1657, PLAYG-1673 |
| ADR-6 | 전체 시스템 | PLAYG-1679 |
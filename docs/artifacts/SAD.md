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
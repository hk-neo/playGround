
---

*[SAD-02] 논리적 뷰 (Logical View)*

*시스템 컴포넌트 구성*

DentiView3D는 7개의 핵심 컴포넌트로 구성된다:

|| 컴포넌트 || ID || 계층 || 책임 ||
| DicomParser | COMP-1.1 | Business Logic | DICOM 파일 전체 파싱 오케스트레이션 |
| ValidationModule | COMP-1.2 | Business Logic | 파일 형식 및 데이터 무결성 검증 |
| MetadataParser | COMP-1.3 | Business Logic | DICOM 메타데이터 추출 및 구조화 |
| PhiGuard | COMP-1.4 | Business Logic | PHI 데이터 보호 및 접근 제어 |
| MprRenderer | COMP-2.1 | Presentation | 3단면 MPR 영상 렌더링 및 상호작용 |
| UiController | COMP-2.2 | Presentation | UI 이벤트 처리 및 상태 관리 |
| ErrorManager | COMP-2.3 | Presentation | 에러 코드 관리 및 사용자 메시지 생성 |

*논리 아키텍처 다이어그램*

{code}
@startuml SAD_LogicalView
skinparam componentStyle rectangle
skinparam backgroundColor white

package "Presentation Layer" as PL {
  [UiController
(COMP-2.2)] as UI
  [MprRenderer
(COMP-2.1)] as MPR
  [ErrorManager
(COMP-2.3)] as ERR
}

package "Business Logic Layer" as BLL {
  [DicomParser
(COMP-1.1)] as PARSER
  [ValidationModule
(COMP-1.2)] as VALID
  [MetadataParser
(COMP-1.3)] as META
  [PhiGuard
(COMP-1.4)] as PHI
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
  단위 테스트 coverage 달성
  정적 분석 적용
end note

@enduml
{code}

*컴포넌트 간 인터페이스 정의*

|| 인터페이스 || 제공 컴포넌트 || 소비 컴포넌트 || 설명 ||
| parseDICOM(file: File) -> ParseResult | DicomParser | UiController | DICOM 파일 전체 파싱 결과 반환 |
| validateMagicByte(buf) -> boolean | ValidationModule | DicomParser | DICOM 매직 바이트 검증 |
| validateTransferSyntax(uid) -> boolean | ValidationModule | DicomParser | 전송 구문 지원 여부 확인 |
| validateFileSize(size) -> boolean | ValidationModule | DicomParser | 파일 크기 제한 검증 |
| parseMetaGroup(buf) -> MetaGroup | MetadataParser | DicomParser | 파일 메타 정보 그룹 파싱 |
| parseMetadata(ctx) -> DICOMMetadata | MetadataParser | DicomParser | 전체 데이터셋 태그 파싱 |
| parsePixelData(buf, meta) -> ArrayBuffer | MetadataParser | DicomParser | 픽셀 데이터 추출 |
| maskPhiFields(metadata) -> Metadata | PhiGuard | MetadataParser | PHI 필드 마스킹 처리 |
| renderSlice(viewport, data, idx) -> void | MprRenderer | UiController | 단일 슬라이스 렌더링 |
| handleError(code) -> UserMessage | ErrorManager | UiController | 에러 코드를 사용자 메시지로 변환 |
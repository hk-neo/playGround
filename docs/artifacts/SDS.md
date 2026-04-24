*소프트웨어 상세 설계서 (SDS)*

*프로젝트: DentiView3D - 웹 기반 CBCT 영상 뷰어*
*버전: 0.1.0 | 작성일: 2026-04-24*
*추적 티켓: PLAYG-1462*
*소프트웨어 안전 등급: IEC 62304 Class A*

---

**[SDS-01] 설계 범위**

*목적*

본 문서는 DentiView3D(v0.1.0) 웹 기반 CBCT 영상 뷰어의 소프트웨어 상세 설계를 정의한다. SAD(PLAYG-1766)에서 정의한 7개 컴포넌트(COMP-1~COMP-7)의 내부 모듈 구조, 함수 인터페이스, 데이터 구조, 알고리즘 및 제어 흐름을 상세화한다. 본 SDS는 IEC 62304:2006+A1:2015 제5.4항(소프트웨어 상세 설계) 요구사항에 따라 작성되었다.

*적용 범위*

- 제품명: DentiView3D - CBCT Viewer (Local Only)
- 버전: v0.1.0
- 소프트웨어 안전 등급: Class A (IEC 62304 제4.3항)
- 대상: SAD에서 정의된 7개 컴포넌트의 상세 설계
- 제외: 네트워크 통신, 서버 연결, 진단 기능

*참조 문서*

|| 문서 || 티켓 키 || 설명 ||
|| SRS || PLAYG-1460 || 소프트웨어 요구사항 명세서 ||
|| SAD || PLAYG-1766 || 소프트웨어 아키텍처 설계 ||
|| RMR || PLAYG-1459 || 위험 관리 보고서 (17개 Hazard) ||
|| SDS || PLAYG-1462 || 본 문서 ||

*추적성 매트릭스 (FR -> SDS 설계 항목)*

|| SRS FR || 명칭 || SDS 설계 항목 || 관련 컴포넌트 ||
|| FR-1.1 || DICOM 매직 바이트 검증 || SDS-3.2 ValidationModule || COMP-2 (PLAYG-1774) ||
|| FR-1.2 || 전송 구문 검증 || SDS-3.2 ValidationModule || COMP-2 (PLAYG-1774) ||
|| FR-1.3 || 필수 DICOM 태그 검증 || SDS-3.2 ValidationModule || COMP-2 (PLAYG-1774) ||
|| FR-1.4 || 파일 크기 사전 검증 || SDS-3.2 ValidationModule || COMP-2 (PLAYG-1774) ||
|| FR-1.5 || 픽셀 데이터 길이 검증 || SDS-3.3 MetadataParser || COMP-3 (PLAYG-1775) ||
|| FR-1.6 || 최소 파일 크기 검증 || SDS-3.2 ValidationModule || COMP-2 (PLAYG-1774) ||
|| FR-1.7 || 로컬 파일 입력 || SDS-3.6 UiController || COMP-6 (PLAYG-1778) ||
|| FR-1.8 || 동일 파일 재선택 || SDS-3.6 UiController || COMP-6 (PLAYG-1778) ||
|| FR-2.1 || 파일 메타 그룹 파싱 || SDS-3.3 MetadataParser || COMP-3 (PLAYG-1775) ||
|| FR-2.2 || 데이터셋 태그 순차 파싱 || SDS-3.3 MetadataParser || COMP-3 (PLAYG-1775) ||
|| FR-2.3 || 필수/선택 메타데이터 추출 || SDS-3.3 MetadataParser || COMP-3 (PLAYG-1775) ||
|| FR-2.4 || 태그 파싱 무한 루프 방지 || SDS-3.3 MetadataParser || COMP-3 (PLAYG-1775) ||
|| FR-2.5 || 시퀀스 중첩 깊이 제한 || SDS-3.3 MetadataParser || COMP-3 (PLAYG-1775) ||
|| FR-2.6 || 버퍼 범위 초과 읽기 방지 || SDS-3.3 MetadataParser || COMP-3 (PLAYG-1775) ||
|| FR-2.7 || 선택 태그 누락 UI 처리 || SDS-3.6 UiController || COMP-6 (PLAYG-1778) ||
|| FR-3.1 || 복셀 데이터 타입 변환 || SDS-3.4 MprRenderer || COMP-4 (PLAYG-1777) ||
|| FR-3.2 || 3단면 MPR 렌더링 || SDS-3.4 MprRenderer || COMP-4 (PLAYG-1777) ||
|| FR-3.3 || Window Level/Width 조절 || SDS-3.4 MprRenderer || COMP-4 (PLAYG-1777) ||
|| FR-3.4 || 슬라이스 인덱스 범위 보정 || SDS-3.4 MprRenderer || COMP-4 (PLAYG-1777) ||
|| FR-3.5 || 볼륨 데이터 구성 || SDS-3.4 MprRenderer || COMP-4 (PLAYG-1777) ||
|| FR-3.6 || WL/WW 픽셀 매핑 || SDS-3.4 MprRenderer || COMP-4 (PLAYG-1777) ||
|| FR-3.7 || 초기 슬라이스 중간 위치 설정 || SDS-3.4 MprRenderer || COMP-4 (PLAYG-1777) ||
|| FR-4.1 || PHI 필드 마스킹 || SDS-3.5 PhiGuard || COMP-5 (PLAYG-1776) ||
|| FR-4.2 || PHI 원본 접근 제어 || SDS-3.5 PhiGuard || COMP-5 (PLAYG-1776) ||
|| FR-4.3 || dumpPhiValues 미노출 || SDS-3.5 PhiGuard || COMP-5 (PLAYG-1776) ||
|| FR-4.4 || CSP 정책 적용 || SDS-3.6 UiController || COMP-6 (PLAYG-1778) ||
|| FR-4.5 || 디버그 정보 내부 구조 노출 금지 || SDS-3.7 ErrorManager || COMP-7 (PLAYG-1779) ||
|| FR-5.1 || 구조화된 에러 코드 || SDS-3.7 ErrorManager || COMP-7 (PLAYG-1779) ||
|| FR-5.2 || 사용자 친화적 에러 메시지 || SDS-3.7 ErrorManager || COMP-7 (PLAYG-1779) ||
|| FR-5.3 || 로딩 상태 표시 || SDS-3.6 UiController || COMP-6 (PLAYG-1778) ||
|| FR-5.4 || 진단 목적 아님 명시 || SDS-3.6 UiController || COMP-6 (PLAYG-1778) ||
|| FR-5.5 || 메타데이터 패널 표시 || SDS-3.6 UiController || COMP-6 (PLAYG-1778) ||

---

**[SDS-02] 소프트웨어 구조**

*모듈 구성 개요*

DentiView3D는 SAD(PLAYG-1766)에서 정의한 3-Tier Layered Architecture에 따라 7개의 핵심 컴포넌트로 구성된다. 각 컴포넌트는 단일 파일 모듈(ES Module)로 구현되며, 계층 간 의존성은 단방향(상향)으로 제한된다.

*파일 시스템 구조*

{code}
src/
  index.js               -- 애플리케이션 진입점, barrel 파일
  main.js                -- 초기화 및 DI 컨테이너 (COMP-6 일부)
  components/
    dicomParser.js        -- DicomParser (COMP-1)
    validationModule.js   -- ValidationModule (COMP-2)
    metadataParser.js     -- MetadataParser (COMP-3)
    mprRenderer.js        -- MprRenderer (COMP-4)
    phiGuard.js           -- PhiGuard (COMP-5)
    uiController.js       -- UiController (COMP-6)
    errorManager.js       -- ErrorManager (COMP-7)
  constants/
    dicomConstants.js     -- DICOM 매직 바이트, 태그 ID, 전송 구문 UID 상수
    errorCodes.js         -- 에러 코드 및 메시지 상수
  types/
    dicomTypes.js         -- JSDoc 타입 정의 (ParseResult, DICOMMetadata 등)
{code}

*컴포넌트 구조 다이어그램*

{code}
@startuml SDS_ComponentStructure
skinparam componentStyle rectangle
skinparam backgroundColor white
skinparam packageStyle rectangle

package "Presentation Layer" {
  [UiController] as UI <<COMP-6>>
  [MprRenderer] as MPR <<COMP-4>>
  [ErrorManager] as ERR <<COMP-7>>
}

package "Business Logic Layer" {
  [DicomParser] as PARSER <<COMP-1>>
  [ValidationModule] as VALID <<COMP-2>>
  [MetadataParser] as META <<COMP-3>>
  [PhiGuard] as PHI <<COMP-5>>
}

package "Constants" {
  [dicomConstants] as CONST
  [errorCodes] as ERR_CONST
}

UI --> PARSER : parseDICOM(file)
UI --> MPR : render / buildVolume
UI --> ERR : handleError(code)
PARSER --> VALID : validate*(buf|size|uid)
PARSER --> META : parse*(buf|ctx)
META --> PHI : mask / get
PARSER --> CONST : 상수 참조
ERR --> ERR_CONST : 에러 코드 참조

note right of PARSER : 오케스트레이터\nFR-1, FR-2 군
note right of VALID : 검증 전담\nFR-1.1~FR-1.4, FR-1.6
note right of META : 파싱 전담\nFR-2.1~FR-2.6, FR-1.5
note right of PHI : PHI 보호\nFR-4.1~FR-4.3
note right of MPR : 렌더링 전담\nFR-3.1~FR-3.7
note right of UI : UI 제어\nFR-1.7~FR-1.8, FR-5.3~FR-5.5
note right of ERR : 에러 관리\nFR-5.1~FR-5.2, FR-4.5
@enduml
{code}

*의존성 규칙*

- Presentation Layer는 Business Logic Layer에만 의존 (하향 금지)
- Business Logic Layer는 Constants에만 의존 (다른 비즈니스 컴포넌트 간 순환 참조 금지)
- DicomParser는 ValidationModule, MetadataParser를 호출하는 오케스트레이터 역할
- PhiGuard는 MetadataParser에 의해서만 호출됨 (직접 외부 노출 금지, FR-4.3)
- Constants 모듈은 모든 계층에서 참조 가능 (순수 데이터, 부작용 없음)

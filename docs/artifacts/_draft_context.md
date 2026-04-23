# PLAYG-1462 문서 작성용 컨텍스트

## 현재 티켓
- **Key**: PLAYG-1462
- **Summary**: [SDS]
- **Type**: Document

## 연결된 티켓 요약
- PA 문서: 0개
- EA 문서: 1개
- Hazard: 17개
- Gate: 1개
- Document: 2개
- 기타: 41개
- **총 62개** 티켓 연결됨

## Hazard 티켓
- **PLAYG-1496**: [HAZ-1.1] 비 DICOM 파일 입력
- **PLAYG-1497**: [HAZ-1.2] 미지원 전송 구문 파일
- **PLAYG-1498**: [HAZ-1.3] 필수 DICOM 태그 누락
- **PLAYG-1499**: [HAZ-1.4] 초대형 파일 메모리 과부하
- **PLAYG-1500**: [HAZ-1.5] 픽셀 데이터 길이 불일치
- ... 외 12개

## EA 기존 문서 티켓
- **PLAYG-1460**: [SRS] DentiView3D 소프트웨어 요구사항 명세서

## EA 문서 내용 (workspace/docs/artifacts/)

### SRS.md
*소프트웨어 요구사항 명세서 (SRS)*

*프로젝트: DentiView3D - 웹 기반 CBCT 영상 뷰어*
*버전: 0.1.0 | 작성일: 2026-04-22*
*추적 티켓: PLAYG-1460*
*소프트웨어 안전 등급: IEC 62304 Class A*

---

*[SRS-01] 목적 및 범위*

*목적*

본 문서는 DentiView3D(v0.1.0) 웹 기반 CBCT 영상 뷰어의 소프트웨어 요구사항을 정의한다.
DentiView3D는 로컬 파일만 읽어서 렌더링하는 치과용 CBCT 영상 뷰어로,
네트워크 통신 및 서버 연결이 없는 독립 실행형 웹 애플리케이션이다.
본 SRS는 IEC 62304:2006+A1:2015 제5장 요구사항에 따라 작성되었다.

*적용 범위*

- 제품명: DentiView3D - CBCT Viewer (Local Only)
- 버전: v0.1.0
- 소프트웨어 안전 등급: Class A (IEC 62304 제4.3항)
- 대상 플랫폼: 현대 웹 브라우저 (Chrome 90+)
- 제외: 네트워크 통신, 서버 연결, 진단 기능

*참조 문서*

|| 문서 || 티켓 키 || 설명 ||
|| RMR || PLAYG-1459 || 위험 관리 보고서 (17개 Hazard 식별) ||
|| SAD || PLAYG-1461 || 소프트웨어 아키텍처 설계 ||
|| SDS || PLAYG-1462 || 소프트웨어 상세 설계 ||
|| EA Gate || PLAYG-1458 || 엔지니어링 활동 게이트 ||
|| SRS || PLAYG-1460 || 본 문서 ||

*적용 표준*
- IEC 62304:2006+A1:2015 (의료기기 소프트웨어 생명주기)
- ISO 14971:2019 (의료기기 위험 관리)
- DICOM PS3.5 (데이터 구조 및 인코딩)
- DICOM PS3.10 (파일 형식 및 디렉토리 구조)

---

*[SRS-02] 용어 정의*

|| 용어 || 정의 ||
|| CBCT || Cone Beam Computed Tomography, 원빔 단층촬영 ||
|| DICOM || Digital Imaging and Communications in Medicine, 의료영상 표준 규격 ||
|| MPR || Multi-Planar Reconstruction, 다단면 재구성 ||
|| WL || Window Level, 영상 밝기 조절 중심값 ||
|| WW || Window Width, 영상 명암 조절 범위 ||
|| PHI || Protected Health Information, 보건정보 보호 대상 ||
|| VR || Value Representation, DICOM 데이터 타입 표기 ||
|| 전송 구문 || Transfer Syntax, DICOM 데이터 인코딩 방식 지정 ||
|| 복셀 || Voxel, 3차원 영상의 체적 픽셀 단위 ||
|| Class A || IEC 62304 소프트웨어 안전 등급 중 최저등급 (비생명 위협) ||
|| 프리앰블 || DICOM 파일 선두 128바이트 예약 영역 ||
|| 매직 바이트 || DICOM 파일 오프셋 128~131의 DICM 시그니처 ||

---

*[SRS-03] 전체 설명*

*제품 관점*

DentiView3D는 치과용 CBCT 영상을 로컬 파일 시스템에서 로드하여
웹 브라우저 상에서 3단면(Axial, Coronal, Sagittal) MPR 뷰를 제공하는
독립 실행형 웹 애플리케이션이다.
진단 목적이 아닌 영상의 시각적 확인 및 품질 검토용 보조 도구이다.

*사용자 클래스*

|| 사용자 유형 || 설명 || 권한 ||
|| 치과의사 || CBCT 영상 품질 검토 및 확인 || 파일 로드, 영상 조절 ||
|| 방사선사 || 영상 촬영 후 품질 확인 || 파일 로드, 영상 조절 ||
|| 일반 사용자 || 영상 시각적 확인 || 파일 로드, 영상 조절 ||

*운영 환경*

- 런타임: 현대 웹 브라우저 (Chrome 90+)
- 렌더링: HTML5 Canvas 2D API
- 파일 시스템: 브라우저 File API (로컬 파일만)
- 네트워크: 연결 불필요 (오프라인 동작)
- 보안: CSP(Content-Security-Policy) 적용, connect-src none

*제약 조건*

- 로컬 파일만 처리 (네트워크 통신 금지)
- 비압축 DICOM 전송 구문만 지원 (3종)
- 단일 파일 또는 폴더 단위 로드
- 브라우저 메모리 제약 (최대 512MB 파일)
- 진단 목적 아님 (UI에 명시)

---

*[SRS-04] 기능 요구사항 (FR)*

*[FR-1군] 파일 입력 및 검증*

|| ID || 명칭 || 상세 설명 || 우선순위 || 근거 ||
|| FR-1.1 || DICOM 매직 바이트 검증 || 파일 오프셋 128~131이 DICM인지 확인하여 DICOM Part 10 파일 여부 검증. 유효하지 않으면 PARSE_ERR_INVALID_MAGIC 에러 반환 || 필수 || HAZ-1.1, RMR-03 ||
|| FR-1.2 || 전송 구문 검증 || 파일 메타 정보의 전송 구문 UID가 지원 목록(Explicit VR LE, Implicit VR LE, Explicit VR BE)에 포함되는지 검증. 미지원 시 PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX 에러 반환 || 필수 || HAZ-1.2, RMR-03 ||
|| FR-1.3 || 필수 DICOM 태그 검증 || Rows, Columns, BitsAllocated, PixelRepresentation 필수 태그 존재 여부 확인. 누락 시 PARSE_ERR_MISSING_REQUIRED_TAG 에러 반환 || 필수 || HAZ-1.3, RMR-03 ||
|| FR-1.4 || 파일 크기 사전 검증 || 파일 크기가 512MB(MAX_FILE_SIZE) 초과 여부를 메모리 로딩 전에 확인. 초과 시 PARSE_ERR_FILE_TOO_LARGE 에러 반환 || 필수 || HAZ-1.4, RMR-03 ||
|| FR-1.5 || 픽셀 데이터 길이 검증 || 메타데이터 명시 길이와 실제 픽셀 데이터 길이를 비교하여 불일치 시 경고 발생 및 Math.min으로 범위 보정 || 보통 || HAZ-1.5, RMR-03 ||
|| FR-1.6 || 최소 파일 크기 검증 || 파일 크기가 132바이트(DICOM_MIN_FILE_SIZE) 미만인 경우 유효하지 않은 파일로 처리 || 필수 || HAZ-1.1 ||
|| FR-1.7 || 로컬 파일 입력 || 사용자가 파일 선택(File input) 또는 폴더 선택(webkitdirectory)으로 DICOM 파일을 로드. accept 속성으로 .dcm, .dicom 필터링 || 필수 || IU 제품 목적 ||
|| FR-1.8 || 동일 파일 재선택 || 동일 파일 재선택 시 브라우저 change 이벤트 미발생 문제를 event.target.value 초기화로 해결 || 보통 || HAZ-4.3, RMR-03 ||

*[FR-2군] 메타데이터 파싱*

|| ID || 명칭 || 상세 설명 || 우선순위 || 근거 ||
|| FR-2.1 || 파일 메타 그룹 파싱 || DICOM 파일 메타 정보 그룹(0002)을 파싱하여 전송 구문 UID 등 추출. 메타 그룹은 항상 Explicit VR Little Endian || 필수 || HAZ-1.2, DICOM PS3.10 ||
|| FR-2.2 || 데이터셋 태그 순차 파싱 || ParseContext를 이용하여 DICOM 데이터셋의 태그를 순차적으로 읽기. Explicit/Implicit VR 모드 자동 감지 || 필수 || HAZ-1.3, RMR-03 ||
|| FR-2.3 || 필수/선택 메타데이터 추출 || METADATA_TAGS에 정의된 15개 필드(환자정보, 영상 파라미터 등)를 추출. 필수 태그 누락 시 에러, 선택 태그 누락 시 기본값 사용 || 필수 || HAZ-1.3, RMR-03 ||
|| FR-2.4 || 태그 파싱 무한 루프 방지 || 태그 순회 중 MAX_TAG_COUNT(10000) 도달 시 강제 종료하여 무한 루프 방지 || 필수 || HAZ-5.1, RMR-03 ||
|| FR-2.5 || 시퀀스 중첩 깊이 제한 || 중첩 시퀀스가 MAX_SEQUENCE_DEPTH(10) 초과 시 해당 시퀀스 파싱 중단 || 보통 || HAZ-5.2, RMR-03 ||
|| FR-2.6 || 버퍼 범위 초과 읽기 방지 || 모든 DataView 읽기 전 hasRemaining()으로 버퍼 잔여 크기 확인. 범위 초과 시 안전한 파싱 중단 || 필수 || HAZ-5.3, RMR-03 ||
|| FR-2.7 || 선택 태그 누락 UI 처리 || 선택적 DICOM 태그가 파일에 존재하지 않을 때 UI에 대시(-)로 표시 || 낮음 || HAZ-4.1, RMR-03 ||

*[FR-3군] 영상 렌더링*

|| ID || 명칭 || 상세 설명 || 우선순위 || 근거 ||
|| FR-3.1 || 복셀 데이터 타입 변환 || bitsAllocated/8 바이트 단위에 따라 Uint8Array, Int16Array, Uint16Array, Float32Array로 복셀 데이터 변환 || 필수 || HAZ-2.1, RMR-03 ||
|| FR-3.2 || 3단면 MPR 렌더링 || Axial, Coronal, Sagittal 3단면을 HTML5 Canvas 2D API로 동시 렌더링 || 필수 || IU 제품 목적 ||
|| FR-3.3 || Window Level/Width 조절 || WL/WW 슬라이더를 통한 영상 밝기/명암 실시간 조절. WW 최소값 1 보장(Math.max(1, ww)) || 필수 || HAZ-2.2, RMR-03 ||
|| FR-3.4 || 슬라이스 인덱스 범위 보정 || 마우스 휠 및 슬라이더를 통한 슬라이스 이동 시 인덱스를 0~최대값으로 강제 보정 || 필수 || HAZ-2.3, RMR-03 ||
|| FR-3.5 || 볼륨 데이터 구성 || 파싱된 복셀 데이터를 3차원 볼륨(w,h,d)으로 구성하고 픽셀 간격(spacing) 정보 보존 || 필수 || IU 제품 목적 ||
|| FR-3.6 || WL/WW 픽셀 매핑 || WL/WW 값에 따라 복셀 값을 0~255 그레이스케일로 정규화. 클램핑으로 범위 외값 처리 || 필수 || HAZ-2.2, RMR-03 ||
|| FR-3.7 || 초기 슬라이스 중간 위치 설정 || 파일 로드 완료 후 각 단면의 슬라이스를 중간 위치(frames/2, rows/2, cols/2)로 초기화 || 보통 || 사용성 ||

*[FR-4군] 보안 및 PHI 보호*

|| ID || 명칭 || 상세 설명 || 우선순위 || 근거 ||
|| FR-4.1 || PHI 필드 마스킹 || 환자명, 환자ID, 환자생년월일 PHI 필드를 [REDACTED]로 마스킹. 원본 값은 WeakMap에 안전 저장 || 필수 || HAZ-3.1, SEC-3 ||
|| FR-4.2 || PHI 원본 접근 제어 || 마스킹된 원본 PHI 값은 getPhiValue() 함수로만 접근 가능. 모듈 외부 직접 접근 차단 || 필수 || HAZ-3.2, SEC-3 ||
|| FR-4.3 || dumpPhiValues 미노출 || 배럴 파일(index.js)에서 dumpPhiValues 함수를 미노출하여 비인가 외부 접근 차단 || 필수 || HAZ-3.2, SEC-3 ||
|| FR-4.4 || CSP 정책 적용 || Content-Security-Policy 헤더로 connect-src none 설정. 네트워크 통신 원천 차단 || 필수 || 보안 요구사항 ||
|| FR-4.5 || 디버그 정보 내부 구조 노출 금지 || 에러 처리 시 offset, tag 등 내부 파싱 구조 정보를 사용자 메시지에 노출하지 않음 || 보통 || HAZ-3.1, SEC-3 ||

*[FR-5군] 오류 처리 및 UI*

|| ID || 명칭 || 상세 설명 || 우선순위 || 근거 ||
|| FR-5.1 || 구조화된 에러 코드 || 7종 에러 코드(INVALID_MAGIC, UNSUPPORTED_TRANSFER_SYNTAX, MISSING_REQUIRED_TAG, PIXEL_DATA_EXTRACTION, FILE_READ, FILE_TOO_LARGE, UNEXPECTED) 정의 || 필수 || HAZ-1.1, RMR-03 ||
|| FR-5.2 || 사용자 친화적 에러 메시지 || 에러 코드별 한국어/영어 메시지 제공. 내부 구조 노출 없이 사용자가 이해 가능한 메시지 표시 || 필수 || HAZ-1.1, 사용성 ||
|| FR-5.3 || 로딩 상태 표시 || 파일 로딩 중 상태바(status-bar)에 진행 상태 표시. 타입별(loading, success, error) 시각적 구분 || 보통 || HAZ-4.2, RMR-03 ||
|| FR-5.4 || 진단 목적 아님 명시 || UI에 본 뷰어는 진단 목적이 아닌 영상의 시각적 확인 및 품질 검토용 보조 도구임을 명시 || 필수 || Class A 분류 근거 ||
|| FR-5.5 || 메타데이터 패널 표시 || 파일 로드 완료 후 환자정보, 영상 크기, 슬라이스 수, 픽셀 간격, 전송 구문 등 메타데이터를 패널에 표시 || 보통 || 사용성 ||

---

*[SRS-05] 비기능 요구사항 (NFR)*

|| ID || 명칭 || 상세 설명 || 우선순위 || 근거 ||
|| NFR-1 || 성능 - 파일 로딩 || 100MB 이하 DICOM 파일 로딩 및 렌더링 완료까지 5초 이내 (일반적인 치과 CBCT 파일 기준) || 보통 || 사용성 ||
|| NFR-2 || 성능 - 슬라이스 렌더링 || 단일 슬라이스 렌더링 100ms 이내 (WL/WW 변경, 슬라이스 이동 시) || 보통 || 사용성 ||
|| NFR-3 || 신뢰성 - 메모리 안전성 || 512MB 초과 파일 로딩 시 브라우저 크래시 방지. 사전 검증으로 안전한 에러 처리 || 필수 || HAZ-1.4 ||
|| NFR-4 || 보안 - 오프라인 동작 || 네트워크 연결 없이 완전 동작. CSP connect-src none으로 외부 통신 차단 || 필수 || 보안 요구사항 ||
|| NFR-5 || 보안 - PHI 보호 || 환자 식별 정보(PHI)의 메모리 내 평문 노출 최소화. WeakMap 기반 보안 저장 || 필수 || HAZ-3.1, SEC-3 ||
|| NFR-6 || 호환성 - 브라우저 지원 || Chrome 90+, Edge 90+, Firefox 90+, Safari 15+ 지원 || 보통 || 사용성 ||
|| NFR-7 || 가용성 - 에러 복구 || 파일 파싱 실패 후에도 애플리케이션이 정상 동작하여 다른 파일 로드 가능 || 필수 || 신뢰성 ||
|| NFR-8 || 추적성 - 요구사항 추적 || 모든 FR/NFR이 PA 문서(IU, SyRS, Classification, RMR) 및 Hazard 티켓과 양방향 추적 가능 || 필수 || IEC 62304 제5.1 ||
|| NFR-9 || 규제 - Class A 준수 || IEC 62304 Class A 요구사항 준수. 단위 테스트, 코드 리뷰, 정적 분석으로 검증 || 필수 || IEC 62304 ||

---

*[SRS-06] 인터페이스 요구사항*

*UI 인터페이스*

|| ID || 명칭 || 상세 설명 ||
|| IF-1 || 파일 선택 버튼 || 상단 헤더에 DICOM 파일 열기 및 폴더 열기 버튼 배치 ||
|| IF-2 || 3단면 뷰포트 || Axial, Coronal, Sagittal 각각 Canvas 기반 뷰포트. 슬라이스 번호 및 전체 수 표시 ||
|| IF-3 || WL/WW 슬라이더 || Window Level 및 Window Width 조절용 슬라이더. 현재값 숫자 표시 ||
|| IF-4 || 슬라이스 슬라이더 || 각 단면별 슬라이스 위치 조절 슬라이더 ||
|| IF-5 || 상태바 || 파일 로딩 상태(loading/success/error) 및 프로그레스 바 표시 ||
|| IF-6 || 메타데이터 패널 || 환자명, 환자ID, 검사일, 모달리티, 영상 크기, 슬라이스 수, 픽셀 간격, 전송 구문 표시 ||
|| IF-7 || 환영 화면 || 초기 화면에 제품명, 설명, 진단 목적 아님 명시 ||

*소프트웨어 인터페이스*

|| ID || 명칭 || 상세 설명 ||
|| IF-8 || File API || 브라우저 File API를 통한 로컬 파일 읽기 ||
|| IF-9 || ArrayBuffer/DataView || DICOM 바이너리 데이터 파싱을 위한 ArrayBuffer 및 DataView 인터페이스 ||
|| IF-10 || Canvas 2D API || HTML5 Canvas 2D API를 통한 영상 렌더링 ||

*통신 인터페이스*

|| ID || 명칭 || 상세 설명 ||
|| IF-11 || 네트워크 통신 금지 || CSP connect-src none 설정으로 모든 네트워크 통신 차단. 오프라인 전용 동작 ||

---

*[SRS-07] 시스템 워크플로우 시나리오*

*시나리오 1: 정상 DICOM 파일 로드 및 렌더링*

{code}
@startuml
actor 사용자
participant "UI
(main.js)" as UI
participant "DICOM 파서
(parseDICOM.js)" as Parser
participant "검증 모듈" as Validator
participant "메타데이터 파서
(metadataParser.js)" as Meta
participant "픽셀 데이터 파서
(pixelDataParser.js)" as Pixel
participant "PHI 가드
(phiGuard.js)" as PHI
participant "MPR 렌더러" as Renderer

사용자 -> UI: DICOM 파일 선택
UI -> Parser: parseDICOM(file)
Parser -> Validator: 파일 크기 검증 (MAX_FILE_SIZE)
Validator --> Parser: 크기 유효
Parser -> Validator: 매직 바이트 검증 (validateMagicByte)
Validator --> Parser: DICM 유효
Parser -> Meta: 파일 메타 그룹 파싱 (parseMetaGroup)
Meta --> Parser: 전송 구문 UID
Parser -> Validator: 전송 구문 검증 (validateTransferSyntax)
Validator --> Parser: 지원 전송 구문 확인
Parser -> Meta: 데이터셋 태그 파싱 (parseMetadata)
Meta -> PHI: PHI 마스킹 (maskPhiFields)
PHI --> Meta: 마스킹된 메타데이터
Meta --> Parser: DICOMMetadata + 필수 태그 검증
Parser -> Pixel: 픽셀 데이터 추출 (parsePixelData)
Pixel --> Parser: 복셀 데이터 (ArrayBuffer)
Parser --> UI: ParseResult (isValid=true)
UI -> Renderer: 볼륨 데이터 구성 (buildVolumeData)
UI -> Renderer: 3단면 MPR 렌더링
Renderer --> 사용자: Axial/Coronal/Sagittal 영상 표시
@endumuml
{code}

*시나리오 2: 비정상 파일 입력 시 에러 처리*

{code}
@startuml
actor 사용자
participant "UI
(main.js)" as UI
participant "DICOM 파서
(parseDICOM.js)" as Parser
participant "검증 모듈" as Validator
participant "에러 처리
(handleParseError.js)" as ErrorHandler

alt 비 DICOM 파일
  사용자 -> UI: 비 DICOM 파일 선택
  UI -> Parser: parseDICOM(file)
  Parser -> Validator: 매직 바이트 검증
  Validator --> Parser: DICM 불일치
  Parser -> ErrorHandler: PARSE_ERR_INVALID_MAGIC
  ErrorHandler --> Parser: 사용자 친화적 메시지
  Parser --> UI: ParseResult (isValid=false, errors)
  UI --> 사용자: "유효한 DICOM 파일이 아닙니다." 에러 표시
else 미지원 전송 구문
  사용자 -> UI: JPEG 압축 DICOM 파일 선택
  UI -> Parser: parseDICOM(file)
  Parser -> Validator: 전송 구문 검증
  Validator --> Parser: 미지원 전송 구문
  Parser -> ErrorHandler: PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX
  ErrorHandler --> Parser: 사용자 친화적 메시지
  Parser --> UI: ParseResult (isValid=false, errors)
  UI --> 사용자: "지원하지 않는 전송 구문입니다." 에러 표시
else 초대형 파일
  사용자 -> UI: 1GB 파일 선택
  UI -> Parser: parseDICOM(file)
  Parser -> Validator: 파일 크기 검증
  Validator --> Parser: 512MB 초과
  Parser -> ErrorHandler: PARSE_ERR_FILE_TOO_LARGE
  ErrorHandler --> Parser: 사용자 친화적 메시지
  Parser --> UI: ParseResult (isValid=false, errors)
  UI --> 사용자: "파일 크기가 제한을 초과했습니다." 에러 표시
end

note over UI: 에러 후에도 애플리케이션 정상 동작
사용자 -> UI: 다른 파일 선택 가능
@endumuml
{code}

---

*[SRS-08] 추적성 매트릭스*

*PA 문서 - SRS 요구사항 매핑*

|| SRS ID || 명칭 || 관련 PA 문서 || 관련 Hazard ||
|| FR-1.1 || DICOM 매직 바이트 검증 || RMR(PLAYG-1459) || HAZ-1.1 (PLAYG-1496) ||
|| FR-1.2 || 전송 구문 검증 || RMR(PLAYG-1459) || HAZ-1.2 (PLAYG-1497) ||
|| FR-1.3 || 필수 DICOM 태그 검증 || RMR(PLAYG-1459) || HAZ-1.3 (PLAYG-1498) ||
|| FR-1.4 || 파일 크기 사전 검증 || RMR(PLAYG-1459) || HAZ-1.4 (PLAYG-1499) ||
|| FR-1.5 || 픽셀 데이터 길이 검증 || RMR(PLAYG-1459) || HAZ-1.5 (PLAYG-1500) ||
|| FR-1.6 || 최소 파일 크기 검증 || RMR(PLAYG-1459) || HAZ-1.1 (PLAYG-1496) ||
|| FR-1.7 || 로컬 파일 입력 || RMR(PLAYG-1459) || - ||
|| FR-1.8 || 동일 파일 재선택 || RMR(PLAYG-1459) || HAZ-4.3 (PLAYG-1509) ||
|| FR-2.1 || 파일 메타 그룹 파싱 || RMR(PLAYG-1459) || HAZ-1.2 (PLAYG-1497) ||
|| FR-2.2 || 데이터셋 태그 순차 파싱 || RMR(PLAYG-1459) || HAZ-1.3 (PLAYG-1498) ||
|| FR-2.3 || 필수/선택 메타데이터 추출 || RMR(PLAYG-1459) || HAZ-1.3 (PLAYG-1498) ||
|| FR-2.4 || 태그 파싱 무한 루프 방지 || RMR(PLAYG-1459) || HAZ-5.1 (PLAYG-1510) ||
|| FR-2.5 || 시퀀스 중첩 깊이 제한 || RMR(PLAYG-1459) || HAZ-5.2 (PLAYG-1511) ||
|| FR-2.6 || 버퍼 범위 초과 읽기 방지 || RMR(PLAYG-1459) || HAZ-5.3 (PLAYG-1512) ||
|| FR-2.7 || 선택 태그 누락 UI 처리 || RMR(PLAYG-1459) || HAZ-4.1 (PLAYG-1507) ||
|| FR-3.1 || 복셀 데이터 타입 변환 || RMR(PLAYG-1459) || HAZ-2.1 (PLAYG-1501) ||
|| FR-3.2 || 3단면 MPR 렌더링 || RMR(PLAYG-1459) || - ||
|| FR-3.3 || Window Level/Width 조절 || RMR(PLAYG-1459) || HAZ-2.2 (PLAYG-1502) ||
|| FR-3.4 || 슬라이스 인덱스 범위 보정 || RMR(PLAYG-1459) || HAZ-2.3 (PLAYG-1503) ||
|| FR-3.5 || 볼륨 데이터 구성 || RMR(PLAYG-1459) || - ||
|| FR-3.6 || WL/WW 픽셀 매핑 || RMR(PLAYG-1459) || HAZ-2.2 (PLAYG-1502) ||
|| FR-3.7 || 초기 슬라이스 중간 위치 설정 || RMR(PLAYG-1459) || - ||
|| FR-4.1 || PHI 필드 마스킹 || RMR(PLAYG-1459) || HAZ-3.1 (PLAYG-1505) ||
|| FR-4.2 || PHI 원본 접근 제어 || RMR(PLAYG-1459) || HAZ-3.2 (PLAYG-1506) ||
|| FR-4.3 || dumpPhiValues 미노출 || RMR(PLAYG-1459) || HAZ-3.2 (PLAYG-1506) ||
|| FR-4.4 || CSP 정책 적용 || RMR(PLAYG-1459) || - ||
|| FR-4.5 || 디버그 정보 내부 구조 노출 금지 || RMR(PLAYG-1459) || HAZ-3.1 (PLAYG-1505) ||
|| FR-5.1 || 구조화된 에러 코드 || RMR(PLAYG-1459) || HAZ-1.1 (PLAYG-1496) ||
|| FR-5.2 || 사용자 친화적 에러 메시지 || RMR(PLAYG-1459) || HAZ-1.1 (PLAYG-1496) ||
|| FR-5.3 || 로딩 상태 표시 || RMR(PLAYG-1459) || HAZ-4.2 (PLAYG-1508) ||
|| FR-5.4 || 진단 목적 아님 명시 || RMR(PLAYG-1459) || - ||
|| FR-5.5 || 메타데이터 패널 표시 || RMR(PLAYG-1459) || - ||
|| NFR-1 || 성능 - 파일 로딩 || RMR(PLAYG-1459) || - ||
|| NFR-2 || 성능 - 슬라이스 렌더링 || RMR(PLAYG-1459) || - ||
|| NFR-3 || 신뢰성 - 메모리 안전성 || RMR(PLAYG-1459) || HAZ-1.4 (PLAYG-1499) ||
|| NFR-4 || 보안 - 오프라인 동작 || RMR(PLAYG-1459) || - ||
|| NFR-5 || 보안 - PHI 보호 || RMR(PLAYG-1459) || HAZ-3.1 (PLAYG-1505) ||
|| NFR-6 || 호환성 - 브라우저 지원 || RMR(PLAYG-1459) || - ||
|| NFR-7 || 가용성 - 에러 복구 || RMR(PLAYG-1459) || - ||
|| NFR-8 || 추적성 - 요구사항 추적 || RMR(PLAYG-1459) || - ||
|| NFR-9 || 규제 - Class A 준수 || RMR(PLAYG-1459) || - ||

*Hazard 완화 추적 요약*

|| Hazard ID || 티켓 || 위험 명칭 || 완화 요구사항 ||
|| HAZ-1.1 || PLAYG-1496 || 비 DICOM 파일 입력 || FR-1.1, FR-1.6, FR-5.1, FR-5.2 ||
|| HAZ-1.2 || PLAYG-1497 || 미지원 전송 구문 파일 || FR-1.2, FR-2.1 ||
|| HAZ-1.3 || PLAYG-1498 || 필수 DICOM 태그 누락 || FR-1.3, FR-2.2, FR-2.3 ||
|| HAZ-1.4 || PLAYG-1499 || 초대형 파일 메모리 과부하 || FR-1.4, NFR-3 ||
|| HAZ-1.5 || PLAYG-1500 || 픽셀 데이터 길이 불일치 || FR-1.5 ||
|| HAZ-2.1 || PLAYG-1501 || 복셀 데이터 타입 변환 오류 || FR-3.1 ||
|| HAZ-2.2 || PLAYG-1502 || WL/WW 범위 초과 렌더링 || FR-3.3, FR-3.6 ||
|| HAZ-2.3 || PLAYG-1503 || 슬라이스 인덱스 범위 초과 || FR-3.4 ||
|| HAZ-2.4 || PLAYG-1504 || MPR 렌더링 메모리 부족 || NFR-3 ||
|| HAZ-3.1 || PLAYG-1505 || 환자 PHI 메모리 노출 || FR-4.1, FR-4.5, NFR-5 ||
|| HAZ-3.2 || PLAYG-1506 || PHI 원본 비인가 접근 || FR-4.2, FR-4.3 ||
|| HAZ-4.1 || PLAYG-1507 || 메타데이터 누락 필드 표시 오류 || FR-2.7 ||
|| HAZ-4.2 || PLAYG-1508 || 파일 로딩 진행률 부정확 || FR-5.3 ||
|| HAZ-4.3 || PLAYG-1509 || 동일 파일 재로딩 불가 || FR-1.8 ||
|| HAZ-5.1 || PLAYG-1510 || 태그 파싱 무한 루프 || FR-2.4 ||
|| HAZ-5.2 || PLAYG-1511 || 시퀀스 중첩 깊이 과다 || FR-2.5 ||
|| HAZ-5.3 || PLAYG-1512 || ArrayBuffer 범위 초과 읽기 || FR-2.6 ||


### SAD.md
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

### SystemRequirement.md
# System Requirement (Restored from Jira: PLAYG-1641)

## [SR-01]
[FR-1.1] DICOM 매직 바이트 검증

## [SR-02]
Functional

## [SR-03]
파일 오프셋 128~131의 4바이트가 DICM인지 확인. 불일치 시 PARSE_ERR_INVALID_MAGIC 에러 반환. 근거: HAZ-1.1, RMR-05

## [SR-04]
N/A

## [SR-05]
단위 테스트: validateMagicByte 함수에 정상/비정상 버퍼 입력 시 각각 true/false 반환 확인



## Architecture 티켓 상세 (Jira)

(ADR/COMP 티켓을 찾을 수 없습니다)

## 사용 가이드
상세 문서가 필요하면 Jira Toolkit을 사용하세요:
```bash
# 티켓 상세 조회
python3 .agents/runner/jira_toolkit.py fetch_linked <TICKET_KEY>

# 트리 조회
python3 .agents/runner/jira_toolkit.py fetch_tree <TICKET_KEY> --depth 3
```

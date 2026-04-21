*소프트웨어 요구사항 명세서 (Software Requirements Specification)*

*프로젝트: DentiView3D - 웹 기반 CBCT 영상 뷰어*
*버전: 0.1.0 | 작성일: 2026-04-21*
*추적 티켓: PLAYG-1460*
*소프트웨어 안전 등급: IEC 62304 Class A*

---

*[SRS-01] 목적 및 범위*

*목적*

본 SRS는 DentiView3D v0.1.0 웹 기반 CBCT 영상 뷰어의 소프트웨어 요구사항을 정의한다.
DentiView3D는 치과용 CBCT 영상을 로컬 파일에서 읽어 3단면(Axial, Coronal, Sagittal) MPR 영상으로 렌더링하는 독립 실행형 웹 애플리케이션이다.
본 제품은 진단 목적이 아닌 영상의 시각적 확인 및 품질 검토용 보조 도구로 분류된다.

*적용 범위*

- 로컬 DICOM CBCT 파일 파싱 및 렌더링 기능
- 3단면 MPR(Axial, Coronal, Sagittal) 영상 표시
- Window Level/Width 조절 기능
- 환자 식별 정보(PHI) 보호 기능
- DICOM 메타데이터 표시 기능
- 네트워크 통신 및 서버 연결 없는 독립 실행형 애플리케이션

*참조 문서*

|| 문서 || 티켓 || 설명 ||
|| RMR || PLAYG-1459 || 위험 관리 보고서 (17개 Hazard 식별, 8개 보통 수준 완화 조치) ||
|| SAD || PLAYG-1461 || 소프트웨어 아키텍처 설계 문서 ||
|| SDS || PLAYG-1462 || 소프트웨어 설계 명세서 ||
|| EA Gate || PLAYG-1458 || 상위 엔지니어링 분석 게이트 ||
|| SRS || PLAYG-1460 || 본 문서 ||

*적용 표준*
- IEC 62304:2006+A1:2015 (의료기기 소프트웨어 생명주기 프로세스)
- ISO 14971:2019 (의료기기 위험 관리)
- DICOM PS3.5~3.10 (DICOM 파일 포맷 및 전송 구문)

---

*[SRS-02] 용어 정의*

|| 용어 || 정의 ||
|| CBCT || Cone Beam Computed Tomography, 원뼐형 빔 컴퓨터 단층 촬영 ||
|| DICOM || Digital Imaging and Communications in Medicine, 의료 영상 표준 포맷 ||
|| MPR || Multi-Planar Reconstruction, 다단면 재구성 ||
|| WL/WW || Window Level/Window Width, 영상 밝기/대비 조절 파라미터 ||
|| PHI || Protected Health Information, 보호 대상 건강 정보 ||
|| VR || Value Representation, DICOM 데이터 타입 표기 ||
|| 전송 구문 || Transfer Syntax, DICOM 데이터 인코딩 방식 지정 ||
|| 매직 바이트 || Magic Byte, DICOM 파일 식별용 4바이트 시그니처(DICM) ||
|| 복셀 || Voxel, 3차원 영상의 최소 단위 요소 ||
|| Axial || 축상 단면, 환자 몸통에 수평인 단면 ||
|| Coronal || 관상 단면, 환자 정면에서 본 단면 ||
|| Sagittal || 시상 단면, 환자 측면에서 본 단면 ||
|| IEC 62304 Class A || 위해 가능성이 없거나 허용 가능한 수준의 소프트웨어 안전 등급 ||

---

*[SRS-03] 전체 설명*

*제품 관점*

DentiView3D는 순수 클라이언트 사이드 웹 애플리케이션으로, 서버 통신 없이 브라우저 내에서 완전히 동작한다.
사용자의 로컬 파일 시스템에서 DICOM 파일을 읽어 파싱하고, Canvas 2D API를 사용하여 3단면 MPR 영상을 렌더링한다.

*사용자 클래스*

|| 사용자 유형 || 설명 || 권한 ||
|| 치과의사 || CBCT 영상의 시각적 확인 및 품질 검토 || 파일 열기, 뷰어 조작 ||
|| 방사선사 || 영상 품질 검증 업무 || 파일 열기, 뷰어 조작 ||
|| 임상 연구원 || 연구용 CBCT 영상 리뷰 || 파일 열기, 뷰어 조작 ||

*운영 환경*

- 브라우저: Chrome 90+ (HTML5 Canvas 2D API 지원)
- 렌더링: HTML5 Canvas 2D API
- 런타임: 순수 JavaScript (ES2020+), 번들러: Vite
- 네트워크: 불필요 (완전 오프라인 동작)
- 파일 시스템: 브라우저 File API (로컬 파일 읽기 전용)

*제약 조건*

- 진단 목적 사용 금지: UI에 명시적 경고 문구 표시 필수
- 최대 파일 크기: 512MB (MAX_FILE_SIZE)
- 지원 전송 구문: Explicit VR LE, Implicit VR LE, Explicit VR BE (비압축 3종)
- 네트워크 통신 없음: 모든 데이터 처리는 클라이언트 로컬에서만 수행
- 소프트웨어 안전 등급: IEC 62304 Class A

---

*[SRS-04] 기능 요구사항 (FR)*

*FR-1군: DICOM 파일 입력 및 파싱*

|| ID || 명칭 || 상세 설명 || 우선순위 || 근거 ||
|| FR-1.1 || DICOM 매직 바이트 검증 || 시스템은 DICOM 파일의 오프셋 128~131 위치에서 매직 바이트(DICM)를 검증해야 한다. 검증 실패 시 명확한 에러 메시지를 사용자에게 표시해야 한다. || 높음 || RMR HAZ-1.1 (PLAYG-1496), validateMagicByte.js ||
|| FR-1.2 || 전송 구문 검증 || 시스템은 DICOM 파일의 전송 구문 UID가 지원 가능한지 검증해야 한다. 지원 전송 구문은 Explicit VR LE(1.2.840.10008.1.2.1), Implicit VR LE(1.2.840.10008.1.2), Explicit VR BE(1.2.840.10008.1.2.2)이다. 미지원 시 에러 메시지를 표시해야 한다. || 높음 || RMR HAZ-1.2 (PLAYG-1497), validateTransferSyntax.js ||
|| FR-1.3 || 필수 DICOM 태그 검증 || 시스템은 Rows, Columns, BitsAllocated, PixelRepresentation 필수 태그의 존재를 검증해야 한다. 누락 시 에러를 발생시키고, 선택 태그 누락 시 기본값을 자동 적용해야 한다. || 높음 || RMR HAZ-1.3 (PLAYG-1498), constants.js METADATA_TAGS ||
|| FR-1.4 || 파일 크기 사전 검증 || 시스템은 파일 로딩 전에 파일 크기가 512MB 이하인지 확인해야 한다. 초과 시 메모리 로딩 없이 즉시 에러 메시지를 표시해야 한다. || 보통 || RMR HAZ-1.4 (PLAYG-1499), constants.js MAX_FILE_SIZE ||
|| FR-1.5 || 픽셀 데이터 길이 일치 검증 || 시스템은 메타데이터에 명시된 픽셀 데이터 길이와 실제 픽셀 데이터 길이를 비교해야 한다. 불일치 시 경고 메시지를 표시하고 Math.min으로 버퍼 범위를 보정해야 한다. || 보통 || RMR HAZ-1.5 (PLAYG-1500), pixelDataParser.js ||
|| FR-1.6 || 파일 확장자 필터링 || 시스템은 파일 입력 요소의 accept 속성을 통해 .dcm 및 .dicom 확장자 파일만 선택 가능하도록 필터링해야 한다. || 낮음 || RMR HAZ-1.1 (PLAYG-1496), index.html ||
|| FR-1.7 || DICOM 파일 읽기 || 시스템은 브라우저 FileReader API를 사용하여 로컬 DICOM 파일을 ArrayBuffer로 읽어야 한다. 파일 읽기 실패 시 명확한 에러 메시지를 표시해야 한다. || 높음 || parseDICOM.js readFileAsArrayBuffer ||
|| FR-1.8 || 파일 메타 그룹 파싱 || 시스템은 DICOM 파일 메타 정보 그룹(0002)을 파싱하여 전송 구문 UID, 미디어 저장 SOP 클래스 UID 등을 추출해야 한다. || 높음 || metaGroupParser.js, DICOM PS3.10 ||

*FR-2군: 영상 렌더링*

|| ID || 명칭 || 상세 설명 || 우선순위 || 근거 ||
|| FR-2.1 || 복셀 데이터 타입 변환 || 시스템은 bitsAllocated 값(8/16비트)과 pixelRepresentation(부호/비부호)에 따라 적절한 TypedArray(Uint8Array, Int16Array, Uint16Array)로 복셀 데이터를 변환해야 한다. 비표준 비트 깊이는 Float32Array로 폴백 처리해야 한다. || 높음 || RMR HAZ-2.1 (PLAYG-1501), main.js buildVolumeData ||
|| FR-2.2 || Window Level/Width 렌더링 || 시스템은 WL/WW 값을 사용하여 복셀 데이터를 0~255 그레이스케일로 정규화해야 한다. Window Width는 최소 1 이상을 보장(Math.max(1, ww))해야 하며, 정규화 결과는 0~255로 클램핑해야 한다. || 높음 || RMR HAZ-2.2 (PLAYG-1502), main.js renderViewport ||
|| FR-2.3 || 3단면 MPR 렌더링 || 시스템은 Axial, Coronal, Sagittal 3개 단면의 슬라이스를 Canvas 2D API로 렌더링해야 한다. 각 단면은 독립적인 캔버스에 표시되어야 한다. || 높음 || main.js renderViewport ||
|| FR-2.4 || 슬라이스 탐색 || 시스템은 마우스 휠 및 슬라이더를 통해 각 단면의 슬라이스 인덱스를 변경할 수 있어야 한다. 슬라이스 인덱스는 Math.max(0, Math.min(val, max))로 범위를 보장해야 한다. || 높음 || RMR HAZ-2.3 (PLAYG-1503), main.js bindEvents ||
|| FR-2.5 || 볼륨 데이터 구성 || 시스템은 파싱된 복셀 데이터를 3차원 볼륨 데이터(w, h, d)로 구성하고, 픽셀 스페이싱 정보를 포함해야 한다. || 높음 || main.js buildVolumeData ||
|| FR-2.6 || 초기 슬라이스 위치 설정 || 시스템은 볼륨 데이터 로딩 후 각 단면의 슬라이스를 중간 인덱스(Math.floor(frames/2) 등)로 초기화해야 한다. || 보통 || main.js buildVolumeData ||

*FR-3군: 데이터 보안 및 PHI 보호*

|| ID || 명칭 || 상세 설명 || 우선순위 || 근거 ||
|| FR-3.1 || PHI 필드 마스킹 || 시스템은 환자 식별 정보(patientName, patientID, patientBirthDate)를 마스킹 문자열([REDACTED])로 치환해야 한다. 원본 값은 내부 WeakMap에 저장하여 외부 직접 접근을 차단해야 한다. || 높음 || RMR HAZ-3.1 (PLAYG-1505), phiGuard.js maskPhiFields ||
|| FR-3.2 || PHI 원본 접근 제어 || 시스템은 PHI 원본 값을 getPhiValue() 함수를 통해서만 접근 가능하도록 해야 한다. dumpPhiValues()는 배럴 파일(index.js)에서 노출하지 않아야 한다. || 높음 || RMR HAZ-3.2 (PLAYG-1506), dicomParser/index.js ||
|| FR-3.3 || 메모리 PHI 최소화 || 시스템은 PHI 원본 값을 WeakMap에 저장하여 가비지 컬렉션이 가능하도록 해야 한다. 메타데이터 객체가 해제되면 PHI 원본도 자동 해제되어야 한다. || 보통 || RMR HAZ-3.1 (PLAYG-1505), phiGuard.js WeakMap ||

*FR-4군: UI/UX 및 사용자 인터페이스*

|| ID || 명칭 || 상세 설명 || 우선순위 || 근거 ||
|| FR-4.1 || 메타데이터 패널 표시 || 시스템은 환자명, 환자ID, 검사일자, 모달리티, 영상 크기, 슬라이스 수, 픽셀 스페이싱, 전송 구문 정보를 메타데이터 패널에 표시해야 한다. 누락된 필드는 대시(-)로 표시해야 한다. || 보통 || RMR HAZ-4.1 (PLAYG-1507), main.js updateMetadataPanel ||
|| FR-4.2 || WL/WW 실시간 조절 || 시스템은 WL/WW 슬라이더 조작 시 모든 뷰포트의 영상을 실시간으로 재렌더링해야 한다. || 높음 || main.js bindEvents ||
|| FR-4.3 || 파일 로딩 상태 표시 || 시스템은 파일 로딩 중 상태 표시줄과 진행률 표시줄을 표시해야 한다. 로딩 완료 또는 실패 시 결과 메시지를 표시해야 한다. || 보통 || main.js showStatus ||
|| FR-4.4 || 동일 파일 재선택 처리 || 시스템은 파일 입력 요소의 value를 초기화하여 동일 파일의 재선택이 가능하도록 해야 한다. || 낮음 || RMR HAZ-4.3 (PLAYG-1509), main.js handleFileSelect ||
|| FR-4.5 || 웰컴 화면 및 뷰어 전환 || 시스템은 초기 상태에서 웰컴 화면을 표시하고, 파일 로딩 성공 시 뷰어 컨테이너로 전환해야 한다. || 보통 || main.js showViewer ||
|| FR-4.6 || 진단 목적 아님 경고문 || 시스템은 UI에 본 뷰어가 진단 목적이 아닌 영상의 시각적 확인 및 품질 검토용 보조 도구임을 명시하는 경고문을 항상 표시해야 한다. || 높음 || RMR 분류 근거, IEC 62304 Class A 요구사항 ||

*FR-5군: 소프트웨어 안정성*

|| ID || 명칭 || 상세 설명 || 우선순위 || 근거 ||
|| FR-5.1 || 태그 파싱 무한 루프 방지 || 시스템은 태그 순회 시 MAX_TAG_COUNT(10000) 제한을 적용하여 무한 루프를 방지해야 한다. 제한 도달 시 파싱을 안전하게 종료해야 한다. || 높음 || RMR HAZ-5.1 (PLAYG-1510), constants.js MAX_TAG_COUNT ||
|| FR-5.2 || 시퀀스 중첩 깊이 제한 || 시스템은 DICOM 시퀀스 중첩 깊이를 MAX_SEQUENCE_DEPTH(10)으로 제한하여 과다 중첩으로 인한 스택 오버플로우를 방지해야 한다. || 보통 || RMR HAZ-5.2 (PLAYG-1511), constants.js MAX_SEQUENCE_DEPTH ||
|| FR-5.3 || ArrayBuffer 범위 초과 읽기 방지 || 시스템은 모든 버퍼 읽기 전에 hasRemaining() 검증을 수행하여 DataView 오프셋이 버퍼 크기를 초과하지 않도록 해야 한다. || 높음 || RMR HAZ-5.3 (PLAYG-1512), ParseContext.js hasRemaining ||
|| FR-5.4 || 파싱 오류 사용자 친화적 처리 || 시스템은 모든 파싱 오류를 사용자 친화적 메시지로 변환하여 표시해야 한다. 내부 구조(offset, tag 등)는 개발 모드에서만 디버그 정보에 포함해야 한다. || 보통 || handleParseError.js ||
|| FR-5.5 || 파싱 결과 표준 출력 || 시스템은 파싱 결과를 표준화된 ParseResult 객체(metadata, voxelData, errors, isValid)로 반환해야 한다. || 높음 || types/ParseResult.js, parseDICOM.js ||

---

*[SRS-05] 비기능 요구사항 (NFR)*

*성능 요구사항*

|| ID || 명칭 || 상세 설명 || 근거 ||
|| NFR-1.1 || 파일 로딩 응답 시간 || 100MB 이하 DICOM 파일은 5초 이내에 파싱 및 초기 렌더링을 완료해야 한다. || 사용자 경험 ||
|| NFR-1.2 || WL/WW 실시간 반응 || WL/WW 슬라이더 조작 시 100ms 이내에 모든 뷰포트 재렌더링을 완료해야 한다. || 사용자 경험 ||
|| NFR-1.3 || 슬라이스 전환 반응 || 마우스 휠 또는 슬라이더를 통한 슬라이스 전환 시 50ms 이내에 렌더링을 완료해야 한다. || 사용자 경험 ||

*보안 요구사항*

|| ID || 명칭 || 상세 설명 || 근거 ||
|| NFR-2.1 || 오프라인 전용 동작 || 시스템은 어떠한 네트워크 통신도 수행하지 않아야 한다. 모든 데이터는 로컬에서만 처리되어야 한다. || IEC 62304 Class A, 제품 정의 ||
|| NFR-2.2 || PHI 메모리 보호 || PHI 원본 값은 WeakMap에 저장하여 외부 모듈에서 직접 접근할 수 없어야 한다. || RMR HAZ-3.1 (PLAYG-1505) ||
|| NFR-2.3 || 디버그 정보 최소화 || 프로덕션 환경에서는 파싱 오류 메시지에 내부 구조(offset, tag 등)를 포함하지 않아야 한다. || handleParseError.js ||

*신뢰성 요구사항*

|| ID || 명칭 || 상세 설명 || 근거 ||
|| NFR-3.1 || 파싱 오류 복구 || 시스템은 파일 파싱 실패 시 애플리케이션이 중단되지 않고 사용자에게 에러 메시지를 표시한 후 초기 상태로 복귀해야 한다. || IEC 62304 Class A ||
|| NFR-3.2 || 입력 검증 완전성 || 모든 외부 입력(DICOM 파일)은 신뢰할 수 없는 것으로 간주하고 검증해야 한다. || RMR HAZ-1군, IEC 62304 제7장 ||
|| NFR-3.3 || 메모리 안전성 || 시스템은 파일 크기 제한(512MB) 및 버퍼 범위 검증을 통해 메모리 관련 오류를 방지해야 한다. || RMR HAZ-1.4 (PLAYG-1499), HAZ-5.3 (PLAYG-1512) ||

*가용성 요구사항*

|| ID || 명칭 || 상세 설명 || 근거 ||
|| NFR-4.1 || 브라우저 호환성 || Chrome 90+ 브라우저에서 정상 동작해야 한다. || 운영 환경 정의 ||
|| NFR-4.2 || 직관적 UI || 파일 열기 버튼, 슬라이더, 뷰포트 레이아웃은 사용자가 별도 교육 없이 사용 가능해야 한다. || 사용자 클래스 정의 ||
|| NFR-4.3 || 오류 메시지 명확성 || 모든 오류 메시지는 사용자가 이해할 수 있는 한국어로 표시되어야 한다. || ERROR_MESSAGES (constants.js) ||

*추적성 요구사항*

|| ID || 명칭 || 상세 설명 || 근거 ||
|| NFR-5.1 || 요구사항 추적성 || 각 기능 요구사항은 PA 문서(IU, SyRS, Classification) 및 Hazard 티켓과 양방향 추적이 가능해야 한다. || IEC 62304 제5.1.1 ||
|| NFR-5.2 || 소스코드 추적성 || 각 소프트웨어 요구사항은 해당 소스코드 모듈과 추적 가능해야 한다. || IEC 62304 제5.1.2 ||

---

*[SRS-06] 인터페이스 요구사항*

*사용자 인터페이스 (UI)*

|| ID || 명칭 || 상세 설명 ||
|| IF-1.1 || 파일 열기 버튼 || 단일 파일 선택 버튼과 폴더 선택 버튼을 제공해야 한다. ||
|| IF-1.2 || 3단면 뷰포트 || Axial, Coronal, Sagittal 3개 캔버스가 그리드 레이아웃으로 배치되어야 한다. ||
|| IF-1.3 || 슬라이스 슬라이더 || 각 단면별 슬라이스 선택 슬라이더와 현재/전체 슬라이스 번호가 표시되어야 한다. ||
|| IF-1.4 || WL/WW 컨트롤 || Window Level과 Window Width 조절 슬라이더와 현재 값 표시가 제공되어야 한다. ||
|| IF-1.5 || 상태 표시줄 || 파일 로딩 상태, 진행률, 에러 메시지를 표시하는 상태 표시줄이 있어야 한다. ||
|| IF-1.6 || 메타데이터 패널 || 환자 정보, 영상 정보를 표시하는 메타데이터 패널이 있어야 한다. ||

*소프트웨어 인터페이스*

|| ID || 명칭 || 상세 설명 ||
|| IF-2.1 || 브라우저 File API || FileReader를 통한 로컬 파일 읽기 인터페이스 ||
|| IF-2.2 || Canvas 2D API || HTML5 Canvas 2D 컨텍스트를 통한 영상 렌더링 인터페이스 ||
|| IF-2.3 || DICOM 파서 모듈 API || parseDICOM(file) 공개 함수를 통한 파일 파싱 인터페이스 ||

*통신 인터페이스*

- 없음 (완전 오프라인 애플리케이션)

---

*[SRS-07] 시스템 워크플로우 시나리오*

*시나리오 1: 정상 파일 로딩 및 영상 렌더링*

{plantuml}
@startuml
start
:사용자가 파일 열기 버튼 클릭;
:파일 선택 대화상자 표시;
:사용자가 DICOM 파일 선택;
:파일 크기 검증 (512MB 이하);
if (파일 크기 초과?) then (예)
  :에러 메시지 표시;
  stop
endif
:FileReader로 ArrayBuffer 읽기;
:매직 바이트(DICM) 검증;
if (매직 바이트 불일치?) then (예)
  :에러 메시지 표시;
  stop
endif
:메타 그룹(0002) 파싱;
:전송 구문 검증;
if (미지원 전송 구문?) then (예)
  :에러 메시지 표시;
  stop
endif
:메타데이터 파싱 (필수 태그 검증);
if (필수 태그 누락?) then (예)
  :에러 메시지 표시;
  stop
endif
:PHI 필드 마스킹;
:픽셀 데이터 추출 (길이 검증);
:복셀 데이터 타입 변환;
:볼륨 데이터 구성;
:초기 슬라이스 위치 설정;
:3단면 MPR 렌더링;
:메타데이터 패널 업데이트;
:로딩 완료 메시지 표시;
stop
@enduml
{plantuml}

*시나리오 2: WL/WW 조절 및 슬라이스 탐색*

{plantuml}
@startuml
start
:사용자가 WL/WW 슬라이더 조작;
:WL/WW 값 업데이트;
:모든 뷰포트 재렌더링;
:복셀값 정규화 (0~255 클램핑);
:Canvas에 ImageData 출력;
stop
@enduml
{plantuml}

*시나리오 3: 비정상 파일 처리 (오류 복구)*

{plantuml}
@startuml
start
:사용자가 비 DICOM 파일 선택;
:파일 크기 검증 통과;
:FileReader로 ArrayBuffer 읽기;
:매직 바이트(DICM) 검증;
if (매직 바이트 불일치?) then (예)
  :PARSE_ERR_INVALID_MAGIC 에러 생성;
  :사용자 친화적 에러 메시지 변환;
  :상태 표시줄에 에러 메시지 표시;
  :애플리케이션 초기 상태 유지;
  note right: 애플리케이션 중단 없음
  stop
else (아니오)
  :정상 파싱 계속 진행;
  stop
endif
@enduml
{plantuml}

---

*[SRS-08] 추적성 매트릭스*

*기능 요구사항 추적성 (PA 문서 -> EA SRS)*

|| FR ID || 명칭 || Hazard 티켓 || RMR 섹션 || 소스코드 모듈 ||
|| FR-1.1 || DICOM 매직 바이트 검증 || PLAYG-1496 || HAZ-1.1, RMR-05 | validateMagicByte.js ||
|| FR-1.2 || 전송 구문 검증 || PLAYG-1497 || HAZ-1.2, RMR-05 | validateTransferSyntax.js, dicomDictionary.js ||
|| FR-1.3 || 필수 DICOM 태그 검증 || PLAYG-1498 || HAZ-1.3, RMR-05 | metadataParser.js, constants.js ||
|| FR-1.4 || 파일 크기 사전 검증 || PLAYG-1499 || HAZ-1.4, RMR-05 | parseDICOM.js, constants.js ||
|| FR-1.5 || 픽셀 데이터 길이 일치 검증 || PLAYG-1500 || HAZ-1.5, RMR-05 | pixelDataParser.js ||
|| FR-1.6 || 파일 확장자 필터링 || PLAYG-1496 || HAZ-1.1, RMR-05 | index.html ||
|| FR-1.7 || DICOM 파일 읽기 || - || RMR-03 | parseDICOM.js ||
|| FR-1.8 || 파일 메타 그룹 파싱 || - || RMR-03 | metaGroupParser.js ||
|| FR-2.1 || 복셀 데이터 타입 변환 || PLAYG-1501 || HAZ-2.1, RMR-05 | main.js buildVolumeData ||
|| FR-2.2 || Window Level/Width 렌더링 || PLAYG-1502 || HAZ-2.2, RMR-05 | main.js renderViewport ||
|| FR-2.3 || 3단면 MPR 렌더링 || PLAYG-1504 || HAZ-2.4, RMR-05 | main.js renderViewport ||
|| FR-2.4 || 슬라이스 탐색 || PLAYG-1503 || HAZ-2.3, RMR-05 | main.js bindEvents ||
|| FR-2.5 || 볼륨 데이터 구성 || - || RMR-03 | main.js buildVolumeData ||
|| FR-2.6 || 초기 슬라이스 위치 설정 || - || RMR-03 | main.js buildVolumeData ||
|| FR-3.1 || PHI 필드 마스킹 || PLAYG-1505 || HAZ-3.1, RMR-05 | phiGuard.js maskPhiFields ||
|| FR-3.2 || PHI 원본 접근 제어 || PLAYG-1506 || HAZ-3.2, RMR-05 | dicomParser/index.js ||
|| FR-3.3 || 메모리 PHI 최소화 || PLAYG-1505 || HAZ-3.1, RMR-05 | phiGuard.js WeakMap ||
|| FR-4.1 || 메타데이터 패널 표시 || PLAYG-1507 || HAZ-4.1, RMR-05 | main.js updateMetadataPanel ||
|| FR-4.2 || WL/WW 실시간 조절 || - || RMR-03 | main.js bindEvents ||
|| FR-4.3 || 파일 로딩 상태 표시 || PLAYG-1508 || HAZ-4.2, RMR-05 | main.js showStatus ||
|| FR-4.4 || 동일 파일 재선택 처리 || PLAYG-1509 || HAZ-4.3, RMR-05 | main.js handleFileSelect ||
|| FR-4.5 || 웰컴 화면 및 뷰어 전환 || - || RMR-03 | main.js showViewer ||
|| FR-4.6 || 진단 목적 아님 경고문 || - || RMR-02, Class A 근거 | index.html ||
|| FR-5.1 || 태그 파싱 무한 루프 방지 || PLAYG-1510 || HAZ-5.1, RMR-05 | constants.js MAX_TAG_COUNT, metadataParser.js ||
|| FR-5.2 || 시퀀스 중첩 깊이 제한 || PLAYG-1511 || HAZ-5.2, RMR-05 | constants.js MAX_SEQUENCE_DEPTH, tagReader.js ||
|| FR-5.3 || ArrayBuffer 범위 초과 읽기 방지 || PLAYG-1512 || HAZ-5.3, RMR-05 | ParseContext.js hasRemaining ||
|| FR-5.4 || 파싱 오류 사용자 친화적 처리 || - || RMR-05 | handleParseError.js ||
|| FR-5.5 || 파싱 결과 표준 출력 || - || RMR-03 | types/ParseResult.js, parseDICOM.js ||

*비기능 요구사항 추적성*

|| NFR ID || 명칭 || 관련 FR || 근거 ||
|| NFR-1.1 || 파일 로딩 응답 시간 || FR-1.1~FR-1.8 | 사용자 경험 ||
|| NFR-1.2 || WL/WW 실시간 반응 || FR-2.2, FR-4.2 | 사용자 경험 ||
|| NFR-1.3 || 슬라이스 전환 반응 || FR-2.4 | 사용자 경험 ||
|| NFR-2.1 || 오프라인 전용 동작 || 전체 FR | IEC 62304 Class A ||
|| NFR-2.2 || PHI 메모리 보호 || FR-3.1~FR-3.3 | HAZ-3.1 (PLAYG-1505) ||
|| NFR-2.3 || 디버그 정보 최소화 || FR-5.4 | handleParseError.js ||
|| NFR-3.1 || 파싱 오류 복구 || FR-1.1~FR-1.5 | IEC 62304 Class A ||
|| NFR-3.2 || 입력 검증 완전성 || FR-1.1~FR-1.6 | IEC 62304 제7장 ||
|| NFR-3.3 || 메모리 안전성 || FR-1.4, FR-5.3 | HAZ-1.4, HAZ-5.3 ||
|| NFR-4.1 || 브라우저 호환성 || 전체 FR | 운영 환경 정의 ||
|| NFR-4.2 || 직관적 UI || FR-4군 | 사용자 클래스 정의 ||
|| NFR-4.3 || 오류 메시지 명확성 || FR-5.4 | ERROR_MESSAGES ||
|| NFR-5.1 || 요구사항 추적성 || 전체 FR/NFR | IEC 62304 제5.1.1 ||
|| NFR-5.2 || 소스코드 추적성 || 전체 FR/NFR | IEC 62304 제5.1.2 ||

---

*작성 정보*
- 작성자: AI 소프트웨어 요구사항 분석 에이전트
- 검토자: (프로젝트 관리자 검토 필요)
- 승인일: (검토 후 기입)
- 문서 ID: PLAYG-1460

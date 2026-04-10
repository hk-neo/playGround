*소프트웨어 요구사항 명세서 (Software Requirements Specification)*

*제품*: Simple CBCT Viewer
*문서 ID*: SRS-PLAYG-1310
*작성일*: 2026-04-10
*대상 티켓*: PLAYG-1310
*IEC 62304 안전 등급*: Class A (PLAYG-1290 Classification)

---

*1. [SRS-01] 목적 및 범위*

*1.1 목적*
본 문서는 Simple CBCT Viewer 소프트웨어의 소프트웨어 요구사항 명세서(SRS)이다.
IEC 62304:2006+AMD1:2015 제5.2절(소프트웨어 요구사항 분석) 요구사항에 따라 기능 요구사항(FR), 비기능 요구사항(NFR), 인터페이스 요구사항을 정의한다.
본 SRS는 SyRS(PLAYG-1229, SR-1 ~ SR-14) 및 RMR(PLAYG-1309)에서 식별된 Hazard 완화 조치를 소프트웨어 요구사항으로 구체화한다.

*1.2 적용 범위*
- 제품명: Simple CBCT Viewer
- 유형: 웹 브라우저 기반 CBCT 영상 뷰어 (독립형 소프트웨어, 오프라인 동작)
- 의도된 목적: 치과용 CBCT 영상의 조회 및 보조 분석 (진단 목적 아님)
- IEC 62304 안전 등급: Class A

*1.3 참조 문서*
||문서||티켓 키||설명||
|Intended Use Statement|PLAYG-1237|제품의 의도된 사용 목적, 환경, 사용자 정의|
|Intended Use Document|PLAYG-1228|IU 문서 티켓|
|System Requirement Specification|PLAYG-1229|시스템 요구사항 정의 (SR-1 ~ SR-14)|
|Classification|PLAYG-1290|소프트웨어 안전 등급 분석 (Class A)|
|Classification Document|PLAYG-1230|Classification 문서 티켓|
|Software Development Plan|PLAYG-1231|소프트웨어 개발 계획서 (DP-PLAYG-1231)|
|Risk Management Plan|PLAYG-1232|위험 관리 계획서 (RMP-PLAYG-1232)|
|Risk Management Report|PLAYG-1309|위험 관리 보고서 (RMR)|
|Security Maintenance Plan|PLAYG-1233|사이버 보안 유지보수 계획서 (SMP-PLAYG-1233)|
|Configuration Management Plan|PLAYG-1234|형상 관리 계획서 (CMP-PLAYG-1234)|

---

*2. [SRS-02] 용어 정의*

||용어||설명||
|CBCT|Cone Beam Computed Tomography (원뿔형 빔 컴퓨터 단층 촬영)|
|DICOM|Digital Imaging and Communications in Medicine (의료 영상 통신 표준)|
|MPR|Multi-Planar Reconstruction (다단면 재구성)|
|WL/WW|Window Level / Window Width (윈도우 레벨/폭, 명암 조절)|
|PHI|Protected Health Information (보호 대상 건강 정보)|
|Pixel Spacing|DICOM 태그 (0028,0030), 픽셀 간의 물리적 거리 (mm)|
|WebGL|Web Graphics Library (웹 기반 3D 그래픽 라이브러리)|
|CSP|Content Security Policy (콘텐츠 보안 정책)|
|SBOM|Software Bill of Materials (소프트웨어 자재 명세서)|
|ALARP|As Low As Reasonably Practicable (합리적으로 실현 가능한 최저 수준)|
|SR|System Requirement (시스템 요구사항)|
|FR|Functional Requirement (기능 요구사항)|
|NFR|Non-Functional Requirement (비기능 요구사항)|

---

*3. [SRS-03] 전체 설명*

*3.1 제품 관점*
Simple CBCT Viewer는 치과용 CBCT 영상을 웹 브라우저에서 열람할 수 있는 독립형 소프트웨어이다.
서버 인프라가 불필요하며, 모든 데이터는 사용자의 로컬 환경에서 처리된다. (PLAYG-1237 IU-07, IU-08 참조)

*3.2 사용자 클래스*
- *주 사용자*: 치과 의사
- *부 사용자*: 치과 기공사, 치과 교육생 (교육/연구 환경)
- *공통 제약*: 본 제품은 진단 목적이 아닌 영상 열람 보조 도구임 (PLAYG-1237 IU-09 금기 사항)

*3.3 운영 환경*
- *플랫폼*: 웹 브라우저 (Chrome, Edge, Firefox 최신 버전)
- *네트워크*: 인터넷 연결 불필요 (오프라인 동작)
- *하드웨어*: RAM 8GB 이상 권장
- *입력*: 로컬 DICOM 3.0 표준 CBCT 영상 파일

*3.4 제약 조건*
- 서버 인프라 불필요 (정적 웹 애플리케이션)
- 환자 데이터의 외부 전송 금지 (PLAYG-1237 IU-12 경고)
- 진단 목적 사용 금지 (PLAYG-1237 IU-09 금기 사항)
- IEC 62304 Class A 준수 (PLAYG-1290)
---

*4. [SRS-04] 기능 요구사항 (FR)*

*4.1 영상 로드 및 파싱*

||ID||명칭||상세 설명||우선순위||근거||
|FR-1.1|DICOM 파일 선택|사용자가 로컬 파일 시스템에서 DICOM 파일(.dcm) 또는 폴더를 선택할 수 있어야 한다. 웹 브라우저 File API를 사용하여 파일 데이터를 읽어 들인다.|필수|SR-1 (PLAYG-1293), IU-08|
|FR-1.2|DICOM 파일 형식 검증|선택된 파일이 DICOM 3.0 표준에 유효한지 매직 바이트 및 전송 구문(Transfer Syntax)을 확인하여 검증해야 한다.|필수|SR-1, SR-12, HAZ-1.1 (PLAYG-1314)|
|FR-1.3|DICOM 메타데이터 파싱|DICOM 헤더에서 환자 정보, 스터디 정보, 픽셀 간격(Pixel Spacing), 슬라이스 두께, Image Orientation Patient 등 메타데이터를 파싱하여 구조체로 저장해야 한다.|필수|SR-2 (PLAYG-1294), IU-08|
|FR-1.4|복셀 데이터 파싱 및 검증|DICOM 픽셀 데이터를 파싱하여 3차원 복셀 데이터를 구성해야 한다. 복셀 값 범위 검증 및 이상치 탐지를 수행해야 한다.|필수|SR-2 (PLAYG-1294), HAZ-1.1 (PLAYG-1314)|
|FR-1.5|비표준 파일 오류 처리|비표준 또는 손상된 DICOM 파일 입력 시 명확한 오류 메시지와 함께 로딩을 거부해야 한다. 타임아웃 메커니즘을 적용하여 무한 대기 상태를 방지해야 한다.|필수|SR-1, SR-12, HAZ-1.1 (PLAYG-1314), HAZ-5.2 (PLAYG-1326)|
|FR-1.6|파일 크기 사전 검사|DICOM 파일 로딩 전 파일 크기 및 예상 메모리 사용량을 사전 추정해야 한다. 브라우저 메모리 한계 초과 예상 시 사용자에게 경고를 표시하고 로딩 중단 옵션을 제공해야 한다.|필수|SR-13 (PLAYG-1305), HAZ-5.1 (PLAYG-1325)|

*4.2 영상 렌더링*

||ID||명칭||상세 설명||우선순위||근거||
|FR-2.1|축상(Axial) 단면 렌더링|3차원 볼륨 데이터에서 축상(Axial) 단면을 실시간으로 재구성하여 화면에 표시해야 한다.|필수|SR-3 (PLAYG-1295), IU-03|
|FR-2.2|관상(Coronal) 단면 렌더링|3차원 볼륨 데이터에서 관상(Coronal) 단면을 실시간으로 재구성하여 화면에 표시해야 한다.|필수|SR-3 (PLAYG-1295), IU-03|
|FR-2.3|시상(Sagittal) 단면 렌더링|3차원 볼륨 데이터에서 시상(Sagittal) 단면을 실시간으로 재구성하여 화면에 표시해야 한다.|필수|SR-3 (PLAYG-1295), IU-03|
|FR-2.4|MPR 메타데이터 검증|Image Orientation Patient(0020,0037) 등 축 방향 메타데이터를 검증해야 한다. 누락 또는 오류 시 사용자에게 경고를 표시해야 한다.|필수|SR-3 (PLAYG-1295), HAZ-1.2 (PLAYG-1315)|
|FR-2.5|3D 볼륨 렌더링|WebGL을 사용하여 3차원 복셀 데이터를 회전 가능한 3D 영상으로 렌더링해야 한다. 렌더링 결과의 기본 무결성 검증(픽셀 출력 범위 확인)을 수행해야 한다.|필수|SR-4 (PLAYG-1296), IU-02, HAZ-1.3 (PLAYG-1316)|
|FR-2.6|세 방향 MPR 동시 디스플레이|축상, 관상, 시상 세 방향 MPR 영상을 화면에 동시에 디스플레이해야 한다.|필수|SR-3 (PLAYG-1295), IU-08|

*4.3 영상 조작*

||ID||명칭||상세 설명||우선순위||근거||
|FR-3.1|슬라이스 탐색|사용자가 마우스/키보드 입력으로 슬라이스 인덱스를 변경할 수 있어야 한다. 슬라이스 인덱스는 0 ~ NumberOfFrames-1 범위로 제한하고 경계 조건을 처리해야 한다.|필수|SR-5 (PLAYG-1297), IU-08, HAZ-1.5 (PLAYG-1318)|
|FR-3.2|확대/축소 (Zoom)|마우스 휠 또는 버튼으로 영상을 확대/축소할 수 있어야 한다. 뷰 변환 행렬을 적용하여 영상을 변환해야 한다.|필수|SR-6 (PLAYG-1298), IU-10|
|FR-3.3|이동 (Pan)|마우스 드래그로 영상을 이동할 수 있어야 한다. 뷰 변환 행렬을 적용하여 영상을 변환해야 한다.|필수|SR-6 (PLAYG-1298), IU-10|
|FR-3.4|윈도우 레벨 조절|사용자가 마우스 드래그로 WL/WW 값을 조절할 수 있어야 한다. WL/WW 매핑 범위에 상/하한선을 설정하여 극단적 명암 왜곡을 방지해야 한다.|필수|SR-7 (PLAYG-1299), IU-08, HAZ-1.4 (PLAYG-1317)|

*4.4 측정 기능*

||ID||명칭||상세 설명||우선순위||근거||
|FR-4.1|거리 측정 기능|사용자가 영상 상에 두 점을 지정하여 거리를 측정할 수 있어야 한다. 측정 결과는 mm 단위로 표시되어야 한다.|필수|SR-8 (PLAYG-1300), IU-10|
|FR-4.2|Pixel Spacing 검증|거리 측정 시 Pixel Spacing(0028,0030) 메타데이터의 존재 여부를 확인해야 한다. 값이 누락되거나 비정상인 경우 측정 기능을 비활성화하고 사용자에게 사유를 고지해야 한다.|필수|SR-8 (PLAYG-1300), HAZ-2.1 (PLAYG-1319)|
|FR-4.3|측정 안내 문구 표시|측정 결과 옆에 참고용 안내 문구를 표시해야 한다. 측정값은 참고용이며 최종 임상 판단은 유자격 전문의가 수행해야 함을 명시한다.|필수|SR-8 (PLAYG-1300), IU-12, HAZ-2.1 (PLAYG-1319)|
|FR-4.4|확대/축소 상태 측정 좌표 변환|줌/팬 상태에서도 측정 좌표가 정확하게 변환되어야 한다. 줌/팬 변환 행렬과 측정 좌표의 역변환 검증을 수행해야 한다.|필수|SR-6, SR-8, HAZ-2.2 (PLAYG-1320)|
*4.5 보안 및 데이터 보호*

||ID||명칭||상세 설명||우선순위||근거||
|FR-5.1|외부 네트워크 통신 차단|모든 외부 네트워크 요청(XMLHttpRequest, fetch, WebSocket 등)을 차단해야 한다. Content Security Policy(CSP) 헤더를 설정하여 외부 통신을 원천 차단해야 한다.|필수|SR-11 (PLAYG-1303), IU-12, HAZ-3.1 (PLAYG-1321)|
|FR-5.2|환자 데이터 로컬 한정 처리|DICOM 데이터 및 환자 정보를 브라우저 캐시, 로컬 스토리지, 세션 스토리지에 저장하지 않아야 한다. 모든 데이터는 메모리 상에만 유지해야 한다.|필수|SR-11 (PLAYG-1303), HAZ-3.2 (PLAYG-1322)|
|FR-5.3|메모리 데이터 명시적 해제|애플리케이션 종료 시 메모리 상의 DICOM 데이터를 명시적으로 해제(release)해야 한다.|필수|SR-11 (PLAYG-1303), HAZ-3.2 (PLAYG-1322)|
|FR-5.4|서드파티 라이브러리 보안 감사|서드파티 라이브러리 포함 전 보안 감사를 수행해야 한다. SBOM 기반 외부 통신 코드를 스캔해야 한다. (SMP-PLAYG-1233 참조)|필수|SR-11, HAZ-3.1 (PLAYG-1321), SMP-PLAYG-1233|

*4.6 사용자 인터페이스 및 사용 안전*

||ID||명칭||상세 설명||우선순위||근거||
|FR-6.1|진단 불가 경고 문구 표시|애플리케이션 로드 시 진단 목적이 아님을 명시하는 경고 문구를 UI 최상단에 필수 표시해야 한다. 경고 문구는 사용자가 확인 후 수동 닫기 가능하며 매 세션마다 표시되어야 한다.|필수|SR-14 (PLAYG-1306), IU-09, HAZ-4.1 (PLAYG-1323)|
|FR-6.2|지원 브라우저 감지 및 안내|지원 브라우저(Chrome, Edge, Firefox) 감지 로직을 구현해야 한다. 미지원 브라우저 접속 시 호환 브라우저 안내 메시지를 표시해야 한다.|필수|SR-10 (PLAYG-1302), HAZ-4.2 (PLAYG-1324)|

*4.7 오프라인 및 배포*

||ID||명칭||상세 설명||우선순위||근거||
|FR-7.1|오프라인 전체 기능 동작|네트워크 연결 없이 모든 핵심 기능이 동작해야 한다. 모든 필수 리소스를 로컬 번들에 포함하여 빌드해야 하며, CDN 등 외부 리소스 참조를 완전 제거해야 한다.|필수|SR-9 (PLAYG-1301), HAZ-5.3 (PLAYG-1327)|
|FR-7.2|DICOM 3.0 표준 준수|DICOM 3.0 표준에 준수하여 CBCT 영상을 파싱하고 렌더링해야 한다.|필수|SR-12 (PLAYG-1304), IU-10|
|FR-7.3|영상 로드 성능|DICOM CBCT 영상 파일 파싱 및 볼륨 구성이 합리적인 시간 내에 완료되어야 한다.|필수|SR-13 (PLAYG-1305), IU-11|
|FR-7.4|메모리 사용량 모니터링|메모리 사용량 모니터링 로직을 구현해야 한다. 임계치 초과 시 점진적 로딩 또는 해상도 축소 옵션을 제공해야 한다.|필수|SR-13 (PLAYG-1305), HAZ-5.1 (PLAYG-1325)|
---

*5. [SRS-05] 비기능 요구사항 (NFR)*

*5.1 성능 요구사항*

||ID||명칭||상세 설명||우선순위||근거||
|NFR-1.1|영상 로딩 시간|일반적인 치과 CBCT 영상(약 200~500MB)의 로딩 완료(파싱 + 볼륨 구성) 시간은 30초 이내여야 한다.|높음|SR-13 (PLAYG-1305), IU-10, IU-11|
|NFR-1.2|MPR 렌더링 반응성|슬라이스 탐색 시 MPR 영상 갱신은 200ms 이내여야 한다.|높음|SR-5 (PLAYG-1297), IU-10|
|NFR-1.3|3D 렌더링 프레임 속도|3D 볼륨 렌더링 시 최소 15 FPS 이상을 유지해야 한다.|보통|SR-4 (PLAYG-1296), IU-10|
|NFR-1.4|측정 응답성|거리 측정 시 측정 결과 표시는 100ms 이내여야 한다.|보통|SR-8 (PLAYG-1300), IU-10|

*5.2 보안 요구사항*

||ID||명칭||상세 설명||우선순위||근거||
|NFR-2.1|CSP 정책 적용|Content Security Policy 헤더를 통해 모든 외부 리소스 로딩 및 스크립트 실행을 제한해야 한다. inline script 허용 최소화.|높음|SR-11 (PLAYG-1303), HAZ-3.1 (PLAYG-1321), SMP-PLAYG-1233|
|NFR-2.2|정적 분석 보안 검증|소스코드 내 네트워크 API(fetch, XMLHttpRequest, WebSocket) 사용 여부를 정적 분석으로 검증해야 한다. 빌드 파이프라인에 포함.|높음|HAZ-3.1 (PLAYG-1321), DP-PLAYG-1231|
|NFR-2.3|의존성 취약점 스캔|npm audit 또는 동등한 도구를 사용하여 서드파티 의존성의 알려진 취약점을 정기적으로 스캔해야 한다.|높음|SMP-PLAYG-1233, HAZ-3.1 (PLAYG-1321)|
|NFR-2.4|데이터 잔존 방지 검증|세션 종료 후 브라우저 캐시, 로컬 스토리지, 세션 스토리지에 환자 데이터가 잔존하지 않음을 E2E 테스트로 검증해야 한다.|높음|HAZ-3.2 (PLAYG-1322), SR-11 (PLAYG-1303)|

*5.3 신뢰성 요구사항*

||ID||명칭||상세 설명||우선순위||근거||
|NFR-3.1|예외 처리 견고성|비표준 DICOM 입력, 메모리 부족, 렌더링 오류 등 예외 상황에서 애플리케이션이 비정상 종료되지 않고 사용자에게 적절한 오류 메시지를 표시해야 한다.|높음|HAZ-5.1 (PLAYG-1325), HAZ-5.2 (PLAYG-1326), DP-PLAYG-1231|
|NFR-3.2|오프라인 가용성|네트워크 연결 여부와 무관하게 모든 핵심 기능이 100% 가용해야 한다.|높음|SR-9 (PLAYG-1301), HAZ-5.3 (PLAYG-1327)|

*5.4 가용성 요구사항*

||ID||명칭||상세 설명||우선순위||근거||
|NFR-4.1|크로스 브라우저 호환성|Chrome, Edge, Firefox 최신 버전에서 모든 기능이 정상 동작해야 한다. 각 브라우저별 E2E 테스트를 수행해야 한다.|높음|SR-10 (PLAYG-1302), HAZ-4.2 (PLAYG-1324)|
|NFR-4.2|직관적 사용자 인터페이스|치과 의사가 별도의 교육 없이 기본 기능(영상 열람, 측정)을 사용할 수 있는 직관적 UI를 제공해야 한다.|보통|IU-11, DP-PLAYG-1231|
---

*6. [SRS-06] 인터페이스 요구사항*

*6.1 사용자 인터페이스 (UI)*
- 메인 뷰포트: MPR 3단면(Axial, Coronal, Sagittal) 동시 디스플레이 영역
- 3D 뷰포트: 회전 가능한 3D 볼륨 렌더링 영역
- 슬라이스 탐색: 슬라이스 인덱스 슬라이더 및 키보드 단축키
- 확대/축소: 마우스 휠 또는 버튼
- 이동: 마우스 드래그
- WL/WW 조절: 마우스 드래그
- 측정 도구: 거리 측정 모드 활성화 버튼 및 결과 표시
- 경고 배너: 진단 목적 불가 경고 문구 (UI 최상단)

*6.2 소프트웨어 인터페이스*
- 입력: DICOM 3.0 표준 파일 (.dcm)
- 렌더링: WebGL 2.0 API
- 파일 접근: 웹 브라우저 File API (FileReader)
- 빌드 산출물: 정적 HTML/CSS/JavaScript 번들 (외부 의존성 없음)

*6.3 하드웨어 인터페이스*
- 입력 장치: 마우스, 키보드
- 디스플레이: 최소 1280x720 해상도 지원
- GPU: WebGL 2.0 지원 그래픽 카드

*6.4 통신 인터페이스*
- 외부 네트워크 통신 없음 (모든 데이터 로컬 처리)
- CSP 헤더로 외부 통신 원천 차단
---

*7. [SRS-07] 시스템 워크플로우 시나리오*

*7.1 시나리오 1: CBCT 영상 열람 기본 워크플로우*

{code}
@startuml
actor User
participant Browser
participant DICOMParser
participant VolumeBuilder
participant Renderer

User -> Browser: DICOM 파일 선택
Browser -> DICOMParser: 파일 데이터 전달
DICOMParser -> DICOMParser: 매직 바이트 검증
DICOMParser -> DICOMParser: 전송 구문 확인
alt 파일 유효
  DICOMParser -> DICOMParser: 메타데이터 파싱
  DICOMParser -> VolumeBuilder: 복셀 데이터 전달
  VolumeBuilder -> VolumeBuilder: 복셀 값 범위 검증
  VolumeBuilder -> Renderer: 3D 볼륨 데이터 전달
  Renderer -> Browser: MPR 3단면 + 3D 렌더링
  Browser -> User: 영상 디스플레이
else 파일 무효
  DICOMParser -> Browser: 오류 메시지
  Browser -> User: 오류 안내 표시
end
@enduml
{code}

*7.2 시나리오 2: 거리 측정 워크플로우*

{code}
@startuml
actor User
participant UI
participant MeasurementTool
participant MetaValidator
participant Renderer

User -> UI: 측정 모드 활성화
UI -> MetaValidator: Pixel Spacing 확인 요청
alt Pixel Spacing 존재 및 유효
  MetaValidator -> UI: 검증 성공
  UI -> User: 측정 모드 활성화 표시
  User -> UI: 첫 번째 점 지정
  User -> UI: 두 번째 점 지정
  UI -> MeasurementTool: 좌표 전달
  MeasurementTool -> MeasurementTool: 줌/팬 변환 역변환
  MeasurementTool -> MeasurementTool: mm 단위 거리 계산
  MeasurementTool -> UI: 측정 결과 + 안내 문구
  UI -> User: 결과 및 참고용 안내 표시
else Pixel Spacing 누락/무효
  MetaValidator -> UI: 검증 실패
  UI -> User: 측정 불가 및 사유 고지
end
@enduml
{code}
---

*8. [SRS-08] 추적성 매트릭스*

*8.1 PA 문서 -> SRS 요구사항 매핑*

||PA 문서||티켓||매핑된 SRS 요구사항||
|IU - 의도된 목적|PLAYG-1237|FR-2.5, FR-6.1, FR-7.1|
|IU - 적응증|PLAYG-1237|FR-2.1, FR-2.2, FR-2.3, FR-2.6|
|IU - 금기 사항|PLAYG-1237|FR-6.1, NFR-4.2|
|IU - 사용 환경|PLAYG-1237|FR-7.1, NFR-3.2, NFR-4.1|
|IU - 작동 원리|PLAYG-1237|FR-1.1, FR-1.3, FR-3.1, FR-3.4|
|IU - 성능 사양|PLAYG-1237|FR-3.2, FR-3.3, FR-4.1, NFR-1.1, NFR-1.2|
|IU - 경고/주의사항|PLAYG-1237|FR-5.1, FR-6.1, FR-4.3|
|IU - 임상적 이점|PLAYG-1237|NFR-1.1, NFR-4.2|

||SyRS||티켓||매핑된 SRS 요구사항||
|SR-1 DICOM 파일 로드|PLAYG-1293|FR-1.1, FR-1.2, FR-1.5|
|SR-2 DICOM 메타데이터 파싱|PLAYG-1294|FR-1.3, FR-1.4|
|SR-3 MPR 다단면 렌더링|PLAYG-1295|FR-2.1, FR-2.2, FR-2.3, FR-2.4, FR-2.6|
|SR-4 3D 볼륨 렌더링|PLAYG-1296|FR-2.5|
|SR-5 슬라이스 탐색|PLAYG-1297|FR-3.1|
|SR-6 확대/축소 및 이동|PLAYG-1298|FR-3.2, FR-3.3, FR-4.4|
|SR-7 윈도우 레벨 조절|PLAYG-1299|FR-3.4|
|SR-8 거리 측정|PLAYG-1300|FR-4.1, FR-4.2, FR-4.3, FR-4.4|
|SR-9 오프라인 로컬 동작|PLAYG-1301|FR-7.1, NFR-3.2|
|SR-10 웹 브라우저 호환성|PLAYG-1302|FR-6.2, NFR-4.1|
|SR-11 환자 정보 보호|PLAYG-1303|FR-5.1, FR-5.2, FR-5.3, FR-5.4|
|SR-12 DICOM 3.0 표준 준수|PLAYG-1304|FR-1.2, FR-1.5, FR-7.2|
|SR-13 영상 로드 성능|PLAYG-1305|FR-1.6, FR-7.3, FR-7.4, NFR-1.1|
|SR-14 진단 목적 제외 명시|PLAYG-1306|FR-6.1|

*8.2 Hazard -> SRS 요구사항 매핑*

||Hazard||티켓||초기 위험||매핑된 SRS 요구사항||
|HAZ-1.1 DICOM 파싱 오류 영상 왜곡|PLAYG-1314|높음|FR-1.2, FR-1.4, FR-1.5|
|HAZ-1.2 MPR 단면 재구성 오류|PLAYG-1315|낮음|FR-2.4|
|HAZ-1.3 3D 볼륨 렌더링 왜곡|PLAYG-1316|낮음|FR-2.5|
|HAZ-1.4 윈도우레벨 조절 오작동|PLAYG-1317|낮음|FR-3.4|
|HAZ-1.5 슬라이스 탐색 인덱스 오류|PLAYG-1318|낮음|FR-3.1|
|HAZ-2.1 PixelSpacing 누락 측정부정확|PLAYG-1319|높음|FR-4.2, FR-4.3|
|HAZ-2.2 확대축소시 측정좌표 오류|PLAYG-1320|낮음|FR-4.4|
|HAZ-3.1 PHI 환자정보 외부전송|PLAYG-1321|중간|FR-5.1, FR-5.4, NFR-2.1, NFR-2.2, NFR-2.3|
|HAZ-3.2 브라우저캐시 환자데이터 잔존|PLAYG-1322|중간|FR-5.2, FR-5.3, NFR-2.4|
|HAZ-4.1 진단불가 경고문구 누락|PLAYG-1323|중간|FR-6.1|
|HAZ-4.2 미지원브라우저 동작불량|PLAYG-1324|낮음|FR-6.2, NFR-4.1|
|HAZ-5.1 대용량데이터 메모리충돌|PLAYG-1325|중간|FR-1.6, FR-7.4, NFR-3.1|
|HAZ-5.2 비표준DICOM 기능정지|PLAYG-1326|낮음|FR-1.5, NFR-3.1|
|HAZ-5.3 오프라인 필수리소스로딩실패|PLAYG-1327|낮음|FR-7.1, NFR-3.2|

---

*문서 끝*
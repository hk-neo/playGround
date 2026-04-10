*소프트웨어 상세 설계 명세서 (Software Detailed Design)*

*제품*: Simple CBCT Viewer
*문서 ID*: SDS-PLAYG-1312
*작성일*: 2026-04-10
*대상 티켓*: PLAYG-1312
*IEC 62304 안전 등급*: Class A (PLAYG-1290 Classification)

---

*[SDS-01] 설계 범위*

*1.1 목적*
본 문서는 Simple CBCT Viewer 소프트웨어의 상세 설계 명세서(Software Detailed Design Specification)이다.
IEC 62304:2006+AMD1:2015 제5.4절(소프트웨어 상세 설계) 요구사항에 따라 SRS(PLAYG-1310)에서 정의된 기능 요구사항과 SAD(PLAYG-1311)에서 정의된 아키텍처를 기반으로 각 컴포넌트의 상세 설계를 정의한다.
본 SDS는 SRS의 FR/NFR 요구사항과 SAD의 아키텍처 결정(ADR-1~5) 및 컴포넌트 정의(COMP-1.1~4.2)를 구체화하여 구현 가능한 수준의 설계를 제공한다.

*1.2 적용 범위*
- 제품명: Simple CBCT Viewer
- 유형: 웹 브라우저 기반 CBCT 영상 뷰어 (독립형 소프트웨어, 오프라인 동작)
- 의도된 목적: 치과용 CBCT 영상의 조회 및 보조 분석 (진단 목적 아님)
- IEC 62304 안전 등급: Class A
- 대상 컴포넌트: SAD에서 정의된 10개 모듈 (4계층)

*1.3 참조 문서*
||문서||티켓 키||설명||
|Software Requirements Specification|PLAYG-1310|소프트웨어 요구사항 명세서 (SRS)|
|Software Architecture Description|PLAYG-1311|소프트웨어 아키텍처 명세서 (SAD)|
|Risk Management Report|PLAYG-1309|위험 관리 보고서 (RMR)|
|Intended Use Statement|PLAYG-1237|제품의 의도된 사용 목적|
|Classification|PLAYG-1290|소프트웨어 안전 등급 분석 (Class A)|
|ADR-1 Layered Architecture|PLAYG-1370|아키텍처 결정 기록|
|ADR-2 DICOM 파서 자체 구현|PLAYG-1371|아키텍처 결정 기록|
|ADR-3 메모리 무상태 데이터 처리|PLAYG-1372|아키텍처 결정 기록|
|ADR-4 WebGL 2.0 렌더링|PLAYG-1373|아키텍처 결정 기록|
|ADR-5 정적 단일 번들 배포|PLAYG-1374|아키텍처 결정 기록|

*1.4 추적성 매트릭스 (FR -> SDS 설계 항목)*

||SRS 요구사항||근거 티켓||SDS 설계 항목||관련 컴포넌트||
|FR-1.1 DICOM 파일 선택|PLAYG-1293|SDS-3.1 DICOMParser.parseDICOM()|DICOMParser|
|FR-1.2 DICOM 파일 형식 검증|PLAYG-1293|SDS-3.1 validateMagicByte(), validateTransferSyntax()|DICOMParser, DataValidator|
|FR-1.3 DICOM 메타데이터 파싱|PLAYG-1294|SDS-3.1 parseMetadata(), SDS-3.2 validateHeader()|DICOMParser, DataValidator|
|FR-1.4 복셀 데이터 파싱 및 검증|PLAYG-1294|SDS-3.1 parsePixelData(), SDS-3.2 validateVoxelRange()|DICOMParser, DataValidator|
|FR-1.5 비표준 파일 오류 처리|PLAYG-1293|SDS-3.1 handleParseError(), SDS-6.1 오류 분류|DICOMParser|
|FR-1.6 파일 크기 사전 검사|PLAYG-1305|SDS-3.3 estimateMemory()|VolumeBuilder|
|FR-2.1 축상 단면 렌더링|PLAYG-1295|SDS-3.4 renderMPR(Axial)|MPRRenderer|
|FR-2.2 관상 단면 렌더링|PLAYG-1295|SDS-3.4 renderMPR(Coronal)|MPRRenderer|
|FR-2.3 시상 단면 렌더링|PLAYG-1295|SDS-3.4 renderMPR(Sagittal)|MPRRenderer|
|FR-2.4 MPR 메타데이터 검증|PLAYG-1295|SDS-3.2 validateImageOrientation()|DataValidator|
|FR-2.5 3D 볼륨 렌더링|PLAYG-1296|SDS-3.5 renderVolume()|VolumeRenderer|
|FR-2.6 세 방향 MPR 동시 디스플레이|PLAYG-1295|SDS-3.9 layoutViewports()|ViewportManager|
|FR-3.1 슬라이스 탐색|PLAYG-1297|SDS-3.6 setSliceIndex()|ViewTransformEngine|
|FR-3.2 확대/축소|PLAYG-1298|SDS-3.6 applyZoom()|ViewTransformEngine|
|FR-3.3 이동|PLAYG-1298|SDS-3.6 applyPan()|ViewTransformEngine|
|FR-3.4 윈도우 레벨 조절|PLAYG-1299|SDS-3.6 applyWindowLevel()|ViewTransformEngine|
|FR-4.1 거리 측정|PLAYG-1300|SDS-3.7 measureDistance()|MeasurementEngine|
|FR-4.2 Pixel Spacing 검증|PLAYG-1300|SDS-3.2 validatePixelSpacing()|DataValidator|
|FR-4.3 측정 안내 문구|PLAYG-1300|SDS-3.7 generateDisclaimer()|MeasurementEngine|
|FR-4.4 확대/축소 상태 측정 좌표 변환|PLAYG-1300|SDS-3.7 inverseTransform()|MeasurementEngine|
|FR-5.1 외부 네트워크 통신 차단|PLAYG-1303|SDS-3.8 applyCSP(), blockNetworkRequests()|SecurityGuard|
|FR-5.2 환자 데이터 로컬 한정|PLAYG-1303|SDS-3.8 enforceMemoryOnlyStorage()|SecurityGuard|
|FR-5.3 메모리 데이터 명시적 해제|PLAYG-1303|SDS-3.8 releaseMemory()|SecurityGuard|
|FR-5.4 서드파티 라이브러리 보안 감사|PLAYG-1303|SDS-3.8 auditDependencies()|SecurityGuard|
|FR-6.1 진단 불가 경고 문구|PLAYG-1306|SDS-3.8 showDiagnosticWarning()|UIController|
|FR-6.2 브라우저 감지|PLAYG-1302|SDS-3.8 checkBrowserSupport()|UIController|
|FR-7.1 오프라인 전체 기능 동작|PLAYG-1301|SDS-2.2 배포 구조|전체 시스템|
|FR-7.2 DICOM 3.0 준수|PLAYG-1304|SDS-3.1 DICOM 파서|DICOMParser|
|FR-7.3 영상 로드 성능|PLAYG-1305|SDS-5.2 비동기 파싱 알고리즘|VolumeBuilder|
|FR-7.4 메모리 사용량 모니터링|PLAYG-1305|SDS-3.3 monitorMemoryUsage()|VolumeBuilder|
---

*[SDS-02] 소프트웨어 구조*

*2.1 컴포넌트 계층 구조*

SAD(PLAYG-1311)에서 정의된 4계층 10모듈 구조를 기반으로, 각 모듈의 하위 클래스 및 함수 단위 설계를 정의한다.

||계층||모듈||하위 구성 요소||SDS 섹션||
|Data Layer|DICOMParser (COMP-1.1, PLAYG-1375)|DICOMParser 클래스|SDS-3.1|
|Data Layer|DataValidator (COMP-1.2, PLAYG-1376)|DataValidator 클래스|SDS-3.2|
|Business Layer|VolumeBuilder (COMP-2.1, PLAYG-1377)|VolumeBuilder 클래스|SDS-3.3|
|Business Layer|MeasurementEngine (COMP-2.2, PLAYG-1378)|MeasurementEngine 클래스|SDS-3.7|
|Business Layer|SecurityGuard (COMP-2.3, PLAYG-1379)|SecurityGuard 클래스|SDS-3.8|
|Rendering Layer|MPRRenderer (COMP-3.1, PLAYG-1380)|MPRRenderer 클래스|SDS-3.4|
|Rendering Layer|VolumeRenderer (COMP-3.2, PLAYG-1381)|VolumeRenderer 클래스|SDS-3.5|
|Rendering Layer|ViewTransformEngine (COMP-3.3, PLAYG-1382)|ViewTransformEngine 클래스|SDS-3.6|
|Presentation Layer|UIController (COMP-4.1, PLAYG-1383)|UIController 클래스|SDS-3.9|
|Presentation Layer|ViewportManager (COMP-4.2, PLAYG-1384)|ViewportManager 클래스|SDS-3.10|

*2.2 소프트웨어 구조 다이어그램*


---

*[SDS-02] 소프트웨어 구조*

*2.1 컴포넌트 계층 구조*

SAD(PLAYG-1311)에서 정의된 4계층 10모듈 구조를 기반으로, 각 모듈의 하위 클래스 및 함수 단위 설계를 정의한다.

||계층||모듈||하위 구성 요소||SDS 섹션||
|Data Layer|DICOMParser - COMP-1.1, PLAYG-1375|DICOMParser 클래스|SDS-3.1|
|Data Layer|DataValidator - COMP-1.2, PLAYG-1376|DataValidator 클래스|SDS-3.2|
|Business Layer|VolumeBuilder - COMP-2.1, PLAYG-1377|VolumeBuilder 클래스|SDS-3.3|
|Business Layer|MeasurementEngine - COMP-2.2, PLAYG-1378|MeasurementEngine 클래스|SDS-3.7|
|Business Layer|SecurityGuard - COMP-2.3, PLAYG-1379|SecurityGuard 클래스|SDS-3.8|
|Rendering Layer|MPRRenderer - COMP-3.1, PLAYG-1380|MPRRenderer 클래스|SDS-3.4|
|Rendering Layer|VolumeRenderer - COMP-3.2, PLAYG-1381|VolumeRenderer 클래스|SDS-3.5|
|Rendering Layer|ViewTransformEngine - COMP-3.3, PLAYG-1382|ViewTransformEngine 클래스|SDS-3.6|
|Presentation Layer|UIController - COMP-4.1, PLAYG-1383|UIController 클래스|SDS-3.9|
|Presentation Layer|ViewportManager - COMP-4.2, PLAYG-1384|ViewportManager 클래스|SDS-3.10|

*2.2 소프트웨어 구조 다이어그램*

```
@startuml
skinparam componentStyle rectangle
skinparam backgroundColor white
skinparam shadowing false

package "Presentation Layer" as PL {
  [UIController] as UC
  [ViewportManager] as VM
}

package "Rendering Layer" as RL {
  [MPRRenderer] as MR
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

UC --> VM : 뷰포트 제어
UC --> VTE : 사용자 입력 전달
VM --> MR : MPR 렌더링 요청
VM --> VR : 3D 렌더링 요청
VTE --> MR : 변환 적용
MR --> VB : 볼륨 데이터 조회
VR --> VB : 볼륨 데이터 조회
ME --> VB : 복셀 좌표 조회
ME --> DV : Pixel Spacing 검증
VB --> DP : 파싱된 DICOM 데이터
VB --> DV : 메타데이터 검증
DP --> DV : 메타데이터 전달

note right of SG : 모든 계층에서 참조 가능

@enduml
```
*[SDS-03] 상세 컴포넌트 설계*

*3.1 DICOMParser (COMP-1.1, PLAYG-1375)*

*목적*
사용자가 선택한 로컬 DICOM 파일을 파싱하여 메타데이터와 복셀 데이터를 추출하는 데이터 계층 컴포넌트이다. ADR-2(PLAYG-1371)에 따라 외부 라이브러리 없이 자체 구현한다.

*인터페이스*

||메서드||입력||출력||설명||추적 FR||
|parseDICOM|file: File|ParseResult{metadata, voxelData, errors}|DICOM 파일의 전체 파싱을 수행한다. 메타데이터와 복셀 데이터를 포함한 결과 객체를 반환한다.|FR-1.1, FR-1.3, FR-1.4|
|validateMagicByte|data: ArrayBuffer|boolean|DICOM 매직 바이트 오프셋 128바이트에 "DICM" 문자열이 있는지 확인한다.|FR-1.2, HAZ-1.1|
|validateTransferSyntax|meta: DICOMMetadata|boolean|Transfer Syntax UID(0002,0010)가 지원되는 암축 방식인지 확인한다. 압축 전송 구문은 지원하지 않는다.|FR-1.2, FR-7.2|
|parseMetadata|data: ArrayBuffer|DICOMMetadata|DICOM 헤더에서 환자 정보, 스터디 정보, 픽셀 간격, 슬라이스 두께, Image Orientation Patient 등 메타데이터를 파싱한다.|FR-1.3|
|parsePixelData|data: ArrayBuffer, meta: DICOMMetadata|ArrayBuffer|DICOM 픽셀 데이터 태그(7FE0,0010)를 찾아 복셀 데이터를 추출한다. BitsAllocated에 따라 8/16/32비트 데이터를 처리한다.|FR-1.4|
|handleParseError|error: ParseError|ErrorMessage|파싱 오류 발생 시 오류 유형별 메시지를 생성한다. 타임아웃 메커니즘을 적용한다.|FR-1.5, HAZ-5.2|

*입력*
- file: File - 웹 브라우저 File API에서 제공하는 로컬 파일 객체
- data: ArrayBuffer - FileReader로 읽은 DICOM 파일 원시 바이너리 데이터

*출력*
- ParseResult: { metadata: DICOMMetadata, voxelData: ArrayBuffer, errors: ErrorMessage[] }

*의존 관계*
- DataValidator: 파싱된 메타데이터 및 복셀 데이터 검증 의존
- 웹 브라우저 File API: 로컬 파일 읽기

*클래스 다이어그램*

```
@startuml
class DICOMParser {
  -buffer: ArrayBuffer
  -dataView: DataView
  -byteOffset: number
  -isLittleEndian: boolean
  +parseDICOM(file: File): ParseResult
  +validateMagicByte(data: ArrayBuffer): boolean
  +validateTransferSyntax(meta: DICOMMetadata): boolean
  +parseMetadata(data: ArrayBuffer): DICOMMetadata
  +parsePixelData(data: ArrayBuffer, meta: DICOMMetadata): ArrayBuffer
  +handleParseError(error: ParseError): ErrorMessage
  -readTag(offset: number): DicomTag
  -readValue(offset: number, vr: string, length: number): any
  -skipToPixelData(data: ArrayBuffer): number
  -determineByteOrder(meta: DICOMMetadata): void
}

class ParseResult {
  metadata: DICOMMetadata
  voxelData: ArrayBuffer
  errors: ErrorMessage[]
  isValid: boolean
}

DICOMParser --> ParseResult : 생성
DICOMParser --> DataValidator : 검증 요청

@enduml
```
*3.2 DataValidator (COMP-1.2, PLAYG-1376)*

*목적*
DICOM 파서가 추출한 메타데이터와 복셀 데이터의 유효성을 검증하는 데이터 계층 컴포넌트이다. HAZ-1.1, HAZ-2.1 위험 완화를 위한 핵심 검증 로직을 포함한다.

*인터페이스*

||메서드||입력||출력||설명||추적 FR||
|validateHeader|meta: DICOMMetadata|ValidationResult{isValid, warnings, errors}|DICOM 헤더 필수 태그 존재 여부 및 값 범위를 검증한다. PatientName, StudyDate, Modality 등 필수 태그를 확인한다.|FR-1.2, FR-1.3|
|validatePixelSpacing|meta: DICOMMetadata|ValidationResult|Pixel Spacing(0028,0030) 값의 존재 여부와 유효성을 검증한다. 값이 0 이하이거나 NaN인 경우 무효로 판정한다.|FR-4.2, HAZ-2.1|
|validateVoxelRange|voxels: ArrayBuffer, meta: DICOMMetadata|ValidationResult|복셀 데이터의 최소/최대값이 BitsAllocated에 따른 예상 범위 내에 있는지 검증한다. 범위 외 값이 임계치 초과 시 경고를 반환한다.|FR-1.4, HAZ-1.1|
|validateImageOrientation|meta: DICOMMetadata|ValidationResult|Image Orientation Patient(0020,0037) 값이 6개의 유효한 부동소수점 수이고 단위 벡터 조건을 만족하는지 검증한다.|FR-2.4, HAZ-1.2|

*입력*
- meta: DICOMMetadata - DICOMParser가 파싱한 메타데이터 객체
- voxels: ArrayBuffer - 복셀 픽셀 데이터

*출력*
- ValidationResult: { isValid: boolean, warnings: string[], errors: string[] }

*의존 관계*
- DICOMParser: 검증 대상 메타데이터 및 복셀 데이터 제공
- MeasurementEngine: Pixel Spacing 검증 결과 소비

*클래스 다이어그램*

```
@startuml
class DataValidator {
  +validateHeader(meta: DICOMMetadata): ValidationResult
  +validatePixelSpacing(meta: DICOMMetadata): ValidationResult
  +validateVoxelRange(voxels: ArrayBuffer, meta: DICOMMetadata): ValidationResult
  +validateImageOrientation(meta: DICOMMetadata): ValidationResult
  -checkRange(value: number, min: number, max: number): boolean
  -isValidNumber(value: any): boolean
}

class ValidationResult {
  isValid: boolean
  warnings: string[]
  errors: string[]
}

DataValidator --> ValidationResult : 생성

@enduml
```

*3.3 VolumeBuilder (COMP-2.1, PLAYG-1377)*

*목적*
DICOMParser에서 파싱된 복셀 데이터와 메타데이터를 사용하여 3차원 볼륨 데이터를 구성하는 비즈니스 계층 컴포넌트이다. ADR-3(PLAYG-1372)에 따라 모든 데이터는 메모리 상에서만 유지한다.

*인터페이스*

||메서드||입력||출력||설명||추적 FR||
|buildVolume|voxelData: ArrayBuffer, meta: DICOMMetadata|VolumeData|파싱된 복셀 데이터를 3차원 배열로 구성한다. dimensions, spacing, origin 속성을 계산하여 VolumeData 객체를 생성한다.|FR-1.4, FR-2.1~2.3|
|estimateMemory|fileSize: number|MemoryEstimate{estimatedBytes, isExceed, warningMessage}|파일 크기 기반으로 예상 메모리 사용량을 추정한다. 브라우저 메모리 한계(약 2GB) 초과 시 경고 메시지를 반환한다.|FR-1.6, HAZ-5.1|
|monitorMemoryUsage|무|MemoryStatus{usedBytes, limitBytes, usagePercent}|현재 메모리 사용량을 모니터링한다. performance.memory API(Chrome) 또는 추정치를 사용한다.|FR-7.4, HAZ-5.1|
|getVolume|무|VolumeData|null|현재 로드된 볼륨 데이터를 반환한다. 데이터가 없으면 null을 반환한다.|FR-2.1~2.6|
|releaseVolume|무|void|현재 로드된 볼륨 데이터의 ArrayBuffer 참조를 명시적으로 해제한다. SecurityGuard와 연동한다.|FR-5.3, HAZ-3.2|

*입력*
- voxelData: ArrayBuffer - DICOMParser가 추출한 복셀 픽셀 데이터
- meta: DICOMMetadata - DICOMParser가 파싱한 메타데이터
- fileSize: number - 원본 DICOM 파일 크기(바이트)

*출력*
- VolumeData: { voxelArray: Float32Array, dimensions: number[3], spacing: number[3], origin: number[3], dataType: string, minMaxValue: number[2] }
- MemoryEstimate: { estimatedBytes: number, isExceed: boolean, warningMessage: string }
- MemoryStatus: { usedBytes: number, limitBytes: number, usagePercent: number }

*의존 관계*
- DICOMParser: 파싱된 복셀 데이터 및 메타데이터 제공
- DataValidator: 복셀 값 범위 검증
- SecurityGuard: 메모리 해제 연동

*클래스 다이어그램*

```
@startuml
class VolumeBuilder {
  -currentVolume: VolumeData | null
  +buildVolume(voxelData: ArrayBuffer, meta: DICOMMetadata): VolumeData
  +estimateMemory(fileSize: number): MemoryEstimate
  +monitorMemoryUsage(): MemoryStatus
  +getVolume(): VolumeData | null
  +releaseVolume(): void
  -alignVoxels(data: ArrayBuffer, dims: number[]): Float32Array
  -calculateSpacing(meta: DICOMMetadata): number[3]
  -calculateOrigin(meta: DICOMMetadata): number[3]
}

class VolumeData {
  voxelArray: Float32Array
  dimensions: number[3]
  spacing: number[3]
  origin: number[3]
  dataType: string
  minMaxValue: number[2]
}

class MemoryEstimate {
  estimatedBytes: number
  isExceed: boolean
  warningMessage: string
}

VolumeBuilder --> VolumeData : 생성
VolumeBuilder --> MemoryEstimate : 생성
VolumeBuilder --> SecurityGuard : 메모리 해제 연동

@enduml
```

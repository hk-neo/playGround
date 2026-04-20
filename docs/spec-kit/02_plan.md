# 기술 이행 계획서 (Implementation Plan)

**티켓**: PLAYG-1385
**제목**: [SDS-3.1] DICOMParser 상세 설계 — 기술 이행 계획
**작성일**: 2026-04-20
**상태**: Draft
**IEC 62304 안전 등급**: Class A

---

## 1. Summary (요약)

본 문서는 Simple CBCT Viewer의 Data Layer 핵심 컴포넌트인 **DICOMParser(COMP-1.1, PLAYG-1375)**의
구현을 위한 기술 이행 계획서이다.

DICOMParser는 사용자가 선택한 로컬 DICOM 파일을 파싱하여 메타데이터와 복셀 데이터를 추출하는 역할을 수행하며,
ADR-2(PLAYG-1371)에 따라 **외부 라이브러리 없이 자체 구현**한다.

본 계획은 specs/spec-kit/01_spec.md 의 기능 명세와 docs/artifacts/SDS.md 의 SDS-3.1 상세 설계를 기반으로
구현 단계별 작업 항목, 기술적 결정 사항, 복잡도 추적 체계를 정의한다.

**핵심 목표**:
- DICOM 3.0 표준 파일 파싱 (지원 전송 구문: Explicit/Implicit VR Little Endian, Explicit VR Big Endian)
- 메타데이터 및 픽셀 데이터 추출을 통한 하위 계층(VolumeBuilder, MPRRenderer 등) 데이터 제공
- 파싱 오류에 대한 안전한 처리 (HAZ-1.1, HAZ-5.2 완화)
- 단위 테스트 커버리지 90% 이상 달성

---

## 2. Technical Context (기술 컨텍스트)

### 2.1 대상 시스템

| 항목 | 내용 |
|------|------|
| 제품명 | Simple CBCT Viewer |
| 유형 | 웹 브라우저 기반 CBCT 영상 뷰어 (오프라인 동작) |
| 안전 등급 | IEC 62304 Class A |
| 대상 컴포넌트 | DICOMParser (COMP-1.1, SDS-3.1) |
| 소속 계층 | Data Layer |

### 2.2 핵심 아키텍처 결정

| ADR | 내용 | 영향 |
|-----|------|------|
| ADR-2 (PLAYG-1371) | 외부 DICOM 라이브러리 미사용, 자체 파서 구현 | 모든 파싱 로직을 순수 TypeScript로 직접 구현 |
| ADR-3 (PLAYG-1372) | 메모리 무상태 데이터 처리 | ArrayBuffer 기반 메모리 관리, 명시적 해제 |
| ADR-5 (PLAYG-1374) | 정적 단일 번들 배포 | 트리쉐이킹 가능한 모듈 구조 |

### 2.3 의존성 분석

**업스트림 의존 (본 컴포넌트가 사용)**:
- 웹 브라우저 File API (FileReader.readAsArrayBuffer)
- DataView — 바이너리 데이터 읽기
- TextDecoder — 문자열 디코딩 (환자 이름 등)

**다운스트림 의존 (본 컴포넌트를 사용)**:
- DataValidator (COMP-1.2) — 파싱 결과 메타데이터/복셀 데이터 검증
- VolumeBuilder (COMP-2.1) — 파싱 결과를 기반으로 3D 볼륨 구성

**인터페이스 의존**:
- ParseResult 타입 — DICOMParser의 출력 타입 정의
- DICOMMetadata 타입 — 메타데이터 구조 정의
- ErrorInfo / ErrorMessage 타입 — 에러 정보 구조 정의

### 2.4 지원 전송 구문 (Transfer Syntax)

| UID | 이름 | VR 모드 | 엔디안 | 지원 |
|-----|------|---------|--------|------|
| 1.2.840.10008.1.2 | Implicit VR Little Endian | Implicit | Little | O |
| 1.2.840.10008.1.2.1 | Explicit VR Little Endian | Explicit | Little | O |
| 1.2.840.10008.1.2.2 | Explicit VR Big Endian | Explicit | Big | O |
| 1.2.840.10008.1.2.4.* | JPEG 압축 계열 | - | - | X |
| 1.2.840.10008.1.2.5 | RLE Lossless | - | - | X |

---

## 3. Constitution Check (구성 점검)

### 3.1 요구사항 추적성 매트릭스

| SRS 요구사항 | 근거 티켓 | 구현 인터페이스 | 구현 단계 | 상태 |
|-------------|----------|----------------|----------|------|
| FR-1.1 DICOM 파일 선택 | PLAYG-1293 | parseDICOM() | Phase 1 | 계획 |
| FR-1.2 DICOM 파일 형식 검증 | PLAYG-1293 | validateMagicByte(), validateTransferSyntax() | Phase 1 | 계획 |
| FR-1.3 DICOM 메타데이터 파싱 | PLAYG-1294 | parseMetadata() | Phase 2 | 계획 |
| FR-1.4 복셀 데이터 파싱 및 검증 | PLAYG-1294 | parsePixelData() | Phase 2 | 계획 |
| FR-1.5 비표준 파일 오류 처리 | PLAYG-1293 | handleParseError() | Phase 3 | 계획 |
| FR-7.2 DICOM 3.0 준수 | PLAYG-1304 | 전체 인터페이스 | Phase 1-3 | 계획 |

### 3.2 위험 완화 추적

| 위험 ID | 위험 내용 | 완화 조치 | 구현 위치 | 상태 |
|---------|----------|----------|----------|------|
| HAZ-1.1 | 프로세스 크래시 | try-catch 전체 래핑, 항상 ParseResult 반환 | parseDICOM() | 계획 |
| HAZ-5.2 | 악의적 파일 공격 | MAX_TAG_LENGTH 제한, 무한 루프 방지 카운터 | parseDataElements() | 계획 |

### 3.3 비기능 요구사항 준수 계획

| NFR | 요구사항 | 준수 방안 | 검증 방법 |
|-----|----------|----------|----------|
| NFR-001 | 512x512 16-bit 100ms 이내 | DataView 직접 읽기, 불필요한 복사 최소화 | 성능 벤치마크 테스트 |
| NFR-002 | 파일 크기 2배 초과 메모리 할당 금지 | 입력 버퍼 재사용, 픽셀 데이터 슬라이스 활용 | 메모리 프로파일링 |
| NFR-003 | 파싱 오류 시에도 ParseResult 반환 | 전체 파싱 흐름 try-catch 래핑 | 오류 시나리오 테스트 |
| NFR-004 | 악의적 파일 안전 처리 | 태그 길이 상한 검증, 반복문 가드 | 퍼즈 테스트 유닛 |
| NFR-005 | 확장 가능한 구조 | 전략 패턴 기반 VR 리더, Transfer Syntax 레지스트리 | 신규 VR 추가 테스트 |

---

## 4. Project Structure (프로젝트 구조)

### 4.1 디렉토리 구조

```
src/
  data-layer/
    dicom-parser/
      index.ts                    # 공개 API 엑스포트
      DICOMParser.ts              # 메인 파서 클래스
      constants.ts                # 매직 바이트, 태그 정의, 전송 구문 UID 상수
      types.ts                    # ParseResult, DICOMMetadata, ErrorInfo 등 타입 정의
      vr-readers.ts               # VR(Value Representation)별 데이터 읽기 함수 모음
      tag-registry.ts             # DICOM 태그 레지스트리 (태그 번호 → 이름/VR 매핑)
      transfer-syntax.ts          # 전송 구문 검증 및 바이트 오더 결정 로직
      byte-reader.ts              # DataView 래퍼 — 오프셋 관리, 엔디안 읽기 유틸리티
      errors.ts                   # 에러 코드 열거형 및 ErrorMessage 생성 팩토리
    data-validator/               # COMP-1.2 (본 계획 범위 외, 인터페이스만 정의)
      types.ts                    # ValidationResult 타입 정의
  shared/
    types.ts                      # 공통 타입 정의 (필요시)

tests/
  unit/
    data-layer/
      dicom-parser/
        DICOMParser.test.ts       # 파서 통합 테스트
        validateMagicByte.test.ts # 매직 바이트 검증 테스트
        validateTransferSyntax.test.ts  # 전송 구문 검증 테스트
        parseMetadata.test.ts     # 메타데이터 파싱 테스트
        parsePixelData.test.ts    # 픽셀 데이터 파싱 테스트
        handleParseError.test.ts  # 에러 핸들링 테스트
        byte-reader.test.ts       # 바이트 리더 유틸리티 테스트
        vr-readers.test.ts        # VR 리더 테스트
        edge-cases.test.ts        # 엣지 케이스 전용 테스트 (EC-001 ~ EC-007)
  fixtures/
    valid-dicom-512x512-16bit.dcm   # 정상 DICOM 테스트 파일
    valid-dicom-256x256-8bit.dcm    # 8-bit 정상 파일
    no-magic-byte.dcm               # 매직 바이트 누락 파일
    truncated-file.dcm              # 잘린 파일
    unsupported-syntax.dcm          # 미지원 전송 구문 파일
    invalid-tag-length.dcm          # 비정상 태그 길이 파일
    large-tag-value.dcm             # 비정상 큰 태그 값 파일 (HAZ-5.2)
    duplicate-tags.dcm              # 중복 태그 포함 파일
    no-pixel-data.dcm               # 픽셀 데이터 태그 없는 파일
```

### 4.2 모듈 역할 및 책임

| 모듈 | 역할 | 라인 추정 | 복잡도 |
|------|------|----------|--------|
| DICOMParser.ts | 전체 파싱 오케스트레이션, 공개 API 제공 | ~250 | 중간 |
| byte-reader.ts | DataView 래퍼, 오프셋 자동 관리, 엔디안 처리 | ~150 | 낮음 |
| vr-readers.ts | 27개 DICOM VR 타입별 데이터 읽기 함수 | ~400 | 중간 |
| tag-registry.ts | 태그 번호 → 이름/VR 매핑 테이블 | ~300 | 낮음 |
| transfer-syntax.ts | 전송 구문 검증, 바이트 오더 결정 | ~80 | 낮음 |
| constants.ts | 매직 바이트, 상한값, 열거형 정의 | ~100 | 낮음 |
| types.ts | TypeScript 타입/인터페이스 정의 | ~120 | 낮음 |
| errors.ts | 에러 코드, 에러 메시지 생성 | ~80 | 낮음 |
| **합계** | | **~1,480** | |

### 4.3 공개 API (index.ts 엑스포트)

```
export { DICOMParser } from './DICOMParser'
export type { ParseResult, DICOMMetadata, ErrorInfo, ErrorCode, DataElement, DICOMDataSet } from './types'
export { DICOMErrorCodes } from './errors'
```

---

## 5. Implementation Approach (구현 접근 방식)

### 5.1 Phase 순서 및 접근 전략

#### Phase 1: 기반 인프라 및 검증 (1-2일)
- **목표**: DICOM 파일의 기본 검증 로직과 바이너리 읽기 기반을 구축한다.
- **작업 항목**:
  1. `types.ts` — ParseResult, DICOMMetadata, ErrorInfo, DataElement, DICOMDataSet 등 핵심 타입 정의
  2. `constants.ts` — DICM 매직 바이트(0x44, 0x49, 0x43, 0x4D), 전송 구문 UID 상수, MAX_TAG_LENGTH(64MB) 상수 정의
  3. `errors.ts` — ErrorCode 열거형(INVALID_FORMAT, TRUNCATED_DATA, INVALID_TAG_LENGTH, UNSUPPORTED_SYNTAX, MISSING_REQUIRED_TAG, INVALID_FILE_SIZE) 및 ErrorInfo 팩토리 함수
  4. `byte-reader.ts` — DataView 래퍼 클래스 구현 (오프셋 자동 증가, Little/Big Endian 읽기, 경계 검사)
  5. `validateMagicByte()` 구현 — offset 128에서 "DICM" 시그니처 확인
  6. `transfer-syntax.ts` — 전송 구문 검증 로직, 바이트 오더 및 VR 모드 결정
  7. `validateMagicByte.test.ts`, `validateTransferSyntax.test.ts`, `byte-reader.test.ts` 작성
- **산출물**: 검증 계층이 포함된 DICOMParser 기본 골격
- **검증**: EC-001(132바이트 미만 파일), EC-002(비정상 프리앰블), EC-003(전송 구문 누락) 엣지 케이스 통과

#### Phase 2: 핵심 파싱 엔진 (2-3일)
- **목표**: DICOM 데이터 요소를 순차적으로 읽어 메타데이터와 픽셀 데이터를 추출한다.
- **작업 항목**:
  1. `tag-registry.ts` — DICOM 태그 번호(그룹,엘리먼트) → 이름/VR 매핑 테이블 구축 (환자/스터디/시리즈/이미지 필수 태그 포함)
  2. `vr-readers.ts` — 27개 VR 타입별 읽기 함수 구현 (US, SS, UL, SL, FL, FD, OB, OW, SQ, UN 등)
     - 전략 패턴 적용: Map<string, VRReader> 레지스트리로 VR 타입 핸들러 등록
     - NFR-005(확장성)를 위해 새로운 VR 추가 시 팩토리만 변경하면 되도록 설계
  3. `parseDataElements()` — 파일 메타 정보(그룹 0002)와 데이터셋(그룹 0004+)을 분리하여 순차 파싱
     - Explicit VR / Implicit VR 모드 자동 전환 (전송 구문에 따름)
     - 태그 길이 상한 검증 (HAZ-5.2 완화: MAX_TAG_LENGTH 초과 시 INVALID_TAG_LENGTH 에러)
     - 무한 루프 방지 가드 (오프셋 미증가 감지 시 파싱 중단)
  4. `parseMetadata()` — 추출된 DataElement 맵에서 필수 메타데이터 필드를 조합하여 Metadata 객체 생성
     - 필수 태그 누락 시 warning 레벨 ErrorInfo 기록
  5. `parsePixelData()` — 태그 (7FE0,0010)에서 픽셀 데이터를 ArrayBuffer로 추출
     - Bits Allocated, Bits Stored, Pixel Representation 속성 반영
     - 멀티프레임 지원 (NumberOfFrames 기반)
  6. `DICOMParser.ts` — `parseDICOM(input: File | ArrayBuffer): ParseResult` 메인 진입점
     - File → ArrayBuffer 변환 (FileReader.readAsArrayBuffer)
     - Phase 1 검증 → Phase 2 파싱 → 결과 조합의 전체 흐름 오케스트레이션
  7. 단위 테스트: `parseMetadata.test.ts`, `parsePixelData.test.ts`, `DICOMParser.test.ts` 작성
- **산출물**: 완전한 기능의 DICOMParser 코어 엔진
- **검증**: FR-001 ~ FR-005 요구사항 충족, EC-004(픽셀 데이터 없음), EC-006(VR 혼재), EC-007(중복 태그) 통과

#### Phase 3: 에러 핸들링 및 안전성 강화 (1-2일)
- **목표**: 모든 오류 시나리오에 대해 안전한 처리를 보장한다.
- **작업 항목**:
  1. `handleParseError()` — 파싱 중 발생하는 모든 예외를 ErrorInfo로 변환
  2. 전체 파싱 흐름 try-catch 래핑 (HAZ-1.1 완화: 프로세스 크래시 방지)
  3. 항상 ParseResult 반환 보장 (부분 파싱 결과 + 에러 배열)
  4. `handleParseError.test.ts`, `edge-cases.test.ts` 작성
     - EC-005(비정상 태그 길이), EC-006(VR 혼재) 심층 테스트
  5. 퍼즈 테스트 유틸리티 — 랜덤 바이트 시퀀스에 대한 파서 안정성 검증
- **산출물**: 크래시 없는 안전한 파서
- **검증**: SC-003(손상 파일 프로세스 크래시 0건), SC-004(에러 메시지 반환률 100%)

#### Phase 4: DataValidator 연동 및 통합 (1일)
- **목표**: DataValidator(COMP-1.2)와의 연동 인터페이스를 구현하고 통합 테스트를 수행한다.
- **작업 항목**:
  1. DataValidator 인터페이스 타입 정의 (ValidationResult, ValidationRule)
  2. DICOMParser 파싱 완료 후 DataValidator.validate() 호출 지점 구현
  3. DataValidator mock을 활용한 연동 테스트 작성
  4. `index.ts` — 공개 API 엑스포트 구성
  5. 성능 벤치마크 테스트 — NFR-001(100ms 이내) 검증
  6. 메모리 사용량 프로파일링 — NFR-002(파일 크기 2배 이내) 검증
- **산출물**: 통합 완료된 DICOMParser 모듈
- **검증**: 모든 단위/통합 테스트 통과, 테스트 커버리지 90% 이상 (SC-002)

### 5.2 Key Technical Decisions (주요 기술 결정)

- **결정 1: DataView 기반 직접 바이너리 읽기 (외부 라이브러리 불사용)**
  - 이유: ADR-2(PLAYG-1371)에 따라 외부 DICOM 파싱 라이브러리(dafo.js, dicomParser 등)를 사용하지 않고 순수 TypeScript로 자체 구현. DataView API를 사용하면 엔디안 처리와 오프셋 관리를 정밀하게 제어할 수 있으며, 번들 크기를 최소화할 수 있음
  - 대안 검토: dafo.js(오픈소스 DICOM 파서) 사용 → ADR-2 위배로 기각

- **결정 2: ByteReader 유틸리티 클래스로 DataView 래핑**
  - 이유: 오프셋 자동 증가, 엔디안 추상화, 경계 검사 등 공통 기능을 캡슐화하여 파싱 로직의 복잡도를 낮춤. 파서 전체에서 일관된 바이트 읽기 패턴을 보장함
  - 대안 검토: DataView 직접 사용 → 오프셋 관리가 분산되어 버그 유발 가능성 높음

- **결정 3: VR 리더에 전략 패턴(Map<string, VRReader>) 적용**
  - 이유: 27개 VR 타입 각각의 읽기 로직을 독립적인 함수로 분리하고, 레지스트리 Map으로 관리. NFR-005(확장성)를 만족하며 새로운 VR 타입 추가 시 기존 코드를 수정할 필요가 없음 (OCP 준수)
  - 대안 검토: switch-case 분기 → VR 추가 시 기존 함수 수정 필요, OCP 위반

- **결정 4: 파일 메타 정보(그룹 0002)와 데이터셋(그룹 0004+)의 분리 처리**
  - 이유: DICOM 3.0 표준에서 파일 메타 정보는 항상 Explicit VR Little Endian으로 인코딩되며, 데이터셋은 전송 구문에 따라 다름. 두 구간의 VR 처리 방식이 다르므로 명확히 분리해야 함
  - 근거: DICOM PS3.10 Section 7, FR-010

- **결정 5: 에러 수집 패턴 (예외 throw 대신 errors 배열 누적)**
  - 이유: 의료 영상에서 부분적으로 파싱된 데이터도 가치가 있을 수 있음. NFR-003(항상 ParseResult 반환)을 만족하기 위해 파싱을 중단하지 않고 에러를 수집하며 계속 진행함
  - 대안 검토: 예외 throw → 첫 번째 오류에서 파싱 중단, 부분 데이터 손실

- **결정 6: 픽셀 데이터에 슬라이스(ArrayBuffer.slice) 활용 (복사 방지)**
  - 이유: NFR-002(메모리 제한)를 준수하기 위해 픽셀 데이터를 새 ArrayBuffer로 복사하지 않고 원본 버퍼의 슬라이스를 반환. 파일 크기의 2배를 초과하는 메모리 할당을 방지함
  - 대안 검토: 새 ArrayBuffer에 복사 → 메모리 사용량 2배 증가
### 5.3 구현 순서 다이어그램

```
parseDICOM(input)
  │
  ├─ Phase 1: 기반 검증
  │   ├─ File → ArrayBuffer 변환 (FileReader)
  │   ├─ 파일 크기 검사 (≥ 132 bytes) ─── EC-001
  │   ├─ validateMagicByte(offset 128 = "DICM")
  │   ├─ 파일 메타 정보 파싱 (그룹 0002, 항상 Explicit VR LE)
  │   └─ validateTransferSyntax(MetaInfo.MediaStorageSOPClassUID)
  │
  ├─ Phase 2: 핵심 파싱
  │   ├─ 전송 구문 기반 VR 모드/엔디안 결정
  │   ├─ parseDataElements() ── 데이터셋 순차 읽기
  │   │   ├─ 태그 읽기 (그룹, 엘리먼트)
  │   │   ├─ VR 읽기 (Explicit 모드) 또는 룩업 (Implicit 모드)
  │   │   ├─ 길이 읽기 + MAX_TAG_LENGTH 검증 ─── HAZ-5.2
  │   │   ├─ VR 리더로 값 읽기 (전략 패턴)
  │   │   └─ DataElement → Map<tag, DataElement> 저장
  │   ├─ parseMetadata(DataElement Map) → Metadata
  │   └─ parsePixelData(DataElement Map) → ArrayBuffer | null
  │
  ├─ Phase 3: 에러 수집 및 안전성
  │   ├─ handleParseError() — 에러 → ErrorInfo 변환
  │   ├─ errors 배열 누적 (warning/error 레벨 구분)
  │   └─ 항상 ParseResult 반환 보장 ─── HAZ-1.1
  │
  └─ Phase 4: 연동
      ├─ DataValidator.validate(ParseResult) 호출
      └─ ParseResult { metadata, voxelData, errors } 반환
```

### 5.4 테스트 전략

| 테스트 유형 | 대상 | 도구 | 목표 커버리지 |
|------------|------|------|-------------|
| 단위 테스트 | 각 모듈 함수/클래스 | Vitest | 90% 이상 |
| 엣지 케이스 테스트 | EC-001 ~ EC-007 | Vitest | 100% 시나리오 커버 |
| 통합 테스트 | parseDICOM() 전체 흐름 | Vitest | 핵심 경로 100% |
| 성능 테스트 | NFR-001 (100ms) | Vitest + performance.now() | 벤치마크 |
| 메모리 테스트 | NFR-002 (파일 크기 2배 이내) | Chrome DevTools Protocol | 프로파일링 |
| 퍼즈 테스트 | 랜덤 바이트 입력 | 커스텀 유틸리티 | 크래시 0건 |

### 5.5 테스트 픽스처 관리

테스트용 DICOM 파일은 `tests/fixtures/` 디렉토리에 관리한다. 실제 의료 데이터를 사용할 수 없으므로,
프로그래밍 방식으로 생성한 합성 DICOM 파일을 사용한다.

- `generateTestDICOM()` 유틸리티 함수 — 매개변수(해상도, 비트 깊이, 전송 구문, 프레임 수 등)를 받아 메모리상에
  유효한 DICOM ArrayBuffer를 생성하는 헬퍼
- 손상 파일 픽스처 — 의도적으로 특정 위치를 변조(매직 바이트 제거, 태그 길이 조작, 데이터 잘림 등)한 버전

---

## 6. Complexity Tracking (복잡도 추적)

### 6.1 복잡도 항목

| ID | 항목 | 복잡도 | 정당성 | 완화 전략 |
|----|------|--------|--------|----------|
| CX-1 | 27개 VR 타입별 읽기 로직 (vr-readers.ts) | 중간 | DICOM 표준에 정의된 다양한 데이터 타입을 지원해야 함 | 전략 패턴으로 각 VR을 독립 함수로 분리, 단위 테스트로 개별 검증 |
| CX-2 | Explicit/Implicit VR 모드 전환 처리 | 중간 | 전송 구문에 따라 바이너리 구조가 다름 (VR 필드 존재 여부) | ByteReader에서 VR 모드를 파라미터로 받아 일관된 인터페이스 제공 |
| CX-3 | Big Endian / Little Endian 이중 지원 | 낮음-중간 | DICOM 표준이 두 엔디안을 모두 정의함 | ByteReader에서 엔디안을 추상화하여 파싱 로직은 엔디안 무지하게 설계 |
| CX-4 | SQ(Sequence) VR 중첩 구조 파싱 | 높음 | DICOM 시퀀스는 무한 중첩이 가능하며, 항목 구분자(FFFE,E00D/E0DD) 처리가 복잡함 | 재귀 깊이 제한(MAX_SEQUENCE_DEPTH=16) 적용, 명시적 스택 기반 반복으로 전환 가능 |
| CX-5 | 에러 수집하면서 파싱 계속 진행 | 중간 | 부분 데이터 보존 요구(NFR-003)와 정상 흐름 유지의 충돌 | 파싱 루프 내에서 try-catch로 개별 태그 에러를 격리하고, errors 배열에 누적 |
| CX-6 | File 메타 정보(그룹 0002)와 데이터셋 분리 | 낮음 | DICOM PS3.10에서 두 구간의 인코딩 규칙이 다름 | 명확한 오프셋 경계로 두 구간을 분리하고, 각각에 맞는 VR 모드 적용 |

### 6.2 복잡도 완화 추이

- Phase 1 완료 후: CX-3(엔디안), CX-6(구간 분리) → 낮음으로 감소 (ByteReader 추상화로 해결)
- Phase 2 완료 후: CX-1(VR 리더), CX-2(VR 모드) → 낮음-중간으로 감소 (전략 패턴 적용)
- Phase 3 완료 후: CX-5(에러 수집) → 낮음으로 감소 (에러 격리 패턴 확립)
- Phase 4 완료 후: CX-4(시퀀스 파싱) → 중간으로 유지 또는 Phase 2 범위에서 기본 지원 후 Phase 4에서 보완

### 6.3 [NEEDS CLARIFICATION] 항목

| ID | 내용 | 영향 | 결정 필요 시점 |
|----|------|------|---------------|
| NC-1 | SQ(Sequence) VR의 중첩 깊이 제한값(MAX_SEQUENCE_DEPTH)을 16으로 설정할지, 더 보수적으로 할지 | CX-4 복잡도에 직접 영향 | Phase 2 시작 전 |
| NC-2 | Private Creator 태그(그룹 0009, 0011 등)의 처리 수준 — 무시할지, 원시 데이터로 저장할지 | tag-registry.ts 규모에 영향 | Phase 2 시작 전 |
| NC-3 | 픽셀 데이터가 압축 해제된 형태인지 압축된 형태인지 확인할 필요가 있는지 (지원하지 않는 압축은 Phase 1에서 이미 차단됨) | parsePixelData 로직 복잡도 | Phase 2 설계 시 |
---

## 7. References (참조)

| 항목 | 위치 |
|------|------|
| 기능 명세서 | `docs/spec-kit/01_spec.md` |
| 상세 설계 (SDS-3.1) | `docs/artifacts/SDS.md` |
| 소프트웨어 요구사항 명세(SRS) | `docs/artifacts/SRS.md` |
| 시스템 아키텍처(SAD) | `docs/artifacts/SAD.md` |
| 위험 관리 보고서(RMR) | `docs/artifacts/RMR.md` |
| Jira 티켓 | `PLAYG-1385` — [SDS-3.1] DICOMParser 상세 설계 |
| ADR-2 (외부 라이브러리 미사용) | `PLAYG-1371` |
| ADR-3 (메모리 무상태 데이터 처리) | `PLAYG-1372` |
| ADR-5 (정적 단일 번들 배포) | `PLAYG-1374` |
| DICOM 표준 | PS3.5 (Data Structure and Encoding), PS3.10 (Media Storage and File Format) |

---

*본 문서는 `docs/spec-kit/01_spec.md`의 기능 명세와 `docs/artifacts/SDS.md`의 SDS-3.1 상세 설계를 기반으로 작성되었으며,
템플릿(`templates/plan_template.md`)의 섹션 구조를 준수합니다.*

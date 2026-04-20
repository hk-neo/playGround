# Tasks: DICOMParser 상세 설계

**Input**: `docs/spec-kit/01_spec.md`, `docs/spec-kit/02_plan.md`
**Ticket**: `PLAYG-1385` | **Date**: 2026-04-20

> **형식 안내**
> - `[ID]` : 태스크 번호 (T001, T002, ...)
> - `[P]` : 병렬 실행 가능 여부 표시 (🔀 병렬 가능 / 🔒 순서 필수)
> - `[Story]` : 관련 사용자 스토리 (US1, US2, ...)
> - 각 태스크는 **2시간 이내** 완료 가능한 단위로 분할

---

## Phase 1: Setup (공통 인프라)
<!-- 모든 다음 단계에 필요한 공통 환경 설정 -->

- [ ] **T001** 🔒 DICOMParser 모듈 디렉토리 구조 생성 및 TypeScript 설정
  - 파일: `src/data-layer/dicom-parser/`, `tests/unit/data-layer/dicom-parser/`, `tests/fixtures/`
  - 내용:
    - `src/data-layer/dicom-parser/` 디렉토리 생성
    - `tests/unit/data-layer/dicom-parser/` 디렉토리 생성
    - `tests/fixtures/` 디렉토리 생성
    - `tsconfig.json`에 DICOMParser 경로 alias 매핑 추가 (필요시)
    - `.gitkeep` 파일로 빈 디렉토리 구조 보존
  - 완료 조건: 디렉토리 구조가 `02_plan.md` 섹션 4.1과 일치하고, TypeScript 컴파일 에러 없음

- [ ] **T002** 🔒 핵심 타입 정의 (`types.ts`)
  - 파일: `src/data-layer/dicom-parser/types.ts`
  - 내용:
    - `ParseResult` 인터페이스: `{ metadata: DICOMMetadata; voxelData: ArrayBuffer | null; errors: ErrorInfo[] }`
    - `DICOMMetadata` 인터페이스: patientName, patientID, studyInstanceUID, seriesInstanceUID, studyDate, modality, rows, columns, bitsAllocated, bitsStored, pixelRepresentation, samplesPerPixel, numberOfFrames 필드 정의
    - `ErrorInfo` 인터페이스: code(ErrorCode), message(string), tag(string | null), severity('error' | 'warning'), offset(number | null)
    - `ErrorCode` 열거형: INVALID_FORMAT, TRUNCATED_DATA, INVALID_TAG_LENGTH, UNSUPPORTED_SYNTAX, MISSING_REQUIRED_TAG, INVALID_FILE_SIZE
    - `DataElement` 인터페이스: tag(string), vr(string), length(number), value(ArrayBuffer), offset(number)
    - `DICOMDataSet` 인터페이스: elements(Map<string, DataElement>), transferSyntax(string), isExplicitVR(boolean)
    - `VRReader` 타입 alias: `(reader: ByteReader, length: number, vr: string) => unknown`
  - 완료 조건: 모든 타입이 TypeScript 컴파일 에러 없이 정의되고, `02_plan.md` 섹션 4.2 데이터 모델과 일치함

- [ ] **T003** 🔒 상수 및 에러 정의 (`constants.ts`, `errors.ts`)
  - 파일: `src/data-layer/dicom-parser/constants.ts`, `src/data-layer/dicom-parser/errors.ts`
  - 내용:
    - `constants.ts`:
      - DICOM_MAGIC_BYTE 상수: `[0x44, 0x49, 0x43, 0x4D]` ('DICM')
      - DICOM_PREAMBLE_LENGTH: `128`
      - DICOM_MAGIC_OFFSET: `128`
      - DICOM_MIN_FILE_SIZE: `132`
      - MAX_TAG_LENGTH: `67_108_864` (64MB, HAZ-5.2 완화)
      - MAX_SEQUENCE_DEPTH: `16` (CX-4 복잡도 완화)
      - 지원 전송 구문 UID 상수 (IMPLICIT_VR_LE, EXPLICIT_VR_LE, EXPLICIT_VR_BE)
      - 파일 메타 정보 그룹 번호: `0x0002`
      - 픽셀 데이터 태그: `(0x7FE0, 0x0010)`
    - `errors.ts`:
      - `DICOMErrorCodes` 객체: ErrorCode → 기본 메시지 매핑
      - `createErrorInfo(code, overrides?)` 팩토리 함수
      - `createWarningInfo(code, overrides?)` 팩토리 함수 (severity='warning')
  - 완료 조건: 상수가 `01_spec.md` EC-001~EC-007 및 `02_plan.md` 섹션 2.4와 일치하고, 에러 팩토리가 정상 동작함

- [ ] **T004** 🔒 ByteReader 유틸리티 클래스 구현 (`byte-reader.ts`)
  - 파일: `src/data-layer/dicom-parser/byte-reader.ts`
  - 내용:
    - `ByteReader` 클래스:
      - 생성자: `new ByteReader(buffer: ArrayBuffer)` → 내부 DataView 생성
      - `offset` 속성: 현재 읽기 위치 (getter/setter)
      - `byteLength` 속성: 전체 버퍼 길이
      - `isLittleEndian` 속성: 엔디안 설정 (기본 true)
      - `readUint8()`, `readUint16()`, `readUint32()`, `readInt16()`, `readInt32()`, `readFloat32()`, `readFloat64()`
      - `readString(length)`: 지정 길이만큼 문자열 읽기
      - `readBytes(length)`: 지정 길이만큼 ArrayBuffer 슬라이스 반환
      - `canRead(bytes)`: 남은 바이트 수 확인
      - `skip(bytes)`: 오프셋 이동
      - `alignTo2()`: 2바이트 정렬 (오프셋이 홀수면 1 증가)
    - 모든 읽기 메서드는 자동으로 offset을 증가시킴
    - 경계 초과 시 RangeError 발생
  - 완료 조건: 모든 읽기 메서드가 Little/Big Endian 모두 지원하고, 오프셋 자동 증가 확인, 경계 검사 동작 확인

- [ ] **T005** 🔒 테스트 픽스처 생성 유틸리티 구현
  - 파일: `tests/fixtures/generateTestDICOM.ts`
  - 내용:
    - `generateTestDICOM(options)` 함수:
      - 매개변수: rows, columns, bitsAllocated, bitsStored, pixelRepresentation, samplesPerPixel, numberOfFrames, transferSyntax, patientName, patientID 등
      - 128바이트 프리앰블 (0x00으로 채움)
      - 'DICM' 매직 바이트
      - 파일 메타 정보 (그룹 0002): 파일 메타 정보 버전, 전송 구문 UID, SOP Class UID 등
      - 데이터셋: 환자/스터디/시리즈/이미지 속성 태그 + 픽셀 데이터
    - `generateInvalidDICOM(type)` 함수:
      - type: 'no-magic', 'truncated', 'invalid-tag-length', 'large-tag-value', 'duplicate-tags', 'no-pixel-data', 'unsupported-syntax'
      - 각 EC 시나리오에 대응하는 고장 DICOM 데이터 생성
  - 완료 조건: 생성된 ArrayBuffer가 ByteReader로 읽었을 때 프리앰블+매직바이트+메타정보 구조가 올바름, EC-001~EC-007 시나리오별 픽스처 생성 가능

- [ ] **T006** 🔒 ByteReader 단위 테스트 작성
  - 파일: `tests/unit/data-layer/dicom-parser/byte-reader.test.ts`
  - 내용:
    - Little Endian 읽기 테스트 (Uint8, Uint16, Uint32, Int16, Int32, Float32, Float64)
    - Big Endian 읽기 테스트
    - 오프셋 자동 증가 검증
    - `readString()` UTF-8 디코딩 테스트
    - `readBytes()` 슬라이스 반환 테스트
    - `canRead()` 경계 확인 테스트
    - `skip()` 및 `alignTo2()` 동작 테스트
    - 버퍼 경계 초과 시 RangeError 발생 테스트
  - 완료 조건: ByteReader 전체 메서드 커버리지 100%, 모든 테스트 PASS

---

## Phase 2: Foundational (선행 필수 항목)
<!-- CRITICAL: 사용자 스토리 구현 전 반드시 완료해야 할 핵심 인프라 -->

- [ ] **T007** 🔒 DICOM 태그 레지스트리 구축 (`tag-registry.ts`)
  - 파일: `src/data-layer/dicom-parser/tag-registry.ts`
  - 내용:
    - `DICOMTag` 인터페이스: tag(string, 'XXXX,XXXX'), name(string), vr(string)
    - `TAG_REGISTRY: Map<string, DICOMTag>` — 필수 태그 매핑:
      - 파일 메타 정보 (0002,xxxx): Media Storage SOP Class/Instance UID, Transfer Syntax UID, Implementation Version
      - 환자 정보 (0010,xxxx): Patient Name, Patient ID
      - 스터디 정보 (0020,xxxx): Study Instance UID, Series Instance UID, Study Date, Series Number
      - 이미지 속성 (0028,xxxx): Rows, Columns, Bits Allocated, Bits Stored, High Bit, Pixel Representation, Samples Per Pixel
      - 픽셀 데이터 (7FE0,0010): Pixel Data
      - 프레임 정보 (0028,0008): Number of Frames
      - 모달리티 (0008,0060): Modality
    - `getTagInfo(tag: string): DICOMTag | undefined`
    - `lookupVR(tag: string): string` — 태그로부터 VR 조회 (Implicit VR 모드에서 사용)
    - Private Creator 태그(그룹 0009, 0011 등)는 'UN'(Unknown) VR로 처리
  - 완료 조건: 01_spec.md FR-004 메타데이터 필드에 필요한 모든 태그가 등록되고, lookupVR()이 올바른 VR 반환

- [ ] **T008** 🔒 VR(Value Representation) 리더 구현 (`vr-readers.ts`)
  - 파일: `src/data-layer/dicom-parser/vr-readers.ts`
  - 내용:
    - 전략 패턴 기반 `VRReaderRegistry: Map<string, VRReader>` 구성
    - 27개 VR 타입별 읽기 함수 구현:
      - 숫자형: US(Uint16), SS(Int16), UL(Uint32), SL(Int32), FL(Float32), FD(Float64)
      - 문자열형: CS(16), LO(64), UI(64), DA(8), TM(16), DT(26), SH(16), PN(64), AE(16), AS(4), CS(16), DS(16+), IS(12+)
      - 바이너리형: OB(바이트 배열), OW(워드 배열), UN(미확인), AT(태그 참조)
      - 시퀀스형: SQ(시퀀스) — 기본 지원, 중첩 깊이 MAX_SEQUENCE_DEPTH(16) 제한
    - `getVRReader(vr: string): VRReader` 함수
    - 미확인 VR은 UN 리더로 fallback
  - 완료 조건: 지원하는 27개 VR 각각이 올바른 타입의 값을 반환하고, 알 수 없는 VR은 UN으로 fallback 됨

- [ ] **T009** 🔒 전송 구문 검증 로직 구현 (`transfer-syntax.ts`)
  - 파일: `src/data-layer/dicom-parser/transfer-syntax.ts`
  - 내용:
    - `TransferSyntaxInfo` 인터페이스: uid(string), name(string), isExplicitVR(boolean), isLittleEndian(boolean), isSupported(boolean)
    - `TRANSFER_SYNTAX_REGISTRY: Map<string, TransferSyntaxInfo>`:
      - '1.2.840.10008.1.2' → Implicit VR, Little Endian, 지원 O
      - '1.2.840.10008.1.2.1' → Explicit VR, Little Endian, 지원 O
      - '1.2.840.10008.1.2.2' → Explicit VR, Big Endian, 지원 O
      - 기타 → 지원 X
    - `validateTransferSyntax(uid: string): { valid: boolean; info: TransferSyntaxInfo }`
    - `getTransferSyntaxInfo(uid: string): TransferSyntaxInfo`
    - UID가 빈 문자열이거나 누락된 경우 기본값(Implicit VR LE) 반환 + 경고 플래그
  - 완료 조건: 지원하는 3개 전송 구문에 대해 valid=true, 미지원 구문에 대해 valid=false, EC-003(전송 구문 누락) 처리 확인
---

## Phase 3: User Story 1 — DICOM 파일 파싱 수행 (Priority: P1) 🎯 MVP
<!-- US1 + US2: 매직 바이트 검증 + 기본 파싱 진입점 -->

- **Goal**: 사용자가 DICOM 파일(File 또는 ArrayBuffer)을 입력하면 메타데이터와 복셀 데이터를 포함한 ParseResult를 반환한다.
- **Independent Test**: 유효한 DICOM 파일을 `parseDICOM()`에 전달하고 ParseResult의 metadata, voxelData, errors 필드를 검증한다.

- [ ] **T010** 🔀 [US1,US2] 매직 바이트 검증 함수 구현
    - 파일: `src/data-layer/dicom-parser/DICOMParser.ts` (메서드로 구현)
    - 내용:
      - `validateMagicByte(data: ArrayBuffer): boolean`
      - 데이터 길이 < DICOM_MIN_FILE_SIZE(132)인 경우 false 반환 (EC-001)
      - offset 128 위치에서 4바이트를 읽어 [0x44, 0x49, 0x43, 0x4D]('DICM')와 비교
      - 프리앰블(0~127)이 0x00이 아닌 경우 경고 발생 후 계속 진행 (EC-002)
    - 완료 조건: 정상 DICM 시그니처에서 true, 비정상에서 false 반환. EC-001, EC-002 엣지 케이스 통과

- [ ] **T011** 🔀 [US1,US2] 매직 바이트 및 전송 구문 검증 단위 테스트
    - 파일: `tests/unit/data-layer/dicom-parser/validateMagicByte.test.ts`, `tests/unit/data-layer/dicom-parser/validateTransferSyntax.test.ts`
    - 내용:
      - validateMagicByte 테스트:
        - 정상 'DICM' 시그니처 → true
        - 잘못된 시그니처 → false
        - 132바이트 미만 데이터 → false (EC-001)
        - 프리앰블이 0x00이 아닌 경우 → true + 경고 (EC-002)
      - validateTransferSyntax 테스트:
        - Implicit VR LE UID → valid=true, isExplicitVR=false, isLittleEndian=true
        - Explicit VR LE UID → valid=true, isExplicitVR=true, isLittleEndian=true
        - Explicit VR BE UID → valid=true, isExplicitVR=true, isLittleEndian=false
        - JPEG 압축 UID → valid=false
        - 빈 문자열/누락 → 기본값 반환 + 경고 (EC-003)
    - 완료 조건: 테스트 커버리지 100%, 모든 테스트 PASS

- [ ] **T012** 🔒 [US1] 데이터 요소 순차 파싱 엔진 구현
    - 파일: `src/data-layer/dicom-parser/DICOMParser.ts`
    - 내용:
      - `parseDataElements(reader: ByteReader, isExplicitVR: boolean, maxOffset: number): Map<string, DataElement>`
      - 파일 메타 정보 구간(그룹 0002): 항상 Explicit VR LE로 파싱
      - 데이터셋 구간(그룹 0004+): 전송 구문에 따른 VR 모드로 파싱
      - Explicit VR 모드: 태그(4B) + VR(2B 문자열) + 길이(2B 또는 4B) + 값
      - Implicit VR 모드: 태그(4B) + 길이(4B) + 값 (VR은 tag-registry에서 조회)
      - 태그 길이 > MAX_TAG_LENGTH(64MB) 시 INVALID_TAG_LENGTH 에러 기록 후 건너뜀 (HAZ-5.2)
      - 오프셋 미증가 감지 시 무한 루프 방지를 위해 파싱 중단
      - 중복 태그 발견 시 마지막 값 사용 + 경고 기록 (EC-007)
    - 완료 조건: Explicit/Implicit VR 모두에서 올바른 DataElement Map 생성, HAZ-5.2 태그 길이 검증 동작

- [ ] **T013** 🔒 [US1] parseDICOM() 메인 진입점 구현
    - 파일: `src/data-layer/dicom-parser/DICOMParser.ts`
    - 내용:
      - `parseDICOM(input: File | ArrayBuffer): Promise<ParseResult>`
      - File 입력 시 FileReader.readAsArrayBuffer()로 변환
      - ArrayBuffer 입력 시 직접 사용
      - 전체 흐름 오케스트레이션:
        1. ByteReader 생성
        2. validateMagicByte() 호출 → 실패 시 에러 반환
        3. 파일 메타 정보 파싱 (그룹 0002, 항상 Explicit VR LE)
        4. 전송 구문 UID 추출 및 validateTransferSyntax() 호출
        5. ByteReader 엔디안 설정 (전송 구문에 따름)
        6. 데이터셋 파싱 (parseDataElements)
        7. parseMetadata() 호출
        8. parsePixelData() 호출
        9. ParseResult 조합 및 반환
      - 전체 흐름 try-catch 래핑 (HAZ-1.1)
    - 완료 조건: File 및 ArrayBuffer 입력 모두에서 정상 ParseResult 반환, HAZ-1.1 예외 안전 보장

- [ ] **T014** 🔀 [US1] DICOMParser 통합 단위 테스트
    - 파일: `tests/unit/data-layer/dicom-parser/DICOMParser.test.ts`
    - 내용:
      - 정상 DICOM 파일(File 입력) 파싱 → ParseResult.errors 빈 배열, metadata 필수 필드 존재, voxelData 올바른 길이
      - 정상 DICOM 데이터(ArrayBuffer 입력) 파싱 → File 입력과 동일 결과
      - 매직 바이트 누락 파일 → INVALID_FORMAT 에러 포함
      - 미지원 전송 구문 → UNSUPPORTED_SYNTAX 에러 포함
      - 파일 메타 정보와 데이터셋 분리 처리 검증
    - 완료 조건: US1 Acceptance Scenario 1, 2 모두 통과, 테스트 커버리지 90% 이상

---

## Phase 4: User Story 3 — 전송 구문 검증 (Priority: P1) 🎯 MVP

- **Goal**: DICOM 파일의 전송 구문 UID를 읽고, 현재 구현에서 지원하는 인코딩인지 검증한다.
- **Independent Test**: 지원되는/지원되지 않는 Transfer Syntax UID가 포함된 DICOM 데이터로 `validateTransferSyntax()`를 테스트한다.

- [ ] **T015** 🔀 [US3] 전송 구문 검증 통합 테스트
    - 파일: `tests/unit/data-layer/dicom-parser/validateTransferSyntax.test.ts` (T011에서 작성된 파일에 추가)
    - 내용:
      - 3개 지원 전송 구문으로 생성된 테스트 DICOM 파일로 전체 파싱 → 성공
      - 미지원 전송 구문(JPEG 계열)이 포함된 파일 → UNSUPPORTED_SYNTAX 에러 확인
      - 전송 구문 UID가 비어있는 파일 → 기본값 처리 + 경고 (EC-003)
    - 완료 조건: US3 Acceptance Scenario 1, 2 모두 통과

---

## Phase 5: User Story 4 — 메타데이터 추출 (Priority: P1) 🎯 MVP

- **Goal**: DICOM 데이터셋에서 환자 정보, 스터디 정보, 시리즈 정보, 이미지 속성 등 핵심 메타데이터를 추출한다.
- **Independent Test**: 알려진 태그 값을 가진 DICOM 파일을 파싱하고 추출된 메타데이터 값을 기댓값과 비교한다.

- [ ] **T016** 🔀 [US4] 메타데이터 파싱 함수 구현
    - 파일: `src/data-layer/dicom-parser/DICOMParser.ts`
    - 내용:
      - `parseMetadata(elements: Map<string, DataElement>): DICOMMetadata`
      - DataElement Map에서 필수 메타데이터 필드를 추출하여 DICOMMetadata 객체 생성:
        - 환자 정보: Patient Name (0010,0010), Patient ID (0010,0020)
        - 스터디 정보: Study Instance UID (0020,000D), Study Date (0008,0020)
        - 시리즈 정보: Series Instance UID (0020,000E), Series Number (0020,0011)
        - 모달리티: Modality (0008,0060)
        - 이미지 속성: Rows (0028,0010), Columns (0028,0011), Bits Allocated (0028,0100), Bits Stored (0028,0101), High Bit (0028,0102), Pixel Representation (0028,0103), Samples Per Pixel (0028,0002), Number of Frames (0028,0008)
      - 필수 태그 누락 시 warning 레벨 ErrorInfo 기록 (US4 시나리오 2)
      - 누락된 선택 태그는 기본값(빈 문자열, 0 등)으로 설정
    - 완료 조건: 모든 필수 태그가 올바르게 추출되고, 누락 태그에 대한 경고가 errors에 포함됨

- [ ] **T017** 🔀 [US4] 메타데이터 파싱 단위 테스트
    - 파일: `tests/unit/data-layer/dicom-parser/parseMetadata.test.ts`
    - 내용:
      - 전체 필수 태그가 포함된 DataElement Map → 모든 메타데이터 필드 올바르게 추출
      - 필수 태그 누락 (예: Patient Name 없음) → warning 포함, 나머지 필드는 정상
      - 빈 DataElement Map → 모든 필드 기본값, 다수의 warning
      - VR 리더에서 반환된 값의 타입 변환 검증 (문자열 트림, 숫자 파싱 등)
    - 완료 조건: US4 Acceptance Scenario 1, 2 모두 통과, parseMetadata 커버리지 95% 이상
---

## Phase 6: User Story 5 — 픽셀 데이터 파싱 (Priority: P1) 🎯 MVP

- **Goal**: DICOM 파일에서 실제 영상 데이터(픽셀/복셀 데이터)를 추출하여 ArrayBuffer 형태로 반환한다.
- **Independent Test**: 알려진 픽셀 값을 가진 테스트 DICOM 파일로 `parsePixelData()`를 호출하고 바이트 길이와 샘플 값을 검증한다.

- [ ] **T018** 🔀 [US5] 픽셀 데이터 파싱 함수 구현
    - 파일: `src/data-layer/dicom-parser/DICOMParser.ts`
    - 내용:
      - `parsePixelData(elements: Map<string, DataElement>, metadata: DICOMMetadata): ArrayBuffer | null`
      - 태그 (7FE0,0010)에서 픽셀 데이터 추출
      - Bits Allocated, Bits Stored, Pixel Representation 속성 반영:
        - 8-bit 데이터: Uint8Array 처리
        - 16-bit unsigned: Uint16Array 처리 (Pixel Representation = 0)
        - 16-bit signed: Int16Array 처리 (Pixel Representation = 1)
      - 멀티프레임 지원: NumberOfFrames 기반으로 전체 프레임 데이터 포함
      - 픽셀 데이터 태그가 없는 경우 null 반환 (EC-004)
      - ArrayBuffer.slice()로 원본 버퍼 슬라이스 반환 (메모리 복사 방지, NFR-002)
    - 완료 조건: 512x512 16-bit 단일 프레임 → 524,288 바이트 반환, 멀티프레임 → 전체 프레임 포함, EC-004 처리 확인

- [ ] **T019** 🔀 [US5] 픽셀 데이터 파싱 단위 테스트
    - 파일: `tests/unit/data-layer/dicom-parser/parsePixelData.test.ts`
    - 내용:
      - 512x512 16-bit 단일 프레임 → 524,288 바이트 ArrayBuffer 검증 (US5 시나리오 1)
      - 256x256 8-bit 단일 프레임 → 65,536 바이트 검증
      - 멀티프레임 (3프레임) → 프레임 수 × 프레임 크기 검증 (US5 시나리오 2)
      - 픽셀 데이터 태그 없음 → null 반환 (EC-004)
      - Pixel Representation = 1 (signed) → Int16Array 해석 확인
      - 메모리: 반환된 ArrayBuffer가 원본 버퍼의 슬라이스인지 확인
    - 완료 조건: US5 Acceptance Scenario 1, 2 모두 통과, EC-004 처리 확인

---

## Phase 7: User Story 6 — 파싱 에러 핸들링 (Priority: P2)

- **Goal**: 파싱 과정에서 발생하는 모든 오류를 구조화된 에러 객체로 수집하고 반환한다.
- **Independent Test**: 의도적으로 손상된 DICOM 파일을 파싱하고 errors 배열의 내용을 검증한다.

- [ ] **T020** 🔀 [US6] 에러 핸들링 함수 구현
    - 파일: `src/data-layer/dicom-parser/DICOMParser.ts`
    - 내용:
      - `handleParseError(error: unknown, context: { tag?: string; offset?: number }): ErrorInfo`
      - RangeError → TRUNCATED_DATA 에러 변환
      - TypeError → INVALID_FORMAT 에러 변환
      - 커스텀 에러 코드 기반 에러 → ErrorInfo 직접 변환
      - 알 수 없는 에러 → INVALID_FORMAT 에러 + 원본 메시지 포함
      - 파싱 루프 내 try-catch: 개별 태그 에러 격리, errors 배열에 누적 후 다음 태그로 계속 진행
    - 완료 조건: 모든 에러 유형이 올바른 ErrorInfo로 변환되고, 파싱이 중단되지 않음

- [ ] **T021** 🔀 [US6] 엣지 케이스 전용 테스트 작성
    - 파일: `tests/unit/data-layer/dicom-parser/edge-cases.test.ts`, `tests/unit/data-layer/dicom-parser/handleParseError.test.ts`
    - 내용:
      - handleParseError 테스트:
        - RangeError 입력 → TRUNCATED_DATA ErrorInfo
        - TypeError 입력 → INVALID_FORMAT ErrorInfo
        - 알 수 없는 에러 → INVALID_FORMAT + 원본 메시지
      - 엣지 케이스 테스트:
        - EC-001: 파일 크기 132바이트 미만 → INVALID_FILE_SIZE
        - EC-002: 프리앰블 비정상 → 경고 + 파싱 계속
        - EC-003: 전송 구문 누락 → 기본값 + 경고
        - EC-004: 픽셀 데이터 없음 → metadata만 반환
        - EC-005: 비정상 큰 태그 길이(4GB) → INVALID_TAG_LENGTH + 건너뜀
        - EC-006: VR 혼재 → 전송 구문에 따라 올바르게 처리
        - EC-007: 중복 태그 → 마지막 값 사용 + 경고
      - 퍼즈 테스트: 랜덤 바이트 시퀀스 100회 입력 → 크래시 0건 (HAZ-1.1)
    - 완료 조건: EC-001 ~ EC-007 전체 통과, 퍼즈 테스트 크래시 0건, handleParseError 커버리지 100%

---

## Phase 8: User Story 7 — DataValidator 연동 검증 (Priority: P2)

- **Goal**: 파싱된 데이터를 DataValidator 컴포넌트를 통해 추가 검증하여 의료 데이터의 무결성을 보장한다.
- **Independent Test**: DataValidator mock을 사용하여 파싱 결과의 검증 경로(정상/비정상)를 테스트한다.

- [ ] **T022** 🔀 [US7] DataValidator 인터페이스 및 연동 로직 구현
    - 파일: `src/data-layer/data-validator/types.ts`, `src/data-layer/dicom-parser/DICOMParser.ts`
    - 내용:
      - `src/data-layer/data-validator/types.ts`:
        - `ValidationResult` 타입: `{ isValid: boolean; errors: string[] }`
        - `DataValidator` 인터페이스: `validate(parseResult: ParseResult): ValidationResult`
      - `DICOMParser.ts` 연동:
        - `setValidator(validator: DataValidator)` 메서드
        - 파싱 완료 후 validator가 설정되어 있으면 validate() 호출
        - 검증 결과의 에러를 ParseResult.errors에 추가
    - 완료 조건: DataValidator 연동 후 검증 에러가 ParseResult.errors에 반영됨

- [ ] **T023** 🔀 [US7] DataValidator 연동 단위 테스트
    - 파일: `tests/unit/data-layer/dicom-parser/dataValidatorIntegration.test.ts`
    - 내용:
      - DataValidator mock 생성:
        - 정상 검증 mock: 항상 `{ isValid: true, errors: [] }` 반환
        - 비정상 검증 mock: `{ isValid: false, errors: ['PIXEL_VALUE_OUT_OF_RANGE'] }` 반환
      - 테스트 케이스:
        - validator 미설정 → 파싱 결과에 검증 에러 없음
        - 정상 검증 → ParseResult.errors에 검증 에러 없음
        - 비정상 검증 → ParseResult.errors에 'PIXEL_VALUE_OUT_OF_RANGE' 포함
    - 완료 조건: US7 Acceptance Scenario 1, 2 모두 통과

- [ ] **T024** 🔀 [US7] VR 리더 단위 테스트
    - 파일: `tests/unit/data-layer/dicom-parser/vr-readers.test.ts`
    - 내용:
      - 숫자형 VR 테스트: US, SS, UL, SL, FL, FD — 각각 Little/Big Endian
      - 문자열형 VR 테스트: CS, LO, UI, DA, TM, DT, SH, PN, AE, AS, DS, IS — 패딩 문자 제거 확인
      - 바이너리형 VR 테스트: OB, OW, UN, AT
      - 시퀀스형 VR 테스트: SQ — 기본 중첩 구조 파싱
      - 알 수 없는 VR → UN fallback
    - 완료 조건: 27개 VR 타입 각각에 대한 읽기 검증 완료, 커버리지 90% 이상
---

## Phase 9: Integration & Finalization

- [ ] **T025** 🔒 공개 API 엑스포트 구성 (`index.ts`)
    - 파일: `src/data-layer/dicom-parser/index.ts`
    - 내용:
      - `export { DICOMParser } from './DICOMParser'`
      - `export type { ParseResult, DICOMMetadata, ErrorInfo, ErrorCode, DataElement, DICOMDataSet } from './types'`
      - `export { DICOMErrorCodes } from './errors'`
      - `export type { DataValidator, ValidationResult } from '../data-validator/types'`
    - 완료 조건: 외부 모듈에서 `import { DICOMParser, ParseResult }` 등으로 임포트 가능, 트리쉐이킹 동작 확인

- [ ] **T026** 🔒 성능 벤치마크 테스트 작성 및 실행
    - 파일: `tests/unit/data-layer/dicom-parser/performance.test.ts`
    - 내용:
      - 512x512 16-bit 단일 프레임 DICOM 파일 파싱 시간 측정 (NFR-001: 100ms 이내)
      - `performance.now()` 기반 정밀 측정
      - 10회 평균/최대 시간 산출
      - 메모리 사용량 간접 검증: 반환된 ArrayBuffer가 원본 슬라이스인지 확인 (NFR-002)
    - 완료 조건: 512x512 16-bit 파싱 시간 100ms 이내, ArrayBuffer 복사 미발생 확인

- [ ] **T027** 🔒 전체 테스트 스위트 실행 및 커버리지 검증
    - 파일: `tests/unit/data-layer/dicom-parser/**/*.test.ts`
    - 내용:
      - `vitest run --coverage` 실행
      - 커버리지 리포트 확인 (목표: 90% 이상)
      - 실패 테스트 0건 확인
      - 누락된 테스트 시나리오 보완
    - 완료 조건: 전체 테스트 PASS, 라인 커버리지 90% 이상, 브랜치 커버리지 85% 이상

- [ ] **T028** 🔒 최종 문서 정리 및 코드 리뷰 준비
    - 파일: `docs/spec-kit/03_tasks.md`, `src/data-layer/dicom-parser/**/*.ts`
    - 내용:
      - JSDoc 주석 보완: 모든 공개 메서드/인터페이스에 설명 추가
      - `README.md` 또는 모듈 설명 주석 작성 (사용법 예제 포함)
      - `03_tasks.md` 완료 상태 업데이트
      - Definition of Done 체크리스트 검증:
        - FR-001 ~ FR-010 구현 완료
        - 단위 테스트 커버리지 90% 이상
        - EC-001 ~ EC-007 검증 완료
        - DataValidator 연동 테스트 통과
        - HAZ-1.1, HAZ-5.2 위험 완화 확인
        - ADR-2 원칙 준수 확인
    - 완료 조건: 모든 DoD 항목 충족, 코드 리뷰 요청 가능 상태

---

## Dependencies & Execution Order

```
  T001 → T002 → T003 → T004 → T005 → T006
                                      ↓
                          T007, T008, T009 (🔀 병렬 가능)
                                      ↓
                    T010 ──── T011 (🔀 병렬, T010/T011 이후 T012 선행)
                      ↘        ↙
                       T012 → T013 → T014
                                          ↓
                    T015, T016, T018 (🔀 병렬 가능)
                          ↓         ↓
                    T017       T019 (각각 병렬)
                                      ↓
                    T020, T021, T022, T024 (🔀 병렬 가능)
                                      ↓
                    T023
                      ↓
                    T025 → T026 → T027 → T028
```

  ### 병렬 실행 가능 그룹

| 그룹 | 태스크 | 조건
|------|--------|------|
| G1 | T007, T008, T009 | Phase 1 완료 후 병렬
| G2 | T010, T011 | T007-T009 완료 후 병렬
| G3 | T015, T016, T018 | T014 완료 후 병렬
| G4 | T017, T019 | 각각 T016, T018 완료 후 개별
| G5 | T020, T021, T022, T024 | Phase 6-7 완료 후 병렬

---

## Estimated Effort

| Phase        | 태스크 수 | 예상 소요 시간 |
|-------------|----------|---------------|
| Phase 1: Setup | 6 | 10시간 |
| Phase 2: Foundational | 3 | 6시간 |
| Phase 3: US1 (파싱 수행) | 5 | 8시간 |
| Phase 4: US3 (전송 구문) | 1 | 2시간 |
| Phase 5: US4 (메타데이터) | 2 | 4시간 |
| Phase 6: US5 (픽셀 데이터) | 2 | 4시간 |
| Phase 7: US6 (에러 핸들링) | 2 | 4시간 |
| Phase 8: US7 (DataValidator) | 3 | 5시간 |
| Phase 9: Integration | 4 | 6시간 |
| **합계** | **28** | **49시간** |

---

## Risk Mitigation in Tasks

| 위험 ID | 위험 | 관련 태스크 | 완화 조치 |
|--------|------|-----------|----------|
| HAZ-1.1 | 프로세스 크래시 | T013, T020, T021 | 전체 흐름 try-catch 래핑, 항상 ParseResult 반환 |
| HAZ-5.2 | 악의적 파일 공격 | T003, T012, T021 | MAX_TAG_LENGTH 제한, 무한 루프 방지 가드 |
| CX-4 | SQ 중첩 복잡도 | T008, T024 | MAX_SEQUENCE_DEPTH=16 제한, 재귀 깊이 검증 |
| NFR-001 | 성능 100ms | T026 | 벤치마크 테스트로 검증 |
| NFR-002 | 메모리 제한 | T018, T026 | ArrayBuffer.slice() 활용, 복사 방지 |

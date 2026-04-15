# Tasks: [COMP-1.1] DICOM 파일 파서

**Input**: `docs/spec-kit/01_spec.md`
**Ticket**: PLAYG-1375 | **Date**: 2026-04-15
**Parent**: PLAYG-1385 ([SDS-3.1] DICOMParser 상세 설계)

> **형식 안내**
> - `[ID]` : 태스크 번호 (T-1.1-001 ~ T-1.1-0xx)
> - `[P]` : 병렬 실행 가능 여부 표시 (🔀 병렬 가능 / 🔒 순서 필수)
> - `[Story]` : 관련 사용자 스토리 (US-1 ~ US-5)
> - 각 태스크는 **2시간 이내** 완료 가능한 단위로 분할
> - IEC 62304 Class A 추적성 유지 (FR/NFR/HAZ 매핑)
> - ADR-2 자체 구현 원칙 준수 (외부 DICOM 라이브러리 사용 불가)

---

## Phase 1: 코어 파서 인프라 (Core Parser Infrastructure)
<!-- DICOM 파일 로드, 매직 바이트 검증, ParseContext 생성 등 기반 구조 -->

- [ ] **T-1.1-001** 🔒 DICOM 파서 모듈 스캐폴드 생성
  - 파일: `viewer/src/data/dicomParser/index.js`
  - 설명: DICOM 파일 파서 모듈의 진입점 파일을 생성한다. parseDICOM, validateMagicByte, validateTransferSyntax, parseMetadata, parsePixelData, handleParseError 6개 공개 함수를 스텁 형태로 export 한다. 내부 상수(SUPPORTED_TRANSFER_SYNTAXES, DICOM_MAGIC_BYTE, MAX_TAG_COUNT 등)와 내부 헬퍼 함수용 주석을 포함한다. SDS-3.1 인터페이스 명세와 정확히 일치하는 JSDoc을 작성한다.
  - 예상 공수: 0.5시간
  - 의존성: T007(types/DICOMMetadata), T011(types/ParseResult), T013(errors/CBVError)
  - 담당 Story: US-1, US-5
  - 완료 조건:
    - 6개 공개 함수 스텁이 export 됨
    - 모든 함수에 JSDoc 매개변수/반환값 명세 포함
    - `npm run build` 에러 없음
  - 추적: SDS-3.1, ADR-2, FR-1.1, FR-1.5

- [ ] **T-1.1-002** 🔒 DICOM 상수 및 매직 바이트 검증 구현
  - 파일: `viewer/src/data/dicomParser/constants.js`, `viewer/src/data/dicomParser/validateMagicByte.js`
  - 설명: DICOM 표준 상수를 정의하고 매직 바이트 검증 함수를 구현한다. (1) **constants.js**: DICOM_MAGIC_BYTE(`DICM`), PREAMBLE_LENGTH(128), SUPPORTED_TRANSFER_SYNTAXES 맵, DICOM_TAG 상수(그룹/엘리먼트), MAX_TAG_COUNT(10000), MAX_FILE_SIZE(512MB), MAX_SEQUENCE_DEPTH(10)을 정의. (2) **validateMagicByte.js**: ArrayBuffer를 받아 길이가 132바이트 이상인지 확인 후 오프셋 128~131의 4바이트가 `DICM`과 일치하는지 검증. 순수 함수로 구현하여 부작용 없음.
  - 예상 공수: 1.0시간
  - 의존성: T-1.1-001
  - 담당 Story: US-1
  - 완료 조건:
    - 유효한 DICOM Part 10 파일에서 `validateMagicByte()` true 반환
    - 132바이트 미만 파일에서 false 반환
    - 매직 바이트가 다른 파일에서 false 반환
    - 모든 상수가 단위 테스트로 검증됨
  - 추적: FR-1.1, FR-1.2, US-1, TC-1.1~TC-1.4

- [ ] **T-1.1-003** 🔒 ParseContext 내부 상태 객체 구현
  - 파일: `viewer/src/data/dicomParser/ParseContext.js`
  - 설명: DICOM 파싱 과정의 내부 상태를 관리하는 ParseContext 팩토리 함수를 구현한다. buffer(ArrayBuffer), dataView(DataView), offset(number), isLittleEndian(boolean), isExplicitVR(boolean), transferSyntaxUID(string), errors(ErrorResult[]) 속성을 포함. `createParseContext(buffer, transferSyntaxUID)` 함수는 전송 구문에 따라 바이트 오더와 VR 모드를 자동 설정한다. 오프셋 관리 메서드(readUint16, readUint32, readString, advance, remaining)를 제공.
  - 예상 공수: 1.5시간
  - 의존성: T-1.1-002
  - 담당 Story: US-1, US-2
  - 완료 조건:
    - Explicit VR Little Endian 전송 구문에서 isLittleEndian=true, isExplicitVR=true
    - Implicit VR Little Endian에서 isExplicitVR=false
    - Big Endian에서 isLittleEndian=false, isExplicitVR=true
    - 오프셋 읽기 메서드가 올바른 바이트 오더로 동작
  - 추적: FR-1.2, SDS-3.1, US-1, US-2

- [ ] **T-1.1-004** 🔒 전송 구문 검증 함수 구현
  - 파일: `viewer/src/data/dicomParser/validateTransferSyntax.js`
  - 설명: 전송 구문 UID 문자열을 받아 본 시스템에서 지원하는지 검증하는 순수 함수를 구현한다. 지원 목록: Explicit VR Little Endian(`1.2.840.10008.1.2.1`), Explicit VR Big Endian(`1.2.840.10008.1.2.2`), Implicit VR Little Endian(`1.2.840.10008.1.2`). 압축 전송 구문(JPEG, JPEG2000, RLE)은 false 반환. SUPPORTED_TRANSFER_SYNTAXES 상수를 참조하여 일관성 유지.
  - 예상 공수: 0.5시간
  - 의존성: T-1.1-002
  - 담당 Story: US-2
  - 완료 조건:
    - 3개 지원 전송 구문 UID에 대해 true 반환
    - 압축 전송 구문 및 빈 문자열에 대해 false 반환
    - 순수 함수 (부작용 없음)
  - 추적: FR-1.2, FR-1.5, US-2, TC-2.1~TC-2.3

- [ ] **T-1.1-005** 🔒 DICOM 태그 읽기 헬퍼 구현
  - 파일: `viewer/src/data/dicomParser/tagReader.js`
  - 설명: ParseContext에서 DICOM 태그를 순차적으로 읽는 헬퍼 함수를 구현한다. `readTag(context)` 함수는 (1) 4바이트 Group/Element 태그 식별, (2) Explicit VR 모드에서 2바이트 VR 문자열 읽기, (3) Implicit VR 모드에서 VR을 사전 정의 맵에서 조회, (4) 값 길이 읽기(2바이트 또는 4바이트), (5) 값 읽기 후 오프셋 이동의 5단계를 수행. TagReadResult({tag, vr, length, value, offset})를 반환. 시퀀스 태그(SQ) 처리 시 MAX_SEQUENCE_DEPTH 검증 포함.
  - 예상 공수: 2.0시간
  - 의존성: T-1.1-003
  - 담당 Story: US-1, US-3
  - 완료 조건:
    - Explicit VR Little Endian에서 태그/VR/길이/값 정확히 읽기
    - Implicit VR 모드에서 VR 맵 조회 동작
    - 시퀀스 태그 깊이 초과 시 에러 반환
    - 알 수 없는 태그는 건너뛰기 (오프셋만 이동)
  - 추적: FR-1.3, SDS-3.1, DICOM PS3.5, US-3
---

## Phase 2: 메타데이터 파싱 (Metadata Parsing)
<!-- DICOM 데이터셋에서 필수/선택 메타데이터 태그 추출 -->

- [ ] **T-1.1-006** 🔒 메타데이터 그룹(0002) 파서 구현
  - 파일: `viewer/src/data/dicomParser/metaGroupParser.js`
  - 설명: DICOM 파일 메타 정보 그룹(File Meta Information, Group 0002)을 파싱하는 함수를 구현한다. 프리앰블(128바이트) + 매직 바이트(4바이트) 이후부터 Group 0002 태그를 순차적으로 읽는다. 전송 구문 UID(0002,0010), 미디어 저장 SOP 클래스 UID(0002,0002), 미디어 저장 SOP 인스턴스 UID(0002,0003) 등 필수 메타 정보를 추출. Group 0002는 항상 Explicit VR Little Endian으로 인코딩됨(DICOM PS3.10 규정). 메타 그룹 종료 조건: Group 번호가 0002를 벗어나면 종료.
  - 예상 공수: 1.5시간
  - 의존성: T-1.1-005
  - 담당 Story: US-2, US-3
  - 완료 조건:
    - 전송 구문 UID(0002,0010)를 정확히 추출
    - Explicit VR Little Endian 강제 적용 확인
    - 메타 그룹이 아닌 태그에서 파싱 중단
    - 메타 그룹 누락 시 PARSE_ERR_MISSING_REQUIRED_TAG 에러 발생
  - 추적: FR-1.2, FR-1.3, US-2, US-3, DICOM PS3.10

- [ ] **T-1.1-007** 🔒 필수 메타데이터 태그 파서 구현
  - 파일: `viewer/src/data/dicomParser/metadataParser.js`
  - 설명: DICOM 데이터셋에서 필수 메타데이터 태그를 파싱하는 `parseMetadata(buffer)` 함수를 구현한다. 추출 대상 태그: PatientID(0010,0020), PatientName(0010,0010), StudyInstanceUID(0020,000D), SeriesInstanceUID(0020,000E), Rows(0028,0010), Columns(0028,0011), BitsAllocated(0028,0100), PixelRepresentation(0028,0103). tagReader 헬퍼를 사용하여 전체 데이터셋을 스캔하고 태그를 수집. ParseContext의 바이트 오더 설정에 따라 정확한 값 해석. 필수 태그 누락 시 PARSE_ERR_MISSING_REQUIRED_TAG 에러를 errors 배열에 추가.
  - 예상 공수: 2.0시간
  - 의존성: T-1.1-005, T-1.1-006
  - 담당 Story: US-3
  - 완료 조건:
    - 유효한 DICOM 파일에서 8개 필수 태그 모두 추출 성공
    - 필수 태그 누락 시 에러 발생 확인
    - Little Endian/Big Endian 모두 올바른 값 해석
    - TC-3.1, TC-3.2, TC-3.3 통과
  - 추적: FR-1.3, US-3, TC-3.1~TC-3.3, HAZ-1.1

- [ ] **T-1.1-008** 🔒 선택 메타데이터 및 기본값 처리 구현
  - 파일: `viewer/src/data/dicomParser/optionalMetadataParser.js`
  - 설명: 선택적 메타데이터 태그를 파싱하고 누락 시 기본값을 적용하는 로직을 구현한다. 대상 태그: WindowCenter(0028,1050), WindowWidth(0028,1051), SliceThickness(0018,0050), PixelSpacing(0028,0030), PhotometricInterpretation(0028,0004), SamplesPerPixel(0028,0002). 기본값 정책: WindowCenter=40, WindowWidth=400(치과 CBCT 일반적 값), SliceThickness=0, PixelSpacing=[1,1], PhotometricInterpretation=`MONOCHROME2`, SamplesPerPixel=1. 선택 태그 누락은 warning 레벨로 처리하며 파싱은 계속 진행.
  - 예상 공수: 1.5시간
  - 의존성: T-1.1-007
  - 담당 Story: US-3
  - 완료 조건:
    - 선택 태그 존재 시 올바른 값 추출
    - 선택 태그 누락 시 기본값으로 대체
    - 누락 시 warning이 errors 배열에 추가됨
    - 기본값이 합리적인 치과 CBCT 영상 파라미터임
  - 추적: FR-1.3, FR-1.5, US-3, HAZ-5.2

- [ ] **T-1.1-009** 🔒 메타데이터 파싱 단위 테스트 작성
  - 파일: `viewer/tests/unit/data/dicomParser/metadataParser.test.js`
  - 설명: Phase 2 메타데이터 파싱 기능에 대한 포괄적 단위 테스트를 작성한다. Vitest 프레임워크 사용. 테스트 케이스: (1) 유효한 DICOM 파일에서 모든 필수 태그 추출 검증, (2) 선택 태그 누락 파일에서 기본값 적용 검증, (3) 빈 데이터셋에서 에러 발생 검증, (4) Little Endian/Big Endian 바이트 오더 전환 시 값 정확도 검증, (5) 최대 태그 수 초과 시 안전 종료 검증. 테스트용 가상 DICOM 버퍼 생성 헬퍼를 포함.
  - 예상 공수: 2.0시간
  - 의존성: T-1.1-006, T-1.1-007, T-1.1-008
  - 담당 Story: US-3
  - 완료 조건:
    - TC-3.1, TC-3.2, TC-3.3 모두 통과
    - 메타데이터 파싱 관련 코드 커버리지 90% 이상
    - 테스트용 DICOM 버퍼 생성 헬퍼 재사용 가능
  - 추적: FR-1.3, IEC 62304 Class A, US-3, TC-3.1~TC-3.3
---

## Phase 3: 복셀 데이터 추출 (Voxel Data Extraction)
<!-- 픽셀 데이터 태그 탐색, 데이터 타입별 추출, 무결성 검증 -->

- [ ] **T-1.1-010** 🔒 픽셀 데이터 태그 탐색 및 추출 구현
  - 파일: `viewer/src/data/dicomParser/pixelDataParser.js`
  - 설명: DICOM 파일에서 픽셀 데이터 태그(7FE0,0010)를 탐색하고 복셀 데이터를 추출하는 `parsePixelData(buffer, metadata)` 함수를 구현한다. (1) 버퍼에서 Tag(7FE0,0010) 위치 탐색, (2) 메타데이터의 Rows, Columns, BitsAllocated를 기반으로 예상 데이터 길이 계산, (3) 실제 태그 값 길이와 예상 길이 비교, (4) 해당 오프셋에서 ArrayBuffer 슬라이스 추출. 픽셀 데이터 태그가 존재하지 않으면 PARSE_ERR_PIXEL_DATA_EXTRACTION 에러 발생.
  - 예상 공수: 2.0시간
  - 의존성: T-1.1-005, T-1.1-007
  - 담당 Story: US-4
  - 완료 조건:
    - Tag(7FE0,0010)이 존재하는 파일에서 올바른 ArrayBuffer 추출
    - 픽셀 데이터 태그가 없는 경우 에러 반환 (TC-4.3)
    - 데이터 길이 불일치 시 경고(warning) 포함 반환 (TC-4.4)
    - 최대 파일 크기(512MB) 초과 시 에러 반환
  - 추적: FR-1.4, US-4, TC-4.1~TC-4.4, HAZ-1.1

- [ ] **T-1.1-011** 🔒 데이터 타입 변환 및 TypedArray 래핑 구현
  - 파일: `viewer/src/data/dicomParser/voxelDataConverter.js`
  - 설명: 추출된 픽셀 데이터를 메타데이터 기반으로 적절한 TypedArray로 변환하는 함수를 구현한다. 지원 데이터 타입 매핑: (1) BitsAllocated=16, PixelRepresentation=1 -> Int16Array (16-bit Signed), (2) BitsAllocated=16, PixelRepresentation=0 -> Uint16Array (16-bit Unsigned), (3) BitsAllocated=8, PixelRepresentation=0 -> Uint8Array (8-bit Unsigned). 바이트 오더(ParseContext.isLittleEndian)에 따른 올바른 바이트 스왑 적용. 지원하지 않는 데이터 타입에 대해 PARSE_ERR_UNSUPPORTED_DATATYPE 에러 반환.
  - 예상 공수: 1.5시간
  - 의존성: T-1.1-010
  - 담당 Story: US-4
  - 완료 조건:
    - 16-bit signed 데이터에서 올바른 Int16Array 길이 반환 (TC-4.1)
    - 8-bit unsigned 데이터에서 올바른 Uint8Array 길이 반환 (TC-4.2)
    - Big Endian 파일에서 바이트 스왑 올바르게 적용
    - 지원하지 않는 BitsAllocated 값에서 에러 반환
  - 추적: FR-1.4, US-4, TC-4.1~TC-4.2, HAZ-1.1

- [ ] **T-1.1-012** 🔒 복셀 데이터 무결성 검증 구현
  - 파일: `viewer/src/data/dicomParser/voxelDataValidator.js`
  - 설명: 추출된 복셀 데이터의 무결성을 검증하는 내부 함수를 구현한다. 검증 항목: (1) 데이터 길이 == Rows * Columns * (BitsAllocated / 8) * SamplesPerPixel 일치 여부, (2) TypedArray 길이가 0이 아닌지 확인, (3) NaN/Infinity 값 존재 여부 검사, (4) 복셀 값 범위 검증 (BitsAllocated에 따른 min/max). DataValidator(COMP-1.x) 컴포넌트에 최종 검증을 위임. 검증 실패는 warning 또는 error 레벨로 분류하여 ErrorResult 배열에 추가.
  - 예상 공수: 1.5시간
  - 의존성: T-1.1-011, DataValidator(COMP-1.x)
  - 담당 Story: US-4, US-5
  - 완료 조건:
    - 데이터 길이 불일치 시 warning 발생
    - 빈 복셀 데이터에서 error 발생
    - NaN/Infinity 값 발견 시 warning 발생
    - DataValidator 위임 호출 정상 동작
  - 추적: FR-1.4, FR-1.5, US-4, US-5, HAZ-1.1

- [ ] **T-1.1-013** 🔒 복셀 데이터 추출 단위 테스트 작성
  - 파일: `viewer/tests/unit/data/dicomParser/pixelDataParser.test.js`
  - 설명: Phase 3 복셀 데이터 추출 기능에 대한 포괄적 단위 테스트를 작성한다. 테스트 케이스: (1) 16-bit signed 데이터 추출 시 Int16Array 길이 및 값 검증 (TC-4.1), (2) 8-bit unsigned 데이터 추출 시 Uint8Array 길이 및 값 검증 (TC-4.2), (3) 픽셀 데이터 태그 누락 시 에러 반환 (TC-4.3), (4) 데이터 길이 불일치 시 경고 포함 반환 (TC-4.4), (5) Big Endian 바이트 오더 변환 정확도, (6) 최대 파일 크기 초과 시 에러. 테스트용 가상 DICOM 버퍼에 픽셀 데이터를 포함하여 생성.
  - 예상 공수: 2.0시간
  - 의존성: T-1.1-010, T-1.1-011, T-1.1-012
  - 담당 Story: US-4
  - 완료 조건:
    - TC-4.1~TC-4.4 모두 통과
    - 복셀 데이터 추출 관련 코드 커버리지 90% 이상
    - Big Endian/Little Endian 모두 테스트 포함
  - 추적: FR-1.4, IEC 62304 Class A, US-4, TC-4.1~TC-4.4
---

## Phase 4: 오류 처리, 검증 및 통합 (Error Handling & Integration)
<!-- 에러 처리 체계, 파싱 파이프라인 통합, 단위/통합 테스트 -->

- [ ] **T-1.1-014** 🔒 에러 코드 체계 및 메시지 맵 구현
  - 파일: `viewer/src/data/dicomParser/errorCodes.js`
  - 설명: DICOM 파싱 에러 코드 체계를 정의하고 사용자용 메시지 맵을 구현한다. 에러 코드: PARSE_ERR_INVALID_MAGIC(매직 바이트 불일치), PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX(미지원 전송 구문), PARSE_ERR_MISSING_REQUIRED_TAG(필수 태그 누락), PARSE_ERR_PIXEL_DATA_EXTRACTION(픽셀 데이터 추출 실패), PARSE_ERR_FILE_READ(파일 읽기 실패), PARSE_ERR_UNEXPECTED(예기치 않은 오류), PARSE_ERR_FILE_TOO_LARGE(파일 크기 초과). 각 에러 코드에 대해 한국어/영어 사용자 메시지와 개발자용 디버그 정보 템플릿을 매핑.
  - 예상 공수: 1.0시간
  - 의존성: T013(errors/CBVError)
  - 담당 Story: US-5
  - 완료 조건:
    - 7개 에러 코드 정의 및 메시지 매핑 완료
    - 모든 에러 코드에 한국어 사용자 메시지 포함
    - 에러 심각도(error/warning) 분류 완료
  - 추적: FR-1.5, US-5, TC-5.1~TC-5.3, HAZ-1.1, HAZ-5.2

- [ ] **T-1.1-015** 🔒 handleParseError 오류 처리 함수 구현
  - 파일: `viewer/src/data/dicomParser/handleParseError.js`
  - 설명: 파싱 오류를 처리하여 사용자 친화적 ErrorResult를 반환하는 `handleParseError(error)` 함수를 구현한다. (1) ParseError 객체의 code에 해당하는 메시지를 errorCodes 맵에서 조회, (2) userMessage(사용자용 한국어 메시지), debugInfo(개발자용 기술 정보: 에러 코드, 원인, 태그 위치), errorCode, severity 필드를 포함하는 ErrorResult 객체 생성, (3) 알 수 없는 에러 코드는 PARSE_ERR_UNEXPECTED로 fallback, (4) console.error 로깅 (디버그 모드에서만).
  - 예상 공수: 1.0시간
  - 의존성: T-1.1-014
  - 담당 Story: US-5
  - 완료 조건:
    - 모든 정의된 에러 코드에 대해 ErrorResult 생성
    - 알 수 없는 에러 코드는 UNEXPECTED로 fallback
    - userMessage가 한국어로 의미 있는 메시지 제공
    - TC-5.1, TC-5.2, TC-5.3 통과
  - 추적: FR-1.5, US-5, TC-5.1~TC-5.3

- [ ] **T-1.1-016** 🔒 parseDICOM 메인 파이프라인 통합 구현
  - 파일: `viewer/src/data/dicomParser/parseDICOM.js`
  - 설명: 전체 DICOM 파싱 파이프라인을 통합하는 `parseDICOM(file)` async 함수를 구현한다. 파이프라인 순서: (1) readFileAsArrayBuffer(file) - FileReader로 파일 읽기, (2) validateMagicByte(buffer) - 매직 바이트 검증, 실패 시 즉시 반환, (3) determineTransferSyntax(buffer) - 메타 그룹에서 전송 구문 확인, (4) validateTransferSyntax(uid) - 지원 여부 확인, 실패 시 즉시 반환, (5) createParseContext(buffer, uid) - 파싱 컨텍스트 생성, (6) parseMetadata(buffer, context) - 메타데이터 추출, (7) parsePixelData(buffer, metadata) - 복셀 데이터 추출, (8) assembleParseResult() - ParseResult 조합. 최상위 try-catch로 모든 예외를 포착하여 handleParseError로 변환.
  - 예상 공수: 2.0시간
  - 의존성: T-1.1-002 ~ T-1.1-015 (모든 Phase 1~3 태스크)
  - 담당 Story: US-1, US-2, US-3, US-4, US-5
  - 완료 조건:
    - 유효한 DICOM 파일 입력 시 ParseResult{isValid: true, metadata, voxelData, errors: []}
    - 무효한 파일 입력 시 ParseResult{isValid: false, errors: [...]}
    - 파이프라인 각 단계에서 오류 발생 시 이후 단계 건너뛰기
    - async/await 패턴으로 FileReader 비동기 읽기 처리
  - 추적: FR-1.1~FR-1.5, SDS-3.1, US-1~US-5, HAZ-1.1

- [ ] **T-1.1-017** 🔒 dicomParser/index.js 배럴 파일 완성
  - 파일: `viewer/src/data/dicomParser/index.js`
  - 설명: T-1.1-001에서 생성한 스텁을 실제 구현으로 교체한다. parseDICOM, validateMagicByte, validateTransferSyntax, parseMetadata, parsePixelData, handleParseError 6개 공개 함수를 각 모듈에서 import하여 re-export. 내부 헬퍼(tagReader, ParseContext, constants 등)는 export하지 않고 모듈 내부에서만 사용. Data Layer 계층 규칙에 따라 Business/Rendering/Presentation 계층 import 없음.
  - 예상 공수: 0.5시간
  - 의존성: T-1.1-016
  - 담당 Story: US-1, US-5
  - 완료 조건:
    - 6개 공개 함수가 올바른 모듈에서 re-export됨
    - 내부 함수는 외부에 노출되지 않음
    - `npm run build` 에러 없음
    - 상위 계층 import 없음 (ESLint 계층 규칙 통과)
  - 추적: ADR-1, SDS-3.1, FR-1.1
- [ ] **T-1.1-018** 🔒 오류 처리 단위 테스트 작성
  - 파일: `viewer/tests/unit/data/dicomParser/handleParseError.test.js`
  - 설명: Phase 4 오류 처리 기능에 대한 포괄적 단위 테스트를 작성한다. 테스트 케이스: (1) 잘못된 파일 형식 시 사용자 친화적 한국어 메시지 출력 (TC-5.1), (2) 파일 읽기 실패 시 에러 메시지 확인 (TC-5.2), (3) 모든 7개 에러 코드에 대해 한국어 메시지 매핑 확인 (TC-5.3), (4) 알 수 없는 에러 코드의 UNEXPECTED fallback 동작, (5) ErrorResult의 severity 분류가 올바른지 검증. 각 에러 코드별 독립 테스트 케이스를 작성하여 IEC 62304 추적성 확보.
  - 예상 공수: 1.5시간
  - 의존성: T-1.1-014, T-1.1-015
  - 담당 Story: US-5
  - 완료 조건:
    - TC-5.1~TC-5.3 모두 통과
    - 7개 에러 코드 모두 테스트 커버
    - handleParseError 코드 커버리지 95% 이상
  - 추적: FR-1.5, IEC 62304 Class A, US-5, TC-5.1~TC-5.3

- [ ] **T-1.1-019** 🔒 파싱 파이프라인 통합 단위 테스트 작성
  - 파일: `viewer/tests/unit/data/dicomParser/parseDICOM.test.js`
  - 설명: parseDICOM 메인 파이프라인에 대한 종합 단위 테스트를 작성한다. 테스트 시나리오: (1) 정상 DICOM 파일 전체 파이프라인 성공 (매직 바이트 -> 전송 구문 -> 메타데이터 -> 복셀 데이터), (2) 매직 바이트 불일치로 조기 종료, (3) 미지원 전송 구문으로 조기 종료, (4) 필수 태그 누락으로 에러 반환, (5) 픽셀 데이터 누락으로 에러 반환, (6) 빈 파일/비정상 파일에 대한 방어 처리. Mock FileReader를 사용하여 브라우저 API 의존성을 격리. 가상 DICOM 파일 생성 헬퍼를 재사용.
  - 예상 공수: 2.0시간
  - 의존성: T-1.1-016, T-1.1-017
  - 담당 Story: US-1~US-5
  - 완료 조건:
    - 정상 파일 파싱 성공 (ParseResult.isValid === true)
    - 모든 오류 경로에서 적절한 ErrorResult 반환
    - parseDICOM 코드 커버리지 90% 이상
    - 파이프라인 각 단계의 독립적 실패가 테스트됨
  - 추적: FR-1.1~FR-1.5, IEC 62304 Class A, US-1~US-5

- [ ] **T-1.1-020** 🔒 Phase 1 코어 파서 단위 테스트 작성
  - 파일: `viewer/tests/unit/data/dicomParser/validateMagicByte.test.js`, `viewer/tests/unit/data/dicomParser/validateTransferSyntax.test.js`, `viewer/tests/unit/data/dicomParser/ParseContext.test.js`
  - 설명: Phase 1 코어 파서 인프라에 대한 단위 테스트를 작성한다. (1) validateMagicByte: TC-1.1~TC-1.4 (유효/무효 매직 바이트, 빈 파일, 프리앰블만 있는 파일), (2) validateTransferSyntax: TC-2.1~TC-2.3 (지원/미지원 전송 구문, 빈 문자열), (3) ParseContext: 바이트 오더 설정, 오프셋 관리, readUint16/readUint32/readString 메서드 정확도. 가상 DICOM 버퍼 생성 헬퍼를 공통 모듈로 추출.
  - 예상 공수: 2.0시간
  - 의존성: T-1.1-002, T-1.1-003, T-1.1-004
  - 담당 Story: US-1, US-2
  - 완료 조건:
    - TC-1.1~TC-1.4 모두 통과
    - TC-2.1~TC-2.3 모두 통과
    - ParseContext 오프셋 관리 정확도 100%
    - 코어 파서 코드 커버리지 90% 이상
  - 추적: FR-1.1, FR-1.2, IEC 62304 Class A, US-1, US-2

- [ ] **T-1.1-021** 🔒 테스트용 DICOM 픽스처 생성 유틸리티 구현
  - 파일: `viewer/tests/helpers/dicomFixtureBuilder.js`
  - 설명: 단위 테스트에서 사용할 가상 DICOM 파일 버퍼를 생성하는 빌더 유틸리티를 구현한다. (1) `createMinimalDICOMBuffer()` - 프리앰블 + 매직 바이트 + 최소 메타 그룹 + 필수 태그 + 픽셀 데이터를 포함한 최소 DICOM 버퍼, (2) `createInvalidDICOMBuffer()` - 매직 바이트가 없는 무효 버퍼, (3) `createDICOMBufferWithOverrides(overrides)` - 특정 태그 값을 커스터마이징할 수 있는 빌더, (4) `createLargeDICOMBuffer(sizeMB)` - 대용량 파일 시뮬레이션. 빌더 패턴을 사용하여 테스트 가독성 향상.
  - 예상 공수: 1.5시간
  - 의존성: T-1.1-002 (상수 정의)
  - 담당 Story: US-1~US-5 (테스트 인프라)
  - 완료 조건:
    - 최소 DICOM 버퍼가 validateMagicByte를 통과
    - 커스텀 태그 값이 올바르게 인코딩됨
    - 기존 테스트 헬퍼를 이 유틸리티로 대체 가능
  - 추적: IEC 62304 Class A, US-1~US-5
---

## Phase 5: 문서화 및 검증 (Documentation & Verification)
<!-- IEC 62304 Class A 문서화, 추적성 매트릭스, 최종 검증 -->

- [ ] **T-1.1-022** 🔒 JSDoc API 문서화 완성
  - 파일: `viewer/src/data/dicomParser/` 하위 모든 모듈
  - 설명: 모든 공개 함수와 내부 헬퍼 함수에 대한 JSDoc 문서화를 완성한다. (1) @param 태그로 모든 매개변수의 타입과 설명 명시, (2) @returns 태그로 반환값 타입과 의미 명시, (3) @throws 태그로 발생 가능한 에러 명시, (4) @example 태그로 사용 예시 포함, (5) IEC 62304 제5.4.3 요구사항에 따른 공개 API 문서화. 모든 함수의 JSDoc이 SDS-3.1 인터페이스 명세와 일치하는지 크로스체크.
  - 예상 공수: 1.0시간
  - 의존성: T-1.1-017
  - 담당 Story: US-1~US-5 (문서화)
  - 완료 조건:
    - 6개 공개 함수에 완전한 JSDoc 포함
    - 내부 헬퍼 함수에 최소 @param/@returns 포함
    - JSDoc이 SDS-3.1 인터페이스 명세와 일치
  - 추적: IEC 62304 제5.4.3, SDS-3.1, ADR-1

- [ ] **T-1.1-023** 🔒 추적성 매트릭스 및 변경 이력 정리
  - 파일: `docs/artifacts/traceability_COMP-1.1.md`
  - 설명: COMP-1.1 DICOM 파일 파서의 전체 추적성 매트릭스를 작성한다. (1) FR -> US -> TC -> Task 양방향 매핑 테이블, (2) HAZ -> 완화 태스크 매핑, (3) ADR -> 적용 태스크 매핑, (4) 변경 이력(초안 작성일, 리뷰일, 승인일). FR-1.1~FR-1.5가 모든 태스크에 추적 가능한지 검증. IEC 62304 Class A 감사 추적성 요건 충족.
  - 예상 공수: 1.0시간
  - 의존성: T-1.1-001 ~ T-1.1-021 (모든 태스크)
  - 담당 Story: US-1~US-5 (문서화)
  - 완료 조건:
    - FR-1.1~FR-1.5가 모든 태스크에 매핑됨
    - HAZ-1.1, HAZ-5.2 완화 조치가 태스크에 매핑됨
    - 변경 이력에 날짜/작성자/변경 내용 포함
  - 추적: IEC 62304 Class A, FR-1.1~FR-1.5, HAZ-1.1, HAZ-5.2

---

## 의존성 그래프 (Dependency Graph)

```
T-1.1-001 (스캐폴드)
  |
  +--> T-1.1-002 (상수 + 매직 바이트)
  |      |
  |      +--> T-1.1-004 (전송 구문 검증)  🔀 T-1.1-003 과 병렬
  |      |
  |      +--> T-1.1-003 (ParseContext)
  |             |
  |             +--> T-1.1-005 (태그 읽기 헬퍼)
  |                    |
  |                    +--> T-1.1-006 (메타 그룹 파서)
  |                    |      |
  |                    |      +--> T-1.1-007 (필수 메타데이터 파서)
  |                    |             |
  |                    |             +--> T-1.1-008 (선택 메타데이터)
  |                    |             |
  |                    |             +--> T-1.1-010 (픽셀 데이터 탐색)
  |                    |                    |
  |                    |                    +--> T-1.1-011 (타입 변환)
  |                    |                           |
  |                    |                           +--> T-1.1-012 (무결성 검증)
  |                    |
  |                    +--> T-1.1-021 (테스트 픽스처) 🔀 병렬 가능
  |
  +--> T-1.1-014 (에러 코드 체계)
         |
         +--> T-1.1-015 (handleParseError)

T-1.1-009 (메타데이터 테스트)      <-- T-1.1-006,007,008
T-1.1-013 (복셀 데이터 테스트)     <-- T-1.1-010,011,012
T-1.1-018 (오류 처리 테스트)       <-- T-1.1-014,015
T-1.1-020 (코어 파서 테스트)       <-- T-1.1-002,003,004
T-1.1-016 (파이프라인 통합)        <-- 모든 구현 태스크
T-1.1-017 (배럴 파일 완성)         <-- T-1.1-016
T-1.1-019 (통합 단위 테스트)       <-- T-1.1-016,017
T-1.1-022 (JSDoc 문서화)           <-- T-1.1-017
T-1.1-023 (추적성 매트릭스)        <-- 전체
```

---

## 요약 통계

| 항목 | 값 |
|------|------|
| 총 태스크 수 | 23개 |
| Phase 1 (코어 파서 인프라) | 5개 (T-1.1-001 ~ T-1.1-005) |
| Phase 2 (메타데이터 파싱) | 4개 (T-1.1-006 ~ T-1.1-009) |
| Phase 3 (복셀 데이터 추출) | 4개 (T-1.1-010 ~ T-1.1-013) |
| Phase 4 (오류 처리/통합) | 8개 (T-1.1-014 ~ T-1.1-021) |
| Phase 5 (문서화/검증) | 2개 (T-1.1-022 ~ T-1.1-023) |
| 총 예상 공수 | 31.5시간 |
| 구현 태스크 | 17개 |
| 테스트 태스크 | 4개 |
| 인프라/문서 태스크 | 2개 |

---

## IEC 62304 Class A 추적성 요약

| FR | User Story | 테스트 케이스 | 담당 태스크 |
|----|-----------|--------------|------------|
| FR-1.1 (DICOM 파일 선택) | US-1 | TC-1.1~TC-1.4 | T-1.1-001,002,016,020 |
| FR-1.2 (형식 검증) | US-1, US-2 | TC-1.1~TC-1.4, TC-2.1~TC-2.3 | T-1.1-002,004,020 |
| FR-1.3 (메타데이터 파싱) | US-3 | TC-3.1~TC-3.3 | T-1.1-005~009 |
| FR-1.4 (복셀 데이터 파싱) | US-4 | TC-4.1~TC-4.4 | T-1.1-010~013 |
| FR-1.5 (오류 처리) | US-5 | TC-5.1~TC-5.3 | T-1.1-014,015,018 |

| HAZ | 위험 설명 | 완화 태스크 |
|-----|-----------|-----------|
| HAZ-1.1 | DICOM 파싱 오류로 영상 왜곡 | T-1.1-012, T-1.1-016 (파이프라인 방어) |
| HAZ-5.2 | 비표준 DICOM으로 기능 정지 | T-1.1-004, T-1.1-008 (graceful fallback) |

---

*본 문서는 PLAYG-1375 ([COMP-1.1] DICOM 파일 파서) 티켓의 태스크 분해 문서입니다.*
*IEC 62304 Class A 준수를 위해 작성되었으며, 최종 업데이트: 2026-04-15*
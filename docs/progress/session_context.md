# Session Context - PLAYG-1822

### 1. 시스템 아키텍처/컨벤션 (유실 절대 금지)

- **프로젝트**: DentiView3D (DICOM 파일 뷰어, IEC 62304 Class A 안전 등급)
- **핵심 클래스/모듈**:
  - `DicomParser` (COMP-1): DICOM 파일 파싱 파이프라인 오케스트레이터
  - `ValidationModule` (COMP-2): 검증 로직 캡슐화 (본 작업 대상)
  - `ErrorManager` (COMP-7): 에러 메시지 생성 및 핸들링 위임
- **파이프라인 순서**: `validateMagicByte()` -> `parseMetaGroup()` -> **`validateTransferSyntax()`** -> `parseMetadata()` -> `parsePixelData()`
- **지원 전송 구문 3종 (비압축만)**:
  - `TRANSFER_SYNTAX.EXPLICIT_VR_LE = '1.2.840.10008.1.2.1'` (Explicit VR Little Endian)
  - `TRANSFER_SYNTAX.IMPLICIT_VR_LE = '1.2.840.10008.1.2'` (Implicit VR Little Endian)
  - `TRANSFER_SYNTAX.BIG_ENDIAN = '1.2.840.10008.1.2.2'` (Explicit VR Big Endian)
  - 상수 정의 위치: `viewer/src/data/dicomDictionary.js` (SUPPORTED_TRANSFER_SYNTAXES Set 포함)
- **에러 코드**: `PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX` (정의 위치: `viewer/src/data/dicomParser/constants.js`)
- **타입 구조**:
  - `ParseContext`: `{ vrMode: 'Explicit'|'Implicit'|null, byteOrder: 'LittleEndian'|'BigEndian'|null }`
  - `ParseResult`: `createParseResult()` 팩토리로 생성, `.errors` 배열 포함
  - `DICOMMetadata`: `createDICOMMetadata()` 팩토리, `transferSyntax` 필드 포함
- **핵심 파일 경로**:
  - `viewer/src/data/dicomParser/validateTransferSyntax.js` - 메인 구현 파일
  - `viewer/src/data/dicomParser/parseContext.js` - ParseContext 타입
  - `viewer/src/data/dicomParser/handleParseError.js` - 에러 핸들링 유틸리티
  - `viewer/src/data/dicomParser/index.js` - 배럴 파일 (re-export 선언 이미 존재)
  - `viewer/src/data/dicomDictionary.js` - 전송 구문 상수 및 DICOM 사전
  - `viewer/src/data/dicomParser/constants.js` - 에러 코드 정의
  - `viewer/src/types/ParseResult.js` - ParseResult 팩토리
  - `viewer/src/types/DICOMMetadata.js` - DICOMMetadata 팩토리
  - `viewer/src/errors/CBVError.js` - ValidationError 클래스
- **설계 원칙**: 단일 책임(SRP), 관심사 분리(SoC), 정보 은폐, 안전 우선(예외 미발생, 명시적 boolean 반환)
- **추적성**: SRS FR-1.2 (PLAYG-1460) -> SAD COMP-2 (PLAYG-1766) -> SDS-3.3 (PLAYG-1822)

### 2. 해결 완료된 주요 이슈 및 기술 스택

- **작업 완료**: PLAYG-1822 SDS-3.3 validateTransferSyntax() 설계 문서 3종 생성 완료
  - `01_spec.md`: 3개 사용자 스토리(정상 검증 US1, 미지원 거부 US2, null/빈값 방어 US3) + 엣지 케이스 + DoD 정의
  - `02_plan.md`: 구현 계획서 (기술 컨텍스트, Constitution Check, 위험 분석 포함)
  - `03_tasks.md`: 7개 태스크(T001~T007) 4개 Phase로 분할
    - Phase 1 Setup: T001 상수/에러코드 확인, T002 ParseContext/handleParseError 확인
    - Phase 2 Foundational: T003 validateTransferSyntax() 골격, T004 configureParseContext() 헬퍼
    - Phase 3 Core: T005 단위 테스트 TC-3.3.1~TC-3.3.4, T006 TC-3.3.5~TC-3.3.7
    - Phase 4 Integration: T007 DicomParser 파이프라인 통합
- **핵심 API 설계**:
  - `validateTransferSyntax(transferSyntaxUID: string, parseContext: ParseContext): boolean`
  - `configureParseContext(parseContext, transferSyntaxUID)` - 내부 헬퍼 (switch 문으로 3종 UID 분기)
- **IEC 62304 Class A 요구사항**: 모든 실행 경로 명시적 boolean 반환, uncaught exception 금지, 전 경로 단위 테스트 필수

### 3. 미완료 / Next Steps

- **T001~T007 실제 코드 구현이 필요함** (현재 설계 문서만 완료된 상태)
- T003: `validateTransferSyntax.js` 파일에 함수 골격 구현
- T004: `configureParseContext()` 내부 헬퍼 switch 문 구현 (VR 모드 + 바이트 오더 설정)
- T005~T006: 단위 테스트 TC-3.3.1 ~ TC-3.3.7 작성
- T007: DicomParser 파이프라인 통합 (validateMagicByte 통과 후, parseMetadata 호출 전에 validateTransferSyntax 호출)
- 테스트 파일 위치: `viewer/src/data/dicomParser/__tests__/validateTransferSyntax.test.js`

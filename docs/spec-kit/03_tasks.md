# Tasks: parseMetadata() - DICOM 데이터셋 전체 메타데이터 파싱

**Input**: `docs/spec-kit/01_spec.md`, `docs/spec-kit/02_plan.md`
**Ticket**: `PLAYG-1828` | **Date**: 2026-04-29

> **형식 안내**
> - `[ID]` : 태스크 번호 (T001, T002, ...)
> - `[P]` : 병렬 실행 가능 여부 표시 (🔀 병렬 가능 / 🔒 순서 필수)
> - `[Story]` : 관련 사용자 스토리 (US1, US2, ...)
> - 각 태스크는 **2시간 이내** 완료 가능한 단위로 분할

---

## Phase 1: Setup (공통 인프라)
<!-- 모든 다음 단계에 필요한 공통 상수·타입·에러코드 검증 -->

- [ ] **T001** 🔒 상수 정의 검증 및 보강 (METADATA_TAGS, MAX_TAG_COUNT, PIXEL_DATA_GROUP, DICOM_MIN_FILE_SIZE)
  - 파일: `viewer/src/constants/index.js`
  - 작업 내용:
    - `METADATA_TAGS` 사전에 15개 필드(태그키, 필드명, 필수 여부, 기본값)가 올바르게 정의되어 있는지 확인
    - `MAX_TAG_COUNT = 10000` 상수 존재 및 값 확인
    - `PIXEL_DATA_GROUP = 0x7FE0` 상수 존재 확인
    - `DICOM_MIN_FILE_SIZE = 132` 상수 존재 확인
    - 누락된 상수가 있으면 즉시 보강
  - 추적: FR-2.2, FR-2.3, HAZ-5.1, HAZ-5.3
  - 완료 조건: 4개 상수가 모두 `constants/index.js`에 정의되고, `METADATA_TAGS`에 15개 필드 항목이 누락 없이 존재함. `npm test` 기존 테스트 통과.

- [ ] **T002** 🔒 CBVError.ParseError 에러 코드 검증 및 보강
  - 파일: `viewer/src/errors/CBVError.js`
  - 작업 내용:
    - `PARSE_ERR_UNEXPECTED` 에러 코드 존재 확인 (EC-001, EC-002용)
    - `PARSE_ERR_MISSING_REQUIRED_TAG` 에러 코드 존재 확인 (EC-004용)
    - `PARSE_WARN_OPTIONAL_TAG_MISSING` 경고 코드 존재 확인 (EC-007, EC-008용)
    - 누락된 에러/경고 코드가 있으면 즉시 보강
  - 추적: FR-1.3, HAZ-1.3
  - 완료 조건: 3개 에러/경고 코드가 `CBVError.ParseError`에 정의됨. 기존 테스트 통과.

- [ ] **T003** 🔒 테스트 픽스처 및 헬퍼 유틸리티 생성
  - 파일: `viewer/tests/unit/fixtures/validBuffer.js`, `viewer/tests/unit/fixtures/missingRequired.js`, `viewer/tests/unit/fixtures/oversizedBuffer.js`
  - 작업 내용:
    - `validBuffer.js`: 15개 메타데이터 필드가 모두 포함된 유효 DICOM ArrayBuffer 생성 헬퍼
    - `missingRequired.js`: 필수 태그(rows/columns/bitsAllocated/pixelRepresentation)를 선택적으로 누락한 버퍼 생성 헬퍼
    - `oversizedBuffer.js`: MAX_TAG_COUNT(10000) 초과 태그를 포함한 버퍼 생성 헬퍼
    - 공통 헬퍼: 태그 헤더 작성(그룹+요소+길이), 값 쓰기, 픽셀 데이터 그룹(0x7FE0) 삽입 유틸
  - 추적: EC-001 ~ EC-008
  - 완료 조건: 각 픽스처 파일이 독립적으로 `import` 가능하고, 지정된 시나리오의 버퍼를 생성함. 유효 버퍼는 132바이트 이상 보장.
---

## Phase 2: Foundational (선행 필수 항목)
<!-- CRITICAL: 사용자 스토리 구현 전 반드시 완료해야 할 핵심 인프라 -->

- [ ] **T004** 🔒 의존 모듈 공개 API 검증 (metaGroupParser, ParseContext, tagReader, phiGuard, DICOMMetadata, dicomDictionary)
  - 파일: `viewer/src/components/metaGroupParser.js`, `viewer/src/data/parseContext.js`, `viewer/src/components/tagReader.js`, `viewer/src/components/phiGuard.js`, `viewer/src/data/dicomMetadata.js`, `viewer/src/data/dicomDictionary.js`
  - 작업 내용:
    - `parseMetaGroup(buffer)` 함수 존재 및 반환 타입(`{ transferSyntaxUID, metaEndOffset }`) 확인
    - `createParseContext(buffer, transferSyntaxUID, metaEndOffset)` 함수 존재 및 반환 타입(`{ offset, buffer, dataView, isLittleEndian, isExplicitVR, errors, hasRemaining() }`) 확인
    - `readTag(ctx)` 함수 존재 및 반환 타입(`{ group, element, value, length }`) 확인
    - `maskPhiFields(metadata)` 함수 존재 및 동작 확인
    - `createDICOMMetadata(collected)` 함수 존재 및 25개 필드 객체 반환 확인
    - `makeTagKey(group, element)` 함수 존재 및 GGGGEEEE 형식 문자열 반환 확인
    - 각 모듈의 export 스타일(네임드/디폴트) 확인하여 import 구문 작성 준비
  - 추적: FR-001, FR-003, FR-004, FR-005
  - 완료 조건: 6개 의존 모듈의 공개 API가 spec에 명시된 시그니처와 일치함. 각 함수의 간단한 호출 테스트로 동작 검증 완료.

- [ ] **T005** 🔒 parseMetadata() 함수 스켈레톤 및 Step 1 (버퍼 크기 검증) 구현
  - 파일: `viewer/src/components/metadataParser.js`
  - 작업 내용:
    - `export function parseMetadata(buffer, preParsedMeta)` 함수 스켈레톤 생성
    - Step 1: buffer null/undefined 체크 (EC-001)
    - Step 1: buffer.byteLength < DICOM_MIN_FILE_SIZE(132) 체크 (EC-002)
    - 검증 실패 시 `throw new CBVError.ParseError(PARSE_ERR_UNEXPECTED, ...)`
    - 의존 모듈 import 문 작성 (constants, CBVError, metaGroupParser 등)
  - 추적: FR-001, FR-002, EC-001, EC-002
  - 완료 조건: null/undefined 입력 시 ParseError throw. 131바이트 버퍼 입력 시 ParseError throw. 132바이트 이상 버퍼 입력 시 에러 없이 다음 단계로 진행.
---

## Phase 3: User Story 1 — DICOM 파일 메타데이터 추출 (Priority: P1) 🎯 MVP

- **Goal**: DICOM 파일 버퍼를 입력받아 15개 메타데이터 필드를 자동 추출하여 구조화된 DICOMMetadata 객체로 반환
- **Independent Test**: 유효한 DICOM 버퍼를 parseMetadata()에 전달하여 반환된 metadata 객체의 15개 필드 값을 직접 검증

- [ ] **T006** 🔀 [US1] Step 2-3 구현: preParsedMeta 재사용 분기 및 파싱 컨텍스트 생성
  - 파일: `viewer/src/components/metadataParser.js`
  - 작업 내용:
    - Step 2: preParsedMeta.transferSyntaxUID 존재 여부 확인
    - preParsedMeta 유효 시: transferSyntaxUID, metaEndOffset 재사용 (FR-003)
    - preParsedMeta 누락/무효 시: parseMetaGroup(buffer) 호출하여 획득 (FR-004, EC-003)
    - Step 3: createParseContext(buffer, transferSyntaxUID, metaEndOffset) 호출 (FR-005)
    - 컨텍스트 생성 실패 시 ParseError throw
  - 추적: FR-003, FR-004, FR-005, EC-003
  - 완료 조건: preParsedMeta 제공 시 parseMetaGroup() 호출되지 않음. 미제공 시 parseMetaGroup() 호출됨. createParseContext()로 컨텍스트 정상 생성.

- [ ] **T007** 🔀 [US1] Step 4 구현: while 루프 태그 순회 핵심 로직
  - 파일: `viewer/src/components/metadataParser.js`
  - 작업 내용:
    - 루프 조건: `ctx.hasRemaining(4) && tagCount < MAX_TAG_COUNT` (FR-006, NFR-001, NFR-002)
    - readTag(ctx) 호출을 try-catch로 감싸고 예외 시 에러 기록 후 break (NFR-005, EC-005)
    - 픽셀 데이터 그룹(0x7FE0) 도달 시 pixelDataOffset/pixelDataLength 캐시 후 break (NFR-003)
    - METADATA_TAGS 사전으로 makeTagKey(group, element) 매칭하여 collected 객체에 값 저장 (FR-007)
    - tagCount 증분 및 루프 종료 로직
  - 추적: FR-2.2, FR-2.3, FR-006, FR-007, NFR-001, NFR-002, NFR-003, NFR-005, EC-005, EC-006, HAZ-5.1, HAZ-5.3
  - 완료 조건: 유효 버퍼에서 15개 메타데이터 필드가 collected 객체에 저장됨. readTag() 예외 시 안전 break. 픽셀 데이터 그룹 도달 시 조기 종료. MAX_TAG_COUNT 도달 시 정상 종료.

- [ ] **T008** 🔀 [US1] Step 5-7 구현: 필수 태그 검증, 선택 태그 기본값, 메타데이터 객체 생성
  - 파일: `viewer/src/components/metadataParser.js`
  - 작업 내용:
    - Step 5: METADATA_TAGS에서 required=true인 필드(rows, columns, bitsAllocated, pixelRepresentation) 누락 감지 (FR-008, FR-1.3, HAZ-1.3)
    - 누락 시 PARSE_ERR_MISSING_REQUIRED_TAG 에러를 ctx.errors에 추가 (파싱 중단하지 않음, EC-004)
    - Step 6: required=false인 필드 누락 시 METADATA_TAGS.defaultValue 적용 (FR-009)
    - pixelSpacing 단일 값 처리: value가 배열이 아닌 경우 [value, value]로 정규화 (EC-007)
    - 선택 태그 누락 시 PARSE_WARN_OPTIONAL_TAG_MISSING 경고 기록
    - Step 7: createDICOMMetadata(collected) 호출로 25개 필드 객체 생성 (FR-010)
    - highBit = bitsAllocated - 1 자동 계산 확인
  - 추적: FR-008, FR-009, FR-010, FR-1.3, HAZ-1.3, EC-004, EC-007, EC-008
  - 완료 조건: 필수 태그 누락 시 에러 기록. 선택 태그 누락 시 기본값 적용. createDICOMMetadata()로 25개 필드 객체 생성. pixelSpacing 단일 값 정규화 동작.

- [ ] **T009** 🔀 [US1] Step 8-9 구현: PHI 마스킹 및 결과 반환
  - 파일: `viewer/src/components/metadataParser.js`
  - 작업 내용:
    - Step 8: maskPhiFields(metadata) 호출하여 patientName, patientID, patientBirthDate를 [REDACTED]로 마스킹 (FR-011, FR-4.1, HAZ-3.1)
    - 원본 값은 phiGuard 모듈의 WeakMap에 안전 저장 확인 (NFR-004)
    - Step 9: 반환 객체 구성: `{ metadata, context: ctx, errors: ctx.errors, transferSyntaxUID, _pixelDataOffset, _pixelDataLength }` (FR-012)
    - 반환값 구조가 spec에 명시된 시그니처와 정확히 일치하는지 확인
  - 추적: FR-011, FR-012, FR-4.1, HAZ-3.1, NFR-004
  - 완료 조건: PHI 필드가 [REDACTED]로 마스킹됨. WeakMap에서 원본 복원 가능. 반환 객체가 6개 키(metadata, context, errors, transferSyntaxUID, _pixelDataOffset, _pixelDataLength)를 포함.

- [ ] **T010** 🔒 [US1] 단위 테스트 작성 - 기본 파싱 및 preParsedMeta 재사용
  - 파일: `viewer/tests/unit/parseMetadata.test.js`
  - 작업 내용:
    - TC-001: 유효한 DICOM 버퍼에서 15개 메타데이터 필드 전체 추출 검증 (SC-001)
    - TC-002: null/undefined 버퍼 입력 시 PARSE_ERR_UNEXPECTED throw (EC-001)
    - TC-003: 131바이트 버퍼 입력 시 PARSE_ERR_UNEXPECTED throw (EC-002)
    - TC-004: preParsedMeta 제공 시 메타 그룹 재파싱 방지 확인 (FR-003, SC-007)
    - TC-005: preParsedMeta 누락 시 parseMetaGroup() 호출 확인 (FR-004)
    - TC-006: preParsedMeta에 transferSyntaxUID만 있고 metaEndOffset 누락된 케이스 (EC-003)
  - 추적: SC-001, SC-007, EC-001, EC-002, EC-003
  - 완료 조건: 6개 테스트 케이스 전체 PASS. 커버리지 90% 이상.
---

## Phase 4: User Story 2 — 필수 태그 누락 검증 및 에러 보고 (Priority: P1) 🎯 MVP

- **Goal**: 필수 태그 누락 시 구조화된 에러를 생성하여 반환하며, 파싱은 중단하지 않고 최대한 진행
- **Independent Test**: 필수 태그가 의도적으로 누락된 버퍼를 입력하여 errors 배열에 PARSE_ERR_MISSING_REQUIRED_TAG 에러가 포함되는지 확인

- [ ] **T011** 🔀 [US2] 필수 태그 누락 검증 로직 구현 및 강화
  - 파일: `viewer/src/components/metadataParser.js`
  - 작업 내용:
    - METADATA_TAGS 사전에서 required=true 필드(rows, columns, bitsAllocated, pixelRepresentation) 순회 검증 로직 재확인
    - 각 누락 필드마다 `{ code: PARSE_ERR_MISSING_REQUIRED_TAG, tag: tagKey, message }` 에러 객체를 ctx.errors에 추가
    - 모든 필수 태그가 누락된 극단적 케이스(EC-004)에서 4개 에러가 모두 기록되는지 확인
    - 파싱 중단 없이 루프 이후 검증 단계에서 에러 누적
  - 추적: FR-008, FR-1.3, HAZ-1.3, EC-004, SC-002
  - 완료 조건: 필수 태그 4개 각각 누락 시 PARSE_ERR_MISSING_REQUIRED_TAG 에러 기록. 전체 누락 시 4개 에러 모두 기록. 파싱은 중단되지 않음.

- [ ] **T012** 🔒 [US2] 단위 테스트 작성 - 필수 태그 누락 시나리오
  - 파일: `viewer/tests/unit/parseMetadata.test.js`
  - 작업 내용:
    - TC-007: rows(00280010) 누락 버퍼에서 PARSE_ERR_MISSING_REQUIRED_TAG 에러 확인 (US2-AS1)
    - TC-008: columns(00280011) 누락 버퍼에서 에러 확인
    - TC-009: bitsAllocated(00280100) 누락 버퍼에서 에러 확인
    - TC-010: pixelRepresentation(00280103) 누락 버퍼에서 에러 확인
    - TC-011: 필수 태그 전체 누락 시 4개 에러 동시 기록 확인 (EC-004)
    - TC-012: 에러 기록 후에도 metadata 객체가 여전히 반환되는지 확인 (파싱 중단 없음)
  - 추적: SC-002, EC-004, FR-008
  - 완료 조건: 6개 테스트 케이스 전체 PASS.

---

## Phase 5: User Story 3 — 무한 루프 방지 및 버퍼 안전성 보장 (Priority: P1) 🎯 MVP

- **Goal**: 악의적/손상된 DICOM 파일로 인한 무한 루프와 버퍼 초과 읽기를 방지하여 프로덕션 안정성 보장
- **Independent Test**: 조작된 버퍼(무한 루프 유도, 버퍼 초과)를 입력하여 안전하게 종료되는지 확인

- [ ] **T013** 🔀 [US3] 무한 루프 방지 및 버퍼 경계 안전 로직 구현
  - 파일: `viewer/src/components/metadataParser.js`
  - 작업 내용:
    - MAX_TAG_COUNT(10000) 상한 검증 로직 확인 및 보강 (NFR-001, HAZ-5.1)
    - tagCount 경계 조건: tagCount < MAX_TAG_COUNT에서 tagCount=10000일 때 정상 종료 확인 (EC-006)
    - ctx.hasRemaining(4) false 시 자연 종료 로직 확인 (NFR-002, HAZ-5.3)
    - readTag() 예외 발생 시 try-catch에서 에러 기록 후 안전 break 로직 확인 (NFR-005, EC-005)
    - 각 종료 지점에 디버그용 주석 추가 (어떤 안전 장치가 동작했는지 명시)
  - 추적: NFR-001, NFR-002, NFR-005, HAZ-5.1, HAZ-5.3, EC-005, EC-006, SC-004
  - 완료 조건: 10001개 태그 버퍼에서 tagCount=10000에 안전 종료. 버퍼 끝에서 hasRemaining(4) false 시 자연 종료. readTag() 예외 시 에러 기록 후 break.

- [ ] **T014** 🔒 [US3] 단위 테스트 작성 - 안전성 시나리오
  - 파일: `viewer/tests/unit/parseMetadata.test.js`
  - 작업 내용:
    - TC-013: 태그 10001개 버퍼에서 MAX_TAG_COUNT 도달 시 강제 종료 확인 (US3-AS1, SC-004)
    - TC-014: tagCount 정확히 10000일 때 정상 종료 확인 (EC-006)
    - TC-015: 버퍼 끝에서 태그 헤더(4바이트) 불충분 시 hasRemaining(4) false로 자연 종료 (US3-AS2)
    - TC-016: readTag() 내부 예외 발생 시 에러 기록 후 안전 break (US3-AS3, EC-005)
    - TC-017: 강제 종료 시점까지 수집된 메타데이터가 보존되는지 확인
  - 추적: SC-004, EC-005, EC-006, NFR-001, NFR-002, NFR-005
  - 완료 조건: 5개 테스트 케이스 전체 PASS.
---

## Phase 6: User Story 4 — 픽셀 데이터 그룹 조기 종료 최적화 (Priority: P2)

- **Goal**: 태그 순회 중 픽셀 데이터 그룹(0x7FE0)에 도달하면 순회를 즉시 중단하고 픽셀 데이터 오프셋과 길이를 캐시
- **Independent Test**: 픽셀 데이터 그룹 앞에 수천 개의 불필요한 태그가 있는 버퍼에서 파싱 시간을 측정하여 조기 종료가 동작하는지 확인

- [ ] **T015** 🔀 [US4] 픽셀 데이터 그룹 조기 종료 및 오프셋 캐싱 구현
  - 파일: `viewer/src/components/metadataParser.js`
  - 작업 내용:
    - while 루프 내 readTag() 결과의 group 값을 확인하여 PIXEL_DATA_GROUP(0x7FE0) 이상인지 검사
    - 조건 충족 시 `_pixelDataOffset = ctx.offset - tagHeaderSize`로 오프셋 기록
    - `_pixelDataLength = tag.length`로 길이 기록
    - 즉시 break하여 불필요한 순회 방지
    - 0x7FE0 이후 태그가 읽히지 않음을 보장하는 가드 조건 추가
  - 추적: NFR-003, SC-005, FR-2.2
  - 완료 조건: 0x7FE0 그룹 태그 도달 시 즉시 break. _pixelDataOffset과 _pixelDataLength가 올바르게 기록됨. 0x7FE0 이후 태그가 순회되지 않음.

- [ ] **T016** 🔒 [US4] 단위 테스트 작성 - 조기 종료 시나리오
  - 파일: `viewer/tests/unit/parseMetadata.test.js`
  - 작업 내용:
    - TC-018: 0x7FE0 그룹 포함 버퍼에서 조기 종료 및 오프셋/길이 캐시 확인 (US4-AS1, SC-005)
    - TC-019: 0x7FE0 그룹 이후에 매칭되는 메타데이터 태그가 있어도 순회되지 않음 확인
    - TC-020: 0x7FE0 그룹이 없는 버퍼에서는 정상적으로 끝까지 순회됨 확인
  - 추적: SC-005, NFR-003
  - 완료 조건: 3개 테스트 케이스 전체 PASS.

---

## Phase 7: User Story 5 — PHI 자동 마스킹 (Priority: P1) 🎯 MVP

- **Goal**: 추출된 메타데이터 중 환자 식별 정보(patientName, patientID, patientBirthDate)를 [REDACTED]로 자동 마스킹
- **Independent Test**: patientName과 patientID가 포함된 버퍼 파싱 후 metadata 객체에서 해당 필드가 [REDACTED]로 치환되었는지 확인

- [ ] **T017** 🔀 [US5] PHI 마스킹 적용 및 WeakMap 원본 저장 검증
  - 파일: `viewer/src/components/metadataParser.js`, `viewer/src/components/phiGuard.js`
  - 작업 내용:
    - maskPhiFields(metadata) 호출 위치가 Step 8(반환 직전)인지 확인
    - patientName, patientID, patientBirthDate 필드가 [REDACTED]로 치환되는지 검증
    - phiGuard 모듈의 WeakMap에 원본 값이 안전 저장되는지 확인
    - WeakMap에서 metadata 객체를 키로 원본 복원 가능한지 검증 (NFR-004)
    - 마스킹 대상 필드가 빈 문자열인 경우에도 마스킹이 수행되지 않거나 안전하게 처리되는지 확인
  - 추적: FR-011, FR-4.1, HAZ-3.1, NFR-004, SC-006
  - 완료 조건: PHI 필드 3개가 [REDACTED]로 마스킹됨. WeakMap에서 원본 복원 가능. 빈 문자열 필드도 안전하게 처리됨.

- [ ] **T018** 🔒 [US5] 단위 테스트 작성 - PHI 마스킹 시나리오
  - 파일: `viewer/tests/unit/parseMetadata.test.js`
  - 작업 내용:
    - TC-021: patientName, patientID 포함 버퍼에서 마스킹 확인 (US5-AS1, SC-006)
    - TC-022: WeakMap에서 원본 환자 식별 정보 복원 확인 (US5-AS2)
    - TC-023: 환자 정보 필드가 빈 문자열인 버퍼에서 마스킹 동작 확인
    - TC-024: 환자 정보 필드가 누락된 버퍼에서 마스킹 스킵 확인
  - 추적: SC-006, FR-4.1, HAZ-3.1, NFR-004
  - 완료 조건: 4개 테스트 케이스 전체 PASS.
---

## Phase 8: Integration & Finalization

- [ ] **T019** 🔒 통합 테스트 실행 및 회귀 검증
  - 파일: `viewer/tests/integration/dicomParser.test.js`, `viewer/src/data/dicomParser.js`
  - 작업 내용:
    - 기존 dicomParser.test.js 통합 테스트 전체 실행 및 통과 확인
    - parseDICOM() -> parseMetadata() 호출 체인 정상 동작 검증
    - 전체 파싱 파이프라인 회귀 없음 확인
    - parseMetadata() 단위 테스트 전체 재실행 및 통과 확인
    - 테스트 커버리지 90% 이상 달성 확인
  - 추적: SC-001 ~ SC-007 전체
  - 완료 조건: 기존 통합 테스트 전체 PASS. parseMetadata() 단위 테스트 전체 PASS. 커버리지 90% 이상. 회귀 이슈 없음.

- [ ] **T020** 🔒 엣지 케이스 종합 검증 및 코드 정리
  - 파일: `viewer/src/components/metadataParser.js`, `viewer/tests/unit/parseMetadata.test.js`
  - 작업 내용:
    - EC-001 ~ EC-008 전체 시나리오에 대한 테스트 커버리지 재확인
    - JSDoc 주석 작성: 함수 시그니처, 파라미터 타입, 반환값 구조, 예외 목록
    - 코드 리뷰 체크리스트 기반 자가 검토 (SOLID, 레이어 분리, 에러 처리, 보안)
    - 디버그용 console.log 제거
    - TODO/FIXME 주석 잔여 확인
  - 추적: EC-001 ~ EC-008, NFR 전체
  - 완료 조건: EC-001 ~ EC-008 테스트 케이스 모두 존재 및 PASS. JSDoc 주석 완비. 불필요한 로깅/주석 제거.

- [ ] **T021** 🔒 문서 업데이트 및 git commit/push
  - 파일: `docs/spec-kit/03_tasks.md`, `docs/artifacts/SDS.md` (필요시)
  - 작업 내용:
    - 03_tasks.md의 체크리스트 항목 완료 표시 업데이트
    - SDS.md에 SDS-3.9 parseMetadata() 구현 상태 업데이트
    - git commit: `feat(PLAYG-1828): parseMetadata() 9단계 파싱 구현 및 테스트 완료`
    - 원격 브랜치 push: `feature/PLAYG-1828-parse-metadata`
  - 추적: PLAYG-1828
  - 완료 조건: 원격 브랜치 push 완료. SDS.md 업데이트 반영.

---

## Dependencies & Execution Order

```
Phase 1 - Setup:            T001 -> T002 -> T003
                                            |
Phase 2 - Foundational:     T004 -> T005
                                            |
Phase 3 - US1 메타데이터:    T006 -> T007 -> T008 -> T009 -> T010
                                            |
Phase 4 - US2 필수태그:     T011 -> T012
Phase 5 - US3 무한루프:     T013 -> T014    -- 병렬 가능
Phase 6 - US4 조기종료:     T015 -> T016    -- 병렬 가능
Phase 7 - US5 PHI마스킹:    T017 -> T018    -- 병렬 가능
                                            |
Phase 8 - Integration:      T019 -> T020 -> T021
```

**병렬 실행 가능 그룹** (Phase 3 완료 후):
- T011(US2) + T013(US3) + T015(US4) + T017(US5) 은 서로 독립적이므로 🔀 병렬 구현 가능
- 단, T012, T014, T016, T018 테스트는 각 선행 구현 태스크 완료 후 🔒 순차 실행

---

## Estimated Effort

| Phase        | 태스크 수 | 예상 소요 시간 |
| ------------ | --------- | -------------- |
| Phase 1: Setup          | 3  | 3시간  |
| Phase 2: Foundational   | 2  | 3시간  |
| Phase 3: US1 메타데이터 추출 (P1) | 5  | 8시간  |
| Phase 4: US2 필수 태그 검증 (P1) | 2  | 3시간  |
| Phase 5: US3 무한루프 방지 (P1)  | 2  | 3시간  |
| Phase 6: US4 조기 종료 (P2)      | 2  | 2시간  |
| Phase 7: US5 PHI 마스킹 (P1)     | 2  | 3시간  |
| Phase 8: Integration    | 3  | 3시간  |
| **합계**                | **21** | **28시간** |

---

## Traceability Matrix

| 태스크   | 관련 FR         | 관련 HAZ        | 관련 EC         | 관련 SC         |
| -------- | --------------- | --------------- | --------------- | --------------- |
| T001     | FR-2.2, FR-2.3  | HAZ-5.1, HAZ-5.3 | -               | -               |
| T002     | FR-1.3          | HAZ-1.3          | -               | -               |
| T003     | -               | -                | EC-001~EC-008   | -               |
| T004     | FR-001, FR-003~005 | -             | -               | -               |
| T005     | FR-001, FR-002  | -                | EC-001, EC-002  | -               |
| T006     | FR-003~005      | -                | EC-003          | SC-007          |
| T007     | FR-006, FR-007, FR-2.2, FR-2.3 | HAZ-5.1, HAZ-5.3 | EC-005, EC-006 | SC-004 |
| T008     | FR-008~010, FR-1.3 | HAZ-1.3      | EC-004, EC-007, EC-008 | SC-002, SC-003 |
| T009     | FR-011, FR-012, FR-4.1 | HAZ-3.1 | -               | SC-006          |
| T010     | -               | -                | EC-001~EC-003   | SC-001, SC-007  |
| T011     | FR-008, FR-1.3  | HAZ-1.3          | EC-004          | SC-002          |
| T012     | FR-008          | -                | EC-004          | SC-002          |
| T013     | -               | HAZ-5.1, HAZ-5.3 | EC-005, EC-006  | SC-004          |
| T014     | -               | HAZ-5.1, HAZ-5.3 | EC-005, EC-006  | SC-004          |
| T015     | FR-2.2          | -                | -               | SC-005          |
| T016     | -               | -                | -               | SC-005          |
| T017     | FR-011, FR-4.1  | HAZ-3.1          | -               | SC-006          |
| T018     | FR-4.1          | HAZ-3.1          | -               | SC-006          |
| T019     | FR-001~012      | HAZ-1.3, HAZ-3.1, HAZ-5.1, HAZ-5.3 | - | SC-001~SC-007 |
| T020     | -               | -                | EC-001~EC-008   | -               |
| T021     | -               | -                | -               | -               |
# Tasks: DICOMParser 상세 설계 (SDS-3.1)

**Input**: `docs/spec-kit/01_spec.md`, `docs/spec-kit/02_plan.md`
**Ticket**: `PLAYG-1385` | **Date**: 2026-04-20

> **형식 안내**
> - `[ID]` : 태스크 번호 (T001, T002, ...)
> - `[P]` : 병렬 실행 가능 여부 표시 (🔀 병렬 가능 / 🔒 순서 필수)
> - `[Story]` : 관련 사용자 스토리 (US1, US2, ...)
> - 각 태스크는 **2시간 이내** 완료 가능한 단위로 분할

---

## Phase 1: Setup (공통 인프라)

- [ ] **T001** 🔒 프로젝트 디렉토리 구조 생성 및 TypeScript 설정
  - 파일: `src/data-layer/`, `tsconfig.json`, `vitest.config.ts`
  - 완료 조건: `src/data-layer/` 디렉토리 존재, TypeScript 컴파일 및 Vitest 실행 가능

- [ ] **T002** 🔒 타입 정의 및 상수 파일 작성
  - 파일: `src/data-layer/types.ts`, `src/data-layer/constants.ts`
  - 완료 조건: ParseResult, DICOMMetadata, ErrorMessage, DicomTag 인터페이스 정의 완료. DICOM 태그 사전(약 50개 필수 태그), 매직 바이트 오프셋(128), DICM 문자열 상수 정의 완료. TypeScript 컴파일 에러 없음

---

## Phase 2: Foundational (선행 필수 항목)

- [ ] **T003** 🔒 바이트 오더 유틸리티 및 태그 읽기 모듈 구현
  - 파일: `src/data-layer/byteOrderUtils.ts`, `src/data-layer/tagReader.ts`
  - 완료 조건: determineByteOrder() 함수가 메타헤더에서 리틀/빅 엔디안을 판별. readTag()가 그룹/엘리먼트 번호를 읽음. readValue()가 VR 타입에 따라 문자열/숫자/시퀀스 값을 읽음. 단위 테스트 통과

- [ ] **T004** 🔒 DICOMParser 클래스 스켈레톤 및 handleParseError 구현
  - 파일: `src/data-layer/DICOMParser.ts`
  - 완료 조건: DICOMParser 클래스 생성자 및 프라이빗 필드(buffer, dataView, byteOffset, isLittleEndian) 정의. handleParseError() 메서드 구현 완료. 오류 분류 체계(fatal/warning/info) 동작 확인

---

## Phase 3: User Story 1~2 — 매직 바이트 및 전송 구문 검증 (Priority: P1) 🎯 MVP

- **Goal**: 비표준/손상 파일을 파싱 단계 이전에 사전 차단
- **Independent Test**: 유효/무효 매직 바이트 및 압축/비압축 전송 구문에 대한 검증 결과 확인

- [ ] **T005** 🔀 [US2] validateMagicByte() 구현
  - 파일: `src/data-layer/DICOMParser.ts`
  - 완료 조건: 오프셋 128에서 DICM 문자열 확인. 빈 파일(0바이트) 및 128바이트 미만 파일에 대해 false 반환. 유효/무효 파일 각각에 대한 단위 테스트 통과 (EC-001, EC-002)

- [ ] **T006** 🔀 [US2] validateTransferSyntax() 구현
  - 파일: `src/data-layer/DICOMParser.ts`
  - 완료 조건: Transfer Syntax UID(0002,0010) 파싱 및 지원 여부 판별. 비압축 전송 구문(Explicit VR Little Endian, Implicit VR Little Endian)만 허용. 압축 전송 구문(JPEG, JPEG2000, RLE) 거부. 단위 테스트 통과 (EC-005)

- [ ] **T007** 🔒 [US2] 검증 메서드 단위 테스트 작성
  - 파일: `src/__tests__/validateMagicByte.test.ts`, `src/__tests__/validateTransferSyntax.test.ts`
  - 완료 조건: 테스트 커버리지 90% 이상, 엣지 케이스(EC-001, EC-002, EC-005) 포함, 전체 PASS

---

## Phase 4: User Story 3 — 메타데이터 파싱 (Priority: P1)

- **Goal**: DICOM 헤더에서 필수 메타데이터를 추출하여 DICOMMetadata 객체 반환
- **Independent Test**: 알려진 태그 값을 가진 DICOM 파일의 파싱 결과 검증

- [ ] **T008** 🔀 [US3] parseMetadata() 구현
  - 파일: `src/data-layer/DICOMParser.ts`
  - 완료 조건: 필수 태그(PatientName, StudyDate, Modality, Rows, Columns, BitsAllocated, PixelSpacing, SliceThickness, ImageOrientationPatient, SamplesPerPixel, PhotometricInterpretation, TransferSyntaxUID) 파싱. 누락 태그는 기본값 설정 후 warnings에 추가. VR 타입별 파싱(LO, DA, CS, US, DS, DS, IS, OW) 동작. 단위 테스트 통과

- [ ] **T009** 🔀 [US3] 바이트 오더 판별 및 적용 로직 구현
  - 파일: `src/data-layer/DICOMParser.ts` 내 determineByteOrder() 프라이빗 메서드
  - 완료 조건: 메타헤더(0002,0010) Transfer Syntax UID 기반 바이트 오더 자동 판별. 판별 불가 시 Little Endian 기본 적용 후 warnings에 추가 (EC-007). 단위 테스트 통과

- [ ] **T010** 🔒 [US3] 메타데이터 파싱 단위 테스트 작성
  - 파일: `src/__tests__/parseMetadata.test.ts`
  - 완료 조건: PixelSpacing, ImageOrientationPatient 등 핵심 태그 파싱 검증. 필수 태그 누락 시 경고 생성 검증. 바이트 오더 판별 검증. 테스트 커버리지 90% 이상, 전체 PASS

---

## Phase 5: User Story 4 — 픽셀 데이터 파싱 (Priority: P1)

- **Goal**: DICOM 픽셀 데이터 태그(7FE0,0010)에서 복셀 데이터 추출
- **Independent Test**: 알려진 픽셀 값을 가진 파일의 voxelData 길이 및 샘플 값 검증

- [ ] **T011** 🔀 [US4] parsePixelData() 및 skipToPixelData() 구현
  - 파일: `src/data-layer/DICOMParser.ts`
  - 완료 조건: 픽셀 데이터 태그(7FE0,0010) 탐색 및 오프셋 계산. BitsAllocated(8/16/32)에 따른 타입 매핑(Uint8Array, Int16Array/Uint16Array, Float32Array). 파일 크기가 예상 픽셀 데이터보다 작은 경우 오류 반환 (EC-006). Photometric Interpretation이 MONOCHROME1/2가 아닌 경우 경고 (EC-004). 단위 테스트 통과

- [ ] **T012** 🔒 [US4] 픽셀 데이터 파싱 단위 테스트 작성
  - 파일: `src/__tests__/parsePixelData.test.ts`
  - 완료 조건: 8-bit, 16-bit, 32-bit 각각에 대한 파싱 검증. 픽셀 데이터 태그 누락 시 오류 검증. 파일 크기 불일치 오류 검증. 테스트 커버리지 90% 이상, 전체 PASS (EC-003, EC-004, EC-006)

---

## Phase 6: User Story 1 — 전체 파싱 통합 (Priority: P1)

- **Goal**: parseDICOM() 메서드가 모든 하위 단계를 순차 실행하여 ParseResult 반환
- **Independent Test**: 유효한 DICOM 파일의 전체 파싱 결과 검증

- [ ] **T013** 🔒 [US1] parseDICOM() 통합 메서드 구현
  - 파일: `src/data-layer/DICOMParser.ts`
  - 완료 조건: FileReader로 File -> ArrayBuffer 변환. validateMagicByte -> validateTransferSyntax -> parseMetadata -> parsePixelData 순차 호출. 모든 오류 누적 후 ParseResult 반환. 타임아웃 메커니즘(30초) 적용. isValid 필드 자동 계산. 단위 테스트 통과

- [ ] **T014** 🔒 [US1] 통합 테스트 및 엣지 케이스 검증
  - 파일: `src/__tests__/DICOMParser.test.ts`, `src/__tests__/fixtures/`
  - 완료 조건: 정상 파일(16-bit, 8-bit) 전체 파싱 검증. 손상 파일(EC-002) 부분 파싱 및 오류 검증. 빈 파일(EC-001) 즉시 거부 검증. 타임아웃 동작 검증. 전체 테스트 PASS

---

## Phase 7: User Story 5 — 오류 처리 강화 (Priority: P2)

- **Goal**: 파싱 오류 발생 시 구조화된 오류 메시지와 타임아웃 처리 보장
- **Independent Test**: 다양한 오류 유형에 대한 handleParseError 및 타임아웃 동작 검증

- [ ] **T015** 🔀 [US5] 오류 처리 강화 및 타임아웃 메커니즘 고도화
  - 파일: `src/data-layer/DICOMParser.ts`
  - 완료 조건: handleParseError 오류 분류 체계 검증. 타임아웃(30초) 메커니즘 동작 확인. 부분 파싱 결과(메타데이터만 유효) 지원. 단위 테스트 통과

- [ ] **T016** 🔒 [US5] 오류 처리 단위 테스트 작성
  - 파일: `src/__tests__/DICOMParser.test.ts` (오류 처리 섹션 추가)
  - 완료 조건: 치명적/경고/정보 오류 분류 검증. 타임아웃 동작 검증. 바이트 오더 판별 불가 시 기본값 적용 검증. 전체 PASS

---

## Phase N: Integration & Finalization

- [ ] **T-INT-01** 🔒 DataValidator 연동 검증 및 통합 테스트 실행
  - 완료 조건: DataValidator.validateHeader(), validatePixelSpacing(), validateVoxelRange(), validateImageOrientation() 연동 확인. 모든 Acceptance Scenario PASS. SRS 추적성(FR-1.1~1.5, FR-7.2) 매핑 확인

- [ ] **T-INT-02** 🔒 코드 리뷰 및 문서 정리
  - 완료 조건: 코드 리뷰 승인. HAZ-1.1, HAZ-5.2 위험 완화 조치 구현 확인. SDS 섹션 3.1과 구현 코드 일치성 확인

---

## Dependencies & Execution Order

```
T001 → T002 → T003 → T004
                         ↓
              T005, T006 (🔀 병렬) → T007
              T008, T009 (🔀 병렬) → T010
              T011 (🔀 병렬)       → T012
                                      ↓
                              T013 → T014
                                      ↓
                              T015 → T016
                                      ↓
                              T-INT-01 → T-INT-02
```

## Estimated Effort

| Phase        | 태스크 수 | 예상 소요 시간 |
| ------------ | --------- | -------------- |
| Setup        | 2         | 3시간          |
| Foundational | 2         | 4시간          |
| US2 (검증)   | 3         | 4시간          |
| US3 (메타)   | 3         | 5시간          |
| US4 (픽셀)   | 2         | 4시간          |
| US1 (통합)   | 2         | 4시간          |
| US5 (오류)   | 2         | 3시간          |
| Integration  | 2         | 3시간          |
| **합계**     | **18**    | **30시간**     |
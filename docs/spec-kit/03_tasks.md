# Tasks: parsePixelData() - 픽셀데이터 추출

**Input**: `docs/spec-kit/01_spec.md`, `docs/spec-kit/02_plan.md`
**Ticket**: `PLAYG-1829` | **Date**: 2026-04-30

> **형식 안내**
> - `[ID]` : 태스크 번호 (T001, T002, ...)
> - `[P]` : 병렬 실행 가능 여부 표시 (🔀 병렬 가능 / 🔒 순서 필수)
> - `[Story]` : 관련 사용자 스토리 (US1, US2, ...)
> - 각 태스크는 **2시간 이내** 완료 가능한 단위로 분할

---

## Phase 1: Setup (공통 인프라)

- [ ] **T001** 🔒 pixelDataParser.js 모듈 파일 생성 및 import 구조 설정
  - 파일: `viewer/src/data/dicomParser/pixelDataParser.js`
  - 완료 조건: 파일 생성 완료, constants.js에서 ERROR_CODES/MAX_FILE_SIZE, CBVError.js에서 ParseError import 구문 작성

- [ ] **T002** 🔒 기존 constants.js에 픽셀 데이터 관련 에러 코드 확인/추가
  - 파일: `viewer/src/data/dicomParser/constants.js`
  - 완료 조건: PARSE_ERR_PIXEL_DATA_EXTRACTION, PARSE_ERR_FILE_TOO_LARGE, PARSE_WARN_PIXEL_LENGTH_MISMATCH 에러 코드가 constants.js에 정의되어 있음을 확인하거나 추가

---

## Phase 2: Foundational (선행 필수 항목)

- [ ] **T003** 🔒 findPixelDataTag() 태그 탐색 함수 구현
  - 파일: `viewer/src/data/dicomParser/pixelDataParser.js`
  - 완료 조건: DataView와 bufferLength를 입력받아 오프셋 132부터 2바이트 간격으로 Little Endian group=0x7FE0, element=0x0010 매칭. 성공 시 오프셋 반환, 실패 시 -1 반환. export 함수로 정의.

---

## Phase 3: User Story 1 — DICOM 버퍼에서 복셀 데이터 추출 (Priority: P1) 🎯 MVP

- **Goal**: parsePixelData() 6단계 파이프라인 구현
- **Independent Test**: 유효한 DICOM 버퍼와 메타데이터 전달 시 올바른 voxelData ArrayBuffer 반환

- [ ] **T004** 🔀 [US1] Step 1-2: 입력 검증 및 오프셋 결정 로직 구현
  - 파일: `viewer/src/data/dicomParser/pixelDataParser.js`
  - 완료 조건: buffer null 체크, MAX_FILE_SIZE 초과 검증, pixelDataOffset 우선 사용 또는 findPixelDataTag() 폴백, 오프셋 범위 검증(resolvedOffset < 0 또는 >= byteLength 시 throw)

- [ ] **T005** 🔀 [US1] Step 3-6: 예상 길이 계산, 실제 길이 검증, 데이터 추출, 결과 반환 구현
  - 파일: `viewer/src/data/dicomParser/pixelDataParser.js`
  - 완료 조건: expectedLength(rows*columns*bytesPerPixel*samplesPerPixel) 계산, resolvedLength와 비교하여 불일치 시 PARSE_WARN_PIXEL_LENGTH_MISMATCH 경고 추가, buffer.slice() 안전 추출(Math.min 클램핑), {voxelData, warnings} 객체 반환

- [ ] **T006** 🔒 [US1] TC-3.10.1 정상 픽셀 데이터 추출 단위 테스트 작성
  - 파일: `viewer/tests/unit.test.js`
  - 완료 조건: 올바른 오프셋/길이 전달 시 voxelData 반환 검증, offset/length 생략 시 findPixelDataTag() 폴백 동작 검증, 길이 일치 시 warnings 빈 배열 검증

---

## Phase 4: User Story 2 — 버퍼 null 및 파일 크기 초과 입력 검증 (Priority: P1) 🎯 MVP

- **Goal**: null 버퍼 및 512MB 초과 버퍼 입력 시 ParseError throw
- **Independent Test**: null/초과 버퍼 입력 시 에러 코드 검증

- [ ] **T007** 🔀 [US2] TC-3.10.2 null 버퍼 에러 단위 테스트 작성
  - 파일: `viewer/tests/unit.test.js`
  - 완료 조건: buffer=null 시 PARSE_ERR_PIXEL_DATA_EXTRACTION 에러 코드로 ParseError throw 검증

- [ ] **T008** 🔀 [US2] TC-3.10.3 파일 크기 초과 에러 단위 테스트 작성
  - 파일: `viewer/tests/unit.test.js`
  - 완료 조건: buffer.byteLength > MAX_FILE_SIZE(512MB) 시 PARSE_ERR_FILE_TOO_LARGE 에러 코드로 ParseError throw 검증

---

## Phase 5: User Story 3 — 픽셀 데이터 태그 미발견 및 오프셋 범위 보호 (Priority: P1) 🎯 MVP

- **Goal**: findPixelDataTag() 실패 및 잘못된 오프셋 시 ParseError throw
- **Independent Test**: 태그 미포함 버퍼 및 음수 오프셋 입력 시 에러 검증

- [ ] **T009** 🔀 [US3] TC-3.10.4 픽셀 태그 미발견 에러 단위 테스트 작성
  - 파일: `viewer/tests/unit.test.js`
  - 완료 조건: 유효하지 않은 버퍼에서 Tag(7FE0,0010) 미발견 시 PARSE_ERR_PIXEL_DATA_EXTRACTION throw 검증

- [ ] **T010** 🔀 [US3] 오프셋 범위 보호 엣지 케이스 테스트 작성
  - 파일: `viewer/tests/unit.test.js`
  - 완료 조건: resolvedOffset 음수/byteLength 이상 시 PARSE_ERR_PIXEL_DATA_EXTRACTION throw 검증, EC-001 metadata 필드 누락 시 NaN 방지 검증

---

## Phase 6: User Story 4 — 예상/실제 길이 불일치 경고 보고 (Priority: P2)

- **Goal**: 길이 불일치 시 PARSE_WARN_PIXEL_LENGTH_MISMATCH 경고 발생
- **Independent Test**: 의도적 길이 불일치 버퍼에서 warnings 배열 검증

- [ ] **T011** 🔀 [US4] TC-3.10.5 길이 불일치 경고 단위 테스트 작성
  - 파일: `viewer/tests/unit.test.js`
  - 완료 조건: expectedLength !== resolvedLength 시 warnings 배열에 code=PARSE_WARN_PIXEL_LENGTH_MISMATCH 항목 포함 검증

---

## Phase 7: User Story 5 — findPixelDataTag() 태그 탐색 (Priority: P1) 🎯 MVP

- **Goal**: findPixelDataTag() 정확한 태그 오프셋 탐색
- **Independent Test**: 태그 포함/미포함 버퍼에서 반환값 검증

- [ ] **T012** 🔀 [US5] findPixelDataTag() 단위 테스트 작성
  - 파일: `viewer/tests/unit.test.js`
  - 완료 조건: 올바른 태그 오프셋 반환 검증, 태그 미포함 시 -1 반환 검증, 오프셋 132부터 순회 시작 검증, 2바이트 간격 순회 검증

---

## Phase 8: Integration & Finalization

- [ ] **T-INT-01** 🔒 기존 251개 테스트 회귀 검증 및 전체 빌드 실행
  - 완료 조건: npm test 전체 PASS, 기존 테스트 회귀 없음

- [ ] **T-INT-02** 🔒 parseDICOM.js 파이프라인 연동 (Step 6)
  - 파일: `viewer/src/data/dicomParser.js`
  - 완료 조건: parsePixelData() import 및 Step 6 호출 코드 연동

- [ ] **T-INT-03** 🔒 docs/summary.md 작성 및 git commit/push
  - 완료 조건: 원격 브랜치 push 완료

---

## Dependencies & Execution Order

```
T001 → T002 → T003
                   ↓
         T004, T005 (🔀 병렬) → T006
         T007, T008 (🔀 병렬)
         T009, T010 (🔀 병렬)
         T011 (🔀 병렬)
         T012 (🔀 병렬)
                              ↓
                    T-INT-01 → T-INT-02 → T-INT-03
```

## Estimated Effort

| Phase        | 태스크 수 | 예상 소요 시간 |
| ------------ | --------- | -------------- |
| Setup        | 2         | 0.5h           |
| Foundational | 1         | 1h             |
| US1 (MVP)    | 3         | 2h             |
| US2 (MVP)    | 2         | 0.5h           |
| US3 (MVP)    | 2         | 0.5h           |
| US4          | 1         | 0.5h           |
| US5 (MVP)    | 1         | 0.5h           |
| Integration  | 3         | 1h             |
| **합계**     | **15**    | **6.5h**       |

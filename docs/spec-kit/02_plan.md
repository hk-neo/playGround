# Implementation Plan: parseMetadata() - DICOM 데이터셋 전체 메타데이터 파싱

**Branch**: `feature/PLAYG-1828-parse-metadata` | **Date**: 2026-04-29 | **Spec**: `docs/spec-kit/01_spec.md`
**Ticket**: `PLAYG-1828` | **Type**: Detailed Design (SDS-3.9)

---

## Summary

DICOM 파일의 ArrayBuffer를 입력받아 15개 메타데이터 필드를 추출하는 `parseMetadata()` 함수의 구현 계획이다.
이 함수는 DICOM 데이터셋 태그를 순차 파싱하며, 필수 태그 누락 검증(FR-1.3), 무한 루프 방지(MAX_TAG_COUNT=10000, HAZ-5.1),
버퍼 초과 읽기 방지(HAZ-5.3), 픽셀 데이터 그룹(0x7FE0) 조기 종료 최적화, PHI 자동 마스킹(HAZ-3.1)을 수행한다.
9단계 파싱 절차(버퍼 검증 -> preParsedMeta 재사용 -> 컨텍스트 생성 -> while 순회 -> 필수 검증 -> 기본값 -> 객체 생성 -> PHI 마스킹 -> 반환)를 통해
IEC 62304 Class A 안전 등급 요구사항을 충족하는 구조화된 결과를 반환한다.

---

## Technical Context

| 항목 | 내용 |
| --- | --- |
| **Language/Version** | JavaScript (ES2020+), Vanilla JS, 외부 프레임워크 없음 |
| **Primary Dependencies** | metaGroupParser, ParseContext, tagReader, phiGuard, DICOMMetadata, constants, dicomDictionary, CBVError (모두 내부 모듈) |
| **Storage** | 인메모리 전용 (ArrayBuffer/DataView), 네트워크 통신 없음 |
| **Testing** | Jest 단위 테스트 (90% 이상 커버리지 목표) |
| **Target Platform** | 모던 브라우저 (Chrome, Firefox, Edge), 로컬 파일 전용 |
| **Performance Goals** | 픽셀 데이터 그룹 도달 시 조기 종료로 불필요한 태그 순회 방지 |
| **Constraints** | IEC 62304 Class A, 오프라인 전용, CSP connect-src none, 외부 라이브러리 금지 |

---

## Constitution Check
*GATE: 설계 원칙(Constitution) 준수 여부 확인*

- **SOLID 원칙**: SRP 준수 - parseMetadata()는 메타데이터 추출 단일 책임 수행. 버퍼 읽기는 tagReader, 메타 그룹 파싱은 metaGroupParser, PHI 마스킹은 phiGuard에 위임하여 책임 분리.
- **레이어 분리**: Business Logic Layer(COMP-1.3)에 위치. Data Access Layer에만 의존하고 Presentation Layer에 의존하지 않음. 하위 모듈 호출은 단방향(상향) 제한 준수.
- **에러 처리 전략**: CBVError.ParseError 기반 구조화된 에러 코드 체계(PARSE_ERR_UNEXPECTED, PARSE_ERR_MISSING_REQUIRED_TAG, PARSE_WARN_OPTIONAL_TAG_MISSING). readTag() 예외는 호출자 전파 없이 컨텍스트 기록 후 안전 break.
- **보안 고려사항**: PHI 필드(patientName, patientID, patientBirthDate)는 maskPhiFields()로 [REDACTED] 마스킹. 원본은 WeakMap에만 저장하여 GC 대상화. 반환 객체에는 마스킹된 값만 포함.

---## Project Structure

### Documentation
```text
docs/
+-- spec-kit/
|   +-- 01_spec.md          # parseMetadata() 기능 명세서
|   +-- 02_plan.md          # 본 문서 - 구현 계획
|   +-- 03_tasks.md         # 작업 분해 구조
+-- artifacts/
    +-- SDS.md              # 소프트웨어 상세 설계서
    +-- SAD.md              # 소프트웨어 아키텍처 명세서
    +-- SRS.md              # 소프트웨어 요구사항 명세서
```

### Source Code
```text
viewer/src/
+-- components/
|   +-- metadataParser.js      # [수정] parseMetadata() 메인 구현
|   +-- metaGroupParser.js     # [의존] parseMetaGroup() - SDS-3.8
|   +-- tagReader.js           # [의존] readTag() - SDS-3.5, readTagValue() - SDS-3.6
|   +-- phiGuard.js            # [의존] maskPhiFields() - SDS-3.13
+-- data/
|   +-- dicomParser.js         # [호출자] parseDICOM()에서 parseMetadata() 호출
|   +-- dicomMetadata.js       # [의존] createDICOMMetadata() - SDS-3.10
|   +-- parseContext.js        # [의존] createParseContext() - SDS-3.4
+-- constants/
|   +-- index.js               # [의존] METADATA_TAGS, MAX_TAG_COUNT 등 상수
+-- errors/
    +-- CBVError.js            # [의존] ParseError 커스텀 에러 클래스

viewer/tests/
+-- unit/
|   +-- parseMetadata.test.js  # [신규] parseMetadata() 단위 테스트
|   +-- fixtures/              # 테스트용 DICOM 버퍼 픽스처
|       +-- validBuffer.js     # 유효한 DICOM 버퍼 생성 헬퍼
|       +-- missingRequired.js # 필수 태그 누락 버퍼
|       +-- oversizedBuffer.js # MAX_TAG_COUNT 초과 버퍼
+-- integration/
    +-- dicomParser.test.js    # [기존] 회귀 테스트
```

---## Implementation Approach

### Phase 순서 및 접근 방식

#### Phase 1: 상수 및 타입 정의 확인 (Setup)

- METADATA_TAGS 사전에 15개 필드(태그키, 필드명, 필수 여부, 기본값)가 올바르게 정의되어 있는지 확인
- MAX_TAG_COUNT(10000), PIXEL_DATA_GROUP(0x7FE0), DICOM_MIN_FILE_SIZE(132) 상수가 constants/index.js에 존재하는지 검증
- CBVError.ParseError 에러 코드(PARSE_ERR_UNEXPECTED, PARSE_ERR_MISSING_REQUIRED_TAG, PARSE_WARN_OPTIONAL_TAG_MISSING)가 정의되어 있는지 확인
- 누락된 상수/에러 코드가 있으면 이 단계에서 보강

#### Phase 2: parseMetadata() 코어 구현 (Core Implementation)

**9단계 파싱 절차를 순차 구현:**

**Step 1 - 버퍼 크기 검증**
- null/undefined 및 byteLength < 132 체크 (EC-001, EC-002)
- 검증 실패 시 즉시 ParseError(PARSE_ERR_UNEXPECTED) throw

**Step 2 - preParsedMeta 재사용 또는 parseMetaGroup() 호출**
- preParsedMeta에 transferSyntaxUID가 있으면 재파싱 생략 (FR-003)
- 누락 시 parseMetaGroup(buffer) 호출하여 transferSyntaxUID와 metaEndOffset 획득 (FR-004, EC-003)

**Step 3 - createParseContext()로 파싱 컨텍스트 생성**
- createParseContext(buffer, transferSyntaxUID, metaEndOffset) 호출
- 전송 구문에 따라 바이트 오더(Little/Big Endian) 및 VR 모드(Explicit/Implicit) 자동 설정 (FR-005)

**Step 4 - while 루프 태그 순회 (핵심 로직)**
- 루프 조건: ctx.hasRemaining(4) && tagCount < MAX_TAG_COUNT (NFR-001, NFR-002)
- readTag(ctx) 호출을 try-catch로 감싸고 예외 시 에러 기록 후 break (NFR-005, EC-005)
- 픽셀 데이터 그룹(0x7FE0) 도달 시 pixelDataOffset/pixelDataLength 캐시 후 break (NFR-003)
- METADATA_TAGS 사전으로 makeTagKey(group, element) 매칭하여 collected 객체에 값 저장 (FR-006, FR-007)
- tagCount 정확히 MAX_TAG_COUNT 도달 시 정상 종료 (EC-006)

**Step 5 - 필수 태그 누락 검사**
- rows, columns, bitsAllocated, pixelRepresentation 누락 감지 (FR-008, FR-1.3, HAZ-1.3)
- 파싱 중단하지 않고 PARSE_ERR_MISSING_REQUIRED_TAG 에러만 기록 (EC-004)

**Step 6 - 선택 태그 기본값 처리**
- bitsStored=16, windowCenter=40, windowWidth=400, sliceThickness=0, pixelSpacing=[1,1],
  photometricInterpretation=MONOCHROME2, samplesPerPixel=1 적용 (FR-009)
- 누락 시 PARSE_WARN_OPTIONAL_TAG_MISSING 경고 기록
- pixelSpacing 단일 값 처리 (EC-007)

**Step 7 - createDICOMMetadata()로 25개 필드 객체 생성**
- 팩토리 함수에서 highBit = bitsAllocated - 1 자동 계산 (FR-010)
- collected에 없는 필드는 팩토리 내부 기본값 처리

**Step 8 - maskPhiFields() PHI 마스킹**
- patientName, patientID, patientBirthDate를 [REDACTED]로 마스킹 (FR-011, FR-4.1, HAZ-3.1)
- 원본 값은 phiGuard 모듈의 WeakMap에 안전 저장 (NFR-004)

**Step 9 - 결과 반환**
- { metadata, context: ctx, errors: ctx.errors, transferSyntaxUID, _pixelDataOffset, _pixelDataLength } 반환 (FR-012)

#### Phase 3: 단위 테스트 (Testing)

- 정상 케이스: 유효한 DICOM 버퍼에서 15개 필드 전체 추출 검증
- preParsedMeta 재사용: 메타 그룹 재파싱 방지 확인
- 필수 태그 누락: 4개 필수 태그 각각 누락 시 PARSE_ERR_MISSING_REQUIRED_TAG 확인
- 선택 태그 누락: 기본값 적용 및 PARSE_WARN_OPTIONAL_TAG_MISSING 경고 확인
- 무한 루프 방지: MAX_TAG_COUNT 초과 시 강제 종료 확인
- 버퍼 경계: hasRemaining(4) false 시 자연 종료 확인
- readTag() 예외: 에러 기록 후 안전 break 확인
- 픽셀 데이터 그룹: 0x7FE0 도달 시 조기 종료 및 오프셋/길이 캐시 확인
- PHI 마스킹: patientName, patientID가 [REDACTED]로 치환 확인
- 엣지 케이스: EC-001 ~ EC-008 전체 시나리오 검증

#### Phase 4: 통합 및 회귀 (Integration)

- 기존 dicomParser.test.js 통합 테스트 통과 확인
- parseDICOM() -> parseMetadata() 호출 체인 정상 동작 검증
- 전체 파싱 파이프라인 회귀 없음 확인

### Key Technical Decisions

- **결정 1: while 루프 조건에 hasRemaining(4)와 tagCount < MAX_TAG_COUNT를 결합**
  이유: 버퍼 초과 읽기(HAZ-5.3)와 무한 루프(HAZ-5.1)를 단일 루프 조건으로 동시 방지. 두 안전 장치가 독립적으로 작동하여 하나가 실패해도 다른 하나가 보호한다.

- **결정 2: readTag() 호출을 try-catch로 감싸고 예외 발생 시 break**
  이유: 손상된 태그(EC-005)에서 예외가 발생해도 호출자로 전파하지 않고 수집된 메타데이터를 보존. NFR-005 예외 안전성 요구사항 충족.

- **결정 3: 픽셀 데이터 그룹(0x7FE0) 도달 시 즉시 break**
  이유: 메타데이터는 항상 픽셀 데이터 이전에 위치하므로 0x7FE0 이후 순회는 불필요. 대용량 DICOM 파일에서 유의미한 파싱 시간 단축.

- **결정 4: 필수 태그 누락 시 파싱 중단하지 않고 에러만 기록**
  이유: 부분 손상 파일에서도 최대한 메타데이터를 추출하여 사용자에게 유의미한 피드백 제공. 누락 필수 태그는 errors 배열로 명확 보고.

- **결정 5: PHI 마스킹을 반환 직전(Step 8)에 수행**
  이유: 파싱 로직에서는 원본 값을 자유롭게 사용하고 최종 반환 시점에만 마스킹하여 로직 복잡도를 낮춤.

- **결정 6: collected 객체를 중간 저장소로 사용**
  이유: while 루프에서 임시 저장 후 검증-보정-생성 단계를 명확 분리. createDICOMMetadata()에 검증 완료된 데이터만 전달.

---## Complexity Tracking

### C-01: METADATA_TAGS 사전 기반 선언적 필드 매핑
- **복잡도 이유**: 15개 필드의 태그키, 필드명, 필수 여부, 기본값을 상수 사전으로 관리하여 while 루프 내 하드코딩을 제거. 새 필드 추가 시 상수만 수정하면 되므로 OCP 준수.
- **정당성**: if/switch 하드코딩(약 15개 분기) 대비 사전 조회 O(1) 방식이 가독성과 유지보수성에서 우위.

### C-02: while 루프 내 다중 종료 조건
- **복잡도 이유**: 루프 종료 조건이 hasRemaining(4), tagCount < MAX_TAG_COUNT, group >= PIXEL_DATA_GROUP, readTag() 예외의 4가지 경로로 존재.
- **정당성**: 각 종료 조건은 서로 다른 안전 요구사항(HAZ-5.3, HAZ-5.1, NFR-003, NFR-005)에 대응하므로 단일 조건으로 통합 불가. 주석으로 각 break 지점의 이유를 명시.

### C-03: preParsedMeta 선택적 재사용
- **복잡도 이유**: preParsedMeta 유무에 따라 parseMetaGroup() 호출 여부가 결정되는 조건부 로직.
- **정당성**: DicomParser.parseDICOM()에서 메타 그룹을 이미 파싱한 경우 중복 파싱을 방지하여 성능 최적화. FR-003 명시적 요구사항.

### C-04: pixelSpacing 단일 값 엣지 케이스 (EC-007)
- **복잡도 이유**: DICOM 표준에서 pixelSpacing은 2개 값이지만 일부 파일은 단일 값만 포함 가능.
- **정당성**: 기본값 [1, 1] 적용으로 처리. 단일 값 감지 시 [value, value] 정규화 로직 추가 여부는 [NEEDS CLARIFICATION] - 구현 시 tagReader 반환 포맷에 따라 결정.

### C-05: tagCount 경계 조건 (EC-006)
- **복잡도 이유**: tagCount < MAX_TAG_COUNT 조건에서 tagCount가 10000에 도달하면 루프 종료. 이는 정상 동작이며 초과 시에만 강제 종료.
- **정당성**: 엄밀한 경계 조건 처리로 off-by-one 오류 방지.

---

## References

- Spec: `docs/spec-kit/01_spec.md`
- 티켓: `PLAYG-1828`
- 아키텍처 문서: `docs/artifacts/SAD.md` (COMP-1.3 MetadataParser)
- 상세 설계서: `docs/artifacts/SDS.md` (SDS-3.3 MetadataParser)
- 요구사항 명세서: `docs/artifacts/SRS.md`
- 위험 관리 보고서: `docs/artifacts/RMR.md` (HAZ-1.3, HAZ-3.1, HAZ-5.1, HAZ-5.3)
- 연관 SDS 항목: SDS-3.4(ParseContext), SDS-3.5/3.6(tagReader), SDS-3.8(metaGroupParser), SDS-3.10(DICOMMetadata), SDS-3.13(phiGuard)
- 추적 FR: FR-2.2, FR-2.3, FR-2.4, FR-2.6, FR-1.3, FR-4.1
- 추적 HAZ: HAZ-1.3, HAZ-3.1, HAZ-5.1, HAZ-5.3
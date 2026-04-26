# Session Context: PLAYG-1817

**티켓**: PLAYG-1817 | **타입**: Detailed Design (SDS-1.2)
**요약**: DICOMMetadata typedef 28개 속성 정의 + createDICOMMetadata() 팩토리 함수
**최종 갱신**: 2026-04-27

---

### 1. 시스템 아키텍처/컨벤션 (유실 절대 금지)

#### 프로젝트 구조
```
viewer/src/
  types/
    DICOMMetadata.js    # [구현 대상] DICOMMetadata typedef + createDICOMMetadata 팩토리
    ParseResult.js      # ParseResult typedef + createParseResult 팩토리 (기존)
  data/dicomParser/
    metadataParser.js   # 메타데이터 파서 (createDICOMMetadata 소비자)
    phiGuard.js         # PHI 마스킹 가드 (DICOMMetadata PHI 필드 소비자)
    ParseContext.js / constants.js / tagReader.js / metaGroupParser.js
    index.js / parseDICOM.js / pixelDataParser.js / handleParseError.js
    validateMagicByte.js / validateTransferSyntax.js
  data/dicomDictionary.js
  errors/CBVError.js
  main.js
viewer/tests/
  setup.js / unit.test.js   # Vitest 3.x 테스트 (TC-1.2.1 ~ TC-1.2.6)
```

#### 기술 스택 & 제약사항
- **언어**: JavaScript ES2020+, ESM (import/export)
- **테스트**: Vitest 3.x (`viewer/tests/`)
- **빌드**: Vite 5.x
- **표준**: IEC 62304 Class A — class/TypeScript 금지, plain object + JSDoc typedef만 사용
- **DICOM 준수**: PS3.5 VR 매핑, PS3.10 파일 메타 정보 그룹(0002) 태그
- **런타임 외부 의존성**: 0개

#### 아키텍처 결정 사항 (ADR)
- **ADR-1**: Plain Object + JSDoc typedef (class/TypeScript 배제) — IEC 62304 Class A 단순성 요구
- **ADR-2**: Factory Pattern + Object Spread — 호출 시마다 독립 객체 보장, overrides 선언적 커스터마이징
- **ADR-3**: 배열 기본값 인라인 리터럴 생성 — 모듈 스코프 공유 상태 금지 (HAZ-5.1 참조 오염 방지)
- **ADR-4**: 팩토리 내부 유효성 검증 없음 — 검증은 소비자(metadataParser.js) 책임 (SRP)
- **ADR-5**: PHI 보호 로직 미포함 — DICOMMetadata.js는 타입 정의만, 마스킹은 phiGuard.js 담당

#### 레이어 분리 (단방향 의존)
- `types/` 레이어 → 순수 데이터 타입 (DICOMMetadata.js, ParseResult.js)
- `data/dicomParser/` 레이어 → 파싱 로직 + PHI 보호
- 의존성 방향: data 레이어 → types 레이어 (역방향 없음)

#### 핵심 데이터 모델: DICOMMetadata typedef (28개 속성)
| 카테고리 | 속성 | 타입 | 기본값 |
| --- | --- | --- | --- |
| PHI 필드 | patientName, patientID, patientBirthDate | string | '' |
| 검사 정보 | studyDate, studyTime, studyDescription, modality, bodyPartExamined | string | '' |
| 영상 파라미터 | sliceThickness, kvp, xRayTubeCurrent | number | 0 |
| 배열 필드 | pixelSpacing | number[] | [0, 0] |
| 배열 필드 | imageOrientationPatient | number[] | [1, 0, 0, 0, 1, 0] |
| 배열 필드 | imagePositionPatient | number[] | [0, 0, 0] |
| 필수 필드 | rows, columns | number | 0 |
| 필수 필드 | bitsAllocated | number | 16 |
| 필수 필드 | pixelRepresentation | number | 0 |
| 선택 숫자 | numberOfFrames | number | 1 |
| 선택 숫자 | bitsStored | number | 16 |
| 선택 숫자 | highBit | number | 15 |
| 선택 숫자 | windowCenter, windowWidth | number | 0 |
| 식별자 | transferSyntax, studyInstanceUID, seriesInstanceUID, sopInstanceUID | string | '' |

#### createDICOMMetadata(overrides?) 팩토리 함수
- 시그니처: `createDICOMMetadata(overrides?: Partial<DICOMMetadata>) → DICOMMetadata`
- 병합: `{ ...defaults, ...(overrides ?? {}) }` (null/undefined 방어 포함, EC-001)
- 참조 독립성: 배열 기본값은 매 호출 시 새 리터럴 생성 (HAZ-5.1 완화)
- 추가 필드 허용: photometricInterpretation, samplesPerPixel 등 Object Spread로 자연 포함 (FR-007)

---

### 2. 해결 완료된 주요 이슈 및 기술 스택

#### 이번 세션 (!plan) 산출물
- **docs/spec-kit/01_spec.md**: 기능 명세서 (User Story 5개, FR-001~007, NFR-001~004, EC-001~004)
- **docs/spec-kit/02_plan.md**: 구현 계획서 (Phase 4단계, ADR 5개, 복잡도 항목 3개)
- **docs/spec-kit/03_tasks.md**: 작업 분해 (T001~T016 + T-INT-01/02, 총 18개 태스크, 예상 13시간)

#### 검증 기준 (TC-1.2.1 ~ TC-1.2.6)
| TC | 검증 내용 | 추적 |
| --- | --- | --- |
| TC-1.2.1 | 무인자 호출 시 28개 속성 기본값 검증 | FR-001, FR-004 |
| TC-1.2.2 | overrides 전달 시 지정값 반영 + 나머지 기본값 | FR-002 |
| TC-1.2.3 | 배열 필드(pixelSpacing 등) override 정확성 | FR-002 |
| TC-1.2.4 | 연속 호출 시 참조 독립성 (참조 오염 방지) | FR-003, HAZ-5.1 |
| TC-1.2.5 | 필수 필드 기본값 (rows=0, columns=0, bitsAllocated=16, pixelRepresentation=0) | FR-006, HAZ-1.3 |
| TC-1.2.6 | PHI 필드 3개 빈 문자열 기본값 존재 | FR-005, HAZ-3.1 |

#### 위험도 평가 완료
| 항목 | 위험도 | 완화 상태 |
| --- | --- | --- |
| 참조 오염 (HAZ-5.1) | 낮음 | 배열 리터럴 인라인 생성으로 완화 |
| PHI 유출 (HAZ-3.1) | 낮음 | 기본값 빈 문자열 + phiGuard 마스킹 이중 방어 |
| 필수 태그 누락 (HAZ-1.3) | 낮음 | 기본값 제공 + metadataParser에서 검증 |

---

### 3. 미완료 / Next Steps

- **[구현 대기]** T001~T016, T-INT-01/02 전체 태스크 구현 미실행 (!plan 단계까지만 완료)
- **[NEEDS CLARIFICATION]** photometricInterpretation, samplesPerPixel 등 추가 필드를 DICOMMetadata typedef에 공식 포함할지 여부 → metadataParser 리팩토링 시 결정 필요
- **[검증 필요]** constants.js METADATA_TAGS required=true 태그와 DICOMMetadata 기본값 일치성 확인 (T016)
- **[연동 검증]** metadataParser.js, phiGuard.js 연동 동작은 구현 후 통합 테스트에서 검증 예정
- **[커버리지 목표]** DICOMMetadata.js 함수 커버리지 100% 달성 필요
- **[TODO]** 전역 문서(SRS.md, SAD.md 등) 갱신은 이번 세션에서 수행하지 않음 (기존 파일 없음)
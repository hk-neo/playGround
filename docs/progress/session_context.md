# Session Context - PLAYG-1833

## 1. 시스템 아키텍처/컨벤션 (유실 절대 금지)

### 1.1 프로젝트 구조
- **프로젝트**: DICOM 뷰어 (phiGuard.js 포함)
- **안전 등급**: IEC 62304 Class A
- **전체 테스트**: 251개 통과 상태 (기준점)
- **산출물 경로**: docs/spec-kit/01_spec.md, 02_plan.md, 03_tasks.md

### 1.2 핵심 모듈 구조 (phiGuard.js)
- **소스 파일**: viewer/src/data/dicomParser/phiGuard.js
- **주요 클래스/함수**:
  - `maskPhiFields(metadata)`: DICOMMetadata 객체의 PHI 필드(patientName, patientID, patientBirthDate)를 마스킹
  - `dumpPhiValues(metadata)`: WeakMap(phiStore)에서 metadata 객체를 키로 원본 PHI 값 일괄 조회
  - `phiStore`: WeakMap<DICOMMetadata, Object> - 마스킹 전 원본 값을 저장하는 내부 맵
  - `DICOMMetadata`: 메타데이터 결과 객체

### 1.3 dumpPhiValues() 상세 스펙
- **역할**: maskPhiFields()에 의해 마스킹된 DICOMMetadata에서 모든 원본 PHI 값을 일괄 조회하는 내부용/디버그 함수
- **동작**:
  1. WeakMap(phiStore)에서 metadata 객체를 키로 원본 값 객체 획득
  2. 얕은 복사본(shallow copy) 반환
  3. 원본 값이 없으면 빈 객체 `{}` 반환
- **반환 타입**: `Record<string, any>` (원본 PHI 필드명-값 매핑의 얕은 복사본)
- **사용 제약**: 내부용/디버그 전용, 프로덕션 PHI 접근 경로에서는 사용 금지

### 1.4 parseMetadata() 9단계 파싱 절차 (PLAYG-1828)
- **소스 파일**: src/components/metadataParser.js
- **의존 모듈**: metaGroupParser, ParseContext, tagReader, phiGuard, DICOMMetadata, constants, dicomDictionary, CBVError
- **절차**:
  1. metaGroupParser로 메타그룹(0x0002) 파싱 -> transferSyntaxUid 획득
  2. ParseContext 생성 (바이트 오프셋 관리)
  3. DICOMMetadata 객체 초기화
  4. 루프 진입 - MAX_TAG_COUNT(10000) 무한루프 가드
  5. tagReader.readTag()로 현재 태그 읽기 (group, element, vr, length)
  6. 픽셀 데이터 그룹(0x7FE0) 조기 종료 최적화
  7. METADATA_TAGS 사전 기반 15개 필드 매핑
  8. 필수 태그 4개 누락 검증 (rows, columns, bitsAllocated, pixelRepresentation)
  9. phiGuard 적용 - PHI 마스킹
- **METADATA_TAGS 15개 필드**: rows, columns, bitsAllocated, bitsStored, highBit, pixelRepresentation, samplesPerPixel, photometricInterpretation, planarConfiguration, patientName, patientID, patientBirthDate, patientSex, studyInstanceUID, seriesInstanceUID
- **상수**: MAX_TAG_COUNT=10000, MAX_SEQUENCE_DEPTH=10

### 1.5 추적성 매핑
| 추적 ID | 설명 | 관련 모듈 |
|---------|------|----------|
| FR-4.1 | 오류 보고 / PHI 조회 | parseMetadata(), dumpPhiValues() |
| SEC-3 | PHI 접근 제어 | dumpPhiValues() 내부용 제약 |
| HAZ-3.1 | PHI 노출 | phiGuard 마스킹 |
| SAD COMP-3 | phiGuard 컴포넌트 | phiGuard.js |
| FR-2.2 | 데이터셋 태그 순차 파싱 | parseMetadata() Step 4-7 |
| FR-2.3 | 필수/선택 메타데이터 추출 | parseMetadata() Step 7 |
| FR-2.6 | 버퍼 범위 초과 읽기 방지 | MAX_TAG_COUNT |
| HAZ-1.3 | 잘못된 메타데이터로 오진 | 필수태그검증 |
| HAZ-5.1 | 무한루프/과도한 리소스 | MAX_TAG_COUNT |
| HAZ-5.3 | ArrayBuffer 범위 초과 | ParseContext 가드 |

## 2. 해결 완료된 주요 이슈 및 기술 스택

### 2.1 PLAYG-1827 (이전)
- constants.js ERROR_MESSAGES 구문 오류 수정 (}); 누락 -> }); 수정)
- readTagValue() T1-T7 보강: VR별 hasRemaining() 가드, DS/IS 다중값 배열, try-catch offset 무결성
- 251개 테스트 전체 통과

### 2.2 PLAYG-1828 [SDS-3.9] parseMetadata() 상세 설계
- 21개 태스크 도출, !plan 완료

### 2.3 PLAYG-1833 [SDS-3.14] dumpPhiValues() PHI 일괄조회(내부용) 상세 설계
- 01_spec.md / 02_plan.md / 03_tasks.md 신규 작성 완료
- !plan 완료 상태

## 3. 미완료 / Next Steps
- [ ] PLAYG-1828: parseMetadata() 21개 태스크 !implement 실행
- [ ] PLAYG-1828: src/components/metadataParser.js 실제 구현
- [ ] PLAYG-1833: dumpPhiValues() 태스크 !implement 실행
- [ ] PLAYG-1833: viewer/src/data/dicomParser/phiGuard.js dumpPhiValues() 실제 구현
- [ ] 메타데이터 파싱 / PHI 관련 단위 테스트 작성 및 통과
- [ ] 전체 빌드 및 기존 251개 테스트 회귀 검증
- [ ] Jira 완료 댓글 게시

---
_최종 갱신: 2026-05-04 | PLAYG-1833 !plan 완료 상태_
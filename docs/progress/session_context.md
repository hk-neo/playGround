# Session Context - PLAYG-1828

## 1. 시스템 아키텍처/컨벤션 (유실 절대 금지)

### 1.1 프로젝트 구조
- **티켓**: PLAYG-1828 [SDS-3.9] parseMetadata() - DICOM 데이터셋 전체 메타데이터 파싱 상세 설계
- **경로**: task (Detailed Design)
- **안전 등급**: IEC 62304 Class A
- **산출물 경로**: docs/spec-kit/01_spec.md, 02_plan.md, 03_tasks.md (21개 태스크)
- **상태**: !plan 완료

### 1.2 핵심 모듈 구조
- **대상 모듈**: src/components/metadataParser.js (parseMetadata 구현)
- **의존 모듈**:
  - metaGroupParser: 메타그룹(0x0002) 선 파싱
  - ParseContext: 바이트 버퍼 읽기 컨텍스트 (readUint16/readUint32/readString/advance/hasRemaining)
  - tagReader: 개별 태그 읽기 (readTagValue - VR별 파싱)
  - phiGuard: PHI 마스킹 처리
  - DICOMMetadata: 메타데이터 결과 객체
  - constants: MAX_TAG_COUNT(10000), MAX_SEQUENCE_DEPTH(10) 등 상수
  - dicomDictionary: EXTENDED_LENGTH_VR, makeTagKey(), lookupVR()
  - CBVError: 에러 객체 생성

### 1.3 parseMetadata() 9단계 파싱 절차
1. metaGroupParser로 메타그룹(0x0002) 파싱 -> transferSyntaxUid 획득
2. ParseContext 생성 (바이트 오프셋 관리)
3. DICOMMetadata 객체 초기화
4. 루프 진입 - MAX_TAG_COUNT(10000) 무한루프 가드
5. tagReader.readTag()로 현재 태그 읽기 (group, element, vr, length)
6. 픽셀 데이터 그룹(0x7FE0) 조기 종료 최적화
7. METADATA_TAGS 사전 기반 15개 필드 매핑
8. 필수 태그 4개 누락 검증 (rows, columns, bitsAllocated, pixelRepresentation)
9. phiGuard 적용 - PHI 마스킹 (patientName, patientID, patientBirthDate)

### 1.4 METADATA_TAGS 사전 (15개 필드)
- rows, columns, bitsAllocated, bitsStored, highBit, pixelRepresentation
- samplesPerPixel, photometricInterpretation, planarConfiguration
- patientName, patientID, patientBirthDate, patientSex
- studyInstanceUID, seriesInstanceUID

### 1.5 추적성 매핑
| 추적 ID | 설명 | 관련 단계 |
|---------|------|----------|
| FR-2.2 | 데이터셋 태그 순차 파싱 | Step 4-7 |
| FR-2.3 | 필수/선택 메타데이터 추출 | Step 7 |
| FR-2.4 | 메타데이터 구조화 반환 | Step 8-9 |
| FR-2.6 | 버퍼 범위 초과 읽기 방지 | Step 4 (MAX_TAG_COUNT) |
| FR-1.3 | DICOM 파싱 기능 | Step 1-9 전체 |
| FR-4.1 | 오류 보고 | Step 8 검증 |
| HAZ-1.3 | 잘못된 메타데이터로 오진 | Step 8 필수태그검증 |
| HAZ-3.1 | PHI 노출 | Step 9 phiGuard |
| HAZ-5.1 | 무한루프/과도한 리소스 | Step 4 MAX_TAG_COUNT |
| HAZ-5.3 | ArrayBuffer 범위 초과 | ParseContext 가드 |

## 2. 해결 완료된 주요 이슈 및 기술 스택

### 2.1 이전 세션 (PLAYG-1827) 완료 내역
- constants.js ERROR_MESSAGES 구문 오류 수정 (}); 누락 -> }); 수정)
- readTagValue() T1-T7 보강: VR별 hasRemaining() 가드, DS/IS 다중값 배열, try-catch offset 무결성
- 251개 테스트 전체 통과, 전체 빌드 성공

### 2.2 현재 세션 (PLAYG-1828) 완료 내역
- [x] SDS-3.9 parseMetadata() 상세 설계 21개 태스크 도출
- [x] 01_spec.md / 02_plan.md / 03_tasks.md 산출물 작성 완료
- [x] !plan 완료 상태

## 3. 미완료 / Next Steps
- [ ] 21개 태스크에 대한 !implement 실행 필요
- [ ] parseMetadata() 소스코드 실제 구현 (src/components/metadataParser.js)
- [ ] 메타데이터 파싱 단위 테스트 작성 및 통과
- [ ] 전체 빌드 및 기존 251개 테스트 회귀 검증
- [ ] Jira 완료 댓글 게시

---
_최종 갱신: 2026-04-29 | !plan 완료 상태_
# Session Context - PLAYG-1829

## 1. 시스템 아키텍처/컨벤션 (유실 절대 금지)

### 1.1 프로젝트 구조
- **티켓**: PLAYG-1829 [SDS-3.10] parsePixelData() 픽셀데이터 추출 상세 설계
- **경로**: task (Detailed Design)
- **안전 등급**: IEC 62304 Class A
- **산출물 경로**: docs/spec-kit/01_spec.md, 02_plan.md, 03_tasks.md (15개 태스크)
- **상태**: !plan 완료

### 1.2 핵심 모듈 구조
- **대상 모듈**: viewer/src/data/dicomParser/pixelDataParser.js
- **의존 모듈**:
  - constants.js: ERROR_CODES, MAX_FILE_SIZE(512MB)
  - CBVError.js: ParseError 커스텀 에러
  - dicomDictionary.js: makeTagKey()
- **소비 모듈**: parseDICOM.js (Step 6)

### 1.3 Export 함수
- parsePixelData(buffer, metadata, pixelDataOffset?, pixelDataLength?) => {voxelData, warnings}
  - 6단계: 입력 검증 -> 오프셋 결정 -> 예상 길이 계산 -> 실제 길이 검증 -> 데이터 추출 -> 결과 반환
- findPixelDataTag(view, bufferLength) => number
  - 오프셋 132부터 2바이트 간격, Little Endian, group=0x7FE0/element=0x0010 매칭

### 1.4 에러 코드
- PARSE_ERR_PIXEL_DATA_EXTRACTION: null 버퍼, 태그 미발견, 오프셋 범위 초과
- PARSE_ERR_FILE_TOO_LARGE: 512MB 초과
- PARSE_WARN_PIXEL_LENGTH_MISMATCH: 예상/실제 길이 불일치 (경고)

### 1.5 추적성 매핑
| 추적 ID | 설명 |
|---------|------|
| FR-1.4 | 픽셀 데이터 태그 탐색 및 복셀 데이터 추출 |
| FR-1.5 | 오프셋/길이 검증 및 불일치 경고 |
| FR-2.4 | ArrayBuffer 형태 복셀 데이터 제공 |
| FR-4.5 | 구조화된 에러 throw |
| FR-5.1 | 길이 불일치 경고 반환 |
| FR-5.2 | 경고 객체 구조 (code/message/severity) |

## 2. 이전 세션 컨텍스트

### 2.1 PLAYG-1828 (parseMetadata) 완료 내역
- SDS-3.9 parseMetadata() 상세 설계 21개 태스크 도출
- 01_spec.md / 02_plan.md / 03_tasks.md 산출물 작성 완료

### 2.2 현재 세션 (PLAYG-1829) 완료 내역
- [x] SDS-3.10 parsePixelData() 상세 설계 15개 태스크 도출
- [x] 01_spec.md / 02_plan.md / 03_tasks.md 산출물 작성 완료 (PLAYG-1828용에서 전면 갱신)
- [x] !plan 완료 상태

## 3. 미완료 / Next Steps
- [ ] 15개 태스크에 대한 !implement 실행 필요
- [ ] pixelDataParser.js 소스코드 실제 구현
- [ ] TC-3.10.1~TC-3.10.5 단위 테스트 작성 및 통과
- [ ] 전체 빌드 및 기존 251개 테스트 회귀 검증
- [ ] Jira 완료 댓글 게시

---
_최종 갱신: 2026-04-30 | !plan 완료 상태_
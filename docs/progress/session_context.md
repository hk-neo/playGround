# Session Context - PLAYG-1824

## 1. 시스템 아키텍처/컨벤션 (유실 절대 금지)

### 1.1 프로젝트 구조
- **티켓**: PLAYG-1824 [SDS-3.5] readTag() DICOM 태그 읽기
- **경로**: task (Detailed Design)
- **안전 등급**: IEC 62304 Class A
- **산출물 경로**: docs/spec-kit/01_spec.md, 02_plan.md, 03_tasks.md

### 1.2 핵심 모듈 구조
- **대상 모듈**: `viewer/src/data/dicomParser/tagReader.js`
- **상위 모듈**: `metadataParser.js` (메타데이터 파서, readTag() 호출부)
- **의존 모듈**:
  - `dicomDictionary.js`: EXTENDED_LENGTH_VR, makeTagKey(), lookupVR()
  - `constants.js`: MAX_TAG_COUNT(10000), MAX_SEQUENCE_DEPTH(10)
  - `ParseContext.js`: readUint16/readUint32/readString/advance/hasRemaining, isLittleEndian, isExplicitVR

### 1.3 주요 함수 시그니처
- `readTag(ctx: ParseContext) -> TagReadResult | null`
  - 반환: { tag: number[2], vr: string, length: number, value: any, offset: number }
- `readTagValue(ctx, vr, length) -> any`
  - VR별 디코딩: US/SS/UL/SL/FL/FD(숫자), DS/IS(문자열->숫자), OW/OB/UN({_binaryOffset,_binaryLength}), SQ(null), LO/SH/PN/UI 등(trim 문자열)
- `skipUndefinedLengthSequence(ctx)`
  - FFFE,E0DD 종료 마커 탐색, depth 관리
- `skipSequence(ctx, depth)`
  - MAX_SEQUENCE_DEPTH(10) 초과 시 현재 깊이 유지

### 1.4 데이터 구조
- **EXTENDED_LENGTH_VR**: OB, OW, OF, SQ, UC, UN, UR, UT (4바이트 길이 사용)
- **TagReadResult**: { tag, vr, length, value, offset }
- **Undefined Length**: 0xFFFFFFFF
- **시퀀스 구분 태그**: FFFE 그룹 (vr='na', value=null)

### 1.5 설계 원칙
- readTag() 내부에서 예외 throw 금지, null 반환으로 안전 종료
- OW/OB/UN은 복사 대신 오프셋 참조로 메모리 최적화 (NFR-3)
- 모든 DataView 읽기 전 hasRemaining() 검증 필수
- Implicit VR 모드에서 lookupVR() 실패 시 기본값 'UN' 사용

## 2. 해결 완료된 주요 이슈 및 기술 스택

### 2.1 완료된 작업
- [x] !plan 명령 완료: PLAYG-1824 readTag() DICOM 태그 읽기 명세/계획/태스크 산출물 생성
- [x] 지원 전송 구문 설계: Explicit VR / Implicit VR / 시퀀스 구분 태그 / Undefined Length
- [x] VR별 디코딩 매핑 테이블 정의 (US,SS,UL,SL,FL,FD,DS,IS,OW,OB,UN,SQ,LO,SH,PN,UI 등)
- [x] 에러 코드 정의: PARSE_WARN_TRUNCATED_TAG_VALUE (태그 값 잘림 경고)
- [x] 리스크 분석 완료: DICOM 비호환 파일, 무한 루프, 메모리 부족, 사전 누락 태그, 엔디안 오류

### 2.2 추적성 매핑
| 추적 ID | 설명 | 관련 태스크 |
|---------|------|------------|
| FR-2.2 | 데이터셋 태그 순차 파싱 | TASK-1,2,3,4 |
| FR-1.3 | 필수 DICOM 태그 검증 | TASK-2,3 |
| FR-2.6 | 버퍼 범위 초과 읽기 방지 | TASK-1,7 |
| FR-2.5 | 시퀀스 깊이 제한 | TASK-5,6 |
| FR-2.4 | 태그 수 제한 | TASK-5 |
| HAZ-1.3 | 필수 태그 누락 | TASK-3 |
| HAZ-5.3 | ArrayBuffer 범위 초과 읽기 | TASK-1 |
| HAZ-5.2 | 시퀀스 무한 중첩 | TASK-5,6 |
| HAZ-5.1 | 태그 무한 루프 | TASK-5 |

### 2.3 태스크 분할 (총 19시간)
1. TASK-1: readTag() 골격 및 버퍼 안전 (2h, 높음) -> FR-2.2, FR-2.6, HAZ-5.3
2. TASK-2: Explicit VR 결정/길이 (1.5h, 높음) -> FR-2.2, FR-1.3
3. TASK-3: Implicit VR 결정/길이 (1.5h, 높음) -> FR-2.2, FR-1.3, HAZ-1.3
4. TASK-4: readTagValue() VR별 디코딩 (4h, 높음) -> FR-2.2, NFR-3
5. TASK-5: skipUndefinedLengthSequence() (3h, 중간) -> FR-2.5, HAZ-5.2
6. TASK-6: skipSequence() 깊이 제한 (1h, 중간) -> FR-2.5, HAZ-5.2
7. TASK-7: 에러 처리/경고 시스템 (2h, 중간) -> FR-2.6, NFR-7
8. TASK-8: 단위 테스트 (4h, 높음) -> 전체 VR/경계 조건 커버

## 3. 미완료 / Next Steps

- [ ] `!draft` 명령 실행: docs/artifacts/SDS.md 상세 설계 문서 작성
- [ ] `!impl` 명령 실행: tagReader.js 구현
- [ ] 전역 문서(SRS.md, SAD.md 등) 갱신 필요 여부 확인 - 현재는 갱신 없음
- [ ] TASK-1 ~ TASK-8 순차 구현 (의존성: 1->2,3,4 / 4->5->6 / 전체완료->8)
- [ ] 검증 기준 충족 확인:
  - Explicit/Implicit VR 전송 구문 모두 태그 정확 읽기
  - 버퍼 범위 초과 읽기 미발생 (HAZ-5.3)
  - 시퀀스 깊이 MAX_SEQUENCE_DEPTH(10) 이하 (HAZ-5.2)
  - 100MB+ 파일에서 메모리 선형 유지 (NFR-3)

---
_최종 갱신: 2026-04-28 | !plan 완료 상태_
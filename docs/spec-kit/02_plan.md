# [SDS-3.1] DICOM 데이터 사전 모듈(dicomDictionary.js) 기술 계획

## 요약

본 문서는 DentiView3D 프로젝트의 dicomDictionary.js 모듈 구현을 위한 기술 계획서이다.
이 모듈은 DICOM 태그 메타데이터 정의, VR 분류, 전송 구문 상수 제공 등 파서 계층의 기반 데이터를 담당하며,
tagReader, metaGroupParser, metadataParser, pixelDataParser, ParseContext, validateTransferSyntax 등 6개 모듈이 의존한다.

## 기술 컨텍스트

| 항목 | 내용 |
|---|---|
| 프로젝트 | DentiView3D - 웹 기반 CBCT 영상 뷰어 |
| 모듈 | dicomDictionary.js |
| 파일 경로 | viewer/src/data/dicomDictionary.js |
| 언어 | JavaScript (ES6+ Module) |
| 안전 등급 | IEC 62304 Class A |
| 추적 | FR-DP-003, FR-1.2, FR-1.3 |
| 의존 모듈 수 | 6개 (tagReader, metaGroupParser, metadataParser, pixelDataParser, ParseContext, validateTransferSyntax) |

### 기존 아키텍처 내 위치

- 계층: Business Logic Layer > DicomParser 컴포넌트(COMP-1) 하위 데이터 계층
- 역할: DICOM 파싱 오케스트레이션에 필요한 정적 메타데이터를 제공하는 순수 데이터 모듈
- 특성: 상태 없음(stateless), 부수 효과 없음(side-effect free), 순수 함수/상수만 export

## 구현 접근법

### Phase 1: 전송 구문 상수 정의
- **작업 내용**: TRANSFER_SYNTAX, SUPPORTED_TRANSFER_SYNTAXES 상수 구현
- **세부 사항**:
  - TRANSFER_SYNTAX 객체에 EXPLICIT_VR_LE, IMPLICIT_VR_LE, BIG_ENDIAN 3종 UID 정의
  - SUPPORTED_TRANSFER_SYNTAXES 를 new Set()으로 구현하여 O(1) 조회 보장
  - 압축 전송 구문(JPEG, JPEG2000, RLE 등)은 명시적으로 제외
- **의존 모듈**: metaGroupParser.js, ParseContext.js, validateTransferSyntax.js

### Phase 2: VR 분류 및 확장 길이 VR 집합 정의
- **작업 내용**: VR_CATEGORY, EXTENDED_LENGTH_VR 상수 구현
- **세부 사항**:
  - VR_CATEGORY를 NUMERIC, STRING_NUMERIC, STRING, BINARY, SEQUENCE 5개 카테고리로 분류
  - EXTENDED_LENGTH_VR을 new Set()으로 구현 (OB, OW, OF, SQ, UC, UN, UR, UT)
  - tagReader.js에서 길이 필드 해석 시 2바이트/4바이트 구분에 활용

### Phase 3: DICTIONARY 데이터 구조 구현
- **작업 내용**: 내부 const DICTIONARY 객체에 약 50개 필수 DICOM 태그 등록
- **세부 사항**:
  - 키 형식: makeTagKey 출력과 동일한 대문자 16진수 8자리 (예: 7FE00010)
  - 값 형식: { vr: string, name: string }
  - 포함 그룹: 0002, 0008, 0010, 0018, 0020, 0028, 7FE0, FFFE
  - CBCT 치과 영상에 필요한 필수 태그만 포함 (전체 사전 수천 개는 제외)

### Phase 4: 조회 함수 구현
- **작업 내용**: makeTagKey, lookupTag, lookupVR 함수 구현
- **세부 사항**:
  - makeTagKey(group, element): 그룹/요소 번호를 padStart(4, 0).toUpperCase()로 8자리 키 생성
  - lookupTag(tagKey): DICTIONARY[tagKey] ?? null 반환
  - lookupVR(tagKey): DICTIONARY[tagKey]?.vr ?? "UN" 반환
  - 모든 함수는 순수 함수로 구현 (side-effect 없음)

## 프로젝트 구조



## 복잡도 추적

| 항목 | 복잡도 | 비고 |
|---|---|---|
| DICTIONARY 태그 수 | 약 50개 | CBCT 필수 태그만, 전체 사전은 제외 |
| export 심볼 수 | 8개 | TRANSFER_SYNTAX, SUPPORTED_TRANSFER_SYNTAXES, VR_CATEGORY, EXTENDED_LENGTH_VR, makeTagKey, lookupTag, lookupVR + 내부 DICTIONARY |
| 의존 모듈 | 6개 | 순환 의존 없음 (단방향 참조) |
| 함수 복잡도 | O(1) | 모든 조회가 해시맵/셋 기반 |
| 상태 관리 | 없음 | 순수 상수/함수만 제공 |

## 위험 및 완화

| 위험 | 영향 | 완화 전략 |
|---|---|---|
| 태그 키 형식 불일치 | 파서 오작동 | makeTagKey 함수를 단일 진실 공급원으로 사용 |
| 필수 태그 누락 | 파싱 실패 | 단위 테스트로 모든 필수 태그 등록 검증 |
| VR 분류 오류 | 데이터 해석 오류 | DICOM PS3.5 표준 기반 분류, 테이블 검증 |
| 전송 구문 UID 오타 | 파일 인식 실패 | DICOM 표준 UID를 상수로 직접 정의, 복사-붙여넣기 방지 |
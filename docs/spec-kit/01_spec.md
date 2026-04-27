# [SDS-3.1] DICOM 데이터 사전 모듈(dicomDictionary.js) 명세서

## 메타 정보

| 항목 | 내용 |
|---|---|
| 티켓 | PLAYG-1820 |
| 모듈 | dicomDictionary.js |
| 파일 경로 | viewer/src/data/dicomDictionary.js |
| 추적 | FR-DP-003 |
| 안전 등급 | IEC 62304 Class A |

## 1. 개요

dicomDictionary.js 모듈은 DentiView3D CBCT 영상 뷰어에서 DICOM 파일 파싱에 필요한
태그 메타데이터(태그 키, VR, 이름)를 정의하고 조회 API를 제공하는 핵심 데이터 사전 모듈이다.
이 모듈은 파서(parser) 계층의 모든 모듈이 참조하는 기반 모듈로서,
DICOM 태그 식별, VR(Value Representation) 조회, 전송 구문(Transfer Syntax) 정의 등의 기능을 수행한다.

## 2. 사용자 스토리 및 테스트 시나리오

### US-3.1.1: DICOM 태그 키 생성 및 조회
- **사용자 스토리**: 파서 개발자로서, 나는 그룹/요소 번호로 태그 키를 생성하고
  해당 키로 VR과 이름을 조회할 수 있어야 한다.
- **우선순위**: P1
- **테스트 시나리오**:
  1. makeTagKey(0x7FE0, 0x0010) 호출 시 문자열 7FE00010 을 반환
  2. lookupTag("7FE00010") 호출 시 { vr: "OW", name: "Pixel Data" } 객체를 반환
  3. lookupVR("7FE00010") 호출 시 문자열 "OW" 를 반환
  4. lookupTag("99999999") 와 같이 미등록 키 조회 시 null 을 반환
  5. lookupVR("99999999") 호출 시 기본값 "UN" 을 반환

### US-3.1.2: 전송 구문 검증 지원
- **사용자 스토리**: 파서 개발자로서, 나는 비압축 전송 구문 3종의 UID와
  지원 가능한 전송 구문 집합을 조회할 수 있어야 한다.
- **우선순위**: P1
- **테스트 시나리오**:
  1. TRANSFER_SYNTAX.EXPLICIT_VR_LE 가 올바른 UID 값을 가짐
  2. TRANSFER_SYNTAX.IMPLICIT_VR_LE 가 올바른 UID 값을 가짐
  3. TRANSFER_SYNTAX.BIG_ENDIAN 이 올바른 UID 값을 가짐
  4. SUPPORTED_TRANSFER_SYNTAXES 에 위 3종 UID가 모두 포함됨
  5. 압축 전송 구문(JPEG, JPEG2000 등) UID는 SUPPORTED_TRANSFER_SYNTAXES 에 포함되지 않음

### US-3.1.3: VR 분류 및 확장 길이 VR 식별
- **사용자 스토리**: 파서 개발자로서, 나는 VR을 카테고리별로 분류하고
  4바이트 길이를 갖는 VR 집합을 식별할 수 있어야 한다.
- **우선순위**: P1
- **테스트 시나리오**:
  1. VR_CATEGORY.NUMERIC 에 FL, FD, SL, SS, UL, US 등 숫자형 VR이 포함됨
  2. VR_CATEGORY.STRING 에 LO, PN, SH, UI 등 문자열 VR이 포함됨
  3. VR_CATEGORY.SEQUENCE 에 SQ 가 포함됨
  4. EXTENDED_LENGTH_VR 에 OB, OW, OF, SQ, UC, UN, UR, UT 가 포함됨
  5. 일반 VR(US, SS 등)은 EXTENDED_LENGTH_VR 에 포함되지 않음

### US-3.1.4: 필수 DICOM 태그 사전 완전성
- **사용자 스토리**: 파서 개발자로서, 나는 CBCT 치과 영상에 필요한
  약 50개 필수 DICOM 태그를 그룹별로 조회할 수 있어야 한다.
- **우선순위**: P1
- **테스트 시나리오**:
  1. 그룹 0002(파일메타) 태그: 00020000, 00020001, 00020002, 00020003, 00020010 등이 등록됨
  2. 그룹 0008(스터디) 태그: 00080060 등이 등록됨
  3. 그룹 0010(환자) 태그: 00100010 등이 등록됨
  4. 그룹 0018(영상파라미터) 태그: 00180050, 00180088 등이 등록됨
  5. 그룹 0020(위치/방향) 태그: 00200032, 00200037 등이 등록됨
  6. 그룹 0028(영상표현) 태그: 00280010, 00280011, 00280100, 00280101 등이 등록됨
  7. 그룹 7FE0(픽셀데이터) 태그: 7FE00010 이 등록됨
  8. 그룹 FFFE(시퀀스구분) 태그: FFFE0000, FFFEE000, FFFEE00D, FFFEE0DD 이 등록됨

## 3. 요구사항

### 기능 요구사항

| ID | 요구사항 | 우선순위 | 추적 |
|---|---|---|---|
| FR-DD-001 | makeTagKey(group, element) 함수는 그룹/요소 번호를 대문자 16진수 8자리 문자열로 변환한다 | P1 | FR-DP-003 |
| FR-DD-002 | DICTIONARY 객체는 키가 GGGGEEEE 형식이고 값이 {vr, name} 구조인 약 50개 태그를 포함한다 | P1 | FR-DP-003 |
| FR-DD-003 | lookupTag(tagKey) 함수는 등록된 태그 키로 {vr, name} 객체를 반환하고, 미등록 시 null을 반환한다 | P1 | FR-DP-003 |
| FR-DD-004 | lookupVR(tagKey) 함수는 등록된 태그 키로 VR 문자열을 반환하고, 미등록 시 UN 을 반환한다 | P1 | FR-DP-003 |
| FR-DD-005 | TRANSFER_SYNTAX 상수는 EXPLICIT_VR_LE, IMPLICIT_VR_LE, BIG_ENDIAN 3종 UID를 정의한다 | P1 | FR-1.2 |
| FR-DD-006 | SUPPORTED_TRANSFER_SYNTAXES 는 비압축 전송 구문 3종의 UID 집합(Set)이다 | P1 | FR-1.2 |
| FR-DD-007 | VR_CATEGORY 상수는 VR을 NUMERIC, STRING_NUMERIC, STRING, BINARY, SEQUENCE로 분류한다 | P1 | FR-DP-003 |
| FR-DD-008 | EXTENDED_LENGTH_VR 은 4바이트 길이를 갖는 VR 집합(OB,OW,OF,SQ,UC,UN,UR,UT)이다 | P1 | FR-DP-003 |
| FR-DD-009 | DICTIONARY는 0002, 0008, 0010, 0018, 0020, 0028, 7FE0, FFFE 그룹의 필수 태그를 포함한다 | P1 | FR-1.3 |
| FR-DD-010 | 압축 전송 구문(JPEG, JPEG2000 등)은 SUPPORTED_TRANSFER_SYNTAXES 에 포함하지 않는다 | P1 | FR-1.2 |

### 비기능 요구사항

| ID | 요구사항 | 추적 |
|---|---|---|
| NFR-DD-001 | DICTIONARY 키 형식은 makeTagKey() 출력과 반드시 일치해야 한다 (대문자 16진수 8자리) |
| NFR-DD-002 | 시퀀스 구분 태그(FFFE 그룹)도 사전에 등록되어 makeTagKey 출력과 일치해야 한다 |
| NFR-DD-003 | CBCT 치과 영상에 필요한 필수 태그만 포함하고, 전체 DICOM 사전(수천 개)은 포함하지 않는다 |
| NFR-DD-004 | 모든 export 심볼은 순수 함수/상수이며, 부수 효과(side effect)가 없어야 한다 |

## 4. 성공 기준

| # | 기준 | 검증 방법 |
|---|---|---|
| 1 | makeTagKey 가 모든 그룹/요소 조합에서 올바른 8자리 대문자 16진수 키를 생성 | 단위 테스트 |
| 2 | lookupTag/lookupVR 이 등록된 태그에 대해 정확한 VR과 이름을 반환 | 단위 테스트 |
| 3 | lookupTag 가 미등록 키에 null, lookupVR 이 UN 을 반환 | 단위 테스트 |
| 4 | SUPPORTED_TRANSFER_SYNTAXES 에 비압축 3종만 포함 | 단위 테스트 |
| 5 | EXTENDED_LENGTH_VR 에 명세된 8종 VR이 모두 포함 | 단위 테스트 |
| 6 | DICTIONARY에 필수 태그 약 50개가 모두 등록되어 있음 | 단위 테스트 (태그 수 카운트) |
| 7 | tagReader, metaGroupParser, metadataParser, pixelDataParser, ParseContext, validateTransferSyntax 모듈이 본 모듈을 정상 참조 | 통합 테스트 |

## 5. 모듈 간 의존 관계

| 소비 모듈 | 사용 심볼 | 용도 |
|---|---|---|
| tagReader.js | EXTENDED_LENGTH_VR, makeTagKey, lookupVR | Explicit/Implicit VR 모드에서 태그 읽기 시 길이 필드 해석 및 VR 조회 |
| metaGroupParser.js | TRANSFER_SYNTAX | 메타 그룹(0002) 파싱 시 항상 Explicit VR LE로 컨텍스트 생성 |
| metadataParser.js | makeTagKey | 수집된 태그를 필드에 매핑 |
| pixelDataParser.js | makeTagKey | 픽셀 데이터 태그(7FE00010) 탐색 |
| ParseContext.js | TRANSFER_SYNTAX | 전송 구문 기반 바이트 오더 및 VR 모드 설정 |
| validateTransferSyntax.js | SUPPORTED_TRANSFER_SYNTAXES | 전송 구문 지원 여부 검증 |

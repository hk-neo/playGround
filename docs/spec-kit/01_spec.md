# [PLAYG-1824] readTag() DICOM 태그 읽기 명세서

## 1. 개요

### 1.1 티켓 정보
| 항목 | 내용 |
|------|------|
| 티켓 ID | PLAYG-1824 |
| 제목 | [SDS-3.5] readTag() DICOM 태그 읽기 |
| 티켓 유형 | Detailed Design |
| 안전 등급 | IEC 62304 Class A |

### 1.2 모듈 정보
| 항목 | 내용 |
|------|------|
| 모듈 경로 | viewer/src/data/dicomParser/tagReader.js |
| 상위 모듈 | metadataParser.js (메타데이터 파서) |
| 참조 표준 | DICOM PS3.5 (Data Structures and Encoding) |

### 1.3 추적성
- **추적 요구사항**: FR-2.2 (데이터셋 태그 순차 파싱), FR-1.3 (필수 DICOM 태그 검증), FR-2.6 (버퍼 범위 초과 읽기 방지)
- **추적 Hazard**: HAZ-1.3 (필수 태그 누락), HAZ-5.3 (ArrayBuffer 범위 초과 읽기)

---

## 2. 기능 명세

### 2.1 목적
`readTag()` 함수는 `ParseContext`의 현재 오프셋 위치에서 DICOM 태그 하나를 읽어 태그 번호(Group, Element), VR(Value Representation), 길이, 값을 반환한다.

### 2.2 지원 전송 구문
- **Explicit VR**: VR이 바이트 스트림에 명시적으로 인코딩된 형식
- **Implicit VR**: VR이 사전 정의된 데이터 사전을 통해 조회되는 형식
- **시퀀스 구분 태그**: FFFE 그룹 태그 처리
- **Undefined Length**: 0xFFFFFFFF 길이를 갖는 시퀀스 처리

### 2.3 입력 명세
| 항목 | 타입 | 설명 |
|------|------|------|
| ctx | ParseContext | buffer, dataView, offset, isLittleEndian, isExplicitVR 속성 포함 |

### 2.4 출력 명세 (TagReadResult)
| 항목 | 타입 | 설명 |
|------|------|------|
| tag | number[2] | Group(16비트), Element(16비트) 태그 번호 |
| vr | string | Value Representation (예: US, DS, OW, na) |
| length | number | 값의 바이트 길이. Undefined Length 시 원본 length 필드값 |
| value | any | VR별 파싱 결과. 문자열/숫자/바이너리 오프셋/null |
| offset | number | 태그 시작 오프셋 (디버깅/추적용) |
| 반환값 | Object | null | TagReadResult 객체. 버퍼 부족 시 null 반환 |

---

## 3. 처리 로직 흐름도

### 3.1 메인 흐름 (readTag)

````
1. 버퍼 잔여 확인
   - ctx.hasRemaining(4) 확인
   - 부족 시 null 반환 (FR-2.6)

2. 태그 번호 읽기
   - ctx.readUint16() x 2 호출
   - group, element 획득

3. 시퀀스 구분 태그 분기
   - group === 0xFFFE인 경우
   - 4바이트 길이 읽고 조기 반환 (vr='na', value=null)

4. VR 결정 분기
   [Explicit VR 모드] (ctx.isExplicitVR === true)
     - 2바이트 VR 문자열 읽기
     - EXTENDED_LENGTH_VR(OB,OW,OF,SQ,UC,UN,UR,UT)인 경우:
       2바이트 예약 + 4바이트 길이
     - 일반 VR인 경우:
       2바이트 길이

   [Implicit VR 모드] (ctx.isExplicitVR === false)
     - makeTagKey()로 태그 키 생성 후 lookupVR() 조회
     - 없으면 'UN' 사용
     - 4바이트 길이 읽기

5. 길이 처리 분기
   - Undefined Length (0xFFFFFFFF):
     skipUndefinedLengthSequence() 호출 후 오프셋 전진, value=null
   - 길이 > 0 and 버퍼 충분:
     readTagValue(ctx, vr, length) 호출
   - 길이 > 0 and 버퍼 부족:
     PARSE_WARN_TRUNCATED_TAG_VALUE 경고 기록, 오프셋를 버퍼 끝으로 이동

6. 결과 반환
   - { tag, vr, length, value, offset }
````

---

## 4. 하위 함수 명세

### 4.1 readTagValue(ctx, vr, length)

VR 타입에 따라 값을 적절히 디코딩한다.

| VR | 처리 방식 | 반환 타입 |
|----|-----------|-----------|
| US | ctx.readUint16() + 패딩 건너뛰기 | number |
| SS | ctx.readInt16() + 패딩 건너뛰기 | number |
| UL | ctx.readUint32() + 패딩 건너뛰기 | number |
| SL | dataView.getInt32() + 패딩 건너뛰기 | number |
| FL | dataView.getFloat32() + 패딩 건너뛰기 | number |
| FD | dataView.getFloat64() + 패딩 건너뛰기 | number |
| DS | 문자열 읽기 -> trim -> parseFloat | number | string |
| IS | 문자열 읽기 -> trim -> parseInt | number | string |
| OW/OB/UN | 오프셋만 전진 (지연 접근) | {_binaryOffset, _binaryLength} |
| SQ | 오프셋만 전진 (중첩은 readTag에서 처리) | null |
| 기타(LO,SH,PN,UI 등) | 문자열 읽기 -> trim -> null 제거 | string |

**성능 최적화**: 대용량 바이너리(OB/OW/UN)는 복사하지 않고 오프셋 정보만 반환하여 메모리 사용 최소화 (NFR-3).

### 4.2 skipUndefinedLengthSequence(ctx)

Undefined Length 시퀀스에서 종료 마커를 탐색한다.
- FFFE,E0DD(Sequence Delimitation Item)를 만나면 depth를 감소시키고 depth=0이면 종료
- 중첩 시퀀스 진입 시 depth 증가
- Explicit/Implicit VR 모드 모두 지원
- 버퍼 끝 도달 시 안전 종료

### 4.3 skipSequence(ctx, depth)

시퀀스 중첩 깊이를 관리한다.
- MAX_SEQUENCE_DEPTH(10) 초과 시 현재 깊이 유지 (FR-2.5, HAZ-5.2)

---

## 5. 에러 처리 명세

| 조건 | 에러 코드 | 심각도 | 처리 |
|------|-----------|--------|------|
| 태그 값이 버퍼 끝에서 잘림 | PARSE_WARN_TRUNCATED_TAG_VALUE | warning | ctx.errors에 경고 추가, 오프셋를 버퍼 끝으로 이동 |
| 버퍼 잔여 부족 (4바이트 미만) | - | - | null 반환하여 순회 종료 |
| VR 읽기 중 버퍼 부족 | - | - | null 반환 |
| 길이 읽기 중 버퍼 부족 | - | - | null 반환 |

**설계 원칙**: readTag() 자체에서는 예외를 throw하지 않고 호출부(metadataParser)의 try-catch로 안전하게 처리 (FR-2.6, NFR-7).

---

## 6. 의존성

| 모듈 | 사용 함수 | 용도 |
|------|-----------|------|
| dicomDictionary.js | EXTENDED_LENGTH_VR | 4바이트 길이 VR 판별 |
| dicomDictionary.js | makeTagKey | 태그 키(GGGGEEEE) 생성 |
| dicomDictionary.js | lookupVR | Implicit VR 모드에서 VR 조회 |
| constants.js | MAX_TAG_COUNT | 태그 수 무한 루프 방지 (호출부에서 관리) |
| constants.js | MAX_SEQUENCE_DEPTH | 시퀀스 중첩 깊이 제한 |
| ParseContext.js | readUint16/readUint32/readString/advance/hasRemaining | 바이트 단위 버퍼 읽기 |

---

## 7. 설계 제약사항

1. **버퍼 읽기 전 안전 확인**: 모든 DataView 읽기 전 hasRemaining()으로 잔여 바이트 확인 (FR-2.6, HAZ-5.3)
2. **시퀀스 깊이 제한**: MAX_SEQUENCE_DEPTH(10) 초과 시 파싱 중단 (FR-2.5, HAZ-5.2)
3. **태그 수 제한**: 호출부(metadataParser)에서 MAX_TAG_COUNT(10000) 관리 (FR-2.4, HAZ-5.1)
4. **바이트 오더 준수**: ParseContext.isLittleEndian에 따라 모든 정수 읽기 시 엔디안 적용
5. **픽셀 데이터 지연 접근**: OW/OB/UN 값은 복사하지 않고 오프셋만 반환 (메모리 최적화, NFR-3)
6. **시퀀스 구분 태그 특수 처리**: FFFE 그룹은 VR/값이 없으므로 vr='na', value=null로 처리

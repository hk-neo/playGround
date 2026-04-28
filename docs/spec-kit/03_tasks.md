# [PLAYG-1824] readTag() DICOM 태그 읽기 태스크 분할

## 태스크 목록

### TASK-1: readTag() 함수 골격 및 버퍼 안전 읽기
- **우선순위**: 높음
- **예상 소요**: 2시간
- **담당**: 미할당
- **설명**:
  - readTag() 함수 기본 구조 구현
  - ctx.hasRemaining(4) 버퍼 잔여 확인 로직
  - ctx.readUint16() x2로 group, element 태그 번호 읽기
  - group === 0xFFFE 시퀀스 구분 태크 조기 반환 처리 (vr='na', value=null)
  - 버퍼 부족 시 null 반환
- **완료 기준**:
  - [ ] 4바이트 미만 잔여 시 null 반환
  - [ ] group/element 정상 읽기
  - [ ] FFFE 그룹 조기 반환 동작
- **추적**: FR-2.2, FR-2.6, HAZ-5.3

---

### TASK-2: Explicit VR 모드 VR 결정 및 길이 읽기
- **우선순위**: 높음
- **예상 소요**: 1.5시간
- **담당**: 미할당
- **설명**:
  - ctx.isExplicitVR === true 분기 구현
  - 2바이트 VR 문자열 읽기
  - EXTENDED_LENGTH_VR(OB,OW,OF,SQ,UC,UN,UR,UT) 판별
  - 확장 VR: 2바이트 예약 + 4바이트 길이 읽기
  - 일반 VR: 2바이트 길이 읽기
- **완료 기준**:
  - [ ] Explicit VR 문자열 정상 읽기
  - [ ] 확장/일반 VR 길이 분기 처리
  - [ ] VR 읽기 중 버퍼 부족 시 null 반환
- **추적**: FR-2.2, FR-1.3
- **의존성**: dicomDictionary.EXTENDED_LENGTH_VR

---

### TASK-3: Implicit VR 모드 VR 결정 및 길이 읽기
- **우선순위**: 높음
- **예상 소요**: 1.5시간
- **담당**: 미할당
- **설명**:
  - ctx.isExplicitVR === false 분기 구현
  - makeTagKey()로 태그 키(GGGGEEEE) 생성
  - lookupVR()로 데이터 사전에서 VR 조회
  - 조회 실패 시 기본값 'UN' 사용
  - 4바이트 길이 읽기
- **완료 기준**:
  - [ ] 태그 키 정상 생성
  - [ ] 사전 조회 및 기본값 처리
  - [ ] 4바이트 길이 정상 읽기
- **추적**: FR-2.2, FR-1.3, HAZ-1.3
- **의존성**: dicomDictionary.makeTagKey, dicomDictionary.lookupVR

---

### TASK-4: readTagValue() VR별 값 디코딩
- **우선순위**: 높음
- **예상 소요**: 4시간
- **담당**: 미할당
- **설명**:
  - 정수형 VR (US, SS, UL, SL): DataView 읽기 + 패딩 건너뛰기
  - 실수형 VR (FL, FD): DataView 읽기 + 패딩 건너뛰기
  - DS: 문자열 읽기 -> trim -> parseFloat
  - IS: 문자열 읽기 -> trim -> parseInt
  - OW/OB/UN: 오프셋만 전진, {_binaryOffset, _binaryLength} 반환 (지연 접근)
  - SQ: 오프셋만 전진, null 반환
  - 문자열 계열 (LO, SH, PN, UI 등): 문자열 읽기 -> trim -> null 제거
- **완료 기준**:
  - [ ] 각 VR 타입별 디코딩 정상 동작
  - [ ] OW/OB/UN 지연 접근으로 메모리 복사 없음
  - [ ] DS/IS 파싱 결과 타입 확인
- **추적**: FR-2.2, NFR-3

---

### TASK-5: skipUndefinedLengthSequence() 시퀀스 건너뛰기
- **우선순위**: 중간
- **예상 소요**: 3시간
- **담당**: 미할당
- **설명**:
  - Undefined Length (0xFFFFFFFF) 감지 시 호출
  - FFFE,E0DD (Sequence Delimitation Item) 종료 마커 탐색
  - 중첩 시퀀스 진입 시 depth 증가, 종료 마커 시 depth 감소
  - depth=0 도달 시 시퀀스 건너뛰기 완료
  - Explicit/Implicit VR 모드 모두 지원
  - 버퍼 끝 도달 시 안전 종료
- **완료 기준**:
  - [ ] 단일 레벨 Undefined Length 시퀀스 정상 건너뛰기
  - [ ] 중첩 시퀀스 depth 관리 정상 동작
  - [ ] 버퍼 끝 도달 시 안전 종료
- **추적**: FR-2.5, HAZ-5.2

---

### TASK-6: skipSequence() 깊이 제한 및 안전 장치
- **우선순위**: 중간
- **예상 소요**: 1시간
- **담당**: 미할당
- **설명**:
  - MAX_SEQUENCE_DEPTH(10) 상수 정의/참조
  - depth 초과 시 현재 깊이 유지하고 파싱 계속
  - skipUndefinedLengthSequence()에서 호출
- **완료 기준**:
  - [ ] 깊이 제한 초과 시 안전하게 처리
  - [ ] 정상 깊이 범위에서 시퀀스 파싱 계속
- **추적**: FR-2.5, HAZ-5.2
- **의존성**: constants.MAX_SEQUENCE_DEPTH

---

### TASK-7: 에러 처리 및 경고 시스템
- **우선순위**: 중간
- **예상 소요**: 2시간
- **담당**: 미할당
- **설명**:
  - 태그 값 잘림 시 PARSE_WARN_TRUNCATED_TAG_VALUE 경고 기록
  - ctx.errors 배열에 경고 객체 추가
  - 잘린 태그 값 처리 시 오프셋를 버퍼 끝으로 이동
  - readTag() 내부에서는 예외 throw 금지 원칙 적용
- **완료 기준**:
  - [ ] 잘림 경고가 ctx.errors에 기록됨
  - [ ] 예외 throw 없이 null 또는 부분 결과 반환
- **추적**: FR-2.6, NFR-7

---

### TASK-8: 단위 테스트 작성
- **우선순위**: 높음
- **예상 소요**: 4시간
- **담당**: 미할당
- **설명**:
  - Explicit VR 태그 읽기 테스트 케이스
  - Implicit VR 태그 읽기 테스트 케이스
  - 시퀀스 구분 태그 테스트
  - Undefined Length 시퀀스 테스트
  - 버퍼 경계 조건 테스트 (잘림, 부족, 빈 버퍼)
  - VR별 값 디코딩 테스트 (US, SS, DS, IS, OW, OB, SQ 등)
  - 엔디안 처리 테스트 (Little Endian / Big Endian)
  - 중첩 시퀀스 깊이 제한 테스트
- **완료 기준**:
  - [ ] 모든 VR 타입 커버
  - [ ] 경계 조건 커버
  - [ ] 테스트 커버리지 90% 이상
- **추적**: FR-2.2, FR-2.6, NFR-7

---

## 태스크 의존성 그래프

````
TASK-1 (골격/버퍼안전)
  ├── TASK-2 (Explicit VR)
  ├── TASK-3 (Implicit VR)
  └── TASK-4 (readTagValue)

TASK-4 (readTagValue)
  └── TASK-5 (skipUndefinedLength)
       └── TASK-6 (skipSequence/깊이제한)

TASK-1 ~ TASK-7 완료 후
  └── TASK-8 (단위 테스트)
````

## 총 예상 소요 시간
| 항목 | 시간 |
|------|------|
| TASK-1 ~ TASK-7 (구현) | 15시간 |
| TASK-8 (테스트) | 4시간 |
| **총계** | **19시간** |

# [PLAYG-1824] readTag() DICOM 태그 읽기 기술 계획서

## 1. 구현 전략

### 1.1 접근 방식
본 모듈은 DICOM PS3.5 표준을 준수하여 ArrayBuffer 기반 바이너리 데이터에서 태그를 순차적으로 파싱하는 핵심 함수이다. 기존 ParseContext 추상화를 활용하여 바이트 레벨 읽기를 안전하게 수행한다.

### 1.2 구현 원칙
- **안전 우선**: 모든 버퍼 읽기 전 잔여 바이트 검증 (FR-2.6, HAZ-5.3)
- **예외 없는 설계**: readTag() 내부에서는 예외를 throw하지 않고 null 반환으로 안전 종료
- **메모리 최적화**: 대용량 바이너리(OB/OW/UN)는 복사 대신 오프셋 참조 (NFR-3)
- **표준 준수**: DICOM PS3.5 전송 구문(Explicit/Implicit VR) 완전 지원

---

## 2. 기술 스택

| 항목 | 기술 |
|------|------|
| 언어 | JavaScript (ES6+) |
| 런타임 | 브라우저 (Web Worker 환경 포함) |
| 바이너리 처리 | DataView, ArrayBuffer API |
| 모듈 시스템 | ES Module 또는 CommonJS |
| 테스트 | Jest (단위 테스트) |
| 정적 분석 | ESLint |

---

## 3. 단계별 구현 계획

### Phase 1: 기본 구조 및 태그 읽기 (readTag 본체)
- **작업 내용**:
  - readTag() 함수 골격 구현
  - 버퍼 잔여 확인 로직 (hasRemaining)
  - 태그 번호 읽기 (group, element)
  - 시퀀스 구분 태그(FFFE 그룹) 조기 반환 처리
- **추적 요구사항**: FR-2.2, FR-2.6
- **추적 Hazard**: HAZ-5.3
- **예상 소요**: 2시간

### Phase 2: VR 결정 로직
- **작업 내용**:
  - Explicit VR 모드: VR 문자열 읽기 + EXTENDED_LENGTH_VR 판별
  - Implicit VR 모드: makeTagKey() + lookupVR() 조회
  - 길이 필드 읽기 (2바이트/4바이트 분기)
- **의존성**: dicomDictionary.js (EXTENDED_LENGTH_VR, makeTagKey, lookupVR)
- **추적 요구사항**: FR-2.2, FR-1.3
- **예상 소요**: 3시간

### Phase 3: 값 디코딩 (readTagValue)
- **작업 내용**:
  - VR별 디코딩 로직 구현 (US, SS, UL, SL, FL, FD, DS, IS, OW, OB, UN, SQ, 문자열 계열)
  - OW/OB/UN 지연 접근 (오프셋만 반환)
  - DS/IS 문자열 파싱 (trim + parseFloat/parseInt)
- **추적 요구사항**: FR-2.2, NFR-3
- **예상 소요**: 4시간

### Phase 4: Undefined Length 시퀀스 처리
- **작업 내용**:
  - skipUndefinedLengthSequence() 구현
  - skipSequence() depth 관리 구현
  - FFFE,E0DD 종료 마커 탐색
  - MAX_SEQUENCE_DEPTH(10) 초과 방지
- **추적 요구사항**: FR-2.5, FR-2.4
- **추적 Hazard**: HAZ-5.2, HAZ-5.1
- **예상 소요**: 3시간

### Phase 5: 에러 처리 및 경고 시스템
- **작업 내용**:
  - PARSE_WARN_TRUNCATED_TAG_VALUE 경고 기록
  - 버퍼 부족 시 안전 종료 (null 반환)
  - 오프셋 복구 로직 (버퍼 끝으로 이동)
- **추적 요구사항**: FR-2.6, NFR-7
- **예상 소요**: 2시간

### Phase 6: 단위 테스트 작성
- **작업 내용**:
  - Explicit VR 태그 읽기 테스트
  - Implicit VR 태그 읽기 테스트
  - 시퀀스 구분 태그 테스트
  - Undefined Length 시퀀스 테스트
  - 버퍼 경계 조건 테스트 (잘림, 부족)
  - VR별 값 디코딩 테스트
  - 엔디안 처리 테스트
- **예상 소요**: 4시간

---

## 4. 리스크 분석

| 리스크 | 영향도 | 가능성 | 대응 방안 |
|--------|--------|--------|-----------|
| DICOM 표준 비호환 파일 파싱 시 오작동 | 높음 | 중간 | 모든 버퍼 읽기 전 hasRemaining() 검증, null 반환으로 안전 종료 |
| Undefined Length 시퀀스 무한 루프 | 높음 | 낮음 | MAX_SEQUENCE_DEPTH(10) 제한, MAX_TAG_COUNT(10000) 제한 |
| 대용량 바이너리 복사로 인한 메모리 부족 | 중간 | 중간 | OW/OB/UN은 오프셋만 반환하는 지연 접근 방식 적용 |
| Implicit VR 모드에서 사전 누락 태그 | 낮음 | 중간 | lookupVR() 실패 시 기본값 'UN'으로 처리 |
| 엔디안 처리 오류 | 높음 | 낮음 | ParseContext.isLittleEndian 플래그 기반 일관된 처리 |

---

## 5. 검증 기준

### 5.1 기능 검증
- Explicit VR 및 Implicit VR 전송 구문 모두에서 태그를 정확히 읽는다
- 시퀀스 구분 태그(FFFE 그룹)를 올바르게 처리한다
- Undefined Length 시퀀스를 종료 마커까지 안전하게 건너뛴다
- VR별 값 디코딩이 DICOM PS3.5에 맞게 수행된다

### 5.2 안전 검증
- 버퍼 범위를 벗어나는 읽기가 발생하지 않는다 (HAZ-5.3)
- 시퀀스 깊이가 MAX_SEQUENCE_DEPTH(10)을 초과하지 않는다 (HAZ-5.2)
- 태그 수가 MAX_TAG_COUNT(10000)을 초과하면 파싱이 중단된다 (HAZ-5.1)

### 5.3 성능 검증
- 대용량 DICOM 파일(100MB+)에서도 메모리 사용량이 선형적으로 유지된다 (NFR-3)
- 파싱 속도가 기존 구현 대비 성능 저하가 없다
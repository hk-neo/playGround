# 테스트 전략서: findPixelDataTag() - DICOM 픽셀 데이터 태그 폴백 탐색

**티켓**: PLAYG-1830 | **날짜**: 2026-05-01
**모듈**: viewer/src/data/dicomParser/pixelDataParser.js
**대상 함수**: findPixelDataTag(view, bufferLength)
**안전 등급**: IEC 62304 Class A (비진단 경로 폴백)
**테스트 프레임워크**: Vitest
---

## 1. 테스트 레벨 정의

### 1.1 단위 테스트 (Unit Test)

| 항목 | 내용 |
|------|------|
| 대상 | findPixelDataTag(view, bufferLength) |
| 범위 | 모든 제어 흐름 경로(P1~P4) 및 엣지 케이스(EC-001~EC-007) |
| 도구 | Vitest + 커스텀 픽스처 (pixelDataTagBuffer.js) |
| 커버리지 목표 | 함수 100%, 분기 100% (4/4 경로), 라인 >= 90% |
| 파일 | viewer/tests/unit/dicomParser/pixelDataParser.test.js (신규) |

#### 제어 흐름 경로

| 경로 | 조건 | 결과 | 커버 테스트 |
|------|------|------|-------------|
| P1 | bufferLength <= 132 | 즉시 -1 반환 | UT-005, UT-012, UT-014 |
| P2 | 루프 중 매치 발견 | offset 반환 | UT-001, UT-002, UT-004, UT-006 |
| P3 | 루프 정상 종료(매치 없음) | -1 반환 | UT-003, UT-011 |
| P4 | 루프 중 예외 발생 | break 후 -1 반환 | UT-007 |

### 1.2 통합 테스트 (Integration Test)

| 항목 | 내용 |
|------|------|
| 대상 | parsePixelData() export 함수를 통한 findPixelDataTag() 간접 호출 |
| 범위 | 폴백 경로 연동, ParseError 발생, 기존 정상 경로 회귀 |
| 도구 | Vitest + 기존 validBuffer.js 픽스처 재사용 |
| 파일 | viewer/tests/unit/dicomParser/pixelDataParser.test.js (동일 파일) |

### 1.3 E2E 테스트

| 항목 | 내용 |
|------|------|
| 대상 | 해당 없음 (폴백 함수는 E2E 범위 밖) |
| 사유 | findPixelDataTag()은 내부 유틸리티 함수로 브라우저 렌더링 파이프라인 E2E에서 간접 검증됨 |

---

## 2. 테스트 도구 및 환경

### 2.1 테스트 프레임워크

| 도구 | 버전 | 용도 |
|------|------|------|
| Vitest | 기존 프로젝트 설정 | 테스트 러너, 단언(assert), 모킹 |
| DataView (Web API) | 브라우저 표준 | 바이트 단위 버퍼 조작 (픽스처 생성) |
| ArrayBuffer | 브라우저 표준 | 테스트 버퍼 메모리 할당 |

### 2.2 커버리지 도구

| 도구 | 용도 |
|------|------|
| @vitest/coverage-v8 | 라인/분기/함수 커버리지 측정 |

### 2.3 모킹 전략 (Mocking Strategy)

**원칙: 최소 모킹 (Minimal Mocking)**

본 함수는 순수 함수적 성격을 가지며 외부 API 호출, 데이터베이스 연동, 비동기 처리, DOM 접근이 모두 없습니다.
유일한 외부 의존성은 constants.js의 PIXEL_DATA_TAG 상수이며, 이는 모킹 대상이 아닙니다.

**module-private 함수 접근 방안:**

| 옵션 | 설명 | 선택 여부 |
|------|------|-----------|
| A. 테스트용 export 추가 | 소스에 export { findPixelDataTag } 추가 | 채택 |
| B. parsePixelData() 간접 테스트 | export 함수만으로 간접 검증 | 보조 사용 |
| C. vi.mock 모듈 모킹 | Vitest 모킹으로 내부 함수 가로채기 | 미채택 (과도한 모킹) |

**채택 전략: 옵션 A + B 병행**
- 단위 테스트(UT-001~UT-022): 옵션 A로 findPixelDataTag를 직접 export하여 테스트
- 통합 테스트(IT-001~IT-005): 옵션 B로 parsePixelData()를 통해 간접 검증
- 프로덕션 빌드 시 테스트용 export는 tree-shaking으로 제거 가능

**외부 의존성 모킹 불필요 사유:**

| 의존성 | 모킹 필요 여부 | 사유 |
|--------|----------------|------|
| PIXEL_DATA_TAG (constants.js) | 불필요 | 불변 상수로 모킹 의미 없음 |
| DataView (Web API) | 불필요 | Node.js/Vitest 환경에서 네이티브 지원 |
| ParseError (CBVError.js) | 불필요 | 통합 테스트에서 실제 에러 클래스 사용 |

### 3.5 User Story 5: 2바이트 간격 최적화 탐색 (P2)

> DICOM 태그 짝수 정렬 특성을 활용하여 2바이트 간격으로 O(n/2) 탐색

| ID | 유형 | 시나리오 | 입력 조건 | 기대 결과 | 관련 FR | 관련 EC |
|----|------|----------|-----------|-----------|---------|---------|
| UT-019 | Positive | 짝수 오프셋 태그 정확성 | 짝수 오프셋에만 태그 존재 | 정확한 오프셋 반환 | FR-004 | SC-007 |
| UT-020 | Negative | 홀수 오프셋 태그 미탐색 | 홀수 오프셋에 강제 배치 | -1 반환 (표준 위반) | FR-004 | - |
| UT-021 | Positive | 다중 태그 중 첫 매치 | 오프셋 134,200,500에 다른 태그, 1000에 (7FE0,0010) | 1000 반환 | FR-006 | - |
| UT-022 | Positive | 대용량 버퍼 성능 | 1MB 버퍼, 태그 끝 근처 | 정상 탐색 완료 | NFR-002 | EC-007 |

### 3.6 통합 테스트 케이스

> parsePixelData() export 함수를 통한 findPixelDataTag() 간접 검증

| ID | 유형 | 시나리오 | 입력 조건 | 기대 결과 | 관련 SC | 관련 HAZ |
|----|------|----------|-----------|-----------|---------|---------|
| IT-001 | Positive | 폴백 경로 정상 파싱 | pixelDataOffset 없이 유효 버퍼 전달 | findPixelDataTag 호출 후 픽셀 데이터 정상 추출 | SC-001 | HAZ-1.1 |
| IT-002 | Negative | 폴백 실패 시 에러 | 태그 없는 버퍼 전달 | ParseError(PARSE_ERR_PIXEL_DATA_EXTRACTION) 발생 | SC-002 | HAZ-1.1 |
| IT-003 | Positive | 정상 경로 회귀 | pixelDataOffset 명시 제공 | findPixelDataTag 미호출, 정상 경로 사용 | SC-006 | - |
| IT-004 | Positive | 기존 테스트 회귀 | 기존 parsePixelData 테스트 전체 | 모든 기존 테스트 PASS | SC-001~007 | - |
| IT-005 | Positive | Explicit VR LE 헤더 파싱 | 폴백 오프셋에서 12바이트 헤더 읽기 | tag(4)+VR(2)+reserved(2)+length(4) 정상 파싱 | SC-001 | - |

---

## 4. 테스트 픽스처 설계

### 4.1 신규 픽스처: viewer/tests/unit/fixtures/pixelDataTagBuffer.js

| 함수 | 설명 | 용도 |
|------|------|------|
| createPixelDataTagBuffer(options) | 지정 오프셋에 (7FE0,0010) LE 태그 배치 버퍼 생성 | UT-001, UT-002, UT-004, UT-006, UT-013, UT-015~UT-022 |
| createNoTagBuffer(length) | 픽셀 데이터 태그 미포함 버퍼 생성 | UT-003, UT-008, UT-010, UT-011 |
| createCorruptBuffer() | DataView 읽기 예외 유도 손상 버퍼 | UT-007 |
| createBigEndianTagBuffer(tagOffset, totalLength) | BE 저장 태그 버퍼 생성 | UT-009, UT-017 |
| createBoundaryBuffer(tagOffset, totalLength) | 경계 조건 버퍼 생성 | UT-004, UT-012, UT-013, UT-015 |

### 4.2 기존 픽스처 재사용: viewer/tests/unit/fixtures/validBuffer.js

| 함수 | 재사용 용도 |
|------|------------|
| createValidBuffer() | IT-001, IT-003, IT-004 통합 테스트 |
| writeExplicitTag() | 픽스처 내부 태그 작성 |
| writeExtendedTag() | 확장 VR(OB/OW) 태그 작성 |
| writeString() | 문자열 값 작성 |

### 4.3 createPixelDataTagBuffer 옵션 스펙



---

## 5. 정합성 확인: 성공 지표 커버리지 매핑

### 5.1 Success Criteria -> 테스트 케이스 추적 매트릭스

| 성공 지표 | 설명 | 커버 테스트 | 달성 여부 |
|-----------|------|-------------|-----------|
| SC-001 | 픽셀 데이터 태그 포함 시 정확한 오프셋 반환 | UT-001, UT-002, UT-004, UT-006, UT-016, IT-001 | COVERED |
| SC-002 | 픽셀 데이터 태그 미포함 시 -1 반환 | UT-003, UT-005, UT-010, IT-002 | COVERED |
| SC-003 | bufferLength 132 이하 시 즉시 -1 반환 | UT-005, UT-012, UT-014 | COVERED |
| SC-004 | DataView 예외 시 try-catch 포착, 예외 미전파 | UT-007 | COVERED |
| SC-005 | 버퍼 경계 조건에서 OOB 읽기 미발생 | UT-004, UT-012, UT-013, UT-015 | COVERED |
| SC-006 | 정상 경로에서 본 함수 미호출 | IT-003, IT-004 | COVERED |
| SC-007 | 2바이트 간격 탐색 == 1바이트 간격 탐색 결과 | UT-019, UT-020, UT-021 | COVERED |

### 5.2 위험 완화 검증 매핑

| 위험 ID | 위험 내용 | 완화 조치 | 커버 테스트 |
|---------|-----------|-----------|-------------|
| HAZ-5.3 | ArrayBuffer 범위 초과 읽기 | 루프 상한 + try-catch 이중 방어 | UT-004, UT-007, UT-012, UT-013, UT-014, UT-015 |
| HAZ-1.1 | 픽셀 데이터 누락 렌더링 실패 | -1 반환 + ParseError | UT-003, UT-010, IT-002 |

### 5.3 엣지 케이스 커버리지 매핑

| 엣지 케이스 | 설명 | 커버 테스트 | 달성 여부 |
|-------------|------|-------------|-----------|
| EC-001 | bufferLength <= 132 시 즉시 -1 | UT-005, UT-012, UT-014 | COVERED |
| EC-002 | bufferLength == 136 시 1회 루프 | UT-004 | COVERED |
| EC-003 | 버퍼 끝 4바이트에 태그 | UT-006, UT-015 | COVERED |
| EC-004 | 동일 group 다른 element | UT-008, UT-018 | COVERED |
| EC-005 | 우연한 0x7FE0 패턴 | UT-010, UT-018 | COVERED |
| EC-006 | view null/undefined | UT-007 - try-catch 간접 방어 | COVERED |
| EC-007 | 대용량 버퍼 성능 | UT-022 | COVERED |

---

## 6. 테스트 파일 구조



### 신규 생성 파일

| 파일 | 유형 | 설명 |
|------|------|------|
| viewer/tests/unit/dicomParser/pixelDataParser.test.js | 테스트 파일 | 22개 단위 테스트 + 5개 통합 테스트 |
| viewer/tests/unit/fixtures/pixelDataTagBuffer.js | 픽스처 | 5종 테스트 버퍼 생성 함수 |


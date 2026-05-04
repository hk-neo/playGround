# 기능 명세서: findPixelDataTag() - DICOM 픽셀 데이터 태그 폴백 탐색

**Feature Branch**: `PLAYG-1830-find-pixel-data-tag`
**Status**: Draft | **Date**: 2026-04-30
**Ticket**: `PLAYG-1830` | **Type**: Detailed Design (SDS-3.11)
**Input**: Jira 티켓 PLAYG-1830 상세 설계 요청

---

## User Scenarios & Testing

### User Story 1 - 픽셀 데이터 태그 선형 탐색 (Priority: P1) :dart: MVP
- **설명**: DICOM 파일의 정상 파싱 경로에서 픽셀 데이터 오프셋을 획득하지 못한 경우, 버퍼 전체를 선형 탐색하여 픽셀 데이터 태그(7FE0,0010)의 시작 위치를 찾는다. metadataParser에서 _pixelDataOffset 캐시가 없을 때 최후 수단으로 호출된다.
- **Why this priority**: 픽셀 데이터 태그 탐색은 DICOM 렌더링의 전제 조건이며, 폴백 함수의 정확한 동작이 전체 파싱 파이프라인의 안정성을 보장한다.
- **Independent Test**: 픽셀 데이터 태그가 특정 오프셋에 위치한 DICOM 버퍼를 생성하여 findPixelDataTag() 호출 후 반환값이 해당 오프셋과 일치하는지 검증한다.
- **Acceptance Scenarios**:
  1. **Given** 픽셀 데이터 태그(7FE0,0010)가 오프셋 1024에 위치한 유효한 DICOM 버퍼이면, **When** findPixelDataTag(view, bufferLength)를 호출하면, **Then** 1024를 반환한다.
  2. **Given** 프리앰블(128바이트) + 매직바이트(4바이트) 직후에 픽셀 데이터 태그가 위치한 버퍼이면, **When** findPixelDataTag(view, bufferLength)를 호출하면, **Then** 오프셋 132를 반환한다.
  3. **Given** 픽셀 데이터 태그가 버퍼 끝 근처에 위치한 경우, **When** findPixelDataTag(view, bufferLength)를 호출하면, **Then** 정확한 오프셋을 반환한다.

### User Story 2 - 태그 미발견 시 안전한 실패 처리 (Priority: P1) :dart: MVP
- **설명**: 버퍼 전체를 탐색했음에도 픽셀 데이터 태그를 발견하지 못한 경우 -1을 반환하여 호출자(parsePixelData)가 ParseError를 발생시킬 수 있도록 한다. 예외를 직접 throw하지 않고 센티넬 값으로 실패를 알린다.
- **Why this priority**: 폴백 함수의 안전한 실패는 상위 호출자의 에러 처리 흐름과 직결되므로 필수적이다.
- **Independent Test**: 픽셀 데이터 태그가 포함되지 않은 버퍼를 입력하여 -1이 반환되는지 확인한다.
- **Acceptance Scenarios**:
  1. **Given** 픽셀 데이터 태그(7FE0,0010)가 포함되지 않은 DICOM 버퍼이면, **When** findPixelDataTag(view, bufferLength)를 호출하면, **Then** -1을 반환한다.
  2. **Given** 반환값이 -1이면, **When** 호출자(parsePixelData)가 이를 수신하면, **Then** ParseError를 발생시킨다.

### User Story 3 - 버퍼 경계 초과 읽기 방지 (Priority: P1) :dart: MVP
- **설명**: DataView 읽기 시 버퍼 경계를 초과하여 읽는 것을 방지한다. for 루프의 상한 조건(offset + 4 <= bufferLength)과 try-catch 예외 처리를 이중으로 적용하여 ArrayBuffer 범위 초과 읽기를 완전히 차단한다.
- **Why this priority**: 메모리 안전성은 의료 소프트웨어의 필수 요구사항이며, IEC 62304 기준에 따라 버퍼 오버런은 심각한 위험(HAZ-5.3)으로 분류된다.
- **Independent Test**: 최소 크기 버퍼와 경계 조건 버퍼를 입력하여 out-of-bounds 읽기가 발생하지 않고 안전하게 종료되는지 확인한다.
- **Acceptance Scenarios**:
  1. **Given** bufferLength가 136(최소 크기 + 4)인 버퍼이면, **When** findPixelDataTag(view, 136)를 호출하면, **Then** 루프가 오프셋 132에서 1회만 실행 후 안전하게 종료된다.
  2. **Given** DataView가 읽기 중 예외를 발생시키는 손상된 버퍼이면, **When** findPixelDataTag(view, bufferLength)를 호출하면, **Then** try-catch가 예외를 포착하고 -1을 반환한다.
  3. **Given** offset + 4 > bufferLength인 경계 상황이면, **When** 루프 조건을 평가하면, **Then** 루프가 실행되지 않고 -1을 반환한다.

### User Story 4 - Little Endian 바이트 오더 매칭 (Priority: P1) :dart: MVP
- **설명**: DataView.getUint16()을 사용하여 Little Endian 바이트 오더로 DICOM 태그의 group과 element를 읽고, 사전 정의된 상수(0x7FE0, 0x0010)와 비교하여 픽셀 데이터 태그를 식별한다.
- **Why this priority**: 대부분의 DICOM 파일이 Little Endian을 사용하므로 기본 지원이 필수적이다.
- **Independent Test**: Big Endian으로 저장된 태그와 Little Endian으로 저장된 태그가 포함된 버퍼에서 Little Endian 태그만 매칭되는지 확인한다.
- **Acceptance Scenarios**:
  1. **Given** 픽셀 데이터 태그가 Little Endian으로 저장된 DICOM 버퍼이면, **When** findPixelDataTag(view, bufferLength)를 호출하면, **Then** 올바른 오프셋을 반환한다.
  2. **Given** 픽셀 데이터 태그가 Big Endian으로 저장된 DICOM 버퍼이면, **When** findPixelDataTag(view, bufferLength)를 호출하면, **Then** 태그를 발견하지 못하고 -1을 반환한다. (TODO-BE: Big Endian 지원 필요)

### User Story 5 - 2바이트 간격 최적화 탐색 (Priority: P2)
- **설명**: DICOM 태그는 항상 짝수 오프셋에 정렬되므로, 2바이트 간격으로 탐색하여 불필요한 반복을 줄인다. 오프셋을 +2씩 증가시켜 시간복잡도를 O(n/2)로 유지한다.
- **Why this priority**: 성능 최적화 항목으로 기능적 정확성에는 영향이 없으나 대용량 파일에서 유의미한 개선을 제공한다.
- **Independent Test**: 동일한 버퍼에 대해 1바이트 간격 탐색과 2바이트 간격 탐색의 결과가 동일한지 확인한다.
- **Acceptance Scenarios**:
  1. **Given** DICOM 태그가 항상 짝수 오프셋에 위치한다는 규칙 하에서, **When** findPixelDataTag()가 2바이트 간격으로 탐색하면, **Then** 1바이트 간격 탐색과 동일한 결과를 반환한다.

### Edge Cases (엣지 케이스)
- **EC-001**: bufferLength가 132 이하인 경우 - 루프가 실행되지 않고 즉시 -1 반환
- **EC-002**: bufferLength가 정확히 136인 경우 - 오프셋 132에서 1회만 읽기 시도
- **EC-003**: 픽셀 데이터 태그가 버퍼 마지막 4바이트에 위치한 경우 - 정확한 오프셋 반환
- **EC-004**: 동일한 group(0x7FE0)에 다른 element가 있는 경우 - element 비교에서 불일치하여 스킵
- **EC-005**: 버퍼에 0x7FE0 패턴이 우연히 등장하지만 element가 0x0010이 아닌 경우 - 오프셋 반환하지 않음
- **EC-006**: view가 null 또는 undefined인 경우 - [NEEDS CLARIFICATION] 함수 진입 시 명시적 검증 여부 (현재 설계에는 명시되지 않음)
- **EC-007**: 매우 큰 버퍼(수십 MB 이상) - O(n/2) 선형 탐색으로 인한 성능 저하 가능 (폴백 경로에서만 실행되므로 실제 영향 제한적)

---

## Requirements

### Functional Requirements (기능 요구사항)
- **FR-1.4**: 시스템은 DICOM 파일에서 픽셀 데이터 태그(7FE0,0010)를 탐색하고 바이너리 복셀 데이터를 추출해야 함
- **FR-1.5**: 시스템은 픽셀 데이터 오프셋과 길이를 메타데이터 기반으로 검증하고, 불일치 시 경고를 발생해야 함
- **FR-2.4**: 시스템은 추출된 복셀 데이터를 ArrayBuffer 형태로 상위 모듈(parseDICOM)에 제공해야 함
- **FR-4.5**: 시스템은 버퍼 null, 파일 크기 초과, 태그 미발견, 오프셋 범위 초과 시 구조화된 에러(ParseError)를 throw해야 함
- **FR-5.1**: 시스템은 예상/실제 픽셀 데이터 길이 불일치 시 경고(warning)를 반환 객체에 포함해야 함
- **FR-5.2**: 시스템은 길이 불일치 경고에 code, message, severity 필드를 포함한 구조화된 객체를 사용해야 함

- **FR-001**: 시스템은 DataView와 bufferLength를 입력받아 픽셀 데이터 태그의 시작 오프셋을 반환하는 findPixelDataTag(view, bufferLength) 함수를 제공해야 한다. 함수 시그니처: findPixelDataTag(view: DataView, bufferLength: number): number (추적: FR-1.4)

- **FR-002**: 시스템은 탐색 대상 태그를 상수로 정의해야 한다. targetGroup = 0x7FE0, targetElement = 0x0010. 이 값은 constants.js의 PIXEL_DATA_TAG와 일치해야 한다. (추적: FR-1.4)

- **FR-003**: 시스템은 탐색 시작 오프셋을 132로 설정해야 한다. 이는 DICOM 프리앰블(128바이트) + 매직바이트 'DICM'(4바이트) 이후의 첫 번째 태그 위치이다. (추적: FR-1.1)

- **FR-004**: 시스템은 for 루프로 오프셋 132부터 (bufferLength - 4)까지 2바이트 간격(+2)으로 순차 탐색해야 한다. 루프 조건: offset + 4 <= bufferLength. (추적: NFR-1)

- **FR-005**: 시스템은 각 오프셋에서 DataView.getUint16(offset, true)로 group을 읽고, DataView.getUint16(offset + 2, true)로 element를 읽어야 한다. Little Endian(littleEndian=true)을 사용한다. (추적: FR-2.2)

- **FR-006**: 시스템은 group === 0x7FE0 && element === 0x0010 조건이 일치하면 해당 offset을 즉시 반환해야 한다. (추적: FR-1.4)

- **FR-007**: 시스템은 DataView 읽기 중 예외 발생 시 try-catch로 포착하여 루프를 탈출하고 -1을 반환해야 한다. 예외가 호출자로 전파되지 않아야 한다. (추적: HAZ-5.3)

- **FR-008**: 시스템은 루프가 정상 종료된 후(모든 오프셋 탐색 완료) -1을 반환해야 한다. 이는 픽셀 데이터 태그가 버퍼에 존재하지 않음을 의미한다. (추적: FR-1.4)

- **FR-009**: 시스템은 bufferLength가 132 이하인 경우 루프를 실행하지 않고 즉시 -1을 반환해야 한다. (추적: HAZ-5.3)

### Non-Functional Requirements (비기능 요구사항)

- **NFR-001 (안전성)**: 모든 DataView 읽기는 try-catch 블록으로 보호되어야 하며, 예외 발생 시 함수가 안전하게 종료되어야 한다. 루프 상한 조건(offset + 4 <= bufferLength)으로 out-of-bounds 읽기를 1차 방어하고, try-catch로 2차 방어한다. (추적: HAZ-5.3)

- **NFR-002 (성능)**: DICOM 태그의 짝수 정렬 특성을 활용하여 2바이트 간격으로 탐색함으로써 시간복잡도를 O(n/2)로 유지해야 한다. 정상 경로에서는 metadataParser가 _pixelDataOffset을 캐시하므로 본 함수는 폴백 경로에서만 실행된다. (추적: NFR-1)

- **NFR-003 (안전 등급)**: IEC 62304 Class A에 해당하는 비진단 경로의 폴백 함수이다. 진단 결과에 직접적 영향을 미치지 않는다.

- **NFR-004 (확장성)**: 현재 Little Endian(true)만 검사한다. Big Endian DICOM 파일 지원 시 양방향 검사 로직 추가가 필요하다. (TODO-BE)

### Key Entities (핵심 데이터 모델)
- **voxelData**: ArrayBuffer - 추출된 복셀 바이너리 데이터. 상위 모듈에서 TypedArray로 변환하여 렌더링에 사용
- **warnings**: Array<{code: string, message: string, severity: string}> - 길이 불일치 등 비치명적 문제 경고 목록
- **pixelDataOffset**: number - 버퍼 내 픽셀 데이터 시작 위치(바이트). 명시적 전달 또는 findPixelDataTag()로 탐색
- **pixelDataLength**: number - 픽셀 데이터 길이(바이트). 명시적 전달 또는 buffer剩余 길이로 계산

- **findPixelDataTag**: module-private 폴백 함수. 입력: DataView, bufferLength. 출력: 태그 오프셋(number) 또는 -1. 프리앰블 이후부터 2바이트 간격으로 선형 탐색하여 픽셀 데이터 태그(7FE0,0010)의 위치를 찾는다. export되지 않는 비공개 함수이다.
- **PIXEL_DATA_TAG (constants.js)**: 대상 태그 식별자 상수. group: 0x7FE0, element: 0x0010. findPixelDataTag()의 탐색 대상이다.
- **parsePixelData()**: findPixelDataTag()의 유일한 호출자. pixelDataOffset 누락 시 폴백으로 호출하며, -1 반환 시 ParseError를 발생시킨다.

### 연관 모듈 의존성

| 모듈 | 함수/상수 | 역할 | 연관 SDS |
|------|-----------|------|----------|
| DataView (Web API) | getUint16() | 바이트 단위 읽기 (Little Endian) | - |
| pixelDataParser | parsePixelData() | 픽셀 데이터 파싱, 본 함수의 유일한 호출자 | SDS-3.11 |
| constants | PIXEL_DATA_TAG | 대상 태그 식별자 정의 (0x7FE0, 0x0010) | - |
| CBVError | ParseError | 태그 미발견 시 호출자가 발생시키는 에러 클래스 | - |

### 사전조건 및 사후조건

**사전조건 (Pre-conditions):**
- view는 유효한 DataView 객체여야 한다
- bufferLength > 132 (DICOM 최소 파일 크기: 프리앰블 128 + 매직바이트 4)

**사후조건 (Post-conditions):**
- 반환값 >= 0: 픽셀 데이터 태그(7FE0,0010)의 시작 오프셋
- 반환값 === -1: 태그 미발견 (호출자가 ParseError 발생)

### 위험 분석

| 위험 ID | 위험 내용 | 심각도 | 완화 조치 |
|---------|-----------|--------|-----------|
| HAZ-5.3 | ArrayBuffer 범위 초과 읽기 | 중 | 루프 상한 조건(offset + 4 <= bufferLength) 및 try-catch 이중 방어 |
| HAZ-1.1 | 픽셀 데이터 누락으로 인한 렌더링 실패 | 중 | -1 반환 후 호출자가 ParseError 발생 |

---

## Success Criteria

### Measurable Outcomes (측정 가능한 지표)

- **SC-001**: 픽셀 데이터 태그(7FE0,0010)가 포함된 DICOM 버퍼에서 정확한 태그 시작 오프셋이 반환된다.
- **SC-002**: 픽셀 데이터 태그가 포함되지 않은 DICOM 버퍼에서 -1이 반환된다.
- **SC-003**: bufferLength가 132 이하인 버퍼에서 루프가 실행되지 않고 즉시 -1이 반환된다.
- **SC-004**: DataView 읽기 예외 발생 시 try-catch가 포착하여 -1이 반환되고, 예외가 호출자로 전파되지 않는다.
- **SC-005**: 버퍼 경계 조건(offset + 4 > bufferLength)에서 out-of-bounds 읽기가 발생하지 않는다.
- **SC-006**: 정상 파싱 경로에서는 본 함수가 호출되지 않으며, 오직 폴백 경로에서만 실행된다.
- **SC-007**: 2바이트 간격 탐색 결과가 1바이트 간격 탐색 결과와 정확히 일치한다 (DICOM 태그 짝수 정렬 보장).

### Definition of Done

- [ ] 모든 FR-001 ~ FR-009 요구사항 구현 완료
- [ ] findPixelDataTag() 함수가 8단계 탐색 알고리즘을 정확히 수행
- [ ] 단위 테스트 커버리지 90% 이상 (findPixelDataTag 함수)
- [ ] Edge Case 시나리오(EC-001 ~ EC-007) 검증 완료
- [ ] DataView 예외 발생 시 안전한 종료 확인
- [ ] 버퍼 경계 초과 읽기 방지 확인
- [ ] 태그 미발견 시 -1 반환 및 호출자 ParseError 발생 확인
- [ ] 기존 parsePixelData() 통합 테스트 회귀 없음
- [ ] 코드 리뷰 승인

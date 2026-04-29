# 기능 명세서: parsePixelData() - 픽셀데이터 추출

**Feature Branch**: 
**Status**: Draft | **Date**: 2026-04-30
**Ticket**:  | **Type**: Detailed Design (SDS-3.10)
**Input**: Jira 티켓 PLAYG-1829 상세 설계 요청

---

## User Scenarios & Testing

### User Story 1 - DICOM 버퍼에서 복셀 데이터 추출 (Priority: P1) :dart: MVP
- **설명**: DICOM 파일 버퍼(ArrayBuffer)와 메타데이터 객체를 입력받아 픽셀 데이터 태그(7FE0,0010) 위치를 탐색하고, 바이너리 복셀 데이터를 ArrayBuffer로 추출한다. 명시적 오프셋/길이가 제공되면 즉시 사용하고, 미제공 시 findPixelDataTag()로 폴백 탐색한다.
- **Why this priority**: 복셀 데이터 추출은 DICOM 뷰어 렌더링 파이프라인의 핵심이며, 모든 영상 표시 기능의 전제 조건이다.
- **Independent Test**: 유효한 DICOM 버퍼와 메타데이터를 parsePixelData()에 전달하여 반환된 voxelData ArrayBuffer의 크기와 내용을 직접 검증한다.
- **Acceptance Scenarios**:
  1. **Given** 유효한 DICOM 버퍼와 메타데이터(rows=512, columns=512, bitsAllocated=16, samplesPerPixel=1)가 제공되고 명시적 pixelDataOffset과 pixelDataLength가 전달되면, **When** parsePixelData(buffer, metadata, offset, length)를 호출하면, **Then** 해당 오프셋/길이로 슬라이스된 voxelData ArrayBuffer를 반환한다.
  2. **Given** 유효한 DICOM 버퍼에서 pixelDataOffset/pixelDataLength가 생략되면, **When** parsePixelData(buffer, metadata)를 호출하면, **Then** findPixelDataTag()로 Tag(7FE0,0010)을 탐색하여 복셀 데이터를 추출한다.
  3. **Given** 예상 길이(rows*columns*bytesPerPixel*samplesPerPixel)와 실제 길이가 일치하면, **When** 추출 완료 후, **Then** warnings 배열이 비어있다.

### User Story 2 - 버퍼 null 및 파일 크기 초과 입력 검증 (Priority: P1) :dart: MVP
- **설명**: null 버퍼나 512MB 초과 버퍼가 입력되면 즉시 구조화된 ParseError를 throw하여 런타임 충돌을 방지한다. MAX_FILE_SIZE 상수를 통해 메모리 과다 사용을 사전 차단한다.
- **Why this priority**: 입력 검증은 안전 등급 IEC 62304 Class A의 기본 요구사항이며, null 참조나 메모리 초과로 인한 브라우저 크래시를 방지해야 한다.
- **Independent Test**: null 버퍼와 512MB 초과 버퍼를 각각 입력하여 PARSE_ERR_PIXEL_DATA_EXTRACTION 및 PARSE_ERR_FILE_TOO_LARGE 에러가 throw되는지 확인한다.
- **Acceptance Scenarios**:
  1. **Given** buffer가 null이면, **When** parsePixelData(null, metadata)를 호출하면, **Then** PARSE_ERR_PIXEL_DATA_EXTRACTION 에러 코드로 ParseError를 throw한다.
  2. **Given** buffer.byteLength가 MAX_FILE_SIZE(512MB)를 초과하면, **When** parsePixelData(oversizedBuffer, metadata)를 호출하면, **Then** PARSE_ERR_FILE_TOO_LARGE 에러 코드로 ParseError를 throw한다.

### User Story 3 - 픽셀 데이터 태그 미발견 및 오프셋 범위 보호 (Priority: P1) :dart: MVP
- **설명**: findPixelDataTag()가 Tag(7FE0,0010)을 발견하지 못하거나, 결정된 오프셋이 유효 범위를 벗어나면 즉시 ParseError를 throw한다. 잘못된 오프셋으로의 접근을 원천 차단한다.
- **Why this priority**: 잘못된 오프셋 접근은 ArrayBuffer 범위 초과 에러(Uint8Array/Float32Array 생성 실패)의 직접적 원인이 되므로 사전 검증이 필수다.
- **Independent Test**: 픽셀 데이터 태그가 없는 버퍼와 음수 오프셋을 각각 입력하여 에러가 throw되는지 확인한다.
- **Acceptance Scenarios**:
  1. **Given** 버퍼에 Tag(7FE0,0010)이 존재하지 않고 명시적 pixelDataOffset도 없으면, **When** parsePixelData(buffer, metadata)를 호출하면, **Then** findPixelDataTag()가 -1을 반환하고 PARSE_ERR_PIXEL_DATA_EXTRACTION 에러로 ParseError를 throw한다.
  2. **Given** resolvedOffset이 음수이거나 buffer.byteLength 이상이면, **When** 오프셋 검증 단계에서, **Then** PARSE_ERR_PIXEL_DATA_EXTRACTION 에러로 ParseError를 throw한다.

### User Story 4 - 예상/실제 길이 불일치 경고 보고 (Priority: P2)
- **설명**: 메타데이터 기반 예상 길이(rows*columns*bytesPerPixel*samplesPerPixel)와 실제 픽셀 데이터 길이가 불일치하면 기능은 정상 동작하되 PARSE_WARN_PIXEL_LENGTH_MISMATCH 경고를 warnings 배열에 추가한다. 렌더링은 가능하나 데이터 무결성 의심을 상위 모듈에 전달한다.
- **Why this priority**: 길이 불일치는 렌더링 실패의 간접 지표이나, 데이터 자체는 유효할 수 있어 경고 수준으로 처리하는 것이 적절하다.
- **Independent Test**: 의도적으로 예상 길이와 다른 버퍼를 입력하여 warnings 배열에 code가 PARSE_WARN_PIXEL_LENGTH_MISMATCH인 항목이 포함되는지 확인한다.
- **Acceptance Scenarios**:
  1. **Given** expectedLength과 resolvedLength가 다르면, **When** 길이 검증 단계에서, **Then** warnings 배열에 {code: PARSE_WARN_PIXEL_LENGTH_MISMATCH, message: ..., severity: warn} 객체가 추가된다.
  2. **Given** expectedLength과 resolvedLength가 일치하면, **When** 길이 검증 단계에서, **Then** warnings 배열에 해당 경고가 추가되지 않는다.

### User Story 5 - findPixelDataTag() 태그 탐색 (Priority: P1) :dart: MVP
- **설명**: DataView와 버퍼 길이를 입력받아 오프셋 132부터 2바이트 간격으로 순회하며 Little Endian 바이트 오더로 group=0x7FE0, element=0x0010을 매칭한다. 매칭 성공 시 오프셋을 반환하고, 실패 시 -1을 반환한다.
- **Why this priority**: 명시적 오프셋이 없을 때 유일한 폴백 수단이며, 픽셀 데이터 추출의 필수 전제 기능이다.
- **Independent Test**: 픽셀 데이터 태그가 포함된 버퍼에서 올바른 오프셋이 반환되는지, 미포함 버퍼에서 -1이 반환되는지 확인한다.
- **Acceptance Scenarios**:
  1. **Given** 오프셋 132에 group=0x7FE0, element=0x0010이 Little Endian으로 저장된 버퍼이면, **When** findPixelDataTag(view, bufferLength)를 호출하면, **Then** 해당 오프셋(태그 시작 위치)을 반환한다.
  2. **Given** Tag(7FE0,0010)이 전혀 없는 버퍼이면, **When** findPixelDataTag(view, bufferLength)를 호출하면, **Then** -1을 반환한다.

### Edge Cases (엣지 케이스)
- **EC-001**: buffer는 유효하나 metadata 필드(rows, columns, bitsAllocated)가 누락된 경우 - NaN/undefined 계산 방지를 위한 기본값 처리 필요
- **EC-002**: pixelDataOffset은 유효하나 pixelDataLength만 제공된 경우 - offset 없이 length만으로는 시작점을 알 수 없어 findPixelDataTag() 폴백 필요
- **EC-003**: buffer 끝에 픽셀 데이터가 위치하여 endOffset이 byteLength를 초과하는 경우 - Math.min(endOffset, byteLength)로 안전한 슬라이스 보장
- **EC-004**: 0바이트 픽셀 데이터(resolvedLength === 0)인 경우 - 빈 ArrayBuffer 반환 여부 확인 필요
- **EC-005**: Big Endian 전송 구문의 DICOM 파일 - 현재 Little Endian만 지원, TODO 항목으로 명시

---

## Requirements

### Functional Requirements (기능 요구사항)
- **FR-1.4**: 시스템은 DICOM 파일에서 픽셀 데이터 태그(7FE0,0010)를 탐색하고 바이너리 복셀 데이터를 추출해야 함
- **FR-1.5**: 시스템은 픽셀 데이터 오프셋과 길이를 메타데이터 기반으로 검증하고, 불일치 시 경고를 발생해야 함
- **FR-2.4**: 시스템은 추출된 복셀 데이터를 ArrayBuffer 형태로 상위 모듈(parseDICOM)에 제공해야 함
- **FR-4.5**: 시스템은 버퍼 null, 파일 크기 초과, 태그 미발견, 오프셋 범위 초과 시 구조화된 에러(ParseError)를 throw해야 함
- **FR-5.1**: 시스템은 예상/실제 픽셀 데이터 길이 불일치 시 경고(warning)를 반환 객체에 포함해야 함
- **FR-5.2**: 시스템은 길이 불일치 경고에 code, message, severity 필드를 포함한 구조화된 객체를 사용해야 함

### Non-Functional Requirements (비기능 요구사항)
- **NFR-3 (성능)**: 512MB 이하 파일은 1초 이내에 픽셀 데이터 추출 완료 (2바이트 간격 순회 최적화)
- **NFR-4 (보안)**: MAX_FILE_SIZE(512MB) 하드 리밋으로 메모리 과다 사용 방지
- **NFR-5 (안전)**: IEC 62304 Class A 등급에 따른 입력 검증 및 에러 보고 체계 준수

### Key Entities (핵심 데이터 모델)
- **voxelData**: ArrayBuffer - 추출된 복셀 바이너리 데이터. 상위 모듈에서 TypedArray로 변환하여 렌더링에 사용
- **warnings**: Array<{code: string, message: string, severity: string}> - 길이 불일치 등 비치명적 문제 경고 목록
- **pixelDataOffset**: number - 버퍼 내 픽셀 데이터 시작 위치(바이트). 명시적 전달 또는 findPixelDataTag()로 탐색
- **pixelDataLength**: number - 픽셀 데이터 길이(바이트). 명시적 전달 또는 buffer剩余 길이로 계산

---

## Success Criteria

### Measurable Outcomes (측정 가능한 지표)
- **SC-001**: 유효한 DICOM 버퍼 입력 시 올바른 크기의 voxelData ArrayBuffer 반환 (100% 성공률)
- **SC-002**: null/초과 버퍼 입력 시 100% ParseError throw (0% 런타임 충돌)
- **SC-003**: 길이 불일치 시 100% PARSE_WARN_PIXEL_LENGTH_MISMATCH 경고 포함
- **SC-004**: findPixelDataTag() 정확도 - 올바른 태그 오프셋 반환 (유효 버퍼 100%)

### Definition of Done
- [ ] parsePixelData() 및 findPixelDataTag() export 함수 구현 완료
- [ ] TC-3.10.1 ~ TC-3.10.5 단위 테스트 5건 통과
- [ ] 기존 251개 테스트 회귀 검증 통과
- [ ] 코드 리뷰 승인
- [ ] IEC 62304 Class A 안전성 검증 완료
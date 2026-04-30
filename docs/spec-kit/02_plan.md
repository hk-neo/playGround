# Implementation Plan: parsePixelData() - 픽셀데이터 추출

**Branch**: `feature/PLAYG-1829` | **Date**: 2026-04-30 | **Spec**: `docs/spec-kit/01_spec.md`
**Ticket**: `PLAYG-1829` | **Type**: Detailed Design (SDS-3.10)

---

## Summary

DICOM 파일의 ArrayBuffer에서 픽셀 데이터 태그(7FE0,0010)를 탐색하고 바이너리 복셀 데이터를 추출하는 `parsePixelData()` 함수의 구현 계획이다.
이 함수는 명시적 오프셋/길이가 제공되면 즉시 사용하고, 미제공 시 `findPixelDataTag()`로 폴백 탐색한다.
6단계 처리 절차(입력 검증 -> 오프셋 결정 -> 예상 길이 계산 -> 실제 길이 검증 -> 데이터 추출 -> 결과 반환)를 통해
IEC 62304 Class A 안전 등급 요구사항을 충족하는 구조화된 결과를 반환한다.

---

## Technical Context

| 항목 | 내용 |
| --- | --- |
| **Language/Version** | JavaScript (ES2020+), Vanilla JS, 외부 프레임워크 없음 |
| **Primary Dependencies** | constants.js (ERROR_CODES, MAX_FILE_SIZE), CBVError.js (ParseError), dicomDictionary.js (makeTagKey) |
| **Storage** | 인메모리 전용 (ArrayBuffer/DataView), 네트워크 통신 없음 |
| **Testing** | Vitest 단위 테스트 (90% 이상 커버리지 목표) |
| **Target Platform** | 모던 브라우저 (Chrome, Firefox, Edge), 로컬 파일 전용 |
| **Performance Goals** | findPixelDataTag() 2바이트 간격 순회 최적화, 512MB 이하 1초 내 추출 |
| **Constraints** | IEC 62304 Class A, 오프라인 전용, CSP connect-src none, 외부 라이브러리 금지 |

---

## Constitution Check
*GATE: 설계 원칙(Constitution) 준수 여부 확인*

- **SOLID 원칙**: SRP 준수 - parsePixelData()는 복셀 데이터 추출 단일 책임 수행. 태그 탐색은 findPixelDataTag()로 분리, 에러 생성은 CBVError.ParseError에 위임하여 책임 분리.
- **레이어 분리**: Data Access Layer(COMP-1.1 DicomParser)에 위치. parseDICOM.js에서 호출되는 하위 모듈로, Business Logic Layer나 Presentation Layer에 의존하지 않음.
- **에러 처리 전략**: CBVError.ParseError 기반 구조화된 에러 코드 체계(PARSE_ERR_PIXEL_DATA_EXTRACTION, PARSE_ERR_FILE_TOO_LARGE). 치명적 에러는 throw, 비치명적 불일치는 warnings 배열에 기록하는 이중 처리 전략.
- **보안 고려사항**: MAX_FILE_SIZE(512MB) 하드 리밋으로 메모리 과다 사용 방지. buffer.slice()는 원본 버퍼를 수정하지 않는 안전한 복사본 생성.

---

## Project Structure

### Documentation


### Source Code


---

## Implementation Approach

### Phase 순서 및 접근 방식
1. **Setup**: pixelDataParser.js 모듈 파일 생성, constants.js에서 ERROR_CODES 및 MAX_FILE_SIZE 임포트 확인
2. **Core Implementation**: findPixelDataTag() 탐색 함수 구현 후 parsePixelData() 6단계 파이프라인 구현
3. **Testing**: TC-3.10.1~TC-3.10.5 단위 테스트 작성, 기존 251개 테스트 회귀 검증
4. **Integration**: parseDICOM.js 파이프라인 Step 6에서 parsePixelData() 호출 연동

### Key Technical Decisions
- **결정 1**: findPixelDataTag()는 2바이트 간격 순회 - 이유: DICOM 태그 정렬 규칙에 근거하여 group(2바이트)+element(2바이트) 단위로 비교하면 탐색 효율이 최적화됨
- **결정 2**: 길이 불일치 시 throw가 아닌 warnings 배열 기록 - 이유: DICOM 파일의 패딩 바이트나 프레임 누락 등 다양한 원인으로 길이 불일치가 발생할 수 있으나, 데이터 자체는 렌더링에 사용 가능한 경우가 많음
- **결정 3**: Math.min(endOffset, byteLength) 안전 슬라이스 - 이유: buffer.slice()는 endOffset이 byteLength를 초과해도 에러를 발생시키지 않으나, 의도치 않은 빈 버퍼 반환을 방지하기 위해 명시적 클램핑 수행
- **결정 4**: pixelDataOffset/pixelDataLength 선택 매개변수 - 이유: metadataParser에서 캐싱된 값이 있으면 불필요한 태그 탐색을 생략하여 성능 최적화

### parsePixelData() 6단계 처리 절차 상세

#### Step 1: 입력 검증
- buffer null 체크: null/undefined 시 PARSE_ERR_PIXEL_DATA_EXTRACTION throw
- MAX_FILE_SIZE(512MB) 초과 검증: byteLength > MAX_FILE_SIZE 시 PARSE_ERR_FILE_TOO_LARGE throw

#### Step 2: 오프셋 결정
- 명시적 pixelDataOffset 전달 시: resolvedOffset = pixelDataOffset 즉시 사용
- 미전달 시: findPixelDataTag(new DataView(buffer), buffer.byteLength) 폴백 탐색
- 탐색 실패(-1) 시: PARSE_ERR_PIXEL_DATA_EXTRACTION throw

#### Step 3: 예상 길이 계산
- expectedLength = rows * columns * bytesPerPixel * samplesPerPixel
- bytesPerPixel = bitsAllocated / 8 (metadata 기반)
- metadata 필드 누락 시 NaN 방지를 위한 기본값 처리

#### Step 4: 실제 길이 검증
- pixelDataLength 미제공 시: resolvedLength = byteLength - resolvedOffset (버퍼 잔여)
- pixelDataLength 제공 시: resolvedLength = pixelDataLength
- expectedLength !== resolvedLength 시: PARSE_WARN_PIXEL_LENGTH_MISMATCH 경고 추가

#### Step 5: 데이터 추출
- endOffset = resolvedOffset + resolvedLength
- endOffset = Math.min(endOffset, buffer.byteLength) // 안전한 슬라이스
- voxelData = buffer.slice(resolvedOffset, endOffset)

#### Step 6: 결과 반환
- 반환 객체: { voxelData: ArrayBuffer, warnings: Array }

---

## Complexity Tracking
- findPixelDataTag()의 2바이트 간격 순회는 DICOM Implicit VR LE 전송 구문에서만 정확 동작 보장. Explicit VR LE에서는 VR 필드(2바이트)로 인해 오프셋 정렬이 달라질 수 있으나, Tag(7FE0,0010)은 항상 pixel data 시작점이므로 실제 영향은 미미함
- Big Endian 전송 구문 지원은 TODO 항목으로 남김 (현재 Little Endian만 지원)

---

## References
- Spec: `docs/spec-kit/01_spec.md`
- 티켓: `PLAYG-1829`
- 추적: SAD COMP-1 (DicomParser), SDS Document PLAYG-1815
- 관련 요구사항: FR-1.4, FR-1.5, FR-2.4, FR-4.5, FR-5.1, FR-5.2
- 안전 등급: IEC 62304 Class A
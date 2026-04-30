# Implementation Plan: findPixelDataTag() - DICOM 픽셀 데이터 태그 폴백 탐색

**Branch**: `feature/PLAYG-1830-find-pixel-data-tag`
**Date**: 2026-04-30 | **Spec**: `docs/spec-kit/01_spec.md`
**Ticket**: `PLAYG-1830` | **Type**: Detailed Design (SDS-3.11)

---

## Summary

DICOM 파일의 정상 파싱 경로에서 픽셀 데이터 오프셋을 획득하지 못한 경우,
버퍼 전체를 선형 탐색하여 픽셀 데이터 태그(7FE0,0010)의 시작 위치를 찾는
폴백 함수 `findPixelDataTag(view, bufferLength)`의 구현 계획서이다.

본 함수는 `pixelDataParser.js` 내부의 module-private 비공개 함수로서,
동일 파일의 export 함수 `parsePixelData()`에서만 호출된다.
IEC 62304 Class A 안전 등급에 해당하는 비진단 경로의 폴백 처리를 담당한다.

### 핵심 설계 결정

| 결정 항목 | 선택 | 사유
|-----------|------|------
| 탐색 전략 | 2바이트 간격 선형 탐색 | DICOM 태그 짝수 정렬 특성 활용, O(n/2) 보장
| 바이트 오더 | Little Endian(true) 고정 | 대부분의 DICOM 파일이 LE 사용, BE는 TODO-BE로 이관
| 실패 표현 | -1 반환 (센티넬 값) | 예외를 직접 throw하지 않고 호출자가 ParseError 처리
| 예외 방어 | 루프 상한 + try-catch 이중 방어 | HAZ-5.3 ArrayBuffer 범위 초과 완전 차단
| 가시성 | module-private (export 없음) | parsePixelData()만 유일한 호출자, 외부 노출 불필요

---

## Technical Context

### 시스템 환경

| 항목 | 내용
|------|------
| 런타임 | 브라우저 (ES2020+), DataView Web API
| 모듈 시스템 | ES Module (import/export)
| 대상 파일 | `viewer/src/data/dicomParser/pixelDataParser.js`
| 의존 모듈 | `constants.js` (PIXEL_DATA_TAG), DataView Web API
| 안전 등급 | IEC 62304 Class A (비진단 경로 폴백)

### 관련 위험 (Hazard)

| 위험 ID | 내용 | 심각도 | 완화 전략
|---------|------|--------|-----------| HAZ-5.3 | ArrayBuffer 범위 초과 읽기 | 중 | 루프 상한(offset+4<=bufferLength) + try-catch 이중 방어
| HAZ-1.1 | 픽셀 데이터 누락으로 렌더링 실패 | 중 | -1 반환 후 호출자(parsePixelData)가 ParseError 발생

### 추적성 매핑

| 추적 ID | 요구사항 | 구현 단계
|---------|----------|-----------| FR-1.4 | 픽셀 데이터 태그 오프셋 반환 | STEP 1~7
| FR-2.2 | Little Endian 바이트 오더 읽기 | STEP 4, 5
| NFR-1 | 버퍼 경계 안전성 | STEP 3, 6

### 제약사항

- 폴백 경로에서만 실행: 정상 파싱 시 호출되지 않음
- Little Endian 전용: Big Endian DICOM은 TODO-BE로 이관
- DataView 읽기에만 의존: 추가 메모리 할당 없음
- 단일 스레드: 비동기 처리 불필요
---

## Constitution Check

### IEC 62304 Class A 적합성 검토

| 검토 항목 | 결과 | 근거
|-----------|------|------
| 비진단 경로 여부 | PASS | 픽셀 데이터 태그 탐색은 렌더링 전처리, 진단 결과에 직접 영향 없음
| 단일 진입/진출점 | PASS | 함수 진입 1개, 반환 경로 3개(매치 시 offset, 루프 종료 시 -1, 예외 시 -1)
| 입력 검증 | PASS | bufferLength 조건 검사로 무효 입력 조기 반환
| 예외 전파 금지 | PASS | try-catch로 모든 예외를 함수 내부에서 흡수
| 메모리 안전성 | PASS | 루프 상한 + try-catch 이중 방어로 OOB 읽기 차단

### 소프트웨어 안전 등급 분류

````
Class C (생명 위협)  -> 해당 없음
Class B (간접 진단)  -> 해당 없음
Class A (비진단)     -> *** 본 함수 해당 ***
```

본 함수는 픽셀 데이터 태그의 물리적 위치를 탐색하는 유틸리티 성격의
폴백 함수로, 진단 알고리즘이나 치료 결정에 관여하지 않으므로
Class A로 분류한다. 실패 시 호출자가 ParseError를 발생시켜
사용자에게 명확한 에러 메시지를 제공하는 구조이다.
---

## Project Structure

```
viewer/src/data/dicomParser/
  constants.js              # DICOM 태그 상수 정의 (PIXEL_DATA_TAG 포함)
  pixelDataParser.js        # findPixelDataTag() + parsePixelData() 위치

viewer/tests/unit/dicomParser/
  pixelDataParser.test.js   # findPixelDataTag() 단위 테스트

viewer/tests/integration/
  dicomParsePipeline.test.js  # parsePixelData() 통합 테스트 (폴백 경로 포함)
```

### 파일별 변경 범위

| 파일 | 변경 유형 | 변경 내용
|------|-----------|-----------| `pixelDataParser.js` | **수정** | findPixelDataTag() 함수 추가 (module-private)
| `constants.js` | **확인** | PIXEL_DATA_TAG 상수 존재 및 값 일치 확인 (변경 가능성 낮음)
| `pixelDataParser.test.js` | **신규** | findPixelDataTag() 단위 테스트 작성
| `dicomParsePipeline.test.js` | **수정** | 폴백 경로 통합 테스트 케이스 추가

### 함수 배치 구조 (pixelDataParser.js 내부)

```javascript
import { PIXEL_DATA_TAG } from './constants.js';

/**
 * DICOM 버퍼에서 픽셀 데이터 태그(7FE0,0010)의 오프셋을 선형 탐색한다.
 * module-private: export되지 않는 내부 폴백 함수
 * @param {DataView} view - DICOM 파일의 DataView
 * @param {number} bufferLength - 버퍼 전체 길이(바이트)
 * @returns {number} 태그 시작 오프셋, 미발견 시 -1
 */
function findPixelDataTag(view, bufferLength) { ... }

export function parsePixelData(...) {
    // ... 정상 경로 실패 시 ...
    const offset = findPixelDataTag(view, bufferLength);
    if (offset === -1) { throw new ParseError(...); }
    // ...
}
```
---

## Implementation Approach

### STEP 1: 함수 시그니처 정의 및 입력 검증

**목표**: 함수의 진입점을 정의하고, 유효하지 않은 입력을 조기에 거른다.

**구현 내용**:
```javascript
function findPixelDataTag(view, bufferLength) {
    const DICOM_PREAMBLE_SIZE = 132;  // 128(프리앰블) + 4(DICM 매직바이트)
    if (bufferLength <= DICOM_PREAMBLE_SIZE) {
        return -1;
    }
```

| 항목 | 내용
|------|------
| 요구사항 | FR-001, FR-009
| 위험 완화 | HAZ-5.3 (bufferLength <= 132 시 루프 미실행으로 OOB 방지)
| 엣지 케이스 | EC-001 (bufferLength <= 132), EC-002 (bufferLength == 136)
| 테스트 | bufferLength=0, 131, 132, 133 입력 시 -1 반환 확인

### STEP 2: 탐색 상수 정의

**목표**: 대상 태그의 group/element 식별자를 상수로 정의한다.

**구현 내용**:
```javascript
    const targetGroup = PIXEL_DATA_TAG.group;   // 0x7FE0
    const targetElement = PIXEL_DATA_TAG.element; // 0x0010
```

| 항목 | 내용
|------|------| 요구사항 | FR-002
| 의존성 | constants.js의 PIXEL_DATA_TAG
| 주의점 | constants.js에 PIXEL_DATA_TAG가 {group, element} 형태로 존재하는지 사전 확인 필요
| 테스트 | 상수 값이 0x7FE0, 0x0010과 일치하는지 검증

### STEP 3: 프리앰블 스킵 및 루프 초기화

**목표**: DICOM 프리앰블 이후부터 탐색을 시작하도록 루프를 설정한다.

**구현 내용**:
```javascript
    let offset = DICOM_PREAMBLE_SIZE;  // 132
```

| 항목 | 내용
|------|------| 요구사항 | FR-003
| 추적성 | FR-1.1 (프리앰블 구조 이해)
| 테스트 | 오프셋 132에 태그가 있을 때 즉시 반환 확인

### STEP 4: 선형 탐색 루프 (2바이트 간격)

**목표**: 프리앰블 이후부터 버퍼 끝까지 2바이트 간격으로 순차 탐색한다.

**구현 내용**:
```javascript
    for (; offset + 4 <= bufferLength; offset += 2) {
        try {
            const group = view.getUint16(offset, true);
            const element = view.getUint16(offset + 2, true);
```

| 항목 | 내용
|------|------| 요구사항 | FR-004, FR-005
| 위험 완화 | HAZ-5.3 (offset+4 <= bufferLength 조건으로 1차 방어)
| 성능 | NFR-002 (2바이트 간격 = O(n/2) 시간복잡도)
| 테스트 | 루프가 정확한 횟수만큼 순회하는지 확인

### STEP 5: 태그 매치 검사 및 반환

**목표**: 읽어들인 group/element가 대상 태그와 일치하는지 검사한다.

**구현 내용**:
```javascript
            if (group === targetGroup && element === targetElement) {
                return offset;
            }
```

| 항목 | 내용
|------|------| 요구사항 | FR-006
| 추적성 | FR-1.4, FR-2.2
| 엣지 케이스 | EC-004 (동일 group, 다른 element), EC-005 (우연한 패턴 매칭)
| 테스트 | group=0x7FE0, element=0x0010 조합에서만 매칭 확인

### STEP 6: DataView 예외 try-catch 처리

**목표**: DataView 읽기 중 발생 가능한 예외를 안전하게 포착한다.

**구현 내용**:
```javascript
        } catch (e) {
            break;  // 예외 발생 시 루프 탈출
        }
    }
```

| 항목 | 내용
|------|------| 요구사항 | FR-007, NFR-001
| 위험 완화 | HAZ-5.3 (try-catch로 2차 방어)
| 주의점 | 예외를 호출자로 전파하지 않고 break로 루프 탈출 후 -1 반환
| 테스트 | 손상된 DataView 입력 시 예외가 외부로 전파되지 않음 확인

### STEP 7: 미발견 시 센티넬 값 반환

**목표**: 탐색 완료 후 픽셀 데이터 태그를 발견하지 못한 경우 -1을 반환한다.

**구현 내용**:
```javascript
    return -1;
}
```

| 항목 | 내용
|------|------| 요구사항 | FR-008
| 위험 완화 | HAZ-1.1 (호출자가 -1 수신 후 ParseError 발생)
| 테스트 | 태그가 없는 버퍼에서 -1 반환 확인
---

### 전체 함수 코드 (최종 구현본)

```javascript
import { PIXEL_DATA_TAG } from './constants.js';

/**
 * DICOM 버퍼에서 픽셀 데이터 태그(7FE0,0010)의 오프셋을 선형 탐색한다.
 * 정상 파싱 경로에서 오프셋을 찾지 못한 경우 호출되는 폴백 함수.
 * @param {DataView} view - DICOM 파일의 DataView
 * @param {number} bufferLength - 버퍼 전체 길이(바이트)
 * @returns {number} 태그 시작 오프셋, 미발견 시 -1
 */
function findPixelDataTag(view, bufferLength) {
    const DICOM_PREAMBLE_SIZE = 132;
    const targetGroup = PIXEL_DATA_TAG.group;    // 0x7FE0
    const targetElement = PIXEL_DATA_TAG.element; // 0x0010

    if (bufferLength <= DICOM_PREAMBLE_SIZE) {
        return -1;
    }

    for (let offset = DICOM_PREAMBLE_SIZE; offset + 4 <= bufferLength; offset += 2) {
        try {
            const group = view.getUint16(offset, true);
            const element = view.getUint16(offset + 2, true);
            if (group === targetGroup && element === targetElement) {
                return offset;
            }
        } catch (e) {
            break;
        }
    }

    return -1;
}
```

---

## Complexity Tracking

### 순환 복잡도 (Cyclomatic Complexity)

| 항목 | 값 | 기준
|------|-----|------| 순환 복잡도 | 4 | if(입력검증) + for루프 + if(매치) + catch
| 허용 한계 | 10 | IEC 62304 권고 최대값
| 판정 | **PASS** | 4 < 10

### 제어 흐름 경로

| 경로 | 조건 | 결과 | 테스트 필요
|------|------|------|-------------| P1 | bufferLength <= 132 | 즉시 -1 반환 | 필수
| P2 | 루프 중 매치 발견 | offset 반환 | 필수
| P3 | 루프 정상 종료 (매치 없음) | -1 반환 | 필수
| P4 | 루프 중 예외 발생 | break 후 -1 반환 | 필수

### 코드 라인 추정

| 항목 | 라인 수
|------|---------| 함수 본체 | 15줄
| JSDoc 주석 | 6줄
| 총계 | 21줄
| 권고 한계 | 50줄 (Class A)
| 판정 | **PASS**

---

## Test Strategy

### 단위 테스트 (pixelDataParser.test.js)

테스트는 export되지 않는 module-private 함수이므로,
**테스트 전용 내부 접근 패턴**을 사용하거나
parsePixelData()를 통한 간접 테스트로 진행한다.

| 테스트 ID | 시나리오 | 입력 조건 | 기대 결과 | 우선순위
|-----------|----------|-----------|-----------|----------| UT-001 | 정상 태그 발견 | 오프셋 1024에 (7FE0,0010) | 1024 반환 | P1
| UT-002 | 프리앰블 직후 태그 | 오프셋 132에 (7FE0,0010) | 132 반환 | P1
| UT-003 | 태그 미발견 | (7FE0,0010) 없음 | -1 반환 | P1
| UT-004 | 최소 버퍼 | bufferLength=136, 태그 at 132 | 132 반환 | P1
| UT-005 | 버퍼 너무 작음 | bufferLength<=132 | -1 반환 | P1
| UT-006 | 버퍼 끝 근처 태그 | 태그 at bufferLength-4 | 정확한 오프셋 반환 | P1
| UT-007 | DataView 예외 | 손상된 view | -1 반환, 예외 미전파 | P1
| UT-008 | 동일 group 다른 element | 0x7FE0,0x0020 | -1 반환 | P2
| UT-009 | Big Endian 태그 | BE로 저장된 (7FE0,0010) | -1 반환 | P2
| UT-010 | 우연한 패턴 | non-tag 위치에 0x7FE0 패턴 | element 불일치로 스킵 | P2
| UT-011 | 다중 태그 버퍼 | 첫 (7FE0,0010) 이전에 다른 태그 | 첫 매치 오프셋 반환 | P2

### 통합 테스트 (dicomParsePipeline.test.js)

| 테스트 ID | 시나리오 | 기대 결과
|-----------|----------|-----------| IT-001 | parsePixelData() 폴백 경로 | findPixelDataTag 호출 후 픽셀 데이터 정상 파싱
| IT-002 | parsePixelData() 폴백 실패 | ParseError 발생 확인
| IT-003 | 기존 정상 파싱 경로 회귀 | 폴백 함수 추가 후 기존 테스트 모두 통과

### 테스트 데이터 준비

| 데이터 | 설명 | 용도
|--------|------|------| valid-dicom-std.dcm | 픽셀 데이터 태그가 표준 위치에 있는 DICOM | UT-001
| valid-dicom-min.dcm | 최소 크기(136바이트) DICOM | UT-004
| no-pixel-data.dcm | 픽셀 데이터 태그 없는 DICOM | UT-003
| corrupted-buffer.bin | 무작위 바이트, 예외 유도용 | UT-007
| big-endian.dcm | Big Endian으로 저장된 DICOM | UT-009

### 커버리지 목표

| 항목 | 목표 | 측정 도구
|------|------|-----------| 함수 커버리지 | 100% | Jest / Vitest
| 분기 커버리지 | 100% (4/4 경로) | Jest / Vitest
| 라인 커버리지 | >= 90% | Jest / Vitest

---

## Dependency & Integration

### 업스트림 의존성 (본 함수가 의존하는 모듈)

| 모듈 | 심볼 | 사용 방식 | 변경 영향
|------|--------|-----------|-----------| constants.js | PIXEL_DATA_TAG | import { PIXEL_DATA_TAG } | constants.js 변경 시 본 함수 재검증 필요
| DataView (Web API) | getUint16() | view.getUint16(offset, true) | 브라우저 표준, 변경 영향 없음

### 다운스트림 의존성 (본 함수를 호출하는 모듈)

| 모듈 | 함수 | 호출 시점 | 계약
|------|------|-----------|------| pixelDataParser.js | parsePixelData() | 정상 경로에서 pixelDataOffset 누락 시 | 반환값 >= 0: 오프셋, -1: ParseError 발생

### 통합 포인트

```javascript
// parsePixelData() 내부 호출 예시
export function parsePixelData(dicomData) {
    const { view, bufferLength, pixelDataOffset } = dicomData;

    let offset = pixelDataOffset;  // 정상 경로: 캐시된 오프셋

    if (offset === undefined || offset === null) {
        // 폴백 경로: findPixelDataTag() 호출
        offset = findPixelDataTag(view, bufferLength);
        if (offset === -1) {
            throw new ParseError('픽셀 데이터 태그(7FE0,0010)를 찾을 수 없습니다.');
        }
    }

    // 이후 픽셀 데이터 파싱 계속...
}
```

---

## Risk Mitigation

### HAZ-5.3: ArrayBuffer 범위 초과 읽기

**위험도**: 중간 | **완화 상태**: 이중 방어 적용

| 방어 계층 | 메커니즘 | 설명
|-----------|----------|------| 1차 | 루프 상한 조건 | offset + 4 <= bufferLength 로 읽기 범위 보장
| 2차 | try-catch | DataView가 내부적으로 발생시키는 RangeError 포착

**검증 방법**:
- bufferLength 경계값 테스트 (136, 137, 138, bufferLength-4, bufferLength-3)
- 의도적으로 범위를 벗어나는 offset 설정 후 예외 포착 확인

### HAZ-1.1: 픽셀 데이터 누락으로 인한 렌더링 실패

**위험도**: 중간 | **완화 상태**: 센티넬 값 + 호출자 에러 처리

| 방어 계층 | 메커니즘 | 설명
|-----------|----------|------| 본 함수 | -1 반환 | 명시적 실패 표현
| 호출자 | ParseError 발생 | 사용자에게 에러 메시지 전달
| UI 계층 | 에러 바운더리 | 렌더링 실패 시 안내 메시지 표시

### 성능 리스크: 대용량 버퍼 탐색

**리스크**: 수십 MB 이상의 DICOM 파일에서 O(n/2) 탐색 시간 소요

| 완화 요소 | 설명
|-----------|------| 폴백 전용 | 정상 경로에서는 호출되지 않음 (metadataParser 캐시 활용)
| 2바이트 간격 | 탐색 횟수를 절반으로 감소
| 조기 반환 | 매치 발견 즉시 반환, 전체 탐색 불필요

---

## Implementation Checklist

### 사전 확인 (Pre-implementation)

- [ ] constants.js에 PIXEL_DATA_TAG 상수가 {group: 0x7FE0, element: 0x0010} 형태로 존재하는지 확인
- [ ] parsePixelData() 함수의 현재 시그니처 및 반환 구조 파악
- [ ] 기존 단위 테스트 suites 실행하여 베이스라인 확보

### 구현 (Implementation)

- [ ] STEP 1: 함수 시그니처 및 입력 검증 구현
- [ ] STEP 2: PIXEL_DATA_TAG 상수 import 및 로컬 상수 할당
- [ ] STEP 3: 프리앰블 스킵 상수(DICOM_PREAMBLE_SIZE=132) 정의
- [ ] STEP 4: for 루프 + DataView 읽기 구현
- [ ] STEP 5: group/element 매치 검사 구현
- [ ] STEP 6: try-catch 예외 처리 구현
- [ ] STEP 7: 미발견 시 -1 반환 구현

### 검증 (Verification)

- [ ] UT-001~UT-011 단위 테스트 작성 및 통과
- [ ] IT-001~IT-003 통합 테스트 작성 및 통과
- [ ] 분기 커버리지 100% 달성 (4/4 제어 흐름 경로)
- [ ] 기존 테스트 suites 회귀 없음 확인
- [ ] ESLint / Prettier 린트 통과

### 코드 리뷰 (Code Review)

- [ ] IEC 62304 Class A 기준 코드 리뷰 체크리스트 적용
- [ ] 상수 값(0x7FE0, 0x0010)이 PIXEL_DATA_TAG와 일치하는지 확인
- [ ] 예외가 함수 밖으로 전파되지 않는지 확인
- [ ] 루프 상한 조건이 정확한지 수학적 검증

---

## Notes & Open Items

| 항목 | 상태 | 내용
|------|------|------| [NEEDS CLARIFICATION] EC-006 | 보류 | view가 null/undefined인 경우 명시적 검증 필요 여부 (현재는 try-catch로 간접 방어)
| TODO-BE | 향후 이관 | Big Endian DICOM 파일 지원 시 양방향 검사 로직 추가 필요
| TODO-PERF | 검토 | 대용량 버퍼(100MB+)에서의 탐색 성능 벤치마크 필요 여부

---

*본 문서는 PLAYG-1830 티켓의 기술 이행 계획으로, 01_spec.md 기능 명세서를 기반으로 작성되었다.*
*IEC 62304 Class A 안전 등급에 따른 구현 가이드라인을 준수한다.*
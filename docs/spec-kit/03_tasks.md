# Tasks: ParseResult 타입 팩토리 (ParseResult.js)

**Ticket**: PLAYG-1818 | **Type**: Detailed Design (task)
**Branch**: feature/PLAYG-1818
**Date**: 2026-04-27 | **Spec**: docs/spec-kit/01_spec.md | **Plan**: docs/spec-kit/02_plan.md

---

## 메타데이터

| 항목 | 내용 |
|------|------|
| **총 태스크 수** | 10 |
| **예상 총 공수** | 12시간 (약 1.5일) |
| **병렬 가능 그룹** | Phase 3A / 3B / 3C 동시 진행 가능 |
| **선행 완료 필수** | Phase 1, 2 완료 후 Phase 3+ 착수 |

---

## 추적성 요약

| 요구사항 | 관련 태스크 | 검증 방법 |
|----------|-----------|----------|
| FR-1.1 (매직 바이트 검증) | T006 (호출 #2) | 단위 테스트 |
| FR-1.2 (전송 구문 검증) | T006 (호출 #3) | 단위 테스트 |
| FR-1.3 (필수 태그 검증) | T007 (호출 #4) | 단위 테스트 |
| FR-1.4 (파일 크기 검증) | T006 (호출 #1) | 단위 테스트 |
| FR-1.5 (픽셀 데이터 길이) | T007 (호출 #6~7) | 단위 테스트 |
| FR-2.3 (필수/선택 메타데이터) | T007 (호출 #5, #7) | 통합 테스트 |
| FR-3.1 (복셀 데이터 변환) | T007 (호출 #7) | 통합 테스트 |
| FR-5.1 (구조화된 에러 코드) | T003, T005 | 단위 테스트 |
| COMP-1 (DicomParser 인터페이스) | T006, T007, T008 | 통합 테스트 |

---
## Phase 1: Setup (프로젝트 인프라 준비)

> **목표**: ParseResult.js 개발에 필요한 디렉토리 구조, 테스트 환경, 모듈 스캐폴딩을 구축한다.
> **선행 조건**: 없음 (프로젝트 착수 시점)

### T001 🔀 프로젝트 디렉토리 구조 생성

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T001 |
| **병렬 가능** | 🔀 (독립 수행 가능) |
| **예상 소요** | 15분 |
| **담당** | 개발자 A |

**완료 조건**:
- [x] viewer/src/types/ 디렉토리 존재
- [x] viewer/tests/unit/types/ 디렉토리 존재
- [x] Git 추적 가능 상태

---

### T002 🔀 Vitest 테스트 환경 확인 및 설정

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T002 |
| **병렬 가능** | 🔀 (T001과 동시 수행 가능) |
| **예상 소요** | 30분 |
| **담당** | 개발자 A |

**완료 조건**:
- [x] npm test 명령이 정상 실행됨 (37개 테스트 통과)
- [x] ESM import 구문이 테스트 파일에서 동작함
- [x] viewer/tests/ 경로가 테스트 스캔 대상에 포함됨

---
## Phase 2: Foundational (기반 타입 및 팩토리 구현)

### T003 🔒 ErrorResult JSDoc 타입 정의

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T003 |
| **병렬 가능** | 🔒 (T004 선행 필요) |
| **예상 소요** | 1시간 |

**완료 조건**:
- [x] ErrorResult typedef가 4개 필드(userMessage, debugInfo, errorCode, severity)를 모두 포함
- [x] 각 필드에 타입과 설명이 JSDoc @property로 명시됨
- [x] IDE에서 @type {ErrorResult} 타입 힌트가 동작함

---

### T004 🔒 ParseResult JSDoc 타입 정의

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T004 |
| **병렬 가능** | 🔒 (T003 직후 수행) |
| **예상 소요** | 1시간 |

**완료 조건**:
- [x] ParseResult typedef가 4개 필드(metadata, voxelData, errors, isValid)를 모두 포함
- [x] metadata와 voxelData가 nullable(Object|null)로 명시됨
- [x] errors가 Array<ErrorResult> 타입으로 명시됨
- [x] isValid가 boolean 타입으로 명시됨

---

### T005 🔒 createParseResult() 팩토리 함수 구현

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T005 |
| **병렬 가능** | 🔒 (T003, T004 완료 후 수행) |
| **예상 소요** | 1.5시간 |

**완료 조건**:
- [x] createParseResult() 인자 없이 호출 시 기본값 객체 반환
- [x] createParseResult({isValid:true}) 호출 시 isValid만 true로 변경, 나머지 기본값 유지
- [x] 연속 2회 호출 시 각각 독립적인 errors 배열 참조 보장 (CT-2 해결)
- [x] export 키워드로 ESM 모듈 export 선언

---
## Phase 3: User Stories (사용자 스토리별 구현 및 연동)

### T006 🔀 parseDICOM.js import 및 호출 지점 #1~#3 연동 (초기 검증 단계)

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T006 |
| **병렬 가능** | 🔀 (T007과 병렬 수행 가능) |
| **예상 소요** | 2시간 |

**완료 조건**:
- [x] import { createParseResult } 구문이 parseDICOM.js 상단에 존재
- [x] 호출 #1: 파일 크기 초과 시 createParseResult({errors:[...]}) 반환
- [x] 호출 #2: 매직 바이트 불일치 시 createParseResult({errors:[...]}) 반환
- [x] 호출 #3: 전송 구문 미지원 시 createParseResult({errors:[...]}) 반환
- [x] 모든 에러의 errorCode가 PARSE_ERR_* 접두사 사용
- [x] 모든 에러의 severity가 "error"로 설정

---

### T007 🔀 parseDICOM.js 호출 지점 #4~#7 연동 (파싱/추출 단계)

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T007 |
| **병렬 가능** | 🔀 (T006과 병렬 수행 가능) |
| **예상 소요** | 2시간 |

**완료 조건**:
- [x] 호출 #4: parseMetadata() 예외 시 createParseResult로 에러 래핑
- [x] 호출 #5: severity==="error" 항목 존재 시 isValid=false로 반환
- [x] 호출 #6: parsePixelData() 예외 시 metadata 포함 + voxelData:null 반환
- [x] 호출 #7: 정상 완료 시 metadata + voxelData + isValid:true 반환
- [x] 정상 완료 경로에서만 isValid:true 보장

---

### T008 🔒 UiController isValid 분기 처리 연동

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T008 |
| **병렬 가능** | 🔒 (T006, T007 완료 후 수행) |
| **예상 소요** | 1시간 |

**완료 조건**:
- [x] isValid === true 시 buildVolumeData(parseResult)가 호출됨 (main.js에 구현됨)
- [x] isValid === false 시 사용자에게 errors[].userMessage가 표시됨
- [x] debugInfo는 console.debug로만 출력되고 사용자 화면에 노출되지 않음
- [x] severity==="warning" 항목은 경고 스타일로 구분 표시됨

---
## Phase 4: Integration (단위 테스트 및 통합 검증)

### T009 🔀 ParseResult 단위 테스트 작성

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T009 |
| **병렬 가능** | 🔀 (T008과 병렬 수행 가능) |
| **예상 소요** | 2시간 |

**완료 조건**:
- [x] 10개 테스트 케이스가 모두 작성됨 (16개 테스트 포함)
- [x] npm test 실행 시 37/37 테스트 통과
- [x] errors 배열 독립성 테스트가 통과함 (CT-2 검증)
- [x] 커버리지 100% (createParseResult 함수 전체 라인 커버)

---

### T010 🔒 정적 분석, 코드 리뷰 및 추적성 매트릭스 완성

| 항목 | 내용 |
|------|------|
| **태스크 ID** | T010 |
| **병렬 가능** | 🔒 (T009 완료 후 수행, 최종 태스크) |
| **예상 소요** | 1시간 |

**완료 조건**:
- [x] ESLint 에러 0건, 경고 0건
- [x] npm test 전체 테스트 통과 (37/37)
- [x] 추적성 매트릭스의 모든 FR/COMP 항목이 구현 태스크와 매핑됨
- [x] JSDoc 타입 정의가 IDE에서 정상 인식됨
- [x] 코드 리뷰 체크리스트 작성 완료

---
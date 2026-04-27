# Session Context

**마지막 갱신**: 2026-04-27 | **티켓**: PLAYG-1819 | **유형**: Detailed Design - SDS-2.1

---

### 1. 시스템 아키텍처 / 컨벤션 - 유실 절대 금지

#### 프로젝트 개요
- **프로젝트명**: DentiView3D - 웹 기반 CBCT 영상 뷰어
- **안전 등급**: IEC 62304 Class A
- **언어/런타임**: JavaScript ES6+, ECMAScript 2020 호환
- **테스트**: Jest 단위 테스트, ESLint 정적 분석
- **대상 플랫폼**: 웹 브라우저 - Chrome, Firefox, Edge 최신 2버전

#### 에러 클래스 계층 구조
```
Error
  +-- CBVError                    기본 클래스
        +-- ParseError            파싱 오류, FR-ERR-02
        +-- ValidationError       검증 오류, FR-ERR-03
        +-- RenderError           렌더링 오류, FR-ERR-04
        +-- SecurityError         보안 위반, FR-ERR-05
        +-- MemoryError           메모리 한계, FR-ERR-06
```

#### 파일 구조
```
viewer/src/
  errors/
    CBVError.js            # CBVError + 5개 하위 클래스 - 구현 대상
    handleParseError.js    # CBVError -> ErrorResult 변환 핸들러
  constants/
    constants.js           # ERROR_CODES, ERROR_MESSAGES, SEVERITY_LEVELS
  parsers/
    ParseResult.js         # 결과 타입 OkResult / ErrorResult
    parseDICOM.js          # DICOM 파싱 파이프라인
    pixelDataParser.js     # 픽셀 데이터 파서
    metadataParser.js      # 메타데이터 파서
```

#### CBVError 기본 클래스 생성자 시그니처
- constructor: message, code = CBV_000, context = {}
- 속성: this.name = CBVError, this.code = code, this.context = context
- ES6 class extends 사용으로 프로토타입 체인 자동 구성
- 명명된 export - named export 사용

#### 하위 클래스별 기본 에러 코드
- ParseError: PARSE_ERR_UNEXPECTED - 파싱 7종 코드 존재
- ValidationError: VALIDATE_001
- RenderError: RENDER_001
- SecurityError: SECURITY_001
- MemoryError: MEMORY_001

#### 파싱 에러 코드 7종 - constants.js ERROR_CODES
- PARSE_ERR_INVALID_MAGIC, PARSE_ERR_UNSUPPORTED_TRANSFER_SYNTAX
- PARSE_ERR_MISSING_REQUIRED_TAG, PARSE_ERR_PIXEL_DATA_EXTRACTION
- PARSE_ERR_FILE_READ, PARSE_ERR_FILE_TOO_LARGE, PARSE_ERR_UNEXPECTED

#### ErrorResult 변환 패턴
- handleParseError.js가 CBVError를 ErrorResult로 변환
- ErrorResult 구조: userMessage, debugInfo, errorCode, severity
- ParseResult.errors 배열에 포함

#### 보안 제약 - PHI 보호
- context 객체에 PHI - 환자명, 환자ID, 생년월일 등 - 포함 절대 금지
- ErrorResult.userMessage에 offset, tag 경로, buffer 주소 등 내부 구조 노출 금지
- SecurityError: 보안 위반 내용이 사용자 메시지에 노출되지 않도록 별도 검증
- debugInfo: 개발 환경에서만 접근 가능, 환경 변수 기반 게이트 적용

---

### 2. 해결 완료된 주요 이슈 및 기술 스택

#### PLAYG-1819: CBVError 에러 클래스 계층 설계 완료
- **산출물**: Spec-Kit 3종 문서 생성 완료
  - docs/spec-kit/01_spec.md: 명세서 - 7개 FR, 4개 NFR, 12개 US, 16개 SC
  - docs/spec-kit/02_plan.md: 기술 계획서 - 4-Phase, 7-Step, 23개 단위 테스트
  - docs/spec-kit/03_tasks.md: 태스크 분할 - 12개 태스크, 5 Phase, 예상 12.5h
- **참조 문서**: SRS-PLAYG-1460, SAD-PLAYG-1766, RMR-PLAYG-1459 - 17개 Hazard
- **전역 문서**: PRD/SRS/Architecture 이번 세션 수정 없음

#### 설계 원칙 Constitution Check 통과
- SRP: 각 에러 클래스는 단일 오류 범주만 담당
- OCP: CBVError 상속으로 확장, 기본 클래스 수정 불필요
- LSP: 모든 하위 클래스가 CBVError/Error instanceof 체인 유지
- DIP: constants.js ERROR_CODES로 에러 코드 정의 추상화
- 레이어 분리: 에러 클래스는 순수 도메인 모델, UI/파서 계층 독립 사용

---

### 3. 미완료 / Next Steps

#### NEEDS CLARIFICATION - 구현 전 확인 필요 사항
- constants.js에 CBV_000 기본 에러 코드가 이미 정의되어 있는지 확인 필요
- constants.js에서 CBVError.js로의 import 시 순환 의존성 circular dependency 발생 여부 확인

#### 구현 Phase 계획 - 03_tasks.md 기준
- Phase 1 Setup: T001 디렉토리/테스트 환경 검증, T002 CBVError 기본 클래스
- Phase 2 Foundational: T003 ParseError, T004 ValidationError/RenderError
- Phase 3 Core: T005 SecurityError/MemoryError, T006 에러 코드 통합
- Phase 4 Integration: T007~T010 handleParseError 연동, 통합 테스트
- Phase 5 Verification: T011~T012 전체 체인 검증, 문서 업데이트

#### 다음 세션 액션 아이템
1. constants.js에 CBV_000 정의 여부 및 순환 의존성 확인
2. !code 명령으로 Phase 1부터 순차 구현
3. 23개 단위 테스트 작성 및 통과 확인
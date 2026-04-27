# Session Context

**마지막 갱신**: 2026-04-27 13:03 | **티켓**: PLAYG-1819 | **유형**: Detailed Design - SDS-2.1

---

### 1. 시스템 아키텍처 / 컨벤션

#### 프로젝트 개요
- **프로젝트명**: DentiView3D - 웹 기반 CBCT 영상 뷰어
- **안전 등급**: IEC 62304 Class A
- **언어/런타임**: JavaScript ES6+, ECMAScript 2020 호환
- **테스트**: Vitest 단위 테스트, ESLint 9 (설정 파일 미구성)
- **대상 플랫폼**: 웹 브라우저 - Chrome, Firefox, Edge 최신 2버전

#### 에러 클래스 계층 구조 (구현 완료)
```
Error
  +-- CBVError                    기본 클래스 (code=CBV_000)
        +-- ParseError            파싱 오류 (기본코드=PARSE_ERR_UNEXPECTED), FR-ERR-02
        +-- ValidationError       검증 오류 (기본코드=VALIDATE_001), FR-ERR-03
        +-- RenderError           렌더링 오류 (기본코드=RENDER_001), FR-ERR-04
        +-- SecurityError         보안 위반 (기본코드=SECURITY_001, PHI 필터링), FR-ERR-05
        +-- MemoryError           메모리 한계 (기본코드=MEMORY_001), FR-ERR-06
```

#### 파일 구조 (현재 상태)
```
viewer/src/
  errors/
    CBVError.js            # CBVError + 5개 하위 클래스 ✅ 구현 완료
    handleParseError.js    # CBVError -> ErrorResult 변환 핸들러 ✅ 구현 완료
  data/dicomParser/
    constants.js           # ERROR_CODES (12종) + ERROR_MESSAGES ✅ 확장 완료
  types/
    ParseResult.js         # 결과 타입 OkResult / ErrorResult (기존)
    DICOMMetadata.js       # DICOM 메타데이터 팩토리 (기존)

viewer/tests/
  unit/errors/
    CBVError.test.js       # 23개 단위 테스트 ✅
    Integration.test.js    # 11개 통합 테스트 ✅
  unit.test.js             # 기존 21개 테스트
```

#### 핵심 설계 결정
- ParseError 기본 코드: `PARSE_ERR_UNEXPECTED` (catch-all 동작)
- SecurityError: 생성자에서 `sanitizeContext()`로 PHI 필드 자동 제거
- handleParseError.js: ERROR_MESSAGES[ko]를 userMessage로 사용, debugInfo는 개발환경에서만 생성
- 단일 파일(CBVError.js)에 6개 클래스 정의, 명명된 export 사용

---

### 2. 해결 완료된 주요 이슈 및 트러블슈팅

#### PLAYG-1819: CBVError 에러 클래스 계층 구현 완료
- **산출물**: 
  - CBVError.js: 6개 에러 클래스 (CBVError + ParseError + ValidationError + RenderError + SecurityError + MemoryError)
  - handleParseError.js: ErrorResult 변환 핸들러
  - constants.js: 12개 에러 코드 + ERROR_MESSAGES 확장
  - CBVError.test.js: 23개 단위 테스트 (T-01~T-23)
  - Integration.test.js: 11개 통합 테스트 (SC-8, SC-9, SC-11)
- **테스트 결과**: 전체 55개 테스트 통과, CBVError.js 100% 커버리지
- **Jira 댓글**: comment_id=12061 게시 완료

#### 해결된 이슈
1. ParseError 기본 코드 불일치: 기존 PARSE_001 → 명세 요구 PARSE_ERR_UNEXPECTED로 수정
2. constants.js 누락 코드: CBV_000, VALIDATE_001, RENDER_001, SECURITY_001, MEMORY_001 및 ERROR_MESSAGES 추가
3. handleParseError.js 미구현: 명세 FR-ERR-07에 맞게 신규 생성
4. 테스트 import 경로: tests/unit/errors/ → ../../../src/ (3단계 상위)

---

### 3. 미완료 / Next Steps

#### 후속 작업 (별도 티켓 필요)
- parseDICOM.js 파이프라인에서 ParseError 실제 발생 연동
- pixelDataParser.js, metadataParser.js에서 ParseError 사용
- ESLint 설정 파일(eslint.config.js) 생성 후 정적 분석 수행
- ErrorResult.userMessage에 PHI 정보 노출 방지 정규식 강화
- 향후 에러 클래스 10개 이상 확장 시 파일 분리 검토

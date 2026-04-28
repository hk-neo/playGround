*소프트웨어 아키텍처 명세서 (SAD)*

*프로젝트: DentiView3D - 웹 기반 CBCT 영상 뷰어*
*버전: 0.1.0 | 작성일: 2026-04-23*
*추적 티켓: PLAYG-1766*
*소프트웨어 안전 등급: IEC 62304 Class A*

---

*[SAD-01] 아키텍처 개요 및 설계 원칙*

*아키텍처 개요*

DentiView3D는 로컬 DICOM 파일을 브라우저에서 파싱하고 3단면 MPR 영상을 렌더링하는 독립 실행형 웹 애플리케이션이다. 본 아키텍처는 IEC 62304 Class A 요구사항을 충족하기 위해 계층형(Layered) 아키텍처 스타일을 채택하여, 관심사 분리와 모듈 경계를 명확히 한다.

*핵심 설계 원칙*

- *단일 책임 원칙 (SRP)*: 각 모듈은 하나의 명확한 책임만 수행한다. DICOM 파싱, 검증, 렌더링, 보안 기능이 각각 독립 모듈로 분리된다.
- *관심사 분리 (Separation of Concerns)*: UI 계층, 비즈니스 로직 계층, 데이터 접근 계층이 명확히 구분된다.
- *정보 은폐 (Information Hiding)*: PHI 데이터와 내부 파싱 구조가 외부에 노출되지 않도록 모듈 인터페이스를 통한 접근만 허용한다.
- *안전 우선 설계 (Safety First)*: Class A 요구사항에 따라 모든 입력 검증, 경계 조건 처리, 에러 핸들링이 최우선으로 설계된다.
- *오프라인 전용 (Offline Only)*: 네트워크 통신이 전혀 없는 순수 클라이언트 아키텍처이다. CSP connect-src none으로 외부 통신을 원천 차단한다.

*아키텍처 스타일 및 선택 근거*

- *선택 스타일*: Layered Architecture (3-Tier)
  - Presentation Layer: UI 렌더링, 사용자 이벤트 처리
  - Business Logic Layer: DICOM 파싱, 검증, 볼륨 데이터 구성
  - Data Access Layer: File API를 통한 로컬 파일 읽기, ArrayBuffer/DataView 처리
- *선택 근거*:
  - Class A 소프트웨어의 단순성 요구사항에 부합 (IEC 62304 제4.3항)
  - 모듈 간 의존성이 단방향(상향)으로 제한되어 추적성과 테스트 용이성 확보
  - 단일 프로세스 브라우저 환경에서 과도한 분산 아키텍처(Microservices 등)는 불필요
  - SRS에 정의된 FR/NFR의 명확한 계층 분류 가능

*참조 문서*

|| 문서 || 티켓 키 || 설명 ||
| SRS | PLAYG-1460 | 소프트웨어 요구사항 명세서 |
| RMR | PLAYG-1459 | 위험 관리 보고서 (17개 Hazard) |
| EA Gate | PLAYG-1458 | 엔지니어링 활동 게이트 |
| SAD | PLAYG-1766 | 본 문서 |
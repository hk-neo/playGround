# ER Gate 태스크 분할 (Tasks)

- **티켓**: PLAYG-1395
- **문서 ID**: TASKS-PLAYG-1395
- **작성일**: 2026-04-13
- **제품**: Simple CBCT Viewer

---

## 1. 태스크 목록

### TASK-01: 문서 완전성 확인
- **우선순위**: 높음
- **상태**: 미시작
- **산출물**: 문서 완전성 체크리스트
- **세부 내용**:
  - IEC 62304 Class A 필수 산출물 11개 존재 여부 확인
  - 각 문서의 필수 섹션(목적, 범위, 참조문서, 세부내용) 누락 점검
  - SyRS(14개 항목), SRS(FR/NFR), SAD(10개 모듈), SDS(상세설계) 내용 일관성 확인

### TASK-02: SyRS-SRS 추적성 검증
- **우선순위**: 높음
- **상태**: 미시작
- **산출물**: 추적성 매트릭스 검증 결과
- **세부 내용**:
  - SR-1(DICOM 로드) -> FR-1.x 매핑 확인
  - SR-2(메타데이터 파싱) -> FR-1.x 매핑 확인
  - SR-3~4(MPR/3D 렌더링) -> FR-2.x 매핑 확인
  - SR-5~8(탐색/확대/WL/측정) -> FR-3.x 매핑 확인
  - SR-9~14(비기능/보안/규격) -> NFR 매핑 확인

### TASK-03: SRS-SAD-SDS 추적성 검증
- **우선순위**: 높음
- **상태**: 미시작
- **산출물**: 설계 추적성 검증 결과
- **세부 내용**:
  - SRS FR-1.x -> SAD COMP-1.1(DICOMParser), COMP-1.2(DataValidator) 매핑
  - SRS FR-2.x -> SAD COMP-2.1(VolumeBuilder), COMP-3.x(Renderer) 매핑
  - SRS FR-4.x -> SAD COMP-2.3(SecurityGuard) 매핑
  - SAD COMP -> SDS 상세 설계 항목 매핑
  - ADR-1~5 결정 사항이 설계에 반영되었는지 확인

### TASK-04: Hazard-완화조치 추적성 검증
- **우선순위**: 높음
- **상태**: 미시작
- **산출물**: 위험 추적성 검증 결과
- **세부 내용**:
  - RMR HAZ-1.1(파싱오류 영상왜곡) -> SRS FR-1.5(오류처리) 매핑
  - RMR HAZ-1.2(MPR 재구성 오류) -> SRS FR-2.1~2.3 매핑
  - RMR HAZ-2.1(거리측정 오차) -> SRS FR-3.3(측정검증) 매핑
  - RMR HAZ-3.1(PHI 유출) -> SRS FR-5.1(외부통신차단) 매핑
  - RMR HAZ-3.2(데이터 잔류) -> SRS FR-5.2(메모리무상태) 매핑

### TASK-05: 아키텍처 품질 평가
- **우선순위**: 중간
- **상태**: 미시작
- **산출물**: 아키텍처 평가 결과
- **세부 내용**:
  - 4계층(Data/Business/Rendering/Presentation) 분리 적절성
  - 10개 모듈의 단일 책임 원칙 준수 여부
  - 모듈 간 인터페이스 정의 명확성
  - 오프라인 동작 제약사항 반영 여부

### TASK-06: 위험 관리 적절성 평가
- **우선순위**: 중간
- **상태**: 미시작
- **산출물**: 위험 관리 평가 결과
- **세부 내용**:
  - 14개 Hazard 심각도(S1~S5) 분류 타당성 검토
  - 발생 확률(P1~P5) 평가 근거 확인
  - 완화 조치의 구체성 및 구현 가능성 검토
  - 잔여 위험 수용 기준(ALARP) 적절성 확인

### TASK-07: 보안 요구사항 검토
- **우선순위**: 중간
- **상태**: 미시작
- **산출물**: 보안 검토 결과
- **세부 내용**:
  - PHI 보호 조치(SRS FR-5.1, FR-5.2) 검토
  - 외부 통신 차단 아키텍처(COMP-2.3 SecurityGuard) 검토
  - CVE 모니터링 계획(SMP) 적절성 확인
  - SBOM 관리 절차(CMP) 적절성 확인

### TASK-08: IEC 62304 Class A 준수 종합 판정
- **우선순위**: 높음
- **상태**: 미시작
- **산출물**: ER Gate 검토 보고서
- **세부 내용**:
  - TASK-01~07 검토 결과 취합
  - IEC 62304 제5절~제9절 요구사항 준수 현황 정리
  - 미비 사항 및 개선 권고 사항 도출
  - 최종 Gate 판정 (합격/조건부 합격/불합격)

---

## 2. 의존 관계



---

## 3. 참조 문서

- docs/artifacts/IntendedUse.md (IU-PLAYG-1228)
- docs/artifacts/SyRS.md (PLAYG-1229)
- docs/artifacts/Classification.md (PLAYG-1230)
- docs/artifacts/Development_Plan.md (DP-PLAYG-1231)
- docs/artifacts/Risk_Management_Plan.md (RMP-PLAYG-1232)
- docs/artifacts/Security_Maintenance_Plan.md (SMP-PLAYG-1233)
- docs/artifacts/Configuration_Management_Plan.md (CMP-PLAYG-1234)
- docs/artifacts/RMR.md (RMR-PLAYG-1309)
- docs/artifacts/SRS.md (SRS-PLAYG-1310)
- docs/artifacts/SAD.md (SAD-PLAYG-1311)
- docs/artifacts/SDS.md (SDS-PLAYG-1312)
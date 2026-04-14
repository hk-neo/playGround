# ER Gate 기술 계획서 (Plan)

- **티켓**: PLAYG-1395
- **문서 ID**: PLAN-PLAYG-1395
- **작성일**: 2026-04-13
- **제품**: Simple CBCT Viewer

---

## 1. 목적

본 계획서는 PLAYG-1395 ER Gate 티켓의 검토 활동을 수행하기 위한 기술 계획을 정의한다.
docs 폴더에 작성된 11개의 프로젝트 문서를 근거로 ER Gate 검토를 체계적으로 수행한다.

---

## 2. 검토 범위

| 영역 | 검토 대상 문서 | 검토 핵심 |
|------|---------------|-----------|
| 요구사항 | SyRS.md, SRS.md | 추적성(SR -> FR/NFR), 완전성 |
| 아키텍처 | SAD.md | 계층 구조, 컴포넌트 분리, ADR 타당성 |
| 상세 설계 | SDS.md | 컴포넌트 상세 설계, 인터페이스 정의 |
| 위험 관리 | RMR.md, Risk_Management_Plan.md | Hazard 식별/평가/완화, ALARP |
| 보안 | Security_Maintenance_Plan.md | PHI 보호, 취약점 관리 |
| 형상 관리 | Configuration_Management_Plan.md | CI 식별, 통제 절차 |
| 개발 계획 | Development_Plan.md | V-Model, 마일스톤, 도구 |
| 안전 등급 | Classification.md | Class A 분류 근거 |
| 의도된 사용 | IntendedUse.md | IU-01~IU-10 정의 완전성 |

---

## 3. 검토 활동 계획

### 3.1 Phase 1: 문서 완전성 확인
- IEC 62304 Class A 필수 산출물 목록 대비 문서 존재 여부 확인
- 각 문서의 필수 섹션 누락 여부 점검
- 산출물: 문서 완전성 체크리스트

### 3.2 Phase 2: 추적성 매트릭스 검증
- SyRS SR-1~SR-14 -> SRS FR/NFR 매핑 검증
- SRS FR -> SAD COMP 매핑 검증
- RMR HAZ -> SRS 완화 조치 매핑 검증
- 산출물: 추적성 매트릭스 검증 결과

### 3.3 Phase 3: 위험 관리 적절성 평가
- 14개 Hazard의 심각도/확률 평가 타당성 검토
- 완화 조치의 구체성 및 구현 가능성 검토
- 잔여 위험의 ALARP 판단 근거 확인
- 산출물: 위험 관리 평가 결과

### 3.4 Phase 4: 아키텍처 및 설계 품질 평가
- Layered Architecture 적합성 평가
- 모듈 간 결합도/응집도 평가
- ADR-1~5 선택 근거 타당성 검토
- 산출물: 아키텍처 품질 평가 결과

### 3.5 Phase 5: 규격 준수 종합 판정
- IEC 62304 Class A 요구사항 대비 준수 현황 종합
- ISO 14971 위험 관리 준수 확인
- 최종 Gate 판정 (합격/조건부 합격/불합격)
- 산출물: ER Gate 검토 보고서

---

## 4. 일정

| 단계 | 활동 | 기간 |
|------|------|------|
| Phase 1 | 문서 완전성 확인 | 1일 |
| Phase 2 | 추적성 매트릭스 검증 | 1일 |
| Phase 3 | 위험 관리 적절성 평가 | 1일 |
| Phase 4 | 아키텍처 및 설계 품질 평가 | 1일 |
| Phase 5 | 규격 준수 종합 판정 | 1일 |

---

## 5. 검토 역할

| 역할 | 담당 | 책임 |
|------|------|------|
| 검토자 | 소프트웨어 엔지니어 | 각 영역별 기술 검토 수행 |
| 승인자 | 프로젝트 관리자 | 최종 Gate 판정 및 승인 |

---

## 6. 참조 문서

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
# ER Gate 명세서 (Engineering Review Gate)

- **티켓**: PLAYG-1395
- **문서 ID**: SPEC-PLAYG-1395
- **작성일**: 2026-04-13
- **제품**: Simple CBCT Viewer
- **IEC 62304 안전 등급**: Class A

---

## 1. 개요

본 문서는 Simple CBCT Viewer 프로젝트의 ER(Engineering Review) Gate 검토를 위한 명세서이다.
IEC 62304:2006+AMD1:2015 및 ISO 14971:2019 규격 준수를 검증하기 위해,
docs 폴더에 작성된 모든 프로젝트 문서를 참고하여 검토 체크리스트를 정의한다.

### 1.1 참조 문서

| 문서 | 파일명 | 티켓 |
|------|--------|------|
| Intended Use | IntendedUse.md | PLAYG-1228 / PLAYG-1237 |
| System Requirements | SyRS.md | PLAYG-1229 |
| Classification | Classification.md | PLAYG-1230 / PLAYG-1290 |
| Development Plan | Development_Plan.md | PLAYG-1231 |
| Risk Management Plan | Risk_Management_Plan.md | PLAYG-1232 |
| Security Maintenance Plan | Security_Maintenance_Plan.md | PLAYG-1233 |
| Configuration Management Plan | Configuration_Management_Plan.md | PLAYG-1234 |
| Risk Management Report | RMR.md | PLAYG-1309 |
| Software Requirements Spec | SRS.md | PLAYG-1310 |
| Software Architecture Desc | SAD.md | PLAYG-1311 |
| Software Detailed Design | SDS.md | PLAYG-1312 |

---

## 2. ER Gate 검토 체크리스트

### 2.1 요구사항 추적성

| 항목 | 검토 내용 | 관련 문서 | 상태 |
|------|-----------|-----------|------|
| TR-01 | SyRS(SR-1~SR-14)의 모든 시스템 요구사항이 SRS의 FR/NFR로 추적 가능한가 | SyRS, SRS | 미검토 |
| TR-02 | SRS의 각 FR이 SAD의 컴포넌트(COMP-1.1~4.2)로 매핑되었는가 | SRS, SAD | 미검토 |
| TR-03 | SAD의 각 컴포넌트가 SDS의 상세 설계 항목으로 구체화되었는가 | SAD, SDS | 미검토 |
| TR-04 | RMR의 Hazard(HAZ-1.1~3.5)가 SRS의 완화 조치로 추적 가능한가 | RMR, SRS | 미검토 |

### 2.2 아키텍처 설계 적절성

| 항목 | 검토 내용 | 관련 문서 | 상태 |
|------|-----------|-----------|------|
| AR-01 | Layered Architecture(4계층 10모듈)가 Class A 요구사항에 적합한가 | SAD | 미검토 |
| AR-02 | 관심사 분리(SRP, SoC) 원칙이 각 모듈에 일관되게 적용되었는가 | SAD | 미검토 |
| AR-03 | ADR-1~5 아키텍처 결정의 대안 검토와 선택 근거가 타당한가 | SAD | 미검토 |
| AR-04 | 오프라인 동작 제약(IU-07)이 아키텍처에 반영되었는가 | SAD, IntendedUse | 미검토 |

### 2.3 위험 관리

| 항목 | 검토 내용 | 관련 문서 | 상태 |
|------|-----------|-----------|------|
| RM-01 | 14개 Hazard가 식별되었고 심각도/확률이 평가되었는가 | RMR | 미검토 |
| RM-02 | 모든 Hazard에 대해 완화 조치가 정의되었는가 | RMR, SRS | 미검토 |
| RM-03 | 잔여 위험이 ALARP 수준인가 | RMR | 미검토 |
| RM-04 | 위험 관리 계획서(RMP)가 ISO 14971:2019를 준수하는가 | Risk_Management_Plan | 미검토 |

### 2.4 보안 요구사항

| 항목 | 검토 내용 | 관련 문서 | 상태 |
|------|-----------|-----------|------|
| SR-01 | PHI(환자 건강 정보) 보호 조치가 구현되었는가 | SRS, SAD | 미검토 |
| SR-02 | 외부 네트워크 통신 차단이 아키텍처에 반영되었는가 | SAD(COMP-2.3) | 미검토 |
| SR-03 | 사이버 보안 유지보수 계획(SMP)이 수립되었는가 | Security_Maintenance_Plan | 미검토 |
| SR-04 | SBOM 관리 절차가 정의되었는가 | Configuration_Management_Plan | 미검토 |

### 2.5 형상 관리

| 항목 | 검토 내용 | 관련 문서 | 상태 |
|------|-----------|-----------|------|
| CM-01 | 형상 항목 식별 체계(SRC/BLD/TST/DOC/DEP/REL)가 정의되었는가 | Configuration_Management_Plan | 미검토 |
| CM-02 | 브랜치/릴리즈 명명 규칙이 수립되었는가 | Configuration_Management_Plan | 미검토 |
| CM-03 | 형상 통제 및 변경 관리 절차가 정의되었는가 | Configuration_Management_Plan | 미검토 |

### 2.6 개발 계획

| 항목 | 검토 내용 | 관련 문서 | 상태 |
|------|-----------|-----------|------|
| DP-01 | V-Model 기반 개발 프로세스가 정의되었는가 | Development_Plan | 미검토 |
| DP-02 | 5개 마일스톤(MS1~MS5)이 정의되었는가 | Development_Plan | 미검토 |
| DP-03 | 개발 환경 및 도구가 기술적 요구사항에 적합한가 | Development_Plan | 미검토 |

### 2.7 규격 준수 (IEC 62304 Class A)

| 항목 | 검토 내용 | 관련 문서 | 상태 |
|------|-----------|-----------|------|
| CR-01 | 안전 등급 Class A 분류 근거가 타당한가 | Classification | 미검토 |
| CR-02 | IEC 62304 제5절(개발) 필수 산출물이 모두 작성되었는가 | 전체 문서 | 미검토 |
| CR-03 | IEC 62304 제7절(위험 관리) 요구사항이 충족되는가 | RMR, Risk_Management_Plan | 미검토 |
| CR-04 | IEC 62304 제8절(형상 관리) 요구사항이 충족되는가 | Configuration_Management_Plan | 미검토 |

---

## 3. 검토 기준

- **합격**: 모든 체크리스트 항목이 승인됨
- **조건부 합격**: 중요 항목은 모두 승인, 일부 항목은 개선 필요
- **불합격**: 중요 항목(TR, RM, CR) 중 미승인 항목 존재

---

## 4. 비고

- 본 ER Gate 검토는 Simple CBCT Viewer의 전체 SDLC 산출물에 대한 종합 검토이다.
- 각 검토 항목은 관련 문서의 내용을 근거로 판단한다.
- 검토 결과는 별도의 검토 보고서에 기록된다.
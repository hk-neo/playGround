# System Requirements Specification (SyRS)

## 1. 개요 (Introduction)

### 1.1 목적 (Purpose)
본 문서는 PLAYG 프로젝트의 시스템 요구사항을 정의합니다.

### 1.2 문서 정보
- **상위 티켓:** PLAYG-1229
- **생성일:** 2026-04-10
- **총 항목 수:** 14

---

## 2. 요약 목록 (Summary)

| # | 요구사항 (SyRS-01) | 유형 (SyRS-02) |
|---|-------------------|----------------|
| 1 | [SyRS] DICOM 파일 로드 | Functional |
| 2 | [SyRS] DICOM 메타데이터 파싱 | Functional |
| 3 | [SyRS] MPR 다단면 렌더링 | Functional |
| 4 | [SyRS] 3D 볼륨 렌더링 | Functional |
| 5 | [SyRS] 슬라이스 탐색 | Functional |
| 6 | [SyRS] 확대/축소 및 이동 | Functional |
| 7 | [SyRS] 윈도우 레벨 조절 | Functional |
| 8 | [SyRS] 거리 측정 | Functional |
| 9 | [SyRS] 오프라인 로컬 동작 | Performance |
| 10 | [SyRS] 웹 브라우저 호환성 | Interface |
| 11 | [SyRS] 환자 정보 보호 | Security |
| 12 | [SyRS] DICOM 3.0 표준 준수 | Regulatory |
| 13 | [SyRS] 영상 로드 성능 | Performance |
| 14 | [SyRS] 진단 목적 제외 명시 | Regulatory |


---

## 3. 상세 요구사항 (Detailed Requirements)

### 3.1. [SyRS] DICOM 파일 로드

**ID:** SR-1
**유형:** 기능적 요구사항

**설명:**
근거: PLAYG-1237 Intended Purpose, IU-08 작동 원리

- 입력: 사용자가 로컬 파일 시스템에서 선택한 DICOM 파일(.dcm) 또는 DICOM 파일이 포함된 폴더
- 처리: 웹 브라우저 파일 API를 통해 파일 데이터를 읽어 들임
- 출력: 파싱 가능한 DICOM 데이터 스트림 확보

---

### 3.2. [SyRS] DICOM 메타데이터 파싱

**ID:** SR-2
**유형:** 기능적 요구사항

**설명:**
근거: PLAYG-1237 Principle of Operation, IU-08 작동 원리

- 입력: DICOM 파일 데이터 스트림
- 처리: DICOM 헤더 메타데이터(환자 정보, 스터디 정보, 픽셀 간격, 슬라이스 두께 등)와 픽셀 데이터를 JavaScript 기반 DICOM 파서로 해석
- 출력: 복셀 데이터 및 메타데이터 구조체

---

### 3.3. [SyRS] MPR 다단면 렌더링

**ID:** SR-3
**유형:** 기능적 요구사항

**설명:**
근거: PLAYG-1237 Indication, IU-03 적응증, Key Performance Spec

- 입력: 3차원 볼륨 데이터
- 처리: 축상(Axial), 관상(Coronal), 시상(Sagittal) 단면을 실시간 재구성
- 출력: 세 방향 MPR 영상을 화면에 동시 디스플레이

---

### 3.4. [SyRS] 3D 볼륨 렌더링

**ID:** SR-4
**유형:** 기능적 요구사항

**설명:**
근거: PLAYG-1237 Intended Purpose, IU-02 의도된 목적

- 입력: 3차원 복셀 데이터
- 처리: WebGL 기반 3D 볼륨 렌더링
- 출력: 회전 가능한 3D 영상 뷰

---

### 3.5. [SyRS] 슬라이스 탐색

**ID:** SR-5
**유형:** 기능적 요구사항

**설명:**
근거: PLAYG-1237 Principle of Operation, IU-08 작동 원리, Key Performance Spec

- 입력: 사용자 마우스/키보드 입력
- 처리: 슬라이스 인덱스 변경
- 출력: 해당 슬라이스 위치의 단면 영상 갱신

---

### 3.6. [SyRS] 확대/축소 및 이동

**ID:** SR-6
**유형:** 기능적 요구사항

**설명:**
근거: PLAYG-1237 Key Performance Spec, IU-10 성능 사양

- 입력: 마우스 드래그(이동), 마우스 휠/버튼(확대/축소)
- 처리: 뷰 변환 행렬 적용
- 출력: 확대/축소 및 이동된 영상

---

### 3.7. [SyRS] 윈도우 레벨 조절

**ID:** SR-7
**유형:** 기능적 요구사항

**설명:**
근거: PLAYG-1237 Principle of Operation, Key Performance Spec

- 입력: 사용자 마우스 드래그(WL/WW 조절)
- 처리: 픽셀 값 매핑 범위 변경
- 출력: 명암이 조절된 영상

---

### 3.8. [SyRS] 거리 측정

**ID:** SR-8
**유형:** 기능적 요구사항

**설명:**
근거: PLAYG-1237 Key Performance Spec, IU-10 성능 사양

- 입력: 사용자가 영상 상에 두 점을 지정
- 처리: 픽셀 간격(Pixel Spacing) 메타데이터 기반 거리 계산
- 출력: mm 단위 거리 표시

---

### 3.9. [SyRS] 오프라인 로컬 동작

**ID:** SR-9
**유형:** 성능 요구사항

**설명:**
근거: PLAYG-1237 Use Environment, IU-07 사용 환경

- 입력: 없음 (환경 요구사항)
- 처리: 네트워크 연결 없이 모든 기능 동작
- 출력: 인터넷 불필요한 독립 동작

---

### 3.10. [SyRS] 웹 브라우저 호환성

**ID:** SR-10
**유형:** 인터페이스 요구사항

**설명:**
근거: PLAYG-1237 Use Environment, IU-07 사용 환경, Key Performance Spec

- 입력: 없음 (환경 요구사항)
- 처리: 최신 웹 브라우저에서 정상 동작
- 출력: Chrome, Edge, Firefox 지원

---

### 3.11. [SyRS] 환자 정보 보호

**ID:** SR-11
**유형:** 보안 요구사항

**설명:**
근거: PLAYG-1237 Warnings and Precautions, IU-12 경고 및 주의사항, User Constraint

- 입력: DICOM 파일 내 환자 식별 정보(PHI)
- 처리: 로컬에서만 데이터 처리, 외부 전송 금지
- 출력: 환자 데이터의 로컬 한정 처리

---

### 3.12. [SyRS] DICOM 3.0 표준 준수

**ID:** SR-12
**유형:** 규제 요구사항

**설명:**
근거: PLAYG-1237 Key Performance Spec, IU-10 성능 사양, User Constraint

- 입력: DICOM 3.0 표준 CBCT 데이터
- 처리: 표준 준수 파싱 및 렌더링
- 출력: 표준 호환 영상 표시

---

### 3.13. [SyRS] 영상 로드 성능

**ID:** SR-13
**유형:** 성능 요구사항

**설명:**
근거: PLAYG-1237 Key Performance Spec, Clinical Benefit, IU-11 임상적 이점

- 입력: DICOM CBCT 영상 데이터
- 처리: 파일 파싱 및 볼륨 구성
- 출력: 렌더링 준비 완료 상태

---

### 3.14. [SyRS] 진단 목적 제외 명시

**ID:** SR-14
**유형:** 규제 요구사항

**설명:**
근거: PLAYG-1237 Indication, User Constraint, IU-09 금기 사항, Warnings and Precautions

- 입력: 없음 (규제 요구사항)
- 처리: UI에 진단 목적 아님 명시
- 출력: 사용자 경고 문구 표시

---


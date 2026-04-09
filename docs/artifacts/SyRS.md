# System Requirements Specification (SyRS)

## 1. 개요 (Introduction)

### 1.1 목적 (Purpose)
본 문서는 PLAYG 프로젝트의 시스템 요구사항을 정의합니다.

### 1.2 문서 정보
- **상위 티켓:** PLAYG-1229
- **생성일:** 2026-04-09
- **총 항목 수:** 12

---

## 2. 요약 목록 (Summary)

| # | 요구사항 (SyRS-01) | 유형 (SyRS-02) |
|---|-------------------|----------------|
| 1 | [SyRS] DICOM 파일 로드 | Functional |
| 2 | [SyRS] MPR 단면 렌더링 | Functional |
| 3 | [SyRS] 슬라이스 탐색 | Functional |
| 4 | [SyRS] 확대/축소 및 이동 | Functional |
| 5 | [SyRS] 윈도우 레벨 조절 | Functional |
| 6 | [SyRS] 거리 측정 | Functional |
| 7 | [SyRS] 오프라인 동작 | Performance |
| 8 | [SyRS] 웹 브라우저 호환성 | Interface |
| 9 | [SyRS] 사용자 제약 및 경고 표시 | Regulatory |
| 10 | [SyRS] 환자 개인정보 보호 | Security |
| 11 | [SyRS] 3D 볼륨 렌더링 | Functional |
| 12 | [SyRS] DICOM 메타데이터 표시 | Interface |


---

## 3. 상세 요구사항 (Detailed Requirements)

### 3.1. [SyRS] DICOM 파일 로드

**ID:** SR-1
**유형:** 기능적 요구사항

**설명:**
근거: PLAYG-1237 (Intended Purpose, Principle of Operation, Key Performance Spec), IU-08 작동 원리

- 입력: 사용자가 로컬 파일 시스템에서 선택한 DICOM 3.0 CBCT 파일(.dcm) 또는 DICOM 폴더
- 처리: JavaScript 기반 DICOM 파서를 통해 헤더 메타데이터와 픽셀 데이터 해석
- 출력: 렌더링 가능한 3D 볼륨 데이터 구성 완료

---

### 3.2. [SyRS] MPR 단면 렌더링

**ID:** SR-2
**유형:** 기능적 요구사항

**설명:**
근거: PLAYG-1237 (Key Performance Spec: 축상/관상/시상 단면 표시), IU-08 작동 원리(4단계 MPR 재구성)

- 입력: 파싱된 3D 볼륨 데이터
- 처리: 축상(Axial), 관상(Coronal), 시상(Sagittal) 단면 실시간 재구성
- 출력: 세 방향 단면 영상을 화면에 동시 디스플레이

---

### 3.3. [SyRS] 슬라이스 탐색

**ID:** SR-3
**유형:** 기능적 요구사항

**설명:**
근거: PLAYG-1237 (Key Performance Spec: 슬라이스 탐색, Principle of Operation: 슬라이스 이동)

- 입력: 사용자의 마우스 휠/키보드 입력
- 처리: 선택 단면의 슬라이스 인덱스를 증감하여 해당 단면 이미지 갱신
- 출력: 갱신된 단면 영상 디스플레이

---

### 3.4. [SyRS] 확대/축소 및 이동

**ID:** SR-4
**유형:** 기능적 요구사항

**설명:**
근거: PLAYG-1237 (Key Performance Spec: Zoom/Pan, Principle of Operation: 확대/축소)

- 입력: 마우스 휠(확대/축소) 및 드래그(이동) 입력
- 처리: 뷰포트의 줌 배율 및 팬 오프셋 계산
- 출력: 확대/축소 및 이동이 반영된 단면 영상

---

### 3.5. [SyRS] 윈도우 레벨 조절

**ID:** SR-5
**유형:** 기능적 요구사항

**설명:**
근거: PLAYG-1237 (Key Performance Spec: 실시간 윈도우 레벨(WL/WW) 조절, Principle of Operation: 윈도우 레벨 조절)

- 입력: 사용자의 마우스/키보드 입력을 통한 Window Level(WL) 및 Window Width(WW) 값 변경
- 처리: 변경된 WL/WW 값을 기반으로 픽셀-밝기 매핑 재계산
- 출력: 조정된 명암의 단면 영상

---

### 3.6. [SyRS] 거리 측정

**ID:** SR-6
**유형:** 기능적 요구사항

**설명:**
근거: PLAYG-1237 (Key Performance Spec: 거리 측정 mm 단위, 픽셀 간격 기반)

- 입력: 사용자의 마우스 클릭으로 지정한 두 점
- 처리: DICOM 메타데이터의 픽셀 간격(Pixel Spacing) 값을 활용하여 두 점 사이의 물리적 거리 계산
- 출력: mm 단위 거리 측정값 화면 표시

---

### 3.7. [SyRS] 오프라인 동작

**ID:** SR-7
**유형:** 성능 요구사항

**설명:**
근거: PLAYG-1237 (Use Environment: 네트워크 불필요, 로컬 독립 동작; Key Performance Spec: 오프라인 동작 가능)

- 입력: 없음 (환경 조건)
- 처리: 모든 영상 로드, 파싱, 렌더링, 사용자 인터랙션이 로컬 브라우저 내에서만 수행
- 출력: 네트워크 연결 없이 전체 기능 동작

---

### 3.8. [SyRS] 웹 브라우저 호환성

**ID:** SR-8
**유형:** 인터페이스 요구사항

**설명:**
근거: PLAYG-1237 (Use Environment: 인터넷 브라우저가 설치된 데스크탑/노트북; Key Performance Spec: Chrome, Edge, Firefox 지원)

- 입력: 브라우저 환경 정보
- 처리: HTML5 Canvas/WebGL 기반 렌더링 엔진 동작
- 출력: 지원 브라우저에서 동일한 UI/UX 제공

---

### 3.9. [SyRS] 사용자 제약 및 경고 표시

**ID:** SR-9
**유형:** 규제 요구사항

**설명:**
근거: PLAYG-1237 (User Constraint: 영상 확인 전용 뷰어로 독립적 진단에 사용 불가; Warnings and Precautions: 단독 진단 도구가 아님)

- 입력: 없음 (표시 조건)
- 처리: 소프트웨어 구동 시 사용 제약 문구를 항상 표시
- 출력: 화면 상에 진단 목적 불가 경고 문구 표시

---

### 3.10. [SyRS] 환자 개인정보 보호

**ID:** SR-10
**유형:** 보안 요구사항

**설명:**
근거: PLAYG-1237 (Warnings and Precautions: 환자 개인정보 보호 유의; Clinical Benefit: 로컬 동작으로 외부 전송 최소화)

- 입력: DICOM 파일 내 환자 식별 정보(PHI)
- 처리: 로컬 브라우저 내에서만 데이터 처리, 외부 전송 금지
- 출력: 환자 데이터의 외부 유출 차단

---

### 3.11. [SyRS] 3D 볼륨 렌더링

**ID:** SR-11
**유형:** 기능적 요구사항

**설명:**
근거: PLAYG-1237 (Intended Purpose: 3D 볼륨 렌더링 디스플레이; IU-08 작동 원리: HTML5 Canvas/WebGL 렌더링)

- 입력: 파싱된 3D 볼륨 데이터
- 처리: WebGL 기반 볼륨 렌더링 알고리즘 적용
- 출력: 3D 볼륨 렌더링 영상 디스플레이

---

### 3.12. [SyRS] DICOM 메타데이터 표시

**ID:** SR-12
**유형:** 인터페이스 요구사항

**설명:**
근거: PLAYG-1237 (Principle of Operation: DICOM 파일 헤더 메타데이터 해석; Key Performance Spec: DICOM 3.0 CBCT 영상 지원)

- 입력: DICOM 파일 헤더 메타데이터
- 처리: 환자 정보, 촬영 정보, 영상 파라미터 등 추출
- 출력: 주요 메타데이터를 사용자에게 화면에 표시

---


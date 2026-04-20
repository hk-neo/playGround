# DentiView3D - 웹 기반 CBCT 영상 뷰어

로컬에서만 동작하는 웹 브라우저 기반 CBCT(Cone Beam Computed Tomography) 영상 뷰어입니다.

## 특징

- **로컬 전용**: 네트워크 통신 없이 로컬 파일만 읽어서 렌더링
- **DICOM 3.0 지원**: 표준 DICOM 파일 파싱 (자체 구현 파서)
- **MPR 3단면**: Axial, Coronal, Sagittal 동시 렌더링
- **WL/WW 제어**: Window Level/Width 조절 가능
- **슬라이스 탐색**: 슬라이더 및 마우스 휠로 슬라이스 이동

## 기술 스택

- Vanilla JavaScript (ES6+), 외부 라이브러리 없음
- Vite (빌드 도구)
- Vitest (테스트 프레임워크)
- HTML5 Canvas (렌더링)

## 개발

```bash
cd viewer
npm install
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm test         # 테스트 실행
```

## 사용법

1. `npm run dev` 실행 후 브라우저에서 접속
2. "DICOM 파일 열기" 또는 "폴더 열기" 버튼으로 파일 선택
3. MPR 3단면 영상 확인

## 제약사항

- 진단 목적이 아닌 영상 시각적 확인 및 품질 검토용 보조 도구입니다
- 지원 전송 구문: Explicit VR Little Endian, Implicit VR Little Endian, Explicit VR Big Endian
- 네트워크 연결 불필요, 외부 통신 원천 차단 (CSP 정책 적용)

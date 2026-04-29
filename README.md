# DentiView3D - 웹 기반 CBCT 영상 뷰어

로컬에서만 동작하는 웹 브라우저 기반 CBCT(Cone Beam Computed Tomography) 영상 뷰어입니다.
DICOM 3.0 표준 파일을 파싱하여 MPR 3단면(Axial, Coronal, Sagittal)을 렌더링합니다.

## 프로젝트 개요

- **프로젝트명**: DentiView3D
- **버전**: 0.1.0
- **목적**: 치과용 CBCT 영상의 시각적 확인 및 품질 검토 보조 도구
- **안전 등급**: IEC 62304 Class A
- **제약사항**: 진단 목적이 아님, 오프라인 전용, 외부 라이브러리 금지

## 기술 스택

| 항목 | 내용 |
| --- | --- |
| 언어 | JavaScript (ES2020+), Vanilla JS |
| 빌드 도구 | Vite 5.x |
| 테스트 프레임워크 | Vitest 3.x |
| 린터 | ESLint 9.x |
| 포매터 | Prettier 3.x |
| 렌더링 | HTML5 Canvas |

## 프로젝트 구조

```text
source/
├── .github/workflows/ci.yml   # CI 파이프라인
├── docs/                       # 설계 문서
│   ├── spec-kit/               # 기능 명세 및 구현 계획
│   └── artifacts/              # SRS, SDS, SAD 등 산출물
├── viewer/                     # 메인 애플리케이션
│   ├── src/                    # 소스 코드
│   │   ├── components/         # UI 컴포넌트 및 파서 모듈
│   │   ├── data/               # 데이터 처리 및 DICOM 파서
│   │   ├── constants/          # 상수 정의
│   │   ├── errors/             # 커스텀 에러 클래스
│   │   ├── types/              # 타입 정의 모듈
│   │   └── styles/             # CSS 스타일시트
│   ├── tests/                  # 테스트 코드
│   │   └── unit/               # 단위 테스트
│   ├── dist/                   # 빌드 산출물
│   ├── package.json            # 의존성 관리
│   └── vite.config.js          # Vite 설정
└── README.md                   # 본 파일
```

## 설치 방법

```bash
# 저장소 클론 후
cd viewer
npm install
```

## 실행 방법

```bash
cd viewer
npm run dev      # 개발 서버 시작 (http://localhost:5173)
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 결과 미리보기
```

## 테스트 실행 방법

```bash
cd viewer
npm test                # 전체 테스트 실행
npm run test:watch      # 테스트 파일 변경 감지 모드
npm run test:coverage   # 커버리지 리포트 포함 실행
```

## 코드 품질

```bash
cd viewer
npm run lint     # ESLint 정적 분석
npm run format   # Prettier 코드 포매팅
```

## CI/CD

- **트리거**: `main` 브랜치 Push 및 Pull Request
- **파이프라인 단계**: Lint → Test → Build
- **설정 파일**: `.github/workflows/ci.yml`

## 라이선스

내부 프로젝트 - 외부 배포 금지

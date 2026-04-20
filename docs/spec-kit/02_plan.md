# Implementation Plan: DICOMParser 상세 설계 (SDS-3.1)

**Branch**: `feature/PLAYG-1385` | **Date**: 2026-04-20 | **Spec**: `docs/spec-kit/01_spec.md`
**Ticket**: `PLAYG-1385` | **Type**: Detailed Design

---

## Summary

DICOMParser 컴포넌트의 상세 설계를 구현한다. 외부 라이브러리 없이 DICOM 3.0 표준 파일을 자체 파싱하는 기능을 구현하며(ADR-2),
매직 바이트 검증, 전송 구문 확인, 메타데이터 파싱, 픽셀 데이터 추출, 오류 처리의 5가지 핵심 기능을 제공한다.
SRS의 FR-1.1~1.5, FR-7.2 요구사항과 HAZ-1.1, HAZ-5.2 위험 완화 조치를 추적 가능하게 구현한다.
DataValidator 컴포넌트와 연동하여 파싱 결과의 유효성을 검증한다.

---

## Technical Context

| 항목                     | 내용                    |
| ------------------------ | ----------------------- |
| **Language/Version**     | TypeScript 5.x (엄격 모드)      |
| **Primary Dependencies** | 없음 (자체 구현, ADR-2)          |
| **Storage**              | 메모리 전용 (ArrayBuffer, ADR-3)              |
| **Testing**              | Vitest (단위 테스트)     |
| **Target Platform**     | 웹 브라우저 (Chrome, Edge, Firefox 최신)       |
| **Performance Goals**    | 150MB CBCT 파일 10초 이내 파싱 완료    |
| **Constraints**          | 외부 네트워크 통신 금지(FR-5.1), 외부 라이브러리 사용 금지(ADR-2), DICOM 3.0 표준 준수(FR-7.2) |

---

## Constitution Check

- **SOLID 원칙**: DICOMParser는 단일 책임(DICOM 파싱만 담당)을 원칙으로 한다. 검증 로직은 DataValidator에 위임하여 관심사를 분리한다. ParseResult 인터페이스를 통해 파싱 결과를 추상화한다.
- **레이어 분리**: DICOMParser는 Data Layer에 위치하며, Business Layer(VolumeBuilder)에 의해 소비된다. 상위 레이어에 대한 의존성이 없어야 한다.
- **에러 처리 전략**: 예외 발생 대신 구조화된 ParseResult.errors 배열을 통해 모든 오류를 반환한다. 오류는 심각도(fatal/warning/info)별로 분류된다.
- **보안 고려사항**: 파싱된 데이터는 외부 전송 금지(FR-5.1), 메모리 상에만 유지(FR-5.2), ArrayBuffer 참조는 명시적 해제 가능해야 함(FR-5.3)

---

## Project Structure

### Documentation
```text
docs/
├── spec-kit/
│   ├── 01_spec.md          # DICOMParser 기능 명세
│   ├── 02_plan.md           # 본 구현 계획서
│   └── 03_tasks.md          # 작업 분해 구조
└── artifacts/
    ├── SDS.md               # 소프트웨어 상세 설계 (전체)
    ├── SRS.md               # 소프트웨어 요구사항 명세서
    └── SAD.md               # 소프트웨어 아키텍처 설명서
```

### Source Code
```text
src/
├── data-layer/
│   ├── DICOMParser.ts       # DICOM 파서 메인 클래스
│   ├── types.ts             # ParseResult, DICOMMetadata, ErrorMessage 타입 정의
│   ├── constants.ts         # DICOM 태그 사전, 매직 바이트 오프셋 상수
│   ├── tagReader.ts         # 태그 읽기 유틸리티 (readTag, readValue)
│   └── byteOrderUtils.ts    # 바이트 오더 판별 및 변환 유틸리티
└── __tests__/
    ├── DICOMParser.test.ts  # DICOMParser 통합 테스트
    ├── validateMagicByte.test.ts   # 매직 바이트 검증 단위 테스트
    ├── validateTransferSyntax.test.ts # 전송 구문 검증 단위 테스트
    ├── parseMetadata.test.ts       # 메타데이터 파싱 단위 테스트
    ├── parsePixelData.test.ts      # 픽셀 데이터 파싱 단위 테스트
    └── fixtures/                   # 테스트용 DICOM 파일 픽스처
        ├── valid_cbct.dcm          # 유효한 CBCT 파일 (16-bit)
        ├── valid_8bit.dcm          # 유효한 8-bit 파일
        ├── invalid_magic.dcm       # 매직 바이트 무효 파일
        ├── compressed_syntax.dcm   # 압축 전송 구문 파일
        └── corrupted.dcm           # 손상된 파일
```

---

## Implementation Approach

### Phase 순서 및 접근 방식
1. **Setup**: TypeScript 프로젝트 설정, 타입 정의(types.ts), 상수 정의(constants.ts) 작성
2. **Core Implementation**: DICOMParser 클래스의 6개 공개 메서드를 순차적으로 구현. validateMagicByte -> validateTransferSyntax -> parseMetadata -> parsePixelData -> handleParseError -> parseDICOM 순서로
3. **Testing**: 각 메서드별 단위 테스트 작성 후 통합 테스트(parseDICOM) 작성. 엣지 케이스 7개 시나리오 검증
4. **Integration**: DataValidator 인터페이스 연동 검증, VolumeBuilder 소비 인터페이스 확인

### Key Technical Decisions

- **결정 1**: DICOM 태그 사전을 constants.ts에 내장한다 — 이유: ADR-2에 따라 외부 라이브러리 의존이 없어야 하므로, DICOM 표준 태그 정의를 자체적으로 포함해야 한다. 최소 필요 태그(약 50개)만 포함하여 번들 크기를 최소화한다.
- **결정 2**: DataView를 사용하여 바이트 단위 접근한다 — 이유: ArrayBuffer의 특정 오프셋에서 다양한 크기(1/2/4바이트)의 데이터를 읽어야 하며, DataView는 리틀/빅 엔디안을 명시적으로 제어할 수 있다.
- **결정 3**: 파싱 오류는 예외가 아닌 errors 배열로 반환한다 — 이유: IEC 62304 Class A 요구사항에 따라 안정적인 오류 처리가 필요하며, 부분 파싱 결과(메타데이터는 유효, 픽셀 데이터는 손상 등)를 지원해야 한다.
- **결정 4**: 비동기 파싱은 Promise 기반으로 구현한다 — 이유: 대용량 파일 처리 시 UI 스레드 블로킹을 방지하고, 타임아웃 메커니즘 적용을 위해 비동기 처리가 필요하다. Web Worker 활용도 고려한다.
- **결정 5**: 픽셀 데이터 추출 시 BitsAllocated 기반 자동 타입 매핑을 수행한다 — 이유: 8비트는 Uint8Array, 16비트는 Int16Array/Uint16Array, 32비트는 Float32Array로 자동 변환하여 후속 처리(VolumeBuilder, 렌더링)의 편의성을 높인다.

---

## Complexity Tracking

- DICOM 표준은 매우 방대하므로, 본 구현에서는 CBCT 영상에 필요한 최소 태그 세트만 지원한다. 추후 확장이 필요한 경우 태그 사전을 추가하는 방식으로 대응한다.
- 압축 전송 구문(JPEG, JPEG2000, RLE 등)은 지원하지 않는다. 이는 validateTransferSyntax에서 사전 거부되며, 향후 필요 시 별도 디코더 모듈을 추가해야 한다.
- 파일 읽기는 브라우저 File API에 의존하므로 Node.js 환경에서는 직접 실행할 수 없다. 테스트 시 ArrayBuffer 기반 목(Mock) 파일 객체를 사용한다.

---

## References
- Spec: `docs/spec-kit/01_spec.md`
- 티켓: `PLAYG-1385`
- SDS 섹션 3.1: `docs/artifacts/SDS.md` (DICOMParser 상세 설계)
- SRS: `docs/artifacts/SRS.md` (FR-1.1~1.5, FR-7.2)
- SAD: `docs/artifacts/SAD.md` (ADR-2 DICOM 파서 자체 구현)
- RMR: `docs/artifacts/RMR.md` (HAZ-1.1, HAZ-5.2)
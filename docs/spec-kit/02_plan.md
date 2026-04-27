# 02_plan.md - validateMagicByte() SDS-3.2 구현 계획

## 구현 전략

### 기존 코드 분석
- viewer/src/data/dicomParser/validateMagicByte.js: DICOM(DICM, offset 128) 전용
- viewer/src/data/dicomParser/constants.js: DICOM 관련 상수 정의
- parseDICOM.js에서 validateMagicByte()를 호출하여 boolean 결과 사용

### 구현 방안
1. constants.js에 매직바이트 테이블(MAGIC_TABLE) 추가
   - FW(PLAYG), CFG, DLOG 시그니처 정의
2. validateMagicByte.js 확장
   - 기존 DICOM 검증 로직 유지 (하위 호환성)
   - 새로운 validateGenericMagicByte(buffer) 함수 추가
   - MAGIC_TABLE 기반 순차 비교 로직 구현
   - 결과 객체 반환: { valid: boolean, fileType: string|null, errorCode: string|null }
3. 기존 validateMagicByte(DICOM)은 그대로 유지하여 parseDICOM 파이프라인 영향 없음

### 파일 변경 계획
- 수정: viewer/src/data/dicomParser/constants.js (MAGIC_TABLE 추가)
- 수정: viewer/src/data/dicomParser/validateMagicByte.js (범용 검증 함수 추가)
- 수정: viewer/tests/unit.test.js (새 테스트 케이스 추가)
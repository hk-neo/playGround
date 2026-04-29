# Plan: readTagValue() VR별 파싱 구현 계획

## 구현 파일

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `viewer/src/data/dicomParser/tagReader.js` | 수정 | readTagValue() 보강, AT VR 추가, 안전성 검증 |
| `viewer/tests/unit.test.js` | 수정 | VR별 단위 테스트 추가 |

## 구현 순서

### Phase 1: readTagValue() 안전성 및 VR 세분화
1. 모든 DataView 읽기 전 hasRemaining() 가드 추가
2. 문자열 VR 케이스 세분화 (CS, DA, UI 등 명시적 처리)
3. AT (Attribute Tag) VR 케이스 추가
4. DS/IS 다중값 파싱 지원
5. 에러 발생 시 offset 무결성 보장

### Phase 2: 단위 테스트
1. 정수 VR (US, SS, UL, SL) 테스트
2. 실수 VR (FL, FD) 테스트
3. 문자열 숫자 VR (DS, IS) 단일/다중값 테스트
4. 문자열 VR (CS, DA, LO, SH, PN, UI, TM, DT) 테스트
5. 바이너리 VR (OW, OB, UN) 테스트
6. AT VR 테스트
7. SQ VR 테스트
8. 버퍼 경계 조건 테스트
9. 기존 통합 테스트 회귀 확인

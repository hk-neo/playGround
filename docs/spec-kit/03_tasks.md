# Tasks: readTagValue() VR별 파싱 구현

## Phase 1: 소스코드 구현

- [x] T1: readTagValue() 함수 내 정수 VR (US, SS, UL, SL) 버퍼 안전성 가드 추가
- [x] T2: readTagValue() 함수 내 실수 VR (FL, FD) 버퍼 안전성 가드 추가
- [x] T3: 문자열 VR 세분화 - CS, DA, LO, SH, PN, UI, TM, DT 명시적 case 추가
- [x] T4: DS, IS 다중값(백슬래시 구분) 파싱 지원
- [x] T5: AT (Attribute Tag) VR 파싱 case 추가
- [x] T6: 바이너리 VR (OW, OB, UN) 안전성 보강
- [x] T7: 파싱 실패 시 offset 무결성 보장 (try-catch + advance)

## Phase 2: 단위 테스트

- [x] T8: 정수 VR (US, SS, UL, SL) 단위 테스트 작성
- [x] T9: 실수 VR (FL, FD) 단위 테스트 작성
- [x] T10: 문자열 숫자 VR (DS, IS) 단일/다중값 단위 테스트 작성
- [x] T11: 문자열 VR (CS, DA, LO, PN, UI, TM) 단위 테스트 작성
- [x] T12: 바이너리 VR (OW, OB, UN) 및 AT VR 단위 테스트 작성
- [x] T13: SQ VR 및 버퍼 경계 조건 단위 테스트 작성

## Phase 3: 검증

- [x] T14: 전체 테스트 실행 및 빌드 통과 확인
- [ ] T15: Jira 완료 댓글 게시 및 session_context.md 갱신
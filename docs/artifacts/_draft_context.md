# PLAYG-1312 문서 작성용 컨텍스트

## 현재 티켓
- **Key**: PLAYG-1312
- **Summary**: [SDS]
- **Type**: Document

## 연결된 티켓 요약
- PA 문서: 0개
- EA 문서: 17개
- Hazard: 14개
- Gate: 2개
- Document: 8개
- 기타: 42개
- **총 83개** 티켓 연결됨

## Hazard 티켓
- **PLAYG-1314**: [HAZ-1.1] DICOM 파싱 오류 영상 왜곡
- **PLAYG-1315**: [HAZ-1.2] MPR 단면 재구성 오류
- **PLAYG-1316**: [HAZ-1.3] 3D 볼륨 렌더링 왜곡
- **PLAYG-1317**: [HAZ-1.4] 윈도우레벨 조절 오작동
- **PLAYG-1318**: [HAZ-1.5] 슬라이스 탐색 인덱스 오류
- ... 외 9개

## EA 기존 문서 티켓
- **PLAYG-1310**: [SRS]
- **PLAYG-1311**: [SAD]
- **PLAYG-1370**: [ADR-1] Layered Architecture 채택
- **PLAYG-1371**: [ADR-2] DICOM 파서 자체 구현
- **PLAYG-1372**: [ADR-3] 메모리 무상태 데이터 처리
- **PLAYG-1373**: [ADR-4] WebGL 2.0 렌더링 채택
- **PLAYG-1374**: [ADR-5] 정적 단일 번들 배포
- **PLAYG-1375**: [COMP-1.1] DICOM 파일 파서
- **PLAYG-1376**: [COMP-1.2] 데이터 검증기
- **PLAYG-1378**: [COMP-2.2] 측정 엔진
- **PLAYG-1379**: [COMP-2.3] 보안 가드
- **PLAYG-1380**: [COMP-3.1] MPR 렌더러
- **PLAYG-1381**: [COMP-3.2] 3D 볼륨 렌더러
- **PLAYG-1382**: [COMP-3.3] 뷰 변환 엔진
- **PLAYG-1383**: [COMP-4.1] UI 컨트롤러
- **PLAYG-1384**: [COMP-4.2] 뷰포트 관리자
- **PLAYG-1377**: [COMP-2.1] 볼륨 데이터 빌더

## EA 문서 내용 (Git)

### PLAYG-1310
(Git에서 문서를 찾을 수 없습니다)

### PLAYG-1311
(Git에서 문서를 찾을 수 없습니다)

### PLAYG-1370
(Git에서 문서를 찾을 수 없습니다)

### PLAYG-1371
(Git에서 문서를 찾을 수 없습니다)

### PLAYG-1372
(Git에서 문서를 찾을 수 없습니다)

### PLAYG-1373
(Git에서 문서를 찾을 수 없습니다)

### PLAYG-1374
(Git에서 문서를 찾을 수 없습니다)

### PLAYG-1375
(Git에서 문서를 찾을 수 없습니다)

### PLAYG-1376
(Git에서 문서를 찾을 수 없습니다)

### PLAYG-1378
(Git에서 문서를 찾을 수 없습니다)

### PLAYG-1379
(Git에서 문서를 찾을 수 없습니다)

### PLAYG-1380
(Git에서 문서를 찾을 수 없습니다)

### PLAYG-1381
(Git에서 문서를 찾을 수 없습니다)

### PLAYG-1382
(Git에서 문서를 찾을 수 없습니다)

### PLAYG-1383
(Git에서 문서를 찾을 수 없습니다)

### PLAYG-1384
(Git에서 문서를 찾을 수 없습니다)

### PLAYG-1377
(Git에서 문서를 찾을 수 없습니다)

## 사용 가이드
상세 문서가 필요하면 Jira Toolkit을 사용하세요:
```bash
# 티켓 상세 조회
python3 .agents/runner/jira_toolkit.py fetch_linked <TICKET_KEY>

# 트리 조회
python3 .agents/runner/jira_toolkit.py fetch_tree <TICKET_KEY> --depth 3
```

# PLAYG-1460 문서 작성용 컨텍스트

## 현재 티켓
- **Key**: PLAYG-1460
- **Summary**: [SRS] DentiView3D 소프트웨어 요구사항 명세서
- **Type**: Document

## 연결된 티켓 요약
- PA 문서: 0개
- EA 문서: 2개
- Hazard: 17개
- Gate: 1개
- Document: 2개
- **총 22개** 티켓 연결됨

## Hazard 티켓
- **PLAYG-1496**: [HAZ-1.1] 비 DICOM 파일 입력
- **PLAYG-1497**: [HAZ-1.2] 미지원 전송 구문 파일
- **PLAYG-1498**: [HAZ-1.3] 필수 DICOM 태그 누락
- **PLAYG-1499**: [HAZ-1.4] 초대형 파일 메모리 과부하
- **PLAYG-1500**: [HAZ-1.5] 픽셀 데이터 길이 불일치
- ... 외 12개

## 사용 가이드
상세 문서가 필요하면 Jira Toolkit을 사용하세요:
```bash
# 티켓 상세 조회
python3 .agents/runner/jira_toolkit.py fetch_linked <TICKET_KEY>

# 트리 조회
python3 .agents/runner/jira_toolkit.py fetch_tree <TICKET_KEY> --depth 3
```

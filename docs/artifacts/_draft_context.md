# PLAYG-1312 문서 작성용 컨텍스트

## 현재 티켓
- **Key**: PLAYG-1312
- **Summary**: [SDS]
- **Type**: Document

## 연결된 티켓 요약
- PA 문서: 0개
- EA 문서: 2개
- Hazard: 14개
- Gate: 2개
- Document: 8개
- 기타: 57개
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

## 사용 가이드
상세 문서가 필요하면 Jira Toolkit을 사용하세요:
```bash
# 티켓 상세 조회
python3 .agents/runner/jira_toolkit.py fetch_linked <TICKET_KEY>

# 트리 조회
python3 .agents/runner/jira_toolkit.py fetch_tree <TICKET_KEY> --depth 3
```

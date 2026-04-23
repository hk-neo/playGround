# System Requirement (Restored from Jira: PLAYG-1641)

## [SR-01]
[FR-1.1] DICOM 매직 바이트 검증

## [SR-02]
Functional

## [SR-03]
파일 오프셋 128~131의 4바이트가 DICM인지 확인. 불일치 시 PARSE_ERR_INVALID_MAGIC 에러 반환. 근거: HAZ-1.1, RMR-05

## [SR-04]
N/A

## [SR-05]
단위 테스트: validateMagicByte 함수에 정상/비정상 버퍼 입력 시 각각 true/false 반환 확인


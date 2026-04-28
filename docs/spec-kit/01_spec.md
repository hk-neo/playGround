# 01_spec.md - validateMagicByte() SDS-3.2

## 개요
- 모듈명: validateMagicByte()
- 기능: 파일 헤더의 매직바이트(Magic Byte)를 읽어 예상된 시그니처와 비교하여 파일 포맷의 유효성을 검증한다.
- 입력: 파일 바이트 스트림 (ArrayBuffer)
- 출력: 검증 결과 객체 (유효 시 파일 타입 포함, 무효 시 에러 코드 포함)

## 매직바이트 정의

| 파일 타입 | 매직바이트(Hex) | 오프셋 | 길이 |
|-----------|-----------------|--------|------|
| FW 바이너리 | 0x50 0x4C 0x59 0x47 (PLAYG) | 0x00 | 4 Byte |
| 설정 파일 | 0x43 0x46 0x47 (CFG) | 0x00 | 3 Byte |
| 데이터 로그 | 0x44 0x4C 0x47 (DLG) | 0x00 | 3 Byte |

## 기존 구현과의 관계
- 기존 validateMagicByte.js는 DICOM Part 10 (DICM, offset 128) 전용 검증
- SDS-3.2에서는 범용 매직바이트 검증 테이블을 추가하여 FW/CFG/DLOG 포맷도 지원

## 알고리즘 상세 흐름
1. ArrayBuffer 입력 검증 (null/undefined 체크)
2. 파일 최소 크기 검증 (4 Byte 이상)
3. 오프셋 0x00 위치에서 헤더 바이트 읽기 (최대 4Byte)
4. 매직바이트 테이블과 순차 비교
5. 일치 시 VALID + 파일 타입 반환
6. 미일치 시 INVALID_MAGIC_BYTE 에러 반환

## 에러 코드
- INVALID_MAGIC_BYTE: 매직바이트 불일치
- ERROR_FILE_READ_FAILED: 파일 읽기 실패 (null/invalid buffer)
- ERROR_FILE_TOO_SMALL: 파일 크기 부족 (4Byte 미만)

## 제약사항
- 파일 최소 크기: 4 Byte 이상
- 매직바이트 비교는 항상 오프셋 0x00부터 시작
- 바이너리 레벨에서 정확히 일치해야 함
- 스레드 안전성: 읽기 전용이므로 thread-safe

## 테스트 항목
- 정상 매직바이트 입력 시 VALID 반환 (FW/CFG/DLOG 각각)
- 잘못된 매직바이트 입력 시 INVALID_MAGIC_BYTE 반환
- 빈 파일 또는 최소 크기 미만 파일 처리
- null/undefined 버퍼 입력 시 에러 처리
- 경계값 테스트 (정확히 4Byte 파일)

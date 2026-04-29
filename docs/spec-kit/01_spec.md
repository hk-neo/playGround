# Spec: readTagValue() VR별 값 파싱 상세 설계 (SDS-3.6)

**티켓**: PLAYG-1825
**라벨**: DICOM, SDS-3.6, VR-parsing, tagReader
**관련 요구사항**: FR-2.2 (데이터셋 태그 순차 파싱), FR-2.3 (필수/선택 메타데이터 추출)
**관련 Hazard**: HAZ-5.3 (버퍼 오버플로우 방지), HAZ-1.3 (필수 태그 검증)

---

## 1. 목표

`readTagValue(ctx, vr, length)` 함수가 DICOM Value Representation(VR)별로 태그 값을 정확하게 디코딩하도록 구현한다.
현재 구현된 기본 골격을 DICOM PS3.5 표준에 맞게 보완하고, 안전성 검증 및 PHI 마스킹 연동을 강화한다.

## 2. 현재 구현 분석

`viewer/src/data/dicomParser/tagReader.js`의 `readTagValue()`는 이미 다음 VR을 처리 중:
- **정수 VR**: US, SS, UL, SL
- **실수 VR**: FL, FD
- **문자열 숫자 VR**: DS, IS
- **바이너리 VR**: OW, OB, UN (지연 접근 방식)
- **시퀀스 VR**: SQ
- **문자열 VR**: default 케이스로 일괄 처리

## 3. 구현 범위 (Jira AC 기준)

### 3.1 버퍼 안전성 검증 강화
- 모든 DataView 읽기 전 `ctx.hasRemaining()` 확인
- 버퍼 초과 시 안전한 에러 반환 (HAZ-5.3)
- 잘못된 length 값에 대한 방어 코드

### 3.2 문자열 VR 파싱 세분화
- CS (Code String): 최대 16바이트, 공백/패딩 트림
- DA (Date): YYYYMMDD 형식 검증
- LO (Long String), SH (Short String), PN (Person Name): 패딩 트림
- UI (Unique Identifier): null 패딩 제거, 점 구분자 검증
- TM (Time), DT (DateTime): 형식 준수 파싱
- LT (Long Text), ST (Short Text): 멀티밸류 처리

### 3.3 다중값(Multi-value) VR 파싱
- DS, IS 값이 백슬래시(\)로 구분된 다중값인 경우 배열 반환
- OW/OB 바이너리 값의 안전한 오프셋 관리

### 3.4 AT (Attribute Tag) VR 파싱 추가
- group + element 쌍을 읽어 태그 키 문자열로 반환

### 3.5 에러 처리 강화
- 파싱 실패 시 구조화된 에러 객체 반환
- 컨텍스트 offset 무결성 보장 (파싱 실패해도 offset은 정확히 전진)

### 3.6 PHI 마스킹 연동
- `maskPhiFields()`와의 연동 확인
- PHI 태그 식별 및 마스킹 대상 필드 보장

## 4. 인터페이스

```javascript
// 입력
readTagValue(ctx, vr, length)
// ctx: ParseContext 객체 (offset, buffer, dataView, isLittleEndian, isExplicitVR)
// vr: string | null (Value Representation 코드)
// length: number (값의 바이트 길이)

// 출력
// - string: 문자열 VR
// - number: 단일 숫자 VR (US, SS, UL, SL, FL, FD)
// - number[]: 다중값 숫자 VR (DS, IS 다중값)
// - Object { _binaryOffset, _binaryLength }: 바이너리 VR (OW, OB, UN)
// - string (tagKey 형식): AT VR
// - null: SQ, 파싱 실패
```

## 5. 검증 기준

1. 각 VR 타입별 단위 테스트 통과
2. 버퍼 경계 조건 테스트 통과 (HAZ-5.3)
3. 다중값 파싱 테스트 통과
4. 기존 `parseMetadata()` 통합 테스트 회귀 없음
5. DICOM PS3.5 표준 준수

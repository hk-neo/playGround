"""ER Gate 검토 도구 - 데이터 모델 정의"""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class CheckStatus(str, Enum):
    """검토 항목 상태"""
    PASS = "합격"
    FAIL = "부적합"
    WARNING = "경고"
    NOT_REVIEWED = "미검토"
    NOT_APPLICABLE = "해당없음"


class RiskLevel(str, Enum):
    """위험 수준"""
    ACCEPTABLE = "수용"
    LOW = "낮음"
    MEDIUM = "중간"
    HIGH = "높음"


class GateVerdict(str, Enum):
    """Gate 최종 판정"""
    PASS = "합격"
    CONDITIONAL_PASS = "조건부 합격"
    FAIL = "불합격"


# ── 입력 데이터 모델 ──────────────────────────────────────────────

class DICOMMetadata(BaseModel):
    """DICOM 메타데이터 구조체 (검토용)"""
    patient_name: Optional[str] = None
    patient_id: Optional[str] = None
    study_date: Optional[str] = None
    modality: Optional[str] = None
    pixel_spacing: Optional[list[float]] = None
    slice_thickness: Optional[float] = None
    image_orientation_patient: Optional[list[float]] = None
    rows: Optional[int] = None
    columns: Optional[int] = None
    number_of_frames: Optional[int] = None
    bits_allocated: Optional[int] = None
    transfer_syntax: Optional[str] = None
    window_center: Optional[float] = None
    window_width: Optional[float] = None


# ── 검토 결과 모델 ────────────────────────────────────────────────

class CheckItemResult(BaseModel):
    """개별 검토 항목 결과"""
    item_id: str = Field(..., description="검토 항목 ID (예: TR-01)")
    title: str = Field(..., description="검토 항목명")
    status: CheckStatus = Field(default=CheckStatus.NOT_REVIEWED, description="검토 상태")
    evidence: str = Field(default="", description="검토 근거")
    details: str = Field(default="", description="상세 설명")
    related_docs: list[str] = Field(default_factory=list, description="관련 문서 목록")
    findings: list[str] = Field(default_factory=list, description="발견 사항")


class TaskResult(BaseModel):
    """태스크 검토 결과"""
    task_id: str = Field(..., description="태스크 ID (예: TASK-01)")
    task_name: str = Field(..., description="태스크명")
    status: CheckStatus = Field(default=CheckStatus.NOT_REVIEWED, description="태스크 상태")
    check_items: list[CheckItemResult] = Field(default_factory=list, description="세부 검토 항목")
    summary: str = Field(default="", description="검토 요약")
    findings: list[str] = Field(default_factory=list, description="발견 사항")


class TraceabilityEntry(BaseModel):
    """추적성 매트릭스 항목"""
    source_id: str = Field(..., description="출발 요구사항 ID")
    source_name: str = Field(..., description="출발 요구사항명")
    target_ids: list[str] = Field(default_factory=list, description="매핑 대상 ID 목록")
    status: CheckStatus = Field(default=CheckStatus.NOT_REVIEWED)
    evidence: str = Field(default="")


class HazardMitigationEntry(BaseModel):
    """Hazard-완화조치 추적성 항목"""
    hazard_id: str = Field(..., description="Hazard ID")
    hazard_name: str = Field(..., description="Hazard 명칭")
    severity: str = Field(default="", description="심각도")
    probability: str = Field(default="", description="발생 확률")
    initial_risk: str = Field(default="", description="초기 위험 수준")
    mitigated_by: list[str] = Field(default_factory=list, description="완화조치 SRS 요구사항")
    residual_risk: str = Field(default="", description="잔여 위험")
    status: CheckStatus = Field(default=CheckStatus.NOT_REVIEWED)
    evidence: str = Field(default="")


class DocumentCompleteness(BaseModel):
    """문서 완전성 검토 결과"""
    doc_name: str = Field(..., description="문서명")
    doc_file: str = Field(..., description="파일명")
    exists: bool = Field(default=False, description="파일 존재 여부")
    required_sections: list[str] = Field(default_factory=list, description="필수 섹션 목록")
    found_sections: list[str] = Field(default_factory=list, description="발견된 섹션 목록")
    missing_sections: list[str] = Field(default_factory=list, description="누락된 섹션 목록")
    status: CheckStatus = Field(default=CheckStatus.NOT_REVIEWED)
    evidence: str = Field(default="")


class ERGateReviewReport(BaseModel):
    """ER Gate 검토 보고서 (최종 산출물)"""
    ticket_id: str = Field(default="PLAYG-1395")
    product_name: str = Field(default="Simple CBCT Viewer")
    review_date: str = Field(default="")
    reviewer: str = Field(default="ER Gate Review Tool v0.1.0")
    safety_class: str = Field(default="Class A")

    # 각 태스크 결과
    task_results: list[TaskResult] = Field(default_factory=list)

    # 최종 판정
    verdict: GateVerdict = Field(default=GateVerdict.FAIL)
    verdict_reason: str = Field(default="")

    # 종합 통계
    total_items: int = Field(default=0, description="전체 검토 항목 수")
    pass_items: int = Field(default=0, description="합격 항목 수")
    fail_items: int = Field(default=0, description="부적합 항목 수")
    warning_items: int = Field(default=0, description="경고 항목 수")

    # 개선 권고
    recommendations: list[str] = Field(default_factory=list, description="개선 권고 사항")
    non_conformities: list[str] = Field(default_factory=list, description="부적합 사항")

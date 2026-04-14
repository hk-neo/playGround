"""ER Gate 검토 도구 - 문서 파싱 유틸리티"""

from __future__ import annotations

import re
import pathlib


DOCS_DIR = pathlib.Path("docs/artifacts")

# ── 모듈 레벨 정규식 상수 (컴파일 중복 방지) ──────────────────

_RE_HEADER = re.compile(r"^(#{1,6})\s+(.+)$")
_RE_BOLD_HEADER = re.compile(r"^\*+\[?([\w\-\s.]+)\]?\*+")

_RE_SYRS_REQ = re.compile(
    r"\*\*ID:\*\*\s*(SR-\d+).*?\*\*설명:\*\*\s*(.*?)(?=\n\n|\n---|\Z)",
    re.DOTALL,
)
_RE_SRS_FR = re.compile(r"\|((?:FR|NFR)-[\d.]+)\|", re.MULTILINE)
_RE_SRS_HAZ = re.compile(
    r"\|(HAZ-[\d.]+)\|.*?\|((?:FR|NFR)-[\d.]+(?:[\s,]*(?:FR|NFR)-[\d.]+)*)\|"
)
_RE_SRS_SR = re.compile(
    r"\|(SR-\d+)\s+[^\n]*?\|((?:FR|NFR)-[\d.]+(?:[\s,]*(?:FR|NFR)-[\d.]+)*)\|"
)
_RE_SAD_COMP = re.compile(r"(COMP-[\d.]+)\s*[,\)]?\s*([^\|,\)]*)")
_RE_SAD_ADR = re.compile(r"\|(ADR-\d+)\|(.*?)\|")
_RE_RMR_HAZ = re.compile(r"\|(HAZ-[\d.]+)\|")
_RE_SDS_ITEM = re.compile(r"\*(SDS-[\d.]+)\s+([^\*]+)\*")
_RE_REQ_ID = re.compile(r"(?:FR|NFR)-[\d.]+")


def read_doc(filename: str) -> str:
    """문서 파일을 읽어 텍스트로 반환. 경로 순회 공격 방지."""
    safe_name = pathlib.Path(filename).name  # 디렉토리 이동 방지
    p = DOCS_DIR / safe_name
    if p.exists():
        return p.read_text(encoding="utf-8")
    return ""


# ── 문서 섹션 추출 ──────────────────────────────────────────────

def extract_sections(text: str) -> dict[str, str]:
    """마크다운 텍스트에서 헤더 기반 섹션을 추출.

    ``# `` 형식 헤더와 ``*bold*`` 형식 헤더를 모두 인식한다.
    """
    sections: dict[str, str] = {}
    current_header = ""
    current_content: list[str] = []

    for line in text.split("\n"):
        header_match = _RE_HEADER.match(line)
        bold_header_match = _RE_BOLD_HEADER.match(line)

        if header_match:
            if current_header:
                sections[current_header] = "\n".join(current_content).strip()
            current_header = header_match.group(2).strip()
            current_content = []
        elif bold_header_match:
            header_text = bold_header_match.group(1).strip()
            if current_header:
                sections[current_header] = "\n".join(current_content).strip()
            current_header = header_text
            current_content = []
        else:
            current_content.append(line)

    if current_header:
        sections[current_header] = "\n".join(current_content).strip()

    return sections


def has_section(text: str, section_pattern: str) -> bool:
    """텍스트에 특정 섹션이 존재하는지 확인"""
    pattern = re.escape(section_pattern)
    return bool(re.search(pattern, text, re.IGNORECASE))


def has_keyword(text: str, keyword: str) -> bool:
    """텍스트에 키워드가 존재하는지 확인"""
    return keyword.lower() in text.lower()


# ── SyRS 파싱 ────────────────────────────────────────────────────

def parse_syrs_requirements(text: str) -> list[dict]:
    """SyRS에서 요구사항 목록(SR-1 ~ SR-14) 추출"""
    requirements = []
    for m in _RE_SYRS_REQ.finditer(text):
        req_id = m.group(1).strip()
        description = m.group(2).strip()[:200]
        requirements.append({"id": req_id, "description": description})
    return requirements


# ── SRS 파싱 ─────────────────────────────────────────────────────

def parse_srs_fr_items(text: str) -> list[dict]:
    """SRS에서 기능/비기능 요구사항(FR-*, NFR-*) 목록 추출"""
    seen: set[str] = set()
    items = []
    for m in _RE_SRS_FR.finditer(text):
        item_id = m.group(1).strip()
        if item_id not in seen:
            seen.add(item_id)
            items.append({"id": item_id})
    return items


def parse_srs_hazard_mapping(text: str) -> list[dict]:
    """SRS 8.2절에서 Hazard-SRS 매핑 추출"""
    mappings = []
    for m in _RE_SRS_HAZ.finditer(text):
        hazard_id = m.group(1).strip()
        srs_ids_raw = m.group(2).strip()
        srs_ids = [s.strip() for s in _RE_REQ_ID.findall(srs_ids_raw)]
        mappings.append({"hazard_id": hazard_id, "srs_ids": srs_ids})
    return mappings


def parse_srs_sr_mapping(text: str) -> list[dict]:
    """SRS 8.1절에서 SyRS-SRS 매핑 추출"""
    mappings = []
    for m in _RE_SRS_SR.finditer(text):
        sr_id = m.group(1).strip()
        srs_ids_raw = m.group(2).strip()
        srs_ids = [s.strip() for s in _RE_REQ_ID.findall(srs_ids_raw)]
        mappings.append({"sr_id": sr_id, "srs_ids": srs_ids})
    return mappings


# ── SAD 파싱 ─────────────────────────────────────────────────────

def parse_sad_components(text: str) -> list[dict]:
    """SAD에서 컴포넌트(COMP-*) 목록 추출"""
    seen: set[str] = set()
    components = []
    for m in _RE_SAD_COMP.finditer(text):
        comp_id = m.group(1).strip()
        if comp_id not in seen:
            seen.add(comp_id)
            comp_name = m.group(2).strip()
            components.append({"id": comp_id, "name": comp_name})
    return components


def parse_sad_adrs(text: str) -> list[dict]:
    """SAD에서 ADR 목록 추출"""
    adrs = []
    for m in _RE_SAD_ADR.finditer(text):
        adr_id = m.group(1).strip()
        decision = m.group(2).strip()
        adrs.append({"id": adr_id, "decision": decision})
    return adrs


# ── RMR 파싱 ─────────────────────────────────────────────────────

def parse_rmr_hazards(text: str) -> list[dict]:
    """RMR에서 Hazard 목록 추출"""
    seen: set[str] = set()
    hazards = []
    for m in _RE_RMR_HAZ.finditer(text):
        haz_id = m.group(1).strip()
        if haz_id not in seen:
            seen.add(haz_id)
            hazards.append({"id": haz_id})
    return hazards


# ── SDS 파싱 ─────────────────────────────────────────────────────

def parse_sds_design_items(text: str) -> list[dict]:
    """SDS에서 설계 항목(SDS-3.*) 추출"""
    items = []
    for m in _RE_SDS_ITEM.finditer(text):
        item_id = m.group(1).strip()
        item_name = m.group(2).strip()
        items.append({"id": item_id, "name": item_name})
    return items

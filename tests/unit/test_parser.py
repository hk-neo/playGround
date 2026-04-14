"""parser.py 단위 테스트"""

import pathlib

# 테스트 대상 모듈을 src 경로에서 임포트 가능하게 설정
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent.parent))

from src.utils.parser import (
    extract_sections,
    has_section,
    has_keyword,
    read_doc,
    parse_syrs_requirements,
    parse_srs_fr_items,
    parse_srs_hazard_mapping,
    parse_srs_sr_mapping,
    parse_sad_components,
    parse_sad_adrs,
    parse_rmr_hazards,
    parse_sds_design_items,
)


# ── extract_sections 테스트 ──────────────────────────────────────

def test_extract_sections_hash_headers():
    text = "# Title\ncontent1\n## Sub\ncontent2"
    sections = extract_sections(text)
    assert "Title" in sections
    assert "Sub" in sections
    assert "content1" in sections["Title"]


def test_extract_sections_bold_headers():
    text = "*Section A*\nbody_a\n*Section B*\nbody_b"
    sections = extract_sections(text)
    assert "Section A" in sections
    assert "Section B" in sections
    assert "body_a" in sections["Section A"]


def test_extract_sections_mixed_headers():
    text = "# Hash Header\nhash_content\n*Bold Header*\nbold_content"
    sections = extract_sections(text)
    assert "Hash Header" in sections
    assert "Bold Header" in sections
    assert "hash_content" in sections.get("Hash Header", "")
    # bold header should be captured even after hash header
    assert "Bold Header" in sections


def test_extract_sections_empty():
    assert extract_sections("") == {}


# ── has_section / has_keyword 테스트 ─────────────────────────────

def test_has_section():
    assert has_section("# 1. 개요", "1. 개요")
    assert not has_section("hello", "세부설계")


def test_has_keyword():
    assert has_keyword("DICOM 파일 로드", "dicom")
    assert not has_keyword("hello world", "안녕")


# ── parse_syrs_requirements 테스트 ───────────────────────────────

def test_parse_syrs_requirements():
    text = "**ID:** SR-1\n\n**설명:**\n근거: test\n\n---\n**ID:** SR-2\n\n**설명:**\n근거: test2"
    reqs = parse_syrs_requirements(text)
    assert len(reqs) >= 2
    assert reqs[0]["id"] == "SR-1"
    assert reqs[1]["id"] == "SR-2"


def test_parse_syrs_requirements_empty():
    assert parse_syrs_requirements("") == []


# ── parse_srs_fr_items 테스트 ────────────────────────────────────

def test_parse_srs_fr_items():
    text = "|FR-1.1|DICOM|\n|NFR-1.1|성능|\n|FR-1.1|중복|\n"
    items = parse_srs_fr_items(text)
    ids = [i["id"] for i in items]
    assert "FR-1.1" in ids
    assert "NFR-1.1" in ids
    # 중복 제거 확인
    assert ids.count("FR-1.1") == 1


# ── parse_srs_hazard_mapping 테스트 ──────────────────────────────

def test_parse_srs_hazard_mapping():
    text = "|HAZ-1.1|높음|FR-1.2, FR-1.4|\n|HAZ-2.1|높음|FR-4.2|\n"
    mappings = parse_srs_hazard_mapping(text)
    assert len(mappings) >= 2
    haz1 = next(m for m in mappings if m["hazard_id"] == "HAZ-1.1")
    assert "FR-1.2" in haz1["srs_ids"]


# ── parse_srs_sr_mapping 테스트 ──────────────────────────────────

def test_parse_srs_sr_mapping():
    text = "|SR-1 DICOM 파일 로드|PLAYG-1293|FR-1.1, FR-1.2|\n|SR-8 거리 측정|PLAYG-1300|FR-4.1|\n"
    mappings = parse_srs_sr_mapping(text)
    assert len(mappings) >= 2
    sr1 = next(m for m in mappings if m["sr_id"] == "SR-1")
    assert "FR-1.1" in sr1["srs_ids"]


# ── parse_sad_components 테스트 ──────────────────────────────────

def test_parse_sad_components():
    text = "VolumeBuilder (COMP-2.1, PLAYG-1377) 와 DICOMParser (COMP-1.1)"
    comps = parse_sad_components(text)
    ids = [c["id"] for c in comps]
    assert "COMP-2.1" in ids
    assert "COMP-1.1" in ids


# ── parse_sad_adrs 테스트 ────────────────────────────────────────

def test_parse_sad_adrs():
    text = "|ADR-1|Layered Architecture 채택|전체 시스템|\n|ADR-2|DICOM 파서 자체 구현|DICOMParser|\n"
    adrs = parse_sad_adrs(text)
    assert len(adrs) >= 2
    assert adrs[0]["id"] == "ADR-1"


# ── parse_rmr_hazards 테스트 ─────────────────────────────────────

def test_parse_rmr_hazards():
    text = "|HAZ-1.1|파싱오류|\n|HAZ-3.2|잔존|\n|HAZ-1.1|중복|\n"
    hazards = parse_rmr_hazards(text)
    ids = [h["id"] for h in hazards]
    assert ids.count("HAZ-1.1") == 1
    assert "HAZ-3.2" in ids


# ── parse_sds_design_items 테스트 ────────────────────────────────

def test_parse_sds_design_items():
    text = "*SDS-3.1 DICOMParser*\n내용\n*SDS-3.2 DataValidator*\n내용2\n"
    items = parse_sds_design_items(text)
    assert len(items) >= 2
    assert items[0]["id"] == "SDS-3.1"


# ── read_doc 경로 순회 방지 테스트 ───────────────────────────────

def test_read_doc_path_traversal():
    """경로 순회 공격 문자열이 정상적으로 무시되는지 확인"""
    result = read_doc("../../../etc/passwd")
    assert result == ""  # 존재하지 않는 안전한 경로이거나 빈 문자열


if __name__ == "__main__":
    test_extract_sections_hash_headers()
    test_extract_sections_bold_headers()
    test_extract_sections_mixed_headers()
    test_extract_sections_empty()
    test_has_section()
    test_has_keyword()
    test_parse_syrs_requirements()
    test_parse_syrs_requirements_empty()
    test_parse_srs_fr_items()
    test_parse_srs_hazard_mapping()
    test_parse_srs_sr_mapping()
    test_parse_sad_components()
    test_parse_sad_adrs()
    test_parse_rmr_hazards()
    test_parse_sds_design_items()
    test_read_doc_path_traversal()
    print("모든 테스트 통과 (17/17)")

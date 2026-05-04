#!/usr/bin/env python3
"""docs/spec-kit/02_plan.md 생성 스크립트"""
import pathlib
L = []
def a(s=""):
    L.append(s)

a("# Implementation Plan: findPixelDataTag() - 픽셀 데이터 태그 선형 탐색 폴백")
a()
a("**Branch**: `feature/PLAYG-1830-find-pixel-data-tag` | **Date**: 2026-04-30 | **Spec**: `docs/spec-kit/01_spec.md`")
a("**Ticket**: `PLAYG-1830` | **Type**: Detailed Design (SDS-3.11)")
a()
a("---")
a()
a("## Summary")
a()
a("DICOM 파일의 DataView에서 픽셀 데이터 태그(7FE0
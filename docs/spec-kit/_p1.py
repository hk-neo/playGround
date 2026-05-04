#!/usr/bin/env python3
# Part 1: 헤더 및 User Story 1-3
import pathlib
lines = []
a = lines.append
a("# 기능 명세서: phiGuard.js - PHI 마스킹 보안 가드 모듈")
a("")
a("**Feature Branch**: \`PLAYG-1831-phi-guard\`")
a("**Status**: Draft | **Date**: 2026-05-04")
a("**Ticket**: \`PLAYG-1831\` | **Type**: Detailed Design (SDS-3.12)")
a("**Input**: Jira 티켓 PLAYG-1831 상세 설계 요청")
a("")
a("---")
a("")
a("## User Scenarios & Testing")
a("")
a("### User Story 1 - PHI 필드 자동 마스킹 (Priority: P1) :dart: MVP")
a("- **설명**: DICOM 메타데이터 객체에서 환자 식별 정보(patientName
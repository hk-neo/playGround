/**
 * @file DentiView3D - 애플리케이션 진입점
 * @description 로컬 파일만 읽어서 렌더링하는 CBCT 영상 뷰어
 * 추적: PLAYG-1446
 */

import { parseDICOM } from './data/dicomParser/parseDICOM.js';

// ============================================================
// 애플리케이션 상태
// ============================================================

/** @type {object} */
const appState = {
  parseResult: null,
  volumeData: null,      // { data: Uint16Array|Int16Array|Uint8Array, dims: [w,h,d], spacing: [sx,sy,sz] }
  currentSlice: { axial: 0, coronal: 0, sagittal: 0 },
  windowLevel: 40,
  windowWidth: 400,
};

// ============================================================
// DOM 요소 참조
// ============================================================

const dom = {};

function cacheDomRefs() {
  dom.btnOpenFile = document.getElementById("btn-open-file");
  dom.btnOpenFolder = document.getElementById("btn-open-folder");
  dom.fileInput = document.getElementById("file-input");
  dom.folderInput = document.getElementById("folder-input");
  dom.statusBar = document.getElementById("status-bar");
  dom.statusText = document.getElementById("status-text");
  dom.progressContainer = document.getElementById("progress-container");
  dom.progressBar = document.getElementById("progress-bar");
  dom.welcomeScreen = document.getElementById("welcome-screen");
  dom.viewerContainer = document.getElementById("viewer-container");
  dom.wlSlider = document.getElementById("wl-slider");
  dom.wwSlider = document.getElementById("ww-slider");
  dom.wlValue = document.getElementById("wl-value");
  dom.wwValue = document.getElementById("ww-value");
  dom.viewports = {
    axial: {
      canvas: document.querySelector('[data-plane="axial"]'),
      slider: document.querySelector('.slice-slider[data-plane="axial"]'),
      sliceNum: document.querySelector("#viewport-axial .slice-num"),
      sliceTotal: document.querySelector("#viewport-axial .slice-total"),
    },
    coronal: {
      canvas: document.querySelector('[data-plane="coronal"]'),
      slider: document.querySelector('.slice-slider[data-plane="coronal"]'),
      sliceNum: document.querySelector("#viewport-coronal .slice-num"),
      sliceTotal: document.querySelector("#viewport-coronal .slice-total"),
    },
    sagittal: {
      canvas: document.querySelector('[data-plane="sagittal"]'),
      slider: document.querySelector('.slice-slider[data-plane="sagittal"]'),
      sliceNum: document.querySelector("#viewport-sagittal .slice-num"),
      sliceTotal: document.querySelector("#viewport-sagittal .slice-total"),
    },
  };
}

// ============================================================
// 이벤트 바인딩
// ============================================================

function bindEvents() {
  dom.btnOpenFile.addEventListener("click", () => dom.fileInput.click());
  dom.btnOpenFolder.addEventListener("click", () => dom.folderInput.click());
  dom.fileInput.addEventListener("change", handleFileSelect);
  dom.folderInput.addEventListener("change", handleFileSelect);

  dom.wlSlider.addEventListener("input", (e) => {
    appState.windowLevel = Number(e.target.value);
    dom.wlValue.textContent = appState.windowLevel;
    renderAllViewports();
  });

  dom.wwSlider.addEventListener("input", (e) => {
    appState.windowWidth = Number(e.target.value);
    dom.wwValue.textContent = appState.windowWidth;
    renderAllViewports();
  });

  for (const plane of ["axial", "coronal", "sagittal"]) {
    dom.viewports[plane].slider.addEventListener("input", (e) => {
      appState.currentSlice[plane] = Number(e.target.value);
      dom.viewports[plane].sliceNum.textContent = e.target.value;
      renderViewport(plane);
    });
  }

  // 캔버스 마우스 휠로 슬라이스 이동
  for (const plane of ["axial", "coronal", "sagittal"]) {
    dom.viewports[plane].canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const max = parseInt(dom.viewports[plane].slider.max, 10);
      let val = appState.currentSlice[plane];
      val += e.deltaY > 0 ? 1 : -1;
      val = Math.max(0, Math.min(val, max));
      appState.currentSlice[plane] = val;
      dom.viewports[plane].slider.value = val;
      dom.viewports[plane].sliceNum.textContent = val;
      renderViewport(plane);
    });
  }
}

// ============================================================
// 파일 선택 처리
// ============================================================

async function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  showStatus("loading", "DICOM 파일 로딩 중...", true);

  try {
    const result = await parseDICOM(files[0]);

    if (!result.isValid) {
      const errMsg = result.errors.map((e) => e.userMessage).join(", ");
      showStatus("error", "파싱 실패: " + errMsg, false);
      return;
    }

    appState.parseResult = result;
    appState.windowLevel = result.metadata.windowCenter || 40;
    appState.windowWidth = result.metadata.windowWidth || 400;

    // 볼륨 데이터 구성
    buildVolumeData(result);

    // UI 업데이트
    updateMetadataPanel(result.metadata);
    updateWLControls();
    showViewer();
    renderAllViewports();

    showStatus("success", "로딩 완료: " + files[0].name, false);
  } catch (err) {
    showStatus("error", "오류 발생: " + err.message, false);
  }

  // 입력 리셋 (같은 파일 재선택 가능)
  event.target.value = "";
}

// ============================================================
// 볼륨 데이터 구성
// ============================================================

function buildVolumeData(result) {
  const { metadata, voxelData } = result;
  if (!voxelData) {
    throw new Error("복셀 데이터가 없습니다.");
  }

  const cols = metadata.columns;
  const rows = metadata.rows;
  const frames = metadata.numberOfFrames || 1;
  const bytesAllocated = metadata.bitsAllocated / 8;
  const isSigned = metadata.pixelRepresentation === 1;

  // raw pixel data를 타입화된 배열로 변환
  let data;
  if (bytesAllocated === 1) {
    data = new Uint8Array(voxelData);
  } else if (bytesAllocated === 2) {
    data = isSigned ? new Int16Array(voxelData) : new Uint16Array(voxelData);
  } else {
    data = new Float32Array(voxelData);
  }

  const spacing =
    metadata.pixelSpacing && metadata.pixelSpacing.length >= 2
      ? [metadata.pixelSpacing[1] || 1, metadata.pixelSpacing[0] || 1, metadata.sliceThickness || 1]
      : [1, 1, metadata.sliceThickness || 1];

  appState.volumeData = {
    data,
    dims: [cols, rows, frames],
    spacing,
  };

  // 슬라이스 범위 설정
  appState.currentSlice = {
    axial: Math.floor(frames / 2),
    coronal: Math.floor(rows / 2),
    sagittal: Math.floor(cols / 2),
  };

  // 슬라이더 범위 설정
  for (const [plane, max] of [
    ["axial", frames - 1],
    ["coronal", rows - 1],
    ["sagittal", cols - 1],
  ]) {
    dom.viewports[plane].slider.max = max;
    dom.viewports[plane].slider.value = appState.currentSlice[plane];
    dom.viewports[plane].sliceNum.textContent = appState.currentSlice[plane];
    dom.viewports[plane].sliceTotal.textContent = max;
  }
}

// ============================================================
// MPR 렌더링
// ============================================================

/**
 * 지정 단면의 슬라이스를 렌더링한다.
 * @param {string} plane - axial | coronal | sagittal
 */
function renderViewport(plane) {
  const vd = appState.volumeData;
  if (!vd) return;

  const { data, dims } = vd;
  const [cols, rows, frames] = dims;
  const canvas = dom.viewports[plane].canvas;
  const ctx = canvas.getContext("2d");

  let sliceWidth, sliceHeight, sliceIdx;

  switch (plane) {
    case "axial":
      sliceWidth = cols;
      sliceHeight = rows;
      sliceIdx = appState.currentSlice.axial;
      break;
    case "coronal":
      sliceWidth = cols;
      sliceHeight = frames;
      sliceIdx = appState.currentSlice.coronal;
      break;
    case "sagittal":
      sliceWidth = rows;
      sliceHeight = frames;
      sliceIdx = appState.currentSlice.sagittal;
      break;
  }

  // 캔버스 크기를 슬라이스 크기에 맞춤
  canvas.width = sliceWidth;
  canvas.height = sliceHeight;

  const imageData = ctx.createImageData(sliceWidth, sliceHeight);
  const wl = appState.windowLevel;
  const ww = Math.max(1, appState.windowWidth);
  const lower = wl - ww / 2;
  const upper = wl + ww / 2;

  const pixels = imageData.data;

  for (let y = 0; y < sliceHeight; y++) {
    for (let x = 0; x < sliceWidth; x++) {
      let rawValue;

      switch (plane) {
        case "axial":
          rawValue = data[sliceIdx * cols * rows + y * cols + x];
          break;
        case "coronal":
          rawValue = data[y * cols * rows + sliceIdx * cols + x];
          break;
        case "sagittal":
          rawValue = data[y * cols * rows + x * cols + sliceIdx];
          break;
      }

      // WL/WW 적용 (0~255로 매핑)
      let normalized = ((rawValue - lower) / ww) * 255;
      normalized = Math.max(0, Math.min(255, normalized));

      const pIdx = (y * sliceWidth + x) * 4;
      pixels[pIdx] = normalized;
      pixels[pIdx + 1] = normalized;
      pixels[pIdx + 2] = normalized;
      pixels[pIdx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function renderAllViewports() {
  for (const plane of ["axial", "coronal", "sagittal"]) {
    renderViewport(plane);
  }
}

// ============================================================
// UI 헬퍼
// ============================================================

function showStatus(type, text, showProgress) {
  dom.statusBar.className = "status-bar " + type;
  dom.statusText.textContent = text;
  dom.progressContainer.classList.toggle("hidden", !showProgress);
  dom.statusBar.classList.remove("hidden");

  if (showProgress) {
    dom.progressBar.style.width = "30%";
    setTimeout(() => { dom.progressBar.style.width = "70%"; }, 300);
    setTimeout(() => { dom.progressBar.style.width = "95%"; }, 800);
  }
}

function showViewer() {
  dom.welcomeScreen.classList.add("hidden");
  dom.viewerContainer.classList.remove("hidden");
}

function updateMetadataPanel(meta) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val || "-";
  };

  set("meta-patient-name", meta.patientName);
  set("meta-patient-id", meta.patientID);
  set("meta-study-date", meta.studyDate);
  set("meta-modality", meta.modality);
  set("meta-size", (meta.columns || "?") + " x " + (meta.rows || "?"));
  set("meta-slices", String(meta.numberOfFrames || 1));
  set("meta-pixel-spacing", meta.pixelSpacing ? meta.pixelSpacing.join(" x ") : "-");
  set("meta-transfer-syntax", meta.transferSyntax || "-");
}

function updateWLControls() {
  dom.wlSlider.value = appState.windowLevel;
  dom.wwSlider.value = appState.windowWidth;
  dom.wlValue.textContent = appState.windowLevel;
  dom.wwValue.textContent = appState.windowWidth;
}

// ============================================================
// 초기화
// ============================================================

function init() {
  cacheDomRefs();
  bindEvents();
  console.log("DentiView3D v0.1.0 - 로컬 전용 CBCT 영상 뷰어");
}

document.addEventListener("DOMContentLoaded", init);

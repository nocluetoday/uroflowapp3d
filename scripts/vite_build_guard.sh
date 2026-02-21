#!/usr/bin/env bash

set -euo pipefail

# Prevent overlapping frontend builds, which can look like a hung Vite process.
LOCK_DIR="${TMPDIR:-/tmp}/uroflow-vite-build.lock"
PID_FILE="${LOCK_DIR}/pid"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

prepare_esbuild_binary() {
  local esbuild_src esbuild_cache_dir esbuild_dst
  esbuild_src="${ROOT_DIR}/frontend/node_modules/@esbuild/darwin-arm64/bin/esbuild"
  esbuild_cache_dir="${HOME}/Library/Caches/uroflow"
  esbuild_dst="${esbuild_cache_dir}/esbuild-darwin-arm64"

  if [[ ! -x "${esbuild_src}" ]]; then
    return 0
  fi

  mkdir -p "${esbuild_cache_dir}"
  if [[ ! -f "${esbuild_dst}" || "${esbuild_src}" -nt "${esbuild_dst}" ]]; then
    cp -f "${esbuild_src}" "${esbuild_dst}"
    chmod +x "${esbuild_dst}"
  fi

  # Running esbuild from iCloud-backed folders can hang at process start.
  # Use a local cache path for predictable startup.
  export ESBUILD_BINARY_PATH="${esbuild_dst}"
}

acquire_lock() {
  if mkdir "${LOCK_DIR}" 2>/dev/null; then
    printf '%s\n' "$$" > "${PID_FILE}"
    return 0
  fi

  if [[ -f "${PID_FILE}" ]]; then
    current_pid="$(cat "${PID_FILE}" 2>/dev/null || true)"
    if [[ "${current_pid}" =~ ^[0-9]+$ ]] && kill -0 "${current_pid}" 2>/dev/null; then
      echo "Another frontend build is already running (pid ${current_pid})."
      exit 1
    fi
  fi

  # Recover stale lock left by forced termination.
  rm -rf "${LOCK_DIR}"
  mkdir "${LOCK_DIR}"
  printf '%s\n' "$$" > "${PID_FILE}"
}

cleanup() {
  rm -rf "${LOCK_DIR}" 2>/dev/null || true
}

trap cleanup EXIT INT TERM HUP

acquire_lock
prepare_esbuild_binary
vite build "$@"

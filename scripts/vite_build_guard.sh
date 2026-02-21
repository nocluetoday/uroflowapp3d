#!/usr/bin/env bash

set -euo pipefail

# Prevent overlapping frontend builds, which can look like a hung Vite process.
LOCK_DIR="${TMPDIR:-/tmp}/uroflow-vite-build.lock"
PID_FILE="${LOCK_DIR}/pid"

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
vite build "$@"

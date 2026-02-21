#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_PY="$ROOT_DIR/venv/bin/python"

if [[ ! -x "$VENV_PY" ]]; then
  echo "Missing virtualenv python at $VENV_PY"
  echo "Create it with: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
  exit 1
fi

if ! "$VENV_PY" -c "import PyInstaller" >/dev/null 2>&1; then
  echo "Installing PyInstaller into venv..."
  "$VENV_PY" -m pip install pyinstaller
fi

cd "$ROOT_DIR"
rm -rf build dist
"$VENV_PY" -m PyInstaller --noconfirm --onefile --name uroflow-backend backend_entry.py

mkdir -p frontend/backend-bin
cp dist/uroflow-backend frontend/backend-bin/uroflow-backend
chmod +x frontend/backend-bin/uroflow-backend

echo "Built frontend/backend-bin/uroflow-backend"

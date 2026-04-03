#!/usr/bin/env bash
# Wrapper for the lead-sourcer poller.
# Sources .env from the same directory if present, then runs the Node poller.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

if [[ -f "$ENV_FILE" ]]; then
    # shellcheck source=/dev/null
    set -a
    source "$ENV_FILE"
    set +a
fi

node "$SCRIPT_DIR/src/index.js"

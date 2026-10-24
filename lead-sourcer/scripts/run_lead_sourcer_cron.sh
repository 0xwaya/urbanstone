#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$SOURCER_DIR/.." && pwd)"
OUTPUT_DIR="$SOURCER_DIR/leads"
LOG_DIR="$SOURCER_DIR/logs"
OUTPUT_FILE="$OUTPUT_DIR/$(date +"%Y-%m-%d").json"
LOG_FILE="$LOG_DIR/lead_sourcer_cron.log"

mkdir -p "$OUTPUT_DIR" "$LOG_DIR"

# Load lead-sourcer runtime env first, then local overrides, then optional
# deployment fallback vars from .vercel if present.
if [ -f "$SOURCER_DIR/.env" ]; then
  set -a
  . "$SOURCER_DIR/.env"
  set +a
fi

if [ -f "$SOURCER_DIR/.env.local" ]; then
  set -a
  . "$SOURCER_DIR/.env.local"
  set +a
fi

if [ -f "$PROJECT_ROOT/.vercel/.env.production.local" ]; then
  set -a
  . "$PROJECT_ROOT/.vercel/.env.production.local"
  set +a
fi

# Scheduled invocations only scan and log candidates by default. Live
# notification delivery requires an explicit LEAD_SOURCER_MODE=live setting.
export LEAD_SOURCER_MODE="${LEAD_SOURCER_MODE:-review-only}"

echo "[Cron run: $(date)] Running lead sourcer (mode=$LEAD_SOURCER_MODE)" >> "$LOG_FILE" 2>&1
if OUTPUT="$(node "$SOURCER_DIR/src/index.js" 2>&1)"; then
  CODE=0
else
  CODE=$?
fi
printf '%s\n' "$OUTPUT" >> "$LOG_FILE" 2>&1
if [ -n "$OUTPUT" ]; then
  printf '%s\n' "$OUTPUT" > "$OUTPUT_FILE" 2>&1
fi
exit $CODE

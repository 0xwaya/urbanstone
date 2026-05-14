#!/bin/bash
set -e
PROJECT_ROOT="/Users/pc/.openclaw/workspace/urbanstone"
SOURCER_DIR="$PROJECT_ROOT/lead-sourcer"
OUTPUT_DIR="$SOURCER_DIR/leads"
LOG_DIR="$SOURCER_DIR/logs"
ENTRY="node $SOURCER_DIR/src/index.js"

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

cd "$SOURCER_DIR" || exit 1
DATE=$(date +"%Y-%m-%d")
OUTPUT_FILE="$OUTPUT_DIR/${DATE}.json"
LOG_FILE="$LOG_DIR/lead_sourcer_cron.log"

echo "[Cron run: $(date)] Running lead sourcer" >> "$LOG_FILE" 2>&1
OUTPUT="$($ENTRY 2>&1)" 
CODE=$?
echo "$OUTPUT" >> "$LOG_FILE" 2>&1
if [ -n "$OUTPUT" ]; then
  echo "$OUTPUT" > "$OUTPUT_FILE" 2>&1
fi
exit $CODE

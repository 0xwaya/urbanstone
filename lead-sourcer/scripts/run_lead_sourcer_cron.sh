#!/bin/bash
set -e
ROOT_DIR="/Users/pc/.openclaw/workspace/urbanstone"
OUTPUT_DIR="$ROOT_DIR/lead-sourcer/leads"
LOG_DIR="$ROOT_DIR/lead-sourcer/logs"
ENTRY="node /Users/pc/.openclaw/workspace/urbanstone/lead-sourcer/src/index.js"
cd "$ROOT_DIR" || exit 1
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

#!/bin/bash
# Auto-format files after Edit/Write
# Receives tool input JSON on stdin

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only format TypeScript/JavaScript files
case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.md)
    npx prettier --write "$FILE_PATH" 2>/dev/null || true
    ;;
esac

exit 0

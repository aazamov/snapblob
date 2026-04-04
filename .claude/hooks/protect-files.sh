#!/bin/bash
# Block edits to protected files
# Exit code 2 = block action, stderr shown to Claude

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

PROTECTED_PATTERNS=(".env" "package-lock.json" "node_modules/" ".git/" "dist/")

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "Blocked: $FILE_PATH is a protected file and should not be edited directly." >&2
    exit 2
  fi
done

exit 0

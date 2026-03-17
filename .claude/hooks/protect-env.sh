#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)

# Vérifie les commandes bash (grep, cat, etc. sur .env)
CMD=$(echo "$INPUT" | jq -r '.tool_input.command // ""')
if echo "$CMD" | grep -Eq '\.env'; then
  echo "Blocked: .env access is not allowed. Use process.env or check .env.example instead." >&2
  exit 2
fi

# Vérifie les lectures de fichiers
PATH_INPUT=$(echo "$INPUT" | jq -r '.tool_input.path // .tool_input.file_path // ""')
if echo "$PATH_INPUT" | grep -Eq '(^|/)\.env($|[^a-zA-Z])'; then
  echo "Blocked: .env access is not allowed. Use process.env or check .env.example instead." >&2
  exit 2
fi

exit 0
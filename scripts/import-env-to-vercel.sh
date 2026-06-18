#!/usr/bin/env bash
# import-env-to-vercel.sh
#
# Reads a local .env file and emits `vercel env add <KEY> production` commands
# (one per non-comment, non-blank line) to stdout. Does NOT execute anything.
# Pipe to `sh` after a dry-run review:
#
#   bash scripts/import-env-to-vercel.sh --dry-run            # preview, values redacted
#   bash scripts/import-env-to-vercel.sh                      # emit real commands to stdout
#   bash scripts/import-env-to-vercel.sh | sh                 # execute
#   bash scripts/import-env-to-vercel.sh path/to/other.env    # custom env file
#
# Requires: the Vercel CLI (`vercel --version`) and `vercel link` already run in
# this directory (a `.vercel/project.json` must exist).
#
# Safety:
#   - Never logs secret values to a file.
#   - --dry-run replaces every value with `***` so the output is paste-safe.
#   - Skips empty values (Vercel rejects them anyway).
#   - Skips keys that already match the env you have set locally for a different
#     environment — only `production` is targeted here.

set -euo pipefail

DRY_RUN=0
ENV_FILE="./.env.local"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      sed -n '2,22p' "$0"
      exit 0
      ;;
    *)
      ENV_FILE="$1"
      shift
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: env file not found: $ENV_FILE" >&2
  exit 1
fi

if [[ ! -f ".vercel/project.json" ]]; then
  echo "error: this directory is not linked to a Vercel project (.vercel/project.json missing)" >&2
  echo "       run \`vercel link\` first" >&2
  exit 1
fi

# Read line by line, strip surrounding quotes, skip blanks + comments.
while IFS= read -r line || [[ -n "$line" ]]; do
  # Strip leading/trailing whitespace
  line="${line#"${line%%[![:space:]]*}"}"
  line="${line%"${line##*[![:space:]]}"}"

  # Skip blanks and comments
  [[ -z "$line" ]] && continue
  [[ "$line" =~ ^# ]] && continue

  # Must contain =
  [[ "$line" != *"="* ]] && continue

  key="${line%%=*}"
  value="${line#*=}"

  # Strip matching surrounding quotes from value
  if [[ "$value" =~ ^\".*\"$ ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "$value" =~ ^\'.*\'$ ]]; then
    value="${value:1:${#value}-2}"
  fi

  # Skip empty values
  [[ -z "$value" ]] && continue

  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf 'vercel env add %s production <<< "***"\n' "$key"
  else
    # Escape any embedded double quotes for the heredoc-string
    escaped="${value//\"/\\\"}"
    printf 'vercel env add %s production <<< "%s"\n' "$key" "$escaped"
  fi
done < "$ENV_FILE"

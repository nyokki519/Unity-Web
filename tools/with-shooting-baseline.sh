#!/usr/bin/env bash
set -euo pipefail
if [[ $# -lt 1 ]]; then
  echo "Usage: bash tools/with-shooting-baseline.sh <command> [args...]" >&2
  exit 2
fi
ref="${SHOOTING_SIM_BASELINE:-294d846}"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
for file in pool.js core.js combat.js balance.js patterns.js data.js; do
  git show "${ref}:public/shooting/${file}" > "${tmp}/${file}"
done
SHOOTING_SIM_BASELINE="$ref" SHOOTING_BASELINE_DIR="$tmp" "$@"

#!/usr/bin/env bash
set -euo pipefail

if rg -n "^(<<<<<<<|=======|>>>>>>>)" components app scripts package.json >/tmp/conflict_markers.txt; then
  echo "❌ Merge conflict markers found:" >&2
  cat /tmp/conflict_markers.txt >&2
  exit 1
fi

echo "✅ No merge conflict markers found."

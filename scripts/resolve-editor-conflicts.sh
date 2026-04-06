#!/usr/bin/env bash
set -euo pipefail

FILES=(
  "app/globals.css"
  "components/latest-release-section.tsx"
  "components/visual-editor.tsx"
)

echo "Resolving editor conflict hotspots by keeping current branch versions..."
for file in "${FILES[@]}"; do
  if [[ -f "$file" ]]; then
    git checkout --ours -- "$file" 2>/dev/null || true
    git add "$file"
    echo "  - staged: $file"
  else
    echo "  - skipped missing: $file"
  fi
done

echo "Done. Review with: git diff --cached"

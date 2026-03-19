#!/bin/bash

# Load nvm (same as process-data.sh)
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
  nvm use 22 2>/dev/null || true
fi

echo "=========================================="
echo "Thai Lottery Heatmap — Static Generator"
echo "=========================================="
echo ""
echo "Reading data/all.csv and building heatmap-static.html..."
echo ""

# Try different ways to run TypeScript
if [ -f "./node_modules/.bin/tsx" ]; then
  ./node_modules/.bin/tsx generate-static.ts
elif command -v npx &>/dev/null; then
  npx tsx generate-static.ts
elif command -v tsx &>/dev/null; then
  tsx generate-static.ts
else
  echo "Error: TypeScript runner not found. Please run: npm install"
  exit 1
fi

if [ $? -ne 0 ]; then
  echo "Error: Failed to generate static file."
  exit 1
fi

echo ""
echo "=========================================="
echo "✓ Done! Open heatmap-static.html in any browser"
echo "  (no server required)"
echo "=========================================="

#!/bin/bash

# Load nvm
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
  nvm use 22 2>/dev/null || true
fi

# Usage: ./process-data.sh <yyyy-mm-dd>
# Example: ./process-data.sh 2010-12-01
# 
# This script will:
# 1. Download JSON and PDF files using get-data.sh
# 2. Transform JSON to CSV (individual file + append to all.csv)

INPUT_DATE="$1"

if [ -z "$INPUT_DATE" ]; then
  echo "Usage: $0 <yyyy-mm-dd>"
  echo "Example: $0 2010-12-01"
  exit 1
fi

# Validate date format
if ! [[ "$INPUT_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
  echo "Error: Date must be in yyyy-mm-dd format"
  exit 1
fi

echo "=========================================="
echo "Processing lottery data for $INPUT_DATE"
echo "=========================================="

# Step 1: Download JSON and PDF files
echo ""
echo "Step 1: Downloading JSON and PDF files..."
bash ./get-data.sh "$INPUT_DATE"
DOWNLOAD_EXIT=$?

if [ $DOWNLOAD_EXIT -ne 0 ]; then
  echo "Error: Failed to download data."
  exit $DOWNLOAD_EXIT
fi

echo "✓ Data files downloaded successfully"

# Step 2: Transform JSON to CSV
echo ""
echo "Step 2: Transforming JSON to CSV..."

# Try different ways to run TypeScript
if [ -f "./node_modules/.bin/tsx" ]; then
  ./node_modules/.bin/tsx transformJsonToCsv.ts
elif command -v npx &> /dev/null; then
  npx tsx transformJsonToCsv.ts
elif [ -f "./node_modules/.bin/ts-node" ]; then
  ./node_modules/.bin/ts-node transformJsonToCsv.ts
elif command -v ts-node &> /dev/null; then
  ts-node transformJsonToCsv.ts
else
  echo "Error: TypeScript runner not found. Please run: npm install"
  exit 1
fi

if [ $? -ne 0 ]; then
  echo "Error: Failed to transform data to CSV."
  exit 1
fi

echo "✓ CSV files created/updated successfully"

# Summary
echo ""
echo "=========================================="
echo "✓ Processing complete!"
echo "=========================================="
echo ""
echo "Files created/updated:"
echo "  - ./data/csv/${INPUT_DATE}.csv (individual)"
echo "  - ./data/all.csv (appended)"
echo ""
echo "Data files:"
echo "  - ./data/json/${INPUT_DATE}.json"
echo "  - ./data/pdf/${INPUT_DATE}.pdf"
echo ""

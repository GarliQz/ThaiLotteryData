#!/bin/bash

# Usage: ./get-data.sh <yyyy-mm-dd>
# Example: ./get-data.sh 2010-12-01

INPUT_DATE="$1"
if [ -z "$INPUT_DATE" ]; then
  echo "Usage: $0 <yyyy-mm-dd>"
  exit 1
fi

# Split input
YEAR=$(echo "$INPUT_DATE" | cut -d'-' -f1)
MONTH=$(echo "$INPUT_DATE" | cut -d'-' -f2)
DATE_DAY=$(echo "$INPUT_DATE" | cut -d'-' -f3)

if [ -z "$YEAR" ] || [ -z "$MONTH" ] || [ -z "$DATE_DAY" ]; then
  echo "Input must be in yyyy-mm-dd format."
  exit 2
fi

echo "get data from " $YEAR $MONTH $DATE_DAY

# Prepare directories
mkdir -p ./data/json
mkdir -p ./data/pdf

JSON_FILE="./data/json/${INPUT_DATE}.json"
PDF_FILE="./data/pdf/${INPUT_DATE}.pdf"

# Call API
curl --location --request POST 'https://www.glo.or.th/api/checking/getLotteryResult' \
  --header 'Content-Type: application/json' \
  --data '{"date": "'$DATE_DAY'","month": "'$MONTH'","year": "'$YEAR'"}' \
  -s -o "$JSON_FILE"
CURL_EXIT=$?

if [ "$CURL_EXIT" -ne 0 ] || [ ! -s "$JSON_FILE" ]; then
  echo "Error: Failed to get JSON response from API."
  exit 3
fi

# Extract pdf_url
PDF_URL=$(jq -r '.response.result.pdf_url' "$JSON_FILE")

echo "pdf url " $PDF_URL

if [ -z "$PDF_URL" ] || [ "$PDF_URL" == "null" ]; then
  echo "Error: pdf_url is null or missing in JSON (.response.result.pdf_url) in $JSON_FILE"
  exit 4
fi

# Save PDF
curl -s "$PDF_URL" -o "$PDF_FILE"

if [ $? -ne 0 ] || [ ! -s "$PDF_FILE" ]; then
  echo "Error: Failed to download PDF from $PDF_URL."
  exit 5
fi

echo "JSON saved to $JSON_FILE"
echo "PDF saved to $PDF_FILE"

#!/usr/bin/env bash
set -euo pipefail

# Script to list all available backups from the GCS emulator

GCS_ENDPOINT="${GCS_ENDPOINT:-http://localhost:4443}"
GCS_BUCKET="${GCS_BUCKET:-backups}"

echo "Fetching backup list from ${GCS_ENDPOINT}..."
echo ""

RESPONSE=$(curl -sf "${GCS_ENDPOINT}/storage/v1/b/${GCS_BUCKET}/o?prefix=daily/" 2>/dev/null || echo '{"items":[]}')

# Check if any backups exist
if echo "$RESPONSE" | grep -q '"items"'; then
  echo "Available backups:"
  echo "$RESPONSE" | jq -r '.items[] | "\(.name) (\(.size) bytes)"' 2>/dev/null || echo "$RESPONSE" | grep -oP '"name"\s*:\s*"\K[^"]+'
  echo ""
else
  echo "No backups found."
fi

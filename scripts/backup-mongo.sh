#!/usr/bin/env bash
set -euo pipefail

# -- Configuration --
MONGO_HOST="${MONGO_HOST:-mongo}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB="${MONGO_DB:-discord-clone}"
GCS_ENDPOINT="${GCS_ENDPOINT:-http://fake-gcs:4443}"
GCS_BUCKET="${GCS_BUCKET:-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

TIMESTAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"
ARCHIVE_NAME="backup-${TIMESTAMP}.gz"
TMP_DIR="/tmp/mongo-backup"

# -- Dump --
echo "[backup] Starting mongodump for ${MONGO_DB} at ${TIMESTAMP}"
mkdir -p "${TMP_DIR}"

mongodump \
  --host="${MONGO_HOST}" \
  --port="${MONGO_PORT}" \
  --db="${MONGO_DB}" \
  --archive="${TMP_DIR}/${ARCHIVE_NAME}" \
  --gzip

echo "[backup] Dump complete: ${ARCHIVE_NAME}"

# -- Upload to GCS emulator --
# Ensure bucket exists (idempotent -- ignores "already exists" errors)
curl -sf -X POST "${GCS_ENDPOINT}/storage/v1/b" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"${GCS_BUCKET}\"}" || true

# Upload archive
curl -sf -X POST \
  "${GCS_ENDPOINT}/upload/storage/v1/b/${GCS_BUCKET}/o?uploadType=media&name=daily/${ARCHIVE_NAME}" \
  --data-binary "@${TMP_DIR}/${ARCHIVE_NAME}" \
  -H "Content-Type: application/gzip"

echo "[backup] Uploaded to gs://${GCS_BUCKET}/daily/${ARCHIVE_NAME}"

# -- Prune old backups --
echo "[backup] Pruning backups older than ${RETENTION_DAYS} days..."

CUTOFF_DATE="$(date -u -d "-${RETENTION_DAYS} days" +%Y-%m-%dT)"

# List all objects in the daily/ prefix
OBJECTS=$(curl -sf "${GCS_ENDPOINT}/storage/v1/b/${GCS_BUCKET}/o?prefix=daily/backup-" \
  | grep -oP '"name"\s*:\s*"\K[^"]+' || true)

for obj in ${OBJECTS}; do
  # Extract the date portion: backup-YYYY-MM-DDTHHMMSSZ.gz -> YYYY-MM-DDT
  OBJ_DATE=$(echo "${obj}" | grep -oP '\d{4}-\d{2}-\d{2}T' || true)
  if [[ -n "${OBJ_DATE}" && "${OBJ_DATE}" < "${CUTOFF_DATE}" ]]; then
    echo "[backup] Deleting old backup: ${obj}"
    curl -sf -X DELETE \
      "${GCS_ENDPOINT}/storage/v1/b/${GCS_BUCKET}/o/$(echo "${obj}" | sed 's|/|%2F|g')"
  fi
done

# -- Cleanup --
rm -rf "${TMP_DIR}"
echo "[backup] Done."

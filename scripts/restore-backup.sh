#!/usr/bin/env bash
set -euo pipefail

# Script to restore a MongoDB backup from the GCS emulator
# Usage: ./restore-backup.sh <backup-name> [--drop]

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup-name> [--drop]"
  echo ""
  echo "Example: $0 backup-2026-05-03T030000Z.gz --drop"
  echo ""
  echo "Available backups:"
  bash "$(dirname "$0")/list-backups.sh"
  exit 1
fi

BACKUP_NAME="$1"
DROP_FLAG="${2:-}"
GCS_ENDPOINT="${GCS_ENDPOINT:-http://localhost:4443}"
GCS_BUCKET="${GCS_BUCKET:-backups}"
MONGO_HOST="${MONGO_HOST:-localhost}"
MONGO_PORT="${MONGO_PORT:-27017}"
MONGO_DB="${MONGO_DB:-discord-clone}"

BACKUP_PATH="daily/${BACKUP_NAME}"
BACKUP_PATH_ENCODED=$(echo "$BACKUP_PATH" | sed 's|/|%2F|g')
BACKUP_FILE="/tmp/${BACKUP_NAME}"

echo "Downloading backup: ${BACKUP_NAME}"
curl -sf -o "$BACKUP_FILE" \
  "${GCS_ENDPOINT}/storage/v1/b/${GCS_BUCKET}/o/${BACKUP_PATH_ENCODED}?alt=media"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Error: Failed to download backup"
  exit 1
fi

echo "Downloaded to: ${BACKUP_FILE}"
echo ""

# Determine if we should use --drop flag
RESTORE_ARGS="--host $MONGO_HOST --port $MONGO_PORT --db $MONGO_DB --archive=$BACKUP_FILE --gzip"

if [[ "$DROP_FLAG" == "--drop" ]]; then
  RESTORE_ARGS="$RESTORE_ARGS --drop"
  echo "WARNING: Using --drop flag. This will remove existing collections before restoring."
  echo ""
  read -p "Continue? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Restore cancelled."
    rm -f "$BACKUP_FILE"
    exit 0
  fi
fi

echo "Restoring database..."
mongorestore $RESTORE_ARGS

echo ""
echo "Restore complete. Backup file retained at: ${BACKUP_FILE}"
echo "To clean up, run: rm ${BACKUP_FILE}"

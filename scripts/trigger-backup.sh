#!/usr/bin/env bash
set -euo pipefail

# Script to manually trigger a backup via docker-compose

DOCKER_COMPOSE_FILE="${DOCKER_COMPOSE_FILE:-docker-compose.yml}"

if [[ ! -f "$DOCKER_COMPOSE_FILE" ]]; then
  echo "Error: docker-compose.yml not found"
  exit 1
fi

echo "Triggering manual backup..."
docker compose -f "$DOCKER_COMPOSE_FILE" exec backup /usr/local/bin/backup-mongo.sh

echo ""
echo "Backup triggered successfully. Listing current backups:"
bash "$(dirname "$0")/list-backups.sh"

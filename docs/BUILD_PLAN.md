# BUILD_PLAN.md — Local MongoDB Backup (Stack + Prune)

## Goal

Implement automated daily `mongodump` backups for local development, storing backup archives in the local GCS emulator (`fake-gcs-server`). Backups use a **Stack + Prune** strategy: each run creates a timestamped archive, and a cleanup step removes archives older than 7 days.

---

## Scope

- **Local development only** — not for staging or production.
- Backups run daily at **03:00 UTC** via a cron-based Docker service.
- Archives are uploaded to the local `fake-gcs-server` bucket.

---

## Architecture Overview

```
+----------------+   mongodump   +-------------------+  curl upload  +----------------------+
|    MongoDB     | ------------> |   backup-cron      | -----------> |   fake-gcs-server    |
|   (container)  |               |  (container/cron)  |              |  gs://backups/daily/ |
+----------------+               +-------------------+              +----------------------+
```

---

## Implementation Steps

### 1. Create the GCS backup bucket seed directory

Ensure the `fake-gcs-server` initialises a `backups` bucket on startup.

**File:** `docker/gcs/seed/backups/.gitkeep`

Create an empty directory so the emulator picks up the bucket from the filesystem. The backup script also creates the bucket via the API as a fallback (idempotent).

---

### 2. Create the backup script

**File:** `scripts/backup-mongo.sh`

```bash
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
```

Make it executable:

```bash
chmod +x scripts/backup-mongo.sh
```

---

### 3. Create the backup Dockerfile

**File:** `docker/backup/Dockerfile`

```dockerfile
FROM mongo:7

RUN apt-get update \
 && apt-get install -y --no-install-recommends cron curl \
 && rm -rf /var/lib/apt/lists/*

COPY scripts/backup-mongo.sh /usr/local/bin/backup-mongo.sh
RUN chmod +x /usr/local/bin/backup-mongo.sh

# Cron: daily at 03:00 UTC
RUN echo "0 3 * * * root . /etc/environment; /usr/local/bin/backup-mongo.sh >> /var/log/backup.log 2>&1" \
    > /etc/cron.d/mongo-backup \
 && chmod 0644 /etc/cron.d/mongo-backup

CMD ["cron", "-f"]
```

> **Note:** Environment variables set via `docker-compose.yml` are not automatically available inside cron jobs. The entrypoint dumps them to `/etc/environment` so the cron script can source them. Add this `entrypoint` override in `docker-compose.yml` (see step 4).

---

### 4. Add the backup service to `docker-compose.yml`

```yaml
services:
  # ... existing mongo and fake-gcs services ...

  backup:
    build:
      context: .
      dockerfile: docker/backup/Dockerfile
    depends_on:
      - mongo
      - fake-gcs
    entrypoint: >
      sh -c "env >> /etc/environment && cron -f"
    environment:
      MONGO_HOST: mongo
      MONGO_PORT: "27017"
      MONGO_DB: discord-clone
      GCS_ENDPOINT: http://fake-gcs:4443
      GCS_BUCKET: backups
      RETENTION_DAYS: "7"
    restart: unless-stopped
```

---

### 5. Manual trigger and verification

Run a backup on demand to verify the setup:

```bash
docker compose exec backup /usr/local/bin/backup-mongo.sh
```

List stored backups:

```bash
curl http://localhost:4443/storage/v1/b/backups/o?prefix=daily/
```

---

### 6. Restore from backup

To restore a specific backup locally:

```bash
# Download from GCS emulator
curl -o backup.gz \
  "http://localhost:4443/storage/v1/b/backups/o/daily%2Fbackup-2026-05-03T030000Z.gz?alt=media"

# Restore into local MongoDB
mongorestore --host localhost --port 27017 --db discord-clone \
  --archive=backup.gz --gzip --drop
```

---

## File Summary

| File | Purpose |
|---|---|
| `scripts/backup-mongo.sh` | Dump, upload, and prune logic |
| `docker/backup/Dockerfile` | Cron container with mongo tools and curl |
| `docker/gcs/seed/backups/.gitkeep` | Ensures backup bucket exists on GCS emulator start |
| `docker-compose.yml` (updated) | Adds `backup` service |

---

## Retention Policy

| Window | Kept |
|---|---|
| Daily backups | Last 7 days |

Older archives are automatically deleted by the prune step after each backup run.

---

## Acceptance Criteria

- [ ] `docker compose up -d` starts the backup container alongside mongo and fake-gcs.
- [ ] Cron fires at 03:00 UTC daily and produces a timestamped `.gz` archive.
- [ ] Archive is uploaded to `gs://backups/daily/` on the local GCS emulator.
- [ ] Archives older than 7 days are deleted automatically.
- [ ] Manual backup via `docker compose exec backup /usr/local/bin/backup-mongo.sh` succeeds.
- [ ] Restore from a downloaded archive succeeds on a clean database.
# BUILD_PLAN.md — Local MongoDB Backup (Stack + Prune)

## Goal

Implement automated daily `mongodump` backups for local development, storing backup archives in the local GCS emulator (`fake-gcs-server`). Backups use a **Stack + Prune** strategy: each run creates a timestamped archive, and a cleanup step removes archives older than 7 days.

---

## Scope

- **Local development only** — not for staging or production.
- Backups run daily at **03:00 UTC** via a cron-based Docker service.
- Archives are uploaded to the local `fake-gcs-server` bucket.

---

## Architecture Overview

```
+----------------+   mongodump   +-------------------+  curl upload  +----------------------+
|    MongoDB     | ------------> |   backup-cron      | -----------> |   fake-gcs-server    |
|   (container)  |               |  (container/cron)  |              |  gs://backups/daily/ |
+----------------+               +-------------------+              +----------------------+
```

---

## Implementation Steps

### 1. Create the GCS backup bucket seed directory

Ensure the `fake-gcs-server` initialises a `backups` bucket on startup.

**File:** `docker/gcs/seed/backups/.gitkeep`

Create an empty directory so the emulator picks up the bucket from the filesystem. The backup script also creates the bucket via the API as a fallback (idempotent).

---

### 2. Create the backup script

**File:** `scripts/backup-mongo.sh`

```bash
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
```

Make it executable:

```bash
chmod +x scripts/backup-mongo.sh
```

---

### 3. Create the backup Dockerfile

**File:** `docker/backup/Dockerfile`

```dockerfile
FROM mongo:7

RUN apt-get update \
 && apt-get install -y --no-install-recommends cron curl \
 && rm -rf /var/lib/apt/lists/*

COPY scripts/backup-mongo.sh /usr/local/bin/backup-mongo.sh
RUN chmod +x /usr/local/bin/backup-mongo.sh

# Cron: daily at 03:00 UTC
RUN echo "0 3 * * * root . /etc/environment; /usr/local/bin/backup-mongo.sh >> /var/log/backup.log 2>&1" \
    > /etc/cron.d/mongo-backup \
 && chmod 0644 /etc/cron.d/mongo-backup

CMD ["cron", "-f"]
```

> **Note:** Environment variables set via `docker-compose.yml` are not automatically available inside cron jobs. The entrypoint dumps them to `/etc/environment` so the cron script can source them. Add this `entrypoint` override in `docker-compose.yml` (see step 4).

---

### 4. Add the backup service to `docker-compose.yml`

```yaml
services:
  # ... existing mongo and fake-gcs services ...

  backup:
    build:
      context: .
      dockerfile: docker/backup/Dockerfile
    depends_on:
      - mongo
      - fake-gcs
    entrypoint: >
      sh -c "env >> /etc/environment && cron -f"
    environment:
      MONGO_HOST: mongo
      MONGO_PORT: "27017"
      MONGO_DB: discord-clone
      GCS_ENDPOINT: http://fake-gcs:4443
      GCS_BUCKET: backups
      RETENTION_DAYS: "7"
    restart: unless-stopped
```

---

### 5. Manual trigger and verification

Run a backup on demand to verify the setup:

```bash
docker compose exec backup /usr/local/bin/backup-mongo.sh
```

List stored backups:

```bash
curl http://localhost:4443/storage/v1/b/backups/o?prefix=daily/
```

---

### 6. Restore from backup

To restore a specific backup locally:

```bash
# Download from GCS emulator
curl -o backup.gz \
  "http://localhost:4443/storage/v1/b/backups/o/daily%2Fbackup-2026-05-03T030000Z.gz?alt=media"

# Restore into local MongoDB
mongorestore --host localhost --port 27017 --db discord-clone \
  --archive=backup.gz --gzip --drop
```

---

## File Summary

| File | Purpose |
|---|---|
| `scripts/backup-mongo.sh` | Dump, upload, and prune logic |
| `docker/backup/Dockerfile` | Cron container with mongo tools and curl |
| `docker/gcs/seed/backups/.gitkeep` | Ensures backup bucket exists on GCS emulator start |
| `docker-compose.yml` (updated) | Adds `backup` service |

---

## Retention Policy

| Window | Kept |
|---|---|
| Daily backups | Last 7 days |

Older archives are automatically deleted by the prune step after each backup run.

---

## Acceptance Criteria

- [ ] `docker compose up -d` starts the backup container alongside mongo and fake-gcs.
- [ ] Cron fires at 03:00 UTC daily and produces a timestamped `.gz` archive.
- [ ] Archive is uploaded to `gs://backups/daily/` on the local GCS emulator.
- [ ] Archives older than 7 days are deleted automatically.
- [ ] Manual backup via `docker compose exec backup /usr/local/bin/backup-mongo.sh` succeeds.
- [ ] Restore from a downloaded archive succeeds on a clean database.

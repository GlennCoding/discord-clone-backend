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

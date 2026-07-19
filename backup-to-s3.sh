#!/bin/bash

DATE=$(date +%F)
TIME=$(date +%H-%M-%S)


CONTAINER=$(docker compose ps -q db)

DB_USER="taskflow"
DB_NAME="taskflow"
# user must provide hus bucket name 
S3_BUCKET="s3://user-taskflow-backups"
TMP_DIR="/tmp"

BACKUP_FILE="$TMP_DIR/taskflow-$DATE-$TIME.sql"
COMPRESSED_FILE="$BACKUP_FILE.gz"

LOG_FILE="/var/log/taskflow-s3-backup.log"

echo "=====================================" >> "$LOG_FILE"
echo "Backup started at $(date)" >> "$LOG_FILE"

# 1️⃣ Dump database
if docker exec "$CONTAINER" \
    pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"
then
    echo "Database dump successful" >> "$LOG_FILE"
else
    echo "Database dump FAILED" >> "$LOG_FILE"
    exit 1
fi

gzip "$BACKUP_FILE"

if aws s3 cp "$COMPRESSED_FILE" "$S3_BUCKET/"
then
    echo "Uploaded to S3 successfully" >> "$LOG_FILE"
else
    echo "S3 upload FAILED" >> "$LOG_FILE"
    exit 1
fi


rm -f "$COMPRESSED_FILE"

echo "Backup completed at $(date)" >> "$LOG_FILE"
echo "=====================================" >> "$LOG_FILE"

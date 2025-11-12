#!/bin/bash

# Database Migration Script
# This script will export from SOURCE and import to NEW database

set -e  # Exit on error

echo "=== CalorieScience Database Migration ==="
echo ""

# Check if URLs are provided
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./migrate-database.sh <SOURCE_DB_URL> <NEW_DB_URL>"
  echo ""
  echo "Example:"
  echo "  ./migrate-database.sh \\"
  echo "    'postgresql://postgres:SOURCE_PASSWORD@db.xxxxx.supabase.co:5432/postgres' \\"
  echo "    'postgresql://postgres:NEW_PASSWORD@db.yyyyy.supabase.co:5432/postgres'"
  echo ""
  echo "Get your database URLs from Supabase:"
  echo "  Dashboard → Settings → Database → Connection String (URI)"
  exit 1
fi

SOURCE_DB="$1"
NEW_DB="$2"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="database/backups"
DUMP_FILE="$BACKUP_DIR/migration_$TIMESTAMP.sql"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Step 1: Exporting from SOURCE database..."
echo "  This may take a few minutes depending on data size..."
echo ""

pg_dump "$SOURCE_DB" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --file="$DUMP_FILE"

if [ $? -eq 0 ]; then
  echo "✓ Export successful!"
  echo "  Saved to: $DUMP_FILE"
  echo "  File size: $(ls -lh "$DUMP_FILE" | awk '{print $5}')"
else
  echo "✗ Export failed!"
  exit 1
fi

echo ""
echo "Step 2: Importing to NEW database..."
echo "  This may take a few minutes..."
echo ""

psql "$NEW_DB" -f "$DUMP_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "✓ Import successful!"
else
  echo ""
  echo "✗ Import failed!"
  echo "  The dump file is saved at: $DUMP_FILE"
  echo "  You can try importing manually:"
  echo "    psql \"$NEW_DB\" -f \"$DUMP_FILE\""
  exit 1
fi

echo ""
echo "=== Migration Complete! ==="
echo ""
echo "Next steps:"
echo "  1. Verify data in new database"
echo "  2. Update Vercel environment variables"
echo "  3. Test your application with new database"

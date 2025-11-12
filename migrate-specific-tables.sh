#!/bin/bash

# Migrate Specific Tables Script
# This script exports only the required reference tables

set -e  # Exit on error

echo "=== CalorieScience Specific Tables Migration ==="
echo ""

# Check if URLs are provided
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./migrate-specific-tables.sh <SOURCE_DB_URL> <NEW_DB_URL>"
  echo ""
  echo "Example:"
  echo "  ./migrate-specific-tables.sh \\"
  echo "    'postgresql://postgres:SOURCE_PASSWORD@db.xxxxx.supabase.co:5432/postgres' \\"
  echo "    'postgresql://postgres:NEW_PASSWORD@db.yyyyy.supabase.co:5432/postgres'"
  echo ""
  exit 1
fi

SOURCE_DB="$1"
NEW_DB="$2"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="database/backups"
SCHEMA_FILE="$BACKUP_DIR/schema_$TIMESTAMP.sql"
DATA_FILE="$BACKUP_DIR/data_$TIMESTAMP.sql"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "Step 1: Exporting schema from SOURCE database..."
echo ""

/usr/local/opt/postgresql@17/bin/pg_dump "$SOURCE_DB" \
  --schema-only \
  --no-owner \
  --no-privileges \
  --file="$SCHEMA_FILE"

echo "✓ Schema exported: $SCHEMA_FILE"

echo ""
echo "Step 2: Exporting data from specific tables..."
echo ""

# List of tables to export
TABLES=(
  "cached_recipes"
  "country_micronutrient_mappings"
  "eer_formulas"
  "food_categories"
  "food_category_portion_sizes"
  "food_database_providers"
  "macro_guidelines"
  "micronutrient_guidelines_flexible"
  "pal_values"
  "portion_sizes"
  "simple_ingredients"
)

# Build pg_dump command with all tables
TABLE_ARGS=""
for table in "${TABLES[@]}"; do
  TABLE_ARGS="$TABLE_ARGS --table=$table"
done

/usr/local/opt/postgresql@17/bin/pg_dump "$SOURCE_DB" \
  --data-only \
  --no-owner \
  --no-privileges \
  $TABLE_ARGS \
  --file="$DATA_FILE"

echo "✓ Data exported: $DATA_FILE"
echo "  File size: $(ls -lh "$DATA_FILE" | awk '{print $5}')"

echo ""
echo "Step 3: Importing schema to NEW database..."
echo ""

/usr/local/opt/postgresql@17/bin/psql "$NEW_DB" -f "$SCHEMA_FILE" 2>&1 | grep -v "NOTICE\|already exists" || true

echo "✓ Schema imported"

echo ""
echo "Step 4: Importing data to NEW database..."
echo ""

/usr/local/opt/postgresql@17/bin/psql "$NEW_DB" -f "$DATA_FILE"

echo "✓ Data imported"

echo ""
echo "=== Migration Complete! ==="
echo ""
echo "Migrated tables:"
for table in "${TABLES[@]}"; do
  echo "  - $table"
done

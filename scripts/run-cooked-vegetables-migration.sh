#!/bin/bash

# Script to run the cooked vegetables migration
# Usage: ./scripts/run-cooked-vegetables-migration.sh

set -e  # Exit on error

echo "🚀 Running Cooked Vegetables Migration..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
  echo "❌ Error: .env.local file not found"
  echo "Please create .env.local with your database credentials"
  exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Check for required variables
if [ -z "$DATABASE_URL" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "❌ Error: Missing database configuration"
  echo "Required: DATABASE_URL or NEXT_PUBLIC_SUPABASE_URL"
  exit 1
fi

# Migration file path
MIGRATION_FILE="database/migrations/072_add_cooked_vegetable_variants.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Error: Migration file not found at $MIGRATION_FILE"
  exit 1
fi

echo "📋 Migration: 072_add_cooked_vegetable_variants.sql"
echo "📍 Location: $MIGRATION_FILE"
echo ""

# Method 1: Try psql if DATABASE_URL is available
if [ ! -z "$DATABASE_URL" ]; then
  echo "🔧 Method 1: Using psql with DATABASE_URL..."
  
  if command -v psql &> /dev/null; then
    echo "   Executing SQL migration..."
    psql "$DATABASE_URL" -f "$MIGRATION_FILE"
    
    if [ $? -eq 0 ]; then
      echo ""
      echo "✅ Migration executed successfully!"
      echo ""
      
      # Verify the additions
      echo "🔍 Verifying added ingredients..."
      psql "$DATABASE_URL" -c "SELECT COUNT(*) as cooked_variants FROM simple_ingredients WHERE name LIKE '%sauteed%' OR name LIKE '%grilled%' OR name LIKE '%stir-fry%';"
      
      echo ""
      echo "📊 Sample of added ingredients:"
      psql "$DATABASE_URL" -c "SELECT name, calories, serving_quantity || serving_unit as serving FROM simple_ingredients WHERE name LIKE '%sauteed%' ORDER BY name LIMIT 10;"
      
      echo ""
      echo "✨ Migration complete! 51 cooked vegetable variants added."
      exit 0
    else
      echo "❌ Error executing migration with psql"
      echo "Trying alternative methods..."
    fi
  else
    echo "⚠️  psql not found, trying Node.js script..."
  fi
fi

# Method 2: Try Node.js script
echo ""
echo "🔧 Method 2: Using Node.js script..."

if command -v node &> /dev/null; then
  node scripts/add-cooked-vegetables.js
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed via Node.js!"
    exit 0
  else
    echo "❌ Error executing Node.js script"
  fi
else
  echo "⚠️  Node.js not found"
fi

# Method 3: Manual instructions
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Manual Migration Steps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Please run the migration manually using one of these methods:"
echo ""
echo "1. Supabase Dashboard:"
echo "   - Go to: https://app.supabase.com"
echo "   - Navigate to: SQL Editor"
echo "   - Copy and paste: $MIGRATION_FILE"
echo "   - Click: Run"
echo ""
echo "2. Using psql:"
echo "   psql \$DATABASE_URL -f $MIGRATION_FILE"
echo ""
echo "3. Using Supabase CLI:"
echo "   supabase db push"
echo ""

exit 1


# Database Migrations

This directory contains database migration files that are automatically executed when the backend deploys.

## How It Works

1. **Migration Files**: All `.sql` files in this directory are treated as migrations
2. **Execution Order**: Migrations are executed in alphabetical order (use numbered prefixes)
3. **Tracking**: A `migrations` table tracks which migrations have been executed
4. **Automatic**: Migrations run automatically on first API health check after deployment
5. **Idempotent**: Migrations use `IF NOT EXISTS` and similar checks to be safely re-runnable

## Migration Naming Convention

```
001_description.sql
002_another_migration.sql
003_add_new_feature.sql
```

Always use:
- **3-digit prefix** for ordering
- **Descriptive name** of what the migration does
- **`.sql` extension**

## Current Migrations

- `001_create_migrations_table.sql` - Sets up the migration tracking system
- `002_add_macros_ranges.sql` - Adds min/max ranges for macronutrients
- `003_update_client_names_phone.sql` - Updates client name and phone structure
- `004_update_nutritionist_names_phone.sql` - Updates nutritionist name and phone structure

## Adding New Migrations

1. Create a new `.sql` file with the next number in sequence
2. Use `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS` for safety
3. Test your migration locally first
4. Deploy - migrations will run automatically

## Manual Migration Control

### Run Migrations Manually
```bash
curl -X POST "https://caloriescience-api.vercel.app/api/admin/migrate" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "run"}'
```

### Validate Migration Checksums
```bash
curl -X POST "https://caloriescience-api.vercel.app/api/admin/migrate" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "validate"}'
```

### Re-run Specific Migration (Development Only)
```bash
curl -X POST "https://caloriescience-api.vercel.app/api/admin/migrate" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "rerun", "migration_name": "002_add_macros_ranges.sql"}'
```

## Best Practices

### ✅ DO
- Use `IF NOT EXISTS` for tables, indexes, and constraints
- Use `ADD COLUMN IF NOT EXISTS` for new columns
- Check for existing data before updates
- Include helpful comments
- Test migrations locally first

### ❌ DON'T
- Delete or modify existing migration files after they've been deployed
- Create destructive migrations without proper checks
- Forget to handle existing data
- Use transactions in migration files (Supabase handles this)

## Example Migration

```sql
-- Migration 005: Add client preferences
-- Add columns for dietary preferences and restrictions

-- Add new columns
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS dietary_restrictions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS food_allergies JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS meal_preferences JSONB DEFAULT '{}';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_clients_dietary_restrictions 
ON clients USING GIN (dietary_restrictions);

-- Add constraints
ALTER TABLE clients 
ADD CONSTRAINT IF NOT EXISTS chk_dietary_restrictions_array 
CHECK (jsonb_typeof(dietary_restrictions) = 'array');

-- Comments
COMMENT ON COLUMN clients.dietary_restrictions IS 'Array of dietary restriction strings';
COMMENT ON COLUMN clients.food_allergies IS 'Array of food allergy strings';
COMMENT ON COLUMN clients.meal_preferences IS 'JSON object of meal preferences';
```

## Troubleshooting

### Migration Failed?
1. Check Vercel logs for error details
2. Validate migration syntax in Supabase SQL editor
3. Use manual migration API to retry
4. Fix the issue and redeploy

### Check Migration Status
Visit the health endpoint to see if migrations ran:
```bash
curl "https://caloriescience-api.vercel.app/api/health"
```

### Database State Issues?
Use the validation endpoint to check for inconsistencies:
```bash
curl -X POST "https://caloriescience-api.vercel.app/api/admin/migrate" \
  -H "Authorization: Bearer JWT_TOKEN" \
  -d '{"action": "validate"}'
``` 
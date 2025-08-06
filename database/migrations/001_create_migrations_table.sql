-- Migration 001: Create migrations tracking table
-- This table keeps track of which migrations have been executed

CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) UNIQUE NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  checksum VARCHAR(64),
  execution_time_ms INTEGER
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations(migration_name);

-- Add comments
COMMENT ON TABLE migrations IS 'Tracks which database migrations have been executed';
COMMENT ON COLUMN migrations.migration_name IS 'Unique name of the migration file';
COMMENT ON COLUMN migrations.executed_at IS 'When the migration was executed';
COMMENT ON COLUMN migrations.checksum IS 'SHA-256 hash of migration content for integrity';
COMMENT ON COLUMN migrations.execution_time_ms IS 'How long the migration took to execute';

-- Insert this migration as the first one
INSERT INTO migrations (migration_name, checksum, execution_time_ms) 
VALUES ('001_create_migrations_table.sql', 'initial', 0)
ON CONFLICT (migration_name) DO NOTHING; 
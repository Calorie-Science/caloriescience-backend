/**
 * Script to run the measurement system migration
 * 
 * This script applies the database migration to add measurement system
 * preferences to users and clients tables.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('- SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Starting measurement system migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '058_add_measurement_system_preferences.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded');
    console.log('📄 Migration content:');
    console.log(migrationSQL);
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration executed successfully!');
    
    // Verify the migration by checking if columns exist
    console.log('🔍 Verifying migration...');
    
    // Check users table
    const { data: usersTableInfo, error: usersError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'users')
      .eq('column_name', 'preferred_measurement_system');
    
    if (usersError) {
      console.warn('⚠️ Could not verify users table:', usersError);
    } else if (usersTableInfo && usersTableInfo.length > 0) {
      console.log('✅ users.preferred_measurement_system column added successfully');
    } else {
      console.warn('⚠️ users.preferred_measurement_system column not found');
    }
    
    // Check clients table
    const { data: clientsTableInfo, error: clientsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'clients')
      .eq('column_name', 'preferred_measurement_system');
    
    if (clientsError) {
      console.warn('⚠️ Could not verify clients table:', clientsError);
    } else if (clientsTableInfo && clientsTableInfo.length > 0) {
      console.log('✅ clients.preferred_measurement_system column added successfully');
    } else {
      console.warn('⚠️ clients.preferred_measurement_system column not found');
    }
    
    console.log('🎉 Measurement system migration completed successfully!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Test the measurement system API endpoints');
    console.log('2. Integrate the toggle UI components');
    console.log('3. Update existing clients with default preferences');
    console.log('');
    console.log('📚 See MEASUREMENT_SYSTEM_FEATURE.md for detailed documentation');
    
  } catch (error) {
    console.error('💥 Unexpected error during migration:', error);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };

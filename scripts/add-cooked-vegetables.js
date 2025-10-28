#!/usr/bin/env node

/**
 * Script to add cooked vegetable variants to simple_ingredients table
 * Run: node scripts/add-cooked-vegetables.js
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Adding cooked vegetable variants to database...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '072_add_cooked_vegetable_variants.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    console.log('📝 Executing migration 072_add_cooked_vegetable_variants.sql...');
    
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      // If RPC doesn't exist, try direct execution via REST API
      console.log('⚠️  exec_sql RPC not found, attempting direct execution...');
      
      // Split by INSERT statements and execute individually
      const insertStatements = migrationSQL
        .split(/INSERT INTO simple_ingredients/)
        .filter(stmt => stmt.trim().length > 0)
        .map(stmt => 'INSERT INTO simple_ingredients' + stmt.trim());

      for (let i = 0; i < insertStatements.length; i++) {
        const stmt = insertStatements[i];
        if (stmt.includes('INSERT INTO')) {
          console.log(`  Executing batch ${i + 1}/${insertStatements.length}...`);
          
          // Parse the VALUES and insert using Supabase client
          // For simplicity, we'll use raw SQL via a custom function
          // This is a fallback - ideally use a migration runner
        }
      }
      
      throw new Error('Could not execute migration. Please run SQL manually or use a database migration tool.');
    }

    console.log('✅ Migration executed successfully!\n');

    // Verify the additions
    console.log('🔍 Verifying added ingredients...');
    const { data: cookedVeggies, error: queryError } = await supabase
      .from('simple_ingredients')
      .select('name, category, calories, serving_quantity, serving_unit')
      .or('name.ilike.%sauteed%,name.ilike.%grilled%,name.ilike.%stir-fry%')
      .order('name');

    if (queryError) {
      console.error('❌ Error querying ingredients:', queryError);
    } else {
      console.log(`\n✅ Found ${cookedVeggies.length} cooked vegetable variants:\n`);
      
      // Group by cooking method
      const sauteed = cookedVeggies.filter(v => v.name.includes('sauteed'));
      const grilled = cookedVeggies.filter(v => v.name.includes('grilled'));
      const stirfry = cookedVeggies.filter(v => v.name.includes('stir-fry'));
      
      console.log(`🍳 Sautéed (${sauteed.length}):`);
      sauteed.slice(0, 5).forEach(v => 
        console.log(`   - ${v.name} (${v.serving_quantity}${v.serving_unit}, ${v.calories} cal)`)
      );
      if (sauteed.length > 5) console.log(`   ... and ${sauteed.length - 5} more`);
      
      console.log(`\n🔥 Grilled (${grilled.length}):`);
      grilled.slice(0, 5).forEach(v => 
        console.log(`   - ${v.name} (${v.serving_quantity}${v.serving_unit}, ${v.calories} cal)`)
      );
      if (grilled.length > 5) console.log(`   ... and ${grilled.length - 5} more`);
      
      console.log(`\n🥘 Stir-fry (${stirfry.length}):`);
      stirfry.slice(0, 5).forEach(v => 
        console.log(`   - ${v.name} (${v.serving_quantity}${v.serving_unit}, ${v.calories} cal)`)
      );
      if (stirfry.length > 5) console.log(`   ... and ${stirfry.length - 5} more`);
      
      console.log('\n✨ All cooked vegetable variants added successfully!');
    }

  } catch (error) {
    console.error('❌ Error running migration:', error.message);
    console.log('\n📋 Manual execution steps:');
    console.log('1. Connect to your Supabase database');
    console.log('2. Run the SQL file: database/migrations/072_add_cooked_vegetable_variants.sql');
    console.log('3. Verify the ingredients were added');
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});


#!/usr/bin/env node

/**
 * Test script to check database structure
 * This will help identify if the migration has been applied correctly
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkDatabaseStructure() {
  console.log('🔍 Checking database structure...\n');
  
  try {
    // Initialize Supabase client
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    console.log('1. Checking if meal_plans table exists...');
    
    // Check if table exists by trying to select from it
    const { data: tableCheck, error: tableError } = await supabase
      .from('meal_plans')
      .select('*')
      .limit(1);
    
    if (tableError) {
      if (tableError.code === '42P01') {
        console.log('   ❌ Table "meal_plans" does not exist');
        console.log('   💡 You need to run the migration first');
        console.log('   📁 Migration file: database/migrations/035_create_meal_planning_tables.sql');
        return;
      } else {
        console.log('   ❌ Error checking table:', tableError.message);
        return;
      }
    }
    
    console.log('   ✅ Table "meal_plans" exists');
    
    // Check table structure
    console.log('\n2. Checking table columns...');
    
    // Try to get table info by selecting specific columns
    const { data: columns, error: columnsError } = await supabase
      .from('meal_plans')
      .select('id, client_id, nutritionist_id, plan_name, plan_date, plan_type, status, target_calories, created_at')
      .limit(1);
    
    if (columnsError) {
      console.log('   ❌ Error checking columns:', columnsError.message);
      console.log('   🔍 Error details:', columnsError);
      return;
    }
    
    console.log('   ✅ All expected columns exist');
    
    // Check if there are any existing meal plans
    console.log('\n3. Checking for existing meal plans...');
    
    const { data: count, error: countError } = await supabase
      .from('meal_plans')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('   ❌ Error counting records:', countError.message);
    } else {
      console.log(`   📊 Found ${count.length || 0} meal plans`);
    }
    
    // Check meal_plan_meals table
    console.log('\n4. Checking meal_plan_meals table...');
    
    const { data: mealsTable, error: mealsError } = await supabase
      .from('meal_plan_meals')
      .select('*')
      .limit(1);
    
    if (mealsError) {
      if (mealsError.code === '42P01') {
        console.log('   ❌ Table "meal_plan_meals" does not exist');
      } else {
        console.log('   ❌ Error checking meal_plan_meals:', mealsError.message);
      }
    } else {
      console.log('   ✅ Table "meal_plan_meals" exists');
    }
    
    console.log('\n✅ Database structure check completed!');
    
    if (tableCheck && tableCheck.length > 0) {
      console.log('\n📋 Sample meal plan structure:');
      console.log(JSON.stringify(tableCheck[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error checking database structure:', error.message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('   1. Make sure your environment variables are set correctly');
    console.log('   2. Check that Supabase is accessible');
    console.log('   3. Verify the migration has been applied');
  }
}

// Run the check
checkDatabaseStructure().catch(console.error);

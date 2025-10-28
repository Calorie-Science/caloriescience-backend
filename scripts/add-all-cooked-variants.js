#!/usr/bin/env node

/**
 * Script to add ALL cooked variants (steamed, sautéed, stir-fry, grilled, baked) for appropriate ingredients
 * Run: node scripts/add-all-cooked-variants.js
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
  console.log('🚀 Adding ALL cooked variants to database...\n');
  console.log('📋 Cooking Methods:');
  console.log('   • Steamed   - No added fat, preserves vitamins');
  console.log('   • Sautéed   - +40-50 cal from oil');
  console.log('   • Stir-fry  - +30-40 cal from oil');
  console.log('   • Grilled   - No/minimal added fat, charred flavor');
  console.log('   • Baked     - +20-30 cal if oiled\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'database', 'migrations', '073_add_all_cooked_ingredient_variants.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing migration 073_add_all_cooked_ingredient_variants.sql...');
    console.log('   This may take a moment...\n');

    // Count existing ingredients before migration
    const { count: beforeCount } = await supabase
      .from('simple_ingredients')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Ingredients before: ${beforeCount}`);

    // Note: Since we can't execute raw SQL directly, provide manual instructions
    console.log('\n⚠️  Please execute the SQL migration manually:');
    console.log('   1. Connect to your Supabase database');
    console.log('   2. Run: database/migrations/073_add_all_cooked_ingredient_variants.sql');
    console.log('   3. Or use Supabase Dashboard > SQL Editor');
    console.log('\n   Press ENTER after executing the migration to verify...');

    // Wait for user input
    await new Promise((resolve) => {
      process.stdin.once('data', resolve);
    });

    // Verify the additions
    console.log('\n🔍 Verifying added ingredients...\n');

    const cookingMethods = ['steamed', 'sauteed', 'stir-fry', 'grilled', 'baked'];
    
    for (const method of cookingMethods) {
      const { data, count } = await supabase
        .from('simple_ingredients')
        .select('name, category, calories', { count: 'exact' })
        .ilike('name', `%${method}%`)
        .order('category')
        .limit(10);

      console.log(`\n${getMethodEmoji(method)} ${capitalizeFirst(method)} (${count} total):`);
      
      if (data && data.length > 0) {
        // Group by category
        const byCategory = data.reduce((acc, item) => {
          if (!acc[item.category]) acc[item.category] = [];
          acc[item.category].push(item);
          return acc;
        }, {});

        Object.entries(byCategory).forEach(([category, items]) => {
          console.log(`   ${category}:`);
          items.slice(0, 3).forEach(item => {
            console.log(`      - ${item.name} (${item.calories} cal)`);
          });
          if (items.length > 3) {
            console.log(`      ... and ${items.length - 3} more`);
          }
        });
      }
    }

    // Count after
    const { count: afterCount } = await supabase
      .from('simple_ingredients')
      .select('*', { count: 'exact', head: true });

    console.log(`\n\n📊 Summary:`);
    console.log(`   Before: ${beforeCount} ingredients`);
    console.log(`   After:  ${afterCount} ingredients`);
    console.log(`   Added:  ${afterCount - beforeCount} cooked variants`);

    // Show breakdown by category
    console.log('\n📊 Breakdown by category:');
    const { data: categories } = await supabase
      .from('simple_ingredients')
      .select('category')
      .order('category');

    const categoryCount = categories.reduce((acc, row) => {
      acc[row.category] = (acc[row.category] || 0) + 1;
      return acc;
    }, {});

    Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`   ${category.padEnd(15)} : ${count}`);
      });

    console.log('\n✨ All cooked variants added successfully!');
    console.log('\n💡 You can now search for:');
    console.log('   • "steamed broccoli"');
    console.log('   • "grilled chicken breast"');
    console.log('   • "baked tofu"');
    console.log('   • "sauteed mushroom"');
    console.log('   • "stir-fry bell pepper"');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\n📋 Manual execution steps:');
    console.log('1. Connect to your Supabase database');
    console.log('2. Run the SQL file: database/migrations/073_add_all_cooked_ingredient_variants.sql');
    console.log('3. Verify the ingredients were added');
    process.exit(1);
  }

  process.exit(0);
}

function getMethodEmoji(method) {
  const emojis = {
    'steamed': '♨️',
    'sauteed': '🍳',
    'stir-fry': '🥘',
    'grilled': '🔥',
    'baked': '🔥'
  };
  return emojis[method] || '🍽️';
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Run the migration
console.log('\n' + '='.repeat(60));
console.log('  COOKED INGREDIENT VARIANTS MIGRATION');
console.log('='.repeat(60) + '\n');

runMigration().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});


#!/usr/bin/env node

/**
 * Migration Script: Add ALL cooked variants for remaining ingredients (Migration 074)
 * 
 * This adds steamed, sautéed, stir-fry, grilled, and baked variants for:
 * - All vegetables not covered in 072/073 (tomato, cucumber, sweet potato, potato, beetroot, etc.)
 * - All proteins (salmon, tuna, cod, beef, pork, lamb, duck, turkey, eggs, etc.)
 * - Additional vegetables (onions, garlic, ginger, leek, etc.)
 * 
 * Total: ~150+ new cooked ingredient variants
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Migration 074: Add ALL Cooked Variants for Remaining Ingredients...\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/074_add_remaining_cooked_variants.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Count ingredients before
    const beforeCount = await client.query('SELECT COUNT(*) FROM simple_ingredients');
    console.log(`📊 Ingredients before migration: ${beforeCount.rows[0].count}`);
    
    // Run the migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    // Count ingredients after
    const afterCount = await client.query('SELECT COUNT(*) FROM simple_ingredients');
    const added = parseInt(afterCount.rows[0].count) - parseInt(beforeCount.rows[0].count);
    
    console.log(`\n✅ Migration 074 completed successfully!`);
    console.log(`📊 Ingredients after migration: ${afterCount.rows[0].count}`);
    console.log(`🆕 New cooked variants added: ${added}`);
    
    // Show some examples
    console.log('\n📋 Sample new cooked ingredients:');
    const samples = await client.query(`
      SELECT name, category, calories, protein_g 
      FROM simple_ingredients 
      WHERE name IN (
        'grilled salmon', 'baked sweet potato', 'sauteed tomato',
        'scrambled egg', 'grilled beef sirloin', 'steamed tempeh',
        'sauteed onion', 'grilled portobello mushroom'
      )
      ORDER BY name
    `);
    
    samples.rows.forEach(row => {
      console.log(`   - ${row.name} (${row.category}): ${row.calories} cal, ${row.protein_g}g protein`);
    });
    
    console.log('\n🎉 All cooking methods now available for comprehensive ingredient coverage!');
    console.log('   Cooking methods: steamed, sautéed, stir-fry, grilled, baked');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error);


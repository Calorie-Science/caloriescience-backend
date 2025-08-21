#!/usr/bin/env node

/**
 * Script to convert all country values to lowercase in the database
 * Run this script after deploying the migration to ensure all existing data is converted
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function convertCountriesToLowercase() {
  console.log('🚀 Starting country value conversion to lowercase...\n');

  try {
    // 1. Convert eer_formulas table
    console.log('📊 Converting eer_formulas.country...');
    const { data: eerFormulas, error: eerError } = await supabase
      .from('eer_formulas')
      .select('id, country')
      .neq('country', '');
    
    if (eerError) throw eerError;
    
    let updatedCount = 0;
    for (const record of eerFormulas) {
      if (record.country !== record.country.toLowerCase()) {
        const { error } = await supabase
          .from('eer_formulas')
          .update({ country: record.country.toLowerCase() })
          .eq('id', record.id);
        
        if (error) {
          console.error(`❌ Error updating eer_formulas ${record.id}:`, error);
        } else {
          updatedCount++;
        }
      }
    }
    console.log(`✅ Updated ${updatedCount} records in eer_formulas`);

    // 2. Convert pal_values table
    console.log('\n📊 Converting pal_values.country...');
    const { data: palValues, error: palError } = await supabase
      .from('pal_values')
      .select('id, country')
      .neq('country', '');
    
    if (palError) throw palError;
    
    updatedCount = 0;
    for (const record of palValues) {
      if (record.country !== record.country.toLowerCase()) {
        const { error } = await supabase
          .from('pal_values')
          .update({ country: record.country.toLowerCase() })
          .eq('id', record.id);
        
        if (error) {
          console.error(`❌ Error updating pal_values ${record.id}:`, error);
        } else {
          updatedCount++;
        }
      }
    }
    console.log(`✅ Updated ${updatedCount} records in pal_values`);

    // 3. Convert macro_guidelines table
    console.log('\n📊 Converting macro_guidelines.country...');
    const { data: macroGuidelines, error: macroError } = await supabase
      .from('macro_guidelines')
      .select('id, country')
      .neq('country', '');
    
    if (macroError) throw macroError;
    
    updatedCount = 0;
    for (const record of macroGuidelines) {
      if (record.country !== record.country.toLowerCase()) {
        const { error } = await supabase
          .from('macro_guidelines')
          .update({ country: record.country.toLowerCase() })
          .eq('id', record.id);
        
        if (error) {
          console.error(`❌ Error updating macro_guidelines ${record.id}:`, error);
        } else {
          updatedCount++;
        }
      }
    }
    console.log(`✅ Updated ${updatedCount} records in macro_guidelines`);

    // 4. Convert micronutrient_guidelines_flexible table
    console.log('\n📊 Converting micronutrient_guidelines_flexible.country...');
    const { data: microGuidelines, error: microError } = await supabase
      .from('micronutrient_guidelines_flexible')
      .select('id, country')
      .neq('country', '');
    
    if (microError) throw microError;
    
    updatedCount = 0;
    for (const record of microGuidelines) {
      if (record.country !== record.country.toLowerCase()) {
        const { error } = await supabase
          .from('micronutrient_guidelines_flexible')
          .update({ country: record.country.toLowerCase() })
          .eq('id', record.id);
        
        if (error) {
          console.error(`❌ Error updating micronutrient_guidelines_flexible ${record.id}:`, error);
        } else {
          updatedCount++;
        }
      }
    }
    console.log(`✅ Updated ${updatedCount} records in micronutrient_guidelines_flexible`);

    // 5. Convert country_micronutrient_mappings table
    console.log('\n📊 Converting country_micronutrient_mappings.country_name...');
    const { data: countryMappings, error: mappingError } = await supabase
      .from('country_micronutrient_mappings')
      .select('id, country_name')
      .neq('country_name', '');
    
    if (mappingError) throw mappingError;
    
    updatedCount = 0;
    for (const record of countryMappings) {
      if (record.country_name !== record.country_name.toLowerCase()) {
        const { error } = await supabase
          .from('country_micronutrient_mappings')
          .update({ country_name: record.country_name.toLowerCase() })
          .eq('id', record.id);
        
        if (error) {
          console.error(`❌ Error updating country_micronutrient_mappings ${record.id}:`, error);
        } else {
          updatedCount++;
        }
      }
    }
    console.log(`✅ Updated ${updatedCount} records in country_micronutrient_mappings`);

    // 6. Convert client_nutrition_requirements table
    console.log('\n📊 Converting client_nutrition_requirements guideline countries...');
    const { data: clientNutrition, error: clientNutritionError } = await supabase
      .from('client_nutrition_requirements')
      .select('id, eer_guideline_country, macro_guideline_country')
      .or('eer_guideline_country.neq.,macro_guideline_country.neq.');
    
    if (clientNutritionError) throw clientNutritionError;
    
    updatedCount = 0;
    for (const record of clientNutrition) {
      let hasUpdates = false;
      const updates = {};
      
      if (record.eer_guideline_country && record.eer_guideline_country !== record.eer_guideline_country.toLowerCase()) {
        updates.eer_guideline_country = record.eer_guideline_country.toLowerCase();
        hasUpdates = true;
      }
      
      if (record.macro_guideline_country && record.macro_guideline_country !== record.macro_guideline_country.toLowerCase()) {
        updates.macro_guideline_country = record.macro_guideline_country.toLowerCase();
        hasUpdates = true;
      }
      
      if (hasUpdates) {
        const { error } = await supabase
          .from('client_nutrition_requirements')
          .update(updates)
          .eq('id', record.id);
        
        if (error) {
          console.error(`❌ Error updating client_nutrition_requirements ${record.id}:`, error);
        } else {
          updatedCount++;
        }
      }
    }
    console.log(`✅ Updated ${updatedCount} records in client_nutrition_requirements`);

    // 7. Convert client_micronutrient_requirements_flexible table
    console.log('\n📊 Converting client_micronutrient_requirements_flexible.country_guideline...');
    const { data: clientMicro, error: clientMicroError } = await supabase
      .from('client_micronutrient_requirements_flexible')
      .select('id, country_guideline')
      .neq('country_guideline', '');
    
    if (clientMicroError) throw clientMicroError;
    
    updatedCount = 0;
    for (const record of clientMicro) {
      if (record.country_guideline !== record.country_guideline.toLowerCase()) {
        const { error } = await supabase
          .from('client_micronutrient_requirements_flexible')
          .update({ country_guideline: record.country_guideline.toLowerCase() })
          .eq('id', record.id);
        
        if (error) {
          console.error(`❌ Error updating client_micronutrient_requirements_flexible ${record.id}:`, error);
        } else {
          updatedCount++;
        }
      }
    }
    console.log(`✅ Updated ${updatedCount} records in client_micronutrient_requirements_flexible`);

    console.log('\n🎉 All country values have been converted to lowercase successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Deploy the migration file: database/migrations/037_convert_country_values_to_lowercase.sql');
    console.log('   2. Update your application code to use the new normalizeCountry functions');
    console.log('   3. Test that all country queries now work consistently');

  } catch (error) {
    console.error('❌ Error during country conversion:', error);
    process.exit(1);
  }
}

// Run the conversion
convertCountriesToLowercase()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

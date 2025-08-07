import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth';
import { validateAndTransformClient } from '../../lib/validation';
import { transformWithMapping, FIELD_MAPPINGS } from '../../lib/caseTransform';
import { calculateHealthMetrics } from '../../lib/healthMetrics';
import { getEERGuidelineFromLocation } from '../../lib/locationMapping';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  if (req.method === 'GET') {
    // Get all clients for nutritionist
    try {
      const { status, page = 1, limit = 20, search } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = supabase
        .from('clients')
        .select(`
          *,
          client_nutrition_requirements(
            id,
            eer_calories,
            created_at,
            is_active
          )
        `, { count: 'exact' })
        .eq('nutritionist_id', req.user.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      // Apply pagination
      query = query.range(offset, offset + Number(limit) - 1);

      const { data: clients, error, count } = await query;

      if (error) {
        console.error('Get clients error:', error);
        throw error;
      }

      // Transform database response to camelCase
      const transformedClients = transformWithMapping(clients || [], FIELD_MAPPINGS.snakeToCamel);

      res.status(200).json({
        clients: transformedClients,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / Number(limit))
        }
      });
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({
        error: 'Failed to fetch clients',
        message: 'An error occurred while retrieving client data'
      });
    }
  }

  else if (req.method === 'POST') {
    // Create new client
    try {
      const validation = validateAndTransformClient(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.errors
        });
      }

      // Extract micronutrients data before creating client
      const micronutrientsData = validation.value.micronutrients_data;
      const macrosData = validation.value.macros_data;
      
      const clientData = {
        ...validation.value,
        nutritionist_id: req.user.id,
        email: validation.value.email?.toLowerCase(),
        // Auto-generate full_name for backward compatibility
        full_name: validation.value.full_name || `${validation.value.first_name} ${validation.value.last_name || ''}`.trim(),
        // Auto-determine EER guideline from location
        eer_guideline: getEERGuidelineFromLocation(validation.value.location)
      };

      // Remove eer_calories, macros_data, and micronutrients_data from client data as they belong in separate tables
      delete clientData.eer_calories;
      delete clientData.macros_data;
      delete clientData.micronutrients_data;

      // Calculate BMI if height and weight are provided AND BMI is not already provided
      if (validation.value.height_cm && validation.value.weight_kg && !validation.value.bmi) {
        const healthMetrics = calculateHealthMetrics(
          validation.value.height_cm,
          validation.value.weight_kg,
          validation.value.bmr // Pass BMR if provided from EER calculation
        );
        
        // Transform health metrics to snake_case for database
        const transformedHealthMetrics = transformWithMapping(healthMetrics, FIELD_MAPPINGS.camelToSnake);
        Object.assign(clientData, transformedHealthMetrics);
      } else if (validation.value.bmi || validation.value.bmr) {
        // If BMI/BMR are provided from EER calculation, set the last calculated timestamps
        const now = new Date().toISOString();
        if (validation.value.bmi) {
          clientData.bmi_last_calculated = now;
        }
        if (validation.value.bmr) {
          clientData.bmr_last_calculated = now;
        }
      }

      const { data: client, error } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (error) {
        console.error('Create client error:', error);
        console.error('Client data that failed:', JSON.stringify(clientData, null, 2));
        
        // Return specific error details for debugging
        return res.status(500).json({
          error: 'Failed to create client',
          message: 'An error occurred while creating the client',
          details: error.message,
          code: error.code,
          hint: error.hint
        });
      }

      // If EER data is provided, create nutrition requirements record
      if (validation.value.eer_calories) {
        const nutritionData = {
          client_id: client.id,
          eer_calories: validation.value.eer_calories,
          calculation_method: 'formula_based',
          is_ai_generated: false,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: nutritionError } = await supabase
          .from('client_nutrition_requirements')
          .insert(nutritionData);

        if (nutritionError) {
          console.warn('Failed to create nutrition requirements:', nutritionError);
          // Don't fail the client creation, just log the warning
        }
      }

      // If macros data is provided, update the nutrition requirements record with macros
      if (macrosData && validation.value.eer_calories) {
        // Extract macros from the provided data
        const macros = macrosData;
        
        const macroUpdateData = {
          // Protein
          protein_min_grams: macros.Protein?.min_grams || null,
          protein_max_grams: macros.Protein?.max_grams || null,
          protein_note: macros.Protein?.note || null,
          
          // Carbohydrates
          carbs_min_grams: macros.Carbohydrates?.min_grams || null,
          carbs_max_grams: macros.Carbohydrates?.max_grams || null,
          carbs_note: macros.Carbohydrates?.note || null,
          
          // Total Fat
          fat_min_grams: macros['Total Fat']?.min_grams || null,
          fat_max_grams: macros['Total Fat']?.max_grams || null,
          fat_note: macros['Total Fat']?.note || null,
          
          // Fiber
          fiber_min_grams: macros.Fiber?.min_grams || null,
          fiber_max_grams: macros.Fiber?.max_grams || null,
          fiber_note: macros.Fiber?.note || null,
          
          // Saturated Fat
          saturated_fat_min_grams: macros['Saturated Fat']?.min_grams || null,
          saturated_fat_max_grams: macros['Saturated Fat']?.max_grams || null,
          saturated_fat_note: macros['Saturated Fat']?.note || null,
          
          // Monounsaturated Fat
          monounsaturated_fat_min_grams: macros['Monounsaturated Fat']?.min_grams || null,
          monounsaturated_fat_max_grams: macros['Monounsaturated Fat']?.max_grams || null,
          monounsaturated_fat_note: macros['Monounsaturated Fat']?.note || null,
          
          // Polyunsaturated Fat
          polyunsaturated_fat_min_grams: macros['Polyunsaturated Fat']?.min_grams || null,
          polyunsaturated_fat_max_grams: macros['Polyunsaturated Fat']?.max_grams || null,
          polyunsaturated_fat_note: macros['Polyunsaturated Fat']?.note || null,
          
          // Omega-3 Fatty Acids
          omega3_min_grams: macros['Omega-3 Fatty Acids']?.min_grams || null,
          omega3_max_grams: macros['Omega-3 Fatty Acids']?.max_grams || null,
          omega3_note: macros['Omega-3 Fatty Acids']?.note || null,
          
          // Cholesterol
          cholesterol_min_grams: macros.Cholesterol?.min_grams || null,
          cholesterol_max_grams: macros.Cholesterol?.max_grams || null,
          cholesterol_note: macros.Cholesterol?.note || null,
          
          calculation_method: 'formula_based',
          is_ai_generated: false,
          updated_at: new Date().toISOString()
        };

        const { error: macroError } = await supabase
          .from('client_nutrition_requirements')
          .update(macroUpdateData)
          .eq('client_id', client.id)
          .eq('is_active', true);

        if (macroError) {
          console.warn('Failed to update nutrition requirements with macros:', macroError);
        }
      }

      // If micronutrient data is provided, create micronutrient requirements record
      if (micronutrientsData && micronutrientsData.micronutrients) {
        const micronutrients = micronutrientsData.micronutrients;
        const micronutrientInsertData = {
          client_id: client.id,
          vitamin_a_mcg: micronutrients.vitaminA?.amount || null,
          thiamin_mg: micronutrients.thiamin?.amount || null,
          riboflavin_mg: micronutrients.riboflavin?.amount || null,
          niacin_equivalent_mg: micronutrients.niacinEquivalent?.amount || null,
          pantothenic_acid_mg: micronutrients.pantothenicAcid?.amount || null,
          vitamin_b6_mg: micronutrients.vitaminB6?.amount || null,
          biotin_mcg: micronutrients.biotin?.amount || null,
          vitamin_b12_mcg: micronutrients.vitaminB12?.amount || null,
          folate_mcg: micronutrients.folate?.amount || null,
          vitamin_c_mg: micronutrients.vitaminC?.amount || null,
          vitamin_d_mcg: micronutrients.vitaminD?.amount || null,
          iron_mg: micronutrients.iron?.amount || null,
          calcium_mg: micronutrients.calcium?.amount || null,
          magnesium_mg: micronutrients.magnesium?.amount || null,
          potassium_mg: micronutrients.potassium?.amount || null,
          zinc_mg: micronutrients.zinc?.amount || null,
          copper_mg: micronutrients.copper?.amount || null,
          iodine_mcg: micronutrients.iodine?.amount || null,
          selenium_mcg: micronutrients.selenium?.amount || null,
          phosphorus_mg: micronutrients.phosphorus?.amount || null,
          chloride_mg: micronutrients.chloride?.amount || null,
          sodium_g: micronutrients.sodium?.amount || null,
          guideline_used: micronutrientsData.guidelineUsed || 'UK',
          calculation_method: 'formula_based',
          is_ai_generated: false,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: micronutrientError } = await supabase
          .from('client_micronutrient_requirements')
          .insert(micronutrientInsertData);

        if (micronutrientError) {
          console.warn('Failed to create micronutrient requirements:', micronutrientError);
          // Don't fail the client creation, just log the warning
        }
      }

      // Get the created client
      const { data: createdClient, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', client.id)
        .single();

      if (fetchError) {
        console.error('Fetch created client error:', fetchError);
        return res.status(500).json({
          error: 'Client created but failed to fetch details',
          message: 'The client was created successfully but there was an issue retrieving the details'
        });
      }

      // Remove system fields that shouldn't be in response
      const { eer_guideline, ...clientWithoutSystemFields } = createdClient;

      // Transform to camelCase for response
      const transformedClient = transformWithMapping(clientWithoutSystemFields, FIELD_MAPPINGS.snakeToCamel);

      res.status(201).json({
        message: 'Client created successfully',
        client: transformedClient
      });
    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({
        error: 'Failed to create client',
        message: 'An error occurred while creating the client'
      });
    }
  }

  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler); 
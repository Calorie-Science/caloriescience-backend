const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Import Supabase client
const { supabase } = require('./lib/supabase.js');

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'CalorieScience Full API is running locally!',
    version: '1.0.0',
    status: 'OK'
  });
});

// Test Supabase connection
app.get('/api/test', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('count');
    if (error) throw error;
    res.json({ 
      message: 'Database connection successful',
      supabase: 'connected' 
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Database connection failed',
      message: error.message 
    });
  }
});

// Mock user for testing with proper UUID format
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  role: 'nutritionist'
};

// Simple auth middleware for testing
const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  // For testing, try to get or create the test user
  try {
    let { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, role')
      .eq('id', mockUser.id)
      .single();
    
    if (error || !user) {
      // Try to create the test user if it doesn't exist
      console.log('Creating test user...');
      const testUserData = {
        id: mockUser.id,
        email: mockUser.email,
        password_hash: '$2b$10$test.hash.for.development.only',
        full_name: 'Dr. Test Nutritionist',
        first_name: 'Dr. Test',
        last_name: 'Nutritionist',
        phone: '+1234567890',
        role: 'nutritionist',
        qualification: 'MSc Clinical Nutrition',
        experience_years: 5,
        specialization: ['weight_loss', 'diabetes'],
        is_email_verified: true
      };
      
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert(testUserData)
        .select('id, email, full_name, role')
        .single();
      
      if (createError) {
        console.error('Error creating test user:', createError);
        // For now, just use the mock user data
        req.user = mockUser;
      } else {
        req.user = newUser;
        console.log('Test user created successfully');
      }
    } else {
      req.user = user;
    }
  } catch (error) {
    console.error('Auth error:', error);
    // For now, just use the mock user data
    req.user = mockUser;
  }
  
  next();
};

// Import the full API handlers
const { FlexibleMicronutrientService } = require('./lib/micronutrients-flexible.ts');
const { calculateEER, calculateMacros } = require('./lib/calculations.ts');
const { getEERGuidelineFromLocation } = require('./lib/locationMapping.ts');
const { transformWithMapping, FIELD_MAPPINGS } = require('./lib/caseTransform.ts');
const { calculateHealthMetrics } = require('./lib/healthMetrics.ts');

// Full clients endpoint with EER, macros, and micronutrients
app.post('/api/clients', requireAuth, async (req, res) => {
  try {
    console.log('Creating new client with data:', req.body);
    
    // Extract data
    const { eerCalories, proteinGrams, carbsGrams, fatGrams, fiberGrams, status, ...extractedClientData } = req.body;
    const macrosData = req.body.macrosData;
    const micronutrientsData = req.body.micronutrientsData;
    
    // Remove macrosData from client data if present
    delete extractedClientData.macrosData;
    delete extractedClientData.micronutrientsData;
    
    // Basic validation
    if (!req.body.fullName && !req.body.firstName) {
      return res.status(400).json({ error: 'Full name or first name is required' });
    }
    
    // Transform camelCase to snake_case
    const transformedData = transformWithMapping(extractedClientData, FIELD_MAPPINGS.camelToSnake);
    const clientData = transformedData;
    
    // Ensure full_name is set
    if (!clientData.full_name && (clientData.first_name || clientData.last_name)) {
      clientData.full_name = `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim();
    }
    
    if (!clientData.full_name) {
      clientData.full_name = clientData.email || 'Unknown Client';
    }
    
    // Add nutritionist_id
    clientData.nutritionist_id = req.user.id;
    
    // Insert client
    const { data: client, error } = await supabase
      .from('clients')
      .insert(clientData)
      .select()
      .single();

    if (error) throw error;

    console.log('✅ Client created successfully:', client.id);

    // Auto-calculate nutrition requirements if we have the necessary data
    let nutritionRequirements = null;
    let micronutrientRequirements = null;

    const hasRequiredDataForCalculations = 
      clientData.height_cm && 
      clientData.weight_kg && 
      clientData.date_of_birth &&
      clientData.gender &&
      clientData.activity_level &&
      clientData.location;

    if (hasRequiredDataForCalculations && !eerCalories) {
      try {
        // Calculate age from date of birth with decimal precision
        const birthDate = new Date(clientData.date_of_birth);
        const today = new Date();
        const ageInMilliseconds = today.getTime() - birthDate.getTime();
        const ageInDays = ageInMilliseconds / (1000 * 60 * 60 * 24);
        const age = ageInDays / 365.25;
        
        console.log(`📅 Age calculation: Birth date: ${birthDate.toISOString()}, Today: ${today.toISOString()}, Age: ${age} years (${ageInDays} days)`);

        // Ensure pregnancy and lactation status have default values
        const pregnancyStatus = clientData.pregnancy_status || 'not_pregnant';
        const lactationStatus = clientData.lactation_status || 'not_lactating';
        
        console.log(`🔍 Pregnancy/Lactation status: pregnancy=${pregnancyStatus}, lactation=${lactationStatus}`);

        // Determine EER guideline from location
        const eerGuideline = getEERGuidelineFromLocation(clientData.location);
        console.log(`🌍 EER Guideline: ${eerGuideline}`);

        // Calculate EER
        const eerData = {
          country: eerGuideline,
          age: age,
          sex: clientData.gender,
          weight_kg: clientData.weight_kg,
          height_cm: clientData.height_cm,
          activity_level: clientData.activity_level,
          pregnancy_status: pregnancyStatus,
          lactation_status: lactationStatus
        };
        
        console.log('🧮 EER calculation input:', eerData);
        
        const eerResult = calculateEER(eerData);
        console.log('✅ EER calculation result:', eerResult);

        // Calculate macros
        const adjustmentFactors = {
          pregnancy: pregnancyStatus !== 'not_pregnant',
          lactation: lactationStatus !== 'not_lactating',
          activityLevel: clientData.activity_level,
          healthConditions: clientData.medical_conditions || []
        };
        
        console.log('🍽️ Macro calculation input:', adjustmentFactors);
        
        const macrosResult = calculateMacros(eerResult.eer, adjustmentFactors);
        console.log('✅ Macro calculation result:', macrosResult);

        // Calculate micronutrients
        const flexibleMicroService = new FlexibleMicronutrientService(supabase);
        const country = eerGuideline === 'India' ? 'India' : 
                       eerGuideline === 'UK' ? 'UK' : 
                       eerGuideline === 'US' ? 'US' : 
                       eerGuideline === 'EU' ? 'EU' : 'WHO';
        
        console.log('🔬 Micronutrient calculation input:', { country, gender: clientData.gender, age, pregnancy: pregnancyStatus !== 'not_pregnant', lactation: lactationStatus !== 'not_lactating' });
        
        const micronutrientsResult = await flexibleMicroService.calculateClientRequirements(
          country,
          clientData.gender,
          age,
          pregnancyStatus !== 'not_pregnant',
          lactationStatus !== 'not_lactating'
        );
        console.log('✅ Micronutrient calculation result:', micronutrientsResult);

        // Insert nutrition requirements
        const nutritionData = {
          client_id: client.id,
          eer_calories: eerResult.eer,
          protein_grams: macrosResult.protein,
          carbs_grams: macrosResult.carbs,
          fat_grams: macrosResult.fat,
          fiber_grams: macrosResult.fiber,
          protein_percentage: macrosResult.proteinPercentage,
          carbs_percentage: macrosResult.carbsPercentage,
          fat_percentage: macrosResult.fatPercentage,
          bmi: eerResult.bmi,
          bmr: eerResult.bmr,
          bmi_category: eerResult.bmiCategory,
          calculation_method: 'ai_generated',
          is_ai_generated: true,
          is_active: true
        };

        const { data: nutrition, error: nutritionError } = await supabase
          .from('client_nutrition_requirements')
          .insert(nutritionData)
          .select()
          .single();

        if (nutritionError) {
          console.error('❌ Error creating nutrition requirements:', nutritionError);
        } else {
          console.log('✅ Nutrition requirements created:', nutrition.id);
          nutritionRequirements = nutrition;
        }

        // Insert micronutrients if available
        if (micronutrientsResult && micronutrientsResult.micronutrients) {
          const micronutrientsData = {
            client_id: client.id,
            micronutrients: micronutrientsResult.micronutrients,
            guideline_used: micronutrientsResult.guidelineUsed || country,
            source: micronutrientsResult.source || 'database',
            notes: `Auto-calculated based on ${country} guidelines for ${clientData.gender}, age ${age.toFixed(1)}`,
            calculation_method: 'ai_generated',
            is_ai_generated: true,
            is_active: true
          };

          const { data: micros, error: microsError } = await supabase
            .from('client_micronutrients')
            .insert(micronutrientsData)
            .select()
            .single();

          if (microsError) {
            console.error('❌ Error creating micronutrients:', microsError);
          } else {
            console.log('✅ Micronutrients created:', micros.id);
            micronutrientRequirements = micros;
          }
        }

      } catch (calcError) {
        console.error('❌ Error in nutrition calculations:', calcError);
        // Don't fail the entire client creation, just log the error
      }
    }

    res.status(201).json({
      message: 'Client created successfully',
      client,
      nutritionRequirements,
      micronutrientRequirements
    });

  } catch (error) {
    console.error('❌ Create client error:', error);
    res.status(500).json({
      error: 'Failed to create client',
      message: error.message
    });
  }
});

// Get clients endpoint
app.get('/api/clients', requireAuth, async (req, res) => {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .eq('nutritionist_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      clients: clients || [],
      message: `Found ${clients?.length || 0} clients`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CalorieScience Full API running on http://localhost:${PORT}`);
  console.log('🔧 Environment: development');
  console.log('📊 Full API endpoints:');
  console.log(`   GET  http://localhost:${PORT}/`);
  console.log(`   GET  http://localhost:${PORT}/api/test`);
  console.log(`   GET  http://localhost:${PORT}/api/clients`);
  console.log(`   POST http://localhost:${PORT}/api/clients (with EER, macros, micronutrients)`);
});

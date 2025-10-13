import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth';
import { MultiProviderRecipeSearchService } from '../../lib/multiProviderRecipeSearchService';
import { MealPlanDraftService } from '../../lib/mealPlanDraftService';
import { RecipeCacheService } from '../../lib/recipeCacheService';
import Joi from 'joi';

const multiProviderService = new MultiProviderRecipeSearchService();
const draftService = new MealPlanDraftService();
const cacheService = new RecipeCacheService();

// Utility function to normalize cooking instructions (handles double-encoded JSON)
function normalizeCookingInstructions(instructions: any): any[] {
  if (!instructions || !Array.isArray(instructions)) return [];
  
  return instructions.map((instruction: any, index: number) => {
    // If it's already an object with step, check if step is double-encoded JSON
    if (typeof instruction === 'object' && instruction.step) {
      let stepText = instruction.step;
      
      // Check if step is a stringified JSON object (double-encoded)
      if (typeof stepText === 'string' && stepText.startsWith('{')) {
        try {
          const parsed = JSON.parse(stepText);
          // If it parsed successfully and has a step property, use that
          if (parsed && typeof parsed === 'object' && parsed.step) {
            stepText = parsed.step;
          }
        } catch (e) {
          // If parsing fails, keep the original string
        }
      }
      
      return {
        number: instruction.number || index + 1,
        step: stepText
      };
    }
    // If it's a string, convert to object format
    if (typeof instruction === 'string') {
      return {
        number: index + 1,
        step: instruction
      };
    }
    return instruction;
  });
}

// Utility function to parse YYYY-MM-DD format
function parseStartDate(dateString: string): Date {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }
  return date;
}

// Validation schema for meal plan generation
const mealPlanGenerationSchema = Joi.object({
  clientId: Joi.string().uuid().required()
    .messages({
      'string.guid': 'Client ID must be a valid UUID',
      'any.required': 'Client ID is required'
    }),
  days: Joi.number().integer().min(1).max(30).optional().default(7)
    .messages({
      'number.base': 'Days must be a number',
      'number.integer': 'Days must be an integer',
      'number.min': 'Days must be at least 1',
      'number.max': 'Days cannot exceed 30'
    }),
  mealProgramId: Joi.string().uuid().optional()
    .messages({
      'string.guid': 'Meal program ID must be a valid UUID'
    }),
  startDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional()
    .messages({
      'string.pattern.base': 'Start date must be in YYYY-MM-DD format (e.g., 2025-09-30)'
    }),
  overrideClientGoals: Joi.object({
    eerGoalCalories: Joi.number().min(500).max(5000).required(),
    proteinGoalMin: Joi.number().min(0).max(500).required(),
    proteinGoalMax: Joi.number().min(0).max(500).required(),
    carbsGoalMin: Joi.number().min(0).max(1000).required(),
    carbsGoalMax: Joi.number().min(0).max(1000).required(),
    fatGoalMin: Joi.number().min(0).max(300).required(),
    fatGoalMax: Joi.number().min(0).max(300).required(),
    allergies: Joi.array().items(Joi.string()).required(),
    cuisineTypes: Joi.array().items(Joi.string()).required(),
    preferences: Joi.array().items(Joi.string()).required()
  }).optional(),
  overrideMealProgram: Joi.object({
    meals: Joi.array().items(
      Joi.object({
        mealOrder: Joi.number().integer().min(1).required(),
        mealName: Joi.string().required(),
        mealTime: Joi.string().pattern(/^\d{2}:\d{2}$/).required(),
        targetCalories: Joi.number().min(0).max(5000).required(),
        mealType: Joi.string().required()
      })
    ).required()
  }).optional()
});

interface MealPlanRequest {
  clientId: string;
  days: number;
  startDate?: string; // YYYY-MM-DD format (e.g., "2025-09-30")
  overrideClientGoals?: {
    eerGoalCalories: number;
    proteinGoalMin: number;
    proteinGoalMax: number;
    carbsGoalMin: number;
    carbsGoalMax: number;
    fatGoalMin: number;
    fatGoalMax: number;
    allergies: string[];
    cuisineTypes: string[];
    preferences: string[];
  };
  overrideMealProgram?: {
    meals: Array<{
      mealOrder: number;
      mealName: string;
      mealTime: string; // HH:MM format (e.g., "06:00")
      targetCalories: number;
      mealType: string;
    }>;
  };
}

interface ClientGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

interface MealProgram {
  id: string;
  meals: {
    [mealType: string]: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      name: string;
      mealTime: string;
      recipeSearchType?: string; // The actual meal type to use for recipe searching
    }
  };
}

interface DayMealPlan {
  day: number;
  date: string;
  meals: {
    [mealType: string]: RecipeSuggestion[];
  };
  searchParams: {
    [mealType: string]: { edamam: any, spoonacular: any };
  };
}

interface RecipeSuggestion {
  id: string;
  title: string;
  image: string;
  sourceUrl: string;
  source: 'edamam' | 'spoonacular';
  servings: number;
  readyInMinutes?: number;
  fromCache: boolean;
  cacheId?: string;
  // Nutrition data (per serving)
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  // Detailed information from cache (optional)
  ingredients?: any[];
  instructions?: any[];
  nutrition?: any;
  healthLabels?: string[];
  dietLabels?: string[];
  cuisineTypes?: string[];
  dishTypes?: string[];
  mealTypes?: string[];
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (user.role !== 'nutritionist') {
    return res.status(403).json({ error: 'Access denied. Only nutritionists can generate meal plans.' });
  }

  if (req.method === 'POST') {
    try {
      // Validate request body
      const { error: validationError, value: validatedData } = mealPlanGenerationSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
      });

      if (validationError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Invalid request data',
          details: validationError.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }

      const { 
        clientId, 
        days = 7, 
        startDate, 
        overrideClientGoals,
        overrideMealProgram
      } = validatedData;

      // Parse and validate start date
      let startDateObj: Date;
      if (startDate) {
        try {
          startDateObj = parseStartDate(startDate);
        } catch (error) {
          return res.status(400).json({
            error: 'Invalid start date format',
            message: error instanceof Error ? error.message : 'Expected YYYY-MM-DD format (e.g., 2025-09-30)'
          });
        }
      } else {
        startDateObj = new Date(); // Default to today
      }

      console.log('🍽️ Generating meal plan:', {
        user: user.id,
        clientId,
        days,
        startDate
      });

      // Step 1: Get client data and goals
      const { client, clientGoals, mealProgram, dietaryPreferences } = await getClientData(
        clientId, 
        user.id, 
        overrideClientGoals,
        overrideMealProgram
      );
      
      console.log('🔍 Client data fetched:', {
        clientId,
        hasMealProgram: !!mealProgram,
        mealProgram: mealProgram ? {
          id: mealProgram.id,
          meals: mealProgram.meals
        } : null
      });

      if (!client) {
        return res.status(404).json({
          error: 'Client not found',
          message: 'The specified client does not exist or you do not have access to it'
        });
      }

      // Step 2: Fetch all meal suggestions upfront (one API call per meal type)
      console.log('🔄 Fetching meal suggestions for all meal types...');
      const cachedMealSuggestions = await fetchAllMealSuggestions(clientGoals, mealProgram, dietaryPreferences, days);
      console.log('🔍 Fetched meal suggestions:', Object.keys(cachedMealSuggestions));
      
      // Step 3: Generate meal plan for each day using cached suggestions
      const mealPlan: DayMealPlan[] = [];
      
      for (let day = 1; day <= days; day++) {
        const dayDate = new Date(startDateObj);
        dayDate.setDate(startDateObj.getDate() + day - 1);
        
        const dayMealPlan = await generateDayMealPlan(
          day,
          dayDate.toISOString().split('T')[0],
          clientGoals,
          mealProgram,
          dietaryPreferences,
          cachedMealSuggestions
        );
        
        mealPlan.push(dayMealPlan);
      }

      // Step 4: Create draft to preserve suggestions
      const searchParams = {
        clientGoals,
        dietaryPreferences,
        overrideClientGoals: overrideClientGoals || null,
        overrideMealProgram: overrideMealProgram || null,
        mealProgram: mealProgram ? {
          id: mealProgram.id,
          meals: mealProgram.meals
        } : null,
        startDate: startDateObj.toISOString().split('T')[0],
        days
      };

      // Enrich meal plan suggestions with cached recipe data
      const enrichedMealPlan = await enrichMealPlanWithCache(mealPlan);

      const draft = await draftService.createDraft(
        clientId,
        user.id,
        searchParams,
        enrichedMealPlan
      );

      return res.status(200).json({
        success: true,
        data: {
          draftId: draft.id,
          clientId,
          nutritionistId: user.id,
          days: mealPlan.length,
          startDate: startDateObj.toISOString().split('T')[0],
          mealProgram: mealProgram?.id || null,
          generatedAt: new Date().toISOString(),
          // Input filters for debugging
          inputFilters: {
            clientGoals,
            dietaryPreferences,
            overrideClientGoals: overrideClientGoals || null,
            overrideMealProgram: overrideMealProgram || null,
            mealProgram: mealProgram ? {
              id: mealProgram.id,
              meals: mealProgram.meals
            } : null
          },
          mealPlan
        },
        message: `Generated ${days}-day meal plan suggestions successfully. Draft created for customization.`
      });

    } catch (error) {
      console.error('❌ Error generating meal plan:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to generate meal plan'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function getClientData(
  clientId: string, 
  nutritionistId: string, 
  overrideClientGoals?: {
    eerGoalCalories: number;
    proteinGoalMin: number;
    proteinGoalMax: number;
    carbsGoalMin: number;
    carbsGoalMax: number;
    fatGoalMin: number;
    fatGoalMax: number;
    allergies: string[];
    cuisineTypes: string[];
    preferences: string[];
  },
  overrideMealProgram?: {
    meals: Array<{
      mealOrder: number;
      mealName: string;
      mealTime: string;
      targetCalories: number;
      mealType: string;
    }>;
  }
) {
  // Get client basic info
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('nutritionist_id', nutritionistId)
    .single();

  if (clientError) throw clientError;

  // Get client nutrition requirements
  const { data: nutritionReq, error: nutritionError } = await supabase
    .from('client_nutrition_requirements')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (nutritionError) {
    console.log('⚠️ Warning: Error fetching nutritional requirements:', nutritionError.message);
    console.log('ℹ️ Using default nutritional values as fallback');
  }

  // Get meal program - use override if provided, otherwise get active program for client
  let mealProgram: MealProgram | null = null;
  
  // Apply meal program override if provided
  if (overrideMealProgram) {
    // Convert array format to object format, using mealName as key but preserving mealType for recipe search
    const meals: { [mealType: string]: { calories: number; protein: number; carbs: number; fat: number; fiber: number; name: string; mealTime: string; recipeSearchType: string } } = {};
    
    overrideMealProgram.meals.forEach(meal => {
      // Use mealName as key to ensure unique entries
      const mealKey = meal.mealName.toLowerCase();
      meals[mealKey] = {
        calories: meal.targetCalories,
        protein: 0, // Will be calculated based on calorie ratio
        carbs: 0,   // Will be calculated based on calorie ratio
        fat: 0,     // Will be calculated based on calorie ratio
        fiber: 0,   // Will be calculated based on calorie ratio
        name: meal.mealName,
        mealTime: meal.mealTime + ':00', // Convert HH:MM to HH:MM:SS
        recipeSearchType: meal.mealType // Store the meal type for recipe searching
      };
    });
    
    mealProgram = {
      id: 'override',
      meals: meals
    };
  } else {
    // Get active meal program for client
    const { data: program, error: programError } = await supabase
      .from('meal_programs')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!programError && program) {
      // Get meal program meals
      const { data: meals, error: mealsError } = await supabase
        .from('meal_program_meals')
        .select('meal_type, meal_name, target_calories, meal_time')
        .eq('meal_program_id', program.id)
        .order('meal_order');

      if (!mealsError && meals) {
        // Build flexible meal program structure
        // Use meal_name as key but preserve meal_type for recipe searching
        const mealProgramMeals: { [mealType: string]: { calories: number; protein: number; carbs: number; fat: number; fiber: number; name: string; mealTime: string; recipeSearchType: string } } = {};
        
        meals.forEach(meal => {
          const mealKey = (meal.meal_name || meal.meal_type).toLowerCase();
          mealProgramMeals[mealKey] = {
            calories: meal.target_calories || 0,
            protein: 0, // Will be calculated based on calorie ratio
            carbs: 0,   // Will be calculated based on calorie ratio
            fat: 0,     // Will be calculated based on calorie ratio
            fiber: 0,   // Will be calculated based on calorie ratio
            name: meal.meal_name || meal.meal_type,
            mealTime: meal.meal_time || '00:00:00',
            recipeSearchType: meal.meal_type // Store the meal type for recipe searching
          };
        });

        mealProgram = {
          id: program.id,
          meals: mealProgramMeals
        };
      }
    }
  }

  // Get dietary preferences, allergens, and cuisine types (optional - proceed without if missing)
  const { data: clientGoal, error: goalError } = await supabase
    .from('client_goals')
    .select('allergies, preferences, cuisine_types')
    .eq('client_id', clientId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Log if client goals are missing but continue processing
  if (goalError && goalError.code !== 'PGRST116') {
    console.log('⚠️ Warning: Error fetching client goals:', goalError.message);
  } else if (!clientGoal) {
    console.log('ℹ️ No client goals found - proceeding without dietary preferences');
  }

  // Apply dietary overrides if provided, but proceed without them if missing
  const dietaryPreferences = {
    allergies: overrideClientGoals?.allergies || clientGoal?.allergies || [],
    dietaryPreferences: overrideClientGoals?.preferences || clientGoal?.preferences || [],
    cuisineTypes: overrideClientGoals?.cuisineTypes || clientGoal?.cuisine_types || []
  };

  // Apply goal overrides if provided, fall back to nutritional guidelines if missing
  const clientGoals: ClientGoals = {
    calories: overrideClientGoals?.eerGoalCalories || nutritionReq?.eer_calories || 2000,
    protein: overrideClientGoals?.proteinGoalMin || nutritionReq?.protein_grams || 150,
    carbs: overrideClientGoals?.carbsGoalMin || nutritionReq?.carbs_grams || 250,
    fat: overrideClientGoals?.fatGoalMin || nutritionReq?.fat_grams || 65,
    fiber: nutritionReq?.fiber_grams || 25
  };

  console.log('🔍 Dietary preferences (proceeding without missing ones):', {
    allergies: dietaryPreferences.allergies.length > 0 ? dietaryPreferences.allergies : 'none',
    dietaryPreferences: dietaryPreferences.dietaryPreferences.length > 0 ? dietaryPreferences.dietaryPreferences : 'none',
    cuisineTypes: dietaryPreferences.cuisineTypes.length > 0 ? dietaryPreferences.cuisineTypes : 'none'
  });

  console.log('🔍 Client goals (using nutritional guidelines as fallback):', {
    calories: clientGoals.calories,
    protein: clientGoals.protein,
    carbs: clientGoals.carbs,
    fat: clientGoals.fat,
    fiber: clientGoals.fiber,
    source: overrideClientGoals ? 'override' : (nutritionReq ? 'nutritional_guidelines' : 'default_values')
  });

  // Calculate macro distribution for meal program based on calorie ratios
  if (mealProgram && clientGoals) {
    const totalCalories = Object.values(mealProgram.meals).reduce((sum, meal) => sum + meal.calories, 0);
    
    if (totalCalories > 0) {
      Object.keys(mealProgram.meals).forEach(mealType => {
        const meal = mealProgram.meals[mealType];
        const calorieRatio = meal.calories / totalCalories;
        
        meal.protein = Math.round(clientGoals.protein * calorieRatio);
        meal.carbs = Math.round(clientGoals.carbs * calorieRatio);
        meal.fat = Math.round(clientGoals.fat * calorieRatio);
        meal.fiber = Math.round((clientGoals.fiber || 0) * calorieRatio);
      });
    }
  }

  return { client, clientGoals, mealProgram, dietaryPreferences };
}

async function fetchAllMealSuggestions(
  clientGoals: ClientGoals,
  mealProgram: MealProgram | null,
  dietaryPreferences: any,
  days: number
): Promise<{ [mealType: string]: { edamam: RecipeSuggestion[], spoonacular: RecipeSuggestion[] } }> {
  
  // Calculate meal targets - use flexible meal program structure
  const mealTargets = mealProgram ? mealProgram.meals : {
    breakfast: {
      calories: Math.round(clientGoals.calories * 0.25),
      protein: Math.round(clientGoals.protein * 0.25),
      carbs: Math.round(clientGoals.carbs * 0.25),
      fat: Math.round(clientGoals.fat * 0.25),
      fiber: Math.round((clientGoals.fiber || 0) * 0.25),
      name: 'Breakfast',
      mealTime: '08:00:00'
    },
    lunch: {
      calories: Math.round(clientGoals.calories * 0.35),
      protein: Math.round(clientGoals.protein * 0.35),
      carbs: Math.round(clientGoals.carbs * 0.35),
      fat: Math.round(clientGoals.fat * 0.35),
      fiber: Math.round((clientGoals.fiber || 0) * 0.35),
      name: 'Lunch',
      mealTime: '13:00:00'
    },
    dinner: {
      calories: Math.round(clientGoals.calories * 0.30),
      protein: Math.round(clientGoals.protein * 0.30),
      carbs: Math.round(clientGoals.carbs * 0.30),
      fat: Math.round(clientGoals.fat * 0.30),
      fiber: Math.round((clientGoals.fiber || 0) * 0.30),
      name: 'Dinner',
      mealTime: '19:00:00'
    },
    snacks: {
      calories: Math.round(clientGoals.calories * 0.10),
      protein: Math.round(clientGoals.protein * 0.10),
      carbs: Math.round(clientGoals.carbs * 0.10),
      fat: Math.round(clientGoals.fat * 0.10),
      fiber: Math.round((clientGoals.fiber || 0) * 0.10),
      name: 'Snacks',
      mealTime: '15:00:00'
    }
  };

  const cachedSuggestions: { [mealType: string]: { edamam: RecipeSuggestion[], spoonacular: RecipeSuggestion[] } } = {};

  // Determine which meal types to fetch based on meal program
  // Use meal program meals if available, otherwise use 4-meal fallback
  const mealTypesToFetch = mealProgram ? Object.keys(mealProgram.meals) : ['breakfast', 'lunch', 'dinner', 'snacks'];
  
  // Build a mapping of meal keys to recipe search types
  // This allows us to use the proper mealType for recipe searching while keeping the meal name as key
  const mealKeyToSearchType: { [key: string]: string } = {};
  if (mealProgram) {
    Object.keys(mealProgram.meals).forEach(mealKey => {
      const meal = mealProgram.meals[mealKey];
      mealKeyToSearchType[mealKey] = meal.recipeSearchType || mealKey;
    });
  } else {
    mealTypesToFetch.forEach(mealType => {
      mealKeyToSearchType[mealType] = mealType;
    });
  }
  
  console.log(`🔍 Meal program analysis:`, {
    hasMealProgram: !!mealProgram,
    mealTargets: mealTargets,
    mealTypesToFetch: mealTypesToFetch,
    mealKeyToSearchType: mealKeyToSearchType
  });
  
  console.log(`🔍 About to fetch recipes for meal types:`, mealTypesToFetch);

  console.log(`🔄 Fetching suggestions for meal types: ${mealTypesToFetch.join(', ')}`);
  
  // Calculate how many recipes we need per meal type
  // Fetch 18 recipes per provider (36 total per meal) to enable pagination
  const recipesPerMealType = Math.max(18, days * 3); // At least 18, or 3 per day
  console.log(`🔍 Fetching ${recipesPerMealType} recipes per meal type for ${days} day(s)`);
  
  for (const mealKey of mealTypesToFetch) {
    const recipeSearchType = mealKeyToSearchType[mealKey];
    console.log(`🔄 Fetching ${mealKey} suggestions (using ${recipeSearchType} for recipe search)...`);
    
    const edamamResult = await getRecipesFromProvider('edamam', recipeSearchType, mealTargets[mealKey as keyof typeof mealTargets], dietaryPreferences, recipesPerMealType);
    const spoonacularResult = await getRecipesFromProvider('spoonacular', recipeSearchType, mealTargets[mealKey as keyof typeof mealTargets], dietaryPreferences, recipesPerMealType);
    
    cachedSuggestions[mealKey] = {
      edamam: edamamResult.recipes,
      spoonacular: spoonacularResult.recipes
    };
    
    console.log(`✅ ${mealKey} (${recipeSearchType}): ${edamamResult.recipes.length} Edamam + ${spoonacularResult.recipes.length} Spoonacular`);
  }

  return cachedSuggestions;
}

async function generateDayMealPlan(
  day: number,
  date: string,
  clientGoals: ClientGoals,
  mealProgram: MealProgram | null,
  dietaryPreferences: any,
  cachedMealSuggestions: { [mealType: string]: { edamam: RecipeSuggestion[], spoonacular: RecipeSuggestion[] } }
): Promise<DayMealPlan> {
  
  // Calculate meal targets (use meal program if available, otherwise use 4-meal fallback based on nutritional guidelines)
  const mealTargets = mealProgram ? mealProgram.meals : {
    breakfast: {
      calories: Math.round(clientGoals.calories * 0.25),
      protein: Math.round(clientGoals.protein * 0.25),
      carbs: Math.round(clientGoals.carbs * 0.25),
      fat: Math.round(clientGoals.fat * 0.25),
      fiber: Math.round((clientGoals.fiber || 0) * 0.25),
      name: 'Breakfast',
      mealTime: '08:00:00'
    },
    lunch: {
      calories: Math.round(clientGoals.calories * 0.35),
      protein: Math.round(clientGoals.protein * 0.35),
      carbs: Math.round(clientGoals.carbs * 0.35),
      fat: Math.round(clientGoals.fat * 0.35),
      fiber: Math.round((clientGoals.fiber || 0) * 0.35),
      name: 'Lunch',
      mealTime: '13:00:00'
    },
    dinner: {
      calories: Math.round(clientGoals.calories * 0.30),
      protein: Math.round(clientGoals.protein * 0.30),
      carbs: Math.round(clientGoals.carbs * 0.30),
      fat: Math.round(clientGoals.fat * 0.30),
      fiber: Math.round((clientGoals.fiber || 0) * 0.30),
      name: 'Dinner',
      mealTime: '19:00:00'
    },
    snacks: {
      calories: Math.round(clientGoals.calories * 0.10),
      protein: Math.round(clientGoals.protein * 0.10),
      carbs: Math.round(clientGoals.carbs * 0.10),
      fat: Math.round(clientGoals.fat * 0.10),
      fiber: Math.round((clientGoals.fiber || 0) * 0.10),
      name: 'Snacks',
      mealTime: '15:00:00'
    }
  };

  console.log('🔍 Meal targets (using meal program or 4-meal fallback):', {
    hasMealProgram: !!mealProgram,
    mealTargets: Object.keys(mealTargets).map(mealType => ({
      mealType,
      calories: mealTargets[mealType].calories,
      name: mealTargets[mealType].name
    }))
  });

  // Generate meals only for meal types that were fetched
  const meals: any = {};
  const searchParams: any = {};
  
  // Get the meal types that were actually fetched
  const availableMealTypes = Object.keys(cachedMealSuggestions);
  
  console.log(`🔍 Generating day meal plan - Available meal types:`, availableMealTypes);
  console.log(`🔍 Cached suggestions keys:`, Object.keys(cachedMealSuggestions));
  
  for (const mealType of availableMealTypes) {
    const mealData = generateMealSuggestionsFromCache(mealType, cachedMealSuggestions);
    meals[mealType] = {
      recipes: mealData.displayedRecipes,
      allRecipes: mealData.allRecipes,
      displayOffset: mealData.displayOffset
    };
    searchParams[mealType] = cachedMealSuggestions[mealType] ? { edamam: {}, spoonacular: {} } : {};
    console.log(`🔍 Generated ${mealType} with ${mealData.displayedRecipes.length} displayed, ${mealData.allRecipes.edamam.length + mealData.allRecipes.spoonacular.length} total recipes`);
  }

  return {
    day,
    date,
    meals,
    searchParams
  };
}

async function generateMealSuggestions(
  mealType: string,
  targets: { calories: number; protein: number },
  dietaryPreferences: any
): Promise<{ recipes: RecipeSuggestion[], searchParams: { edamam: any, spoonacular: any } }> {
  
  const suggestions: RecipeSuggestion[] = [];
  const searchParams: { edamam: any, spoonacular: any } = { edamam: {}, spoonacular: {} };
  
  try {
    // Get 3 recipes from Edamam
    const edamamResult = await getRecipesFromProvider('edamam', mealType, targets, dietaryPreferences, 3);
    suggestions.push(...edamamResult.recipes);
    searchParams.edamam = edamamResult.searchParams;

    // Get 3 recipes from Spoonacular
    const spoonacularResult = await getRecipesFromProvider('spoonacular', mealType, targets, dietaryPreferences, 3);
    suggestions.push(...spoonacularResult.recipes);
    searchParams.spoonacular = spoonacularResult.searchParams;

    // Shuffle and return 6 suggestions with search params
    return {
      recipes: shuffleArray(suggestions).slice(0, 6),
      searchParams
    };
    
  } catch (error) {
    console.error(`Error generating ${mealType} suggestions:`, error);
    return { recipes: [], searchParams };
  }
}

async function getRecipesFromProvider(
  provider: 'edamam' | 'spoonacular',
  mealType: string,
  targets: { calories: number; protein: number },
  dietaryPreferences: any,
  count: number
): Promise<{ recipes: RecipeSuggestion[], searchParams: any }> {
  
  try {
    // Separate valid diet labels from health labels for Edamam
    const validEdamamDiets = ['balanced', 'high-fiber', 'high-protein', 'low-carb', 'low-fat', 'low-sodium'];
    const validSpoonacularIntolerances = ['dairy', 'egg', 'gluten', 'grain', 'peanut', 'seafood', 'sesame', 'shellfish', 'soy', 'sulfite', 'tree-nut', 'wheat'];
    
    const dietaryPrefs = dietaryPreferences.dietaryPreferences || [];
    const allergies = dietaryPreferences.allergies || [];
    
    // Filter diet preferences to only include valid Edamam diet labels
    const validDiets = dietaryPrefs.filter((pref: string) => 
      validEdamamDiets.includes(pref.toLowerCase())
    );
    
    // Combine allergies with non-diet health preferences (like alcohol-free, kosher, etc.)
    const healthLabels = [
      ...allergies,
      ...dietaryPrefs.filter((pref: string) => 
        !validEdamamDiets.includes(pref.toLowerCase())
      )
    ];
    
    // Filter and transform intolerances for Spoonacular (only valid ones)
    const spoonacularIntolerances = allergies
      .filter((allergy: string) => 
        validSpoonacularIntolerances.includes(allergy.toLowerCase().replace('-free', ''))
      )
      .map((allergy: string) => 
        allergy.toLowerCase().replace('-free', '')
      );
    
    // Build search parameters - use different intolerance lists for each provider
    // Add dishType to filter out random/user-generated recipes
    const dishTypes = getDishTypesForMeal(mealType);
    
    const searchParams = {
      query: getMealTypeKeywords(mealType),
      mealType: [mealType],
      dishType: dishTypes, // Filter to get proper main courses, not random user recipes
      calories: `${Math.round(targets.calories * 0.8)}-${Math.round(targets.calories * 1.2)}`,
      health: provider === 'edamam' ? healthLabels : spoonacularIntolerances,
      diet: validDiets,
      cuisineType: dietaryPreferences.cuisineTypes || [],
      maxResults: count,
      provider: provider
    };

    console.log(`🔍 Searching ${provider} for ${mealType}:`, searchParams);
    console.log(`🔍 Diet filtering - Original dietaryPrefs:`, dietaryPrefs);
    console.log(`🔍 Diet filtering - Valid diets:`, validDiets);
    console.log(`🔍 Diet filtering - Health labels (Edamam):`, healthLabels);
    console.log(`🔍 Diet filtering - Intolerances (Spoonacular):`, spoonacularIntolerances);

    // Search recipes - only get basic data, no detailed API calls
    const results = await multiProviderService.searchRecipes(searchParams);
    
    if (!results.recipes || results.recipes.length === 0) {
      console.warn(`No recipes found for ${provider} ${mealType}`);
      return { recipes: [], searchParams };
    }

    // Filter out low-quality/user-generated recipes based on title patterns
    const filteredRecipes = results.recipes.filter(recipe => {
      const title = recipe.title.toLowerCase();
      // Filter out recipes with common user-generated patterns
      const badPatterns = [
        'my ', 'my wife', 'my husband', 'my mom', 'my dad', 'my grandmother',
        'my recipe', 'my favorite', 'mom\'s', 'dad\'s', 'grandma\'s',
        'leftover', 'leftovers', 'scrap', 'scraps', 'whatever',
        'recipes', // Usually "My X recipes" collections
        'untitled', 'unnamed'
      ];
      return !badPatterns.some(pattern => title.includes(pattern));
    });
    
    console.log(`🔍 Filtered ${results.recipes.length - filteredRecipes.length} low-quality recipes, ${filteredRecipes.length} remaining`);
    
    // Convert search results to RecipeSuggestion format and enrich with cached data
    const recipeSuggestions: RecipeSuggestion[] = await Promise.all(
      filteredRecipes.slice(0, count).map(async (recipe) => {
        // Try to get detailed recipe data from cache
        const cachedRecipe = await cacheService.getRecipeByExternalId(
          provider as 'edamam' | 'spoonacular', 
          recipe.id
        );
        
        if (cachedRecipe) {
          console.log(`✅ Enriching recipe ${recipe.id} with cached data`);
          return {
            id: recipe.id,
            title: recipe.title,
            image: recipe.image,
            sourceUrl: recipe.sourceUrl,
            source: recipe.source,
            servings: recipe.servings || 1,
            readyInMinutes: recipe.readyInMinutes,
            fromCache: true,
            calories: recipe.calories,
            protein: recipe.protein,
            carbs: recipe.carbs,
            fat: recipe.fat,
            fiber: recipe.fiber,
            // Add detailed information from cache
            ingredients: cachedRecipe.ingredients || [],
            instructions: normalizeCookingInstructions(cachedRecipe.cookingInstructions || []),
            nutrition: cachedRecipe.nutritionDetails || {},
            healthLabels: cachedRecipe.healthLabels || [],
            dietLabels: cachedRecipe.dietLabels || [],
            cuisineTypes: cachedRecipe.cuisineTypes || [],
            dishTypes: cachedRecipe.dishTypes || [],
            mealTypes: cachedRecipe.mealTypes || []
          };
        } else {
          // Return basic data if not in cache
          return {
            id: recipe.id,
            title: recipe.title,
            image: recipe.image,
            sourceUrl: recipe.sourceUrl,
            source: recipe.source,
            servings: recipe.servings || 1,
            readyInMinutes: recipe.readyInMinutes,
            fromCache: false,
            calories: recipe.calories,
            protein: recipe.protein,
            carbs: recipe.carbs,
            fat: recipe.fat,
            fiber: recipe.fiber
          };
        }
      })
    );

    return { recipes: recipeSuggestions, searchParams };

  } catch (error) {
    console.error(`Error getting recipes from ${provider}:`, error);
    return { recipes: [], searchParams: {} };
  }
}

function generateMealSuggestionsFromCache(
  mealType: string,
  cachedMealSuggestions: { [mealType: string]: { edamam: RecipeSuggestion[], spoonacular: RecipeSuggestion[] } }
): { displayedRecipes: RecipeSuggestion[], allRecipes: { edamam: RecipeSuggestion[], spoonacular: RecipeSuggestion[] }, displayOffset: { edamam: number, spoonacular: number } } {
  const suggestions = cachedMealSuggestions[mealType];
  if (!suggestions) {
    console.warn(`No cached suggestions found for ${mealType}`);
    return {
      displayedRecipes: [],
      allRecipes: { edamam: [], spoonacular: [] },
      displayOffset: { edamam: 0, spoonacular: 0 }
    };
  }

  // Randomly select 3 from Edamam and 3 from Spoonacular (from the 18 available)
  const edamamSelection = shuffleArray(suggestions.edamam).slice(0, 3);
  const spoonacularSelection = shuffleArray(suggestions.spoonacular).slice(0, 3);
  
  // Combine and shuffle for display
  const combinedSuggestions = shuffleArray([...edamamSelection, ...spoonacularSelection]);
  
  console.log(`🍽️ Generated ${mealType} suggestions: ${edamamSelection.length} Edamam + ${spoonacularSelection.length} Spoonacular = ${combinedSuggestions.length} total`);
  console.log(`💾 Storing ALL recipes: ${suggestions.edamam.length} Edamam + ${suggestions.spoonacular.length} Spoonacular for future shuffling`);
  
  return {
    displayedRecipes: combinedSuggestions,
    allRecipes: {
      edamam: suggestions.edamam,
      spoonacular: suggestions.spoonacular
    },
    displayOffset: {
      edamam: 0,
      spoonacular: 0
    }
  };
}

async function enrichMealPlanWithCache(mealPlan: DayMealPlan[]): Promise<DayMealPlan[]> {
  console.log('🔄 Enriching meal plan with cached recipe data...');
  
  // Helper function to enrich a single recipe with cache data
  const enrichRecipe = async (recipe: RecipeSuggestion): Promise<RecipeSuggestion> => {
    try {
      // Try to get detailed recipe data from cache
      const cachedRecipe = await cacheService.getRecipeByExternalId(
        recipe.source,
        recipe.id
      );
      
      if (cachedRecipe) {
        console.log(`✅ Enriching recipe ${recipe.id} (${recipe.title}) with cached data`);
        return {
          ...recipe,
          fromCache: true,
          cacheId: cachedRecipe.id,
          // Add detailed information from cache
          ingredients: cachedRecipe.ingredients || [],
          instructions: normalizeCookingInstructions(cachedRecipe.cookingInstructions || []),
          nutrition: cachedRecipe.nutritionDetails || {},
          healthLabels: cachedRecipe.healthLabels || [],
          dietLabels: cachedRecipe.dietLabels || [],
          cuisineTypes: cachedRecipe.cuisineTypes || [],
          dishTypes: cachedRecipe.dishTypes || [],
          mealTypes: cachedRecipe.mealTypes || []
        };
      } else {
        console.log(`⚠️ No cached data found for recipe ${recipe.id} (${recipe.title})`);
        return {
          ...recipe,
          fromCache: false
        };
      }
    } catch (error) {
      console.error(`Error enriching recipe ${recipe.id}:`, error);
      return {
        ...recipe,
        fromCache: false
      };
    }
  };
  
  const enrichedMealPlan = await Promise.all(
    mealPlan.map(async (dayPlan) => {
      const enrichedMeals: any = {};
      
      for (const [mealType, mealData] of Object.entries(dayPlan.meals)) {
        // Handle the new structure with recipes, allRecipes, and displayOffset
        const recipes = (mealData as any).recipes || mealData;
        const allRecipes = (mealData as any).allRecipes;
        const displayOffset = (mealData as any).displayOffset;
        
        // Enrich displayed recipes
        const enrichedRecipes = await Promise.all(
          (Array.isArray(recipes) ? recipes : []).map(enrichRecipe)
        );
        
        // Also enrich ALL recipes (for shuffling) if they exist
        let enrichedAllRecipes = allRecipes;
        if (allRecipes) {
          console.log(`🔄 Enriching all recipes for ${mealType} (${allRecipes.edamam.length} Edamam + ${allRecipes.spoonacular.length} Spoonacular)`);
          enrichedAllRecipes = {
            edamam: await Promise.all(allRecipes.edamam.map(enrichRecipe)),
            spoonacular: await Promise.all(allRecipes.spoonacular.map(enrichRecipe))
          };
          console.log(`✅ Enriched all ${mealType} recipes from cache`);
        }
        
        // Preserve the structure with recipes, allRecipes, and displayOffset
        enrichedMeals[mealType] = {
          recipes: enrichedRecipes,
          allRecipes: enrichedAllRecipes,
          displayOffset
        };
      }
      
      return {
        ...dayPlan,
        meals: enrichedMeals
      };
    })
  );
  
  console.log('✅ Meal plan enrichment completed');
  return enrichedMealPlan;
}

function getMealTypeKeywords(mealType: string): string {
  // Use simple meal type names - let calorie and allergen filters do the work
  const keywords: { [key: string]: string } = {
    breakfast: 'breakfast',
    brunch: 'brunch',
    'lunch/dinner': 'meal',
    lunch: 'lunch', 
    dinner: 'dinner',
    snack: 'snack',
    teatime: 'snack'
  };
  return keywords[mealType.toLowerCase()] || mealType;
}

function getDishTypesForMeal(mealType: string): string[] {
  // Map meal types to appropriate dish types to filter out random/user recipes
  // Edamam dishType enum values: Biscuits and cookies, Bread, Cereals, Condiments and sauces, 
  // Desserts, Drinks, Main course, Pancake, Preps, Preserve, Salad, Sandwiches, 
  // Side dish, Soup, Starter, Sweets
  const dishTypeMap: { [key: string]: string[] } = {
    breakfast: ['Cereals', 'Pancake', 'Bread', 'Main course'],
    brunch: ['Cereals', 'Pancake', 'Bread', 'Main course', 'Salad'],
    'lunch/dinner': ['Main course', 'Salad', 'Soup', 'Sandwiches'],
    lunch: ['Main course', 'Salad', 'Soup', 'Sandwiches'],
    dinner: ['Main course', 'Soup', 'Salad'],
    snack: ['Starter', 'Salad', 'Biscuits and cookies', 'Drinks'],
    teatime: ['Biscuits and cookies', 'Bread', 'Sweets', 'Drinks', 'Starter']
  };
  return dishTypeMap[mealType.toLowerCase()] || ['Main course'];
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default requireAuth(handler);

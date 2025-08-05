import OpenAI from 'openai';
import { config } from './config';

export const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

export interface EERCalculationInput {
  age: number;
  gender: 'male' | 'female';
  weight_kg: number;
  height_cm: number;
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  health_goals?: string[];
  medical_conditions?: string[];
}

export interface EERCalculationResult {
  eer_calories: number;
  protein_grams: number;
  carbs_grams: number;
  fat_grams: number;
  fiber_grams: number;
  protein_percentage: number;
  carbs_percentage: number;
  fat_percentage: number;
  vitamin_d_mcg: number;
  vitamin_b12_mcg: number;
  vitamin_c_mg: number;
  iron_mg: number;
  calcium_mg: number;
  magnesium_mg: number;
  zinc_mg: number;
  folate_mcg: number;
  water_ml: number;
}

export async function calculateEER(input: EERCalculationInput): Promise<EERCalculationResult> {
  const prompt = `
You are a certified nutritionist with expertise in calculating Estimated Energy Requirements (EER) and nutritional needs. Calculate the comprehensive nutritional requirements for an individual with the following characteristics:

INDIVIDUAL DATA:
- Age: ${input.age} years
- Gender: ${input.gender}
- Weight: ${input.weight_kg} kg
- Height: ${input.height_cm} cm
- Activity Level: ${input.activity_level}
${input.health_goals?.length ? `- Health Goals: ${input.health_goals.join(', ')}` : ''}
${input.medical_conditions?.length ? `- Medical Conditions: ${input.medical_conditions.join(', ')}` : ''}

CALCULATION REQUIREMENTS:
1. Use Mifflin-St Jeor equation for BMR calculation
2. Apply appropriate activity factors:
   - Sedentary: BMR × 1.2
   - Lightly active: BMR × 1.375
   - Moderately active: BMR × 1.55
   - Very active: BMR × 1.725
   - Extra active: BMR × 1.9

3. Macronutrient Distribution:
   - Protein: 1.0-1.6g per kg body weight (adjust based on activity and goals)
   - Carbohydrates: 45-65% of total calories
   - Fat: 20-35% of total calories
   - Fiber: 25-35g per day

4. Micronutrients based on Indian RDA/International guidelines:
   - Vitamin D, B12, C, Iron, Calcium, Magnesium, Zinc, Folate
   - Adjust for gender, age, and any medical conditions

5. Water intake: 35ml per kg body weight minimum

Return ONLY a valid JSON object with this exact structure (no additional text):
{
  "eer_calories": <integer>,
  "protein_grams": <number with 1 decimal>,
  "carbs_grams": <number with 1 decimal>,
  "fat_grams": <number with 1 decimal>,
  "fiber_grams": <number with 1 decimal>,
  "protein_percentage": <number with 1 decimal>,
  "carbs_percentage": <number with 1 decimal>,
  "fat_percentage": <number with 1 decimal>,
  "vitamin_d_mcg": <number with 1 decimal>,
  "vitamin_b12_mcg": <number with 2 decimals>,
  "vitamin_c_mg": <number with 1 decimal>,
  "iron_mg": <number with 1 decimal>,
  "calcium_mg": <number with 1 decimal>,
  "magnesium_mg": <number with 1 decimal>,
  "zinc_mg": <number with 1 decimal>,
  "folate_mcg": <number with 1 decimal>,
  "water_ml": <integer>
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: "system",
          content: "You are a certified nutritionist and registered dietitian with expertise in calculating personalized nutritional requirements. Always return valid JSON responses only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: config.openai.maxTokens
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse and validate the JSON response
    const result = JSON.parse(content.trim());
    
    // Validate that all required fields are present
    const requiredFields = [
      'eer_calories', 'protein_grams', 'carbs_grams', 'fat_grams', 'fiber_grams',
      'protein_percentage', 'carbs_percentage', 'fat_percentage',
      'vitamin_d_mcg', 'vitamin_b12_mcg', 'vitamin_c_mg', 'iron_mg',
      'calcium_mg', 'magnesium_mg', 'zinc_mg', 'folate_mcg', 'water_ml'
    ];

    for (const field of requiredFields) {
      if (result[field] === undefined || result[field] === null) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    return result as EERCalculationResult;
  } catch (error) {
    console.error('OpenAI EER calculation error:', error);
    throw new Error('Failed to calculate nutritional requirements. Please try again.');
  }
}

export interface BloodReportAnalysis {
  summary: string;
  key_findings: string[];
  recommendations: string[];
  red_flags: string[];
  follow_up_needed: boolean;
}

export async function analyzeBloodReport(reportText: string): Promise<BloodReportAnalysis> {
  const prompt = `
Analyze this blood report and provide a comprehensive nutritional assessment:

BLOOD REPORT DATA:
${reportText}

Please analyze the report and provide:
1. A concise summary of overall health status
2. Key findings that impact nutritional needs
3. Dietary recommendations based on the results
4. Any red flags that need immediate medical attention
5. Whether follow-up testing is recommended

Return ONLY a valid JSON object with this structure:
{
  "summary": "<2-3 sentence overall summary>",
  "key_findings": ["<finding 1>", "<finding 2>", ...],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", ...],
  "red_flags": ["<red flag 1>", "<red flag 2>", ...],
  "follow_up_needed": <boolean>
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: "system",
          content: "You are a clinical nutritionist with expertise in interpreting blood work for nutritional assessment. Focus on nutritional implications, not medical diagnosis."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      max_tokens: config.openai.maxTokens
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content.trim()) as BloodReportAnalysis;
  } catch (error) {
    console.error('OpenAI blood report analysis error:', error);
    throw new Error('Failed to analyze blood report. Please try again.');
  }
} 
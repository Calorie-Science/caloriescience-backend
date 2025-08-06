import OpenAI from 'openai';
import { config } from './config';

export const openai = new OpenAI({
  apiKey: config.openai.apiKey
});

// Original interface for backward compatibility
export interface EERCalculationInput {
  age: number;
  gender: 'male' | 'female';
  weight_kg: number;
  height_cm: number;
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  health_goals?: string[];
  medical_conditions?: string[];
}

// Updated interface for OpenAI Assistant EER calculation
export interface AssistantEERCalculationInput {
  country: string;
  age: number;
  sex: 'male' | 'female';
  weight_kg: number;
  height_cm: number;
  pal?: number; // Physical Activity Level
  activity_level?: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  special_cases?: string;
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

// New function using OpenAI Assistant for EER calculation
export async function calculateEERWithAssistant(input: AssistantEERCalculationInput): Promise<any> {
  // Make Assistant ID configurable via environment variable
  const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || 'asst_KY2OIYshbs9FApI6UmwkRY6j'; // CS Calorie Calculator
  
  // Create the user prompt for EER calculation
  const userPrompt = `
Given user input for EER calculation (fields: country, age, sex, height_cm, weight_kg, and optionally PAL or special cases), generate an output in the following JSON format:
{
  "input": {...},
  "reasoning": {
    "region_rule_selected": [string - which region/country rule set is used and why],
    "bmr_equation_used": [string - which BMR equation is chosen, including citation if available],
    "bmr_calculation_steps": [list of stepwise calculations, e.g. variables substituted and intermediate results],
    "pal_explanation": [string - how PAL value is chosen based on input and available guideline],
    "eer_equation_used": [string - the EER equation selected or constructed, including pregnancy/lactation adjustment if relevant],
    "eer_calculation_steps": [stepwise calculation showing intermediate values],
    "special_notes": [string or null - any caveats about region mapping, assumptions (e.g., default PAL, unknowns), pregnancy, lactation, or child equations],
    "final_eer_kcal": [number - final EER, rounded to the nearest whole number]
  }
}

Always begin your output reasoning with which country/region equation is being selected and why (e.g., UK, Europe (EU), Global/WHO/FAO, etc.), referencing the given rule set. Walk through every math step and state assumptions, especially for PAL, BMR, adjustments (pregnancy/lactation), and classification of adults, children, or special populations.

USER INPUT:
- Country: ${input.country}
- Age: ${input.age} years
- Sex: ${input.sex}
- Weight: ${input.weight_kg} kg
- Height: ${input.height_cm} cm
${input.pal ? `- Physical Activity Level (PAL): ${input.pal}` : ''}
${input.activity_level ? `- Activity Level: ${input.activity_level}` : ''}
${input.special_cases ? `- Special Cases: ${input.special_cases}` : ''}
${input.health_goals?.length ? `- Health Goals: ${input.health_goals.join(', ')}` : ''}
${input.medical_conditions?.length ? `- Medical Conditions: ${input.medical_conditions.join(', ')}` : ''}

Use the provided EER calculation guidelines table to determine the correct regional equations and PAL values. For countries not explicitly listed, use the appropriate regional defaults (Europe (EU) for European countries, Global (WHO/FAO) for others).

Output must be a single JSON object with the exact structure shown above. All calculations must show step-by-step work with explicit substitution and intermediate results.
`;

  try {
    console.log('Starting OpenAI Assistant EER calculation...');
    console.log('Assistant ID:', ASSISTANT_ID);
    
    // First, verify the assistant exists
    try {
      const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
      console.log('Assistant found:', assistant.name);
    } catch (assistantError) {
      console.error('Assistant not found:', assistantError);
      throw new Error(`Assistant with ID ${ASSISTANT_ID} not found. Please check your OPENAI_ASSISTANT_ID environment variable.`);
    }

    // Create a thread
    console.log('Creating thread...');
    const thread = await openai.beta.threads.create();
    console.log('Thread created:', thread.id);

    // Add a message to the thread
    console.log('Adding message to thread...');
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: userPrompt
    });

    // Run the assistant
    console.log('Running assistant...');
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: ASSISTANT_ID
    });
    console.log('Run created:', run.id);

    // Wait for the run to complete with timeout
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds timeout
    
    console.log('Waiting for run to complete...');
    while ((runStatus.status === 'in_progress' || runStatus.status === 'queued') && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
      
      if (attempts % 10 === 0) {
        console.log(`Still waiting... Status: ${runStatus.status}, Attempt: ${attempts}/${maxAttempts}`);
      }
    }

    console.log('Final run status:', runStatus.status);

    if (attempts >= maxAttempts) {
      throw new Error('Assistant run timed out after 60 seconds');
    }

    if (runStatus.status === 'failed') {
      console.error('Run failed:', runStatus.last_error);
      throw new Error(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
    }

    if (runStatus.status !== 'completed') {
      throw new Error(`Assistant run failed with status: ${runStatus.status}`);
    }

    // Get the messages
    console.log('Retrieving messages...');
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(message => message.role === 'assistant');
    
    if (!assistantMessage || !assistantMessage.content || assistantMessage.content.length === 0) {
      throw new Error('No response from assistant');
    }

    // Extract the text content
    const textContent = assistantMessage.content.find(content => content.type === 'text');
    if (!textContent || !textContent.text) {
      throw new Error('No text content in assistant response');
    }

    const responseText = textContent.text.value;
    console.log('Assistant response received, length:', responseText.length);
    
    // Try to extract JSON from the response
    let jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', responseText);
      throw new Error('No JSON found in assistant response');
    }

    console.log('Parsing JSON response...');
    const result = JSON.parse(jsonMatch[0]);
    
    // Return the complete result with the new structure
    console.log('EER calculation completed successfully');
    return result;
  } catch (error) {
    console.error('OpenAI Assistant EER calculation error:', error);
    
    // Log the specific error type for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    throw new Error(`Failed to calculate nutritional requirements using AI assistant: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
const OpenAI = require('openai');
const crypto = require('crypto');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// In-memory job storage (in production, use Redis or database)
const jobs = new Map();

// Generate unique job ID
function generateJobId() {
  return crypto.randomUUID();
}

// Start async EER calculation
async function startEERCalculation(input) {
  const jobId = generateJobId();
  
  // Store job with initial status
  jobs.set(jobId, {
    id: jobId,
    status: 'processing',
    input: input,
    created_at: new Date().toISOString(),
    completed_at: null,
    result: null,
    error: null
  });

  // Start background processing (don't await)
  processEERCalculation(jobId, input).catch(error => {
    console.error('Background EER calculation failed:', error);
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: 'failed',
      error: error.message,
      completed_at: new Date().toISOString()
    });
  });

  return {
    job_id: jobId,
    status: 'processing',
    message: 'EER calculation started. Use the job_id to check status.',
    estimated_completion: '20-30 seconds'
  };
}

// Background processing function
async function processEERCalculation(jobId, input) {
  const systemPrompt = `Given user input for EER calculation (fields: country, age, sex, height_cm, weight_kg, and optionally PAL or special cases), generate an output in the following JSON format:
{
  "input": {...},
  "CalorieCalculation": {
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

If input values are not enough to select PAL or region unambiguously, state the default/reference used (with a justification drawn from the provided table, e.g., "no activity level, so Sedentary adopted as guideline PAL for UK adults is 1.4"). For European countries not explicitly listed, default to "Europe (EU)". For unlisted regions, use "Global (WHO/FAO)" unless otherwise specified.

Special cases: 
- Pregnant or lactating users: show how adjustments are incorporated. 
- Adolescents (9-18 years): use the appropriate children/teen formula. 
- If child/adult age border is ambiguous, explain your choice in "special_notes".

At the end, in the JSON, place "final_eer_kcal" as the very last key in "reasoning". Only after all reasoning/steps is the answer given.

Country/Region Data:
India: Men: (14.5×wt + 645)×PAL, Women: (11.0×wt + 833)×PAL, ICMR-NIN (India-specific equations), PAL: Sedentary: 1.53, Moderate: 1.78, Heavy: 2.1
Global (WHO/FAO): Men: (0.063×wt + 2.896)×239, Women: (0.062×wt + 2.036)×239, PAL: Sedentary: 1.2, Moderate: 1.55, Active: 1.725
[Full country data available as per previous instructions]

REMINDER: Output is strictly the JSON described above, with thorough, step-by-step reasoning and math in the prescribed order. Reasoning always comes first, conclusions always last.`;

  const userPrompt = `Country: ${input.country}
Age: ${input.age} years
Sex: ${input.sex}
Weight: ${input.weight_kg} kg
Height: ${input.height_cm} cm
Activity Level: ${input.activity_level || 'Not specified'}
Health Goals: ${input.health_goals ? input.health_goals.join(', ') : 'None specified'}
Medical Conditions: ${input.medical_conditions && input.medical_conditions.length > 0 ? input.medical_conditions.join(', ') : 'None specified'}`;

  try {
    console.log(`[Job ${jobId}] Starting OpenAI Chat Completions EER calculation...`);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Extract JSON from response
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in assistant response');
    }

    const result = JSON.parse(jsonMatch[0]);
    
    // Extract the CalorieCalculation field
    let finalResult;
    if (result.CalorieCalculation) {
      finalResult = result.CalorieCalculation;
    } else if (result.reasoning) {
      finalResult = result.reasoning;
    } else {
      finalResult = result;
    }

    // Update job status
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: 'completed',
      result: finalResult,
      completed_at: new Date().toISOString()
    });

    console.log(`[Job ${jobId}] EER calculation completed successfully`);

  } catch (error) {
    console.error(`[Job ${jobId}] EER calculation failed:`, error);
    jobs.set(jobId, {
      ...jobs.get(jobId),
      status: 'failed',
      error: error.message,
      completed_at: new Date().toISOString()
    });
  }
}

// Get job status
function getJobStatus(jobId) {
  const job = jobs.get(jobId);
  if (!job) {
    return { error: 'Job not found' };
  }

  if (job.status === 'completed') {
    return {
      job_id: jobId,
      status: 'completed',
      result: job.result,
      created_at: job.created_at,
      completed_at: job.completed_at
    };
  } else if (job.status === 'failed') {
    return {
      job_id: jobId,
      status: 'failed',
      error: job.error,
      created_at: job.created_at,
      completed_at: job.completed_at
    };
  } else {
    return {
      job_id: jobId,
      status: 'processing',
      message: 'EER calculation in progress...',
      created_at: job.created_at,
      estimated_remaining: '10-20 seconds'
    };
  }
}

// Clean up old jobs (call periodically)
function cleanupOldJobs() {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [jobId, job] of jobs.entries()) {
    const jobAge = now - new Date(job.created_at).getTime();
    if (jobAge > oneHour) {
      jobs.delete(jobId);
    }
  }
}

module.exports = { 
  startEERCalculation, 
  getJobStatus, 
  cleanupOldJobs 
}; 
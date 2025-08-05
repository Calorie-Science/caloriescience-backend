const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function calculateEERWithAssistant(input) {
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

# Steps

1. Parse the input fields and standardize units (e.g., convert height in cm to m as needed).
2. Identify the correct regional guideline for EER, using the country field and the provided rule mapping.
3. Specify which BMR and EER equations are relevant for the input (sex, age, region, special status).
4. Substitute all necessary values (showing the formulas with numbers plugged in).
5. Explain how PAL is selected (default, explicit input, or inferred).
6. Calculate BMR, then EER in clear, stepwise order.
7. Include all necessary adjustments for pregnancy, lactation, or childhood/adolescence.
8. Summarize any special assumptions, caveats, or uncertainties in "special_notes".
9. At the end, provide the final EER value, clearly labelled.

# Output Format

Output must be a single JSON object with the structure:
{
  "input": {
    "country": "[input country]",
    "age": [input age],
    "sex": "[male|female]",
    "height_cm": [input height in cm],
    "weight_kg": [input weight in kg]
    [other optional fields as needed]
  },
  "reasoning": {
    "region_rule_selected": "[string]",
    "bmr_equation_used": "[string]",
    "bmr_calculation_steps": [list of stepwise calculations],
    "pal_explanation": "[string]",
    "eer_equation_used": "[string]",
    "eer_calculation_steps": [list of stepwise calculations],
    "special_notes": "[string or null]",
    "final_eer_kcal": [int]
  }
}

All math/calculation arrays must be string lists showing explicit substitution and intermediate (and final) results.

# Examples

Example 1 (abbreviated for illustration; real reasoning should be as detailed as needed):

Input:
{
  "country": "France",
  "age": 28,
  "sex": "male",
  "height_cm": 182.88,
  "weight_kg": 85
}

Output:
{
  "input": {
    "country": "France",
    "age": 28,
    "sex": "male",
    "height_cm": 182.88,
    "weight_kg": 85
  },
  "reasoning": {
    "region_rule_selected": "France not specifically listed, so using 'Europe (EU)' region as per rules.",
    "bmr_equation_used": "Schofield Equation (WHO/FAO): BMR = (a × weight_kg) + (b × height_m) + c, with coefficients for adult male.",
    "bmr_calculation_steps": [
      "Convert height: 182.88 cm = 1.8288 m",
      "Use coefficients for adult male, 18–30 years: a=15.057, b=692.2, c=0 (per Schofield source, as cited in EU entry)",
      "BMR = (15.057 × 85) + (692.2 × 1.8288)",
      "BMR = 1,280 + 1,266 = 2,546 kcal"
    ],
    "pal_explanation": "No PAL specified, so 'Sedentary' PAL of 1.4 is used per EU guidelines for adults.",
    "eer_equation_used": "EER = BMR × PAL (no special pregnancy/lactation/growth adjustment needed for 28-year-old adult male)",
    "eer_calculation_steps": [
      "EER = 2,546 × 1.4",
      "EER = 3,564 kcal"
    ],
    "special_notes": "Height converted to meters as required. France is covered under Europe (EU). Adult male used; no other factors.",
    "final_eer_kcal": 3564
  }
}

(Note: this is a sample; coefficients and numbers to be confirmed per specific region/equation. Actual outputs must be accurate and complete.)

# Notes

- For each calculation, clearly enumerate the steps and formulas, substituting in values and showing resulting numbers.
- If region/country requires additional lookups (e.g., coefficients for Schofield), include the source in string explanation.
- Reasoning must always precede the final EER result.
- If required fields are missing or ambiguous, supply defaults where rules permit, and note this in "special_notes".
- For countries not explicitly listed, use appropriate regional or "Global (WHO/FAO)" rule set. If unsure, explain assumption.
- Input fields not used can be omitted from "input", but "reasoning" must explain if that's due to missing/inapplicable info.
- Persist until all reasoning steps are exhaustively shown before presenting the final answer.

Country/Region Data:
United States: Men: 662 − (9.53×age) + PAL×(15.91×wt + 539.6×ht), Women: 354 − (6.91×age) + PA×(9.36×wt + 726×ht), Children (9–18y): Boys: EER = 88.5 − (61.9 × age) + PAL × ((26.7 × wt) + (903 × ht)) + 25, Girls: EER = 135.3 − (30.8 × age) + PAL × ((10.0 × wt) + (934 × ht)) + 25, Pregnancy Adjustments: +340 kcal (2nd trimester), +452 kcal (3rd trimester), Lactation Adjustments: +500 kcal (0–6 months), +400 kcal (7–12 months), IOM (2005), PAL: Sedentary: 1.0, Low Active: 1.11–1.12, Active: 1.25–1.27, Very Active: 1.45–1.48, BMR: Men: 88.362 + 13.397×wt + 4.799×ht - 5.677×age, Women: 447.593 + 9.247×wt + 3.098×ht - 4.330×age, Harris-Benedict (1919, revised)

Canada: Same as USA

UK: EER = Henry BMR × PAL (+growth+pregnancy+lactation), Men: BMR = (a×weight in kg) + (b×height in m) + c, Women: BMR = (a×weight in kg) + (b×height in m) + c, Children (9–18y): Boys: EER = 88.5 − (61.9 × age) + PAL × ((26.7 × wt) + (903 × ht)) + 25, Girls: EER = 135.3 − (30.8 × age) + PAL × ((10.0 × wt) + (934 × ht)) + 25, Pregnancy Adjustments: +340 kcal (2nd trimester), +452 kcal (3rd trimester), Lactation Adjustments: +500 kcal (0–6 months), +400 kcal (7–12 months), SACN (uses WHO/FAO/UNU based on Schofield equations), PAL: Sedentary: 1.4, Moderate: 1.7, Very Active: 1.9, BMR: BMR = (a×weight in kg) + (b×height in m) + c, Schofield Equations (WHO/FAO)

Europe (EU): EER = Henry BMR × PAL (+growth+pregnancy+lactation), Men: BMR = (a×weight in kg) + (b×height in m) + c, Women: BMR = (a×weight in kg) + (b×height in m) + c, Children (9–18y): Boys: EER = 88.5 − (61.9 × age) + PAL × ((26.7 × wt) + (903 × ht)) + 25, Girls: EER = 135.3 − (30.8 × age) + PAL × ((10.0 × wt) + (934 × ht)) + 25, Pregnancy Adjustments: +340 kcal (2nd trimester), +452 kcal (3rd trimester), Lactation Adjustments: +500 kcal (0–6 months), +400 kcal (7–12 months), EFSA (based on SACN/Schofield), PAL: Sedentary: 1.4, Moderate: 1.6–1.7, High: 1.8–2.0, BMR: BMR = (a×weight in kg) + (b×height in m) + c, Schofield Equations (WHO/FAO)

Australia: Same as UK, Children (9–18y): Boys: EER = 88.5 − (61.9 × age) + PAL × ((26.7 × wt) + (903 × ht)) + 25, Girls: EER = 135.3 − (30.8 × age) + PAL × ((10.0 × wt) + (934 × ht)) + 25, Pregnancy Adjustments: +340 kcal (2nd trimester), +452 kcal (3rd trimester), Lactation Adjustments: +500 kcal (0–6 months), +400 kcal (7–12 months), NHMRC (based on Schofield/WHO/FAO), PAL: Sedentary: 1.2–1.3, Light: 1.4–1.5, Moderate: 1.6–1.7, High: 1.8–2.0, Same as UK, Schofield Equations (WHO/FAO)

New Zealand: Same as Australia

Singapore: Adopts WHO/FAO or IOM, Children (9–18y): Boys: EER = 88.5 − (61.9 × age) + PAL × ((26.7 × wt) + (903 × ht)) + 25, Girls: EER = 135.3 − (30.8 × age) + PAL × ((10.0 × wt) + (934 × ht)) + 25, Pregnancy Adjustments: +340 kcal (2nd trimester), +452 kcal (3rd trimester), Lactation Adjustments: +500 kcal (0–6 months), +400 kcal (7–12 months), WHO/FAO or IOM adopted, PAL: Sedentary: 1.2, Moderate: 1.55, Active: 1.725, Same as WHO or IOM, Schofield Equations (WHO/FAO)

UAE: Same as WHO (Schofield), Children (9–18y): Boys: EER = 88.5 − (61.9 × age) + PAL × ((26.7 × wt) + (903 × ht)) + 25, Girls: EER = 135.3 − (30.8 × age) + PAL × ((10.0 × wt) + (934 × ht)) + 25, Pregnancy Adjustments: +340 kcal (2nd trimester), +452 kcal (3rd trimester), Lactation Adjustments: +500 kcal (0–6 months), +400 kcal (7–12 months), WHO/FAO (Schofield equations), PAL: Sedentary: 1.2, Moderate: 1.55, Active: 1.725, Same as WHO (Schofield), Schofield Equations (WHO/FAO)

India: Men: (14.5×wt + 645)×PAL, Women: (11.0×wt + 833)×PAL, Children (9–18y): Boys: EER = 88.5 − (61.9 × age) + PAL × ((26.7 × wt) + (903 × ht)) + 25, Girls: EER = 135.3 − (30.8 × age) + PAL × ((10.0 × wt) + (934 × ht)) + 25, Pregnancy Adjustments: +340 kcal (2nd trimester), +452 kcal (3rd trimester), Lactation Adjustments: +500 kcal (0–6 months), +400 kcal (7–12 months), ICMR-NIN (India-specific equations), PAL: Sedentary: 1.53, Moderate: 1.78, Heavy: 2.1, Derived from same EER, ICMR-NIN Derived / Schofield

Global (WHO/FAO): Men: (0.063×wt + 2.896)×239, Women: (0.062×wt + 2.036)×239, Children (9–18y): Boys: EER = 88.5 − (61.9 × age) + PAL × ((26.7 × wt) + (903 × ht)) + 25, Girls: EER = 135.3 − (30.8 × age) + PAL × ((10.0 × wt) + (934 × ht)) + 25, Pregnancy Adjustments: +340 kcal (2nd trimester), +452 kcal (3rd trimester), Lactation Adjustments: +500 kcal (0–6 months), +400 kcal (7–12 months), WHO/FAO/UNU (Schofield equations), PAL: Sedentary: 1.2, Moderate: 1.55, Active: 1.725, Same as EER base, Schofield Equations (WHO/FAO)

Japan: Men: (0.0481×wt + 0.0234×ht − 0.0138×age + 0.9708)×239, Children (9–18y): Boys: EER = 88.5 − (61.9 × age) + PAL × ((26.7 × wt) + (903 × ht)) + 25, Girls: EER = 135.3 − (30.8 × age) + PAL × ((10.0 × wt) + (934 × ht)) + 25, Pregnancy Adjustments: +340 kcal (2nd trimester), +452 kcal (3rd trimester), Lactation Adjustments: +500 kcal (0–6 months), +400 kcal (7–12 months), MHLW (Japan-specific equation), PAL: Sedentary: 1.3, Moderate: 1.6, High: 1.9, Same as EER base, Harris-Benedict (1919, revised)

South Africa: Same as WHO/FAO

Brazil: Same as WHO/FAO

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
    console.log('Starting OpenAI Chat Completions EER calculation...');
    console.log('Input data:', userPrompt);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: userPrompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('OpenAI response received, length:', content.length);
    
    // Try to extract JSON from the response
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content);
      throw new Error('No JSON found in assistant response');
    }

    console.log('Parsing JSON response...');
    const result = JSON.parse(jsonMatch[0]);
    
    // Return the CalorieCalculation field as requested
    if (result.CalorieCalculation) {
      console.log('Returning CalorieCalculation field as-is');
      return result.CalorieCalculation;
    }
    
    // Fallback: if no CalorieCalculation field, check for reasoning field
    if (result.reasoning) {
      console.log('Returning reasoning field as fallback');
      return result.reasoning;
    }
    
    // Final fallback: return the whole result
    console.log('No CalorieCalculation or reasoning field found, returning full result');
    return result;

  } catch (error) {
    console.error('OpenAI Chat Completions EER calculation error:', error);
    throw new Error(`Failed to calculate nutritional requirements using AI: ${error.message}`);
  }
}

module.exports = { calculateEERWithAssistant }; 
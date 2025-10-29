/**
 * Bon Happetee API Service
 * Provides access to Indian food database with extensive nutrition data
 */

export interface BonHappeteeSearchResult {
  food_name: string;
  common_names: string;
  food_unique_id: string;
  food_id: number;
  serving_type: string;
  calories_calculated_for: number;
  basic_unit_measure: number;
  nutrients: {
    fats: number;
    carbs: number;
    protein: number;
    calories: number;
  };
}

export interface BonHappeteeNutrient {
  measure: number;
  nutrient_name: string;
  nutrient_tag_name: string | null;
  unit_of_measure: string;
}

export interface BonHappeteeMeasure {
  basic_unit_measure: number;
  default_measure: string;
  serving_size_unit: string;
  unit_name: string;
  unit_option_name: string;
}

export interface BonHappeteeRecipeDetails {
  food_unique_id: string;
  food_id: number;
  food_name: string;
  common_names: string;
  serving_type: string;
  calories_calculated_for: number;
  basic_unit_measure: number;
  nutrition: BonHappeteeNutrient[]; // API returns "nutrition" not "nutrients"
  measures: BonHappeteeMeasure[];
  food_tags: {
    cuisines: string;
    food_group: string;
    meal_type: string;
    negative_health: string;
    positive_health: string;
  };
  preparation_tags: {
    end_product: number;
    homemade: number;
    packaged_food: number;
    cook_time: number;
    prep_time: number;
    searchable: string;
    recommendable: string;
  };
  food_timing: {
    breakfast: number;
    lunch: number;
    dinner: number;
    snack: number;
  };
}

export interface BonHappeteeDisorderInfo {
  food_unique_id: string;
  food_name: string;
  common_names: string;
  allergens: string;
  positive_health: string;
  negative_health: string;
  disorder_data: Array<{
    disorder_id: number;
    disorder_name: string;
    disorder_risk_factor: number;
    disorder_risk_reason: string;
    food_disorder_alts: Array<{
      food_unique_id: string | null;
      food_item_id: number | null;
      food_name: string;
      priority: number | null;
    }>;
  }>;
}

export class BonHappeteeService {
  private apiKey: string;
  private baseUrl: string = 'https://api.bonhappetee.com';

  constructor() {
    this.apiKey = process.env.BON_HAPPETEE_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('BON_HAPPETEE_API_KEY environment variable is required');
    }
  }

  /**
   * Search for recipes by name
   * Note: Bon Happetee only supports name search, no advanced filters
   */
  async searchRecipes(query: string): Promise<BonHappeteeSearchResult[]> {
    try {
      const url = `${this.baseUrl}/search?value=${encodeURIComponent(query)}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-api-key': this.apiKey
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Bon Happetee search API error:', response.status, errorText);
        throw new Error(`Bon Happetee API error: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle paginated response structure: { results, page, pages, items: [...] }
      if (data && data.items && Array.isArray(data.items)) {
        return data.items;
      }
      
      // Fallback: if it's a direct array
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('❌ Bon Happetee search error:', error);
      throw error;
    }
  }

  /**
   * Get complete recipe details including nutrition and allergens
   * Fetches from both /food and /food/disorder endpoints
   */
  async getRecipeDetails(foodItemId: string): Promise<any> {
    try {
      console.log(`🔍 Fetching Bon Happetee recipe: ${foodItemId}`);

      // Fetch nutrition and allergen data in parallel
      const [nutritionData, disorderData] = await Promise.all([
        this.getFoodNutrition(foodItemId),
        this.getDisorderInfo(foodItemId)
      ]);

      if (!nutritionData) {
        throw new Error('Could not fetch nutrition data');
      }

      // Combine the data
      const allergens = disorderData?.allergens || '';
      const positiveHealth = nutritionData.food_tags?.positive_health || disorderData?.positive_health || '';
      const negativeHealth = nutritionData.food_tags?.negative_health || disorderData?.negative_health || '';

      return {
        id: foodItemId,
        foodId: nutritionData.food_id,
        title: nutritionData.common_names || nutritionData.food_name,
        source: 'bonhappetee',
        servings: 1, // Bon Happetee provides per-serving nutrition
        nutrients: nutritionData.nutrition, // API returns "nutrition" array
        measures: nutritionData.measures || [],
        servingType: nutritionData.serving_type,
        caloriesCalculatedFor: nutritionData.calories_calculated_for,
        basicUnitMeasure: nutritionData.basic_unit_measure,
        allergens: allergens ? allergens.split(',').map((a: string) => a.trim()) : [],
        healthLabels: this.parseHealthLabels(positiveHealth, negativeHealth),
        cuisineType: nutritionData.food_tags?.cuisines ? nutritionData.food_tags.cuisines.split(',').map((c: string) => c.trim()) : [],
        mealType: this.getMealTypes(nutritionData.food_timing),
        foodGroup: nutritionData.food_tags?.food_group,
        prepTime: nutritionData.preparation_tags?.prep_time,
        cookTime: nutritionData.preparation_tags?.cook_time,
        isHomemade: nutritionData.preparation_tags?.homemade === 1,
        isPackaged: nutritionData.preparation_tags?.packaged_food === 1,
        disorderRisks: disorderData?.disorder_data || []
      };
    } catch (error) {
      console.error('❌ Error fetching Bon Happetee recipe details:', error);
      throw error;
    }
  }

  /**
   * Get food nutrition data
   */
  private async getFoodNutrition(foodItemId: string): Promise<BonHappeteeRecipeDetails | null> {
    try {
      const url = `${this.baseUrl}/food?food_item_id=${foodItemId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-api-key': this.apiKey
        },
        redirect: 'follow' // Follow redirects (Bon Happetee uses 301 redirect)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Bon Happetee food API error:', response.status, errorText);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('❌ Error fetching food nutrition:', error);
      return null;
    }
  }

  /**
   * Get disorder/allergen information for a food
   */
  private async getDisorderInfo(foodItemId: string): Promise<BonHappeteeDisorderInfo | null> {
    try {
      const url = `${this.baseUrl}/food/disorder?food_item_id=${foodItemId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-api-key': this.apiKey
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        // Disorder endpoint might not have data for all foods
        console.warn(`⚠️ No disorder data for food ${foodItemId}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.warn('⚠️ Error fetching disorder info (non-critical):', error);
      return null;
    }
  }

  /**
   * Get ingredients breakdown for a food item
   * Returns array of ingredients with names and proportions
   */
  async getIngredients(foodItemId: string): Promise<any[]> {
    try {
      const url = `${this.baseUrl}/ingredients?food_item_id=${foodItemId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-api-key': this.apiKey
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        console.warn(`⚠️ No ingredients data for food ${foodItemId}`);
        return [];
      }

      const data = await response.json();
      
      // Bon Appetit returns an object with an ingredients array
      // Structure: { food_unique_id, food_name, ingredients: [...] }
      if (data && data.ingredients && Array.isArray(data.ingredients)) {
        return data.ingredients;
      }
      
      // If ingredients is null (single ingredient food like "goat cheese"), return empty
      return [];
    } catch (error) {
      console.warn('⚠️ Error fetching ingredients (non-critical):', error);
      return [];
    }
  }

  /**
   * Parse health labels from positive/negative health strings
   */
  private parseHealthLabels(positiveHealth: string, negativeHealth: string): string[] {
    const labels: string[] = [];
    
    if (positiveHealth) {
      const positive = positiveHealth.split(',').map(h => h.trim());
      labels.push(...positive.map(h => h.charAt(0).toUpperCase() + h.slice(1)));
    }
    
    if (negativeHealth) {
      const negative = negativeHealth.split(',').map(h => h.trim());
      labels.push(...negative.map(h => 'Warning: ' + h));
    }
    
    return labels;
  }

  /**
   * Get meal types based on food_timing
   */
  private getMealTypes(foodTiming: any): string[] {
    const types: string[] = [];
    if (foodTiming?.breakfast === 1) types.push('breakfast');
    if (foodTiming?.lunch === 1) types.push('lunch');
    if (foodTiming?.dinner === 1) types.push('dinner');
    if (foodTiming?.snack === 1) types.push('snack');
    return types.length > 0 ? types : ['main course'];
  }
}


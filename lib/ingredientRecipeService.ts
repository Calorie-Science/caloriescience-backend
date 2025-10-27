import { EdamamService } from './edamamService';
import { MultiProviderRecipeSearchService } from './multiProviderRecipeSearchService';

/**
 * Service to convert ingredients into simple single-ingredient "recipes"
 * Enables searching for basic foods (fruits, vegetables, proteins) as recipes
 */
export class IngredientRecipeService {
  private edamamService: EdamamService;
  private multiProviderService: MultiProviderRecipeSearchService;

  constructor() {
    this.edamamService = new EdamamService();
    this.multiProviderService = new MultiProviderRecipeSearchService();
  }

  /**
   * Search ingredients and convert them to recipe format
   * @param query - Search term (e.g., "banana", "avocado", "chicken breast")
   * @param maxResults - Maximum number of results to return
   */
  async searchIngredientsAsRecipes(query: string, maxResults: number = 10): Promise<any[]> {
    if (!query || query.trim().length < 2) {
      console.log('⚠️ Query too short for ingredient search');
      return [];
    }

    try {
      console.log(`🔍 Searching ingredients for: "${query}"`);
      
      // Get ingredient suggestions from both providers
      const [edamamSuggestions, spoonacularSuggestions] = await Promise.all([
        this.getEdamamIngredientSuggestions(query),
        this.getSpoonacularIngredientSuggestions(query)
      ]);

      console.log(`📋 Found ${edamamSuggestions.length} Edamam + ${spoonacularSuggestions.length} Spoonacular suggestions`);

      // Combine and deduplicate
      const allSuggestions = [...edamamSuggestions, ...spoonacularSuggestions];
      const uniqueSuggestions = this.deduplicateIngredients(allSuggestions);

      console.log(`📋 After dedup: ${uniqueSuggestions.length} unique ingredients`);

      // Limit results
      const limitedSuggestions = uniqueSuggestions.slice(0, maxResults);

      if (limitedSuggestions.length === 0) {
        console.log('⚠️ No ingredient suggestions found');
        return [];
      }

      console.log(`📋 Converting ${limitedSuggestions.length} ingredients to recipes...`);

      // Convert to recipe format with nutrition (sequentially to avoid rate limits)
      const recipes: any[] = [];
      for (const ingredient of limitedSuggestions) {
        try {
          const recipe = await this.convertIngredientToRecipe(ingredient);
          if (recipe) {
            recipes.push(recipe);
            console.log(`✅ Converted: ${ingredient}`);
          } else {
            console.log(`⚠️ Failed to convert: ${ingredient}`);
          }
        } catch (error) {
          console.error(`❌ Error converting ${ingredient}:`, error);
        }
      }

      console.log(`✅ Successfully converted ${recipes.length} ingredients to recipes`);
      return recipes;
    } catch (error) {
      console.error('❌ Error searching ingredients as recipes:', error);
      return [];
    }
  }

  /**
   * Get ingredient suggestions from Edamam
   */
  private async getEdamamIngredientSuggestions(query: string): Promise<string[]> {
    try {
      const result = await this.edamamService.getIngredientAutocomplete(query, 'basic');
      return result.suggestions || [];
    } catch (error) {
      console.error('Error getting Edamam ingredient suggestions:', error);
      return [];
    }
  }

  /**
   * Get ingredient suggestions from Spoonacular
   */
  private async getSpoonacularIngredientSuggestions(query: string): Promise<string[]> {
    try {
      const result = await this.multiProviderService.getIngredientSuggestions(query, 'basic');
      return result.suggestions || [];
    } catch (error) {
      console.error('Error getting Spoonacular ingredient suggestions:', error);
      return [];
    }
  }

  /**
   * Deduplicate ingredient names (case-insensitive)
   */
  private deduplicateIngredients(ingredients: string[]): string[] {
    const seen = new Set<string>();
    const unique: string[] = [];

    for (const ingredient of ingredients) {
      const normalized = ingredient.toLowerCase().trim();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(ingredient);
      }
    }

    return unique;
  }

  /**
   * Convert ingredient to recipe format with nutrition
   */
  private async convertIngredientToRecipe(ingredientName: string): Promise<any | null> {
    try {
      console.log(`🔄 Converting ingredient: ${ingredientName}`);
      
      // Use standard serving size based on ingredient type
      const servingSize = this.getStandardServingSize(ingredientName);
      const ingredientQuery = `${servingSize.quantity} ${servingSize.unit} ${ingredientName}`;

      console.log(`  Query: ${ingredientQuery}`);

      // Get nutrition from Edamam (more comprehensive for single ingredients)
      const nutritionResult = await this.edamamService.getIngredientNutrition(
        ingredientQuery,
        'logging'
      );

      if (!nutritionResult || !nutritionResult.totalNutrients) {
        console.log(`  ⚠️ No nutrition data for ingredient: ${ingredientName}`);
        return null;
      }

      console.log(`  ✅ Got nutrition data, calories: ${nutritionResult.calories || 0}`);

      // Extract nutrition data
      const calories = nutritionResult.calories || 0;
      const nutrients = nutritionResult.totalNutrients || {};
      const weight = nutritionResult.totalWeight || servingSize.quantity;

      // Build nutrition object
      const nutrition = this.buildNutritionObject(calories, nutrients, weight);

      // Create recipe-like object
      const recipe = {
        id: `ingredient_${this.generateIngredientId(ingredientName)}`,
        title: this.formatIngredientTitle(ingredientName, servingSize),
        image: this.getIngredientImage(ingredientName),
        sourceUrl: null,
        source: 'ingredient' as const,
        servings: 1,
        readyInMinutes: 0,
        
        // Nutrition (per serving)
        calories: Math.round(calories),
        protein: Math.round((nutrients.PROCNT?.quantity || 0) * 10) / 10,
        carbs: Math.round((nutrients.CHOCDF?.quantity || 0) * 10) / 10,
        fat: Math.round((nutrients.FAT?.quantity || 0) * 10) / 10,
        fiber: Math.round((nutrients.FIBTG?.quantity || 0) * 10) / 10,

        // Full nutrition object
        nutrition: nutrition,

        // Recipe details
        ingredients: [ingredientQuery],
        ingredientLines: [ingredientQuery],
        instructions: [`Serve ${servingSize.quantity} ${servingSize.unit} of ${ingredientName}`],
        
        // Metadata
        healthLabels: this.inferHealthLabels(ingredientName, nutrients),
        dietLabels: this.inferDietLabels(ingredientName),
        allergens: this.inferAllergens(ingredientName),
        cuisineType: [],
        dishType: [this.inferDishType(ingredientName)],
        mealType: [this.inferMealType(ingredientName)],
        
        // Special flags
        isIngredient: true,
        fromCache: false,
        ingredientData: {
          name: ingredientName,
          servingSize: servingSize,
          weight: weight
        }
      };

      return recipe;
    } catch (error) {
      console.error(`Error converting ingredient to recipe: ${ingredientName}`, error);
      return null;
    }
  }

  /**
   * Get standard serving size for an ingredient
   */
  private getStandardServingSize(ingredientName: string): { quantity: number; unit: string } {
    const name = ingredientName.toLowerCase();

    // Fruits - typically 1 medium or 100g
    if (this.isFruit(name)) {
      return { quantity: 1, unit: 'medium' };
    }

    // Vegetables - typically 100g or 1 cup
    if (this.isVegetable(name)) {
      return name.includes('leafy') || name.includes('spinach') || name.includes('lettuce')
        ? { quantity: 1, unit: 'cup' }
        : { quantity: 100, unit: 'g' };
    }

    // Proteins - typically 100g
    if (this.isProtein(name)) {
      return { quantity: 100, unit: 'g' };
    }

    // Nuts/seeds - typically 28g (1 oz)
    if (this.isNutOrSeed(name)) {
      return { quantity: 28, unit: 'g' };
    }

    // Default: 100g
    return { quantity: 100, unit: 'g' };
  }

  /**
   * Format ingredient title for display
   */
  private formatIngredientTitle(name: string, servingSize: { quantity: number; unit: string }): string {
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    return `${capitalizedName} (${servingSize.quantity}${servingSize.unit})`;
  }

  /**
   * Generate a unique ID for the ingredient
   */
  private generateIngredientId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  /**
   * Build nutrition object from Edamam nutrients
   */
  private buildNutritionObject(calories: number, nutrients: any, weight: number): any {
    return {
      calories: { quantity: Math.round(calories), unit: 'kcal' },
      macros: {
        protein: { quantity: Math.round((nutrients.PROCNT?.quantity || 0) * 10) / 10, unit: 'g' },
        carbs: { quantity: Math.round((nutrients.CHOCDF?.quantity || 0) * 10) / 10, unit: 'g' },
        fat: { quantity: Math.round((nutrients.FAT?.quantity || 0) * 10) / 10, unit: 'g' },
        fiber: { quantity: Math.round((nutrients.FIBTG?.quantity || 0) * 10) / 10, unit: 'g' },
        sugar: { quantity: Math.round((nutrients.SUGAR?.quantity || 0) * 10) / 10, unit: 'g' },
        sodium: { quantity: Math.round((nutrients.NA?.quantity || 0) * 10) / 10, unit: 'mg' }
      },
      micros: {
        vitamins: {
          vitaminA: { quantity: Math.round((nutrients.VITA_RAE?.quantity || 0) * 10) / 10, unit: 'µg' },
          vitaminC: { quantity: Math.round((nutrients.VITC?.quantity || 0) * 10) / 10, unit: 'mg' },
          vitaminD: { quantity: Math.round((nutrients.VITD?.quantity || 0) * 10) / 10, unit: 'µg' },
          vitaminE: { quantity: Math.round((nutrients.TOCPHA?.quantity || 0) * 10) / 10, unit: 'mg' },
          vitaminK: { quantity: Math.round((nutrients.VITK1?.quantity || 0) * 10) / 10, unit: 'µg' },
          vitaminB6: { quantity: Math.round((nutrients.VITB6A?.quantity || 0) * 1000) / 1000, unit: 'mg' },
          vitaminB12: { quantity: Math.round((nutrients.VITB12?.quantity || 0) * 1000) / 1000, unit: 'µg' },
          folate: { quantity: Math.round((nutrients.FOLDFE?.quantity || 0) * 10) / 10, unit: 'µg' }
        },
        minerals: {
          calcium: { quantity: Math.round((nutrients.CA?.quantity || 0) * 10) / 10, unit: 'mg' },
          iron: { quantity: Math.round((nutrients.FE?.quantity || 0) * 10) / 10, unit: 'mg' },
          magnesium: { quantity: Math.round((nutrients.MG?.quantity || 0) * 10) / 10, unit: 'mg' },
          phosphorus: { quantity: Math.round((nutrients.P?.quantity || 0) * 10) / 10, unit: 'mg' },
          potassium: { quantity: Math.round((nutrients.K?.quantity || 0) * 10) / 10, unit: 'mg' },
          zinc: { quantity: Math.round((nutrients.ZN?.quantity || 0) * 10) / 10, unit: 'mg' }
        }
      },
      weight: { quantity: Math.round(weight * 10) / 10, unit: 'g' }
    };
  }

  /**
   * Infer health labels from ingredient name and nutrition
   */
  private inferHealthLabels(name: string, nutrients: any): string[] {
    const labels: string[] = [];
    const lowerName = name.toLowerCase();

    // Vegan/Vegetarian
    if (!this.isAnimalProduct(lowerName)) {
      labels.push('vegan', 'vegetarian');
    }

    // Gluten-free (most whole foods are)
    if (!lowerName.includes('wheat') && !lowerName.includes('barley') && !lowerName.includes('rye')) {
      labels.push('gluten-free');
    }

    // Dairy-free
    if (!lowerName.includes('milk') && !lowerName.includes('cheese') && !lowerName.includes('yogurt')) {
      labels.push('dairy-free');
    }

    // High protein (>10g per serving)
    if (nutrients.PROCNT?.quantity > 10) {
      labels.push('high-protein');
    }

    // Low carb (<10g per serving)
    if (nutrients.CHOCDF?.quantity < 10) {
      labels.push('low-carb');
    }

    return labels;
  }

  /**
   * Infer diet labels from ingredient name
   */
  private inferDietLabels(name: string): string[] {
    const labels: string[] = [];
    const lowerName = name.toLowerCase();

    if (!this.isAnimalProduct(lowerName)) {
      labels.push('vegan', 'vegetarian');
    }

    return labels;
  }

  /**
   * Infer allergens from ingredient name
   */
  private inferAllergens(name: string): string[] {
    const allergens: string[] = [];
    const lowerName = name.toLowerCase();

    if (this.isNutOrSeed(lowerName)) {
      allergens.push('tree-nuts');
    }

    if (lowerName.includes('peanut')) {
      allergens.push('peanuts');
    }

    if (lowerName.includes('soy')) {
      allergens.push('soy');
    }

    if (this.isSeafood(lowerName)) {
      allergens.push('fish', 'shellfish');
    }

    if (lowerName.includes('milk') || lowerName.includes('cheese') || lowerName.includes('yogurt')) {
      allergens.push('dairy');
    }

    if (lowerName.includes('egg')) {
      allergens.push('eggs');
    }

    if (lowerName.includes('wheat') || lowerName.includes('gluten')) {
      allergens.push('gluten');
    }

    return allergens;
  }

  /**
   * Infer dish type from ingredient
   */
  private inferDishType(name: string): string {
    const lowerName = name.toLowerCase();

    if (this.isFruit(lowerName)) return 'starter';
    if (this.isVegetable(lowerName)) return 'side dish';
    if (this.isProtein(lowerName)) return 'main course';
    if (this.isNutOrSeed(lowerName)) return 'snack';

    return 'side dish';
  }

  /**
   * Infer meal type from ingredient
   */
  private inferMealType(name: string): string {
    const lowerName = name.toLowerCase();

    if (this.isFruit(lowerName)) return 'breakfast';
    if (this.isProtein(lowerName)) return 'lunch/dinner';
    if (this.isNutOrSeed(lowerName)) return 'snack';

    return 'lunch/dinner';
  }

  /**
   * Get a placeholder image for the ingredient
   */
  private getIngredientImage(name: string): string {
    // Use a generic placeholder or ingredient-specific image
    const lowerName = name.toLowerCase().replace(/\s+/g, '-');
    return `https://spoonacular.com/cdn/ingredients_100x100/${lowerName}.jpg`;
  }

  // Helper methods for categorization
  private isFruit(name: string): boolean {
    const fruits = ['apple', 'banana', 'orange', 'avocado', 'berry', 'strawberry', 'blueberry', 
                    'grape', 'mango', 'pineapple', 'peach', 'pear', 'plum', 'cherry', 'kiwi', 
                    'watermelon', 'melon', 'papaya', 'lemon', 'lime'];
    return fruits.some(fruit => name.includes(fruit));
  }

  private isVegetable(name: string): boolean {
    const vegetables = ['broccoli', 'spinach', 'carrot', 'lettuce', 'tomato', 'cucumber', 
                        'pepper', 'onion', 'garlic', 'celery', 'kale', 'cauliflower', 
                        'zucchini', 'eggplant', 'cabbage', 'asparagus', 'mushroom'];
    return vegetables.some(veg => name.includes(veg));
  }

  private isProtein(name: string): boolean {
    const proteins = ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'turkey', 
                      'lamb', 'tofu', 'tempeh', 'egg', 'shrimp', 'prawn'];
    return proteins.some(protein => name.includes(protein));
  }

  private isNutOrSeed(name: string): boolean {
    const nutsSeeds = ['almond', 'walnut', 'cashew', 'pecan', 'peanut', 'pistachio', 
                       'hazelnut', 'macadamia', 'chia', 'flax', 'sunflower', 'pumpkin'];
    return nutsSeeds.some(nut => name.includes(nut));
  }

  private isSeafood(name: string): boolean {
    const seafood = ['fish', 'salmon', 'tuna', 'shrimp', 'prawn', 'crab', 'lobster', 
                     'oyster', 'clam', 'mussel', 'scallop'];
    return seafood.some(food => name.includes(food));
  }

  private isAnimalProduct(name: string): boolean {
    const animalProducts = ['meat', 'chicken', 'beef', 'pork', 'fish', 'salmon', 'turkey', 
                            'lamb', 'egg', 'milk', 'cheese', 'yogurt', 'butter', 'cream', 
                            'shrimp', 'prawn', 'seafood'];
    return animalProducts.some(product => name.includes(product));
  }
}

export const ingredientRecipeService = new IngredientRecipeService();


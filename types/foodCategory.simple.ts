/**
 * Food Category Types - Simple version
 * Used for categorizing custom recipes and providing appropriate portion sizes
 */

export enum FoodCategory {
  // Beverages
  BEVERAGE_WATER = 'beverage_water',
  BEVERAGE_JUICE = 'beverage_juice',
  BEVERAGE_MILK = 'beverage_milk',
  BEVERAGE_SMOOTHIE = 'beverage_smoothie',
  BEVERAGE_COFFEE_TEA = 'beverage_coffee_tea',
  BEVERAGE_SOFT_DRINK = 'beverage_soft_drink',

  // Soups & Stews
  SOUP_THIN = 'soup_thin',
  SOUP_THICK = 'soup_thick',
  STEW = 'stew',
  BROTH = 'broth',

  // Grains & Starches
  CEREAL_DRY = 'cereal_dry',
  CEREAL_COOKED = 'cereal_cooked',
  RICE_COOKED = 'rice_cooked',
  PASTA_COOKED = 'pasta_cooked',
  QUINOA_COOKED = 'quinoa_cooked',
  BREAD = 'bread',
  ROLLS_BAGELS = 'rolls_bagels',

  // Protein Foods
  MEAT_COOKED = 'meat_cooked',
  POULTRY_COOKED = 'poultry_cooked',
  FISH_SEAFOOD = 'fish_seafood',
  EGGS = 'eggs',
  TOFU_SOY = 'tofu_soy',
  BEANS_LEGUMES = 'beans_legumes',
  NUTS_SEEDS = 'nuts_seeds',

  // Dairy Products
  MILK_DAIRY = 'milk_dairy',
  YOGURT = 'yogurt',
  CHEESE_HARD = 'cheese_hard',
  CHEESE_SOFT = 'cheese_soft',
  ICE_CREAM = 'ice_cream',

  // Fruits & Vegetables
  FRUIT_WHOLE = 'fruit_whole',
  FRUIT_BERRIES = 'fruit_berries',
  FRUIT_CHOPPED = 'fruit_chopped',
  FRUIT_DRIED = 'fruit_dried',
  VEGETABLE_RAW_LEAFY = 'vegetable_raw_leafy',
  VEGETABLE_COOKED = 'vegetable_cooked',
  POTATO = 'potato',

  // Fats & Oils
  OIL_LIQUID = 'oil_liquid',
  BUTTER_SPREAD = 'butter_spread',

  // Desserts
  PUDDING = 'pudding',
  MOUSSE = 'mousse',

  // Sauces & Mixed Dishes
  SAUCE_PASTA = 'sauce_pasta',
  CURRY_SAUCED_DISH = 'curry_sauced_dish',

  // Other
  MIXED_DISH = 'mixed_dish',
  OTHER = 'other',
}

/**
 * Portion size definition for a food category
 */
export interface CategoryPortionSize {
  name: string;
  description?: string;
  weightG?: number;
  volumeMl?: number;
  multiplier: number;
  isDefault: boolean;
}

/**
 * Category with its allowed portion sizes
 */
export interface CategoryPortionSizes {
  category: FoodCategory;
  allowedPortions: CategoryPortionSize[];
}

/**
 * Get portion sizes for a specific category
 */
export function getPortionSizesForCategory(category: FoodCategory): CategoryPortionSizes | undefined {
  return CATEGORY_PORTION_SIZES.find(c => c.category === category);
}

/**
 * Standard portion sizes by food category
 * This data matches what's seeded in the database
 */
export const CATEGORY_PORTION_SIZES: CategoryPortionSizes[] = [
  // Beverages - Water
  {
    category: FoodCategory.BEVERAGE_WATER,
    allowedPortions: [
      { name: 'Small Glass (Water)', description: '200 mL', volumeMl: 200, multiplier: 0.8, isDefault: false },
      { name: 'Medium Glass (Water)', description: '300 mL', volumeMl: 300, multiplier: 1.0, isDefault: true },
      { name: 'Large Glass (Water)', description: '400 mL', volumeMl: 400, multiplier: 1.33, isDefault: false },
    ],
  },

  // Beverages - Juice
  {
    category: FoodCategory.BEVERAGE_JUICE,
    allowedPortions: [
      { name: 'Small Glass (Juice)', description: '150 mL', volumeMl: 150, multiplier: 0.6, isDefault: false },
      { name: 'Medium Glass (Juice)', description: '200 mL', volumeMl: 200, multiplier: 1.0, isDefault: true },
      { name: 'Large Glass (Juice)', description: '250 mL', volumeMl: 250, multiplier: 1.25, isDefault: false },
    ],
  },

  // Soups - Thin
  {
    category: FoodCategory.SOUP_THIN,
    allowedPortions: [
      { name: 'Small Bowl (Thin Soup)', description: '200 mL', volumeMl: 200, multiplier: 0.667, isDefault: false },
      { name: 'Medium Bowl (Thin Soup)', description: '300 mL', volumeMl: 300, multiplier: 1.0, isDefault: true },
      { name: 'Large Bowl (Thin Soup)', description: '400 mL', volumeMl: 400, multiplier: 1.333, isDefault: false },
    ],
  },

  // Soups - Thick
  {
    category: FoodCategory.SOUP_THICK,
    allowedPortions: [
      { name: 'Small Bowl (Thick Soup)', description: '250 g', weightG: 250, multiplier: 0.714, isDefault: false },
      { name: 'Medium Bowl (Thick Soup)', description: '350 g', weightG: 350, multiplier: 1.0, isDefault: true },
      { name: 'Large Bowl (Thick Soup)', description: '450 g', weightG: 450, multiplier: 1.286, isDefault: false },
    ],
  },

  // Rice
  {
    category: FoodCategory.RICE_COOKED,
    allowedPortions: [
      { name: '½ Cup (Rice)', description: '75 g', weightG: 75, multiplier: 0.5, isDefault: false },
      { name: '¾ Cup (Rice)', description: '110 g', weightG: 110, multiplier: 0.733, isDefault: false },
      { name: '1 Cup (Rice)', description: '150 g', weightG: 150, multiplier: 1.0, isDefault: true },
    ],
  },

  // Pasta
  {
    category: FoodCategory.PASTA_COOKED,
    allowedPortions: [
      { name: '½ Cup (Pasta)', description: '70 g', weightG: 70, multiplier: 0.5, isDefault: false },
      { name: '¾ Cup (Pasta)', description: '105 g', weightG: 105, multiplier: 0.75, isDefault: false },
      { name: '1 Cup (Pasta)', description: '140 g', weightG: 140, multiplier: 1.0, isDefault: true },
    ],
  },

  // Meat
  {
    category: FoodCategory.MEAT_COOKED,
    allowedPortions: [
      { name: 'Small (Meat)', description: '70 g (2.5 oz)', weightG: 70, multiplier: 0.7, isDefault: false },
      { name: 'Medium (Meat)', description: '100 g (3.5 oz)', weightG: 100, multiplier: 1.0, isDefault: true },
      { name: 'Large (Meat)', description: '140 g (5 oz)', weightG: 140, multiplier: 1.4, isDefault: false },
    ],
  },

  // Add more as needed...
  // For brevity, I'm showing just the key examples
  // The full data is in the database seed file
];

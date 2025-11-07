/**
 * Food Category Types based on USDA Food and Nutrient Database
 * Used for determining appropriate portion sizes and measurement units
 */

export enum FoodCategory {
  // Beverages & Liquid Foods
  BEVERAGE_WATER = 'beverage_water',
  BEVERAGE_JUICE = 'beverage_juice',
  BEVERAGE_MILK = 'beverage_milk',
  BEVERAGE_SMOOTHIE = 'beverage_smoothie',
  BEVERAGE_COFFEE_TEA = 'beverage_coffee_tea',
  BEVERAGE_SOFT_DRINK = 'beverage_soft_drink',

  // Soups & Semi-Liquid Dishes
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

  // Desserts & Sweets
  PUDDING = 'pudding',
  MOUSSE = 'mousse',

  // Sauces & Condiments
  SAUCE_PASTA = 'sauce_pasta',
  CURRY_SAUCED_DISH = 'curry_sauced_dish',

  // Mixed/Other
  MIXED_DISH = 'mixed_dish',
  OTHER = 'other',
}

/**
 * Density reference values for volume-to-weight conversions
 * Based on USDA FNDDS data
 */
export interface DensityReference {
  category: FoodCategory;
  densityGPerMl: number; // g/mL
  densityRange?: { min: number; max: number }; // For variable density foods
  accuracyPercent: number; // ±% variance
  scientificBasis: string;
  dataSource: string;
}

/**
 * Measurement priority for each food category
 */
export interface CategoryMeasurementPriority {
  category: FoodCategory;
  primaryUnit: 'weight' | 'volume' | 'count';
  secondaryUnit?: 'weight' | 'volume' | 'count';
  rationale: string;
  implementationGuidance: string;
}

/**
 * Allowed portion sizes for a food category
 */
export interface CategoryPortionSizes {
  category: FoodCategory;
  allowedPortions: {
    name: string;
    description?: string;
    weightG?: number;
    volumeMl?: number;
    multiplier: number;
    isDefault: boolean;
  }[];
}

/**
 * Density reference data based on PDF
 */
export const DENSITY_REFERENCES: DensityReference[] = [
  // Beverages
  { category: FoodCategory.BEVERAGE_WATER, densityGPerMl: 1.00, accuracyPercent: 1, scientificBasis: 'Pure water equivalent', dataSource: 'USDA SR28' },
  { category: FoodCategory.BEVERAGE_JUICE, densityGPerMl: 1.04, accuracyPercent: 3, scientificBasis: 'Fruit juice with dissolved solids', dataSource: 'FNDDS 2019-2020' },
  { category: FoodCategory.BEVERAGE_MILK, densityGPerMl: 1.03, accuracyPercent: 2, scientificBasis: 'Whole milk standard', dataSource: 'USDA Handbook 8' },
  { category: FoodCategory.BEVERAGE_SMOOTHIE, densityGPerMl: 1.10, densityRange: { min: 1.05, max: 1.15 }, accuracyPercent: 5, scientificBasis: 'Variable based on ingredient ratios', dataSource: 'Nutritional Analysis Lab' },
  { category: FoodCategory.BEVERAGE_COFFEE_TEA, densityGPerMl: 1.00, accuracyPercent: 1, scientificBasis: 'Water-based with minimal solids', dataSource: 'USDA SR28' },
  { category: FoodCategory.BEVERAGE_SOFT_DRINK, densityGPerMl: 1.04, accuracyPercent: 2, scientificBasis: 'Sugar content increases density', dataSource: 'FNDDS 2019-2020' },

  // Soups & Stews
  { category: FoodCategory.SOUP_THIN, densityGPerMl: 1.02, accuracyPercent: 3, scientificBasis: 'Broth-based with minimal solid content', dataSource: 'FNDDS 2019-2020' },
  { category: FoodCategory.SOUP_THICK, densityGPerMl: 1.15, densityRange: { min: 1.10, max: 1.20 }, accuracyPercent: 8, scientificBasis: 'Cream-based or pureed soups', dataSource: 'Food Composition Studies' },
  { category: FoodCategory.STEW, densityGPerMl: 1.20, densityRange: { min: 1.15, max: 1.25 }, accuracyPercent: 10, scientificBasis: 'Significant solid content', dataSource: 'Institutional Foodservice Data' },
  { category: FoodCategory.BROTH, densityGPerMl: 1.00, accuracyPercent: 2, scientificBasis: 'Clear liquid, density ≈ 1.0', dataSource: 'USDA SR28' },

  // Grains & Starches
  { category: FoodCategory.CEREAL_DRY, densityGPerMl: 0.35, densityRange: { min: 0.30, max: 0.40 }, accuracyPercent: 15, scientificBasis: 'Low density due to air spaces', dataSource: 'Manufacturer Data' },
  { category: FoodCategory.CEREAL_COOKED, densityGPerMl: 1.05, densityRange: { min: 1.00, max: 1.10 }, accuracyPercent: 5, scientificBasis: 'Porridge consistency', dataSource: 'FNDDS 2019-2020' },
  { category: FoodCategory.RICE_COOKED, densityGPerMl: 0.70, densityRange: { min: 0.65, max: 0.75 }, accuracyPercent: 7, scientificBasis: 'Cooked grain with absorbed water', dataSource: 'USDA Food Buying Guide' },
  { category: FoodCategory.PASTA_COOKED, densityGPerMl: 0.75, densityRange: { min: 0.70, max: 0.80 }, accuracyPercent: 8, scientificBasis: 'Varies by shape and cooking time', dataSource: 'Food Engineering Research' },
  { category: FoodCategory.QUINOA_COOKED, densityGPerMl: 0.70, densityRange: { min: 0.65, max: 0.75 }, accuracyPercent: 7, scientificBasis: 'Similar to rice', dataSource: 'USDA Food Buying Guide' },

  // Dairy
  { category: FoodCategory.YOGURT, densityGPerMl: 1.04, accuracyPercent: 3, scientificBasis: 'Similar to milk with fermentation products', dataSource: 'Dairy Science Handbook' },
  { category: FoodCategory.CHEESE_SOFT, densityGPerMl: 0.95, accuracyPercent: 4, scientificBasis: 'Curds suspended in liquid whey', dataSource: 'USDA SR28' },
  { category: FoodCategory.ICE_CREAM, densityGPerMl: 0.60, densityRange: { min: 0.55, max: 0.65 }, accuracyPercent: 10, scientificBasis: 'Low density from air incorporation', dataSource: 'Food Technology Journal' },

  // Fruits & Vegetables
  { category: FoodCategory.FRUIT_BERRIES, densityGPerMl: 0.60, densityRange: { min: 0.55, max: 0.65 }, accuracyPercent: 8, scientificBasis: 'Air spaces between berries', dataSource: 'Produce Science Research' },
  { category: FoodCategory.FRUIT_CHOPPED, densityGPerMl: 0.65, densityRange: { min: 0.60, max: 0.70 }, accuracyPercent: 10, scientificBasis: 'Varies by fruit type and cut size', dataSource: 'FNDDS 2019-2020' },
  { category: FoodCategory.VEGETABLE_RAW_LEAFY, densityGPerMl: 0.20, densityRange: { min: 0.15, max: 0.25 }, accuracyPercent: 20, scientificBasis: 'Extremely low density, highly compressible', dataSource: 'Vegetable Science Studies' },
  { category: FoodCategory.VEGETABLE_COOKED, densityGPerMl: 0.70, densityRange: { min: 0.60, max: 0.80 }, accuracyPercent: 12, scientificBasis: 'Cooking reduces volume', dataSource: 'USDA Food Buying Guide' },

  // Fats & Oils
  { category: FoodCategory.OIL_LIQUID, densityGPerMl: 0.92, accuracyPercent: 2, scientificBasis: 'All liquid oils less dense than water', dataSource: 'Chemical Properties Data' },
  { category: FoodCategory.BUTTER_SPREAD, densityGPerMl: 0.96, accuracyPercent: 2, scientificBasis: 'Semi-solid fats near room temperature', dataSource: 'Dairy/Fat Analysis' },

  // Sauces & Mixed Dishes
  { category: FoodCategory.SAUCE_PASTA, densityGPerMl: 1.075, densityRange: { min: 1.05, max: 1.10 }, accuracyPercent: 4, scientificBasis: 'Tomato-based with seasonings', dataSource: 'Food Composition Database' },
  { category: FoodCategory.PUDDING, densityGPerMl: 1.10, densityRange: { min: 1.08, max: 1.12 }, accuracyPercent: 4, scientificBasis: 'Thickened dairy or starch-based', dataSource: 'Dessert Formulation Data' },
  { category: FoodCategory.MOUSSE, densityGPerMl: 0.90, densityRange: { min: 0.85, max: 0.95 }, accuracyPercent: 8, scientificBasis: 'Aerated structure reduces density', dataSource: 'Culinary Science Research' },
];

/**
 * Measurement priorities by category
 */
export const MEASUREMENT_PRIORITIES: CategoryMeasurementPriority[] = [
  // Soups & Stews
  { category: FoodCategory.SOUP_THIN, primaryUnit: 'volume', secondaryUnit: 'weight', rationale: 'Low viscosity; behaves like liquid', implementationGuidance: 'User expectation: bowl or cup; nutritional data typically per 100 mL' },
  { category: FoodCategory.SOUP_THICK, primaryUnit: 'volume', secondaryUnit: 'weight', rationale: 'Despite thickness, served in bowls; volume intuitive', implementationGuidance: 'Display volume; note ±8% conversion variance due to inconsistent density' },
  { category: FoodCategory.STEW, primaryUnit: 'weight', secondaryUnit: 'volume', rationale: 'Solid pieces dominant; weight more accurate', implementationGuidance: 'Recommend weight; offer bowl size as approximate (requires density assumption)' },
  { category: FoodCategory.BROTH, primaryUnit: 'volume', secondaryUnit: 'weight', rationale: 'Clear liquid; density ≈ 1.0', implementationGuidance: 'Volume measurements standard; minimal conversion error' },

  // Grains & Starches
  { category: FoodCategory.RICE_COOKED, primaryUnit: 'weight', secondaryUnit: 'volume', rationale: 'Standard portion control uses weight', implementationGuidance: 'Professional standards (USDA) specify weight; cup as secondary convenience measure' },
  { category: FoodCategory.PASTA_COOKED, primaryUnit: 'weight', secondaryUnit: 'volume', rationale: 'Shape variation affects volume significantly', implementationGuidance: 'Weight eliminates shape-dependent measurement errors; cup available but flagged as approximate' },
  { category: FoodCategory.CEREAL_COOKED, primaryUnit: 'weight', secondaryUnit: 'volume', rationale: 'Consistency varies by water ratio', implementationGuidance: 'Weight provides consistency; volume unreliable across preparation methods' },

  // Beverages
  { category: FoodCategory.BEVERAGE_SMOOTHIE, primaryUnit: 'volume', secondaryUnit: 'weight', rationale: 'Consumed as beverage', implementationGuidance: 'Glass/bottle sizing standard; treated as liquid despite thickness' },

  // Mixed Dishes
  { category: FoodCategory.CURRY_SAUCED_DISH, primaryUnit: 'weight', secondaryUnit: 'volume', rationale: 'Mixed composition', implementationGuidance: 'Weight recommended for nutrition accuracy; bowl sizes available with density caveat' },
];

/**
 * Standard portion sizes by food category based on PDF reference
 */
export const CATEGORY_PORTION_SIZES: CategoryPortionSizes[] = [
  // Beverages
  {
    category: FoodCategory.BEVERAGE_WATER,
    allowedPortions: [
      { name: 'Small Glass', description: '200 mL', volumeMl: 200, multiplier: 0.8, isDefault: false },
      { name: 'Medium Glass', description: '300 mL', volumeMl: 300, multiplier: 1.0, isDefault: true },
      { name: 'Large Glass', description: '400 mL', volumeMl: 400, multiplier: 1.33, isDefault: false },
      { name: 'Cup', description: '240 mL (US) / 250 mL (Metric)', volumeMl: 240, multiplier: 0.8, isDefault: false },
    ],
  },
  {
    category: FoodCategory.BEVERAGE_JUICE,
    allowedPortions: [
      { name: 'Small Glass', description: '150 mL', volumeMl: 150, multiplier: 0.6, isDefault: false },
      { name: 'Medium Glass', description: '200 mL', volumeMl: 200, multiplier: 1.0, isDefault: true },
      { name: 'Large Glass', description: '250 mL', volumeMl: 250, multiplier: 1.25, isDefault: false },
      { name: 'Cup', description: '240 mL', volumeMl: 240, multiplier: 1.2, isDefault: false },
    ],
  },
  {
    category: FoodCategory.BEVERAGE_SMOOTHIE,
    allowedPortions: [
      { name: 'Small Cup', description: '200 mL', volumeMl: 200, multiplier: 0.67, isDefault: false },
      { name: 'Medium Cup', description: '300 mL', volumeMl: 300, multiplier: 1.0, isDefault: true },
      { name: 'Large Cup', description: '450 mL', volumeMl: 450, multiplier: 1.5, isDefault: false },
    ],
  },
  {
    category: FoodCategory.BEVERAGE_COFFEE_TEA,
    allowedPortions: [
      { name: 'Small Cup', description: '150 mL', volumeMl: 150, multiplier: 0.625, isDefault: false },
      { name: 'Medium Cup', description: '240 mL', volumeMl: 240, multiplier: 1.0, isDefault: true },
      { name: 'Large Mug', description: '350 mL', volumeMl: 350, multiplier: 1.458, isDefault: false },
    ],
  },
  {
    category: FoodCategory.BEVERAGE_MILK,
    allowedPortions: [
      { name: 'Glass', description: '200 mL', volumeMl: 200, multiplier: 0.833, isDefault: false },
      { name: 'Cup', description: '240 mL', volumeMl: 240, multiplier: 1.0, isDefault: true },
    ],
  },
  {
    category: FoodCategory.BEVERAGE_SOFT_DRINK,
    allowedPortions: [
      { name: 'Can', description: '330 mL', volumeMl: 330, multiplier: 1.0, isDefault: true },
      { name: 'Bottle', description: '500 mL', volumeMl: 500, multiplier: 1.515, isDefault: false },
      { name: 'Glass', description: '250 mL', volumeMl: 250, multiplier: 0.758, isDefault: false },
    ],
  },

  // Soups & Stews
  {
    category: FoodCategory.SOUP_THIN,
    allowedPortions: [
      { name: 'Small Bowl', description: '200 mL', volumeMl: 200, multiplier: 0.667, isDefault: false },
      { name: 'Medium Bowl', description: '300 mL', volumeMl: 300, multiplier: 1.0, isDefault: true },
      { name: 'Large Bowl', description: '400 mL', volumeMl: 400, multiplier: 1.333, isDefault: false },
      { name: 'Cup', description: '240 mL', volumeMl: 240, multiplier: 0.8, isDefault: false },
    ],
  },
  {
    category: FoodCategory.SOUP_THICK,
    allowedPortions: [
      { name: 'Small Bowl', description: '250 g', weightG: 250, multiplier: 0.714, isDefault: false },
      { name: 'Medium Bowl', description: '350 g', weightG: 350, multiplier: 1.0, isDefault: true },
      { name: 'Large Bowl', description: '450 g', weightG: 450, multiplier: 1.286, isDefault: false },
    ],
  },
  {
    category: FoodCategory.STEW,
    allowedPortions: [
      { name: 'Small Bowl', description: '250 g', weightG: 250, multiplier: 0.714, isDefault: false },
      { name: 'Medium Bowl', description: '350 g', weightG: 350, multiplier: 1.0, isDefault: true },
      { name: 'Large Bowl', description: '450 g', weightG: 450, multiplier: 1.286, isDefault: false },
    ],
  },
  {
    category: FoodCategory.BROTH,
    allowedPortions: [
      { name: 'Cup', description: '240 mL', volumeMl: 240, multiplier: 0.8, isDefault: false },
      { name: 'Bowl', description: '300 mL', volumeMl: 300, multiplier: 1.0, isDefault: true },
    ],
  },

  // Grains & Starches
  {
    category: FoodCategory.CEREAL_DRY,
    allowedPortions: [
      { name: 'Small Bowl', description: '30 g', weightG: 30, multiplier: 0.6, isDefault: false },
      { name: 'Medium Bowl', description: '50 g', weightG: 50, multiplier: 1.0, isDefault: true },
      { name: 'Large Bowl', description: '60 g', weightG: 60, multiplier: 1.2, isDefault: false },
    ],
  },
  {
    category: FoodCategory.CEREAL_COOKED,
    allowedPortions: [
      { name: 'Small Bowl', description: '150 g', weightG: 150, multiplier: 0.75, isDefault: false },
      { name: 'Medium Bowl', description: '200 g', weightG: 200, multiplier: 1.0, isDefault: true },
      { name: 'Large Bowl', description: '250 g', weightG: 250, multiplier: 1.25, isDefault: false },
    ],
  },
  {
    category: FoodCategory.RICE_COOKED,
    allowedPortions: [
      { name: '½ Cup', description: '75 g', weightG: 75, multiplier: 0.5, isDefault: false },
      { name: '¾ Cup', description: '110 g', weightG: 110, multiplier: 0.733, isDefault: false },
      { name: '1 Cup', description: '150 g', weightG: 150, multiplier: 1.0, isDefault: true },
    ],
  },
  {
    category: FoodCategory.PASTA_COOKED,
    allowedPortions: [
      { name: '½ Cup', description: '70 g', weightG: 70, multiplier: 0.5, isDefault: false },
      { name: '¾ Cup', description: '105 g', weightG: 105, multiplier: 0.75, isDefault: false },
      { name: '1 Cup', description: '140 g', weightG: 140, multiplier: 1.0, isDefault: true },
    ],
  },
  {
    category: FoodCategory.QUINOA_COOKED,
    allowedPortions: [
      { name: '½ Cup', description: '90 g', weightG: 90, multiplier: 0.5, isDefault: false },
      { name: '¾ Cup', description: '135 g', weightG: 135, multiplier: 0.75, isDefault: false },
      { name: '1 Cup', description: '180 g', weightG: 180, multiplier: 1.0, isDefault: true },
    ],
  },
  {
    category: FoodCategory.BREAD,
    allowedPortions: [
      { name: '½ Slice', description: '15-20 g', weightG: 17.5, multiplier: 0.5, isDefault: false },
      { name: '1 Slice', description: '30-40 g', weightG: 35, multiplier: 1.0, isDefault: true },
      { name: '2 Slices', description: '60-80 g', weightG: 70, multiplier: 2.0, isDefault: false },
    ],
  },
  {
    category: FoodCategory.ROLLS_BAGELS,
    allowedPortions: [
      { name: '½ Piece', description: '25-50 g', weightG: 37.5, multiplier: 0.5, isDefault: false },
      { name: '1 Piece', description: '50-100 g', weightG: 75, multiplier: 1.0, isDefault: true },
    ],
  },

  // Protein Foods
  {
    category: FoodCategory.MEAT_COOKED,
    allowedPortions: [
      { name: 'Small', description: '70 g (2.5 oz)', weightG: 70, multiplier: 0.7, isDefault: false },
      { name: 'Medium', description: '100 g (3.5 oz)', weightG: 100, multiplier: 1.0, isDefault: true },
      { name: 'Large', description: '140 g (5 oz)', weightG: 140, multiplier: 1.4, isDefault: false },
      { name: 'Palm-size', description: '~100 g', weightG: 100, multiplier: 1.0, isDefault: false },
    ],
  },
  {
    category: FoodCategory.POULTRY_COOKED,
    allowedPortions: [
      { name: 'Small', description: '85 g (3 oz)', weightG: 85, multiplier: 0.739, isDefault: false },
      { name: 'Medium', description: '115 g (4 oz)', weightG: 115, multiplier: 1.0, isDefault: true },
      { name: 'Large', description: '140 g (5 oz)', weightG: 140, multiplier: 1.217, isDefault: false },
    ],
  },
  {
    category: FoodCategory.FISH_SEAFOOD,
    allowedPortions: [
      { name: 'Small', description: '85 g (3 oz)', weightG: 85, multiplier: 0.739, isDefault: false },
      { name: 'Medium', description: '115 g (4 oz)', weightG: 115, multiplier: 1.0, isDefault: true },
      { name: 'Large', description: '170 g (6 oz)', weightG: 170, multiplier: 1.478, isDefault: false },
    ],
  },
  {
    category: FoodCategory.EGGS,
    allowedPortions: [
      { name: '1 Medium', description: '44 g', weightG: 44, multiplier: 0.88, isDefault: false },
      { name: '1 Large', description: '50 g', weightG: 50, multiplier: 1.0, isDefault: true },
      { name: '1 Extra Large', description: '56 g', weightG: 56, multiplier: 1.12, isDefault: false },
      { name: '2 Large', description: '100 g', weightG: 100, multiplier: 2.0, isDefault: false },
    ],
  },
  {
    category: FoodCategory.TOFU_SOY,
    allowedPortions: [
      { name: '½ Cup', description: '85 g', weightG: 85, multiplier: 0.515, isDefault: false },
      { name: '¾ Cup', description: '125 g', weightG: 125, multiplier: 0.758, isDefault: false },
      { name: '1 Cup', description: '165 g', weightG: 165, multiplier: 1.0, isDefault: true },
    ],
  },
  {
    category: FoodCategory.BEANS_LEGUMES,
    allowedPortions: [
      { name: '½ Cup', description: '85 g', weightG: 85, multiplier: 0.5, isDefault: false },
      { name: '¾ Cup', description: '130 g', weightG: 130, multiplier: 0.765, isDefault: false },
      { name: '1 Cup', description: '170 g', weightG: 170, multiplier: 1.0, isDefault: true },
    ],
  },
  {
    category: FoodCategory.NUTS_SEEDS,
    allowedPortions: [
      { name: 'Small Handful', description: '15 g', weightG: 15, multiplier: 0.5, isDefault: false },
      { name: 'Handful', description: '30 g', weightG: 30, multiplier: 1.0, isDefault: true },
      { name: 'Large Handful', description: '45 g', weightG: 45, multiplier: 1.5, isDefault: false },
      { name: '¼ Cup', description: '30 g', weightG: 30, multiplier: 1.0, isDefault: false },
    ],
  },

  // Dairy Products
  {
    category: FoodCategory.MILK_DAIRY,
    allowedPortions: [
      { name: 'Glass', description: '200 mL', volumeMl: 200, multiplier: 0.833, isDefault: false },
      { name: 'Cup', description: '240 mL', volumeMl: 240, multiplier: 1.0, isDefault: true },
    ],
  },
  {
    category: FoodCategory.YOGURT,
    allowedPortions: [
      { name: 'Container', description: '150 g', weightG: 150, multiplier: 0.625, isDefault: false },
      { name: 'Large Container', description: '200 g', weightG: 200, multiplier: 0.833, isDefault: false },
      { name: 'Cup', description: '240 g', weightG: 240, multiplier: 1.0, isDefault: true },
    ],
  },
  {
    category: FoodCategory.CHEESE_HARD,
    allowedPortions: [
      { name: 'Slice', description: '20 g', weightG: 20, multiplier: 0.667, isDefault: false },
      { name: 'Matchbox', description: '30 g', weightG: 30, multiplier: 1.0, isDefault: true },
      { name: '½ Cup Shredded', description: '60 g', weightG: 60, multiplier: 2.0, isDefault: false },
    ],
  },
  {
    category: FoodCategory.CHEESE_SOFT,
    allowedPortions: [
      { name: '½ Cup', description: '120 g', weightG: 120, multiplier: 0.5, isDefault: false },
      { name: '1 Cup', description: '240 g', weightG: 240, multiplier: 1.0, isDefault: true },
    ],
  },
  {
    category: FoodCategory.ICE_CREAM,
    allowedPortions: [
      { name: '½ Cup', description: '70 g', weightG: 70, multiplier: 0.7, isDefault: false },
      { name: 'Scoop', description: '85 g', weightG: 85, multiplier: 0.85, isDefault: false },
      { name: '1 Cup', description: '100 g', weightG: 100, multiplier: 1.0, isDefault: true },
    ],
  },

  // Fruits & Vegetables
  {
    category: FoodCategory.FRUIT_WHOLE,
    allowedPortions: [
      { name: '1 Small', description: '100 g', weightG: 100, multiplier: 0.667, isDefault: false },
      { name: '1 Medium', description: '150 g', weightG: 150, multiplier: 1.0, isDefault: true },
      { name: '1 Large', description: '200 g', weightG: 200, multiplier: 1.333, isDefault: false },
    ],
  },
  {
    category: FoodCategory.FRUIT_BERRIES,
    allowedPortions: [
      { name: '½ Cup', description: '75 g', weightG: 75, multiplier: 0.5, isDefault: false },
      { name: '¾ Cup', description: '110 g', weightG: 110, multiplier: 0.733, isDefault: false },
      { name: '1 Cup', description: '150 g', weightG: 150, multiplier: 1.0, isDefault: true },
      { name: 'Handful', description: '75 g', weightG: 75, multiplier: 0.5, isDefault: false },
    ],
  },
  {
    category: FoodCategory.FRUIT_CHOPPED,
    allowedPortions: [
      { name: '½ Cup', description: '80 g', weightG: 80, multiplier: 0.5, isDefault: false },
      { name: '¾ Cup', description: '120 g', weightG: 120, multiplier: 0.75, isDefault: false },
      { name: '1 Cup', description: '160 g', weightG: 160, multiplier: 1.0, isDefault: true },
    ],
  },
  {
    category: FoodCategory.FRUIT_DRIED,
    allowedPortions: [
      { name: 'Small Handful', description: '30 g', weightG: 30, multiplier: 0.75, isDefault: false },
      { name: 'Handful', description: '40 g', weightG: 40, multiplier: 1.0, isDefault: true },
      { name: '¼ Cup', description: '40 g', weightG: 40, multiplier: 1.0, isDefault: false },
    ],
  },
  {
    category: FoodCategory.VEGETABLE_RAW_LEAFY,
    allowedPortions: [
      { name: 'Cup (loose)', description: '30 g', weightG: 30, multiplier: 0.6, isDefault: false },
      { name: 'Handful', description: '50 g', weightG: 50, multiplier: 1.0, isDefault: true },
    ],
  },
  {
    category: FoodCategory.VEGETABLE_COOKED,
    allowedPortions: [
      { name: '½ Cup', description: '75 g', weightG: 75, multiplier: 0.5, isDefault: false },
      { name: '¾ Cup', description: '110 g', weightG: 110, multiplier: 0.733, isDefault: false },
      { name: '1 Cup', description: '150 g', weightG: 150, multiplier: 1.0, isDefault: true },
    ],
  },
  {
    category: FoodCategory.POTATO,
    allowedPortions: [
      { name: 'Small', description: '100 g', weightG: 100, multiplier: 0.667, isDefault: false },
      { name: 'Medium', description: '150 g', weightG: 150, multiplier: 1.0, isDefault: true },
      { name: 'Large', description: '200 g', weightG: 200, multiplier: 1.333, isDefault: false },
    ],
  },

  // Fats & Oils
  {
    category: FoodCategory.OIL_LIQUID,
    allowedPortions: [
      { name: 'Teaspoon', description: '5 mL (~4.6 g)', volumeMl: 5, multiplier: 0.333, isDefault: false },
      { name: 'Tablespoon', description: '15 mL (~14 g)', volumeMl: 15, multiplier: 1.0, isDefault: true },
      { name: '¼ Cup', description: '60 mL', volumeMl: 60, multiplier: 4.0, isDefault: false },
    ],
  },
  {
    category: FoodCategory.BUTTER_SPREAD,
    allowedPortions: [
      { name: 'Teaspoon', description: '5 g', weightG: 5, multiplier: 0.5, isDefault: false },
      { name: 'Tablespoon', description: '10 g', weightG: 10, multiplier: 1.0, isDefault: true },
      { name: 'Pat', description: '5 g', weightG: 5, multiplier: 0.5, isDefault: false },
    ],
  },

  // Desserts & Sweets
  {
    category: FoodCategory.PUDDING,
    allowedPortions: [
      { name: 'Small Cup', description: '100 g', weightG: 100, multiplier: 0.667, isDefault: false },
      { name: 'Medium Cup', description: '150 g', weightG: 150, multiplier: 1.0, isDefault: true },
      { name: 'Large Cup', description: '200 g', weightG: 200, multiplier: 1.333, isDefault: false },
    ],
  },
  {
    category: FoodCategory.MOUSSE,
    allowedPortions: [
      { name: 'Small Cup', description: '80 g', weightG: 80, multiplier: 0.8, isDefault: false },
      { name: 'Medium Cup', description: '100 g', weightG: 100, multiplier: 1.0, isDefault: true },
      { name: 'Large Cup', description: '150 g', weightG: 150, multiplier: 1.5, isDefault: false },
    ],
  },

  // Sauces & Mixed Dishes
  {
    category: FoodCategory.SAUCE_PASTA,
    allowedPortions: [
      { name: '½ Cup', description: '120 g', weightG: 120, multiplier: 0.5, isDefault: false },
      { name: '¾ Cup', description: '180 g', weightG: 180, multiplier: 0.75, isDefault: false },
      { name: '1 Cup', description: '240 g', weightG: 240, multiplier: 1.0, isDefault: true },
    ],
  },
  {
    category: FoodCategory.CURRY_SAUCED_DISH,
    allowedPortions: [
      { name: 'Small Bowl', description: '250 g', weightG: 250, multiplier: 0.714, isDefault: false },
      { name: 'Medium Bowl', description: '350 g', weightG: 350, multiplier: 1.0, isDefault: true },
      { name: 'Large Bowl', description: '450 g', weightG: 450, multiplier: 1.286, isDefault: false },
    ],
  },

  // Mixed/Other
  {
    category: FoodCategory.MIXED_DISH,
    allowedPortions: [
      { name: 'Small Plate', description: '200 g', weightG: 200, multiplier: 0.8, isDefault: false },
      { name: 'Medium Plate', description: '250 g', weightG: 250, multiplier: 1.0, isDefault: true },
      { name: 'Large Plate', description: '350 g', weightG: 350, multiplier: 1.4, isDefault: false },
    ],
  },
  {
    category: FoodCategory.OTHER,
    allowedPortions: [
      { name: 'Small Serving', description: '100 g', weightG: 100, multiplier: 0.667, isDefault: false },
      { name: 'Medium Serving', description: '150 g', weightG: 150, multiplier: 1.0, isDefault: true },
      { name: 'Large Serving', description: '200 g', weightG: 200, multiplier: 1.333, isDefault: false },
    ],
  },
];

/**
 * Get recommended portion sizes for a food category
 */
export function getPortionSizesForCategory(category: FoodCategory): CategoryPortionSizes | undefined {
  return CATEGORY_PORTION_SIZES.find(c => c.category === category);
}

/**
 * Get density reference for a food category
 */
export function getDensityForCategory(category: FoodCategory): DensityReference | undefined {
  return DENSITY_REFERENCES.find(d => d.category === category);
}

/**
 * Get measurement priority for a food category
 */
export function getMeasurementPriorityForCategory(category: FoodCategory): CategoryMeasurementPriority | undefined {
  return MEASUREMENT_PRIORITIES.find(m => m.category === category);
}

/**
 * Convert volume to weight using category-specific density
 */
export function convertVolumeToWeight(volumeMl: number, category: FoodCategory): number | null {
  const density = getDensityForCategory(category);
  if (!density) return null;

  const densityValue = density.densityRange
    ? (density.densityRange.min + density.densityRange.max) / 2
    : density.densityGPerMl;

  return volumeMl * densityValue;
}

/**
 * Convert weight to volume using category-specific density
 */
export function convertWeightToVolume(weightG: number, category: FoodCategory): number | null {
  const density = getDensityForCategory(category);
  if (!density) return null;

  const densityValue = density.densityRange
    ? (density.densityRange.min + density.densityRange.max) / 2
    : density.densityGPerMl;

  return weightG / densityValue;
}

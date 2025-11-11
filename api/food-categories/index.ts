import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { FoodCategory } from '../../types/foodCategory';

/**
 * GET /api/food-categories
 *
 * Returns list of all food categories with their primary (recommended) portion sizes
 * for use in custom recipe creation UX
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // Fetch all food categories with their portion sizes
    const { data: foodCategories, error: categoriesError } = await supabase
      .from('food_categories')
      .select('id, code, name, category_group')
      .order('category_group', { ascending: true })
      .order('name', { ascending: true });

    if (categoriesError) {
      throw categoriesError;
    }

    // Fetch portion sizes
    const { data: portionSizes, error: portionsError } = await supabase
      .from('portion_sizes')
      .select('id, name, description, food_category_id, volume_ml, weight_g, multiplier, is_default')
      .not('food_category_id', 'is', null)
      .order('is_default', { ascending: false });

    if (portionsError) {
      throw portionsError;
    }

    // Group portion sizes by food category ID
    const portionsByCategoryId = new Map<string, any[]>();
    portionSizes?.forEach(portion => {
      const categoryId = portion.food_category_id;
      if (!portionsByCategoryId.has(categoryId)) {
        portionsByCategoryId.set(categoryId, []);
      }
      portionsByCategoryId.get(categoryId)!.push({
        id: portion.id,
        name: portion.name,
        description: portion.description,
        weightG: portion.weight_g,
        volumeMl: portion.volume_ml,
        multiplier: portion.multiplier,
        isDefault: portion.is_default
      });
    });

    // Transform category data to UX-friendly format
    const categories = foodCategories?.map(category => {
      const portions = portionsByCategoryId.get(category.id) || [];
      const primaryPortions = portions.filter(p => p.isDefault);

      return {
        id: category.id,
        code: category.code,
        name: category.name,
        group: category.category_group,
        primaryPortions: primaryPortions
      };
    }) || [];

    // Group categories for better UX
    const grouped = {
      beverages: categories.filter(c => c.group === 'Beverages'),
      soups: categories.filter(c => c.group === 'Soups & Stews'),
      grains: categories.filter(c => c.group === 'Grains & Starches'),
      proteins: categories.filter(c => c.group === 'Protein Foods'),
      dairy: categories.filter(c => c.group === 'Dairy Products'),
      fruits: categories.filter(c => c.group === 'Fruits & Vegetables'),
      fats: categories.filter(c => c.group === 'Fats & Oils'),
      sauces: categories.filter(c => c.group === 'Sauces & Mixed Dishes'),
      desserts: categories.filter(c => c.group === 'Desserts'),
      other: categories.filter(c => c.group === 'Other')
    };

    return res.status(200).json({
      success: true,
      categories: grouped,
      allCategories: categories
    });

  } catch (error: any) {
    console.error('Error fetching food categories:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch food categories'
    });
  }
}

/**
 * Format category enum to human-readable label
 */
function formatCategoryLabel(category: FoodCategory): string {
  const labels: Record<string, string> = {
    // Beverages
    [FoodCategory.BEVERAGE_WATER]: 'Water & Unsweetened Beverages',
    [FoodCategory.BEVERAGE_JUICE]: 'Fruit & Vegetable Juices',
    [FoodCategory.BEVERAGE_MILK]: 'Milk & Dairy Drinks',
    [FoodCategory.BEVERAGE_SMOOTHIE]: 'Smoothies & Shakes',
    [FoodCategory.BEVERAGE_COFFEE_TEA]: 'Coffee & Tea',
    [FoodCategory.BEVERAGE_SOFT_DRINK]: 'Soft Drinks & Sweetened Beverages',

    // Soups & Stews
    [FoodCategory.SOUP_THIN]: 'Thin Soups (Broth-based)',
    [FoodCategory.SOUP_THICK]: 'Thick Soups (Cream/Pureed)',
    [FoodCategory.STEW]: 'Stews & Chunky Dishes',
    [FoodCategory.BROTH]: 'Broths & Consommé',

    // Grains & Starches
    [FoodCategory.CEREAL_DRY]: 'Dry Breakfast Cereal',
    [FoodCategory.CEREAL_COOKED]: 'Cooked Oatmeal/Porridge',
    [FoodCategory.RICE_COOKED]: 'Cooked Rice',
    [FoodCategory.PASTA_COOKED]: 'Cooked Pasta',
    [FoodCategory.QUINOA_COOKED]: 'Cooked Quinoa/Ancient Grains',
    [FoodCategory.BREAD]: 'Bread',
    [FoodCategory.ROLLS_BAGELS]: 'Rolls, Bagels, Buns',

    // Protein Foods
    [FoodCategory.MEAT_COOKED]: 'Cooked Meat (Beef, Pork, Lamb)',
    [FoodCategory.POULTRY_COOKED]: 'Cooked Poultry (Chicken, Turkey)',
    [FoodCategory.FISH_SEAFOOD]: 'Fish & Seafood',
    [FoodCategory.EGGS]: 'Eggs',
    [FoodCategory.TOFU_SOY]: 'Tofu & Soy Products',
    [FoodCategory.BEANS_LEGUMES]: 'Beans & Legumes (Cooked)',
    [FoodCategory.NUTS_SEEDS]: 'Nuts & Seeds',

    // Dairy Products
    [FoodCategory.MILK_DAIRY]: 'Milk (All Types)',
    [FoodCategory.YOGURT]: 'Yogurt',
    [FoodCategory.CHEESE_HARD]: 'Hard Cheese (Cheddar, Swiss)',
    [FoodCategory.CHEESE_SOFT]: 'Soft Cheese (Ricotta, Cottage)',
    [FoodCategory.ICE_CREAM]: 'Ice Cream',

    // Fruits & Vegetables
    [FoodCategory.FRUIT_WHOLE]: 'Fresh Fruit (Whole)',
    [FoodCategory.FRUIT_BERRIES]: 'Berries',
    [FoodCategory.FRUIT_CHOPPED]: 'Cut/Chopped Fruit',
    [FoodCategory.FRUIT_DRIED]: 'Dried Fruit',
    [FoodCategory.VEGETABLE_RAW_LEAFY]: 'Raw Leafy Greens',
    [FoodCategory.VEGETABLE_COOKED]: 'Cooked Vegetables',
    [FoodCategory.POTATO]: 'Potatoes',

    // Fats & Oils
    [FoodCategory.OIL_LIQUID]: 'Liquid Cooking Oils',
    [FoodCategory.BUTTER_SPREAD]: 'Butter/Margarine Spreads',

    // Sauces & Mixed Dishes
    [FoodCategory.SAUCE_PASTA]: 'Pasta Sauce',
    [FoodCategory.CURRY_SAUCED_DISH]: 'Curry & Sauced Dishes',
    [FoodCategory.PUDDING]: 'Pudding',
    [FoodCategory.MOUSSE]: 'Mousse',

    // Mixed/Other
    [FoodCategory.MIXED_DISH]: 'Mixed Dish',
    [FoodCategory.OTHER]: 'Other'
  };

  return labels[category] || category;
}

/**
 * Get category group for organization
 */
function getCategoryGroup(category: FoodCategory): string {
  if (category.startsWith('beverage_')) return 'Beverages';
  if (category.startsWith('soup_') || category === 'stew' || category === 'broth') return 'Soups & Stews';
  if (category.includes('cereal') || category.includes('rice') || category.includes('pasta') ||
      category.includes('quinoa') || category === 'bread' || category.includes('rolls')) return 'Grains & Starches';
  if (category.includes('meat') || category.includes('poultry') || category.includes('fish') ||
      category === 'eggs' || category.includes('tofu') || category.includes('beans') ||
      category.includes('nuts')) return 'Protein Foods';
  if (category.includes('milk') || category === 'yogurt' || category.includes('cheese') ||
      category === 'ice_cream') return 'Dairy Products';
  if (category.includes('fruit') || category.includes('vegetable') || category === 'potato') return 'Fruits & Vegetables';
  if (category.includes('oil') || category.includes('butter')) return 'Fats & Oils';
  if (category === FoodCategory.PUDDING || category === FoodCategory.MOUSSE) return 'Desserts';
  if (category.includes('sauce') || category.includes('curry') || category === 'mixed_dish') return 'Sauces & Mixed Dishes';
  return 'Other';
}

export default requireAuth(handler);

import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { FoodCategory, CATEGORY_PORTION_SIZES } from '@/types/foodCategory';

/**
 * GET /api/food-categories
 *
 * Returns list of all food categories with their primary (recommended) portion sizes
 * for use in custom recipe creation UX
 */
export async function GET() {
  try {
    // Transform category data to UX-friendly format
    const categories = CATEGORY_PORTION_SIZES.map(cat => {
      // Get only default/primary portions
      const primaryPortions = cat.allowedPortions.filter(p => p.isDefault);

      return {
        value: cat.category,
        label: formatCategoryLabel(cat.category),
        group: getCategoryGroup(cat.category),
        primaryPortions: primaryPortions.map(p => ({
          name: p.name,
          description: p.description,
          weightG: p.weightG,
          volumeMl: p.volumeMl,
          multiplier: p.multiplier
        }))
      };
    });

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

    return NextResponse.json({
      success: true,
      categories: grouped,
      allCategories: categories
    });

  } catch (error: any) {
    console.error('Error fetching food categories:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch food categories'
      },
      { status: 500 }
    );
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
  if (category.includes('sauce') || category.includes('curry') || category === 'pudding' ||
      category === 'mousse' || category === 'mixed_dish') return 'Sauces & Mixed Dishes';
  if (category === 'pudding' || category === 'mousse') return 'Desserts';
  return 'Other';
}

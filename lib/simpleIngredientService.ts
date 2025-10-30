/**
 * Simple ingredient service - fetches from database with in-memory caching
 * Provides instant results for common ingredients (fruits, vegetables, proteins, etc.)
 * 
 * Database includes both RAW and COOKED variants:
 * - Raw: banana, broccoli, mushroom, etc.
 * - Sautéed: sauteed mushroom, sauteed broccoli, sauteed spinach, etc.
 * - Grilled: grilled mushroom, grilled broccoli, grilled bell pepper, etc.
 * - Stir-fry: stir-fry mushroom, stir-fry broccoli, stir-fry zucchini, etc.
 * 
 * Migration: database/migrations/072_add_cooked_vegetable_variants.sql
 */

import { supabase } from './supabase';

interface SimpleIngredient {
  id?: string; // UUID from database
  name: string;
  servingSize: { quantity: number; unit: string };
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar?: number;
  sodium?: number;
  category: string;
  // Micros (optional)
  vitaminC?: number;
  vitaminA?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
  // Labels
  healthLabels?: string[];
  dietLabels?: string[];
  allergens?: string[];
}

const COMMON_INGREDIENTS: SimpleIngredient[] = [
  // ===== FRUITS =====
  // Common Western Fruits
  { name: 'banana', servingSize: { quantity: 1, unit: 'medium' }, calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3.1, sugar: 14.4, sodium: 1, vitaminC: 10.3, vitaminA: 76, potassium: 422, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'apple', servingSize: { quantity: 1, unit: 'medium' }, calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4.4, sugar: 19, sodium: 2, vitaminC: 8.4, vitaminA: 98, potassium: 195, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'orange', servingSize: { quantity: 1, unit: 'medium' }, calories: 62, protein: 1.2, carbs: 15, fat: 0.2, fiber: 3.1, sugar: 12, sodium: 0, vitaminC: 69.7, vitaminA: 295, potassium: 237, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'avocado', servingSize: { quantity: 1, unit: 'medium' }, calories: 234, protein: 2.9, carbs: 12.8, fat: 21.4, fiber: 10, sugar: 1, sodium: 10, vitaminC: 17.4, vitaminA: 219, potassium: 689, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'low-carb', 'high-fiber'], dietLabels: ['vegan', 'vegetarian', 'keto'], allergens: [] },
  { name: 'strawberry', servingSize: { quantity: 1, unit: 'cup' }, calories: 49, protein: 1, carbs: 12, fat: 0.5, fiber: 3, sugar: 7.4, sodium: 2, vitaminC: 89.4, vitaminA: 18, potassium: 233, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'blueberry', servingSize: { quantity: 1, unit: 'cup' }, calories: 84, protein: 1.1, carbs: 21, fat: 0.5, fiber: 3.6, sugar: 15, sodium: 1, vitaminC: 14.4, vitaminA: 80, potassium: 114, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'raspberry', servingSize: { quantity: 1, unit: 'cup' }, calories: 64, protein: 1.5, carbs: 15, fat: 0.8, fiber: 8, sugar: 5.4, sodium: 1, vitaminC: 32.2, vitaminA: 41, potassium: 186, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-fiber'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'mango', servingSize: { quantity: 1, unit: 'cup' }, calories: 99, protein: 1.4, carbs: 25, fat: 0.6, fiber: 2.6, sugar: 22.5, sodium: 2, vitaminC: 60.1, vitaminA: 1262, potassium: 277, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'watermelon', servingSize: { quantity: 1, unit: 'cup' }, calories: 46, protein: 0.9, carbs: 11.5, fat: 0.2, fiber: 0.6, sugar: 9.4, sodium: 2, vitaminC: 12.3, vitaminA: 865, potassium: 170, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'pineapple', servingSize: { quantity: 1, unit: 'cup' }, calories: 82, protein: 0.9, carbs: 22, fat: 0.2, fiber: 2.3, sugar: 16, sodium: 2, vitaminC: 78.9, vitaminA: 96, potassium: 180, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'grape', servingSize: { quantity: 1, unit: 'cup' }, calories: 104, protein: 1.1, carbs: 27, fat: 0.2, fiber: 1.4, sugar: 23, sodium: 3, vitaminC: 16.3, vitaminA: 100, potassium: 288, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'peach', servingSize: { quantity: 1, unit: 'medium' }, calories: 59, protein: 1.4, carbs: 14, fat: 0.4, fiber: 2.3, sugar: 13, sodium: 0, vitaminC: 10.2, vitaminA: 489, potassium: 285, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'pear', servingSize: { quantity: 1, unit: 'medium' }, calories: 101, protein: 0.6, carbs: 27, fat: 0.2, fiber: 5.5, sugar: 17, sodium: 2, vitaminC: 7.5, vitaminA: 41, potassium: 206, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'kiwi', servingSize: { quantity: 1, unit: 'medium' }, calories: 42, protein: 0.8, carbs: 10, fat: 0.4, fiber: 2.1, sugar: 6, sodium: 2, vitaminC: 64, vitaminA: 60, potassium: 215, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'lemon', servingSize: { quantity: 1, unit: 'medium' }, calories: 17, protein: 0.6, carbs: 5.4, fat: 0.2, fiber: 1.6, sugar: 1.5, sodium: 1, vitaminC: 30.7, vitaminA: 11, potassium: 80, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'plum', servingSize: { quantity: 1, unit: 'medium' }, calories: 30, protein: 0.5, carbs: 7.5, fat: 0.2, fiber: 0.9, sugar: 6.5, sodium: 0, vitaminC: 6.3, vitaminA: 228, potassium: 104, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'cherry', servingSize: { quantity: 1, unit: 'cup' }, calories: 87, protein: 1.5, carbs: 22, fat: 0.3, fiber: 2.9, sugar: 18, sodium: 0, vitaminC: 9.7, vitaminA: 88, potassium: 306, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'cantaloupe', servingSize: { quantity: 1, unit: 'cup' }, calories: 53, protein: 1.3, carbs: 13, fat: 0.3, fiber: 1.4, sugar: 12, sodium: 25, vitaminC: 57.3, vitaminA: 5276, potassium: 417, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  
  // Indian Fruits
  { name: 'guava', servingSize: { quantity: 1, unit: 'medium' }, calories: 37, protein: 1.4, carbs: 7.9, fat: 0.5, fiber: 3, sugar: 5, sodium: 1, vitaminC: 125.6, vitaminA: 311, potassium: 229, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'papaya', servingSize: { quantity: 1, unit: 'cup' }, calories: 62, protein: 0.7, carbs: 16, fat: 0.4, fiber: 2.5, sugar: 11, sodium: 12, vitaminC: 86.5, vitaminA: 1531, potassium: 360, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'pomegranate', servingSize: { quantity: 1, unit: 'medium' }, calories: 234, protein: 4.7, carbs: 52, fat: 3.3, fiber: 11.3, sugar: 38, sodium: 8, vitaminC: 28.8, vitaminA: 0, potassium: 666, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-fiber'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'coconut', servingSize: { quantity: 100, unit: 'g' }, calories: 354, protein: 3.3, carbs: 15.2, fat: 33.5, fiber: 9, sugar: 6.2, sodium: 20, vitaminC: 3.3, vitaminA: 0, calcium: 14, iron: 2.4, potassium: 356, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-fiber'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  
  // ===== VEGETABLES =====
  // Common Western Vegetables
  { name: 'broccoli', servingSize: { quantity: 100, unit: 'g' }, calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sugar: 1.7, sodium: 33, vitaminC: 89.2, vitaminA: 623, calcium: 47, iron: 0.7, potassium: 316, category: 'vegetable' },
  { name: 'spinach', servingSize: { quantity: 1, unit: 'cup' }, calories: 7, protein: 0.9, carbs: 1.1, fat: 0.1, fiber: 0.7, sugar: 0.1, sodium: 24, vitaminC: 8.4, vitaminA: 2813, calcium: 30, iron: 0.8, potassium: 167, category: 'vegetable' },
  { name: 'carrot', servingSize: { quantity: 1, unit: 'medium' }, calories: 25, protein: 0.6, carbs: 6, fat: 0.1, fiber: 1.7, sugar: 3, sodium: 42, vitaminC: 3.6, vitaminA: 5096, calcium: 20, iron: 0.2, potassium: 195, category: 'vegetable' },
  { name: 'tomato', servingSize: { quantity: 1, unit: 'medium' }, calories: 22, protein: 1.1, carbs: 4.8, fat: 0.2, fiber: 1.5, sugar: 3.2, sodium: 6, vitaminC: 16.9, vitaminA: 1025, calcium: 12, iron: 0.3, potassium: 292, category: 'vegetable' },
  { name: 'cucumber', servingSize: { quantity: 1, unit: 'medium' }, calories: 45, protein: 2, carbs: 11, fat: 0.3, fiber: 1.5, sugar: 5, sodium: 6, vitaminC: 8.4, vitaminA: 316, calcium: 48, potassium: 442, category: 'vegetable' },
  { name: 'bell pepper', servingSize: { quantity: 1, unit: 'medium' }, calories: 37, protein: 1.2, carbs: 9, fat: 0.3, fiber: 3.1, sugar: 6, sodium: 5, vitaminC: 152, vitaminA: 3726, calcium: 10, potassium: 251, category: 'vegetable' },
  { name: 'lettuce', servingSize: { quantity: 1, unit: 'cup' }, calories: 5, protein: 0.5, carbs: 1, fat: 0.1, fiber: 0.5, sugar: 0.4, sodium: 10, vitaminC: 2.8, vitaminA: 2665, calcium: 13, potassium: 69, category: 'vegetable' },
  { name: 'kale', servingSize: { quantity: 1, unit: 'cup' }, calories: 33, protein: 2.9, carbs: 6, fat: 0.6, fiber: 2.6, sugar: 1.6, sodium: 29, vitaminC: 80.4, vitaminA: 10302, calcium: 90, iron: 1.1, potassium: 299, category: 'vegetable' },
  { name: 'cauliflower', servingSize: { quantity: 1, unit: 'cup' }, calories: 25, protein: 2, carbs: 5, fat: 0.3, fiber: 2.1, sugar: 2, sodium: 30, vitaminC: 46.4, vitaminA: 16, calcium: 22, potassium: 303, category: 'vegetable' },
  { name: 'zucchini', servingSize: { quantity: 1, unit: 'medium' }, calories: 33, protein: 2.4, carbs: 6, fat: 0.6, fiber: 2, sugar: 5, sodium: 16, vitaminC: 34.9, vitaminA: 392, calcium: 31, potassium: 512, category: 'vegetable' },
  { name: 'sweet potato', servingSize: { quantity: 1, unit: 'medium' }, calories: 103, protein: 2.3, carbs: 24, fat: 0.2, fiber: 3.8, sugar: 7.4, sodium: 41, vitaminC: 22.3, vitaminA: 18869, calcium: 43, potassium: 542, category: 'vegetable' },
  { name: 'asparagus', servingSize: { quantity: 100, unit: 'g' }, calories: 20, protein: 2.2, carbs: 3.9, fat: 0.1, fiber: 2.1, sugar: 1.9, sodium: 2, vitaminC: 5.6, vitaminA: 756, calcium: 24, iron: 2.1, potassium: 202, category: 'vegetable' },
  { name: 'mushroom', servingSize: { quantity: 1, unit: 'cup' }, calories: 21, protein: 3, carbs: 3.1, fat: 0.3, fiber: 1, sugar: 1.9, sodium: 5, vitaminC: 2.1, vitaminA: 0, calcium: 3, iron: 0.5, potassium: 318, category: 'vegetable' },
  { name: 'green beans', servingSize: { quantity: 1, unit: 'cup' }, calories: 31, protein: 1.8, carbs: 7, fat: 0.2, fiber: 2.7, sugar: 3.3, sodium: 6, vitaminC: 12.2, vitaminA: 690, calcium: 37, iron: 1, potassium: 211, category: 'vegetable' },
  { name: 'celery', servingSize: { quantity: 1, unit: 'cup' }, calories: 16, protein: 0.7, carbs: 3, fat: 0.2, fiber: 1.6, sugar: 1.4, sodium: 80, vitaminC: 3.1, vitaminA: 453, calcium: 40, potassium: 263, category: 'vegetable' },
  { name: 'eggplant', servingSize: { quantity: 1, unit: 'cup' }, calories: 20, protein: 0.8, carbs: 4.8, fat: 0.1, fiber: 2.5, sugar: 2.9, sodium: 2, vitaminC: 1.8, vitaminA: 23, calcium: 7, potassium: 188, category: 'vegetable' },
  { name: 'cabbage', servingSize: { quantity: 1, unit: 'cup' }, calories: 22, protein: 1, carbs: 5, fat: 0.1, fiber: 2.2, sugar: 2.9, sodium: 16, vitaminC: 32.6, vitaminA: 87, calcium: 35, potassium: 151, category: 'vegetable' },
  { name: 'brussels sprouts', servingSize: { quantity: 1, unit: 'cup' }, calories: 38, protein: 3, carbs: 8, fat: 0.3, fiber: 3.3, sugar: 1.9, sodium: 22, vitaminC: 74.8, vitaminA: 754, calcium: 37, iron: 1.2, potassium: 342, category: 'vegetable' },
  
  // Indian Vegetables
  { name: 'okra', servingSize: { quantity: 100, unit: 'g' }, calories: 33, protein: 1.9, carbs: 7.5, fat: 0.2, fiber: 3.2, sugar: 1.5, sodium: 7, vitaminC: 23, vitaminA: 375, calcium: 82, iron: 0.6, potassium: 299, category: 'vegetable' },
  { name: 'bitter gourd', servingSize: { quantity: 100, unit: 'g' }, calories: 17, protein: 1, carbs: 3.7, fat: 0.2, fiber: 2.8, sugar: 1.9, sodium: 5, vitaminC: 84, vitaminA: 471, calcium: 19, iron: 0.4, potassium: 296, category: 'vegetable' },
  { name: 'bottle gourd', servingSize: { quantity: 100, unit: 'g' }, calories: 14, protein: 0.6, carbs: 3.4, fat: 0, fiber: 0.5, sugar: 2.5, sodium: 2, vitaminC: 10.1, vitaminA: 16, calcium: 26, potassium: 150, category: 'vegetable' },
  { name: 'ridge gourd', servingSize: { quantity: 100, unit: 'g' }, calories: 20, protein: 1.2, carbs: 4.4, fat: 0.2, fiber: 1.1, sugar: 2.5, sodium: 3, vitaminC: 5.5, vitaminA: 190, calcium: 18, iron: 0.4, potassium: 139, category: 'vegetable' },
  { name: 'drumstick', servingSize: { quantity: 100, unit: 'g' }, calories: 37, protein: 2.1, carbs: 8.5, fat: 0.2, fiber: 3.2, sugar: 2.5, sodium: 42, vitaminC: 141, vitaminA: 74, calcium: 30, iron: 0.4, potassium: 461, category: 'vegetable' },
  { name: 'green chili', servingSize: { quantity: 1, unit: 'medium' }, calories: 18, protein: 0.9, carbs: 4.3, fat: 0.2, fiber: 1.5, sugar: 2.5, sodium: 3, vitaminC: 109, vitaminA: 952, calcium: 8, iron: 0.3, potassium: 153, category: 'vegetable' },
  { name: 'onion', servingSize: { quantity: 1, unit: 'medium' }, calories: 44, protein: 1.2, carbs: 10.3, fat: 0.1, fiber: 1.9, sugar: 4.7, sodium: 4, vitaminC: 8.1, vitaminA: 2, calcium: 26, potassium: 161, category: 'vegetable' },
  { name: 'garlic', servingSize: { quantity: 3, unit: 'cloves' }, calories: 13, protein: 0.6, carbs: 3, fat: 0, fiber: 0.2, sugar: 0.1, sodium: 2, vitaminC: 2.8, vitaminA: 1, calcium: 16, potassium: 36, category: 'vegetable' },
  { name: 'ginger', servingSize: { quantity: 1, unit: 'tbsp' }, calories: 5, protein: 0.1, carbs: 1.1, fat: 0, fiber: 0.1, sugar: 0.1, sodium: 1, vitaminC: 0.4, vitaminA: 0, calcium: 1, potassium: 27, category: 'vegetable' },
  { name: 'potato', servingSize: { quantity: 1, unit: 'medium' }, calories: 164, protein: 4.3, carbs: 37, fat: 0.2, fiber: 2.4, sugar: 1.9, sodium: 13, vitaminC: 42.4, vitaminA: 7, calcium: 26, iron: 1.5, potassium: 897, category: 'vegetable' },
  { name: 'beetroot', servingSize: { quantity: 100, unit: 'g' }, calories: 43, protein: 1.6, carbs: 9.6, fat: 0.2, fiber: 2.8, sugar: 6.8, sodium: 78, vitaminC: 4.9, vitaminA: 33, calcium: 16, iron: 0.8, potassium: 325, category: 'vegetable' },
  { name: 'radish', servingSize: { quantity: 1, unit: 'cup' }, calories: 19, protein: 0.8, carbs: 4, fat: 0.1, fiber: 1.9, sugar: 2.2, sodium: 45, vitaminC: 17.2, vitaminA: 7, calcium: 29, potassium: 270, category: 'vegetable' },
  
  // ===== PROTEINS =====
  // Western Proteins
  { name: 'chicken breast', servingSize: { quantity: 100, unit: 'g' }, calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74, vitaminA: 21, calcium: 15, iron: 1, potassium: 256, category: 'protein' },
  { name: 'chicken thigh', servingSize: { quantity: 100, unit: 'g' }, calories: 209, protein: 26, carbs: 0, fat: 11, fiber: 0, sugar: 0, sodium: 88, vitaminA: 51, calcium: 11, iron: 1.3, potassium: 229, category: 'protein' },
  { name: 'salmon', servingSize: { quantity: 100, unit: 'g' }, calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, sugar: 0, sodium: 59, vitaminA: 149, calcium: 12, iron: 0.8, potassium: 363, category: 'protein' },
  { name: 'tuna', servingSize: { quantity: 100, unit: 'g' }, calories: 144, protein: 23, carbs: 0, fat: 5, fiber: 0, sugar: 0, sodium: 47, vitaminA: 16, calcium: 10, iron: 1.3, potassium: 252, category: 'protein' },
  { name: 'egg', servingSize: { quantity: 1, unit: 'large' }, calories: 72, protein: 6.3, carbs: 0.4, fat: 5, fiber: 0, sugar: 0.2, sodium: 71, vitaminA: 270, calcium: 28, iron: 0.9, potassium: 69, category: 'protein' },
  { name: 'tofu', servingSize: { quantity: 100, unit: 'g' }, calories: 76, protein: 8, carbs: 1.9, fat: 4.8, fiber: 0.3, sugar: 0.7, sodium: 7, vitaminA: 85, calcium: 350, iron: 5.4, potassium: 121, category: 'protein' },
  { name: 'turkey breast', servingSize: { quantity: 100, unit: 'g' }, calories: 135, protein: 30, carbs: 0, fat: 0.7, fiber: 0, sugar: 0, sodium: 55, vitaminA: 0, calcium: 21, iron: 1.4, potassium: 249, category: 'protein' },
  { name: 'shrimp', servingSize: { quantity: 100, unit: 'g' }, calories: 99, protein: 24, carbs: 0.2, fat: 0.3, fiber: 0, sugar: 0, sodium: 111, vitaminA: 180, calcium: 70, iron: 0.5, potassium: 259, category: 'protein' },
  { name: 'cod', servingSize: { quantity: 100, unit: 'g' }, calories: 82, protein: 18, carbs: 0, fat: 0.7, fiber: 0, sugar: 0, sodium: 54, vitaminA: 38, calcium: 16, iron: 0.4, potassium: 413, category: 'protein' },
  { name: 'ground beef', servingSize: { quantity: 100, unit: 'g' }, calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0, sugar: 0, sodium: 75, vitaminA: 0, calcium: 18, iron: 2.6, potassium: 318, category: 'protein' },
  { name: 'pork chop', servingSize: { quantity: 100, unit: 'g' }, calories: 231, protein: 25, carbs: 0, fat: 14, fiber: 0, sugar: 0, sodium: 62, vitaminA: 6, calcium: 23, iron: 0.8, potassium: 423, category: 'protein' },
  { name: 'lamb', servingSize: { quantity: 100, unit: 'g' }, calories: 294, protein: 25, carbs: 0, fat: 21, fiber: 0, sugar: 0, sodium: 72, vitaminA: 0, calcium: 17, iron: 1.8, potassium: 310, category: 'protein' },
  
  // Indian Proteins
  { name: 'paneer', servingSize: { quantity: 100, unit: 'g' }, calories: 265, protein: 18.3, carbs: 1.2, fat: 20.8, fiber: 0, sugar: 1.2, sodium: 18, vitaminA: 790, calcium: 208, iron: 0.2, potassium: 104, category: 'protein', healthLabels: ['vegetarian', 'gluten-free', 'high-protein'], dietLabels: ['vegetarian'], allergens: ['dairy'] },
  { name: 'dal', servingSize: { quantity: 1, unit: 'cup' }, calories: 198, protein: 14.5, carbs: 35, fat: 0.7, fiber: 11.5, sugar: 2.5, sodium: 8, vitaminC: 3.5, vitaminA: 12, calcium: 50, iron: 4.8, potassium: 495, category: 'legume', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-protein', 'high-fiber'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'moong dal', servingSize: { quantity: 1, unit: 'cup' }, calories: 212, protein: 14.2, carbs: 38.7, fat: 0.8, fiber: 15.4, sugar: 2, sodium: 4, vitaminC: 1, vitaminA: 24, calcium: 54, iron: 2.8, potassium: 537, category: 'legume', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-protein', 'high-fiber'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'rajma', servingSize: { quantity: 1, unit: 'cup' }, calories: 225, protein: 15.3, carbs: 40.4, fat: 0.9, fiber: 11.3, sugar: 0.3, sodium: 2, vitaminC: 2.3, vitaminA: 0, calcium: 127, iron: 5.2, potassium: 717, category: 'legume', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-protein', 'high-fiber'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'chana', servingSize: { quantity: 1, unit: 'cup' }, calories: 269, protein: 14.5, carbs: 45, fat: 4.2, fiber: 12.5, sugar: 7.9, sodium: 11, vitaminC: 4, vitaminA: 67, calcium: 80, iron: 4.7, potassium: 477, category: 'legume', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-protein', 'high-fiber'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  
  // ===== GRAINS & CARBS =====
  // Western Grains
  { name: 'rice', servingSize: { quantity: 1, unit: 'cup' }, calories: 206, protein: 4.2, carbs: 45, fat: 0.4, fiber: 0.6, sugar: 0.1, sodium: 2, vitaminC: 0, vitaminA: 0, calcium: 16, iron: 2.8, potassium: 55, category: 'grain' },
  { name: 'brown rice', servingSize: { quantity: 1, unit: 'cup' }, calories: 218, protein: 4.5, carbs: 45.8, fat: 1.6, fiber: 3.5, sugar: 0.7, sodium: 2, vitaminC: 0, vitaminA: 0, calcium: 19, iron: 0.8, potassium: 154, category: 'grain' },
  { name: 'quinoa', servingSize: { quantity: 1, unit: 'cup' }, calories: 222, protein: 8.1, carbs: 39.4, fat: 3.6, fiber: 5.2, sugar: 1.6, sodium: 13, vitaminC: 0, vitaminA: 14, calcium: 31, iron: 2.8, potassium: 318, category: 'grain' },
  { name: 'oats', servingSize: { quantity: 1, unit: 'cup' }, calories: 307, protein: 10.7, carbs: 54.8, fat: 5.3, fiber: 8.2, sugar: 0.8, sodium: 3, vitaminC: 0, vitaminA: 0, calcium: 42, iron: 3.4, potassium: 293, category: 'grain' },
  { name: 'pasta', servingSize: { quantity: 1, unit: 'cup' }, calories: 221, protein: 8.1, carbs: 43, fat: 1.3, fiber: 2.5, sugar: 0.8, sodium: 1, vitaminC: 0, vitaminA: 0, calcium: 7, iron: 1.3, potassium: 62, category: 'grain' },
  { name: 'bread', servingSize: { quantity: 1, unit: 'slice' }, calories: 79, protein: 2.7, carbs: 15, fat: 1, fiber: 0.8, sugar: 1.5, sodium: 147, vitaminC: 0, vitaminA: 0, calcium: 37, iron: 0.9, potassium: 35, category: 'grain' },
  { name: 'whole wheat bread', servingSize: { quantity: 1, unit: 'slice' }, calories: 81, protein: 3.6, carbs: 13.8, fat: 1.1, fiber: 1.9, sugar: 1.4, sodium: 144, vitaminC: 0, vitaminA: 0, calcium: 29, iron: 0.9, potassium: 81, category: 'grain' },
  
  // Indian Grains & Breads
  { name: 'roti', servingSize: { quantity: 1, unit: 'piece' }, calories: 71, protein: 3, carbs: 15, fat: 0.4, fiber: 2.7, sugar: 0.4, sodium: 119, vitaminC: 0, vitaminA: 0, calcium: 10, iron: 0.7, potassium: 58, category: 'grain' },
  { name: 'chapati', servingSize: { quantity: 1, unit: 'piece' }, calories: 71, protein: 3, carbs: 15, fat: 0.4, fiber: 2.7, sugar: 0.4, sodium: 119, vitaminC: 0, vitaminA: 0, calcium: 10, iron: 0.7, potassium: 58, category: 'grain' },
  { name: 'naan', servingSize: { quantity: 1, unit: 'piece' }, calories: 262, protein: 7.3, carbs: 45, fat: 5.6, fiber: 2, sugar: 3.5, sodium: 419, vitaminC: 0, vitaminA: 4, calcium: 58, iron: 2.6, potassium: 115, category: 'grain' },
  { name: 'paratha', servingSize: { quantity: 1, unit: 'piece' }, calories: 126, protein: 3, carbs: 18, fat: 5, fiber: 2, sugar: 0.5, sodium: 200, vitaminC: 0, vitaminA: 30, calcium: 15, iron: 1.2, potassium: 65, category: 'grain' },
  { name: 'basmati rice', servingSize: { quantity: 1, unit: 'cup' }, calories: 191, protein: 4, carbs: 41.6, fat: 0.5, fiber: 0.7, sugar: 0.2, sodium: 2, vitaminC: 0, vitaminA: 0, calcium: 19, iron: 1.2, potassium: 52, category: 'grain' },
  { name: 'poha', servingSize: { quantity: 1, unit: 'cup' }, calories: 180, protein: 2, carbs: 40, fat: 0.3, fiber: 1.5, sugar: 0.5, sodium: 5, vitaminC: 0, vitaminA: 0, calcium: 10, iron: 3.4, potassium: 40, category: 'grain' },
  { name: 'upma', servingSize: { quantity: 1, unit: 'cup' }, calories: 198, protein: 5, carbs: 38, fat: 3.5, fiber: 2, sugar: 1, sodium: 340, vitaminC: 2, vitaminA: 80, calcium: 20, iron: 1.8, potassium: 95, category: 'grain' },
  
  // ===== NUTS & SEEDS =====
  { name: 'almond', servingSize: { quantity: 28, unit: 'g' }, calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 3.5, sugar: 1.2, sodium: 0, vitaminC: 0, vitaminA: 1, calcium: 76, iron: 1, potassium: 208, category: 'nuts' },
  { name: 'walnut', servingSize: { quantity: 28, unit: 'g' }, calories: 185, protein: 4.3, carbs: 3.9, fat: 18.5, fiber: 1.9, sugar: 0.7, sodium: 1, vitaminC: 0.4, vitaminA: 6, calcium: 28, iron: 0.8, potassium: 125, category: 'nuts' },
  { name: 'cashew', servingSize: { quantity: 28, unit: 'g' }, calories: 157, protein: 5.2, carbs: 8.6, fat: 12.4, fiber: 0.9, sugar: 1.7, sodium: 3, vitaminC: 0.1, vitaminA: 0, calcium: 10, iron: 1.9, potassium: 187, category: 'nuts' },
  { name: 'peanut', servingSize: { quantity: 28, unit: 'g' }, calories: 161, protein: 7.3, carbs: 4.6, fat: 14, fiber: 2.4, sugar: 1.3, sodium: 5, vitaminC: 0, vitaminA: 0, calcium: 26, iron: 1.3, potassium: 200, category: 'nuts' },
  { name: 'peanut butter', servingSize: { quantity: 2, unit: 'tbsp' }, calories: 188, protein: 8, carbs: 7, fat: 16, fiber: 2, sugar: 3, sodium: 147, vitaminC: 0, vitaminA: 0, calcium: 17, iron: 0.6, potassium: 208, category: 'nuts' },
  { name: 'pistachio', servingSize: { quantity: 28, unit: 'g' }, calories: 159, protein: 5.7, carbs: 7.7, fat: 12.9, fiber: 3, sugar: 2.2, sodium: 0, vitaminC: 1.5, vitaminA: 73, calcium: 30, iron: 1.1, potassium: 291, category: 'nuts' },
  { name: 'chia seeds', servingSize: { quantity: 28, unit: 'g' }, calories: 138, protein: 4.7, carbs: 12, fat: 8.7, fiber: 9.8, sugar: 0, sodium: 5, vitaminC: 0.5, vitaminA: 15, calcium: 179, iron: 2.2, potassium: 115, category: 'nuts' },
  { name: 'flax seeds', servingSize: { quantity: 28, unit: 'g' }, calories: 150, protein: 5.1, carbs: 8.1, fat: 11.8, fiber: 7.6, sugar: 0.4, sodium: 9, vitaminC: 0.2, vitaminA: 1, calcium: 71, iron: 1.6, potassium: 227, category: 'nuts' },
  { name: 'sunflower seeds', servingSize: { quantity: 28, unit: 'g' }, calories: 164, protein: 5.8, carbs: 5.6, fat: 14.2, fiber: 2.4, sugar: 0.8, sodium: 1, vitaminC: 0.4, vitaminA: 1, calcium: 22, iron: 1.5, potassium: 186, category: 'nuts' },
  
  // ===== DAIRY =====
  { name: 'milk', servingSize: { quantity: 1, unit: 'cup' }, calories: 149, protein: 7.7, carbs: 11.7, fat: 7.9, fiber: 0, sugar: 12.3, sodium: 105, vitaminC: 0, vitaminA: 395, calcium: 276, iron: 0.1, potassium: 322, category: 'dairy', healthLabels: ['vegetarian', 'gluten-free'], dietLabels: ['vegetarian'], allergens: ['dairy'] },
  { name: 'yogurt', servingSize: { quantity: 1, unit: 'cup' }, calories: 149, protein: 8.5, carbs: 11.4, fat: 8, fiber: 0, sugar: 11.4, sodium: 113, vitaminC: 1.2, vitaminA: 243, calcium: 296, iron: 0.1, potassium: 380, category: 'dairy', healthLabels: ['vegetarian', 'gluten-free'], dietLabels: ['vegetarian'], allergens: ['dairy'] },
  { name: 'greek yogurt', servingSize: { quantity: 1, unit: 'cup' }, calories: 100, protein: 17, carbs: 6, fat: 0.7, fiber: 0, sugar: 6, sodium: 65, vitaminC: 0, vitaminA: 0, calcium: 200, iron: 0.1, potassium: 240, category: 'dairy', healthLabels: ['vegetarian', 'gluten-free', 'high-protein'], dietLabels: ['vegetarian'], allergens: ['dairy'] },
  { name: 'cheese', servingSize: { quantity: 28, unit: 'g' }, calories: 113, protein: 7, carbs: 0.9, fat: 9, fiber: 0, sugar: 0.5, sodium: 177, vitaminC: 0, vitaminA: 284, calcium: 202, iron: 0.2, potassium: 23, category: 'dairy', healthLabels: ['vegetarian', 'gluten-free'], dietLabels: ['vegetarian'], allergens: ['dairy'] },
  { name: 'cheddar cheese', servingSize: { quantity: 28, unit: 'g' }, calories: 114, protein: 7, carbs: 0.4, fat: 9.4, fiber: 0, sugar: 0.1, sodium: 176, vitaminC: 0, vitaminA: 284, calcium: 204, iron: 0.2, potassium: 27, category: 'dairy', healthLabels: ['vegetarian', 'gluten-free'], dietLabels: ['vegetarian'], allergens: ['dairy'] },
  { name: 'cottage cheese', servingSize: { quantity: 1, unit: 'cup' }, calories: 163, protein: 28, carbs: 6.2, fat: 2.3, fiber: 0, sugar: 6, sodium: 819, vitaminC: 0, vitaminA: 135, calcium: 138, iron: 0.3, potassium: 194, category: 'dairy', healthLabels: ['vegetarian', 'gluten-free', 'high-protein'], dietLabels: ['vegetarian'], allergens: ['dairy'] },
  { name: 'butter', servingSize: { quantity: 1, unit: 'tbsp' }, calories: 102, protein: 0.1, carbs: 0, fat: 11.5, fiber: 0, sugar: 0, sodium: 2, vitaminC: 0, vitaminA: 355, calcium: 3, potassium: 3, category: 'dairy', healthLabels: ['vegetarian', 'gluten-free'], dietLabels: ['vegetarian'], allergens: ['dairy'] },
  { name: 'ghee', servingSize: { quantity: 1, unit: 'tbsp' }, calories: 112, protein: 0, carbs: 0, fat: 12.7, fiber: 0, sugar: 0, sodium: 0, vitaminC: 0, vitaminA: 438, calcium: 0, potassium: 0, category: 'dairy', healthLabels: ['vegetarian', 'gluten-free'], dietLabels: ['vegetarian'], allergens: ['dairy'] },
  { name: 'curd', servingSize: { quantity: 1, unit: 'cup' }, calories: 98, protein: 11, carbs: 4.7, fat: 4.3, fiber: 0, sugar: 4.7, sodium: 364, vitaminC: 1.4, vitaminA: 157, calcium: 275, iron: 0.1, potassium: 352, category: 'dairy', healthLabels: ['vegetarian', 'gluten-free'], dietLabels: ['vegetarian'], allergens: ['dairy'] },
  
  // ===== LEGUMES =====
  { name: 'lentil', servingSize: { quantity: 1, unit: 'cup' }, calories: 230, protein: 17.9, carbs: 39.9, fat: 0.8, fiber: 15.6, sugar: 3.6, sodium: 4, vitaminC: 3, vitaminA: 16, calcium: 38, iron: 6.6, potassium: 731, category: 'legume' },
  { name: 'chickpea', servingSize: { quantity: 1, unit: 'cup' }, calories: 269, protein: 14.5, carbs: 45, fat: 4.2, fiber: 12.5, sugar: 7.9, sodium: 11, vitaminC: 4, vitaminA: 67, calcium: 80, iron: 4.7, potassium: 477, category: 'legume' },
  { name: 'black bean', servingSize: { quantity: 1, unit: 'cup' }, calories: 227, protein: 15.2, carbs: 40.8, fat: 0.9, fiber: 15, sugar: 0.6, sodium: 2, vitaminC: 0, vitaminA: 10, calcium: 46, iron: 3.6, potassium: 611, category: 'legume' },
  { name: 'kidney bean', servingSize: { quantity: 1, unit: 'cup' }, calories: 225, protein: 15.3, carbs: 40.4, fat: 0.9, fiber: 11.3, sugar: 0.3, sodium: 2, vitaminC: 2.3, vitaminA: 0, calcium: 127, iron: 5.2, potassium: 717, category: 'legume' },
  { name: 'pinto bean', servingSize: { quantity: 1, unit: 'cup' }, calories: 245, protein: 15.4, carbs: 45, fat: 1.1, fiber: 15.4, sugar: 0.6, sodium: 2, vitaminC: 1.3, vitaminA: 0, calcium: 79, iron: 3.6, potassium: 746, category: 'legume' },
  
  // ===== MORE VEGETABLES =====
  { name: 'green peas', servingSize: { quantity: 1, unit: 'cup' }, calories: 118, protein: 7.9, carbs: 21, fat: 0.6, fiber: 7.4, sugar: 8.2, sodium: 7, vitaminC: 58, vitaminA: 1282, calcium: 36, iron: 2.1, potassium: 354, category: 'vegetable' },
  { name: 'corn', servingSize: { quantity: 1, unit: 'cup' }, calories: 132, protein: 5, carbs: 29, fat: 1.8, fiber: 3.6, sugar: 6.8, sodium: 23, vitaminC: 10.2, vitaminA: 281, calcium: 3, iron: 0.6, potassium: 325, category: 'vegetable' },
  { name: 'pumpkin', servingSize: { quantity: 1, unit: 'cup' }, calories: 30, protein: 1.2, carbs: 7.5, fat: 0.1, fiber: 0.6, sugar: 3.2, sodium: 2, vitaminC: 11.5, vitaminA: 12231, calcium: 24, iron: 1, potassium: 394, category: 'vegetable' },
  { name: 'butternut squash', servingSize: { quantity: 1, unit: 'cup' }, calories: 63, protein: 1.4, carbs: 16.4, fat: 0.1, fiber: 2.8, sugar: 3.1, sodium: 6, vitaminC: 31, vitaminA: 11155, calcium: 55, potassium: 493, category: 'vegetable' },
  { name: 'arugula', servingSize: { quantity: 1, unit: 'cup' }, calories: 5, protein: 0.5, carbs: 0.7, fat: 0.1, fiber: 0.3, sugar: 0.4, sodium: 6, vitaminC: 3, vitaminA: 474, calcium: 32, iron: 0.3, potassium: 74, category: 'vegetable' },
  
  // ===== INDIAN VEGETABLES (Additional) =====
  { name: 'methi', servingSize: { quantity: 1, unit: 'cup' }, calories: 36, protein: 3, carbs: 6.5, fat: 0.7, fiber: 2.7, sugar: 1, sodium: 67, vitaminC: 17.5, vitaminA: 1323, calcium: 176, iron: 3.7, potassium: 298, category: 'vegetable' },
  { name: 'palak', servingSize: { quantity: 1, unit: 'cup' }, calories: 7, protein: 0.9, carbs: 1.1, fat: 0.1, fiber: 0.7, sugar: 0.1, sodium: 24, vitaminC: 8.4, vitaminA: 2813, calcium: 30, iron: 0.8, potassium: 167, category: 'vegetable' },
  { name: 'bhindi', servingSize: { quantity: 100, unit: 'g' }, calories: 33, protein: 1.9, carbs: 7.5, fat: 0.2, fiber: 3.2, sugar: 1.5, sodium: 7, vitaminC: 23, vitaminA: 375, calcium: 82, iron: 0.6, potassium: 299, category: 'vegetable' },
  { name: 'karela', servingSize: { quantity: 100, unit: 'g' }, calories: 17, protein: 1, carbs: 3.7, fat: 0.2, fiber: 2.8, sugar: 1.9, sodium: 5, vitaminC: 84, vitaminA: 471, calcium: 19, iron: 0.4, potassium: 296, category: 'vegetable' },
  { name: 'lauki', servingSize: { quantity: 100, unit: 'g' }, calories: 14, protein: 0.6, carbs: 3.4, fat: 0, fiber: 0.5, sugar: 2.5, sodium: 2, vitaminC: 10.1, vitaminA: 16, calcium: 26, potassium: 150, category: 'vegetable' },
  
  // ===== MORE PROTEINS =====
  { name: 'fish', servingSize: { quantity: 100, unit: 'g' }, calories: 136, protein: 18.4, carbs: 0, fat: 6.3, fiber: 0, sugar: 0, sodium: 90, vitaminA: 54, calcium: 20, iron: 0.5, potassium: 314, category: 'protein' },
  { name: 'prawns', servingSize: { quantity: 100, unit: 'g' }, calories: 99, protein: 24, carbs: 0.2, fat: 0.3, fiber: 0, sugar: 0, sodium: 111, vitaminA: 180, calcium: 70, iron: 0.5, potassium: 259, category: 'protein' },
  { name: 'mutton', servingSize: { quantity: 100, unit: 'g' }, calories: 294, protein: 25, carbs: 0, fat: 21, fiber: 0, sugar: 0, sodium: 72, vitaminA: 0, calcium: 17, iron: 1.8, potassium: 310, category: 'protein' },
  
  // ===== OILS & FATS =====
  { name: 'olive oil', servingSize: { quantity: 1, unit: 'tbsp' }, calories: 119, protein: 0, carbs: 0, fat: 13.5, fiber: 0, sugar: 0, sodium: 0, vitaminC: 0, vitaminA: 0, calcium: 0, potassium: 0, category: 'fat' },
  { name: 'coconut oil', servingSize: { quantity: 1, unit: 'tbsp' }, calories: 121, protein: 0, carbs: 0, fat: 13.5, fiber: 0, sugar: 0, sodium: 0, vitaminC: 0, vitaminA: 0, calcium: 0, potassium: 0, category: 'fat' },
  { name: 'vegetable oil', servingSize: { quantity: 1, unit: 'tbsp' }, calories: 120, protein: 0, carbs: 0, fat: 13.6, fiber: 0, sugar: 0, sodium: 0, vitaminC: 0, vitaminA: 0, calcium: 0, potassium: 0, category: 'fat' },
  
  // ===== BEVERAGES & OTHERS =====
  { name: 'almond milk', servingSize: { quantity: 1, unit: 'cup' }, calories: 40, protein: 1, carbs: 2, fat: 2.5, fiber: 0, sugar: 0, sodium: 150, vitaminC: 0, vitaminA: 500, calcium: 450, iron: 0.4, potassium: 180, category: 'dairy', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: ['tree-nuts'] },
  { name: 'soy milk', servingSize: { quantity: 1, unit: 'cup' }, calories: 105, protein: 6.3, carbs: 12, fat: 3.6, fiber: 0.5, sugar: 8.9, sodium: 115, vitaminC: 0, vitaminA: 503, calcium: 301, iron: 1.1, potassium: 298, category: 'dairy', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: ['soy'] },
  { name: 'honey', servingSize: { quantity: 1, unit: 'tbsp' }, calories: 64, protein: 0.1, carbs: 17.3, fat: 0, fiber: 0, sugar: 17.2, sodium: 1, vitaminC: 0.1, vitaminA: 0, calcium: 1, potassium: 11, category: 'sweetener', healthLabels: ['vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegetarian'], allergens: [] },
  { name: 'sugar', servingSize: { quantity: 1, unit: 'tsp' }, calories: 16, protein: 0, carbs: 4.2, fat: 0, fiber: 0, sugar: 4.2, sodium: 0, vitaminC: 0, vitaminA: 0, calcium: 0, potassium: 0, category: 'sweetener', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  
  // ===== INDIAN SPECIFIC =====
  { name: 'jaggery', servingSize: { quantity: 1, unit: 'tbsp' }, calories: 38, protein: 0, carbs: 9.8, fat: 0, fiber: 0, sugar: 9.7, sodium: 1, vitaminC: 0, vitaminA: 0, calcium: 8, iron: 0.5, potassium: 28, category: 'sweetener', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'coconut milk', servingSize: { quantity: 1, unit: 'cup' }, calories: 552, protein: 5.5, carbs: 13.3, fat: 57.2, fiber: 5.3, sugar: 7.8, sodium: 29, vitaminC: 6.7, vitaminA: 0, calcium: 38, iron: 7.5, potassium: 631, category: 'dairy', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
  { name: 'tamarind', servingSize: { quantity: 1, unit: 'tbsp' }, calories: 12, protein: 0.1, carbs: 3.1, fat: 0, fiber: 0.3, sugar: 2.8, sodium: 1, vitaminC: 0.2, vitaminA: 1, calcium: 4, iron: 0.1, potassium: 34, category: 'fruit', healthLabels: ['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], dietLabels: ['vegan', 'vegetarian'], allergens: [] },
];

export class SimpleIngredientService {
  private ingredientsCache: SimpleIngredient[] | null = null;
  private cacheTimestamp: number = 0;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all ingredients from database with caching
   */
  private async getIngredients(): Promise<SimpleIngredient[]> {
    // Check cache first
    const now = Date.now();
    if (this.ingredientsCache && (now - this.cacheTimestamp) < this.cacheTTL) {
      console.log('✅ Using cached ingredients');
      return this.ingredientsCache;
    }

    console.log('🔄 Fetching ingredients from database...');

    try {
      const { data, error } = await supabase
        .from('simple_ingredients')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching simple ingredients:', error);
        // Fallback to hardcoded ingredients
        console.log('⚠️ Falling back to hardcoded ingredients');
        return COMMON_INGREDIENTS;
      }

      // Map database format to SimpleIngredient interface
      const ingredients: SimpleIngredient[] = (data || []).map((row: any) => ({
        id: row.id, // Include UUID from database
        name: row.name,
        servingSize: { quantity: row.serving_quantity, unit: row.serving_unit },
        calories: row.calories,
        protein: row.protein_g,
        carbs: row.carbs_g,
        fat: row.fat_g,
        fiber: row.fiber_g,
        sugar: row.sugar_g,
        sodium: row.sodium_mg,
        category: row.category,
        vitaminC: row.vitamin_c_mg,
        vitaminA: row.vitamin_a_mcg,
        calcium: row.calcium_mg,
        iron: row.iron_mg,
        potassium: row.potassium_mg,
        healthLabels: row.health_labels || [],
        dietLabels: row.diet_labels || [],
        allergens: row.allergens || []
      }));

      // Update cache
      this.ingredientsCache = ingredients.length > 0 ? ingredients : COMMON_INGREDIENTS;
      this.cacheTimestamp = now;

      console.log(`✅ Loaded ${ingredients.length} ingredients from database`);
      return this.ingredientsCache;
    } catch (error) {
      console.error('Error in getIngredients:', error);
      // Fallback to hardcoded
      return COMMON_INGREDIENTS;
    }
  }

  /**
   * Search for ingredients by name and return raw ingredient data
   * @param query - Search term
   * @param maxResults - Maximum results to return (default: 50)
   * @param allergenFilters - Optional allergens to exclude
   * @param categoryFilter - Optional category filter
   */
  async searchIngredients(
    query: string, 
    maxResults: number = 50, 
    allergenFilters?: string[], 
    categoryFilter?: string
  ): Promise<any[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();
    
    // Get ingredients from database (or cache)
    const allIngredients = await this.getIngredients();
    
    // Check if search term matches a category keyword
    const categoryExpansion = this.getCategoryExpansion(searchTerm);
    
    // Find matching ingredients
    let matches: SimpleIngredient[];
    
    if (categoryExpansion) {
      // Expand search to include all items in matching categories
      console.log(`🔍 Expanding search "${searchTerm}" to categories: ${categoryExpansion.join(', ')}`);
      
      // For fish/seafood searches, include all protein items that are fish
      const isFishSearch = searchTerm === 'fish' || searchTerm === 'seafood';
      
      matches = allIngredients.filter(ing => {
        // Match by category OR by name
        const matchesCategory = categoryExpansion.includes(ing.category);
        const matchesName = ing.name.toLowerCase().includes(searchTerm);
        
        // For fish searches, check if ingredient is a type of fish
        if (isFishSearch && ing.category === 'protein') {
          const isFishType = this.isFishOrSeafood(ing.name);
          if (isFishType) return true;
        }
        
        return matchesCategory || matchesName;
      });
      
      // Sort: prioritize exact name matches, then fish types, then others
      matches.sort((a, b) => {
        const aNameMatch = a.name.toLowerCase().includes(searchTerm);
        const bNameMatch = b.name.toLowerCase().includes(searchTerm);
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        return 0;
      });
    } else {
      // Regular name-based search
      matches = allIngredients.filter(ing => 
        ing.name.toLowerCase().includes(searchTerm) || searchTerm.includes(ing.name.toLowerCase())
      );
    }

    // Filter by category if provided
    if (categoryFilter) {
      matches = matches.filter(ing => ing.category === categoryFilter);
    }

    // Filter by allergens if provided
    if (allergenFilters && allergenFilters.length > 0) {
      matches = matches.filter(ing => {
        const ingredientAllergens = ing.allergens || this.getAllergens(ing.name);
        const healthLabels = ing.healthLabels || this.getHealthLabels(ing.category, ing.name);
        
        // Check for allergen conflicts
        return !this.hasAllergenConflict(ingredientAllergens, healthLabels, allergenFilters);
      });
    }

    // Limit results
    matches = matches.slice(0, maxResults);

    // Return formatted ingredient data (matching recipe API format)
    return matches.map(ing => {
      // Build vitamins object
      const vitamins: any = {};
      if (ing.vitaminC) vitamins.vitaminC = { quantity: ing.vitaminC, unit: 'mg' };
      if (ing.vitaminA) vitamins.vitaminA = { quantity: ing.vitaminA, unit: 'mcg' };

      // Build minerals object
      const minerals: any = {};
      if (ing.calcium) minerals.calcium = { quantity: ing.calcium, unit: 'mg' };
      if (ing.iron) minerals.iron = { quantity: ing.iron, unit: 'mg' };
      if (ing.potassium) minerals.potassium = { quantity: ing.potassium, unit: 'mg' };

      return {
        id: ing.id || `ingredient_${ing.name.replace(/\s+/g, '_')}`, // Use database UUID or fallback to generated ID
        name: ing.name,
        title: ing.name.charAt(0).toUpperCase() + ing.name.slice(1),
        category: ing.category,
        servingSize: {
          quantity: ing.servingSize.quantity,
          unit: ing.servingSize.unit,
          display: `${ing.servingSize.quantity} ${ing.servingSize.unit}`
        },
        
        // Flat nutrition (for easy access - matches recipe format)
        calories: Math.round(ing.calories * 10) / 10,
        protein: Math.round(ing.protein * 10) / 10,
        carbs: Math.round(ing.carbs * 10) / 10,
        fat: Math.round(ing.fat * 10) / 10,
        fiber: Math.round(ing.fiber * 10) / 10,
        
        // Detailed nutrition object (matches recipe format exactly)
        nutrition: {
          calories: { quantity: Math.round(ing.calories * 10) / 10, unit: 'kcal' },
          macros: {
            protein: { quantity: Math.round(ing.protein * 10) / 10, unit: 'g' },
            carbs: { quantity: Math.round(ing.carbs * 10) / 10, unit: 'g' },
            fat: { quantity: Math.round(ing.fat * 10) / 10, unit: 'g' },
            fiber: { quantity: Math.round(ing.fiber * 10) / 10, unit: 'g' },
            sugar: { quantity: Math.round((ing.sugar || 0) * 10) / 10, unit: 'g' },
            sodium: { quantity: Math.round((ing.sodium || 0) * 10) / 10, unit: 'mg' }
          },
          micros: {
            vitamins,
            minerals
          }
        },
        
        // Labels
        healthLabels: ing.healthLabels || this.getHealthLabels(ing.category, ing.name),
        dietLabels: ing.dietLabels || this.getDietLabels(ing.category, ing.name),
        allergens: ing.allergens || this.getAllergens(ing.name),
        
        // Flag to indicate this is a simple ingredient (for meal plan API)
        isSimpleIngredient: true
      };
    });
  }

  /**
   * Search for ingredients by name and return as recipe format
   * @param query - Search term
   * @param maxResults - Maximum results to return
   * @param clientAllergens - Optional client allergens to filter out conflicting ingredients
   */
  async searchIngredientsAsRecipes(query: string, maxResults: number = 2, clientAllergens?: string[]): Promise<any[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim().toLowerCase();
    
    // Get ingredients from database (or cache)
    const allIngredients = await this.getIngredients();
    
    // Find matching ingredients
    let matches = allIngredients.filter(ing => 
      ing.name.includes(searchTerm) || searchTerm.includes(ing.name)
    );

    // Filter by allergens if provided
    if (clientAllergens && clientAllergens.length > 0) {
      console.log(`🔍 Filtering ${matches.length} ingredients by allergens:`, clientAllergens);
      
      const beforeFilter = matches.length;
      matches = matches.filter(ing => {
        // Use predefined labels if available, otherwise generate
        const ingredientAllergens = ing.allergens || this.getAllergens(ing.name);
        const healthLabels = ing.healthLabels || this.getHealthLabels(ing.category, ing.name);
        
        console.log(`  Checking ${ing.name}: allergens=[${ingredientAllergens}], labels=[${healthLabels.slice(0,3)}]`);
        
        // Check for allergen conflicts
        const hasConflict = this.hasAllergenConflict(ingredientAllergens, healthLabels, clientAllergens);
        const shouldInclude = !hasConflict;
        
        console.log(`  ${ing.name}: ${hasConflict ? '❌ FILTERED OUT' : '✅ INCLUDED'}`);
        
        return shouldInclude;
      });
      
      console.log(`📊 After filtering: ${beforeFilter} → ${matches.length} ingredients`);
    }

    // Limit results
    const limited = matches.slice(0, maxResults);

    // Convert to recipe format
    return limited.map(ing => this.convertToRecipe(ing));
  }

  /**
   * Check if ingredient has allergen conflict with client allergens
   */
  private hasAllergenConflict(
    ingredientAllergens: string[],
    ingredientHealthLabels: string[],
    clientAllergens: string[]
  ): boolean {
    // Normalize allergens to lowercase for comparison
    const normalizeAllergen = (allergen: string): string => {
      return allergen.toLowerCase().trim().replace(/-/g, '').replace(/\s+/g, '');
    };

    const normalizedClientAllergens = clientAllergens.map(normalizeAllergen);
    const normalizedIngredientAllergens = ingredientAllergens.map(normalizeAllergen);
    const normalizedHealthLabels = ingredientHealthLabels.map(normalizeAllergen);

    console.log(`Checking allergen conflict for ingredient:`, {
      ingredientAllergens: normalizedIngredientAllergens,
      ingredientHealthLabels: normalizedHealthLabels,
      clientAllergens: normalizedClientAllergens
    });

    // For each client restriction
    for (const clientAllergen of normalizedClientAllergens) {
      
      // Case 1: Client has "dairy-free" restriction
      if (clientAllergen === 'dairyfree') {
        // Check if ingredient contains dairy allergen
        if (normalizedIngredientAllergens.includes('dairy')) {
          console.log(`⚠️ CONFLICT: Ingredient contains dairy allergen, client requires dairy-free`);
          return true;
        }
        // Check if ingredient has dairy-free label
        if (!normalizedHealthLabels.includes('dairyfree')) {
          console.log(`⚠️ CONFLICT: Ingredient missing dairy-free label, client requires it`);
          return true;
        }
      }
      
      // Case 2: Client has "gluten-free" restriction
      else if (clientAllergen === 'glutenfree') {
        if (normalizedIngredientAllergens.includes('gluten')) {
          console.log(`⚠️ CONFLICT: Ingredient contains gluten allergen`);
          return true;
        }
        if (!normalizedHealthLabels.includes('glutenfree')) {
          console.log(`⚠️ CONFLICT: Ingredient missing gluten-free label`);
          return true;
        }
      }
      
      // Case 3: Client is "vegetarian"
      else if (clientAllergen === 'vegetarian') {
        if (!normalizedHealthLabels.includes('vegetarian')) {
          console.log(`⚠️ CONFLICT: Ingredient not vegetarian`);
          return true;
        }
      }
      
      // Case 4: Client is "vegan"
      else if (clientAllergen === 'vegan') {
        if (!normalizedHealthLabels.includes('vegan')) {
          console.log(`⚠️ CONFLICT: Ingredient not vegan`);
          return true;
        }
      }
      
      // Case 5: Direct allergen match (eggs, tree-nuts, peanuts, soy, fish, shellfish)
      else if (normalizedIngredientAllergens.includes(clientAllergen)) {
        console.log(`⚠️ CONFLICT: Direct allergen match - ${clientAllergen}`);
        return true;
      }
    }

    console.log(`✅ No allergen conflict`);
    return false;
  }

  /**
   * Convert ingredient to recipe format (matching recipe response format exactly)
   */
  private convertToRecipe(ingredient: SimpleIngredient): any {
    const { name, servingSize, calories, protein, carbs, fat, fiber, sugar, sodium, category } = ingredient;
    
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    const title = `${capitalizedName} (${servingSize.quantity}${servingSize.unit})`;

    // Build vitamins object
    const vitamins: any = {};
    if (ingredient.vitaminC) vitamins.vitaminC = { quantity: ingredient.vitaminC, unit: 'mg' };
    if (ingredient.vitaminA) vitamins.vitaminA = { quantity: ingredient.vitaminA, unit: 'µg' };

    // Build minerals object  
    const minerals: any = {};
    if (ingredient.calcium) minerals.calcium = { quantity: ingredient.calcium, unit: 'mg' };
    if (ingredient.iron) minerals.iron = { quantity: ingredient.iron, unit: 'mg' };
    if (ingredient.potassium) minerals.potassium = { quantity: ingredient.potassium, unit: 'mg' };

    return {
      id: ingredient.id || `ingredient_${name.replace(/\s+/g, '_')}`, // Use database UUID or fallback to generated ID
      title,
      image: `https://spoonacular.com/cdn/ingredients_100x100/${name.replace(/\s+/g, '-')}.jpg`,
      sourceUrl: null,
      source: 'spoonacular' as const, // Changed from 'ingredient' to 'spoonacular' for compatibility
      servings: 1,
      readyInMinutes: 0,
      
      // Nutrition (flat format - matches recipe response)
      calories: Math.round(calories),
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      fiber: Math.round(fiber * 10) / 10,

      // Full nutrition object (matches recipe response exactly)
      nutrition: {
        calories: { quantity: Math.round(calories), unit: 'kcal' },
        macros: {
          protein: { quantity: Math.round(protein * 10) / 10, unit: 'g' },
          carbs: { quantity: Math.round(carbs * 10) / 10, unit: 'g' },
          fat: { quantity: Math.round(fat * 10) / 10, unit: 'g' },
          fiber: { quantity: Math.round(fiber * 10) / 10, unit: 'g' },
          sugar: { quantity: Math.round((sugar || 0) * 10) / 10, unit: 'g' },
          sodium: { quantity: Math.round((sodium || 0) * 10) / 10, unit: 'mg' }
        },
        micros: {
          vitamins,
          minerals
        }
      },

      // Recipe details - format as Spoonacular-compatible ingredients
      ingredients: [{
        name: name,
        amount: servingSize.quantity,
        unit: servingSize.unit,
        original: `${servingSize.quantity} ${servingSize.unit} ${name}`,
        // Add Spoonacular-style nutrition per ingredient
        nutrition: {
          calories: Math.round(calories),
          protein: Math.round(protein * 10) / 10,
          carbs: Math.round(carbs * 10) / 10,
          fat: Math.round(fat * 10) / 10,
          fiber: Math.round(fiber * 10) / 10
        }
      }],
      ingredientLines: [`${servingSize.quantity} ${servingSize.unit} ${name}`],
      instructions: [`Serve ${servingSize.quantity} ${servingSize.unit} of ${name}`],
      
      // Metadata - use predefined labels if available, otherwise generate
      healthLabels: ingredient.healthLabels || this.getHealthLabels(category, name),
      dietLabels: ingredient.dietLabels || this.getDietLabels(category, name),
      allergens: ingredient.allergens || this.getAllergens(name),
      cuisineType: [],
      dishType: [this.getDishType(category)],
      mealType: [this.getMealType(category)],
      
      // Special flags
      isIngredient: true,
      isSimpleIngredient: true, // New flag to identify these as simple ingredients
      fromCache: false,
      ingredientData: {
        name,
        servingSize,
        category
      }
    };
  }

  private getHealthLabels(category: string, name: string): string[] {
    const labels: string[] = [];
    
    // Determine if dairy
    const dairyItems = ['milk', 'cheese', 'yogurt', 'butter', 'ghee', 'paneer', 'curd', 'cottage'];
    const isDairy = category === 'dairy' || dairyItems.some(item => name.includes(item));
    const isPlantMilk = ['almond milk', 'soy milk', 'coconut milk'].includes(name);
    const actuallyDairy = isDairy && !isPlantMilk;
    
    // Determine if animal product
    const meatItems = ['chicken', 'beef', 'pork', 'lamb', 'turkey', 'mutton'];
    const fishItems = ['fish', 'salmon', 'tuna', 'cod', 'shrimp', 'prawns'];
    const isMeat = meatItems.some(item => name.includes(item));
    const isFish = fishItems.some(item => name.includes(item));
    const isEgg = name.includes('egg');
    const isPlantBased = ['tofu', 'tempeh'].includes(name);
    
    // Vegan - only plant-based, no animal products at all
    const isVegan = !actuallyDairy && !isMeat && !isFish && !isEgg && !isPlantBased;
    const isVeganProtein = isPlantBased; // tofu, tempeh
    if (isVegan || isVeganProtein) {
      labels.push('vegan', 'vegetarian');
    }
    
    // Vegetarian - excludes meat/fish but allows dairy/eggs
    const isVegetarian = !isMeat && !isFish;
    if (isVegetarian && !isVegan && !isVeganProtein) {
      labels.push('vegetarian');
    }
    
    // Gluten-free - exclude grains with gluten
    const glutenGrains = ['bread', 'pasta', 'naan', 'roti', 'chapati', 'paratha', 'wheat', 'barley', 'rye', 'upma'];
    const hasGluten = glutenGrains.some(grain => name.includes(grain));
    if (!hasGluten) {
      labels.push('gluten-free');
    }
    
    // Dairy-free - NO dairy at all
    if (!actuallyDairy) {
      labels.push('dairy-free');
    }
    
    // High protein (>10g per serving) - check actual protein value if needed
    if (category === 'protein' || category === 'legume') {
      labels.push('high-protein');
    }
    
    return labels;
  }

  private getDietLabels(category: string, name: string): string[] {
    const labels: string[] = [];
    
    // Vegan - only plant-based
    const isAnimalProduct = category === 'protein' && 
      !['tofu', 'tempeh'].includes(name) ||
      category === 'dairy' && !['almond milk', 'soy milk', 'coconut milk'].includes(name);
    
    if (!isAnimalProduct) {
      labels.push('vegan');
    }
    
    // Vegetarian - excludes meat/fish but allows eggs/dairy
    const isMeatOrFish = category === 'protein' && 
      !['tofu', 'tempeh', 'egg'].includes(name);
    
    if (!isMeatOrFish) {
      labels.push('vegetarian');
    }
    
    return labels;
  }

  /**
   * Get category expansion for generic search terms
   * Returns categories to include when user searches for generic terms
   */
  private getCategoryExpansion(searchTerm: string): string[] | null {
    const expansionMap: { [key: string]: string[] } = {
      // Fish/Seafood
      'fish': ['protein'],
      'seafood': ['protein'],
      
      // Vegetables
      'vegetable': ['vegetable'],
      'vegetables': ['vegetable'],
      'veggie': ['vegetable'],
      'veggies': ['vegetable'],
      
      // Fruits
      'fruit': ['fruit'],
      'fruits': ['fruit'],
      
      // Proteins
      'protein': ['protein'],
      'proteins': ['protein'],
      'meat': ['protein'],
      'meats': ['protein'],
      
      // Grains
      'grain': ['grain'],
      'grains': ['grain'],
      'rice': ['grain'],
      
      // Dairy
      'dairy': ['dairy'],
      'milk': ['dairy'],
      
      // Nuts
      'nut': ['nuts'],
      'nuts': ['nuts'],
      
      // Legumes
      'legume': ['legume'],
      'legumes': ['legume'],
      'bean': ['legume'],
      'beans': ['legume'],
      
      // Herbs
      'herb': ['herb'],
      'herbs': ['herb'],
      
      // Spices
      'spice': ['spice'],
      'spices': ['spice']
    };
    
    return expansionMap[searchTerm] || null;
  }
  
  /**
   * Get keywords associated with a category for matching
   */
  private getCategoryKeywords(category: string): string[] {
    const keywordMap: { [key: string]: string[] } = {
      'protein': ['fish', 'seafood', 'meat', 'chicken', 'beef', 'pork', 'lamb', 'turkey', 'duck', 'salmon', 'tuna', 'tilapia', 'shrimp', 'prawn', 'crab', 'tofu', 'tempeh', 'seitan', 'egg', 'paneer'],
      'vegetable': ['vegetable', 'veggie', 'greens'],
      'fruit': ['fruit'],
      'grain': ['grain', 'rice', 'wheat', 'oat', 'quinoa', 'barley'],
      'dairy': ['milk', 'cheese', 'yogurt', 'butter'],
      'nuts': ['nut', 'almond', 'walnut', 'cashew', 'peanut'],
      'legume': ['bean', 'lentil', 'chickpea', 'pea'],
      'herb': ['herb'],
      'spice': ['spice']
    };
    
    return keywordMap[category] || [];
  }
  
  /**
   * Check if an ingredient name is a fish or seafood type
   */
  private isFishOrSeafood(name: string): boolean {
    const fishTypes = [
      'salmon', 'tuna', 'tilapia', 'cod', 'bass', 'trout', 'halibut', 
      'mackerel', 'sardine', 'anchovy', 'catfish', 'flounder', 'haddock',
      'mahi', 'snapper', 'swordfish', 'pollock'
    ];
    
    const seafoodTypes = [
      'shrimp', 'prawn', 'crab', 'lobster', 'scallop', 'oyster', 
      'mussel', 'clam', 'squid', 'octopus', 'crayfish'
    ];
    
    const allAquatic = [...fishTypes, ...seafoodTypes];
    const lowerName = name.toLowerCase();
    
    return allAquatic.some(type => lowerName.includes(type));
  }

  private getAllergens(name: string): string[] {
    const allergens: string[] = [];
    
    // Tree nuts
    const treeNuts = ['almond', 'walnut', 'cashew', 'pistachio'];
    if (treeNuts.some(nut => name.includes(nut))) {
      allergens.push('tree-nuts');
    }
    
    // Peanuts
    if (name.includes('peanut')) {
      allergens.push('peanuts');
    }
    
    // Dairy
    const dairyItems = ['milk', 'cheese', 'yogurt', 'butter', 'ghee', 'paneer', 'curd', 'cottage cheese', 'cheddar'];
    const isDairy = dairyItems.some(item => name.includes(item));
    const isNonDairyMilk = ['almond milk', 'soy milk', 'coconut milk'].includes(name);
    if (isDairy && !isNonDairyMilk) {
      allergens.push('dairy');
    }
    
    // Eggs
    if (name.includes('egg')) {
      allergens.push('eggs');
    }
    
    // Fish & Shellfish
    const fishItems = ['fish', 'salmon', 'tuna', 'cod'];
    const shellfishItems = ['shrimp', 'prawns', 'crab', 'lobster'];
    
    if (fishItems.some(item => name.includes(item))) {
      allergens.push('fish');
    }
    if (shellfishItems.some(item => name.includes(item))) {
      allergens.push('shellfish');
    }
    
    // Gluten
    const glutenItems = ['bread', 'pasta', 'naan', 'wheat'];
    if (glutenItems.some(item => name.includes(item))) {
      allergens.push('gluten');
    }
    
    // Soy
    if (name.includes('soy') || name.includes('tofu')) {
      allergens.push('soy');
    }
    
    return allergens;
  }

  private getDishType(category: string): string {
    switch (category) {
      case 'fruit': return 'starter';
      case 'vegetable': return 'side dish';
      case 'protein': return 'main course';
      case 'nuts': return 'snack';
      default: return 'side dish';
    }
  }

  private getMealType(category: string): string {
    switch (category) {
      case 'fruit': return 'breakfast';
      case 'protein': return 'lunch/dinner';
      case 'nuts': return 'snack';
      default: return 'lunch/dinner';
    }
  }
}

export const simpleIngredientService = new SimpleIngredientService();


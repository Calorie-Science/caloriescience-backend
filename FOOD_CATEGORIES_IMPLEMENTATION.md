# Food Categories & Portion Sizes Implementation

## Overview

This implementation adds food category-based portion size recommendations for custom recipes, based on USDA Food and Nutrient Database for Dietary Studies (FNDDS) data and food science research.

## What's Been Implemented

### 1. Food Category System

**File**: [types/foodCategory.ts](types/foodCategory.ts)

- **45+ Food Categories** organized hierarchically:
  - Beverages (water, juice, milk, smoothies, coffee/tea, soft drinks)
  - Soups & Stews (thin soups, thick soups, stews, broths)
  - Grains & Starches (rice, pasta, quinoa, bread, cereal)
  - Protein Foods (meat, poultry, fish, eggs, tofu, beans, nuts)
  - Dairy Products (milk, yogurt, cheese, ice cream)
  - Fruits & Vegetables (whole, berries, chopped, leafy, cooked)
  - Fats & Oils
  - Sauces & Mixed Dishes
  - Desserts

- **Density Reference Data**:
  - g/mL density values for each category
  - Density ranges for variable-consistency foods
  - Accuracy percentages (±1% to ±20%)
  - Scientific basis and data sources

- **Measurement Priorities**:
  - Primary unit (weight, volume, or count)
  - Secondary unit
  - Rationale and implementation guidance

### 2. Category-Specific Portion Sizes

**Data**: Over 150+ predefined portion sizes tailored to specific food categories

Examples:
- **Beverages**: Small/Medium/Large glasses with appropriate mL volumes
- **Soups**: Bowls in 200-400g ranges (weight-based for thick soups)
- **Rice/Pasta**: Standard cup measurements (½, ¾, 1 cup) with g equivalents
- **Meat/Poultry**: Palm-size servings with oz/g options
- **Fruits/Vegetables**: Piece-based for whole, cup-based for chopped

Each portion includes:
- Name and description
- Volume (mL) or weight (g)
- Nutrition multiplier
- Default flag

### 3. Database Schema Changes

**Migration Files**:
- [080_add_food_categories.sql](database/migrations/080_add_food_categories.sql)
- [081_seed_category_portion_sizes.sql](database/migrations/081_seed_category_portion_sizes.sql)

**Changes to `cached_recipes` table**:
```sql
ALTER TABLE cached_recipes
ADD COLUMN food_category VARCHAR(100);
```

**Changes to `portion_sizes` table**:
```sql
ALTER TABLE portion_sizes
ADD COLUMN food_category VARCHAR(100);

-- Expanded category constraint
CHECK (category IN ('cup', 'plate', 'bowl', 'glass', 'serving', 'piece', 'handful', 'scoop', 'slice', 'other'))
```

**New `food_category_density_refs` table**:
```sql
CREATE TABLE food_category_density_refs (
  id UUID PRIMARY KEY,
  food_category VARCHAR(100) UNIQUE,
  density_g_per_ml DECIMAL(10, 4),
  density_min DECIMAL(10, 4),
  density_max DECIMAL(10, 4),
  accuracy_percent INTEGER,
  scientific_basis TEXT,
  data_source VARCHAR(255)
);
```

### 4. Updated Type Definitions

**File**: [types/customRecipe.ts](types/customRecipe.ts)

Updated interfaces:
- `PortionSize`: Added `foodCategory` field
- `CreateCustomRecipeInput`: Added `foodCategory` field
- `UpdateCustomRecipeInput`: Inherited `foodCategory`
- `EditCustomRecipeBasicDetailsInput`: Added `foodCategory` field
- `CustomRecipeOutput`: Added `foodCategory` field

### 5. Service Layer Updates

**File**: [lib/customRecipeService.ts](lib/customRecipeService.ts)

Updated methods to handle `foodCategory`:
- `createCustomRecipe()`: Stores food_category in database
- `updateCustomRecipe()`: Updates food_category when provided
- `updateBasicDetails()`: Updates food_category when provided
- `transformToOutput()`: Returns food_category in response

### 6. Portion Size Recommendations Utility

**File**: [lib/portionSizeRecommendations.ts](lib/portionSizeRecommendations.ts)

Comprehensive utility functions:

#### Core Functions
- `getRecommendedPortionSizes(category)`: Get all recommended portions for a category
- `getDefaultPortionForCategory(category)`: Get the default portion
- `getMeasurementPriority(category)`: Get whether category prefers weight/volume/count

#### Conversion Functions
- `convertMeasurement(value, fromUnit, toUnit, category)`: Convert between volume and weight
- `getDensityInfo(category)`: Get density reference data

#### Validation Functions
- `isPortionSizeValidForCategory(portion, category)`: Validate portion compatibility
- `filterPortionSizesByCategory(portions, category)`: Filter valid portions

#### Smart Recommendations
- `suggestPortionCategory(category)`: Suggest best portion type (cup, bowl, plate, etc.)
- `getPortionSizeRationale(category)`: Get explanation for recommendation
- `getPortionAccuracy(category)`: Get accuracy information
- `getAlternativePortions(multiplier, category)`: Suggest similar portions

#### Display Functions
- `formatPortionSize(portion)`: Format for display with units
- `calculateNutritionScaling(baseWeight, portionWeight, category)`: Calculate scaling factor

## How to Use

### Creating a Custom Recipe with Food Category

```typescript
import { FoodCategory } from '@/types/foodCategory';

const recipe = await customRecipeService.createCustomRecipe({
  recipeName: "Chicken Tikka Masala",
  foodCategory: FoodCategory.CURRY_SAUCED_DISH,
  ingredients: [...],
  servings: 4,
  portionSizeId: "medium-bowl-curry-id", // Optional
  // ... other fields
}, nutritionistId);
```

### Getting Recommended Portions for a Category

```typescript
import { getRecommendedPortionSizes, FoodCategory } from '@/lib/portionSizeRecommendations';

const portions = getRecommendedPortionSizes(FoodCategory.SOUP_THICK);
// Returns: { category: 'soup_thick', allowedPortions: [...] }

portions.allowedPortions.forEach(portion => {
  console.log(`${portion.name}: ${portion.weightG}g (${portion.multiplier}x)`);
});
```

### Converting Between Volume and Weight

```typescript
import { convertMeasurement, FoodCategory } from '@/lib/portionSizeRecommendations';

// Convert 240 mL of milk to grams
const weightG = convertMeasurement(240, 'volume', 'weight', FoodCategory.BEVERAGE_MILK);
// Returns: ~247g (using 1.03 g/mL density)
```

### Validating Portion Sizes

```typescript
import { isPortionSizeValidForCategory, FoodCategory } from '@/lib/portionSizeRecommendations';

const isValid = isPortionSizeValidForCategory(portionSize, FoodCategory.RICE_COOKED);
// Checks if portion measurement type aligns with category requirements
```

### Getting Smart Suggestions

```typescript
import {
  suggestPortionCategory,
  getPortionSizeRationale,
  FoodCategory
} from '@/lib/portionSizeRecommendations';

const suggested = suggestPortionCategory(FoodCategory.SOUP_THIN);
// Returns: 'bowl'

const rationale = getPortionSizeRationale(FoodCategory.SOUP_THIN);
// Returns: "Low viscosity; behaves like liquid"
```

## API Usage

### Create Recipe with Food Category

**POST** `/api/recipes/custom`

```json
{
  "recipeName": "Chicken Tikka Masala",
  "foodCategory": "curry_sauced_dish",
  "ingredients": [...],
  "servings": 4,
  "portionSizeId": "uuid-of-portion-size"
}
```

### Update Recipe Food Category

**PATCH** `/api/recipes/custom/[id]/edit`

```json
{
  "foodCategory": "curry_sauced_dish"
}
```

### Get Portion Sizes for Category

You can filter portion sizes by food category when fetching from the database:

```typescript
const { data } = await supabase
  .from('portion_sizes')
  .select('*')
  .eq('food_category', 'curry_sauced_dish');
```

## Scientific Basis

All density values and portion recommendations are based on:

1. **USDA Food and Nutrient Database for Dietary Studies (FNDDS) 2019-2020**
2. **USDA Standard Reference (SR28)**
3. **USDA Handbook 8**
4. **USDA Food Buying Guide**
5. **Food Engineering Research** publications
6. **Institutional Foodservice Data**
7. **Nutritional Analysis Lab** studies

Accuracy ranges reflect real-world measurement variability observed in controlled portion size studies.

## Benefits

### 1. User Experience
- **Intuitive Measurements**: Users see portion sizes that match how they think about food
  - Soups in bowls
  - Beverages in glasses
  - Rice in cups
  - Meat by palm size

### 2. Accuracy
- **Category-Specific Densities**: Accurate volume-to-weight conversions
- **Validated Ranges**: Based on scientific research
- **Accuracy Indicators**: Users know measurement precision

### 3. Flexibility
- **Multi-Regional Support**: Works with US customary, metric, and UK imperial
- **Smart Recommendations**: System suggests appropriate portions based on food type
- **Alternative Options**: Multiple portion sizes per category

### 4. Nutritional Precision
- **Proper Scaling**: Nutrition multipliers based on actual food properties
- **Weight-Based for Solids**: More accurate than volume for non-homogeneous foods
- **Volume-Based for Liquids**: Natural measurement for beverages and liquid dishes

## Database Seeding

Run migrations to seed the database:

```bash
# Apply migrations
npm run migrate

# Or manually run:
psql -d your_database -f database/migrations/080_add_food_categories.sql
psql -d your_database -f database/migrations/081_seed_category_portion_sizes.sql
```

This will:
1. Add `food_category` column to `cached_recipes`
2. Add `food_category` column to `portion_sizes`
3. Create `food_category_density_refs` table
4. Seed 150+ category-specific portion sizes
5. Seed 27 density reference entries

## Future Enhancements

Potential improvements:
1. **AI-Powered Category Detection**: Auto-detect food category from recipe name/ingredients
2. **Regional Customization**: Adjust portion sizes based on user locale
3. **Dietary Restrictions Integration**: Link portions to dietary guidelines (USDA MyPlate, etc.)
4. **Visual Portion Guides**: Show images of portion sizes
5. **User Custom Portions**: Allow nutritionists to create custom portions for categories
6. **Portion History**: Track commonly used portions per nutritionist
7. **Smart Defaults**: Learn preferred portion sizes over time

## Testing

To test the implementation:

```typescript
// Test food category assignment
const recipe = await customRecipeService.createCustomRecipe({
  recipeName: "Tomato Soup",
  foodCategory: FoodCategory.SOUP_THIN,
  // ...
}, nutritionistId);

console.log(recipe.foodCategory); // 'soup_thin'

// Test portion recommendations
const portions = getRecommendedPortionSizes(FoodCategory.SOUP_THIN);
console.log(portions.allowedPortions.length); // Should have multiple options

// Test density conversions
const weight = convertVolumeToWeight(300, FoodCategory.SOUP_THIN);
console.log(weight); // ~306g (1.02 g/mL)
```

## References

- USDA FoodData Central: https://fdc.nal.usda.gov/
- FNDDS Documentation: https://www.ars.usda.gov/northeast-area/beltsville-md-bhnrc/beltsville-human-nutrition-research-center/food-surveys-research-group/docs/fndds/
- Food Measurement Research: Various food science journals and institutional studies

## Support

For questions or issues:
1. Check the utility functions in [portionSizeRecommendations.ts](lib/portionSizeRecommendations.ts)
2. Review food categories in [foodCategory.ts](types/foodCategory.ts)
3. Verify database migrations ran successfully
4. Check that `food_category` values match the `FoodCategory` enum exactly

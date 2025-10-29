# Optional Macro Goals Feature

## Overview
Users can now create client goals with only dietary preferences (allergies, preferences, cuisineTypes) and add macro goals later.

## Changes Made

### 1. Database Migration
**File**: `database/migrations/076_make_macro_goals_nullable.sql`

Made all macro goal columns nullable in the `client_goals` table:
- `eer_goal_calories`
- `protein_goal_min`, `protein_goal_max`
- `carbs_goal_min`, `carbs_goal_max`
- `fat_goal_min`, `fat_goal_max`

### 2. TypeScript Types
**File**: `lib/supabase.ts`

Updated database type definitions:
- Made all macro fields optional with `number | null` type
- Applies to both `Row` and `Insert` types

### 3. ClientGoalsService
**File**: `lib/clientGoalsService.ts`

Updated `createClientGoal` method:
- Uses nullish coalescing operator (`??`) to set `null` when macro values are not provided
- Changed from `|| 0` to `?? null` for all macro fields
- Validation only runs when macro values are provided

### 4. Valid Preferences
**File**: `types/clientGoals.ts`

Expanded `VALID_PREFERENCES` to include all allergy values:
- Users can now use `dairy-free`, `gluten-free`, etc. as preferences (not just allergies)
- This allows people to avoid foods for lifestyle/dietary reasons, not just allergies

## Usage

### Create Goal with Only Dietary Preferences
```bash
curl 'https://caloriescience-api.vercel.app/api/meal-plans' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "type": "client-goal",
    "clientId": "CLIENT_ID",
    "cuisineTypes": ["american"],
    "allergies": ["dairy-free"],
    "preferences": ["dairy-free", "vegetarian"]
  }'
```

**Response** (before migration):
```json
{
  "success": true,
  "data": {
    "id": "...",
    "eerGoalCalories": 0,  // Will be null after migration
    "proteinGoalMin": 0,   // Will be null after migration
    "allergies": ["dairy-free"],
    "preferences": ["dairy-free", "vegetarian"],
    "cuisineTypes": ["american"]
  }
}
```

### Add Macro Goals Later
```bash
curl 'https://caloriescience-api.vercel.app/api/meal-plans' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "type": "client-goal",
    "clientId": "CLIENT_ID",
    "eerGoalCalories": 2000,
    "proteinGoalMin": 100,
    "proteinGoalMax": 150,
    "carbsGoalMin": 200,
    "carbsGoalMax": 250,
    "fatGoalMin": 50,
    "fatGoalMax": 70
  }'
```

## Deployment

### Production Database Migration
Run this SQL in your Supabase production database:

```sql
-- Make macro goal columns nullable
ALTER TABLE client_goals 
  ALTER COLUMN eer_goal_calories DROP NOT NULL,
  ALTER COLUMN protein_goal_min DROP NOT NULL,
  ALTER COLUMN protein_goal_max DROP NOT NULL,
  ALTER COLUMN carbs_goal_min DROP NOT NULL,
  ALTER COLUMN carbs_goal_max DROP NOT NULL,
  ALTER COLUMN fat_goal_min DROP NOT NULL,
  ALTER COLUMN fat_goal_max DROP NOT NULL;
```

### Verification
After migration, verify:
1. Existing goals with macro values are unaffected
2. New goals without macros have `null` values (not 0)
3. Updates can add macros to goals that only have dietary preferences

## Valid Values

### Allergies (Safety-Critical)
```
celery-free, crustacean-free, dairy-free, egg-free, fish-free, 
fodmap-free, gluten-free, lupine-free, mollusk-free, mustard-free, 
peanut-free, pork-free, sesame-free, shellfish-free, soy-free, 
sulfite-free, tree-nut-free, wheat-free
```

### Preferences (Lifestyle Choices)
All allergy values PLUS:
```
alcohol-cocktail, alcohol-free, DASH, immuno-supportive, 
keto-friendly, kidney-friendly, kosher, low-potassium, low-sugar, 
Mediterranean, No-oil-added, paleo, pecatarian, red-meat-free, 
sugar-conscious, vegan, vegetarian
```

### Cuisine Types
```
american, asian, british, caribbean, central europe, chinese, 
eastern europe, french, greek, indian, italian, japanese, korean, 
kosher, mediterranean, mexican, middle eastern, nordic, 
south american, south east asian, world
```

## Benefits

1. **Flexible Workflow**: Nutritionists can set dietary restrictions first, then calculate macros later
2. **Better UX**: No need to enter placeholder macro values (like 0s)
3. **Clear Intent**: `null` values clearly indicate "not set yet" vs. `0` meaning "no goal"
4. **Validation**: Macro ranges are still validated when provided

## Testing

Test script available: `test-optional-macro-goals.sh`

Run tests:
```bash
chmod +x test-optional-macro-goals.sh
./test-optional-macro-goals.sh
```


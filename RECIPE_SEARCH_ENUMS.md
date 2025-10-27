# Recipe Search Enums - Complete Reference

## All Valid Values for Recipe Search Parameters Across All Providers

---

## 🍽️ **Meal Types**

### **Universal (All Providers)**
```
breakfast
lunch
dinner
snack
```

### **Edamam Additional**
```
brunch
teatime
```

### **Complete List**
```javascript
[
  'breakfast',
  'brunch',
  'lunch',
  'dinner',
  'snack',
  'teatime'
]
```

**Usage:**
```bash
curl "...?mealType=breakfast"
curl "...?mealType=lunch"
curl "...?mealType=snack"
```

---

## 🍲 **Dish Types**

### **Edamam Dish Types** (Official Enum)
```
Biscuits and cookies
Bread
Cereals
Condiments and sauces
Desserts
Drinks
Egg
Main course
Pancake
Preps
Preserve
Salad
Sandwiches
Side dish
Soup
Starter
Sweets
```

### **Spoonacular Dish Types**
```
main course
side dish
dessert
appetizer
salad
bread
breakfast
soup
beverage
sauce
marinade
fingerfood
snack
drink
```

### **Bon Happetee**
```
No specific dish types - uses meal timing instead
(breakfast, lunch, dinner, snack derived from food_timing data)
```

### **Recommended Universal Dish Types** (Work with most providers)
```javascript
[
  'Main course',      // Edamam format
  'main course',      // Spoonacular format (lowercase)
  'Side dish',
  'side dish',
  'Salad',
  'salad',
  'Soup',
  'soup',
  'Desserts',
  'dessert',
  'Starter',
  'appetizer',
  'Bread',
  'bread',
  'Drinks',
  'drink'
]
```

**Usage:**
```bash
# Edamam (capitalized)
curl "...?dishType=Main%20course"
curl "...?dishType=Salad"

# Spoonacular (lowercase)
curl "...?dishType=main%20course"
curl "...?dishType=salad"
```

---

## 🏷️ **Health Labels** (Allergen-Based)

### **Format:** `{allergen}-free`

```javascript
[
  'peanut-free',
  'tree-nut-free',
  'dairy-free',
  'egg-free',
  'soy-free',
  'wheat-free',
  'gluten-free',
  'fish-free',
  'shellfish-free',
  'sesame-free',
  'sulfite-free'
]
```

**Usage:**
```bash
curl "...?health=dairy-free"
curl "...?health=gluten-free&health=egg-free"
```

---

## 🥗 **Diet Labels** (Dietary Preferences)

### **Universal (Edamam + Spoonacular)**
```javascript
[
  'vegetarian',
  'vegan',
  'pescatarian',
  'paleo',
  'ketogenic',
  'keto',
  'low-carb',
  'low-fat',
  'low-sodium',
  'high-protein'
]
```

### **Edamam Only**
```javascript
[
  'balanced',
  'high-fiber',
  'alcohol-free',
  'kosher'
]
```

### **Spoonacular Only**
```javascript
[
  'whole30'
]
```

**Usage:**
```bash
curl "...?diet=vegetarian"
curl "...?diet=vegan&diet=high-protein"
```

---

## 🌍 **Cuisine Types**

### **Popular (All Providers)**
```javascript
[
  'american',
  'asian',
  'chinese',
  'french',
  'greek',
  'indian',
  'italian',
  'japanese',
  'korean',
  'mediterranean',
  'mexican',
  'middle eastern',
  'spanish',
  'thai',
  'vietnamese'
]
```

### **Other Cuisines**
```javascript
[
  'african',
  'british',
  'cajun',
  'caribbean',
  'eastern european',
  'european',
  'german',
  'irish',
  'jewish',
  'latin american',
  'nordic',
  'southern'
]
```

**Usage:**
```bash
curl "...?cuisineType=indian"
curl "...?cuisineType=italian,french,mediterranean"
```

---

## 📊 **Provider-Specific Details**

### **Edamam**
- ✅ Supports all dish types (capitalized)
- ✅ Supports all meal types
- ✅ Case-sensitive dish types
- ✅ Health + Diet labels

**Dish Type Format:** Capitalized with spaces
- `Main course`, `Side dish`, `Salad`

---

### **Spoonacular**
- ✅ Supports dish types (lowercase)
- ✅ Uses `type` parameter (maps from mealType)
- ✅ Intolerances for allergens

**Dish Type Format:** Lowercase
- `main course`, `side dish`, `salad`

**Type Parameter Values:**
```javascript
[
  'main course',
  'side dish',
  'dessert',
  'appetizer',
  'salad',
  'bread',
  'breakfast',
  'soup',
  'beverage',
  'sauce',
  'marinade',
  'fingerfood',
  'snack',
  'drink'
]
```

---

### **Bon Appetit (Bon Happetee)**
- ⚠️ Limited filtering support
- ✅ Name-based search only
- ✅ Meal timing (breakfast, lunch, dinner, snack)
- ❌ No cuisine filter
- ❌ No dish type filter
- ✅ Explicit allergen data

**Meal Timing:**
```javascript
[
  'breakfast',
  'lunch',
  'dinner',
  'snack'
]
```

---

## 🔍 **For Manual Recipe Creation**

When creating custom/manual recipes, use these values:

### **Recommended Values**

```json
{
  "mealTypes": ["breakfast"],           // Use singular from meal types list
  "dishTypes": ["main course"],         // Use lowercase for compatibility
  "cuisineTypes": ["american"],         // Use lowercase
  "healthLabels": ["dairy-free"],       // Use {allergen}-free format
  "dietLabels": ["vegetarian", "keto"]  // Use lowercase
}
```

### **Common Combinations**

```javascript
// Breakfast
{
  "mealTypes": ["breakfast"],
  "dishTypes": ["main course", "bread"],
  "cuisineTypes": ["american"]
}

// Lunch/Dinner
{
  "mealTypes": ["lunch", "dinner"],
  "dishTypes": ["main course", "salad"],
  "cuisineTypes": ["mediterranean"]
}

// Snacks
{
  "mealTypes": ["snack"],
  "dishTypes": ["appetizer", "fingerfood"],
  "cuisineTypes": ["asian"]
}

// Desserts
{
  "mealTypes": ["dessert"],
  "dishTypes": ["dessert", "sweets"],
  "cuisineTypes": ["french"]
}
```

---

## ⚠️ **Important Notes**

### **Case Sensitivity**
- **Edamam:** Case-sensitive, prefers Title Case (`Main course`)
- **Spoonacular:** Lowercase (`main course`)
- **Recommendation:** Use lowercase for compatibility

### **Spaces in Values**
- Use URL encoding: `Main course` → `Main%20course`
- Or: `middle eastern` → `middle%20eastern`

### **Multiple Values**
```bash
# Comma-separated
?cuisineType=indian,chinese,thai

# Multiple parameters
?health=dairy-free&health=gluten-free

# Arrays (in JSON)
"cuisineTypes": ["indian", "chinese", "thai"]
```

---

## ✅ **Safe Cross-Provider Values**

Use these values for best compatibility across all providers:

### Meal Types
```
breakfast, lunch, dinner, snack
```

### Dish Types (lowercase)
```
main course, side dish, salad, soup, appetizer, dessert, bread, drink
```

### Cuisine Types
```
american, asian, chinese, french, greek, indian, italian,
japanese, korean, mediterranean, mexican, thai
```

### Health Labels
```
dairy-free, egg-free, gluten-free, peanut-free, soy-free,
tree-nut-free, fish-free, shellfish-free
```

### Diet Labels
```
vegetarian, vegan, pescatarian, paleo, keto, low-carb,
low-fat, high-protein
```

---

## 📖 **See Also**

- `RECIPE_SEARCH_PARAMETER_VALUES.md` - Detailed parameter documentation
- `VALID_ALLERGENS_AND_PREFERENCES.md` - Allergen validation
- `BON_HAPPETEE_INTEGRATION.md` - Bon Appetit specific info
- `RECIPE_SEARCH_CLIENT_API.md` - Client-aware search API

---

**Last Updated:** October 24, 2025  
**Providers Covered:** Edamam, Spoonacular, Bon Appetit


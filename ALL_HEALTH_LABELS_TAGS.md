# All Health Labels and Tags from All Providers

## Complete enumeration of health labels, diet labels, and tags from Edamam, Spoonacular, and Bon Appetit

---

## 🏷️ **Edamam Health Labels**

### **Allergen-Free Labels**
```
Peanut-Free
Tree-Nut-Free
Dairy-Free
Egg-Free
Soy-Free
Wheat-Free
Gluten-Free
Fish-Free
Shellfish-Free
Crustacean-Free
Celery-Free
Mustard-Free
Sesame-Free
Lupine-Free
Mollusk-Free
Sulfite-Free
```

### **Dietary Labels**
```
Vegetarian
Vegan
Pescatarian
Paleo
Keto-Friendly
Ketogenic
```

### **Nutrition Focus**
```
Low-Carb
Low-Fat
Low-Sodium
High-Protein
High-Fiber
Balanced
```

### **Lifestyle**
```
Kosher
Alcohol-Free
Pork-Free
Red-Meat-Free
```

### **Format:** Title Case (e.g., "Gluten-Free", "Peanut-Free")

---

## 🍽️ **Spoonacular Health/Diet Flags**

### **Boolean Flags** (extracted as health labels)
```
glutenFree      → "gluten-free"
dairyFree       → "dairy-free"
vegan           → "vegan"
vegetarian      → "vegetarian"
ketogenic       → "ketogenic"
lowFodmap       → "low-fodmap"
whole30         → "whole30"
veryHealthy     → "healthy"
cheap           → "budget-friendly"
sustainable     → "sustainable"
```

### **Diet Array** (dietLabels)
```
gluten free
ketogenic
vegetarian
lacto vegetarian
ovo vegetarian
vegan
pescetarian
paleo
primal
low fodmap
whole30
```

### **Format:** Lowercase with spaces (e.g., "gluten free", "ketogenic")

---

## 🍛 **Bon Appetit (Bon Happetee) Tags**

### **Positive Health** (from `positive_health` field)
```
High in Vitamin A
High in Vitamin C
High in Calcium
High in Iron
High in Protein
High in Fiber
Low in Sodium
Low in Sugar
Low in Fat
Antioxidant-Rich
Heart-Healthy
```

### **Negative Health** (from `negative_health` field)
```
High in Sugar
High in Sodium
High in Cholesterol
High in Saturated Fat
```

### **Allergens** (explicit array from `/food/disorder` endpoint)
```
milk
eggs
peanuts
tree nuts
soy
wheat
gluten
fish
shellfish
sesame
```

### **Food Timing** (meal types)
```
breakfast
lunch
dinner
snack
```

### **Format:** Varies - sentence case for health tags, lowercase for allergens

---

## 🔍 **Combined Health Labels List (All Providers)**

### **Allergen-Free (Use for Filtering)**
```javascript
// Standard format: lowercase with hyphens
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
  'sulfite-free',
  'crustacean-free',
  'mollusk-free',
  'celery-free',
  'mustard-free',
  'lupine-free'
]
```

### **Diet Labels (All Providers)**
```javascript
[
  // Universal
  'vegetarian',
  'vegan',
  'pescatarian',
  'paleo',
  'ketogenic',
  'keto',
  'keto-friendly',
  
  // Carb-focused
  'low-carb',
  'low-fodmap',
  
  // Fat-focused
  'low-fat',
  
  // Sodium
  'low-sodium',
  
  // Protein/Fiber
  'high-protein',
  'high-fiber',
  
  // Lifestyle
  'kosher',
  'alcohol-free',
  'balanced',
  'whole30',
  
  // Meat-free
  'pork-free',
  'red-meat-free'
]
```

### **Nutrition Focus Tags**
```javascript
[
  'high-protein',
  'high-fiber',
  'high-vitamin',
  'high-calcium',
  'high-iron',
  'high-potassium',
  'low-sodium',
  'low-sugar',
  'low-fat',
  'low-calorie',
  'antioxidant-rich',
  'heart-healthy'
]
```

---

## 📊 **Dish Types (All Providers)**

### **Edamam** (Title Case)
```
Main course
Side dish
Desserts
Starter
Salad
Soup
Bread
Cereals
Condiments and sauces
Drinks
Pancake
Preps
Preserve
Sandwiches
Biscuits and cookies
Sweets
Egg
```

### **Spoonacular** (lowercase)
```
main course
main dish
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

### **Bon Appetit**
```
Not applicable - uses meal timing only
```

---

## 🍽️ **Meal Types (All Providers)**

### **Universal**
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
lunch/dinner (combined category)
```

### **Spoonacular** (uses dishTypes for meal types)
```
Same as universal + uses dishTypes
```

---

## 🌍 **Cuisine Types (All Providers)**

### **Supported by All**
```
American
Asian
Chinese
French
Greek
Indian
Italian
Japanese
Korean
Mediterranean
Mexican
Middle Eastern
Spanish
Thai
Vietnamese
```

### **Additional**
```
African
British
Caribbean
Cajun
Eastern European
European
German
Irish
Jewish
Latin American
Nordic
Southern
```

### **Format:** Varies by provider
- **Edamam:** Title case ("American", "Middle Eastern")
- **Spoonacular:** Title case ("Italian", "Asian")
- **Bon Appetit:** Not supported

---

## 🎯 **Allergen Ingredient Keywords (for Deep Filtering)**

### **Dairy**
```
milk, cheese, paneer, butter, cream, yogurt, ghee, curd, whey, casein,
lactose, mozzarella, cheddar, parmesan, ricotta, feta, cottage cheese,
cream cheese, sour cream, ice cream, gelato, kulfi, khoa, mawa, dahi, lassi
```

### **Eggs**
```
egg, eggs, egg white, egg yolk, mayonnaise, mayo, aioli, omelette, omelet
```

### **Peanuts**
```
peanut, peanuts, peanut butter, peanut oil, groundnut
```

### **Tree Nuts**
```
almond, almonds, cashew, cashews, walnut, walnuts, pecan, pecans,
hazelnut, macadamia, pistachio, pine nut, brazil nut, chestnut,
almond milk, almond butter, cashew cream, kaju
```

### **Soy**
```
soy, soya, soybean, tofu, tempeh, edamame, miso, soy sauce, soy milk,
soy protein, tvp, natto
```

### **Wheat**
```
wheat, wheat flour, whole wheat, semolina, durum, spelt, kamut, farro,
bulgur, couscous, seitan
```

### **Gluten**
```
wheat, barley, rye, flour, bread, pasta, noodles, malt, beer,
couscous, seitan, bulgur
```

### **Fish**
```
fish, salmon, tuna, cod, tilapia, halibut, trout, bass, sardine,
anchovy, mackerel, fish sauce, fish stock
```

### **Shellfish**
```
shrimp, prawn, crab, lobster, oyster, clam, mussel, scallop,
squid, calamari, octopus, shellfish, seafood
```

### **Sesame**
```
sesame, sesame seed, sesame oil, tahini, til
```

---

## 📝 **Usage in API Responses**

### **Search Response Structure**
```json
{
  "recipes": [
    {
      "id": "...",
      "title": "...",
      "source": "edamam",
      "healthLabels": ["Gluten-Free", "Dairy-Free", "Vegetarian"],
      "dietLabels": ["Balanced", "High-Protein"],
      "cuisineType": ["indian"],
      "dishType": ["main course"],
      "mealType": ["lunch/dinner"],
      "allergens": null,
      "ingredients": [
        {"name": "chicken", "quantity": 500, "unit": "g"},
        {"name": "rice", "quantity": 1, "unit": "cup"}
      ]
    }
  ]
}
```

---

## ⚠️ **Important Notes**

### **Health Labels Reliability**

1. **Edamam:** 
   - ✅ Generally reliable for Western foods
   - ⚠️ May miss allergens in Indian foods (e.g., paneer)
   - **Solution:** Use ingredient-level checking

2. **Spoonacular:**
   - ✅ Good boolean flags for common allergens
   - ⚠️ Limited to boolean flags only
   - **Solution:** Check ingredients

3. **Bon Appetit:**
   - ✅ Explicit allergen array (most reliable!)
   - ✅ Good for Indian foods
   - **Solution:** Trust allergen array

### **Filtering Strategy**

```javascript
// 1. Check explicit allergens array (if available)
if (recipe.allergens && recipe.allergens.includes('dairy')) {
  filter_out = true;
}

// 2. Check health labels (inverse logic)
if (!recipe.healthLabels.includes('Dairy-Free')) {
  // May contain dairy
}

// 3. Check ingredients (MOST RELIABLE)
recipe.ingredients.forEach(ing => {
  if (ALLERGEN_INGREDIENT_KEYWORDS['dairy'].some(kw => 
    ing.name.toLowerCase().includes(kw)
  )) {
    filter_out = true;
  }
});
```

---

## 📖 **See Also**

- `ALLERGEN_INGREDIENT_KEYWORDS` - lib/allergenChecker.ts
- `VALID_ALLERGENS` - lib/allergenPreferenceValidation.ts
- `RECIPE_SEARCH_ENUMS.md` - Complete enum reference

---

**Last Updated:** October 24, 2025  
**Providers:** Edamam, Spoonacular, Bon Appetit


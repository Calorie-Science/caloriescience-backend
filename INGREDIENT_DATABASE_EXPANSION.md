# Ingredient Database Expansion

## Summary
Added 200+ new ingredients to the `simple_ingredients` table across two migration files (069 and 070).

## Migration Files Created

### 069_add_mushrooms_and_more_vegetables.sql
Adds **~130 ingredients** focusing on:
- **Mushrooms (7 varieties)**:
  - Button mushroom, Portobello, Shiitake, Oyster, Enoki, Cremini, Chanterelle

- **Vegetables (~70+ items)**:
  - **Peppers**: Bell pepper (red, green, yellow), Jalapeño, Serrano
  - **Squashes**: Butternut, Acorn, Spaghetti, Yellow, Zucchini
  - **Leafy Greens**: Romaine, Arugula, Swiss chard, Collard greens, Bok choy
  - **Beans & Peas**: Green beans, Wax beans, Snow peas, Snap peas, Edamame
  - **Cruciferous**: Cauliflower, Brussels sprouts, Cabbage (red, napa)
  - **Root Vegetables**: Potato varieties (russet, red), Parsnip, Turnip, Jicama, Beetroot, Radish
  - **Specialty**: Artichoke, Fennel, Leek, Endive, Radicchio, Watercress
  - **Alliums**: Onion (red, white), Shallot, Scallion, Garlic, Ginger
  - **Other**: Asparagus, Celery, Eggplant, Corn, Pumpkin

- **Indian Vegetables (~15 items)**:
  - Bitter gourd/Karela, Bottle gourd/Lauki, Ridge gourd/Turai
  - Drumstick, Methi, Palak, Bhindi, Tindora

### 070_add_more_proteins_fruits_and_others.sql
Adds **~170 ingredients** focusing on:

- **Proteins (~35 items)**:
  - **Poultry**: Chicken (thigh, ground), Turkey (breast, ground), Duck
  - **Beef**: Ground beef, Steak (ribeye, sirloin), Bacon
  - **Pork**: Pork chop, Tenderloin, Ground pork
  - **Lamb/Mutton**: Lamb chops, Mutton
  - **Fish**: Tuna, Cod, Halibut, Tilapia, Sea bass, Trout, Mahi mahi, Sardines, Mackerel
  - **Seafood**: Shrimp, Prawns, Crab, Lobster, Scallops, Mussels, Oysters, Clams, Squid, Octopus
  - **Plant-based**: Tempeh, Seitan, Cottage cheese

- **Fruits (~30 items)**:
  - **Stone Fruits**: Peach, Nectarine, Apricot, Plum, Cherry
  - **Berries**: Blackberry, Cranberry
  - **Citrus**: Grapefruit, Tangerine, Clementine, Lime
  - **Melons**: Cantaloupe, Honeydew
  - **Tropical**: Dragon fruit, Passion fruit, Lychee, Star fruit, Persimmon
  - **Dried**: Raisin, Prune, Date, Fig

- **Nuts & Seeds (~15 items)**:
  - **Nuts**: Peanut, Pistachio, Pecan, Macadamia, Hazelnut, Brazil nut, Pine nut
  - **Seeds**: Pumpkin seeds, Hemp seeds, Sesame seeds
  - **Nut Butters**: Almond butter, Cashew butter, Tahini

- **Herbs (~10 items)**:
  - Fresh: Basil, Cilantro, Parsley, Mint, Oregano, Thyme, Rosemary, Dill, Sage, Bay leaf

- **Spices (~15 items)**:
  - Indian: Coriander, Cumin, Turmeric, Garam masala, Curry powder, Cardamom, Mustard seeds, Fenugreek seeds
  - International: Paprika, Cinnamon, Black pepper, Cayenne, Chili powder, Cloves, Nutmeg

- **Oils & Condiments (~20 items)**:
  - **Oils**: Canola, Avocado, Sesame
  - **Sweeteners**: Brown sugar, Maple syrup, Agave nectar
  - **Vinegars**: Apple cider, Balsamic, Rice vinegar
  - **Others**: Soy sauce, Tomato paste

## Total Additions
- **200+ new ingredients** added to simple_ingredients table
- Comprehensive coverage of:
  - 7 mushroom varieties
  - 85+ vegetables (Western + Indian)
  - 35+ protein sources (meat, fish, seafood, plant-based)
  - 30+ fruits (fresh, tropical, dried)
  - 15+ nuts and seeds
  - 25+ herbs and spices
  - 20+ oils, condiments, and sweeteners

## Features
Each ingredient includes:
- ✅ Serving size (quantity + unit)
- ✅ Complete macros (calories, protein, carbs, fat, fiber)
- ✅ Micronutrients (vitamins, minerals where applicable)
- ✅ Health labels (vegan, vegetarian, gluten-free, dairy-free, keto, etc.)
- ✅ Diet labels (vegan, vegetarian, keto)
- ✅ Allergen information
- ✅ Image URLs (Spoonacular CDN)

## Usage
To apply these migrations:

```bash
# Make sure you're connected to your database
# Then run the migrations in order:

# Migration 069 - Mushrooms and vegetables
psql -d your_database < database/migrations/069_add_mushrooms_and_more_vegetables.sql

# Migration 070 - Proteins, fruits, nuts, herbs, condiments
psql -d your_database < database/migrations/070_add_more_proteins_fruits_and_others.sql
```

## Integration
The `simpleIngredientService.ts` will automatically:
- Load these ingredients from the database (with 5-minute caching)
- Fallback to hardcoded ingredients if database fails
- Return ingredients in recipe-compatible format
- Support allergen filtering

## Search Examples
After migration, users can search for:
- "shiitake mushroom"
- "portobello"
- "bok choy"
- "butternut squash"
- "tempeh"
- "mackerel"
- "dragon fruit"
- "tahini"
- "garam masala"

All will return instant results with complete nutrition data!

## Notes
- All ingredients follow the same schema as existing entries
- Nutrition data is research-based and standardized
- Images use Spoonacular CDN for consistency
- Both Western and Indian ingredients included
- Low-carb, keto, high-protein, and dietary preferences supported


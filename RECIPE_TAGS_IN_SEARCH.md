# Recipe Tags in Search Results

## ✨ Feature: Unified Tags Array

Added a computed `tags` field to recipe search results that combines all categorization metadata into a single convenient array.

## 📊 What's Included

The `tags` array combines:
1. **Cuisine Types** - e.g., `"Indian"`, `"Italian"`, `"Mexican"`
2. **Dish Types** - e.g., `"Main Course"`, `"Appetizer"`, `"Dessert"`
3. **Meal Types** - e.g., `"Breakfast"`, `"Lunch"`, `"Dinner"`, `"Snack"`
4. **Health Labels** - e.g., `"Vegan"`, `"Gluten-Free"`, `"Dairy-Free"`
5. **Diet Labels** - e.g., `"Low-Carb"`, `"Keto"`, `"Paleo"`

## 📝 Response Structure

### Before (still available):
```json
{
  "id": "recipe_123",
  "title": "Paneer Tikka",
  "calories": 250,
  "cuisineType": ["Indian"],
  "dishType": ["Main Course"],
  "mealType": ["Dinner"],
  "healthLabels": ["Vegetarian", "Gluten-Free"],
  "dietLabels": ["High-Protein"]
}
```

### After (NEW tags field added):
```json
{
  "id": "recipe_123",
  "title": "Paneer Tikka",
  "calories": 250,
  "cuisineType": ["Indian"],
  "dishType": ["Main Course"],
  "mealType": ["Dinner"],
  "healthLabels": ["Vegetarian", "Gluten-Free"],
  "dietLabels": ["High-Protein"],
  "tags": [
    "Indian",
    "Main Course",
    "Dinner",
    "Vegetarian",
    "Gluten-Free",
    "High-Protein"
  ]
}
```

## 🎯 Benefits

1. **Single Array** - No need to check multiple fields for categorization
2. **Easy Filtering** - Frontend can filter by any tag type
3. **Better UX** - Display all relevant tags in one place
4. **Searchable** - Easy to search within tags
5. **Backward Compatible** - Original fields still available

## 💻 Usage Examples

### Frontend Display
```javascript
// Display all tags as badges
<div className="recipe-tags">
  {recipe.tags.map(tag => (
    <span key={tag} className="badge">
      {tag}
    </span>
  ))}
</div>

// Output:
// [Indian] [Main Course] [Dinner] [Vegetarian] [Gluten-Free] [High-Protein]
```

### Filtering Recipes
```javascript
// Filter recipes by tag
const veganRecipes = recipes.filter(recipe => 
  recipe.tags.includes('Vegan')
);

// Check if recipe has any of multiple tags
const breakfastOrBrunch = recipes.filter(recipe =>
  recipe.tags.some(tag => ['Breakfast', 'Brunch'].includes(tag))
);

// Check if recipe is healthy (multiple health labels)
const healthyRecipes = recipes.filter(recipe => {
  const healthTags = ['Low-Fat', 'Low-Sodium', 'Low-Sugar'];
  return healthTags.some(tag => recipe.tags.includes(tag));
});
```

### Search Within Tags
```javascript
// Search for Italian or Mediterranean recipes
const searchTerm = 'italian';
const matches = recipes.filter(recipe =>
  recipe.tags.some(tag => tag.toLowerCase().includes(searchTerm))
);
```

### Grouping by Cuisine
```javascript
// Group recipes by cuisine type
const byCuisine = recipes.reduce((acc, recipe) => {
  const cuisine = recipe.cuisineType[0] || 'Other';
  if (!acc[cuisine]) acc[cuisine] = [];
  acc[cuisine].push(recipe);
  return acc;
}, {});

// Or use tags directly
const italianRecipes = recipes.filter(r => r.tags.includes('Italian'));
```

## 🔍 Complete Example

```json
{
  "success": true,
  "data": {
    "recipes": [
      {
        "id": "recipe_paneer_tikka",
        "title": "Paneer Tikka Masala",
        "image": "https://...",
        "source": "edamam",
        "calories": 320,
        "protein": 18,
        "carbs": 25,
        "fat": 16,
        "cuisineType": ["Indian"],
        "dishType": ["Main Course"],
        "mealType": ["Lunch", "Dinner"],
        "healthLabels": [
          "Vegetarian",
          "Gluten-Free",
          "Peanut-Free",
          "Tree-Nut-Free"
        ],
        "dietLabels": ["High-Protein"],
        "tags": [
          "Indian",
          "Main Course",
          "Lunch",
          "Dinner",
          "Vegetarian",
          "Gluten-Free",
          "Peanut-Free",
          "Tree-Nut-Free",
          "High-Protein"
        ]
      },
      {
        "id": "recipe_vegan_bowl",
        "title": "Vegan Buddha Bowl",
        "image": "https://...",
        "source": "spoonacular",
        "calories": 380,
        "protein": 15,
        "carbs": 52,
        "fat": 12,
        "cuisineType": ["American"],
        "dishType": ["Salad", "Main Course"],
        "mealType": ["Lunch"],
        "healthLabels": [
          "Vegan",
          "Vegetarian",
          "Dairy-Free",
          "Egg-Free"
        ],
        "dietLabels": ["Low-Fat"],
        "tags": [
          "American",
          "Salad",
          "Main Course",
          "Lunch",
          "Vegan",
          "Vegetarian",
          "Dairy-Free",
          "Egg-Free",
          "Low-Fat"
        ]
      }
    ]
  }
}
```

## 📱 UI Component Example

```jsx
function RecipeCard({ recipe }) {
  // Separate tags by type for different styling
  const cuisineTags = recipe.cuisineType;
  const healthTags = recipe.healthLabels;
  const dietTags = recipe.dietLabels;
  
  return (
    <div className="recipe-card">
      <img src={recipe.image} alt={recipe.title} />
      <h3>{recipe.title}</h3>
      
      {/* Cuisine badge */}
      {cuisineTags.map(tag => (
        <span className="badge badge-cuisine">{tag}</span>
      ))}
      
      {/* Health tags */}
      {healthTags.slice(0, 3).map(tag => (
        <span className="badge badge-health">{tag}</span>
      ))}
      
      {/* OR just show all tags at once */}
      <div className="tags-container">
        {recipe.tags.map(tag => (
          <span key={tag} className="badge">{tag}</span>
        ))}
      </div>
    </div>
  );
}
```

## 🎨 Tag Categories for Styling

You can style tags differently based on category:

```javascript
function getTagCategory(tag, recipe) {
  if (recipe.cuisineType.includes(tag)) return 'cuisine';
  if (recipe.dishType.includes(tag)) return 'dish';
  if (recipe.mealType.includes(tag)) return 'meal';
  if (recipe.healthLabels.includes(tag)) return 'health';
  if (recipe.dietLabels.includes(tag)) return 'diet';
  return 'other';
}

// Then apply different styles
<span className={`badge badge-${getTagCategory(tag, recipe)}`}>
  {tag}
</span>
```

## 📊 Tag Statistics

```javascript
// Count most common tags across all recipes
const tagCounts = recipes.reduce((acc, recipe) => {
  recipe.tags.forEach(tag => {
    acc[tag] = (acc[tag] || 0) + 1;
  });
  return acc;
}, {});

// Sort by frequency
const popularTags = Object.entries(tagCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10);

console.log('Top 10 tags:', popularTags);
// Output: [["Vegetarian", 45], ["Gluten-Free", 38], ["Indian", 32], ...]
```

## 🔧 Implementation Details

**File:** `/lib/multiProviderRecipeSearchService.ts`

**Code:**
```typescript
tags: [
  ...(recipe.cuisineType || []),
  ...(recipe.dishType || []),
  ...(recipe.mealType || []),
  ...(recipe.healthLabels || []),
  ...(recipe.dietLabels || [])
]
```

## ✅ Applies To

- ✅ Edamam recipes
- ✅ Spoonacular recipes  
- ✅ Bon Appetit recipes
- ✅ All recipe search endpoints

## 📅 Status

- **Date:** October 21, 2025
- **Status:** ✅ Implemented
- **Backward Compatible:** Yes (original fields still available)


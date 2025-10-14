# Valid Allergens and Preferences for Client Goals

**⚠️ CRITICAL: This list defines what can be stored in `client_goals.allergies` and `client_goals.preferences` arrays.**

All values MUST be validated before storing in the database to ensure API compatibility.

---

## Valid Allergens (client_goals.allergies)

**Format:** Store in lowercase, as shown below.

### Supported Allergens (API-Compatible)

| Value | Edamam Filter | Spoonacular Filter | Both APIs? |
|-------|---------------|-------------------|------------|
| `peanuts` | `peanut-free` | `Peanut` | ✅ |
| `tree nuts` | `tree-nut-free` | `Tree Nut` | ✅ |
| `dairy` | `dairy-free` | `Dairy` | ✅ |
| `eggs` | `egg-free` | `Egg` | ✅ |
| `soy` | `soy-free` | `Soy` | ✅ |
| `wheat` | `wheat-free` | `Wheat` | ✅ |
| `gluten` | `gluten-free` | `Gluten` | ✅ |
| `fish` | `fish-free` | `Seafood` | ✅ |
| `shellfish` | `shellfish-free` | `Shellfish` | ✅ |
| `sesame` | `sesame-free` | `Sesame` | ✅ |
| `sulfites` | `sulfite-free` | `Sulfite` | ✅ |

**Total:** 11 supported allergens

### Aliases (Automatically Mapped)
These are variants that map to the same filter:

| Alias | Maps To |
|-------|---------|
| `peanut` | `peanuts` |
| `nuts` | `tree nuts` |
| `almonds`, `almond` | `tree nuts` |
| `cashews`, `cashew` | `tree nuts` |
| `walnuts`, `walnut` | `tree nuts` |
| `pecans`, `pecan` | `tree nuts` |
| `milk` | `dairy` |
| `lactose` | `dairy` |
| `cheese` | `dairy` |
| `butter` | `dairy` |
| `cream` | `dairy` |
| `yogurt` | `dairy` |
| `egg` | `eggs` |
| `soya` | `soy` |
| `soybeans` | `soy` |
| `shrimp` | `shellfish` |
| `crab` | `shellfish` |
| `lobster` | `shellfish` |
| `oysters`, `oyster` | `shellfish` |
| `clams`, `clam` | `shellfish` |
| `mussels`, `mussel` | `shellfish` |
| `sulfite` | `sulfites` |

**Recommendation:** Store the canonical form (`peanuts`, not `peanut`) for consistency.

---

## Valid Preferences (client_goals.preferences)

**Format:** Store in lowercase, as shown below.

### Universal Preferences (Both APIs Support)

✅ **Safe to use with `provider=both`**

| Value | Edamam | Spoonacular | Safe? |
|-------|--------|-------------|-------|
| `vegetarian` | ✅ | ✅ | ✅ Yes |
| `vegan` | ✅ | ✅ | ✅ Yes |
| `pescatarian` | ✅ | ✅ | ✅ Yes |
| `paleo` | ✅ | ✅ | ✅ Yes |
| `ketogenic` | ✅ | ✅ | ✅ Yes |
| `keto` | ✅ | ✅ | ✅ Yes (alias) |
| `low-carb` | ✅ | ✅ | ✅ Yes |
| `low-fat` | ✅ | ✅ | ✅ Yes |
| `low-sodium` | ✅ | ✅ | ✅ Yes |
| `high-protein` | ✅ | ✅ | ✅ Yes |

### Provider-Specific Preferences

⚠️ **Use with caution when `provider=both`**

#### Edamam Only
| Value | Edamam | Spoonacular | Warning |
|-------|--------|-------------|---------|
| `balanced` | ✅ | ❌ | Spoonacular recipes won't respect this |
| `high-fiber` | ✅ | ❌ | Spoonacular recipes won't respect this |
| `alcohol-free` | ✅ | ❌ | Spoonacular recipes won't respect this |
| `kosher` | ✅ | ❌ | Spoonacular recipes won't respect this |

#### Spoonacular Only
| Value | Edamam | Spoonacular | Warning |
|-------|--------|-------------|---------|
| `whole30` | ❌ | ✅ | Edamam recipes won't respect this |

### Unsupported Preferences
❌ **These should NOT be stored (will be ignored)**

| Value | Reason |
|-------|--------|
| `halal` | Neither API supports this |
| `organic` | Not filterable by APIs |
| `non-gmo` | Not filterable by APIs |

---

## Validation Schema (TypeScript)

```typescript
// Valid allergens (canonical forms only)
export const VALID_ALLERGENS = [
  'peanuts',
  'tree nuts',
  'dairy',
  'eggs',
  'soy',
  'wheat',
  'gluten',
  'fish',
  'shellfish',
  'sesame',
  'sulfites'
] as const;

// Valid preferences (all supported)
export const VALID_PREFERENCES = [
  // Universal (both APIs)
  'vegetarian',
  'vegan',
  'pescatarian',
  'paleo',
  'ketogenic',
  'keto',
  'low-carb',
  'low-fat',
  'low-sodium',
  'high-protein',
  // Edamam only
  'balanced',
  'high-fiber',
  'alcohol-free',
  'kosher',
  // Spoonacular only
  'whole30'
] as const;

// Allergen aliases
export const ALLERGEN_ALIASES: Record<string, string> = {
  'peanut': 'peanuts',
  'nuts': 'tree nuts',
  'almond': 'tree nuts',
  'almonds': 'tree nuts',
  'cashew': 'tree nuts',
  'cashews': 'tree nuts',
  'walnut': 'tree nuts',
  'walnuts': 'tree nuts',
  'pecan': 'tree nuts',
  'pecans': 'tree nuts',
  'milk': 'dairy',
  'lactose': 'dairy',
  'cheese': 'dairy',
  'butter': 'dairy',
  'cream': 'dairy',
  'yogurt': 'dairy',
  'egg': 'eggs',
  'soya': 'soy',
  'soybeans': 'soy',
  'shrimp': 'shellfish',
  'crab': 'shellfish',
  'lobster': 'shellfish',
  'oyster': 'shellfish',
  'oysters': 'shellfish',
  'clam': 'shellfish',
  'clams': 'shellfish',
  'mussel': 'shellfish',
  'mussels': 'shellfish',
  'sulfite': 'sulfites'
};

// Validation function
export function normalizeAllergen(input: string): string | null {
  const normalized = input.toLowerCase().trim();
  
  // Check if it's already valid
  if (VALID_ALLERGENS.includes(normalized as any)) {
    return normalized;
  }
  
  // Check if it's an alias
  if (ALLERGEN_ALIASES[normalized]) {
    return ALLERGEN_ALIASES[normalized];
  }
  
  // Unknown allergen
  return null;
}

export function validateAllergens(allergens: string[]): { 
  valid: string[]; 
  invalid: string[]; 
  warnings: string[] 
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  const warnings: string[] = [];
  
  for (const allergen of allergens) {
    const normalized = normalizeAllergen(allergen);
    
    if (normalized) {
      if (!valid.includes(normalized)) {
        valid.push(normalized);
      }
      
      // Warn if using alias
      if (normalized !== allergen.toLowerCase().trim()) {
        warnings.push(`"${allergen}" normalized to "${normalized}"`);
      }
    } else {
      invalid.push(allergen);
    }
  }
  
  return { valid, invalid, warnings };
}

export function validatePreferences(preferences: string[]): {
  valid: string[];
  invalid: string[];
  providerSpecific: { preference: string; provider: string }[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];
  const providerSpecific: { preference: string; provider: string }[] = [];
  
  const edamamOnly = ['balanced', 'high-fiber', 'alcohol-free', 'kosher'];
  const spoonacularOnly = ['whole30'];
  
  for (const pref of preferences) {
    const normalized = pref.toLowerCase().trim();
    
    if (VALID_PREFERENCES.includes(normalized as any)) {
      if (!valid.includes(normalized)) {
        valid.push(normalized);
      }
      
      // Flag provider-specific preferences
      if (edamamOnly.includes(normalized)) {
        providerSpecific.push({ preference: normalized, provider: 'edamam' });
      } else if (spoonacularOnly.includes(normalized)) {
        providerSpecific.push({ preference: normalized, provider: 'spoonacular' });
      }
    } else {
      invalid.push(pref);
    }
  }
  
  return { valid, invalid, providerSpecific };
}
```

---

## Database Migration (Recommended)

**Add CHECK constraints to ensure data integrity:**

```sql
-- Add validation for allergies
ALTER TABLE client_goals 
ADD CONSTRAINT check_valid_allergies 
CHECK (
  allergies IS NULL OR 
  (
    SELECT COUNT(*) 
    FROM unnest(allergies) AS allergen
    WHERE lower(allergen) NOT IN (
      'peanuts', 'tree nuts', 'dairy', 'eggs', 'soy', 
      'wheat', 'gluten', 'fish', 'shellfish', 'sesame', 'sulfites',
      -- Also allow common aliases
      'peanut', 'nuts', 'almond', 'almonds', 'cashew', 'cashews',
      'walnut', 'walnuts', 'pecan', 'pecans', 'milk', 'lactose',
      'cheese', 'butter', 'cream', 'yogurt', 'egg', 'soya', 'soybeans',
      'shrimp', 'crab', 'lobster', 'oyster', 'oysters', 'clam', 'clams',
      'mussel', 'mussels', 'sulfite'
    )
  ) = 0
);

-- Add validation for preferences
ALTER TABLE client_goals 
ADD CONSTRAINT check_valid_preferences 
CHECK (
  preferences IS NULL OR 
  (
    SELECT COUNT(*) 
    FROM unnest(preferences) AS preference
    WHERE lower(preference) NOT IN (
      'vegetarian', 'vegan', 'pescatarian', 'paleo', 
      'ketogenic', 'keto', 'low-carb', 'low-fat', 'low-sodium',
      'high-protein', 'balanced', 'high-fiber', 'alcohol-free',
      'kosher', 'whole30'
    )
  ) = 0
);
```

---

## API Integration Points

### 1. Client Goals Create/Update API
**Must validate before storing:**

```typescript
// In api/clients/goals or wherever client goals are updated
import { validateAllergens, validatePreferences } from '../lib/validationSchemas';

const { valid: validAllergens, invalid: invalidAllergens } = validateAllergens(body.allergies);
const { valid: validPreferences, invalid: invalidPreferences } = validatePreferences(body.preferences);

if (invalidAllergens.length > 0) {
  return res.status(400).json({
    error: 'Invalid allergens',
    invalid: invalidAllergens,
    supported: VALID_ALLERGENS
  });
}

if (invalidPreferences.length > 0) {
  return res.status(400).json({
    error: 'Invalid preferences',
    invalid: invalidPreferences,
    supported: VALID_PREFERENCES
  });
}

// Store validated values
await supabase.from('client_goals').upsert({
  ...otherFields,
  allergies: validAllergens,
  preferences: validPreferences
});
```

### 2. Recipe Search API
**Already handles these values correctly** ✅
- Maps allergens to Edamam health labels
- Maps Edamam labels to Spoonacular intolerances
- Warns about provider-specific preferences

---

## Summary

| Aspect | Status | Action Needed |
|--------|--------|---------------|
| **Allergens** | ✅ 11 supported | Add validation to client goals API |
| **Preferences** | ✅ 15 supported | Add validation to client goals API |
| **API Mapping** | ✅ Complete | None - already implemented |
| **Database Constraints** | ❌ Missing | Add CHECK constraints (optional) |
| **Documentation** | ✅ Complete | None |

---

**Last Updated:** October 14, 2025  
**Version:** 1.0


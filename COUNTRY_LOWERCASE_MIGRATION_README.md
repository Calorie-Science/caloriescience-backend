# Country Values Lowercase Migration

This document outlines the migration to convert all country-related column values to lowercase across the entire application for better consistency and matching in database queries.

## 🎯 **Objective**

Convert all country values in database tables to lowercase and update application code to ensure consistent lowercase usage for better country matching in queries.

## 📊 **Affected Database Tables**

The following tables contain country columns that need to be converted to lowercase:

1. **`eer_formulas`** - `country` column
2. **`pal_values`** - `country` column  
3. **`macro_guidelines`** - `country` column
4. **`micronutrient_guidelines_flexible`** - `country` column
5. **`country_micronutrient_mappings`** - `country_name` column
6. **`client_nutrition_requirements`** - `eer_guideline_country`, `macro_guideline_country` columns
7. **`client_micronutrient_requirements_flexible`** - `country_guideline` column

## 🚀 **Implementation Steps**

### **Step 1: Deploy the Database Migration**

Deploy the migration file: `database/migrations/037_convert_country_values_to_lowercase.sql`

This migration will:
- Convert all existing country values to lowercase
- Add database comments documenting the lowercase requirement
- Create indexes with lowercase functions for better performance

### **Step 2: Run the Data Conversion Script**

Execute the conversion script to update existing data:

```bash
node scripts/convert-countries-to-lowercase.js
```

**Prerequisites:**
- Set environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Install dependencies: `npm install`

### **Step 3: Update Application Code**

The following files have been updated to use lowercase country values:

#### **Updated Files:**
- `lib/locationMapping.ts` - All country mappings now return lowercase values
- `api/calculations.ts` - Uses `normalizeCountry()` function for consistent lowercase
- `lib/countryUtils.ts` - New utility functions for country normalization

#### **Key Changes:**
1. **Country Mapping Values**: All country codes now return lowercase (e.g., 'USA' → 'usa', 'EU' → 'eu')
2. **Location Normalization**: Added `normalizeCountry()` function for consistent lowercase conversion
3. **Utility Functions**: New helper functions for country field normalization

## 🔧 **New Utility Functions**

### **`normalizeCountry(country: string): string`**
Converts any country value to lowercase and trims whitespace.

```typescript
import { normalizeCountry } from './lib/locationMapping';

const country = normalizeCountry('USA'); // Returns 'usa'
const country2 = normalizeCountry('  India  '); // Returns 'india'
```

### **`normalizeCountryFields(data, countryFields)`**
Normalizes country values in an object for multiple fields.

```typescript
import { normalizeCountryFields, COMMON_COUNTRY_FIELDS } from './lib/countryUtils';

const normalizedData = normalizeCountryFields(data, ['country', 'location']);
```

### **`ensureLowerCaseCountry(country: string): string`**
Ensures country value is lowercase before database operations.

```typescript
import { ensureLowerCaseCountry } from './lib/countryUtils';

const dbCountry = ensureLowerCaseCountry('USA'); // Returns 'usa'
```

## 📝 **Database Query Examples**

### **Before (Mixed Case):**
```sql
SELECT * FROM macro_guidelines WHERE country = 'USA';
SELECT * FROM eer_formulas WHERE country = 'EU';
```

### **After (Lowercase):**
```sql
SELECT * FROM macro_guidelines WHERE country = 'usa';
SELECT * FROM eer_formulas WHERE country = 'eu';
```

### **Case-Insensitive Queries (Recommended):**
```sql
SELECT * FROM macro_guidelines WHERE LOWER(country) = 'usa';
SELECT * FROM eer_formulas WHERE LOWER(country) = 'eu';
```

## 🔍 **Testing the Migration**

### **Test Country Values:**
```bash
# Test EER calculation with different case inputs
curl -X POST 'https://your-api.com/api/calculations' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "calculateEer",
    "location": "INDIA",
    "age": 30,
    "gender": "female",
    "heightCm": 160,
    "weightKg": 70,
    "activityLevel": "moderately_active"
  }'
```

### **Expected Results:**
- All country values in responses should be lowercase
- Database queries should work consistently regardless of input case
- No more case-mismatch issues in country lookups

## ⚠️ **Important Notes**

### **Breaking Changes:**
1. **API Responses**: Country values in API responses will now be lowercase
2. **Database Values**: All existing country data will be converted to lowercase
3. **Queries**: Applications must use lowercase values or case-insensitive queries

### **Migration Safety:**
- The migration only updates existing data, doesn't delete anything
- All country values are preserved, just converted to lowercase
- Database indexes are created for better performance with lowercase queries

### **Rollback Plan:**
If rollback is needed:
1. Restore from database backup before migration
2. Revert application code changes
3. Remove the migration file

## 🧪 **Verification Checklist**

- [ ] Migration file deployed successfully
- [ ] Data conversion script executed without errors
- [ ] All country values in database are lowercase
- [ ] API endpoints return lowercase country values
- [ ] Country queries work consistently
- [ ] No case-mismatch errors in logs
- [ ] Performance tests show no degradation

## 📚 **Additional Resources**

- **Migration File**: `database/migrations/037_convert_country_values_to_lowercase.sql`
- **Conversion Script**: `scripts/convert-countries-to-lowercase.js`
- **Utility Functions**: `lib/countryUtils.ts`
- **Location Mapping**: `lib/locationMapping.ts`

## 🆘 **Troubleshooting**

### **Common Issues:**

1. **Case Mismatch Errors**: Ensure all country inputs are normalized to lowercase
2. **Query Failures**: Use case-insensitive queries with `LOWER()` function
3. **API Response Issues**: Check that `normalizeCountry()` is called on all country inputs

### **Support:**
If you encounter issues during migration, check:
1. Database logs for SQL errors
2. Application logs for validation errors
3. Ensure all environment variables are set correctly

---

**Migration Status**: ✅ **Ready for Deployment**

**Last Updated**: $(date)
**Version**: 1.0.0

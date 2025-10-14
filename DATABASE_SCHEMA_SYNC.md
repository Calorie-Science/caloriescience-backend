# Database Schema Synchronization Report

**Generated:** October 14, 2025  
**Source:** Live Supabase Database Introspection  
**Status:** ✅ Schema Synchronized

---

## Executive Summary

This document provides a comprehensive overview of the CalorieScience database schema after synchronizing with the live Supabase database. The schema has evolved significantly with **12 additional tables** that were created through migrations but not documented in the original `schema.sql`.

### Key Findings:
- **Total Tables:** 30 base tables
- **Views:** 4 database views
- **Enums:** 8 custom types
- **Missing from Documentation:** 12 tables
- **New Features Identified:** Recipe caching, AI meal planning, API management, health label standardization

---

## Database Statistics

### Tables by Category

| Category | Count | Tables |
|----------|-------|--------|
| Core User Management | 2 | `users`, `clients` |
| Client Goals & Nutrition | 4 | `client_goals`, `client_nutrition_requirements`, `client_micronutrient_requirements_flexible`, `client_documents` |
| Meal Planning | 7 | `meal_plans`, `meal_plan_meals`, `meal_plan_drafts`, `meal_plan_feedback`, `meal_programs`, `meal_program_meals`, `async_meal_plans` |
| Recipe Management | 4 | `cached_recipes`, `recipe_customizations`, `recipe_usage_stats`, `recipe_cache_performance` |
| Health Labels | 4 | `food_database_providers`, `health_labels_categories`, `health_labels_standard`, `health_labels_provider_mapping` |
| API Management | 2 | `edamam_api_keys`, `edamam_api_logs` |
| Guidelines Reference | 5 | `eer_formulas`, `pal_values`, `macro_guidelines`, `micronutrient_guidelines_flexible`, `country_micronutrient_mappings` |
| System | 2 | `migrations`, `client_interactions` |

### Total Database Objects

```
Base Tables:        30
Views:              4
Enums:              8
Indexes:            180+
Foreign Keys:       27
Unique Constraints: 17
Check Constraints:  100+
```

---

## Newly Documented Tables

### 1. **async_meal_plans** 
*AI-Powered Async Meal Plan Generation*

**Purpose:** Tracks meal plans generated asynchronously using AI models (OpenAI, Claude, Gemini)

**Key Columns:**
- `thread_id`, `run_id`: AI conversation tracking
- `ai_model`: Which AI service (openai, claude, gemini)
- `status`: pending, completed, failed
- `generated_meal_plan`: Result JSONB
- `client_goals`: Input parameters

**Migration:** `054_create_async_meal_plans.sql`, `055_add_ai_model_to_async_meal_plans.sql`, `056_add_gemini_support.sql`, `057_add_chatgpt_support.sql`

---

### 2. **cached_recipes**
*Multi-Provider Recipe Caching System*

**Purpose:** Centralized cache for recipes from multiple providers (Edamam, Spoonacular, USDA, Nutritionix)

**Key Columns:**
- `provider`: recipe_provider enum
- `external_recipe_id`: Provider's recipe ID
- `recipe_name`, `ingredients`, `nutrition_details`
- `cache_status`: active, stale, expired, error
- `data_quality_score`: 0-100 quality metric
- `has_complete_nutrition`: Data completeness flag

**Indexes:**
- GIN indexes on `health_labels`, `cuisine_types`
- Full-text search on `recipe_name`
- Composite index on `provider`, `external_recipe_id`

**Related Tables:** `recipe_usage_stats`, `recipe_cache_performance`

**Migration:** Created through multi-provider recipe system implementation

---

### 3. **recipe_customizations**
*Ingredient Replacement & Customization Tracking*

**Purpose:** Stores ingredient modifications and replacements for recipes in meal plan drafts

**Key Columns:**
- `draft_id`: Links to `meal_plan_drafts`
- `recipe_id`, `recipe_source`: Recipe identification
- `customizations`: JSONB of ingredient changes
- `custom_nutrition`: Recalculated nutrition after changes
- `day_number`, `meal_type`: Context within meal plan

**Unique Constraint:** `(draft_id, recipe_id, day_number, meal_type)`

**Migration:** Part of unified meal plan architecture

---

### 4. **meal_plan_drafts**
*Unified Meal Planning Architecture*

**Purpose:** Replaces the fragmented meal planning system with a draft-to-finalized workflow supporting ingredient customization

**Key Features:**
- Draft → Finalized → Active → Completed → Archived lifecycle
- `suggestions`: JSONB containing recipe alternatives
- `search_params`: Original search criteria
- Expires after 7 days for drafts
- Supports multi-day meal plans

**Status Values:**
- `draft`: Work in progress
- `finalized`: Ready for client
- `active`: Currently assigned
- `completed`: Client finished
- `archived`: Historical record

**Migration:** `060_unify_meal_plan_structure.sql`

---

### 5. **recipe_usage_stats**
*Recipe Usage Analytics*

**Purpose:** Tracks how recipes are used across the platform

**Key Columns:**
- `cached_recipe_id`: Links to `cached_recipes`
- `usage_context`: meal_plan_generation, preview, manual_selection, search
- `used_by_nutritionist_id`, `used_for_client_id`
- `meal_type`, `used_at`

**Use Cases:**
- Popular recipe identification
- Nutritionist preferences
- Client satisfaction tracking

---

### 6. **recipe_cache_performance**
*Cache Performance Metrics*

**Purpose:** Daily aggregated performance metrics for recipe caching system

**Key Columns:**
- `date`, `provider`: Daily metrics per provider
- `cache_hits`, `cache_misses`: Hit rate tracking
- `api_calls_saved`: Cost savings
- `avg_cache_response_time_ms`, `avg_api_response_time_ms`
- `recipes_with_complete_nutrition`: Quality metrics

**Unique Constraint:** `(date, provider)`

---

### 7. **edamam_api_keys**
*API Key Management & Rotation*

**Purpose:** Manages multiple Edamam API keys with usage tracking and automatic rotation

**Key Columns:**
- `app_id`, `app_key`: Credentials
- `api_type`: meal_planner, nutrition, recipe, autocomplete
- `usage_count`, `max_usage_limit`: Usage tracking
- `is_active`: Enable/disable keys

**Features:**
- Automatic key rotation based on usage
- Per-type API key management
- Usage limit enforcement

**Migration:** `052_create_edamam_api_keys_table.sql`

---

### 8. **edamam_api_logs**
*Comprehensive API Logging*

**Purpose:** Logs all external API calls for debugging, analytics, and caching

**Key Columns:**
- `api_type`, `endpoint`, `http_method`
- `request_payload`, `response_payload`: Full req/res
- `response_time_ms`, `response_status`
- `error_occurred`, `error_message`
- `feature_context`: Which feature triggered the call
- `estimated_cost_usd`: Cost tracking

**Indexes:**
- GIN indexes on JSON payload for searchability
- Indexes on `api_type`, `user_id`, `client_id`, `session_id`

**Use Cases:**
- Debug API issues
- Track costs
- Analyze usage patterns
- Build cache strategies

**Migration:** `059_create_edamam_api_logs.sql`

---

### 9-12. **Health Labels System** (4 tables)
*Standardized Multi-Provider Health Label Mapping*

#### 9. **food_database_providers**
Lists all food data providers (Edamam, Spoonacular, USDA, Nutritionix)

#### 10. **health_labels_categories**  
Categories: allergy, dietary_preference, cuisine_type, nutrition_focus

#### 11. **health_labels_standard**
Standardized internal health labels with:
- `label_key`: Internal identifier
- `display_name`: User-facing name
- `category_id`: Links to category
- `severity_level`: critical, high, medium, preference

#### 12. **health_labels_provider_mapping**
Maps standard labels to provider-specific labels:
- `standard_label_id` → `provider_id`
- `provider_label_key`: Provider's label syntax
- `is_supported`: Whether provider supports this label

**Purpose:** Enables seamless switching between food data providers without changing application logic

**Migration:** `060_create_health_labels_mapping.sql`, `061_populate_health_labels_data.sql`

---

## Custom Types (Enums)

### Existing ENUMs:
1. `client_status`: prospective, active, inactive, archived
2. `activity_level`: sedentary, lightly_active, moderately_active, very_active, extra_active
3. `gender_type`: male, female, other
4. `pregnancy_status`: not_pregnant, first_trimester, second_trimester, third_trimester
5. `lactation_status`: not_lactating, lactating_0_6_months, lactating_7_12_months
6. `bmi_category`: underweight, normal, overweight, obese_class_1, obese_class_2, obese_class_3
7. `document_type`: blood_report, medical_history, photo, diet_log, prescription, other

### NEW ENUM:
8. **`recipe_provider`**: edamam, spoonacular, usda, nutritionix, manual

---

## Database Views

Four views were found in the database but not documented in the original schema:

### 1. **meal_plan_by_day**
Aggregates meal plan meals by day for easy retrieval

### 2. **meal_plan_summary**
Provides summary statistics for meal plans

### 3. **meal_plans_unified**
Unified view of both legacy `meal_plans` and new `meal_plan_drafts` tables

### 4. **v_country_guideline_mappings**
View for country → guideline mappings

**Note:** View definitions should be documented separately or extracted from the database.

---

## Key Schema Changes & Updates

### Client Table Updates
- Added `preferred_measurement_system` (metric/imperial)
- Enhanced phone validation constraints
- Added measurement system index

### Users Table Updates
- Added `preferred_measurement_system`
- Phone validation constraints
- First/last name length constraints

### Client Goals Updates
- Added `allergies`, `preferences`, `cuisine_types` arrays
- Flexible macro goals (can be 0 or have ranges)
- Enhanced check constraints

### Meal Planning Evolution

**Old System:**
```
meal_plans → meal_plan_meals
```

**New Unified System:**
```
meal_plan_drafts (with status lifecycle)
  ↓
recipe_customizations (ingredient replacements)
  ↓
cached_recipes (multi-provider cache)
```

**Migration Path:** Both systems coexist for backward compatibility. New features use `meal_plan_drafts`.

---

## Index Summary

### Performance Optimizations:

1. **Full-Text Search:**
   - `idx_cached_recipes_name_fts`: GIN index on recipe names

2. **Array Searches:**
   - GIN indexes on `health_labels`, `cuisine_types`, `allergies`, `preferences`

3. **JSON Searches:**
   - GIN indexes on API log payloads
   - GIN index on micronutrient guidelines

4. **Case-Insensitive Searches:**
   - Lowercase indexes on country fields across multiple tables

5. **Composite Indexes:**
   - `(client_id, plan_date)` for meal plans
   - `(provider, external_recipe_id)` for recipes
   - `(date, provider)` for performance metrics

---

## Foreign Key Relationships

### Key Relationship Patterns:

1. **Cascade Deletes:**
   - Client deleted → All related records deleted
   - User deleted → Client assignments remain but set to NULL
   - Meal plan deleted → All meals deleted

2. **Set NULL:**
   - API logs retain data even if user/client deleted
   - Document uploads tracked even if uploader deleted

3. **Restrict:**
   - Cannot delete referenced guideline categories
   - Cannot delete providers with mappings

---

## Unique Constraints

### Business Logic Constraints:

1. **One Active Goal Per Client:**
   ```sql
   UNIQUE (client_id) WHERE is_active = true
   ```

2. **One Meal Program Per Client:**
   ```sql
   UNIQUE (client_id)
   ```

3. **Unique Recipe Cache Entry:**
   ```sql
   UNIQUE (provider, external_recipe_id)
   ```

4. **One Customization Per Recipe/Day/Meal:**
   ```sql
   UNIQUE (draft_id, recipe_id, day_number, meal_type)
   ```

5. **Unique AI Generation Attempt:**
   ```sql
   UNIQUE (thread_id, run_id, ai_model)
   ```

---

## Check Constraints

### Data Integrity Rules:

1. **Valid Email Format:**
   ```sql
   email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
   ```

2. **Phone Format & Length:**
   ```sql
   phone ~ '^[0-9+\-\s\(\)\.]+$' AND LENGTH(phone) BETWEEN 7 AND 20
   ```

3. **Macro Goal Validation:**
   - Either both min/max are 0, OR both > 0 and min < max
   - Prevents invalid goal ranges

4. **Date Range Validation:**
   - `goal_end_date > goal_start_date`
   - `plan_date >= CURRENT_DATE - 30 days`
   - `end_date >= plan_date`

5. **Quality Score Range:**
   ```sql
   data_quality_score BETWEEN 0 AND 100
   ```

6. **Rating Range:**
   ```sql
   overall_rating BETWEEN 1 AND 5
   ```

---

## Migration Status

### Completed Migrations: 62

Last migration: `061_populate_health_labels_data.sql`

### Migration Categories:

1. **Base Schema** (000-010): Initial setup
2. **Guideline Data** (011-036): EER, macro, micronutrient guidelines
3. **Country Support** (037): Lowercase country normalization
4. **Meal Planning** (038-051): Meal programs, goals, multi-day support
5. **API Management** (052, 059): API keys and logging
6. **Async Generation** (054-057): AI meal plan generation
7. **Measurement Systems** (058): Imperial/metric support
8. **Health Labels** (060-061): Multi-provider label standardization

---

## Recommendations

### 1. Update Documentation
- ✅ Created `schema-complete.sql` with all tables
- ✅ Created this sync document
- 📝 TODO: Update API documentation with new features
- 📝 TODO: Create ERD diagram

### 2. Consolidation Opportunities
- Consider deprecating legacy `meal_plans` table after migration complete
- Unified view `meal_plans_unified` provides backward compatibility

### 3. Performance Monitoring
- Use `recipe_cache_performance` table to track cache hit rates
- Monitor `edamam_api_logs` for API cost optimization
- Add alerts for cache miss rates > 30%

### 4. Data Quality
- `recipe_cache_performance.recipes_with_complete_nutrition` tracks quality
- Target: 85%+ recipes with complete nutrition data
- Use `data_quality_score` to prioritize cache refreshes

### 5. Future Enhancements
- Add `recipe_feedback` table for user ratings
- Implement `meal_plan_sharing` for client collaboration
- Create `nutrition_trends` table for client progress tracking

---

## Files Generated

1. **`database/schema-complete.sql`**: Complete schema with all 30 tables
2. **`DATABASE_SCHEMA_SYNC.md`** (this file): Comprehensive documentation
3. **`scripts/supabase-schema-export.sql`**: Schema export script

---

## Next Steps

1. ✅ Review this document
2. 📝 Replace `database/schema.sql` with `database/schema-complete.sql`
3. 📝 Update team documentation
4. 📝 Create database ERD
5. 📝 Document views in separate file
6. 📝 Update API documentation to reflect new features

---

## Questions & Support

For questions about the schema changes, refer to:
- Migration files in `database/migrations/`
- Individual feature README files (e.g., `MEAL_PLAN_DRAFTS_API.md`)
- API documentation in `API_DOCUMENTATION.md`

---

**Document Version:** 1.0  
**Last Updated:** October 14, 2025  
**Maintained By:** Development Team


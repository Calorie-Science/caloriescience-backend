-- Migration: Populate health labels with current data
-- This populates the standardized health labels system with existing data
-- Created: 2025-09-25

-- Get category IDs for reference
DO $$
DECLARE
    allergy_category_id UUID;
    dietary_category_id UUID;
    cuisine_category_id UUID;
    nutrition_category_id UUID;
    edamam_provider_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO allergy_category_id FROM health_labels_categories WHERE name = 'allergy';
    SELECT id INTO dietary_category_id FROM health_labels_categories WHERE name = 'dietary_preference';
    SELECT id INTO cuisine_category_id FROM health_labels_categories WHERE name = 'cuisine_type';
    SELECT id INTO nutrition_category_id FROM health_labels_categories WHERE name = 'nutrition_focus';
    
    -- Get Edamam provider ID
    SELECT id INTO edamam_provider_id FROM food_database_providers WHERE provider_name = 'edamam';

    -- Insert standard allergy labels
    INSERT INTO health_labels_standard (category_id, label_key, display_name, description, severity_level) VALUES
        (allergy_category_id, 'celery-free', 'Celery Free', 'No celery or celery derivatives', 'critical'),
        (allergy_category_id, 'crustacean-free', 'Crustacean Free', 'No crab, lobster, shrimp, or other crustaceans', 'critical'),
        (allergy_category_id, 'dairy-free', 'Dairy Free', 'No milk, cheese, butter, cream, yogurt, whey, or casein', 'critical'),
        (allergy_category_id, 'egg-free', 'Egg Free', 'No eggs or egg products', 'critical'),
        (allergy_category_id, 'fish-free', 'Fish Free', 'No fish or fish products', 'critical'),
        (allergy_category_id, 'fodmap-free', 'FODMAP Free', 'Low FODMAP diet for digestive health', 'high'),
        (allergy_category_id, 'gluten-free', 'Gluten Free', 'No wheat, barley, rye, or gluten-containing products', 'critical'),
        (allergy_category_id, 'lupine-free', 'Lupine Free', 'No lupine/lupin beans', 'critical'),
        (allergy_category_id, 'mollusk-free', 'Mollusk Free', 'No clams, mussels, oysters, or snails', 'critical'),
        (allergy_category_id, 'mustard-free', 'Mustard Free', 'No mustard or mustard seeds', 'critical'),
        (allergy_category_id, 'peanut-free', 'Peanut Free', 'No peanuts or peanut products', 'critical'),
        (allergy_category_id, 'pork-free', 'Pork Free', 'No pork or pork products', 'high'),
        (allergy_category_id, 'sesame-free', 'Sesame Free', 'No sesame seeds or tahini', 'critical'),
        (allergy_category_id, 'shellfish-free', 'Shellfish Free', 'No shellfish (broader than crustacean)', 'critical'),
        (allergy_category_id, 'soy-free', 'Soy Free', 'No soy or soy products', 'critical'),
        (allergy_category_id, 'sulfite-free', 'Sulfite Free', 'No sulfites or sulfur preservatives', 'high'),
        (allergy_category_id, 'tree-nut-free', 'Tree Nut Free', 'No almonds, walnuts, cashews, or other tree nuts', 'critical'),
        (allergy_category_id, 'wheat-free', 'Wheat Free', 'No wheat products', 'critical')
    ON CONFLICT (label_key) DO NOTHING;

    -- Insert standard dietary preference labels
    INSERT INTO health_labels_standard (category_id, label_key, display_name, description, severity_level) VALUES
        (dietary_category_id, 'alcohol-cocktail', 'Contains Alcohol', 'Contains alcoholic beverages', 'preference'),
        (dietary_category_id, 'alcohol-free', 'Alcohol Free', 'No alcohol content', 'preference'),
        (dietary_category_id, 'dash', 'DASH Diet', 'Dietary Approaches to Stop Hypertension', 'preference'),
        (dietary_category_id, 'immuno-supportive', 'Immune Supporting', 'Foods that support immune system health', 'preference'),
        (dietary_category_id, 'keto-friendly', 'Keto Friendly', 'Compatible with ketogenic diet', 'preference'),
        (dietary_category_id, 'kidney-friendly', 'Kidney Friendly', 'Suitable for kidney health', 'preference'),
        (dietary_category_id, 'kosher', 'Kosher', 'Follows kosher dietary laws', 'preference'),
        (dietary_category_id, 'low-potassium', 'Low Potassium', 'Low potassium content', 'preference'),
        (dietary_category_id, 'low-sugar', 'Low Sugar', 'Low sugar content', 'preference'),
        (dietary_category_id, 'mediterranean', 'Mediterranean', 'Mediterranean diet style', 'preference'),
        (dietary_category_id, 'no-oil-added', 'No Oil Added', 'No added oils in preparation', 'preference'),
        (dietary_category_id, 'paleo', 'Paleo', 'Paleo diet compatible', 'preference'),
        (dietary_category_id, 'pecatarian', 'Pescatarian', 'Fish but no meat', 'preference'),
        (dietary_category_id, 'red-meat-free', 'Red Meat Free', 'No red meat (beef, lamb, etc.)', 'preference'),
        (dietary_category_id, 'sugar-conscious', 'Sugar Conscious', 'Mindful of sugar content', 'preference'),
        (dietary_category_id, 'vegan', 'Vegan', 'No animal products', 'preference'),
        (dietary_category_id, 'vegetarian', 'Vegetarian', 'No meat or fish', 'preference')
    ON CONFLICT (label_key) DO NOTHING;

    -- Insert standard cuisine type labels
    INSERT INTO health_labels_standard (category_id, label_key, display_name, description, severity_level) VALUES
        (cuisine_category_id, 'american', 'American', 'American cuisine', 'preference'),
        (cuisine_category_id, 'asian', 'Asian', 'General Asian cuisine', 'preference'),
        (cuisine_category_id, 'british', 'British', 'British cuisine', 'preference'),
        (cuisine_category_id, 'caribbean', 'Caribbean', 'Caribbean cuisine', 'preference'),
        (cuisine_category_id, 'central-europe', 'Central European', 'Central European cuisine', 'preference'),
        (cuisine_category_id, 'chinese', 'Chinese', 'Chinese cuisine', 'preference'),
        (cuisine_category_id, 'eastern-europe', 'Eastern European', 'Eastern European cuisine', 'preference'),
        (cuisine_category_id, 'french', 'French', 'French cuisine', 'preference'),
        (cuisine_category_id, 'greek', 'Greek', 'Greek cuisine', 'preference'),
        (cuisine_category_id, 'indian', 'Indian', 'Indian cuisine', 'preference'),
        (cuisine_category_id, 'italian', 'Italian', 'Italian cuisine', 'preference'),
        (cuisine_category_id, 'japanese', 'Japanese', 'Japanese cuisine', 'preference'),
        (cuisine_category_id, 'korean', 'Korean', 'Korean cuisine', 'preference'),
        (cuisine_category_id, 'kosher-cuisine', 'Kosher Cuisine', 'Kosher cuisine style', 'preference'),
        (cuisine_category_id, 'mediterranean-cuisine', 'Mediterranean Cuisine', 'Mediterranean cuisine', 'preference'),
        (cuisine_category_id, 'mexican', 'Mexican', 'Mexican cuisine', 'preference'),
        (cuisine_category_id, 'middle-eastern', 'Middle Eastern', 'Middle Eastern cuisine', 'preference'),
        (cuisine_category_id, 'nordic', 'Nordic', 'Nordic cuisine', 'preference'),
        (cuisine_category_id, 'south-american', 'South American', 'South American cuisine', 'preference'),
        (cuisine_category_id, 'south-east-asian', 'Southeast Asian', 'Southeast Asian cuisine', 'preference'),
        (cuisine_category_id, 'world', 'World Fusion', 'International/fusion cuisine', 'preference')
    ON CONFLICT (label_key) DO NOTHING;

    -- Insert nutrition focus labels (for future use)
    INSERT INTO health_labels_standard (category_id, label_key, display_name, description, severity_level) VALUES
        (nutrition_category_id, 'high-protein', 'High Protein', 'High protein content', 'preference'),
        (nutrition_category_id, 'high-fiber', 'High Fiber', 'High fiber content', 'preference'),
        (nutrition_category_id, 'low-carb', 'Low Carb', 'Low carbohydrate content', 'preference'),
        (nutrition_category_id, 'low-fat', 'Low Fat', 'Low fat content', 'preference'),
        (nutrition_category_id, 'low-sodium', 'Low Sodium', 'Low sodium content', 'preference'),
        (nutrition_category_id, 'balanced', 'Balanced', 'Balanced nutritional profile', 'preference')
    ON CONFLICT (label_key) DO NOTHING;

    -- Now create Edamam mappings for working labels
    INSERT INTO health_labels_provider_mapping (standard_label_id, provider_id, provider_label_key, is_supported, mapping_notes)
    SELECT 
        hls.id,
        edamam_provider_id,
        CASE hls.label_key
            -- Allergies - Working Edamam mappings
            WHEN 'celery-free' THEN 'celery-free'
            WHEN 'dairy-free' THEN 'dairy-free'
            WHEN 'egg-free' THEN 'egg-free'
            WHEN 'fish-free' THEN 'fish-free'
            WHEN 'gluten-free' THEN 'gluten-free'
            WHEN 'lupine-free' THEN 'lupine-free'
            WHEN 'mollusk-free' THEN 'mollusk-free'
            WHEN 'mustard-free' THEN 'mustard-free'
            WHEN 'peanut-free' THEN 'peanut-free'
            WHEN 'sesame-free' THEN 'sesame-free'
            WHEN 'shellfish-free' THEN 'shellfish-free'
            WHEN 'soy-free' THEN 'soy-free'
            WHEN 'tree-nut-free' THEN 'tree-nut-free'
            WHEN 'wheat-free' THEN 'wheat-free'
            
            -- Dietary preferences - Working Edamam mappings
            WHEN 'vegan' THEN 'vegan'
            WHEN 'vegetarian' THEN 'vegetarian'
            
            -- Non-working labels (set as unsupported)
            ELSE NULL
        END,
        CASE 
            WHEN hls.label_key IN (
                'celery-free', 'dairy-free', 'egg-free', 'fish-free', 'gluten-free',
                'lupine-free', 'mollusk-free', 'mustard-free', 'peanut-free', 'sesame-free',
                'shellfish-free', 'soy-free', 'tree-nut-free', 'wheat-free', 'vegan', 'vegetarian'
            ) THEN true
            ELSE false
        END,
        CASE 
            WHEN hls.label_key IN (
                'celery-free', 'dairy-free', 'egg-free', 'fish-free', 'gluten-free',
                'lupine-free', 'mollusk-free', 'mustard-free', 'peanut-free', 'sesame-free',
                'shellfish-free', 'soy-free', 'tree-nut-free', 'wheat-free', 'vegan', 'vegetarian'
            ) THEN 'Confirmed working with Edamam Recipe Search API'
            ELSE 'Not supported by Edamam or causes API rate limiting'
        END
    FROM health_labels_standard hls
    WHERE hls.category_id IN (allergy_category_id, dietary_category_id)
    ON CONFLICT (standard_label_id, provider_id) DO NOTHING;

    -- Create cuisine mappings for Edamam
    INSERT INTO health_labels_provider_mapping (standard_label_id, provider_id, provider_label_key, is_supported, mapping_notes)
    SELECT 
        hls.id,
        edamam_provider_id,
        CASE hls.label_key
            WHEN 'american' THEN 'American'
            WHEN 'asian' THEN 'Asian'
            WHEN 'british' THEN 'British'
            WHEN 'caribbean' THEN 'Caribbean'
            WHEN 'central-europe' THEN 'Central Europe'
            WHEN 'chinese' THEN 'Chinese'
            WHEN 'eastern-europe' THEN 'Eastern Europe'
            WHEN 'french' THEN 'French'
            WHEN 'greek' THEN 'Greek'
            WHEN 'indian' THEN 'Indian'
            WHEN 'italian' THEN 'Italian'
            WHEN 'japanese' THEN 'Japanese'
            WHEN 'korean' THEN 'Korean'
            WHEN 'kosher-cuisine' THEN 'Kosher'
            WHEN 'mediterranean-cuisine' THEN 'Mediterranean'
            WHEN 'mexican' THEN 'Mexican'
            WHEN 'middle-eastern' THEN 'Middle Eastern'
            WHEN 'nordic' THEN 'Nordic'
            WHEN 'south-american' THEN 'South American'
            WHEN 'south-east-asian' THEN 'South East Asian'
            WHEN 'world' THEN 'World'
            ELSE hls.label_key
        END,
        true, -- All cuisine types are supported by Edamam
        'Edamam cuisine type mapping'
    FROM health_labels_standard hls
    WHERE hls.category_id = cuisine_category_id
    ON CONFLICT (standard_label_id, provider_id) DO NOTHING;

END $$;

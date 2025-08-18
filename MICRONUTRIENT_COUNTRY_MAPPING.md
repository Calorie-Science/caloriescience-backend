# Micronutrient Country Mapping Documentation

## Overview

The CalorieScience app now automatically selects the appropriate micronutrient guidelines based on the client's location/country. This ensures that clients receive recommendations that align with their national dietary guidelines.

## Supported Guidelines

The system supports 5 major micronutrient guideline sources:

1. **US (US_DRI)** - United States Dietary Reference Intakes (IOM/NASEM)
2. **EU (EFSA_DRV)** - European Food Safety Authority Dietary Reference Values
3. **UK (UK_COMA)** - United Kingdom SACN Dietary Reference Values
4. **India (INDIA_ICMR)** - Indian Council of Medical Research RDAs
5. **WHO (WHO_FAO)** - World Health Organization/FAO Guidelines (default)

## Country Mappings

### Countries Using US Guidelines
- United States
- Canada

### Countries Using EU Guidelines (EFSA)
- All EU member states (Austria, Belgium, Bulgaria, Croatia, Cyprus, Czech Republic, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Ireland, Italy, Latvia, Lithuania, Luxembourg, Malta, Netherlands, Poland, Portugal, Romania, Slovakia, Slovenia, Spain, Sweden)
- Norway, Iceland, Switzerland

### Countries Using UK Guidelines
- United Kingdom (England, Scotland, Wales, Northern Ireland)

### Countries Using India Guidelines
- India

### Countries Using WHO/FAO Guidelines (Default)
- All Asian countries (except India): Singapore, Japan, China, Korea, Malaysia, Thailand, Philippines, Vietnam, Indonesia
- All Middle Eastern countries: UAE, Saudi Arabia, Qatar, Kuwait, Bahrain
- All South American countries: Brazil, Mexico, Chile, Argentina
- All African countries: South Africa, Egypt, Nigeria, Kenya, Morocco
- Oceania: Australia, New Zealand
- Any country not specifically mapped defaults to WHO guidelines

## How It Works

### 1. Location-Based Selection

When a client is created or updated with a location, the system:
1. Extracts the country from the location string (e.g., "Buenos Aires, Argentina" → "Argentina")
2. Maps the country to its appropriate guideline source
3. Uses those guidelines for all micronutrient calculations

### 2. API Integration

```javascript
// Example: Creating a client with location
POST /api/clients
{
  "full_name": "Maria Garcia",
  "location": "Buenos Aires, Argentina",
  "gender": "female",
  "date_of_birth": "1990-05-15"
  // ... other fields
}

// The system automatically:
// 1. Detects "Argentina" from location
// 2. Maps Argentina to WHO guidelines
// 3. Uses WHO_FAO micronutrient values for calculations
```

### 3. Database Implementation

The mapping is stored in the `country_micronutrient_mappings` table:

```sql
-- Get guideline for a country
SELECT * FROM get_country_guideline_source('Argentina');
-- Returns: guideline_source: 'WHO', guideline_type: 'WHO_FAO'

-- View all mappings
SELECT * FROM v_country_guideline_mappings;
```

## Using the Feature

### For Developers

```typescript
import { getGuidelineFromLocation } from './lib/clientMicronutrientHelpers';

// Get guideline from location string
const guideline = getGuidelineFromLocation("Buenos Aires, Argentina");
// Returns: { country: 'WHO', guidelineType: 'WHO_FAO', extractedCountry: 'Argentina' }

// Use with FlexibleMicronutrientService
const microService = new FlexibleMicronutrientService(supabase);
const requirements = await microService.calculateClientRequirements(
  clientId,
  guideline.country,  // 'WHO'
  gender,
  age,
  adjustmentFactors
);
```

### For API Consumers

The API automatically handles country mapping. Simply provide the client's location:

```json
{
  "location": "Munich, Germany"  // Will use EU guidelines
}
```

## Default Behavior

- If no location is provided: Uses WHO guidelines
- If country cannot be determined from location: Uses WHO guidelines
- If country is not in mapping database: Uses WHO guidelines

## Adding New Countries

To add a new country mapping:

1. Add to TypeScript mapping (`lib/countryMicronutrientMapping.ts`)
2. Add to database migration (`database/migrations/027_add_country_guideline_mapping.sql`)
3. Run migration to update database

## Testing

Run the test script to verify mappings:

```bash
node test-country-mapping.js
```

This will show:
- Direct country to guideline mappings
- Location string parsing and mapping
- Countries grouped by guideline source

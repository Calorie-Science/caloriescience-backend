#!/usr/bin/env python3
"""
USDA FoodData Central - Food Categories and Portion Sizes Fetcher

This script fetches exhaustive food categories and their possible portion sizes
from the USDA FoodData Central API to create a USDA-compliant mapping.

Usage:
    python3 fetch-usda-food-categories.py [API_KEY]

If no API_KEY is provided, uses DEMO_KEY (limited to lower rate limits)

Output: usda_food_categories_portions.json
"""

import sys
import json
import time
import requests
from collections import defaultdict
from typing import Dict, List, Set

# USDA FoodData Central API base URL
BASE_URL = "https://api.nal.usda.gov/fdc/v1"

# Rate limiting
REQUESTS_PER_HOUR = 1000  # USDA limit
DELAY_BETWEEN_REQUESTS = 3.6  # seconds (to stay under 1000/hour)

class USDAFoodDataFetcher:
    def __init__(self, api_key: str = "DEMO_KEY"):
        self.api_key = api_key
        self.session = requests.Session()

        # Track categories and their portion sizes
        self.category_portions: Dict[str, Set[str]] = defaultdict(set)
        self.all_portion_units: Set[str] = set()

    def search_foods(self, query: str, data_types: List[str] = None, page_size: int = 50) -> dict:
        """Search for foods using the USDA API"""
        url = f"{BASE_URL}/foods/search"
        params = {
            "api_key": self.api_key,
            "query": query,
            "pageSize": page_size
        }

        if data_types:
            params["dataType"] = data_types

        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Error searching for '{query}': {e}")
            return {}

    def get_food_details(self, fdc_id: int) -> dict:
        """Get detailed food information by FDC ID"""
        url = f"{BASE_URL}/food/{fdc_id}"
        params = {"api_key": self.api_key}

        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"Error fetching food {fdc_id}: {e}")
            return {}

    def extract_portion_info(self, food_data: dict) -> tuple:
        """Extract portion size information from food data"""
        portions = set()
        category = food_data.get("foodCategory", "Uncategorized")

        # Extract serving size unit
        serving_unit = food_data.get("servingSizeUnit")
        if serving_unit:
            portions.add(serving_unit.lower())

        # Extract household serving info
        household_serving = food_data.get("householdServingFullText")
        if household_serving:
            # Parse common units from household serving text
            # e.g., "1 cup", "2 tbsp", "5.5 oz"
            units = self._parse_household_serving(household_serving)
            portions.update(units)

        # Check for foodPortions (available in some data types)
        food_portions = food_data.get("foodPortions", [])
        for portion in food_portions:
            portion_desc = portion.get("portionDescription", "")
            modifier = portion.get("modifier", "")
            measure_unit = portion.get("measureUnit", {})

            if portion_desc:
                portions.add(portion_desc.lower())
            if modifier:
                portions.add(modifier.lower())
            if measure_unit:
                unit_name = measure_unit.get("name")
                if unit_name:
                    portions.add(unit_name.lower())

        return category, portions

    def _parse_household_serving(self, serving_text: str) -> Set[str]:
        """Parse household serving text to extract measurement units"""
        units = set()
        serving_lower = serving_text.lower()

        # Common units to look for
        common_units = [
            'cup', 'cups', 'tbsp', 'tablespoon', 'tablespoons',
            'tsp', 'teaspoon', 'teaspoons', 'oz', 'ounce', 'ounces',
            'lb', 'pound', 'pounds', 'g', 'gram', 'grams',
            'ml', 'milliliter', 'milliliters', 'liter', 'liters',
            'fl oz', 'fluid ounce', 'piece', 'pieces', 'slice', 'slices',
            'serving', 'container', 'package', 'can', 'bottle',
            'whole', 'half', 'quarter', 'large', 'medium', 'small',
            'fillet', 'breast', 'thigh', 'drumstick', 'wing',
            'bowl', 'glass', 'scoop'
        ]

        for unit in common_units:
            if unit in serving_lower:
                units.add(unit)

        return units

    def fetch_category_data(self, sample_queries: List[str], data_types: List[str] = None):
        """Fetch food data for sample queries to build category-portion mapping"""
        print(f"Fetching USDA food data for {len(sample_queries)} categories...")

        for idx, query in enumerate(sample_queries, 1):
            print(f"\n[{idx}/{len(sample_queries)}] Searching: {query}")

            # Search for foods
            results = self.search_foods(query, data_types=data_types, page_size=25)
            foods = results.get("foods", [])

            print(f"  Found {len(foods)} foods")

            # Process each food to extract portion info
            for food in foods[:10]:  # Limit to first 10 to avoid rate limits
                fdc_id = food.get("fdcId")
                category = food.get("foodCategory", "Uncategorized")

                # Extract basic portion info from search results
                _, portions = self.extract_portion_info(food)

                if portions:
                    self.category_portions[category].update(portions)
                    self.all_portion_units.update(portions)

                # Small delay to respect rate limits
                time.sleep(0.1)

            # Delay between category searches
            time.sleep(1)

        print(f"\n✓ Completed! Found {len(self.category_portions)} categories")
        print(f"✓ Found {len(self.all_portion_units)} unique portion units")

    def generate_output(self) -> dict:
        """Generate the final category-portion mapping"""
        output = {
            "metadata": {
                "source": "USDA FoodData Central",
                "api_version": "v1",
                "generated_date": time.strftime("%Y-%m-%d"),
                "total_categories": len(self.category_portions),
                "total_portion_units": len(self.all_portion_units)
            },
            "all_portion_units": sorted(list(self.all_portion_units)),
            "categories": {}
        }

        # Convert sets to sorted lists for JSON serialization
        for category, portions in sorted(self.category_portions.items()):
            output["categories"][category] = sorted(list(portions))

        return output

    def save_to_file(self, filename: str = "usda_food_categories_portions.json"):
        """Save the mapping to a JSON file"""
        output = self.generate_output()

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        print(f"\n✓ Saved to {filename}")
        return filename


def main():
    # Get API key from command line or use DEMO_KEY
    api_key = sys.argv[1] if len(sys.argv) > 1 else "DEMO_KEY"

    if api_key == "DEMO_KEY":
        print("⚠️  Using DEMO_KEY - rate limits are lower!")
        print("   Sign up for a free API key at: https://fdc.nal.usda.gov/api-key-signup/\n")

    # Initialize fetcher
    fetcher = USDAFoodDataFetcher(api_key)

    # Sample queries covering major food categories
    # These are designed to broadly sample the USDA food database
    sample_queries = [
        # Proteins
        "chicken", "beef", "pork", "fish", "salmon", "turkey", "eggs",
        "tofu", "tempeh", "beans", "lentils",

        # Dairy
        "milk", "cheese", "yogurt", "butter", "cream",

        # Grains
        "rice", "pasta", "bread", "oats", "quinoa", "cereal",

        # Vegetables
        "broccoli", "carrots", "spinach", "tomatoes", "lettuce",
        "potatoes", "onions", "peppers", "mushrooms",

        # Fruits
        "apple", "banana", "orange", "berries", "grapes", "melon",

        # Beverages
        "coffee", "tea", "juice", "soda", "water",

        # Oils & Fats
        "olive oil", "coconut oil", "avocado",

        # Nuts & Seeds
        "almonds", "walnuts", "peanuts", "chia seeds",

        # Condiments & Sauces
        "ketchup", "mustard", "soy sauce", "vinegar", "salad dressing",

        # Snacks & Sweets
        "chips", "crackers", "cookies", "chocolate", "ice cream",

        # Soups & Prepared Foods
        "soup", "pizza", "sandwich", "burrito"
    ]

    # Fetch data from USDA (use Foundation and SR Legacy for most comprehensive data)
    fetcher.fetch_category_data(
        sample_queries,
        data_types=["Foundation", "SR Legacy", "Survey (FNDDS)", "Branded"]
    )

    # Save results
    output_file = fetcher.save_to_file()

    # Print summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)

    output = fetcher.generate_output()
    print(f"Total Categories: {output['metadata']['total_categories']}")
    print(f"Total Portion Units: {output['metadata']['total_portion_units']}")

    print("\nSample Categories:")
    for category in list(output['categories'].keys())[:10]:
        portions = output['categories'][category]
        print(f"  • {category}: {len(portions)} portion types")

    print(f"\nAll Portion Units Found:")
    print(f"  {', '.join(output['all_portion_units'][:20])}...")


if __name__ == "__main__":
    main()

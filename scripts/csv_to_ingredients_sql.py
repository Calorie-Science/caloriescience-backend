#!/usr/bin/env python3
"""
CSV to SQL Converter for Simple Ingredients
Converts a CSV file with nutritional data into SQL INSERT statements
for the simple_ingredients table.
"""

import csv
import sys
from typing import Optional, List
from pathlib import Path


def escape_sql_string(value: Optional[str], max_length: Optional[int] = None) -> str:
    """Escape single quotes in SQL strings and optionally truncate"""
    if value is None or value == '':
        return 'NULL'
    # Truncate if max_length is specified
    str_value = str(value)
    if max_length and len(str_value) > max_length:
        str_value = str_value[:max_length]
    # Replace single quotes with two single quotes for SQL escaping
    escaped = str_value.replace("'", "''")
    return f"'{escaped}'"


def format_decimal(value: Optional[str], not_null: bool = False, default: str = '0') -> str:
    """Format decimal values for SQL"""
    if value is None or value == '' or value.lower() == 'null':
        if not_null:
            return default
        return 'NULL'
    try:
        float(value)  # Validate it's a number
        return str(value)
    except ValueError:
        if not_null:
            return default
        return 'NULL'


def format_boolean(value: Optional[str]) -> str:
    """Format boolean values for SQL"""
    if value is None or value == '':
        return 'TRUE'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    value_lower = str(value).lower()
    if value_lower in ('true', '1', 'yes', 't'):
        return 'TRUE'
    elif value_lower in ('false', '0', 'no', 'f'):
        return 'FALSE'
    return 'TRUE'  # Default to true


def parse_array_field(value: Optional[str]) -> str:
    """Parse array fields (comma-separated) into PostgreSQL array format"""
    if value is None or value == '' or value.lower() == 'null':
        return "ARRAY[]::TEXT[]"

    # Split by comma and clean up each item
    items = [item.strip() for item in str(value).split(',') if item.strip()]
    if not items:
        return "ARRAY[]::TEXT[]"

    # Escape single quotes and format as PostgreSQL array
    escaped_items = [f"'{item.replace(chr(39), chr(39)*2)}'" for item in items]
    return f"ARRAY[{', '.join(escaped_items)}]::TEXT[]"


def generate_insert_statement(row: dict, batch_mode: bool = True) -> str:
    """
    Generate a single INSERT statement from a CSV row.
    Note: fdc_id from CSV is ignored as DB uses UUID primary key
    """

    # Map CSV columns to SQL values
    # NOT NULL fields use not_null=True to default to 0 instead of NULL
    values = {
        'name': escape_sql_string(row.get('name'), max_length=255),
        'display_name': escape_sql_string(row.get('display_name'), max_length=255) if row.get('display_name') else 'NULL',
        'category': escape_sql_string(row.get('category'), max_length=100),
        'serving_quantity': format_decimal(row.get('serving_quantity'), not_null=True, default='1'),
        'serving_unit': escape_sql_string(row.get('serving_unit'), max_length=50) if row.get('serving_unit') else "'g'",
        'calories': format_decimal(row.get('calories'), not_null=True, default='0'),
        'protein_g': format_decimal(row.get('protein_g'), not_null=True, default='0'),
        'carbs_g': format_decimal(row.get('carbs_g'), not_null=True, default='0'),
        'fat_g': format_decimal(row.get('fat_g'), not_null=True, default='0'),
        'fiber_g': format_decimal(row.get('fiber_g'), not_null=True, default='0'),
        'sugar_g': format_decimal(row.get('sugar_g'), not_null=False, default='0'),
        'saturated_fat_g': format_decimal(row.get('saturated_fat_g'), not_null=False, default='0'),
        'trans_fat_g': format_decimal(row.get('trans_fat_g'), not_null=False, default='0'),
        'cholesterol_mg': format_decimal(row.get('cholesterol_mg'), not_null=False, default='0'),
        'vitamin_a_mcg': format_decimal(row.get('vitamin_a_mcg')),
        'vitamin_d_mcg': format_decimal(row.get('vitamin_d_mcg')),
        'vitamin_e_mg': format_decimal(row.get('vitamin_e_mg')),
        'vitamin_k_mcg': format_decimal(row.get('vitamin_k_mcg')),
        'vitamin_c_mg': format_decimal(row.get('vitamin_c_mg')),
        'thiamin_mg': format_decimal(row.get('thiamin_mg')),
        'riboflavin_mg': format_decimal(row.get('riboflavin_mg')),
        'niacin_mg': format_decimal(row.get('niacin_mg')),
        'vitamin_b6_mg': format_decimal(row.get('vitamin_b6_mg')),
        'vitamin_b12_mcg': format_decimal(row.get('vitamin_b12_mcg')),
        'folate_mcg': format_decimal(row.get('folate_mcg')),
        'biotin_mcg': format_decimal(row.get('biotin_mcg')),
        'pantothenic_acid_mg': format_decimal(row.get('pantothenic_acid_mg')),
        'choline_mg': format_decimal(row.get('choline_mg')),
        'calcium_mg': format_decimal(row.get('calcium_mg')),
        'phosphorus_mg': format_decimal(row.get('phosphorus_mg')),
        'magnesium_mg': format_decimal(row.get('magnesium_mg')),
        'sodium_mg': format_decimal(row.get('sodium_mg')),
        'potassium_mg': format_decimal(row.get('potassium_mg')),
        'chloride_mg': format_decimal(row.get('chloride_mg')),
        'iron_mg': format_decimal(row.get('iron_mg')),
        'zinc_mg': format_decimal(row.get('zinc_mg')),
        'copper_mg': format_decimal(row.get('copper_mg')),
        'selenium_mcg': format_decimal(row.get('selenium_mcg')),
        'iodine_mcg': format_decimal(row.get('iodine_mcg')),
        'manganese_mg': format_decimal(row.get('manganese_mg')),
        'molybdenum_mcg': format_decimal(row.get('molybdenum_mcg')),
        'chromium_mcg': format_decimal(row.get('chromium_mcg')),
        'health_labels': parse_array_field(row.get('health_labels')),
        'diet_labels': parse_array_field(row.get('diet_labels')),
        'allergens': parse_array_field(row.get('allergens')),
        'image_url': escape_sql_string(row.get('image_url')) if row.get('image_url') else 'NULL',
        'is_active': format_boolean(row.get('is_active', 'TRUE'))
    }

    if batch_mode:
        # Return only the VALUES part for batch inserts
        return f"""  ({values['name']}, {values['display_name']}, {values['category']},
    {values['serving_quantity']}, {values['serving_unit']},
    {values['calories']}, {values['protein_g']}, {values['carbs_g']},
    {values['fat_g']}, {values['fiber_g']}, {values['sugar_g']},
    {values['saturated_fat_g']}, {values['trans_fat_g']}, {values['cholesterol_mg']},
    {values['vitamin_a_mcg']}, {values['vitamin_d_mcg']}, {values['vitamin_e_mg']},
    {values['vitamin_k_mcg']}, {values['vitamin_c_mg']}, {values['thiamin_mg']},
    {values['riboflavin_mg']}, {values['niacin_mg']}, {values['vitamin_b6_mg']},
    {values['vitamin_b12_mcg']}, {values['folate_mcg']}, {values['biotin_mcg']},
    {values['pantothenic_acid_mg']}, {values['choline_mg']},
    {values['calcium_mg']}, {values['phosphorus_mg']}, {values['magnesium_mg']},
    {values['sodium_mg']}, {values['potassium_mg']}, {values['chloride_mg']},
    {values['iron_mg']}, {values['zinc_mg']}, {values['copper_mg']},
    {values['selenium_mcg']}, {values['iodine_mcg']}, {values['manganese_mg']},
    {values['molybdenum_mcg']}, {values['chromium_mcg']},
    {values['health_labels']}, {values['diet_labels']}, {values['allergens']},
    {values['image_url']}, {values['is_active']})"""
    else:
        # Return full INSERT statement
        columns = """name, display_name, category,
    serving_quantity, serving_unit,
    calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g,
    saturated_fat_g, trans_fat_g, cholesterol_mg,
    vitamin_a_mcg, vitamin_d_mcg, vitamin_e_mg, vitamin_k_mcg,
    vitamin_c_mg, thiamin_mg, riboflavin_mg, niacin_mg,
    vitamin_b6_mg, vitamin_b12_mcg, folate_mcg, biotin_mcg,
    pantothenic_acid_mg, choline_mg,
    calcium_mg, phosphorus_mg, magnesium_mg, sodium_mg,
    potassium_mg, chloride_mg, iron_mg, zinc_mg, copper_mg,
    selenium_mcg, iodine_mcg, manganese_mg, molybdenum_mcg, chromium_mcg,
    health_labels, diet_labels, allergens, image_url, is_active"""

        return f"""INSERT INTO simple_ingredients ({columns})
VALUES {generate_insert_statement(row, batch_mode=True)};"""


def convert_csv_to_sql(csv_path: str, output_path: str, batch_size: int = 100):
    """
    Convert CSV file to SQL INSERT statements

    Args:
        csv_path: Path to the input CSV file
        output_path: Path to the output SQL file
        batch_size: Number of rows per batch INSERT (default: 100)
    """

    csv_file = Path(csv_path)
    if not csv_file.exists():
        print(f"Error: CSV file not found: {csv_path}")
        sys.exit(1)

    output_file = Path(output_path)

    print(f"Reading CSV from: {csv_path}")
    print(f"Writing SQL to: {output_path}")
    print(f"Batch size: {batch_size} rows per INSERT")
    print("-" * 60)

    total_rows = 0
    skipped_rows = 0
    batch_count = 0

    try:
        with open(csv_file, 'r', encoding='utf-8') as infile, \
             open(output_file, 'w', encoding='utf-8') as outfile:

            # Write header
            outfile.write("-- Generated SQL for simple_ingredients table\n")
            outfile.write("-- Source: {}\n".format(csv_path))
            outfile.write("-- Date: {}\n\n".format(__import__('datetime').datetime.now()))
            outfile.write("BEGIN;\n\n")

            # Read CSV
            reader = csv.DictReader(infile)

            batch_rows = []

            for row in reader:
                total_rows += 1

                # Skip rows without required fields
                if not row.get('name') or not row.get('category'):
                    skipped_rows += 1
                    print(f"Warning: Skipping row {total_rows} - missing name or category")
                    continue

                batch_rows.append(row)

                # Write batch when we reach batch_size
                if len(batch_rows) >= batch_size:
                    write_batch(outfile, batch_rows)
                    batch_count += 1
                    print(f"Processed batch {batch_count} ({len(batch_rows)} rows)")
                    batch_rows = []

            # Write remaining rows
            if batch_rows:
                write_batch(outfile, batch_rows)
                batch_count += 1
                print(f"Processed final batch {batch_count} ({len(batch_rows)} rows)")

            # Write footer
            outfile.write("\nCOMMIT;\n")

    except Exception as e:
        print(f"Error processing CSV: {e}")
        sys.exit(1)

    print("-" * 60)
    print(f"Conversion complete!")
    print(f"Total rows read: {total_rows}")
    print(f"Rows inserted: {total_rows - skipped_rows}")
    print(f"Rows skipped: {skipped_rows}")
    print(f"Batches created: {batch_count}")
    print(f"Output file: {output_path}")


def write_batch(outfile, batch_rows: List[dict]):
    """Write a batch of rows as a single INSERT statement"""
    if not batch_rows:
        return

    columns = """name, display_name, category,
    serving_quantity, serving_unit,
    calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g,
    saturated_fat_g, trans_fat_g, cholesterol_mg,
    vitamin_a_mcg, vitamin_d_mcg, vitamin_e_mg, vitamin_k_mcg,
    vitamin_c_mg, thiamin_mg, riboflavin_mg, niacin_mg,
    vitamin_b6_mg, vitamin_b12_mcg, folate_mcg, biotin_mcg,
    pantothenic_acid_mg, choline_mg,
    calcium_mg, phosphorus_mg, magnesium_mg, sodium_mg,
    potassium_mg, chloride_mg, iron_mg, zinc_mg, copper_mg,
    selenium_mcg, iodine_mcg, manganese_mg, molybdenum_mcg, chromium_mcg,
    health_labels, diet_labels, allergens, image_url, is_active"""

    outfile.write(f"INSERT INTO simple_ingredients ({columns})\nVALUES\n")

    value_statements = [generate_insert_statement(row, batch_mode=True) for row in batch_rows]
    outfile.write(",\n".join(value_statements))
    outfile.write("\nON CONFLICT (name) DO NOTHING;\n\n")


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python csv_to_ingredients_sql.py <csv_file> [output_file] [batch_size]")
        print("\nExample:")
        print("  python csv_to_ingredients_sql.py ingredients.csv output.sql 100")
        sys.exit(1)

    csv_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else 'ingredients_insert.sql'
    batch_size = int(sys.argv[3]) if len(sys.argv) > 3 else 100

    convert_csv_to_sql(csv_path, output_path, batch_size)


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Split a large SQL file into smaller chunks for Supabase SQL editor
"""

import sys
from pathlib import Path


def split_sql_file(input_file: str, output_dir: str, rows_per_file: int = 500):
    """
    Split SQL file into smaller chunks

    Args:
        input_file: Path to the input SQL file
        output_dir: Directory to write the output files
        rows_per_file: Number of data rows per output file
    """
    input_path = Path(input_file)
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    print(f"Reading SQL from: {input_file}")
    print(f"Output directory: {output_dir}")
    print(f"Rows per file: {rows_per_file}")
    print("-" * 60)

    with open(input_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split by INSERT statements
    parts = content.split('INSERT INTO simple_ingredients')
    header = parts[0]  # Contains BEGIN and comments

    # Each part after the first is an INSERT statement
    insert_statements = parts[1:]

    print(f"Found {len(insert_statements)} INSERT statements")

    # Calculate number of output files needed
    num_files = (len(insert_statements) + rows_per_file - 1) // rows_per_file

    for file_num in range(num_files):
        start_idx = file_num * rows_per_file
        end_idx = min(start_idx + rows_per_file, len(insert_statements))

        output_file = output_path / f"fruits_veg_part_{file_num + 1:02d}_of_{num_files:02d}.sql"

        with open(output_file, 'w', encoding='utf-8') as f:
            # Write header
            f.write(header)

            # Write INSERT statements for this chunk
            for i in range(start_idx, end_idx):
                f.write('INSERT INTO simple_ingredients')
                f.write(insert_statements[i])

            # Write footer
            f.write("\nCOMMIT;\n")

        print(f"Created: {output_file.name} ({end_idx - start_idx} batches)")

    print("-" * 60)
    print(f"Split complete! Created {num_files} files")
    print(f"\nTo run in Supabase:")
    print(f"1. Open each file (fruits_veg_part_01_of_{num_files:02d}.sql, etc.)")
    print(f"2. Copy and paste into Supabase SQL editor")
    print(f"3. Run each file in order")


def main():
    if len(sys.argv) < 2:
        print("Usage: python split_sql_file.py <input_sql_file> [output_dir] [rows_per_file]")
        print("\nExample:")
        print("  python split_sql_file.py fruits_veg_ingredients.sql /tmp/split_sql 500")
        sys.exit(1)

    input_file = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else './split_sql'
    rows_per_file = int(sys.argv[3]) if len(sys.argv) > 3 else 500

    split_sql_file(input_file, output_dir, rows_per_file)


if __name__ == '__main__':
    main()

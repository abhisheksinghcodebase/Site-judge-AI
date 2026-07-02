import os
import sqlite3
import sys

# Locate database path
db_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "sitejudge.db")

if not os.path.exists(db_path):
    print(f"Error: Database file not found at {db_path}")
    print("Please make sure the FastAPI server has been started at least once.")
    sys.exit(1)

print(f"Connecting to database: {db_path}\n")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def print_table(table_name: str, limit: int = 5):
    try:
        # Fetch headers
        cursor.execute(f"PRAGMA table_info({table_name})")
        columns = [col[1] for col in cursor.fetchall()]
        
        if not columns:
            print(f"Table '{table_name}' does not exist.\n")
            return

        # Fetch rows
        cursor.execute(f"SELECT * FROM {table_name} ORDER BY rowid DESC LIMIT {limit}")
        rows = cursor.fetchall()

        print(f"=== Table: {table_name} (Latest {len(rows)} rows) ===")
        if not rows:
            print("[Empty table]\n")
            return

        # Simple column formatting
        widths = [max(len(str(val)) for val in col_vals) for col_vals in zip(*rows, columns)]
        header_line = " | ".join(f"{col:<{width}}" for col, width in zip(columns, widths))
        print(header_line)
        print("-" * len(header_line))
        
        for row in rows:
            print(" | ".join(f"{str(val):<{width}}" for val, width in zip(row, widths)))
        print("\n")
    except Exception as e:
        print(f"Error reading table {table_name}: {e}\n")

# Dump major tables
print_table("scans")
print_table("reports")
print_table("issues", limit=10)

conn.close()

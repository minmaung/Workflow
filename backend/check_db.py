import sqlite3

def check_database():
    print("Checking SQLite database...")
    conn = sqlite3.connect('workflow.db')
    cursor = conn.cursor()
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    print(f"Found {len(tables)} tables in the database:")
    for table in tables:
        print(f"- {table[0]}")
        
        # Get schema for each table
        cursor.execute(f"PRAGMA table_info({table[0]})")
        columns = cursor.fetchall()
        print(f"  Columns: {len(columns)}")
        
        # Count rows in each table
        cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
        count = cursor.fetchone()[0]
        print(f"  Rows: {count}")
        print()
    
    conn.close()

if __name__ == "__main__":
    check_database()

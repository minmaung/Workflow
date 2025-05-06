from sqlalchemy.orm import Session
from db import models, database, schemas
import traceback

def test_workflows():
    try:
        # Create a session
        db = database.SessionLocal()
        
        # Try to execute a simple query
        print("Attempting to query workflows...")
        workflows = db.query(models.Workflow).all()
        print(f"Found {len(workflows)} workflows")
        
        # Try to list them through the schema
        print("Attempting to convert to Pydantic models...")
        for w in workflows:
            print(f"Workflow ID: {w.id}, Title: {w.title}")
        
        print("Success!")
        db.close()
        return True
    except Exception as e:
        print(f"ERROR: {str(e)}")
        print(traceback.format_exc())
        return False

if __name__ == "__main__":
    print("SQLite Database Debug Utility")
    print("=============================")
    print(f"Database URL: {database.DATABASE_URL}")
    
    # Initialize the database
    print("Creating tables...")
    models.Base.metadata.create_all(bind=database.engine)
    
    # Test workflows endpoint
    test_workflows()
    
    print("Done.")

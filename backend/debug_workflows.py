from db.database import SessionLocal
from db import models
import traceback
import json

def debug_workflows_endpoint():
    """Debug the workflows endpoint to find the actual error"""
    try:
        print("Debugging /workflows endpoint...")
        
        # Create a session
        db = SessionLocal()
        
        # Attempt to fetch workflows (similar to the list_workflows function)
        workflows = db.query(models.Workflow).all()
        
        print(f"Found {len(workflows)} workflows in the database")
        
        # Try to convert to dict (similar to the Pydantic model conversion)
        result = []
        for wf in workflows:
            print(f"Processing workflow ID: {wf.id}, Title: {wf.title}")
            
            # Try using direct dictionary conversion
            wf_dict = {
                "id": wf.id,
                "title": wf.title,
                "biller_integration_name": wf.biller_integration_name,
                "company_name": wf.company_name,
                "current_step": wf.current_step,
                "status": wf.status,
                "submit_date": wf.submit_date.isoformat() if wf.submit_date else None
            }
            
            print(f"Successfully converted to dict: {json.dumps(wf_dict, default=str)}")
            result.append(wf_dict)
        
        print(f"Successfully processed all workflows")
        print(f"Result: {json.dumps(result, default=str)}")
        db.close()
        return True
    except Exception as e:
        print(f"ERROR in debug_workflows: {str(e)}")
        print(traceback.format_exc())
        return False

if __name__ == "__main__":
    debug_workflows_endpoint()

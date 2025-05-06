import sqlite3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from datetime import datetime

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Use direct SQLite connection instead of SQLAlchemy
def get_db_connection():
    conn = sqlite3.connect('workflow.db')
    conn.row_factory = sqlite3.Row
    return conn

@app.get("/test")
def test_endpoint():
    return {"status": "ok", "message": "Minimal API is working"}

@app.get("/workflows")
def list_workflows():
    try:
        conn = get_db_connection()
        workflows = conn.execute('SELECT * FROM workflows').fetchall()
        
        # Convert to list of dictionaries
        result = []
        for wf in workflows:
            result.append({
                "id": wf['id'],
                "title": wf['title'],
                "biller_integration_name": wf['biller_integration_name'],
                "company_name": wf['company_name'],
                "current_step": wf['current_step'],
                "status": wf['status'],
                "submit_date": wf['submit_date']
            })
        
        conn.close()
        return result
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in list_workflows: {str(e)}")
        print(error_details)
        return {"error": str(e)}

@app.get("/workflows/{workflow_id}")
def get_workflow(workflow_id: int):
    try:
        conn = get_db_connection()
        
        # Get workflow details
        workflow = conn.execute('SELECT * FROM workflows WHERE id = ?', (workflow_id,)).fetchone()
        if not workflow:
            conn.close()
            return {"error": "Workflow not found"}
            
        # Get steps for this workflow
        steps = conn.execute(
            'SELECT * FROM workflow_steps WHERE workflow_id = ?', 
            (workflow_id,)
        ).fetchall()
        
        steps_list = [
            {
                "id": step['id'],
                "step_number": step['step_number'],
                "signoff_status": step['signoff_status'],
                "signoff_person": step['signoff_person'],
                "signoff_date": step['signoff_date'],
                "remarks": step['remarks']
            }
            for step in steps
        ]
        
        # Build result
        result = {
            "id": workflow['id'],
            "title": workflow['title'],
            "biller_integration_name": workflow['biller_integration_name'],
            "category": workflow['category'],
            "integration_type": workflow['integration_type'],
            "company_name": workflow['company_name'],
            "phone_number": workflow['phone_number'],
            "email": workflow['email'],
            "current_step": workflow['current_step'],
            "status": workflow['status'],
            "submit_date": workflow['submit_date'],
            "steps": steps_list
        }
        
        conn.close()
        return result
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in get_workflow: {str(e)}")
        print(error_details)
        return {"error": str(e)}

if __name__ == "__main__":
    uvicorn.run("minimal_api:app", host="0.0.0.0", port=8000, reload=True)

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from sqlalchemy.orm import Session
from db import models, database
import os
from datetime import datetime

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Basic test endpoint
@app.get("/test")
def test_endpoint():
    return {"status": "ok", "message": "API is working"}

# Direct workflows endpoint (bypassing Pydantic models)
@app.get("/workflows")
def list_workflows(db: Session = Depends(get_db)):
    try:
        workflows = db.query(models.Workflow).all()
        result = []
        
        for wf in workflows:
            # Manually convert to dict to avoid Pydantic conversion issues
            wf_dict = {
                "id": wf.id,
                "title": wf.title,
                "biller_integration_name": wf.biller_integration_name,
                "company_name": wf.company_name,
                "current_step": wf.current_step,
                "status": wf.status,
                "submit_date": wf.submit_date.isoformat() if wf.submit_date else None
            }
            result.append(wf_dict)
            
        return result
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in list_workflows: {str(e)}")
        print(error_details)
        return {"error": str(e), "details": error_details}

# Get workflow details
@app.get("/workflows/{workflow_id}")
def get_workflow(workflow_id: int, db: Session = Depends(get_db)):
    try:
        wf = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
        if not wf:
            return {"error": "Workflow not found"}
            
        # Get steps
        steps = db.query(models.WorkflowStep).filter(models.WorkflowStep.workflow_id == workflow_id).all()
        steps_list = [
            {
                "id": step.id,
                "step_number": step.step_number,
                "signoff_status": step.signoff_status,
                "signoff_person": step.signoff_person,
                "signoff_date": step.signoff_date.isoformat() if step.signoff_date else None,
                "remarks": step.remarks
            }
            for step in steps
        ]
        
        # Convert to dict
        return {
            "id": wf.id,
            "title": wf.title,
            "biller_integration_name": wf.biller_integration_name,
            "category": wf.category,
            "integration_type": wf.integration_type,
            "company_name": wf.company_name,
            "phone_number": wf.phone_number,
            "email": wf.email,
            "fees_type": wf.fees_type,
            "fees_style": wf.fees_style,
            "current_step": wf.current_step,
            "status": wf.status,
            "submit_date": wf.submit_date.isoformat() if wf.submit_date else None,
            "steps": steps_list
        }
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error in get_workflow: {str(e)}")
        print(error_details)
        return {"error": str(e), "details": error_details}

if __name__ == "__main__":
    # Port 8000 is the standard port expected by the frontend
    uvicorn.run("direct_api:app", host="0.0.0.0", port=8000, reload=True)

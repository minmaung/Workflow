from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from starlette.background import BackgroundTasks
import uvicorn
import os
from db import models, database, schemas, crud

app = FastAPI()

# CORS (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_db_client():
    from db.database import engine
    from db import models
    models.Base.metadata.create_all(bind=engine)
    print("Database initialized on startup")

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Test endpoint
@app.get("/test")
def test_endpoint():
    return {"status": "ok", "message": "API is working"}

# --- Auth (simple, hardcoded) ---
USERS = {
    "b2b": {"password": "b2bpass", "role": "Business Team"},
    "integration": {"password": "integrationpass", "role": "Integration"},
    "qa": {"password": "qapass", "role": "QA"},
    "finance": {"password": "financepass", "role": "Finance"},
}

@app.post("/login")
def login(username: str = Form(...), password: str = Form(...)):
    user = USERS.get(username)
    if user and user["password"] == password:
        return {"username": username, "role": user["role"]}
    raise HTTPException(status_code=401, detail="Invalid credentials")

# --- Add Test Workflow Helper ---
@app.post("/add-test-workflow")
def add_test_workflow(db: Session = Depends(get_db)):
    try:
        # Create a sample workflow
        from datetime import datetime, date
        test_workflow = models.Workflow(
            title="Test Workflow",
            biller_integration_name="Test Biller",
            category="Test Category",
            integration_type="Online Biller",
            company_name="Test Company",
            phone_number="123-456-7890",
            email="test@example.com",
            fees_type="Debit",
            fees_style="Flat",
            mdr_fee=1.5,
            fee_waive=False,
            fee_waive_end_date=date(2025, 12, 31),
            agent_toggle=True,
            agent_fee=0.5,
            system_fee=1.0,
            transaction_agent_fee=0.25,
            dtr_fee=0.1,
            business_owner="John Doe",
            requested_go_live_date=date(2025, 6, 1),
            setup_fee=100.0,
            setup_fee_waive=False,
            setup_fee_waive_end_date=date(2025, 12, 31),
            maintenance_fee=50.0,
            maintenance_fee_waive=False,
            maintenance_fee_waive_end_date=date(2025, 12, 31),
            portal_fee=25.0,
            portal_fee_waive=False,
            portal_fee_waive_end_date=date(2025, 12, 31),
            requested_by="Integration Team",
            remarks="Test workflow for demo purposes",
            last_updated_by="System",
            go_live_date=date(2025, 6, 15),
            status="In Progress",
            current_step=1,
            submit_date=datetime.now(),
            last_updated_date=datetime.now()
        )
        db.add(test_workflow)
        db.commit()
        db.refresh(test_workflow)
        
        # Add default steps
        for step in range(1, 9):
            db_step = models.WorkflowStep(
                workflow_id=test_workflow.id,
                step_number=step,
                signoff_status='Pending'
            )
            db.add(db_step)
        db.commit()
        
        return {"status": "success", "message": "Test workflow created", "id": test_workflow.id}
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error creating test workflow: {str(e)}")
        print(error_details)
        return {"status": "error", "message": str(e), "details": error_details}

# --- Workflow CRUD ---
@app.post("/workflows", response_model=schemas.Workflow)
def create_workflow(workflow: schemas.WorkflowCreate, db: Session = Depends(get_db)):
    return crud.create_workflow(db, workflow)

@app.get("/workflows", response_model=list[schemas.WorkflowList])
def list_workflows(db: Session = Depends(get_db)):
    try:
        workflows = crud.list_workflows(db)
        return workflows
    except Exception as e:
        import traceback
        print(f"Error in list_workflows: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/workflows/{workflow_id}", response_model=schemas.WorkflowDetail)
def get_workflow(workflow_id: int, db: Session = Depends(get_db)):
    return crud.get_workflow(db, workflow_id)

@app.put("/workflows/{workflow_id}", response_model=schemas.Workflow)
def update_workflow(workflow_id: int, workflow: schemas.WorkflowUpdate, db: Session = Depends(get_db)):
    return crud.update_workflow(db, workflow_id, workflow)

@app.get("/workflows/{workflow_id}/history")
def get_workflow_history(workflow_id: int, db: Session = Depends(get_db)):
    # Fetch all edit history for this workflow
    history = db.query(models.EditHistory).filter(
        models.EditHistory.workflow_id == workflow_id
    ).order_by(models.EditHistory.edited_at.desc()).all()
    
    if not history:
        return []
    
    # Format the response
    result = []
    for entry in history:
        result.append({
            "id": entry.id,
            "workflow_id": entry.workflow_id,
            "edited_by": entry.edited_by,
            "edited_at": entry.edited_at,
            "changes": entry.changes
        })
    
    return result

# --- File Upload ---
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/workflows/{workflow_id}/attachments")
def upload_attachment(workflow_id: int, file: UploadFile = File(...), description: str = Form(None), db: Session = Depends(get_db)):
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as f:
        f.write(file.file.read())
    return crud.add_attachment(db, workflow_id, file.filename, file_location, description)

@app.get("/attachments/{attachment_id}")
def get_attachment(attachment_id: int, db: Session = Depends(get_db)):
    attachment = crud.get_attachment(db, attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(attachment.file_path, filename=attachment.file_name)

# --- Signoff ---
@app.post("/workflows/{workflow_id}/steps/{step_number}/signoff")
def signoff_step(workflow_id: int, step_number: int, signoff: schemas.StepSignoff, db: Session = Depends(get_db)):
    return crud.signoff_step(db, workflow_id, step_number, signoff)

# --- Notification Background Task (stub, to be implemented) ---
@app.on_event("startup")
def start_notification_task():
    # TODO: Start background task for SLA reminders
    pass

if __name__ == "__main__":
    uvicorn.run("main_updated:app", host="0.0.0.0", port=8000, reload=True)

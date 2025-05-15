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

@app.get("/api/workflows") # Use a different endpoint path to avoid any middleware issues
def api_list_workflows(db: Session = Depends(get_db)):
    """New direct API endpoint that returns all workflow fields without any processing"""
    try:
        # Use the simplest possible approach
        import sqlite3
        import json
        from fastapi.responses import JSONResponse
        
        # Connect to database
        conn = sqlite3.connect('workflow.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all workflows with ALL columns
        cursor.execute("SELECT * FROM workflows ORDER BY id")
        rows = cursor.fetchall()
        
        # Build response list with all fields
        result = []
        for row in rows:
            # Convert row to dict
            item = {}
            for key in row.keys():
                item[key] = row[key]
                
            # Parse JSON fields
            if item.get('custom_fields'):
                item['custom_fields'] = json.loads(item['custom_fields'])
                
            if item.get('report_fields'):
                item['report_fields'] = json.loads(item['report_fields'])
                
            result.append(item)
            
        # Debug output
        print(f"API returning {len(result)} workflows with these fields:")
        if result:
            print(f"Fields for workflow #{result[0]['id']}: {list(result[0].keys())}")
            print(f"Biller: {result[0]['biller_integration_name']}, Company: {result[0]['company_name']}")
        
        conn.close()
        return result
        
    except Exception as e:
        import traceback
        print(f"Error in api_list_workflows: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workflow-names")
def workflow_names():
    """Dedicated endpoint that returns only workflow IDs, biller names, and company names"""
    from fastapi.responses import JSONResponse
    import sqlite3
    import json
    
    try:
        # Connect directly to the database
        conn = sqlite3.connect('workflow.db')
        cursor = conn.cursor()
        
        # Select only the relevant fields
        cursor.execute("""
            SELECT id, biller_integration_name, company_name
            FROM workflows
            ORDER BY id
        """)
        
        # Get column names
        column_names = [description[0] for description in cursor.description]
        
        # Fetch all data
        rows = cursor.fetchall()
        
        # Format the results
        result = []
        for row in rows:
            item = {}
            for i, col_name in enumerate(column_names):
                item[col_name] = row[i]
            result.append(item)
        
        conn.close()
        
        # Log what we're returning
        print(f"Returning names for {len(result)} workflows")
        for wf in result:
            print(f"Workflow #{wf['id']} - Biller: '{wf['biller_integration_name']}', Company: '{wf['company_name']}'")
        
        # Return as a simple array
        return result
    
    except Exception as e:
        import traceback
        print(f"Error in workflow_names: {str(e)}")
        print(traceback.format_exc())
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/direct-workflows")
def direct_workflows():
    """Direct endpoint that completely bypasses FastAPI response handling"""
    from fastapi.responses import JSONResponse
    import sqlite3
    import json
    
    try:
        # Use the most direct approach possible
        conn = sqlite3.connect('workflow.db')
        cursor = conn.cursor()
        
        # Get raw data from database - explicitly select all needed columns
        cursor.execute("""
            SELECT 
                id, title, biller_integration_name, company_name, 
                current_step, status, submit_date, custom_fields
            FROM workflows
            ORDER BY id
        """)
        
        # Get column names
        column_names = [description[0] for description in cursor.description]
        
        # Fetch all rows
        raw_data = cursor.fetchall()
        
        # Convert to list of dictionaries with column names
        formatted_data = []
        for row in raw_data:
            # Create dict with column names as keys
            item = {}
            for i, col_name in enumerate(column_names):
                item[col_name] = row[i]
            
            # Handle JSON fields
            if item.get('custom_fields'):
                try:
                    item['custom_fields'] = json.loads(item['custom_fields'])
                except:
                    item['custom_fields'] = None
            
            # ALWAYS add these fields - don't check if they exist
            # Use column values if they exist, otherwise use fallbacks
            item['biller_integration_name'] = item.get('biller_integration_name') or item.get('title') or f"Workflow {item['id']}"
            item['company_name'] = item.get('company_name') or f"Company {item['id']}"
            
            # Ensure these fields are present even if null in DB
            if 'biller_integration_name' not in item:
                item['biller_integration_name'] = item.get('title') or f"Workflow {item['id']}"
                
            if 'company_name' not in item:
                item['company_name'] = f"Company {item['id']}"
            
            formatted_data.append(item)
            
        conn.close()
        
        # Log what we're returning
        for wf in formatted_data:
            print(f"Workflow #{wf['id']} - '{wf['title']}' - Biller: '{wf['biller_integration_name']}', Company: '{wf['company_name']}'")
        
        # Return explicitly as JSONResponse with manually serialized JSON
        json_str = json.dumps(formatted_data)
        return JSONResponse(content=json.loads(json_str))
    
    except Exception as e:
        import traceback
        print(f"Direct workflows error: {str(e)}")
        print(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.get("/dashboardworkflows")
def dashboard_workflows():
    """Special endpoint dedicated to the dashboard that ensures biller_integration_name and company_name are returned"""
    try:
        import json
        import sqlite3
        from fastapi.responses import JSONResponse
        
        # Connect directly to SQLite for reliable dashboard data
        conn = sqlite3.connect('workflow.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get all workflows with explicit column selection
        cursor.execute("""
            SELECT id, title, biller_integration_name, company_name, 
                   current_step, status, submit_date, custom_fields
            FROM workflows
            ORDER BY id
        """)
        
        rows = cursor.fetchall()
        result = []
        
        for row in rows:
            # Convert to dictionary with all fields
            wf_dict = {}
            for key in row.keys():
                wf_dict[key] = row[key]
            
            # Process JSON fields
            if wf_dict.get('custom_fields'):
                try:
                    wf_dict['custom_fields'] = json.loads(wf_dict['custom_fields'])
                except:
                    wf_dict['custom_fields'] = None
            
            print(f"Dashboard workflow #{wf_dict['id']}:\n"
                  f"  Title: {wf_dict['title']}\n"
                  f"  Biller: {wf_dict['biller_integration_name']}\n"
                  f"  Company: {wf_dict['company_name']}")
                
            result.append(wf_dict)
        
        conn.close()
        return result
    
    except Exception as e:
        import traceback
        print(f"Error in dashboard_workflows: {str(e)}")
        print(traceback.format_exc())
        return {"error": str(e)}

@app.get("/workflows")
def list_workflows(page: int = 1, limit: int = 10, search: str = None, db: Session = Depends(get_db)):
    """Direct endpoint that adds required fields for the dashboard with pagination and search"""
    try:
        import json
        import sqlite3
        
        # Use direct SQLite connection for guaranteed field selection
        conn = sqlite3.connect('workflow.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Calculate offset for pagination
        offset = (page - 1) * limit
        
        # Build the base SQL query
        base_query = """
            SELECT id, title, biller_integration_name, company_name, 
                   current_step, status, submit_date, custom_fields
            FROM workflows
        """
        
        # Add search condition if provided
        count_params = []
        query_params = []
        where_clause = ""
        
        if search:
            where_clause = "WHERE title LIKE ? OR biller_integration_name LIKE ? OR company_name LIKE ?"
            search_term = f"%{search}%"
            count_params = [search_term, search_term, search_term]
            query_params = [search_term, search_term, search_term]
        
        # Execute count query to get total matching records
        count_query = f"SELECT COUNT(*) as count FROM workflows {where_clause}"
        cursor.execute(count_query, count_params)
        total_count = cursor.fetchone()['count']
        
        # Build the final query with pagination
        final_query = f"{base_query} {where_clause} ORDER BY id DESC LIMIT ? OFFSET ?"
        query_params.extend([limit, offset])
        
        # Execute the query
        cursor.execute(final_query, query_params)
        rows = cursor.fetchall()
        result = []
        
        # Calculate total pages
        total_pages = (total_count + limit - 1) // limit
        
        for row in rows:
            # Convert row to dict
            wf_dict = {}
            for key in row.keys():
                wf_dict[key] = row[key]
                
            # Handle JSON fields
            if wf_dict.get('custom_fields'):
                try:
                    wf_dict['custom_fields'] = json.loads(wf_dict['custom_fields'])
                except:
                    wf_dict['custom_fields'] = None
            
            # Ensure biller_integration_name and company_name are always present with fallback values
            if not wf_dict.get('biller_integration_name') or wf_dict['biller_integration_name'] == "":
                wf_dict['biller_integration_name'] = wf_dict.get('title') or f"Workflow {wf_dict['id']}"
                
            if not wf_dict.get('company_name') or wf_dict['company_name'] == "":
                wf_dict['company_name'] = f"Company {wf_dict['id']}"
            
            result.append(wf_dict)
        
        # Return paginated result with metadata
        return {
            "items": result,
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": total_pages
        }
    except Exception as e:
        import traceback
        print(f"Error in list_workflows: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/workflows/{workflow_id}")
def get_workflow(workflow_id: int, db: Session = Depends(get_db)):
    try:
        # Most direct approach possible - use only SQLite directly
        import sqlite3
        import json
        from datetime import datetime
        
        # Connect directly to SQLite database
        conn = sqlite3.connect('workflow.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get the basic workflow details
        cursor.execute('''
            SELECT * FROM workflows 
            WHERE id = ?
        ''', (workflow_id,))
        
        workflow_row = cursor.fetchone()
        if not workflow_row:
            conn.close()
            raise HTTPException(status_code=404, detail="Workflow not found")
            
        # Convert row to dictionary
        workflow_dict = {}
        for key in workflow_row.keys():
            workflow_dict[key] = workflow_row[key]
            
        # Special handling for JSON fields
        if workflow_dict.get('custom_fields'):
            workflow_dict['custom_fields'] = json.loads(workflow_dict['custom_fields'])
            
        if workflow_dict.get('report_fields'):
            workflow_dict['report_fields'] = json.loads(workflow_dict['report_fields'])
            print(f"DEBUG: Found report_fields in workflow #{workflow_id}: {workflow_dict['report_fields']}")
        else:
            workflow_dict['report_fields'] = []
            print(f"DEBUG: No report_fields found for workflow #{workflow_id}")
        
        # Get the attachments
        cursor.execute('''
            SELECT id, file_name, description 
            FROM attachments 
            WHERE workflow_id = ?
        ''', (workflow_id,))
        
        attachments = [dict(row) for row in cursor.fetchall()]
        workflow_dict['attachments'] = attachments
        
        # Get the steps
        cursor.execute('''
            SELECT id, step_number, signoff_person, signoff_status, signoff_date, remarks 
            FROM workflow_steps 
            WHERE workflow_id = ? 
            ORDER BY step_number
        ''', (workflow_id,))
        
        steps = [dict(row) for row in cursor.fetchall()]
        workflow_dict['steps'] = steps
        
        # Empty edit history (not needed for this demo)
        workflow_dict['edit_history'] = []
        
        conn.close()
        return workflow_dict
        
    except Exception as e:
        import traceback
        print(f"Error in get_workflow: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/workflows/{workflow_id}/report_fields")
def get_workflow_report_fields(workflow_id: int):
    """Minimal endpoint to directly get report_fields for a workflow"""
    try:
        import sqlite3
        import json
        
        # Direct database access
        conn = sqlite3.connect('workflow.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Query for report_fields only
        cursor.execute('SELECT report_fields FROM workflows WHERE id = ?', (workflow_id,))
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        # Parse and return the report_fields data
        if row['report_fields']:
            report_fields = json.loads(row['report_fields'])
            return {"report_fields": report_fields}
        else:
            return {"report_fields": []}
            
    except Exception as e:
        import traceback
        print(f"Error getting report_fields: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/workflows/{workflow_id}", response_model=schemas.Workflow)
def update_workflow(workflow_id: int, workflow: schemas.WorkflowUpdate, db: Session = Depends(get_db)):
    return crud.update_workflow(db, workflow_id, workflow)

# --- File Upload ---
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@app.post("/workflows/{workflow_id}/attachments")
def upload_attachment(workflow_id: int, file: UploadFile = File(...), description: str = Form(None), uploaded_by: str = Form(...), user_role: str = Form(...), db: Session = Depends(get_db)):
    # Get the workflow to check its current step
    workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")
    
    # Allow uploads from both Integration team (step 4) and Finance team (step 6)
    is_integration_upload = workflow.current_step == 4 and user_role == "Integration"
    is_finance_upload = workflow.current_step == 6 and user_role == "Finance"
    
    if not (is_integration_upload or is_finance_upload):
        raise HTTPException(
            status_code=403, 
            detail="Only Integration team can upload at Step 4 and Finance team can upload at Step 6"
        )
    
    # Save the file
    file_location = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_location, "wb") as f:
        f.write(file.file.read())
    
    # Determine file type from extension
    file_type = os.path.splitext(file.filename)[1].lstrip('.')
    
    # Create attachment record
    return crud.add_attachment(db, workflow_id, file_name=file.filename, file_path=file_location, 
                              description=description, uploaded_by=uploaded_by, file_type=file_type)

@app.get("/attachments/{attachment_id}")
def get_attachment(attachment_id: int, db: Session = Depends(get_db)):
    attachment = crud.get_attachment(db, attachment_id)
    if not attachment:
        raise HTTPException(status_code=404, detail="Not found")
    return FileResponse(attachment.file_path, filename=attachment.file_name)

# --- Signoff ---
@app.post("/workflows/{workflow_id}/steps/{step_number}/signoff")
def signoff_step(workflow_id: int, step_number: int, signoff: schemas.StepSignoff, db: Session = Depends(get_db)):
    try:
        # Log the signoff request
        print(f"API: Signoff request for workflow {workflow_id}, step {step_number}, status {signoff.signoff_status}")
        
        # Process the signoff through CRUD
        result = crud.signoff_step(db, workflow_id, step_number, signoff)
        
        # Force refresh the DB session to ensure we get the latest data after rejection restart
        db.close()
        db = database.SessionLocal()
        
        # Get the updated workflow to send back current_step
        workflow = crud.get_workflow(db, workflow_id)
        if workflow:
            print(f"API: Updated workflow current_step = {workflow.current_step}, status = {workflow.status}")
            
        # Get all steps for the workflow to verify the state
        steps = db.query(models.WorkflowStep).filter(
            models.WorkflowStep.workflow_id == workflow_id
        ).all()
        
        # Print step statuses for debugging
        for s in steps:
            print(f"API: Step {s.step_number} status = {s.signoff_status}")
            
        return {
            "status": "success",
            "message": f"Step {step_number} signed off successfully",
            "current_step": workflow.current_step if workflow else None,
            "workflow_status": workflow.status if workflow else None,
            "restart": signoff.signoff_status == 'Rejected',  # Flag indicating this was a rejection
            "step_result": result
        }
    except Exception as e:
        import traceback
        print(f"API Error in signoff_step: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

# --- Notification Background Task (stub, to be implemented) ---
@app.on_event("startup")
def start_notification_task():
    # TODO: Start background task for SLA reminders
    pass

# Debug endpoint to check workflow steps directly from the database
@app.get("/debug/workflow/{workflow_id}/steps")
def debug_workflow_steps(workflow_id: int):
    try:
        import sqlite3
        conn = sqlite3.connect('workflow.db')
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Get workflow details
        cursor.execute('SELECT id, current_step, status FROM workflows WHERE id = ?', (workflow_id,))
        workflow = cursor.fetchone()
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        # Get all steps for the workflow
        cursor.execute('SELECT id, step_number, signoff_status, signoff_person, signoff_date, remarks FROM workflow_steps WHERE workflow_id = ? ORDER BY step_number', (workflow_id,))
        steps = cursor.fetchall()
        
        # Get workflow history
        cursor.execute('SELECT id, action, action_by, action_date, details FROM workflow_history WHERE workflow_id = ? ORDER BY action_date DESC', (workflow_id,))
        history = cursor.fetchall()
        
        # Convert to dicts
        workflow_dict = dict(workflow)
        steps_dict = [dict(step) for step in steps]
        history_dict = [dict(h) for h in history]
        
        conn.close()
        
        return {
            "workflow": workflow_dict,
            "steps": steps_dict,
            "history": history_dict
        }
    except Exception as e:
        import traceback
        print(f"Debug error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

# Debug endpoint to manually fix a workflow in step 2 rejection case
@app.post("/debug/workflow/{workflow_id}/reset-to-step-1")
def debug_reset_to_step_1(workflow_id: int):
    try:
        import sqlite3
        from datetime import datetime
        
        conn = sqlite3.connect('workflow.db')
        cursor = conn.cursor()
        
        # First, check if step 2 is rejected (to preserve rejection history)
        cursor.execute(
            "SELECT signoff_status, signoff_person, signoff_date, remarks FROM workflow_steps WHERE workflow_id = ? AND step_number = 2",
            (workflow_id,)
        )
        step2_data = cursor.fetchone()
        preserve_rejection = step2_data and step2_data[0] == 'Rejected'
        
        # Reset step 1 to Pending
        cursor.execute(
            "UPDATE workflow_steps SET signoff_status = 'Pending', signoff_person = NULL, signoff_date = NULL, remarks = NULL WHERE workflow_id = ? AND step_number = 1", 
            (workflow_id,)
        )
        
        # Set workflow current_step to 1 and status to In Progress
        cursor.execute(
            "UPDATE workflows SET current_step = 1, status = 'In Progress' WHERE id = ?", 
            (workflow_id,)
        )
        
        # Reset all subsequent steps EXCEPT step 2 if it was rejected (to preserve rejection history)
        for step in range(3, 9):
            cursor.execute(
                "UPDATE workflow_steps SET signoff_status = 'Pending', signoff_person = NULL, signoff_date = NULL, remarks = NULL WHERE workflow_id = ? AND step_number = ?",
                (workflow_id, step)
            )
        
        # Add a history entry
        cursor.execute(
            "INSERT INTO workflow_history (workflow_id, action, action_by, action_date, details) VALUES (?, ?, ?, ?, ?)",
            (workflow_id, "Debug: Manually reset to Step 1", "system", datetime.now().isoformat(), 
             "Manual reset for testing while preserving rejection history" if preserve_rejection else "Manual reset for testing")
        )
        
        conn.commit()
        conn.close()
        
        return {"status": "success", "message": f"Workflow {workflow_id} has been manually reset to step 1 while preserving rejection history"}
    except Exception as e:
        import traceback
        print(f"Debug reset error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint to get the complete rejection history for a workflow
@app.get("/workflows/{workflow_id}/rejection-history")
def get_workflow_rejection_history(workflow_id: int, db: Session = Depends(get_db)):
    try:
        # Check if workflow exists
        workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
        if not workflow:
            raise HTTPException(status_code=404, detail=f"Workflow {workflow_id} not found")
        
        # Query the rejection history table
        rejection_history = db.query(models.WorkflowRejectionHistory).filter(
            models.WorkflowRejectionHistory.workflow_id == workflow_id
        ).order_by(models.WorkflowRejectionHistory.reject_date.desc()).all()
        
        # Convert to dictionary format for response
        result = []
        for record in rejection_history:
            result.append({
                "id": record.id,
                "step_number": record.step_number,
                "reject_date": record.reject_date,
                "rejected_by": record.rejected_by,
                "remarks": record.remarks,
                "restart_step": record.restart_step
            })
        
        return {
            "workflow_id": workflow_id,
            "rejection_history": result
        }
    except Exception as e:
        import traceback
        print(f"Error fetching rejection history: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

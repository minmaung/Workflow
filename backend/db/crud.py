from sqlalchemy.orm import Session
from . import models, schemas
from datetime import datetime
from sqlalchemy.exc import NoResultFound

# --- Workflow CRUD ---
def create_workflow(db: Session, workflow: schemas.WorkflowCreate):
    # Get the next workflow number for auto-generating title
    latest_workflow = db.query(models.Workflow).order_by(models.Workflow.id.desc()).first()
    workflow_number = 1  # Default start number
    
    if latest_workflow:
        # Try to extract number from the title if it follows WF##### pattern
        if latest_workflow.title and latest_workflow.title.startswith('WF'):
            try:
                last_number = int(latest_workflow.title[2:])  # Extract numbers after 'WF'
                workflow_number = last_number + 1
            except (ValueError, IndexError):
                # If parsing fails, just use ID + 1
                workflow_number = latest_workflow.id + 1
        else:
            workflow_number = latest_workflow.id + 1
    
    # Create formatted title (WF00001 format)
    auto_title = f"WF{workflow_number:05d}"
    
    # Create a new dict from workflow data, excluding any provided title
    workflow_data = workflow.dict()
    # Override any provided title with our auto-generated one
    workflow_data['title'] = auto_title
    
    db_workflow = models.Workflow(
        **workflow_data,
        status="In Progress",
        current_step=1,
        last_updated_date=datetime.now()
    )
    db.add(db_workflow)
    db.commit()
    db.refresh(db_workflow)
    # Add steps 1-8 as pending
    for step in range(1,9):
        db_step = models.WorkflowStep(
            workflow_id=db_workflow.id,
            step_number=step,
            signoff_status='Pending'
        )
        db.add(db_step)
    db.commit()
    return db_workflow

def list_workflows(db: Session):
    # Get all workflows with explicit selection of fields needed for the dashboard
    workflows = db.query(models.Workflow).all()
    
    # Log for debugging
    if workflows:
        print(f"First workflow fields: {workflows[0].__dict__}")
        
    return workflows

def get_workflow(db: Session, workflow_id: int):
    return db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()

def update_workflow(db: Session, workflow_id: int, workflow: schemas.WorkflowUpdate):
    db_workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not db_workflow:
        return None
    
    # Track changes for edit history
    changes = {}
    updated_data = workflow.dict(exclude_unset=True)
    
    for key, new_value in updated_data.items():
        old_value = getattr(db_workflow, key)
        if old_value != new_value:  # Only record if value is actually changing
            changes[key] = {
                "old_value": str(old_value) if old_value is not None else None,
                "new_value": str(new_value) if new_value is not None else None
            }
    
    # Apply the updates
    for key, value in updated_data.items():
        setattr(db_workflow, key, value)
    
    # Update the timestamp
    db_workflow.last_updated_date = datetime.now()
    
    # Record edit history if there were changes
    if changes and 'last_updated_by' in updated_data:
        edit_history = models.EditHistory(
            workflow_id=workflow_id,
            edited_by=updated_data['last_updated_by'],
            edited_at=datetime.now(),
            changes=changes
        )
        db.add(edit_history)
    
    db.commit()
    db.refresh(db_workflow)
    return db_workflow

# --- Attachments ---
def add_attachment(db: Session, workflow_id: int, file_name: str, file_path: str, description: str = None, uploaded_by: str = None, file_type: str = None):
    attachment = models.Attachment(
        workflow_id=workflow_id,
        file_name=file_name,
        file_path=file_path,
        description=description,
        uploaded_by=uploaded_by,
        file_type=file_type
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment

def get_attachment(db: Session, attachment_id: int):
    return db.query(models.Attachment).filter(models.Attachment.id == attachment_id).first()

# --- Signoff ---
def fix_workflow_after_rejection(workflow_id, from_step, to_step):
    """Direct helper function to fix workflow state after a rejection"""
    import sqlite3
    print(f"CRITICAL FIX: Directly updating workflow {workflow_id} to restart from step {to_step}")
    
    try:
        # Use direct SQL connection to ensure no caching/transaction issues
        conn = sqlite3.connect('workflow.db')
        cursor = conn.cursor()
        
        # 1. Reset the restart step to Pending
        cursor.execute(
            "UPDATE workflow_steps SET signoff_status = 'Pending', signoff_person = NULL, signoff_date = NULL, remarks = NULL " +
            "WHERE workflow_id = ? AND step_number = ?",
            (workflow_id, to_step)
        )
        print(f"Reset step {to_step} to Pending status")
        
        # 2. Set workflow current_step to the restart step
        cursor.execute(
            "UPDATE workflows SET current_step = ?, status = 'In Progress' WHERE id = ?",
            (to_step, workflow_id)
        )
        print(f"Set workflow current_step to {to_step}")
        
        # 3. Reset all subsequent steps except the rejected one
        for step_num in range(to_step + 1, 9):
            if step_num != from_step:
                cursor.execute(
                    "UPDATE workflow_steps SET signoff_status = 'Pending', signoff_person = NULL, " +
                    "signoff_date = NULL, remarks = NULL WHERE workflow_id = ? AND step_number = ?",
                    (workflow_id, step_num)
                )
                print(f"Reset step {step_num} to Pending status")
            else:
                print(f"Preserving step {step_num} as Rejected to maintain rejection history")
        
        # 4. Add an explicit reset of the workflow status to ensure it's 'In Progress'
        cursor.execute(
            "UPDATE workflows SET status = 'In Progress' WHERE id = ?", 
            (workflow_id,)
        )
        
        # Commit all changes
        conn.commit()
        print(f"Successfully reset workflow {workflow_id} from step {from_step} to step {to_step}")
        
        # Verify the changes - fetch current state
        cursor.execute("SELECT current_step, status FROM workflows WHERE id = ?", (workflow_id,))
        workflow = cursor.fetchone()
        
        if workflow[0] != to_step:
            print(f"VERIFICATION ERROR: current_step is {workflow[0]}, should be {to_step}")
            
            # Try one more time with an explicit close and retry
            cursor.execute(
                "UPDATE workflows SET current_step = ? WHERE id = ?",
                (to_step, workflow_id)
            )
            conn.commit()
            
        # Double check the status
        if workflow[1] != 'In Progress':
            print(f"VERIFICATION ERROR: status is {workflow[1]}, should be 'In Progress'")
            cursor.execute(
                "UPDATE workflows SET status = 'In Progress' WHERE id = ?",
                (workflow_id,)
            )
            conn.commit()
        
        # Force a sync with the database by closing and reopening the connection
        conn.close()
        conn = sqlite3.connect('workflow.db')
        cursor = conn.cursor()
        
        # Final verification
        cursor.execute("SELECT current_step, status FROM workflows WHERE id = ?", (workflow_id,))
        workflow = cursor.fetchone()
        print(f"FINAL VERIFICATION: current_step={workflow[0]}, status={workflow[1]}")
        
        return True
    except Exception as e:
        print(f"Error in direct DB update: {str(e)}")
        if 'conn' in locals() and conn:
            conn.rollback()
        return False
    finally:
        if 'conn' in locals() and conn:
            conn.close()

def signoff_step(db: Session, workflow_id: int, step_number: int, signoff: schemas.StepSignoff):
    """Signs off on a workflow step.
    
    If approved, the step is marked as complete and the workflow advances to the next step.
    If rejected, the workflow is restarted from an earlier step:
    - If rejected in step 2 (Business Team) → restart from step 1
    - If rejected in step 5 (QA Team) → restart from step 4
    - If rejected in step 6 (Finance Team) → restart from step 4
    """
    print(f"===== SIGNOFF: Workflow {workflow_id}, Step {step_number}, Status {signoff.signoff_status} =====")
    
    # Get the workflow
    workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
    if not workflow:
        raise NoResultFound(f"Workflow {workflow_id} not found")
    
    # Get the current step being signed off
    step = db.query(models.WorkflowStep).filter(
        models.WorkflowStep.workflow_id == workflow_id,
        models.WorkflowStep.step_number == step_number
    ).first()
    if not step:
        raise NoResultFound(f"Step {step_number} not found for workflow {workflow_id}")
    
    # Only process signoffs for the current active step
    if workflow.current_step != step_number:
        print(f"Warning: Attempted to sign off step {step_number} but current step is {workflow.current_step}")
        return step
    
    # HANDLE APPROVAL
    if signoff.signoff_status == 'Approved':
        print(f"APPROVING Step {step_number}")
        
        # For step 4 (Pre-Production Integration Setup), check if there are attachments before allowing approval
        if step_number == 4:
            # Count attachments for this workflow
            attachment_count = db.query(models.Attachment).filter(models.Attachment.workflow_id == workflow_id).count()
            if attachment_count == 0:
                print(f"Cannot approve step 4 without attachments")
                # No attachments found, return error
                error_step = {
                    "error": "Cannot approve step 4 without adding GL Detail. Integration Team must upload required GL Detail documentation."
                }
                return error_step
        
        # Record the approval
        step.signoff_person = signoff.signoff_person
        step.signoff_status = 'Approved'
        step.signoff_date = signoff.signoff_date or datetime.now()
        step.remarks = signoff.remarks
        
        # Advance to next step
        next_step = step_number + 1 if step_number < 8 else 8
        workflow.current_step = next_step
        print(f"Advancing workflow to step {next_step}")
        
        # Record in history
        try:
            history = models.WorkflowHistory(
                workflow_id=workflow_id,
                action=f"Approved Step {step_number}, Advanced to Step {next_step}",
                action_by=signoff.signoff_person,
                action_date=datetime.now(),
                details=signoff.remarks or "No remarks provided"
            )
            db.add(history)
        except Exception as e:
            print(f"Error adding history: {str(e)}")
        
        # Reset all subsequent steps to Pending
        # This ensures that if a workflow was previously rejected and restarted,
        # the subsequent steps are properly reset to Pending
        for next_step_num in range(step_number + 1, 9):
            next_step_obj = db.query(models.WorkflowStep).filter(
                models.WorkflowStep.workflow_id == workflow_id,
                models.WorkflowStep.step_number == next_step_num
            ).first()
            
            if next_step_obj:
                print(f"Resetting step {next_step_num} from {next_step_obj.signoff_status} to Pending")
                next_step_obj.signoff_status = 'Pending'
                next_step_obj.signoff_person = None
                next_step_obj.signoff_date = None
                next_step_obj.remarks = None
        
        # Commit changes
        db.commit()
        
        # Refresh workflow and step objects
        db.refresh(workflow)
        db.refresh(step)
    # HANDLE REJECTION
    elif signoff.signoff_status == 'Rejected':
        # For step 6 (Pre-Production Finance Verification), check if there are attachments before allowing rejection
        if step_number == 6:
            # Count attachments for this workflow
            attachment_count = db.query(models.Attachment).filter(models.Attachment.workflow_id == workflow_id).count()
            if attachment_count == 0:
                print(f"Cannot reject step 6 without attachments")
                # No attachments found, return error
                error_step = {
                    "error": "Cannot reject step 6 without adding GL Detail. Finance Team must upload required GL Detail documentation when rejecting."
                }
                return error_step
                
        # First, mark the current step as rejected
        step.signoff_person = signoff.signoff_person
        step.signoff_status = 'Rejected'
        step.signoff_date = signoff.signoff_date or datetime.now()
        step.remarks = signoff.remarks
        db.commit()
        db.refresh(step)
        
        # Determine which step to restart from based on the rejection rules
        restart_step = None
        if step_number == 2:
            restart_step = 1  # If rejected in Step 2, restart from Step 1
        elif step_number == 5 or step_number == 6:
            restart_step = 4  # If rejected in Step 5 or 6, restart from Step 4
            
        # Record this rejection in the permanent history table
        rejection_record = models.WorkflowRejectionHistory(
            workflow_id=workflow_id,
            step_number=step_number,
            rejected_by=signoff.signoff_person,
            remarks=signoff.remarks,
            restart_step=restart_step
        )
        db.add(rejection_record)
        db.commit()
        
        # Record the rejection in history
        action = f"Rejected at Step {step_number}"
        if restart_step:
            action += f", Restart from Step {restart_step}"
            
        try:
            history = models.WorkflowHistory(
                workflow_id=workflow_id,
                action=action,
                action_by=signoff.signoff_person,
                action_date=datetime.now(),
                details=signoff.remarks or "No remarks provided"
            )
            db.add(history)
            db.commit()
        except Exception as e:
            print(f"Error adding history: {str(e)}")
        
        # For rejections with restart rules, handle the restart process using the helper function
        if restart_step:
            print(f"Restarting workflow from step {restart_step} after rejection at step {step_number}")
            success = fix_workflow_after_rejection(workflow_id, step_number, restart_step)
            
            if not success:
                print("WARNING: Failed to restart workflow correctly!")
            
            # Refresh our objects to get the latest state
            workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
            step = db.query(models.WorkflowStep).filter(
                models.WorkflowStep.workflow_id == workflow_id,
                models.WorkflowStep.step_number == step_number
            ).first()
        else:
            # If no restart rule, just mark the workflow as rejected
            workflow.status = 'Rejected'
            db.commit()
            db.refresh(workflow)
    
    return step

# Helper function to reset a step's signoff status
def reset_step_signoff(db: Session, workflow_id: int, step_number: int):
    """Reset a workflow step to Pending status"""
    print(f"Resetting step {step_number} for workflow {workflow_id} to Pending status")
    
    # Get the step by workflow_id and step_number
    step = db.query(models.WorkflowStep).filter(
        models.WorkflowStep.workflow_id == workflow_id,
        models.WorkflowStep.step_number == step_number
    ).first()
    
    if step:
        # Clear all previous signoff information
        step.signoff_status = 'Pending'
        step.signoff_person = None
        step.signoff_date = None
        step.remarks = None
        print(f"Successfully reset step {step_number} to Pending status")
        db.commit()
        db.refresh(step)
        
        # Also update the workflow to make sure it's set to the correct step
        workflow = db.query(models.Workflow).filter(
            models.Workflow.id == workflow_id
        ).first()
        
        if workflow:
            workflow.current_step = step_number
            workflow.status = 'In Progress'
            print(f"Updated workflow current_step to {step_number} and status to In Progress")
            db.commit()
            db.refresh(workflow)
    else:
        print(f"Error: Could not find step {step_number} for workflow {workflow_id}")
    
    return step

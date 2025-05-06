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
    return db.query(models.Workflow).all()

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
def add_attachment(db: Session, workflow_id: int, file_name: str, file_path: str, description: str = None):
    attachment = models.Attachment(
        workflow_id=workflow_id,
        file_name=file_name,
        file_path=file_path,
        description=description
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment

def get_attachment(db: Session, attachment_id: int):
    return db.query(models.Attachment).filter(models.Attachment.id == attachment_id).first()

# --- Signoff ---
def signoff_step(db: Session, workflow_id: int, step_number: int, signoff: schemas.StepSignoff):
    step = db.query(models.WorkflowStep).filter(
        models.WorkflowStep.workflow_id == workflow_id,
        models.WorkflowStep.step_number == step_number
    ).first()
    if not step:
        raise NoResultFound("Step not found")
    step.signoff_person = signoff.signoff_person
    step.signoff_status = signoff.signoff_status
    step.signoff_date = signoff.signoff_date or datetime.now()
    step.remarks = signoff.remarks
    db.commit()
    db.refresh(step)
    # Optionally, update workflow current_step if approved
    if signoff.signoff_status == 'Approved':
        workflow = db.query(models.Workflow).filter(models.Workflow.id == workflow_id).first()
        if workflow and workflow.current_step == step_number:
            workflow.current_step = step_number + 1 if step_number < 8 else 8
            db.commit()
    return step

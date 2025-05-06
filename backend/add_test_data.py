from db.database import engine, SessionLocal
from db import models
from datetime import datetime, date
import traceback

def add_test_workflow():
    """Add a test workflow to the database"""
    try:
        # Initialize the database
        models.Base.metadata.create_all(bind=engine)
        
        # Create a session
        db = SessionLocal()
        
        print("Adding test workflow to the database...")
        
        # Create a sample workflow
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
        
        print(f"Created workflow with ID: {test_workflow.id}")
        
        # Add steps for this workflow
        print("Adding workflow steps...")
        for step in range(1, 9):
            db_step = models.WorkflowStep(
                workflow_id=test_workflow.id,
                step_number=step,
                signoff_status='Pending'
            )
            db.add(db_step)
        
        db.commit()
        print("Successfully added test workflow and steps!")
        db.close()
        
        return True
    except Exception as e:
        print(f"Error adding test data: {str(e)}")
        print(traceback.format_exc())
        return False

if __name__ == "__main__":
    add_test_workflow()

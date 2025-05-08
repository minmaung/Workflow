from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from datetime import datetime

# Create a simple database setup
DATABASE_URL = "sqlite:///./simple.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Define a simple model
class SimpleWorkflow(Base):
    __tablename__ = "simple_workflows"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.now)

# Create the database tables
Base.metadata.create_all(bind=engine)

# Create the FastAPI app
app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple test endpoint
@app.get("/test")
def test_endpoint():
    return {"status": "ok", "message": "Simple API is working"}

# Get all workflows
@app.get("/workflows")
def get_workflows():
    db = SessionLocal()
    try:
        workflows = db.query(SimpleWorkflow).all()
        result = []
        for wf in workflows:
            result.append({
                "id": wf.id,
                "title": wf.title,
                "created_at": wf.created_at.isoformat() if wf.created_at else None
            })
        return result
    except Exception as e:
        return {"error": str(e)}
    finally:
        db.close()

# Add a test workflow
@app.post("/add-workflow")
def add_workflow():
    db = SessionLocal()
    try:
        new_workflow = SimpleWorkflow(title=f"Test Workflow {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        db.add(new_workflow)
        db.commit()
        db.refresh(new_workflow)
        return {"id": new_workflow.id, "title": new_workflow.title}
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()

if __name__ == "__main__":
    uvicorn.run("simple_app:app", host="0.0.0.0", port=8000, reload=True)

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from sqlalchemy.orm import Session
from db import database, schemas, models

app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables on startup
@app.on_event("startup")
def startup_db_client():
    models.Base.metadata.create_all(bind=database.engine)
    print("Database initialized on startup")

# Test endpoint
@app.get("/test")
def test_endpoint():
    return {"status": "ok", "message": "API is working"}

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Simplified workflows endpoint
@app.get("/workflows")
def list_workflows(db: Session = Depends(get_db)):
    try:
        # Direct DB query
        workflows = db.query(models.Workflow).all()
        
        # Simple dictionary conversion
        result = []
        for w in workflows:
            result.append({
                "id": w.id,
                "title": w.title,
                "biller_integration_name": w.biller_integration_name,
                "company_name": w.company_name,
                "current_step": w.current_step,
                "status": w.status,
                "submit_date": w.submit_date.isoformat() if w.submit_date else None
            })
        return result
    except Exception as e:
        print(f"Error in list_workflows: {str(e)}")
        import traceback
        print(traceback.format_exc())
        raise

if __name__ == "__main__":
    uvicorn.run("test_api:app", host="0.0.0.0", port=8001, reload=True)

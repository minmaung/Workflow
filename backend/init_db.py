from db.database import engine
from db import models

def init_db():
    # Create tables in the SQLite database
    models.Base.metadata.create_all(bind=engine)
    print("Database initialized successfully")

if __name__ == "__main__":
    init_db()
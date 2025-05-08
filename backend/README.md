# Workflow System Backend (FastAPI)

## Setup

1. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Database**
   - Default: `postgresql://postgres:postgres@localhost:5432/workflowdb`
   - Set `DATABASE_URL` env var to override.

3. **Create database tables**
   ```bash
   # In psql or pgAdmin
   psql -U postgres -d workflowdb -f db/schema.sql
   ```

4. **Run the server**
   ```bash
   uvicorn main:app --reload
   ```

## Folder Structure

- `main.py`            — FastAPI app entrypoint
- `db/models.py`       — SQLAlchemy models
- `db/schemas.py`      — Pydantic schemas
- `db/crud.py`         — CRUD logic
- `db/database.py`     — DB connection
- `db/schema.sql`      — PostgreSQL schema
- `requirements.txt`   — Python deps
- `uploads/`           — File uploads (auto-created)

## Auth
- Simple: POST `/login` with username/password (hardcoded users: b2b, integration, qa, finance)

## API Endpoints
- `/workflows` — Create, list, update workflows
- `/workflows/{id}` — Get/update workflow
- `/workflows/{id}/attachments` — Upload files
- `/attachments/{id}` — Download file
- `/workflows/{id}/steps/{step}/signoff` — Signoff step

---

For full-stack setup and frontend, see project root README.

-- Workflow System Database Schema (PostgreSQL)
-- ============================================
-- Users Table (for authentication/roles)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('B2B', 'Integration', 'QA', 'Finance')),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL
);

-- Main Workflow Table (UAT Request Form)
CREATE TABLE workflows (
    id SERIAL PRIMARY KEY,
    title VARCHAR(50) UNIQUE NOT NULL,
    biller_integration_name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    integration_type VARCHAR(30) CHECK (integration_type IN ('Online Merchant', 'Online Biller', 'Offline Biller')),
    company_name VARCHAR(100),
    phone_number VARCHAR(30),
    email VARCHAR(100),
    fees_type VARCHAR(10) CHECK (fees_type IN ('Debit', 'Credit')),
    fees_style VARCHAR(10) CHECK (fees_style IN ('Flat', 'Percent')),
    mdr_fee NUMERIC(8,4),
    fee_waive BOOLEAN DEFAULT FALSE,
    fee_waive_end_date DATE,
    agent_toggle BOOLEAN DEFAULT FALSE,
    agent_fee NUMERIC(8,4),
    system_fee NUMERIC(8,4),
    transaction_agent_fee NUMERIC(8,4),
    dtr_fee NUMERIC(8,4),
    business_owner VARCHAR(100),
    requested_go_live_date DATE,
    submit_date TIMESTAMP NOT NULL DEFAULT NOW(),
    setup_fee NUMERIC(8,4),
    setup_fee_waive BOOLEAN DEFAULT FALSE,
    setup_fee_waive_end_date DATE,
    maintenance_fee NUMERIC(8,4),
    maintenance_fee_waive BOOLEAN DEFAULT FALSE,
    maintenance_fee_waive_end_date DATE,
    portal_fee NUMERIC(8,4),
    portal_fee_waive BOOLEAN DEFAULT FALSE,
    portal_fee_waive_end_date DATE,
    current_step INTEGER NOT NULL DEFAULT 1,
    status VARCHAR(20) NOT NULL CHECK (status IN ('In Progress', 'Done')),
    requested_by VARCHAR(100),
    remarks TEXT,
    last_updated_by VARCHAR(100),
    last_updated_date TIMESTAMP NOT NULL DEFAULT NOW(),
    go_live_date DATE,
    logo_attachment_id INTEGER,
    edit_history_id INTEGER
);

-- Attachments Table (logo, production forms, screenshots, others)
CREATE TABLE attachments (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
    file_type VARCHAR(30),
    file_name VARCHAR(255),
    file_path VARCHAR(255) NOT NULL,
    uploaded_by VARCHAR(100),
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    description TEXT
);

-- Edit History Table
CREATE TABLE edit_history (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
    edited_by VARCHAR(100),
    edited_at TIMESTAMP NOT NULL DEFAULT NOW(),
    changes JSONB NOT NULL
);

-- Workflow Steps Sign-Off Tracking
CREATE TABLE workflow_steps (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL CHECK (step_number BETWEEN 1 AND 8),
    signoff_person VARCHAR(100),
    signoff_status VARCHAR(20) CHECK (signoff_status IN ('Approved', 'Rejected', 'Pending')) DEFAULT 'Pending',
    signoff_date TIMESTAMP,
    remarks TEXT
);

-- Indexes for performance
CREATE INDEX idx_workflow_current_step ON workflows(current_step);
CREATE INDEX idx_workflow_status ON workflows(status);
CREATE INDEX idx_attachment_workflow ON attachments(workflow_id);
CREATE INDEX idx_step_workflow ON workflow_steps(workflow_id);

-- Sample enum for file_type in attachments: 'logo', 'production_form', 'gl_flow_screenshot', 'other'

-- End of schema.sql

from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, Numeric, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship, declarative_base
import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)

class Workflow(Base):
    __tablename__ = "workflows"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(50), unique=True, nullable=False)
    biller_integration_name = Column(String(100), nullable=False)
    category = Column(String(50))
    integration_type = Column(String(30))
    company_name = Column(String(100))
    phone_number = Column(String(30))
    email = Column(String(100))
    fees_type = Column(String(10))
    fees_style = Column(String(10))
    mdr_fee = Column(Numeric(8,4))
    fee_waive = Column(Boolean, default=False)
    fee_waive_end_date = Column(Date)
    agent_toggle = Column(Boolean, default=False)
    agent_fee = Column(Numeric(8,4))
    system_fee = Column(Numeric(8,4))
    transaction_agent_fee = Column(Numeric(8,4))
    dtr_fee = Column(Numeric(8,4))
    business_owner = Column(String(100))
    requested_go_live_date = Column(Date)
    setup_fee = Column(Numeric(8,4))
    setup_fee_waive = Column(Boolean, default=False)
    setup_fee_waive_end_date = Column(Date)
    maintenance_fee = Column(Numeric(8,4))
    maintenance_fee_waive = Column(Boolean, default=False)
    maintenance_fee_waive_end_date = Column(Date)
    portal_fee = Column(Numeric(8,4))
    portal_fee_waive = Column(Boolean, default=False)
    portal_fee_waive_end_date = Column(Date)
    requested_by = Column(String(100))
    remarks = Column(Text)
    last_updated_by = Column(String(100))
    go_live_date = Column(Date)
    current_step = Column(Integer, default=1)
    status = Column(String(20), nullable=False)
    submit_date = Column(DateTime, default=datetime.datetime.utcnow)
    last_updated_date = Column(DateTime, default=datetime.datetime.utcnow)
    attachments = relationship("Attachment", back_populates="workflow")
    steps = relationship("WorkflowStep", back_populates="workflow")
    edit_history = relationship("EditHistory", back_populates="workflow")

class Attachment(Base):
    __tablename__ = "attachments"
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    file_type = Column(String(30))
    file_name = Column(String(255))
    file_path = Column(String(255), nullable=False)
    uploaded_by = Column(String(100))
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)
    description = Column(Text)
    workflow = relationship("Workflow", back_populates="attachments")

class EditHistory(Base):
    __tablename__ = "edit_history"
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    edited_by = Column(String(100))
    edited_at = Column(DateTime, default=datetime.datetime.utcnow)
    changes = Column(JSON, nullable=False)
    workflow = relationship("Workflow", back_populates="edit_history")

class WorkflowStep(Base):
    __tablename__ = "workflow_steps"
    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    step_number = Column(Integer, nullable=False)
    signoff_person = Column(String(100))
    signoff_status = Column(String(20), default='Pending')
    signoff_date = Column(DateTime)
    remarks = Column(Text)
    workflow = relationship("Workflow", back_populates="steps")

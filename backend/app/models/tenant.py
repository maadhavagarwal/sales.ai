from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, JSON, Table, CheckConstraint, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import uuid


class TimestampMixin:
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

# Helper table for many-to-many relationship between Users and Organizations (SaaS style)
membership_table = Table(
    "memberships",
    Base.metadata,
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("organization_id", Integer, ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True),
    Column("role", String, default="MEMBER", nullable=False), # ROLES: OWNER, ADMIN, ANALYST, VIEWER, MEMBER
    Column("is_active", Boolean, default=True, nullable=False),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
    CheckConstraint("role IN ('OWNER', 'ADMIN', 'ANALYST', 'VIEWER', 'MEMBER')", name="ck_memberships_role"),
)

class Organization(TimestampMixin, Base):
    """
    Core Tenant Model: Represents a business or corporate account.
    """
    __tablename__ = "organizations"
    __table_args__ = (
        CheckConstraint("subscription_plan IN ('FREE', 'PRO', 'ENTERPRISE')", name="ck_org_subscription_plan"),
        CheckConstraint("subscription_status IN ('ACTIVE', 'INACTIVE', 'PAST_DUE', 'CANCELED')", name="ck_org_subscription_status"),
    )

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String, default=lambda: str(uuid.uuid4()), unique=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True) # For custom URLs like app.neuralbi.com/acme
    logo_url = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    
    # Billing & Subscription
    stripe_customer_id = Column(String, nullable=True)
    subscription_plan = Column(String, default="FREE") # FREE, PRO, ENTERPRISE
    subscription_status = Column(String, default="INACTIVE") # ACTIVE, PAST_DUE, CANCELED
    
    is_active = Column(Boolean, default=True)
    # Relationships
    members = relationship("User", secondary=membership_table, back_populates="organizations")
    workspaces = relationship("Workspace", back_populates="organization", cascade="all, delete-orphan")

class User(TimestampMixin, Base):
    """
    Central User Model: Represents a physical individual.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    
    # Global User Settings
    onboarding_complete = Column(Boolean, default=False)
    is_superuser = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    organizations = relationship("Organization", secondary=membership_table, back_populates="members")

class Workspace(TimestampMixin, Base):
    """
    Silo Model: Each organization can have multiple isolated workspaces (e.g., Marketing, Finance).
    """
    __tablename__ = "workspaces"
    __table_args__ = (
        UniqueConstraint("organization_id", "name", name="uq_workspace_org_name"),
    )

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    config = Column(JSON, default={}) # Holds workspace-specific AI settings, layout, etc.
    
    # Relationships
    organization = relationship("Organization", back_populates="workspaces")

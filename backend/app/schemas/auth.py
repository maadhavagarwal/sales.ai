from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


class AuthSchemaBase(BaseModel):
    model_config = ConfigDict(
        extra="ignore",
        str_strip_whitespace=True,
        populate_by_name=True,
    )


class RegisterRequest(AuthSchemaBase):
    email: str
    password: str
    role: str = "ADMIN"


class CompanyDetails(AuthSchemaBase):
    name: str
    contact_person: str
    gstin: str = ""
    industry: str = "Other"
    size: str = "50-200"
    hq_location: str = ""
    phone: str = ""
    business_type: str = "Private Limited"


class RegisterEnterpriseRequest(AuthSchemaBase):
    email: str
    password: str
    company_details: CompanyDetails = Field(alias="companyDetails")


class LoginRequest(AuthSchemaBase):
    email: str
    password: str


class AuthSuccessResponse(AuthSchemaBase):
    message: Optional[str] = None
    token: str
    role: str
    company_id: Optional[str | int] = None
    welcome_email_sent: Optional[bool] = None
    metadata: Optional[dict[str, Any]] = None

from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, Literal


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    owner_id: int

    class Config:
        from_attributes = True


class IssueCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None

    issue_type: Literal["Bug", "Task", "Feature"] = "Bug"
    status: Literal["To Do", "In Progress", "Done"] = "To Do"
    priority: Literal["Low", "Medium", "High"] = "Medium"

    project_id: int
    assigned_to: Optional[int] = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str):
        value = value.strip()

        if not value:
            raise ValueError("Issue title cannot be empty")

        return value


class IssueResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    issue_type: str
    status: str
    priority: str
    project_id: int
    assigned_to: Optional[int] = None
    created_by: int

    class Config:
        from_attributes = True

    class UserLogin(BaseModel):
        email: EmailStr
        password: str


class CommentCreate(BaseModel):
    content: str


class CommentResponse(BaseModel):
    id: int
    content: str
    issue_id: int
    user_id: int

    class Config:
        from_attributes = True


class IssueStatusUpdate(BaseModel):
    status: Literal["To Do", "In Progress", "Done"]

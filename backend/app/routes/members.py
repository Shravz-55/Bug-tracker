from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import get_current_user
from app.permissions import require_role
from app import models

router = APIRouter(prefix="/projects", tags=["Members"])

Role = Literal["Admin", "Developer", "Viewer"]


class MemberAdd(BaseModel):
    email: str
    role: Role = "Developer"


class MemberRoleUpdate(BaseModel):
    role: Role


@router.get("/{project_id}/members")
def list_members(
    project_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    require_role(db, user, project_id, "Viewer")

    rows = (
        db.query(models.ProjectMember, models.User)
        .join(models.User, models.User.id == models.ProjectMember.user_id)
        .filter(models.ProjectMember.project_id == project_id)
        .all()
    )

    return [
        {
            "id": member.id,
            "user_id": target.id,
            "name": target.name,
            "email": target.email,
            "role": member.role,
        }
        for member, target in rows
    ]


@router.post("/{project_id}/members", status_code=201)
def add_member(
    project_id: int,
    data: MemberAdd,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    require_role(db, user, project_id, "Admin")

    target = (
        db.query(models.User)
        .filter(
            func.lower(models.User.email) == data.email.strip().lower(),
            models.User.is_active == True,
        )
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="No active user with that email")

    exists = (
        db.query(models.ProjectMember)
        .filter_by(project_id=project_id, user_id=target.id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=400, detail="User is already a member")

    member = models.ProjectMember(
        project_id=project_id,
        user_id=target.id,
        role=data.role,
    )
    db.add(member)
    db.commit()

    return {"message": "Member added"}


@router.patch("/{project_id}/members/{user_id}")
def update_member_role(
    project_id: int,
    user_id: int,
    data: MemberRoleUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    require_role(db, user, project_id, "Admin")

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if project.owner_id == user_id:
        raise HTTPException(status_code=400, detail="The project owner's role can't be changed")

    member = (
        db.query(models.ProjectMember)
        .filter_by(project_id=project_id, user_id=user_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member.role = data.role
    db.commit()

    return {"message": "Role updated"}


@router.delete("/{project_id}/members/{user_id}")
def remove_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    require_role(db, user, project_id, "Admin")

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if project.owner_id == user_id:
        raise HTTPException(status_code=400, detail="The project owner can't be removed")

    member = (
        db.query(models.ProjectMember)
        .filter_by(project_id=project_id, user_id=user_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    db.query(models.Issue).filter(
        models.Issue.project_id == project_id,
        models.Issue.assigned_to == user_id,
    ).update({"assigned_to": None}, synchronize_session=False)

    db.delete(member)
    db.commit()

    return {"message": "Member removed"}


@router.get("/{project_id}/my-role")
def my_role(
    project_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    role = require_role(db, user, project_id, "Viewer")
    return {"role": role, "user_id": user.id}
